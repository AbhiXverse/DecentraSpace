// src/components/UploadContent.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Upload, 
  File, 
  X, 
  AlertCircle, 
  Loader2, 
  Check, 
  User, 
  FileText, 
  Tag,
  Image,
  Video,
  Music,
  Sparkles
} from 'lucide-react';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { UploadProgress } from '../services/storageService';

const UploadContent: React.FC = () => {
  const navigate = useNavigate();
  const {
    accountId,
    isConnected,
    uploadContent,
    isLoading: contractLoading,
    userProfile,
    error: contractError,
    networkInfo,
    isCreatorRegistered,
    uploadState
  } = useContractIntegration();

  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [dragActive, setDragActive] = useState(false);
  
  // Component state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [checkingRegistration, setCheckingRegistration] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'application/msword'];
    const maxSize = 100 * 1024 * 1024; // 100MB
    
    if (!file) return { valid: false, error: 'No file selected' };
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: `Unsupported file type: ${file.type}. Supported: MP4, WebM, OGG, JPG, PNG, GIF, PDF, DOC` };
    }
    if (file.size === 0) return { valid: false, error: 'File is empty' };
    if (file.size > maxSize) return { valid: false, error: 'File exceeds 100MB limit' };
    
    return { valid: true };
  };

  // Check creator registration status
  useEffect(() => {
    const checkRegistration = async () => {
      if (isConnected && accountId) {
        setCheckingRegistration(true);
        try {
          const registered = await isCreatorRegistered(accountId);
          setIsRegistered(registered);
        } catch (err) {
          console.error('Failed to check registration:', err);
          setIsRegistered(false);
        } finally {
          setCheckingRegistration(false);
        }
      }
    };

    checkRegistration();
  }, [isConnected, accountId, isCreatorRegistered]);

  // Handle file selection
  const handleFileSelect = (selectedFile: File) => {
    const validation = validateFile(selectedFile);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } else {
      setFile(selectedFile);
      setError(null);
      // Auto-generate title from filename if empty
      if (!title) {
        const fileName = selectedFile.name;
        const nameWithoutExtension = fileName.substring(0, fileName.lastIndexOf('.')) || fileName;
        setTitle(nameWithoutExtension);
      }
    }
  };

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Handle form submission
  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setError('Title and file are required');
      return;
    }

    if (!isConnected || !accountId) {
      setError('Please connect your wallet first');
      return;
    }

    if (!networkInfo.isCorrectNetwork) {
      setError('Please switch to Sepolia testnet');
      return;
    }

    if (isRegistered === false) {
      setError('Please register as a creator first');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(null);

    try {
      const tagArray = tags.split(',').map(tag => tag.trim()).filter(Boolean);
      
      await uploadContent(
        title.trim(),
        file,
        description.trim(),
        tagArray,
        (progress) => setUploadProgress(progress)
      );

      setSuccessMessage('🎉 Content uploaded successfully!');
      console.log('✅ Content uploaded successfully');
      
      // Reset form after success
      setTimeout(() => {
        resetForm();
        navigate('/profile'); // Redirect to profile to see uploaded content
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Upload failed:', err);
      setError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFile(null);
    setTitle('');
    setDescription('');
    setTags('');
    setSuccessMessage(null);
    setError(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Get file type icon
  const getFileTypeIcon = (file: File) => {
    if (file.type.startsWith('video/')) return <Video className="w-6 h-6 text-blue-400" />;
    if (file.type.startsWith('image/')) return <Image className="w-6 h-6 text-green-400" />;
    if (file.type.startsWith('audio/')) return <Music className="w-6 h-6 text-purple-400" />;
    return <FileText className="w-6 h-6 text-gray-400" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Upload className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">Please connect your wallet to upload content.</p>
          <Link
            to="/"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center gap-3 mb-4">
            <Upload className="text-purple-400" />
            Upload Content
          </h1>
          <p className="text-gray-400 text-lg">
            Share your creativity with the DecentraSpace community
          </p>
        </div>

        {/* Network Warning */}
        {!networkInfo.isCorrectNetwork && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-yellow-300 font-medium">Wrong Network</p>
              <p className="text-yellow-200 text-sm">
                Please switch to Sepolia testnet. Current: {networkInfo.networkName || 'Unknown'}
              </p>
            </div>
          </div>
        )}

        {/* Registration Check */}
        {checkingRegistration && (
          <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4 mb-8 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <p className="text-blue-300">Checking creator registration status...</p>
          </div>
        )}

        {/* Not Registered Warning */}
        {!checkingRegistration && isRegistered === false && (
          <div className="bg-orange-500/20 border border-orange-500 rounded-xl p-4 mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-orange-300 font-medium">Creator Registration Required</p>
              <p className="text-orange-200 text-sm">Please register as a creator before uploading content.</p>
            </div>
            <Link
              to="/profile"
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Register
            </Link>
          </div>
        )}

        {/* Upload Form */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700">
          
          {/* File Upload Area */}
          <div className="mb-8">
            <label className="block text-white font-medium mb-4">
              Upload File <span className="text-red-400">*</span>
            </label>
            
            <div
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                dragActive 
                  ? 'border-purple-500 bg-purple-500/10' 
                  : 'border-slate-600 hover:border-slate-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    {getFileTypeIcon(file)}
                    <span className="text-white font-medium">{file.name}</span>
                  </div>
                  <p className="text-gray-400">{formatFileSize(file.size)}</p>
                  <button
                    onClick={() => {
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="text-red-400 hover:text-red-300 flex items-center gap-2 mx-auto transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-white font-medium mb-2">
                      Drop your file here or click to browse
                    </p>
                    <p className="text-gray-400 text-sm">
                      Supported: MP4, WebM, OGG, JPG, PNG, GIF, PDF, DOC (max 100MB)
                    </p>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                  >
                    Choose File
                  </button>
                </div>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.webm,.ogg,.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </div>

          {/* Content Details */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-white font-medium mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter content title"
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                disabled={uploading}
                maxLength={100}
              />
              <p className="text-gray-400 text-xs mt-1">
                {title.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-white font-medium mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your content..."
                rows={4}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                disabled={uploading}
                maxLength={500}
              />
              <p className="text-gray-400 text-xs mt-1">
                {description.length}/500 characters
              </p>
            </div>

            {/* Tags */}
            <div className="md:col-span-2">
              <label className="block text-white font-medium mb-2">
                Tags
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Enter tags separated by commas (e.g., music, art, tutorial)"
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                disabled={uploading}
              />
              <p className="text-gray-400 text-xs mt-1">
                Separate tags with commas
              </p>
            </div>
          </div>

          {/* Upload Progress */}
          {(uploadProgress || uploadState.progress) && (
            <div className="mb-8 p-4 bg-blue-500/20 border border-blue-500 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-blue-300 font-medium">
                  {uploadProgress?.message || uploadState.progress?.message || 'Uploading...'}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress?.progress || uploadState.progress?.progress || 0}%` }}
                />
              </div>
              <p className="text-blue-200 text-sm mt-1">
                {uploadProgress?.progress || uploadState.progress?.progress || 0}% complete
              </p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-8 p-4 bg-green-500/20 border border-green-500 rounded-xl flex items-center gap-3">
              <Check className="w-5 h-5 text-green-400" />
              <p className="text-green-300 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Error Display */}
          {(error || contractError) && (
            <div className="mb-8 p-4 bg-red-500/20 border border-red-500 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300">{error || contractError}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleUpload}
              disabled={
                uploading || 
                contractLoading || 
                !file || 
                !title.trim() || 
                isRegistered === false ||
                !networkInfo.isCorrectNetwork
              }
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 transition-all duration-200"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload Content
                </>
              )}
            </button>
            
            <button
              onClick={resetForm}
              disabled={uploading || contractLoading}
              className="sm:w-auto px-8 py-4 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-colors"
            >
              Reset Form
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-8 p-4 bg-slate-700/30 border border-slate-600/30 rounded-xl">
            <h4 className="text-white font-medium mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Upload Tips
            </h4>
            <ul className="text-gray-300 text-sm space-y-1">
              <li>• Choose a clear, descriptive title for better discoverability</li>
              <li>• Add relevant tags to help others find your content</li>
              <li>• Your content will be stored on IPFS for permanent availability</li>
              <li>• Gas fees will apply for blockchain registration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadContent;