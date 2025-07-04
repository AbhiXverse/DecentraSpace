// src/components/FeaturedContent.tsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, Heart, Loader2, Image, Video, Music, FileText, Upload, AlertCircle, Eye, Star, User
} from 'lucide-react';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { storageService } from '../services/storageService';
import { Content } from '../types/contractTypes';

interface EnhancedContent extends Content {
  creatorName: string;
  creatorAvatar: string;
  formattedDate: string;
  earningsInEth: number;
  contentUrl: string;
  contentType: string;
}

const FeaturedContent: React.FC = () => {
  const navigate = useNavigate();
  const {
    isConnected,
    accountId,
    contractServiceInstance,
    tipContent,
    networkInfo,
    isLoading: contractLoading,
    error: contractError
  } = useContractIntegration();

  const [featuredContent, setFeaturedContent] = useState<EnhancedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tipping, setTipping] = useState<string | null>(null);

  const detectContentType = (title: string, cid: string): string => {
    const titleLower = title.toLowerCase();
    const cidLower = cid.toLowerCase();
    
    // Check by title extension
    if (titleLower.includes('.mp4') || titleLower.includes('.avi') || titleLower.includes('.mov') || 
        titleLower.includes('.webm') || titleLower.includes('.mkv')) return 'video';
    if (titleLower.includes('.jpg') || titleLower.includes('.jpeg') || titleLower.includes('.png') || 
        titleLower.includes('.gif') || titleLower.includes('.webp')) return 'image';
    if (titleLower.includes('.mp3') || titleLower.includes('.wav') || titleLower.includes('.ogg') || 
        titleLower.includes('.flac')) return 'audio';
    if (titleLower.includes('.pdf') || titleLower.includes('.doc') || titleLower.includes('.docx') || 
        titleLower.includes('.txt')) return 'document';
    
    // Default to video for most content
    return 'video';
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4" />;
      case 'image': return <Image className="w-4 h-4" />;
      case 'audio': return <Music className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      default: return <Video className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  const convertEarnings = (earnings: string): number => {
    try {
      return parseFloat(earnings) / 1e18;
    } catch {
      return 0;
    }
  };

  const fetchFeaturedContent = async () => {
    if (!contractServiceInstance) {
      console.warn('Contract service not ready');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('🎬 Fetching featured content...');
      
      // Use the built-in getLatestContents method instead of hardcoded IDs
      const contents = await contractServiceInstance.getLatestContents(6);
      console.log(`✅ Found ${contents.length} content items`);

      if (contents.length === 0) {
        setFeaturedContent([]);
        return;
      }

      // Enhance each content item
      const enhanced = await Promise.all(
        contents.map(async (content): Promise<EnhancedContent> => {
          try {
            // Get creator info
            let creatorName = 'Unknown Creator';
            try {
              const creator = await contractServiceInstance.getCreator(content.creator);
              creatorName = creator.name || `Creator ${content.creator.slice(0, 6)}...`;
            } catch (err) {
              console.warn(`Failed to fetch creator for ${content.creator}:`, err);
            }

            return {
              ...content,
              creatorName,
              creatorAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${content.creator}`,
              formattedDate: formatTimestamp(content.timestamp),
              earningsInEth: convertEarnings(content.tipsReceived),
              contentUrl: storageService.getFileUrl(content.cid),
              contentType: detectContentType(content.title, content.cid)
            };
          } catch (err) {
            console.error(`Failed to enhance content ${content.id}:`, err);
            // Return basic content without enhancement
            return {
              ...content,
              creatorName: `${content.creator.slice(0, 6)}...${content.creator.slice(-4)}`,
              creatorAvatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${content.creator}`,
              formattedDate: formatTimestamp(content.timestamp),
              earningsInEth: convertEarnings(content.tipsReceived),
              contentUrl: storageService.getFileUrl(content.cid),
              contentType: 'video'
            };
          }
        })
      );

      setFeaturedContent(enhanced);
      console.log('✅ Featured content loaded successfully');
      
    } catch (err: any) {
      console.error('❌ Failed to fetch featured content:', err);
      setError('Failed to load featured content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTipContent = async (contentId: string, title: string) => {
    if (!isConnected) {
      alert('❌ Please connect your wallet first');
      return;
    }

    if (!networkInfo.isCorrectNetwork) {
      alert('❌ Please switch to Sepolia testnet');
      return;
    }

    try {
      setTipping(contentId);
      console.log(`💰 Tipping content ${title}...`);
      
      const tipAmount = '0.001'; // 0.001 ETH
      await tipContent(contentId, tipAmount);
      
      // Update local state
      setFeaturedContent(prev =>
        prev.map(content =>
          content.id === contentId
            ? { ...content, earningsInEth: content.earningsInEth + parseFloat(tipAmount) }
            : content
        )
      );
      
      alert(`✅ Successfully tipped ${tipAmount} ETH to "${title}"!`);
      console.log('✅ Tip sent successfully');
      
    } catch (err: any) {
      console.error('❌ Tip failed:', err);
      let errorMessage = 'Failed to send tip. ';
      if (err.message?.includes('User denied') || err.message?.includes('rejected')) {
        errorMessage += 'Transaction was rejected.';
      } else if (err.message?.includes('insufficient')) {
        errorMessage += 'Insufficient ETH balance.';
      } else {
        errorMessage += 'Please try again.';
      }
      alert('❌ ' + errorMessage);
    } finally {
      setTipping(null);
    }
  };

  const renderContentMedia = (content: EnhancedContent) => {
    const { contentType, contentUrl, title, id } = content;
    
    switch (contentType) {
      case 'video':
        return (
          <div className="relative aspect-video bg-black rounded-t-xl overflow-hidden">
            <video 
              className="w-full h-full object-cover" 
              poster={`https://api.dicebear.com/7.x/shapes/svg?seed=${id}`}
              onError={(e) => {
                console.warn('Video load failed:', contentUrl);
              }}
            >
              <source src={contentUrl} type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Video className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="relative aspect-video bg-slate-700 rounded-t-xl overflow-hidden">
            <img
              src={contentUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = `https://api.dicebear.com/7.x/shapes/svg?seed=${id}`;
              }}
            />
          </div>
        );
      case 'audio':
        return (
          <div className="aspect-video bg-gradient-to-br from-purple-600 to-pink-600 rounded-t-xl flex items-center justify-center">
            <Music className="w-16 h-16 text-white" />
          </div>
        );
      case 'document':
        return (
          <div className="aspect-video bg-gradient-to-br from-blue-600 to-cyan-600 rounded-t-xl flex items-center justify-center">
            <FileText className="w-16 h-16 text-white" />
          </div>
        );
      default:
        return (
          <div className="aspect-video bg-slate-700 rounded-t-xl flex items-center justify-center">
            <Video className="w-16 h-16 text-gray-400" />
          </div>
        );
    }
  };

  useEffect(() => {
    if (contractServiceInstance) {
      fetchFeaturedContent();
    }
  }, [contractServiceInstance]);

  if (loading || contractLoading) {
    return (
      <section className="py-20 bg-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold mb-2">Loading Featured Content</h3>
          <p className="text-gray-400">Discovering amazing content...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-slate-800 text-white">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12">
          <div className="mb-6 md:mb-0">
            <h2 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
              <Star className="text-yellow-400" />
              Featured Content
            </h2>
            <p className="text-gray-400">
              Discover amazing content from our talented creators
            </p>
          </div>
          <Link
            to="/upload"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 self-start"
          >
            <Upload className="w-5 h-5" />
            Upload Content
          </Link>
        </div>

        {/* Error Display */}
        {(error || contractError) && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">{error || contractError}</p>
          </div>
        )}

        {/* Content Grid */}
        {featuredContent.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredContent.map((content) => (
              <div
                key={content.id}
                className="bg-slate-900/50 backdrop-blur rounded-2xl overflow-hidden border border-slate-700 hover:border-purple-500 transition-all duration-300 hover:transform hover:scale-105"
              >
                {/* Content Media */}
                <Link to={`/content/${content.id}`}>
                  {renderContentMedia(content)}
                </Link>
                
                {/* Content Info */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-3 line-clamp-2">
                    {content.title}
                  </h3>
                  
                  {/* Creator Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={content.creatorAvatar}
                      alt={content.creatorName}
                      className="w-10 h-10 rounded-full border-2 border-slate-600"
                    />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/profile?creator=${content.creator}`)}
                        className="text-purple-400 hover:text-purple-300 font-medium truncate block transition-colors"
                      >
                        {content.creatorName}
                      </button>
                      <p className="text-gray-400 text-sm">
                        {content.formattedDate}
                      </p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-4">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {content.views}
                      </span>
                      <span className="flex items-center gap-1">
                        {getContentTypeIcon(content.contentType)}
                        {content.contentType}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-purple-400 font-medium">
                      <Heart className="w-4 h-4" />
                      {content.earningsInEth.toFixed(4)} ETH
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Link
                      to={`/content/${content.id}`}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                    
                    {isConnected && networkInfo.isCorrectNetwork && (
                      <button
                        disabled={tipping === content.id}
                        onClick={() => handleTipContent(content.id, content.title)}
                        className={`px-4 py-3 rounded-xl text-white bg-slate-700 hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 ${
                          tipping === content.id ? 'opacity-50 cursor-wait' : ''
                        }`}
                        title="Tip 0.001 ETH"
                      >
                        {tipping === content.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Heart className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          
          /* Empty State */
          <div className="text-center py-20">
            <div className="bg-slate-900/50 rounded-2xl p-12 border border-slate-700">
              <Video className="w-16 h-16 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-semibold text-white mb-2">No Content Yet</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                Be the first to share your creativity with the DecentraSpace community!
              </p>
              <Link
                to="/upload"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 inline-flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Your First Content
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedContent;
