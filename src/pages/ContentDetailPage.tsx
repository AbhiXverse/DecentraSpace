// src/pages/ContentDetailPage.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  Heart,
  Calendar,
  ExternalLink,
  Share2,
  AlertCircle,
  Eye,
  Wallet,
  User,
  Play,
  Download,
  Film,
  Image,
  FileText
} from 'lucide-react';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { storageService } from '../services/storageService';
import type { Content } from '../types/contractTypes';

interface EnhancedContent extends Content {
  formattedDate: string;
  earningsInEth: number;
  contentUrl: string;
  creatorName?: string;
  mediaType?: 'video' | 'image' | 'document' | 'unknown';
  fileName?: string;
}

const ContentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    isConnected,
    accountId,
    tipContent,
    contractServiceInstance,
    isLoading: contractLoading,
    error: contractError,
    networkInfo
  } = useContractIntegration();

  const [content, setContent] = useState<EnhancedContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tipping, setTipping] = useState(false);
  const [tipAmount, setTipAmount] = useState('0.001');
  const [viewTracked, setViewTracked] = useState(false);
  const [mediaLoadError, setMediaLoadError] = useState(false);

  // Utility functions
  const formatTimestamp = (timestamp: number): string => {
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const convertEarnings = (earnings: string): number => {
    try {
      return parseFloat(earnings) / 1e18;
    } catch {
      return 0;
    }
  };

  // Enhanced media type detection that checks both URL and metadata
  const detectMediaType = async (cid: string, ipfsGatewayUrl: string): Promise<{
    mediaType: 'video' | 'image' | 'document' | 'unknown';
    contentUrl: string;
    fileName?: string;
  }> => {
    try {
      // First, try to fetch metadata from IPFS
      const metadataResponse = await fetch(ipfsGatewayUrl);
      if (metadataResponse.ok) {
        const contentType = metadataResponse.headers.get('content-type');
        
        // Check if response is JSON (metadata)
        if (contentType?.includes('application/json')) {
          const metadata = await metadataResponse.json();
          const fileName = metadata.fileName || metadata.name || '';
          const fileType = metadata.contentType || metadata.type || '';
          
          // Construct direct file URL
          let directFileUrl = ipfsGatewayUrl;
          
          // If the current URL doesn't include the filename, append it
          if (fileName && !ipfsGatewayUrl.includes(fileName)) {
            directFileUrl = `${ipfsGatewayUrl}/${fileName}`;
          }
          
          // Determine media type from metadata or filename
          let mediaType: 'video' | 'image' | 'document' | 'unknown' = 'unknown';
          
          if (fileType.includes('video') || fileName.match(/\.(mp4|webm|ogg|mov)$/i)) {
            mediaType = 'video';
          } else if (fileType.includes('image') || fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
            mediaType = 'image';
          } else if (fileType.includes('pdf') || fileType.includes('document') || fileName.match(/\.(pdf|doc|docx|txt)$/i)) {
            mediaType = 'document';
          }
          
          return { mediaType, contentUrl: directFileUrl, fileName };
        }
        
        // If not JSON, check content type directly
        if (contentType?.includes('video')) return { mediaType: 'video', contentUrl: ipfsGatewayUrl };
        if (contentType?.includes('image')) return { mediaType: 'image', contentUrl: ipfsGatewayUrl };
        if (contentType?.includes('pdf') || contentType?.includes('document')) return { mediaType: 'document', contentUrl: ipfsGatewayUrl };
      }
      
      // Fallback: check URL extension
      const extension = ipfsGatewayUrl.split('.').pop()?.toLowerCase();
      if (['mp4', 'webm', 'ogg', 'mov'].includes(extension || '')) {
        return { mediaType: 'video', contentUrl: ipfsGatewayUrl };
      }
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
        return { mediaType: 'image', contentUrl: ipfsGatewayUrl };
      }
      if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) {
        return { mediaType: 'document', contentUrl: ipfsGatewayUrl };
      }
      
      return { mediaType: 'unknown', contentUrl: ipfsGatewayUrl };
    } catch (err) {
      console.error('Error detecting media type:', err);
      return { mediaType: 'unknown', contentUrl: ipfsGatewayUrl };
    }
  };

  // Track view (only once per session)
  const trackView = async () => {
    if (!content || !contractServiceInstance || viewTracked) return;

    try {
      await contractServiceInstance.viewContent(content.id);
      setViewTracked(true);
      // Update local view count
      setContent(prev => prev ? { ...prev, views: prev.views + 1 } : null);
    } catch (err) {
      console.error('Failed to track view:', err);
    }
  };

  // Fetch content data
  useEffect(() => {
    const fetchContent = async () => {
      if (!id || !contractServiceInstance) return;

      try {
        setLoading(true);
        setError(null);
        setMediaLoadError(false);

        const fetchedContent = await contractServiceInstance.getContent(id);
        if (!fetchedContent) {
          setError('Content not found');
          return;
        }

        // Get IPFS gateway URL
        const ipfsGatewayUrl = storageService.getFileUrl(fetchedContent.cid);
        
        // Detect media type and get proper content URL
        const { mediaType, contentUrl, fileName } = await detectMediaType(fetchedContent.cid, ipfsGatewayUrl);

        // Get creator name
        let creatorName = 'Unknown Creator';
        try {
          const creator = await contractServiceInstance.getCreator(fetchedContent.creator);
          creatorName = creator.name || `Creator ${fetchedContent.creator.slice(0, 6)}...`;
        } catch (err) {
          console.warn('Failed to fetch creator name:', err);
        }

        const enhancedContent: EnhancedContent = {
          ...fetchedContent,
          formattedDate: formatTimestamp(fetchedContent.timestamp),
          earningsInEth: convertEarnings(fetchedContent.tipsReceived),
          contentUrl,
          creatorName,
          mediaType,
          fileName
        };

        setContent(enhancedContent);
      } catch (err: any) {
        console.error('Failed to fetch content:', err);
        setError('Failed to load content. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [id, contractServiceInstance]);

  // Track view when content loads
  useEffect(() => {
    if (content && !viewTracked) {
      // Track view after a short delay to ensure content is actually viewed
      const timer = setTimeout(() => {
        trackView();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [content, viewTracked]);

  // Handle tip
  const handleTip = async () => {
    if (!content || !tipAmount || parseFloat(tipAmount) <= 0) {
      setError('Please enter a valid ETH amount');
      return;
    }

    try {
      setTipping(true);
      setError(null);

      await tipContent(content.id, tipAmount);
      
      // Update local state
      setContent(prev => prev ? {
        ...prev,
        tipsReceived: (parseFloat(prev.tipsReceived) + parseFloat(tipAmount) * 1e18).toString(),
        earningsInEth: prev.earningsInEth + parseFloat(tipAmount)
      } : null);
      
      alert(`✅ Successfully tipped ${tipAmount} ETH!`);
      setTipAmount('0.001');
    } catch (err: any) {
      console.error('Tip failed:', err);
      setError('Failed to send tip. Please try again.');
    } finally {
      setTipping(false);
    }
  };

  // Handle share
  const handleShare = async () => {
    const shareData = {
      title: content?.title || 'Check out this content',
      text: `Check out "${content?.title}" by ${content?.creatorName} on DecentraSpace!`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold mb-2">Loading Content</h3>
          <p className="text-gray-400">Fetching content from blockchain...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !content) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-red-400 mb-4">Content Not Found</h2>
          <p className="text-gray-400 mb-6 text-lg">
            {error || 'The content you\'re looking for doesn\'t exist or has been removed.'}
          </p>
          <div className="space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
            >
              Go Back
            </button>
            <button
              onClick={() => navigate('/discover')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Discover Content
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Navigation */}
        <button 
          onClick={() => navigate(-1)} 
          className="mb-6 text-sm text-purple-400 hover:text-purple-300 flex items-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to previous page
        </button>

        {/* Content Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">{content.title}</h1>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <button
                onClick={() => navigate(`/profile?creator=${content.creator}`)}
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                {content.creatorName}
              </button>
            </span>
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {content.formattedDate}
            </span>
            <span className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {content.views} views
            </span>
          </div>
        </div>

        {/* Network Warning */}
        {!networkInfo.isCorrectNetwork && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-300">Please switch to Sepolia testnet to tip content.</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Content Display */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              
              {/* Media Content */}
              {content.mediaType === 'video' && !mediaLoadError && (
                <div className="relative">
                  <video
                    src={content.contentUrl}
                    controls
                    controlsList="nodownload"
                    className="w-full rounded-xl bg-black mb-4"
                    onError={() => {
                      console.error('Video failed to load:', content.contentUrl);
                      setMediaLoadError(true);
                    }}
                    poster={`https://api.dicebear.com/7.x/shapes/svg?seed=${content.id}`}
                  >
                    Your browser doesn't support video playback.
                  </video>
                  {content.fileName && (
                    <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                      <Film className="w-4 h-4" />
                      {content.fileName}
                    </p>
                  )}
                </div>
              )}
              
              {content.mediaType === 'image' && !mediaLoadError && (
                <div>
                  <img
                    src={content.contentUrl}
                    alt={content.title}
                    className="w-full rounded-xl mb-4"
                    onError={() => {
                      console.error('Image failed to load:', content.contentUrl);
                      setMediaLoadError(true);
                    }}
                  />
                  {content.fileName && (
                    <p className="text-sm text-gray-400 mb-4 flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      {content.fileName}
                    </p>
                  )}
                </div>
              )}
              
              {content.mediaType === 'document' && (
                <div className="bg-slate-700 rounded-xl p-8 text-center mb-4">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">Document: {content.fileName || 'Document'}</p>
                  <p className="text-gray-400 text-sm mb-4">Click below to view the document</p>
                  <a
                    href={content.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors inline-flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    View Document
                  </a>
                </div>
              )}

              {(content.mediaType === 'unknown' || mediaLoadError) && (
                <div className="bg-slate-700 rounded-xl p-8 text-center mb-4">
                  <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-300 mb-2">
                    {mediaLoadError ? 'Failed to load media content' : 'Media content'}
                  </p>
                  {content.fileName && (
                    <p className="text-gray-400 text-sm mb-4">File: {content.fileName}</p>
                  )}
                  <a
                    href={content.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors inline-flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </a>
                </div>
              )}

              {/* Content Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleShare}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
                <a
                  href={content.contentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Original
                </a>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            
            {/* Content Stats */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Content Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Tips Received
                  </span>
                  <span className="text-white font-semibold">
                    {content.earningsInEth.toFixed(4)} ETH
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Views
                  </span>
                  <span className="text-white font-semibold">
                    {content.views}
                  </span>
                </div>
              </div>
            </div>

            {/* Tip Section */}
            {isConnected && networkInfo.isCorrectNetwork && (
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-400" />
                  Support Creator
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount (ETH)
                    </label>
                    <input
                      type="number"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      step="0.001"
                      min="0.001"
                      className="w-full bg-slate-700 border border-slate-600 px-4 py-3 rounded-xl text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                      disabled={tipping}
                    />
                  </div>
                  <button
                    onClick={handleTip}
                    disabled={tipping || !tipAmount || parseFloat(tipAmount) <= 0}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    {tipping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending Tip...
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4" />
                        Send Tip
                      </>
                    )}
                  </button>
                  <p className="text-gray-400 text-sm text-center">
                    Tips are sent directly to the creator's wallet
                  </p>
                </div>
              </div>
            )}

            {/* Creator Info */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Creator</h3>
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={`https://api.dicebear.com/7.x/identicon/svg?seed=${content.creator}`}
                  alt={content.creatorName}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <p className="text-white font-semibold">{content.creatorName}</p>
                  <p className="text-gray-400 text-sm font-mono">
                    {content.creator.slice(0, 6)}...{content.creator.slice(-4)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/profile?creator=${content.creator}`)}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <User className="w-4 h-4" />
                View Profile
              </button>
            </div>

            {/* Technical Details */}
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">Technical Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Content ID:</span>
                  <p className="text-white font-mono break-all">{content.id}</p>
                </div>
                <div>
                  <span className="text-gray-400">IPFS CID:</span>
                  <p className="text-white font-mono break-all">{content.cid}</p>
                </div>
                <div>
                  <span className="text-gray-400">Creator Address:</span>
                  <p className="text-white font-mono break-all">{content.creator}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentDetailPage;
