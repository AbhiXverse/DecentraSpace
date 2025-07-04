import lighthouse from '@lighthouse-web3/sdk';

const LIGHTHOUSE_API_KEY = import.meta.env.VITE_LIGHTHOUSE_API_KEY || '';

const IPFS_GATEWAYS = [
  'https://gateway.lighthouse.storage/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/'
];

// ✅ File validation for UI upload
export const validateFileForUpload = (file: File): { valid: boolean; error?: string } => {
  const ALLOWED_FILE_TYPES = [
    'video/mp4',
    'image/jpeg',
    'image/jpg',
    'application/msword'
  ];

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const MIN_FILE_SIZE = 1; // >0 bytes

  if (!file) return { valid: false, error: 'No file provided' };
  if (!file.type) return { valid: false, error: 'File type could not be determined' };
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: `Unsupported file type: ${file.type}` };
  }
  if (file.size < MIN_FILE_SIZE) return { valid: false, error: 'File is empty or corrupted' };
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: 'File size exceeds limit' };

  return { valid: true };
};

// ✅ Metadata interface
export interface ContentMetadata {
  title: string;
  description?: string;
  creator: string;
  timestamp: number;
  contentType: string;
  tags?: string[];
  thumbnail?: string;
  fileSize?: number;
  fileName?: string;
}

export interface UploadProgress {
  stage: 'uploading' | 'processing' | 'metadata' | 'complete';
  progress: number;
  message: string;
}

// ✅ Interface for content info
export interface ContentInfo {
  contentUrl: string;
  metadataUrl?: string;
  fileName?: string;
  contentType?: string;
}

class DecentralizedStorageService {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private currentGatewayIndex = 0;

  // ✅ Upload file to Lighthouse
  async uploadFile(file: File, progressCallback?: (progress: number) => void): Promise<string> {
    if (!LIGHTHOUSE_API_KEY) throw new Error('Missing Lighthouse API key');

    let retry = 0;
    while (retry < this.MAX_RETRIES) {
      try {
        progressCallback?.(10);
        const res = await lighthouse.upload([file], LIGHTHOUSE_API_KEY);
        progressCallback?.(90);

        if (!res?.data?.Hash) throw new Error('No hash returned from Lighthouse');
        progressCallback?.(100);
        return res.data.Hash;
      } catch (err) {
        retry++;
        if (retry >= this.MAX_RETRIES) {
          throw new Error(`Upload failed after ${retry} attempts: ${(err as any)?.message}`);
        }
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retry));
      }
    }
    throw new Error('Upload failed');
  }

  // ✅ Upload metadata JSON
  async uploadMetadata(metadata: ContentMetadata): Promise<string> {
    if (!LIGHTHOUSE_API_KEY) throw new Error('Missing Lighthouse API key');

    const blob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const file = new File([blob], `metadata-${Date.now()}.json`, { type: 'application/json' });

    const res = await lighthouse.upload([file], LIGHTHOUSE_API_KEY);
    if (!res?.data?.Hash) throw new Error('No metadata hash returned');

    return res.data.Hash;
  }

  // ✅ Upload content + metadata in sequence
  async uploadContentWithMetadata(
    file: File,
    metadata: Omit<ContentMetadata, 'timestamp'>,
    progressCallback?: (progress: UploadProgress) => void
  ): Promise<{ contentCid: string; metadataCid: string }> {
    progressCallback?.({ stage: 'uploading', progress: 0, message: 'Starting upload' });

    const contentCid = await this.uploadFile(file, (p) => {
      progressCallback?.({ stage: 'uploading', progress: p * 0.6, message: 'Uploading file...' });
    });

    progressCallback?.({ stage: 'metadata', progress: 80, message: 'Uploading metadata...' });

    const metadataCid = await this.uploadMetadata({
      ...metadata,
      timestamp: Date.now(),
      contentType: file.type,
      fileSize: file.size,
      fileName: file.name
    });

    progressCallback?.({ stage: 'complete', progress: 100, message: 'Upload complete' });

    return { contentCid, metadataCid };
  }

  // ✅ Get full IPFS URL - Updated to handle different scenarios
  getFileUrl(cid: string, fileName?: string): string {
    // Remove any 'ipfs://' prefix if present
    const cleanCid = cid.replace('ipfs://', '');
    
    // Get current gateway
    const gateway = IPFS_GATEWAYS[this.currentGatewayIndex];
    
    // If filename is provided, append it to the URL
    if (fileName) {
      return `${gateway}${cleanCid}/${fileName}`;
    }
    
    // Otherwise return base URL
    return `${gateway}${cleanCid}`;
  }

  // ✅ NEW: Get file URL with filename
  getFileUrlWithName(cid: string, fileName: string): string {
    const cleanCid = cid.replace('ipfs://', '');
    const gateway = IPFS_GATEWAYS[this.currentGatewayIndex];
    return `${gateway}${cleanCid}/${fileName}`;
  }

  // ✅ NEW: Try to get content info (check if it's a directory with files)
  async getContentInfo(cid: string): Promise<ContentInfo> {
    const cleanCid = cid.replace('ipfs://', '');
    
    // Try each gateway until one works
    for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
      const gateway = IPFS_GATEWAYS[i];
      const baseUrl = `${gateway}${cleanCid}`;
      
      try {
        // First, try to fetch the CID to see what it is
        const response = await fetch(baseUrl, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          // If it's already a direct file (video, image, etc.)
          if (contentType && !contentType.includes('directory') && !contentType.includes('json')) {
            return {
              contentUrl: baseUrl,
              contentType: contentType
            };
          }
          
          // If it's JSON or a directory, try to fetch and parse it
          const getResponse = await fetch(baseUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(10000)
          });
          
          if (getResponse.ok) {
            const text = await getResponse.text();
            
            try {
              // Try to parse as JSON (might be Lighthouse metadata)
              const data = JSON.parse(text);
              
              // Check if it has file information
              if (data.fileName || data.name) {
                const fileName = data.fileName || data.name;
                return {
                  contentUrl: `${baseUrl}/${fileName}`,
                  metadataUrl: baseUrl,
                  fileName: fileName,
                  contentType: data.contentType || data.type
                };
              }
            } catch (e) {
              // Not JSON, might be HTML directory listing
              // For now, return the base URL
              console.warn('Could not parse response as JSON:', e);
            }
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch from ${gateway}:`, err);
        // Try next gateway
        continue;
      }
    }
    
    // If all gateways fail, return the basic URL
    return {
      contentUrl: this.getFileUrl(cid)
    };
  }

  // ✅ Fetch metadata from IPFS
  async fetchMetadata(cid: string): Promise<ContentMetadata | null> {
    if (!cid) return null;

    for (const gateway of IPFS_GATEWAYS) {
      try {
        const url = `${gateway}${cid}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(url, { method: 'GET', signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
          const text = await res.text();
          return JSON.parse(text);
        }
      } catch (err) {
        continue; // try next gateway
      }
    }
    return null;
  }

  // ✅ NEW: Switch to next gateway if current one fails
  switchGateway(): void {
    this.currentGatewayIndex = (this.currentGatewayIndex + 1) % IPFS_GATEWAYS.length;
    console.log('Switched to gateway:', IPFS_GATEWAYS[this.currentGatewayIndex]);
  }

  // ✅ NEW: Get current gateway
  getCurrentGateway(): string {
    return IPFS_GATEWAYS[this.currentGatewayIndex];
  }

  // ✅ Optional: Check Lighthouse account stats
  async getStorageStats(): Promise<any> {
    try {
      const lighthouseAny = lighthouse as any;
      if (typeof lighthouseAny.getStorageStats === 'function') {
        return await lighthouseAny.getStorageStats(LIGHTHOUSE_API_KEY);
      }
      return null;
    } catch (err) {
      console.error('getStorageStats error:', err);
      return null;
    }
  }

  // ✅ Public validation helper
  validateFile(file: File): { valid: boolean; error?: string } {
    return validateFileForUpload(file);
  }
}

export const storageService = new DecentralizedStorageService();
export { DecentralizedStorageService };
export default storageService;
