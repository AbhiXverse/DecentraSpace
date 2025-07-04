// src/components/DiscoverCreators.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Heart, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Star, 
  Loader2, 
  Search,
  Filter,
  Eye,
  Calendar,
  Wallet,
  User,
  AlertCircle,
  FileText
} from 'lucide-react';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { storageService, ContentMetadata } from '../services/storageService';
import type { Creator } from '../types/contractTypes';

interface ProfileMetadata {
  name: string;
  bio: string;
  avatar: string;
  category?: string;
  socials?: {
    twitter?: string;
    instagram?: string;
    website?: string;
  };
}

interface EnhancedCreator extends Creator {
  // From IPFS
  profileData: ProfileMetadata;
  
  // Computed fields
  formattedDate: string;
  earningsInEth: number;
  
  // Status
  profileDataLoaded: boolean;
  
  // Address
  address: string;
}

interface DiscoverCreatorsProps {
  isFullPage?: boolean;
  limit?: number;
}

const DiscoverCreators: React.FC<DiscoverCreatorsProps> = ({ 
  isFullPage = false, 
  limit 
}) => {
  const navigate = useNavigate();
  const { 
    isConnected,
    accountId,
    isLoading: walletLoading,
    error: walletError,
    contractServiceInstance
  } = useContractIntegration();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  
  // Data state
  const [creators, setCreators] = useState<EnhancedCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Interaction state
  const [tipping, setTipping] = useState<string | null>(null);

  // Available categories
  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'music', label: 'Music' },
    { id: 'art', label: 'Art' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'education', label: 'Education' },
    { id: 'technology', label: 'Technology' },
    { id: 'general', label: 'General' }
  ];

  // Sort options
  const sortOptions = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'newest', label: 'Newest', icon: Clock },
    { id: 'earnings', label: 'Top Earners', icon: Star },
    { id: 'content', label: 'Most Content', icon: FileText },
  ];

  // Format timestamp from seconds
  const formatTimestamp = (timestamp: number): string => {
    try {
      const date = new Date(timestamp * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  // Convert Wei to ETH
  const convertEarnings = (earnings: string): number => {
    try {
      // Convert from Wei to ETH (18 decimals)
      return parseFloat(earnings) / 1e18;
    } catch {
      return 0;
    }
  };

  // Extract category from bio/description
  const extractCategory = (bio: string): string => {
    const lowerBio = bio.toLowerCase();
    
    if (lowerBio.includes('music') || lowerBio.includes('song') || lowerBio.includes('audio')) return 'music';
    if (lowerBio.includes('art') || lowerBio.includes('design') || lowerBio.includes('visual')) return 'art';
    if (lowerBio.includes('game') || lowerBio.includes('gaming') || lowerBio.includes('esport')) return 'gaming';
    if (lowerBio.includes('teach') || lowerBio.includes('education') || lowerBio.includes('learn')) return 'education';
    if (lowerBio.includes('tech') || lowerBio.includes('code') || lowerBio.includes('develop')) return 'technology';
    
    return 'general';
  };

  // Fetch creator profile from IPFS or generate fallback
  const fetchCreatorProfile = async (address: string, creatorData: Creator): Promise<ProfileMetadata> => {
    try {
      // First try to extract any stored profile metadata
      // In a real implementation, you might have a profile CID stored in the contract
      // For now, we'll use the creator data from the contract and enhance it
      
      const displayName = creatorData.name || `Creator ${address.substring(0, 6)}...${address.substring(38)}`;
      const bio = creatorData.description || 'Creator on DecentraSpace';
      const category = extractCategory(bio);
      
      return {
        name: displayName,
        bio: bio,
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
        category: category,
        socials: {
          // Could be extracted from description or stored separately
          website: undefined,
          twitter: undefined,
          instagram: undefined
        }
      };
    } catch (error) {
      console.warn(`Failed to fetch profile for ${address}:`, error);
      return {
        name: `${address.substring(0, 6)}...${address.substring(38)}`,
        bio: 'Creator on DecentraSpace',
        avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
        category: 'general'
      };
    }
  };

  // Main function to fetch and enhance creators
  const fetchCreators = async () => {
    if (!contractServiceInstance) {
      console.warn('Contract service not ready yet');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('🔍 Fetching all creators...');
      
      // Get featured creators from smart contract
      const creatorAddresses = await contractServiceInstance.getFeaturedCreators();
      console.log(`✅ Found ${creatorAddresses.length} creators on-chain`);

      if (creatorAddresses.length === 0) {
        setCreators([]);
        return;
      }

      // Enhance each creator with profile data
      const enhancedCreators = await Promise.all(
        creatorAddresses.map(async(address): Promise<EnhancedCreator> => {
          try {
            // Get creator data from contract
            const creator = await contractServiceInstance.getCreator(address);
            
            // Fetch/generate profile data
            const profileData = await fetchCreatorProfile(address, creator);
            
            return {
              ...creator,
              address,
              profileData,
              formattedDate: formatTimestamp(creator.createdAt),
              earningsInEth: convertEarnings(creator.totalEarnings),
              profileDataLoaded: true,
            };
          } catch (error) {
            console.warn(`Failed to load data for ${address}:`, error);
            
            // Return fallback creator data
            const fallbackCreator: Creator = {
              name: 'Unknown Creator',
              description: 'Creator on DecentraSpace',
              totalEarnings: '0',
              contentCount: 0,
              liveRoomCount: 0,
              createdAt: Math.floor(Date.now() / 1000)
            };
            
            const fallbackProfile = await fetchCreatorProfile(address, fallbackCreator);
            
            return {
              ...fallbackCreator,
              address,
              profileData: fallbackProfile,
              formattedDate: formatTimestamp(fallbackCreator.createdAt),
              earningsInEth: 0,
              profileDataLoaded: false,
            };
          }
        })
      );

      // Apply limit if specified (for homepage usage)
      const finalCreators = limit ? enhancedCreators.slice(0, limit) : enhancedCreators;
      
      setCreators(finalCreators);
      console.log('✅ Creators enhanced with profile data');
      
    } catch (err: any) {
      console.error('❌ Error fetching creators:', err);
      setError('Failed to load creators. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  // Load creators when component mounts and contract service is ready
  useEffect(() => {
    if (contractServiceInstance) {
      fetchCreators();
    }
  }, [contractServiceInstance, limit]); // Added limit as dependency

  // Filter creators based on search and category
  const filteredCreators = creators.filter((creator) => {
    const matchesSearch = searchQuery === '' || 
      creator.profileData.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.profileData.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      creator.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      (creator.profileData.category && creator.profileData.category === selectedCategory);
    
    return matchesSearch && matchesCategory;
  });

  // Sort creators based on selected criteria
  const sortedCreators = [...filteredCreators].sort((a, b) => {
    switch (sortBy) {
      case 'earnings':
        return b.earningsInEth - a.earningsInEth;
      case 'newest':
        return b.createdAt - a.createdAt;
      case 'content':
        return b.contentCount - a.contentCount;
      case 'trending':
      default:
        // Trending = combination of earnings + content count + recency
        const scoreA = a.earningsInEth + (a.contentCount * 0.1) + (a.createdAt / 1e6);
        const scoreB = b.earningsInEth + (b.contentCount * 0.1) + (b.createdAt / 1e6);
        return scoreB - scoreA;
    }
  });

  // Handle profile navigation
  const handleViewProfile = (creatorAddress: string) => {
    navigate(`/profile?creator=${creatorAddress}`);
  };

  // Handle creator tipping
  const handleTip = async (creator: EnhancedCreator) => {
    if (!isConnected) {
      alert('❌ Please connect your wallet to send tips');
      return;
    }

    if (!contractServiceInstance) {
      alert('❌ Contract service not ready. Please try again.');
      return;
    }

    try {
      setTipping(creator.address);
      console.log(`💰 Tipping creator ${creator.profileData.name}...`);
      
      // Tip 0.001 ETH (smaller amount for Sepolia testnet)
      await contractServiceInstance.tipCreator(creator.address, '0.001');
      
      // Refresh creator data to get updated earnings
      await fetchCreators();
      
      alert(`✅ Successfully tipped 0.001 ETH to ${creator.profileData.name}!`);
      console.log('✅ Tip sent successfully');
      
    } catch (err: any) {
      console.error('❌ Tipping failed:', err);
      
      let errorMessage = 'Failed to send tip. ';
      if (err.message?.includes('User denied') || err.message?.includes('user rejected')) {
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

  // Loading state
  if (loading || walletLoading) {
    return (
      <section className={`${isFullPage ? 'min-h-screen pt-8' : 'py-20'} bg-slate-900`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-white mb-2">Discovering Creators</h3>
          <p className="text-gray-400">Loading creator profiles...</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${isFullPage ? 'min-h-screen pt-8' : 'py-20'} bg-slate-900`}>
      <div className="max-w-7xl mx-auto px-4">
        
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white flex items-center gap-3 mb-2">
            <Sparkles className="text-purple-400" /> 
            Discover Creators
          </h2>
          <p className="text-gray-400">
            {sortedCreators.length} amazing creator{sortedCreators.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Error Message */}
        {(error || walletError) && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-8 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">{error || walletError}</p>
          </div>
        )}

        {/* Search and Filters */}
        {isFullPage && (
          <div className="mb-8 space-y-4">
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search creators by name, bio, or wallet address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 transition-colors"
                >
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-500 transition-colors"
                >
                  {sortOptions.map(option => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Creators Grid */}
        {sortedCreators.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedCreators.map((creator) => (
              <div
                key={creator.address}
                className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700 hover:border-purple-500 transition-all duration-300 hover:transform hover:scale-105"
              >
                
                {/* Creator Header */}
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={creator.profileData.avatar}
                    alt={creator.profileData.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-slate-600"
                    onError={(e) => {
                      e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${creator.address}`;
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-semibold text-white mb-1 truncate">
                      {creator.profileData.name}
                    </h3>
                    {!creator.profileDataLoaded && (
                      <p className="text-xs text-yellow-400 mb-1">Profile loading...</p>
                    )}
                    <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                      {creator.profileData.bio}
                    </p>
                    {creator.profileData.category && (
                      <span className="inline-block bg-purple-600/20 text-purple-400 text-xs px-2 py-1 rounded-full">
                        {creator.profileData.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Creator Stats */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-400">
                    <FileText className="w-4 h-4" />
                    <span>{creator.contentCount} content{creator.contentCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-400">
                    <Wallet className="w-4 h-4" />
                    <span>{creator.earningsInEth.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 col-span-2">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {creator.formattedDate}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewProfile(creator.address)}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2.5 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View Profile
                  </button>
                  
                  {isConnected && (
                    <button
                      disabled={tipping === creator.address}
                      onClick={() => handleTip(creator)}
                      className={`px-4 py-2.5 rounded-xl text-white bg-slate-700 hover:bg-slate-600 transition-colors flex items-center justify-center gap-2 ${
                        tipping === creator.address ? 'opacity-50 cursor-wait' : ''
                      }`}
                      title="Tip 0.001 ETH"
                    >
                      {tipping === creator.address ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Heart className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          
          /* Empty State */
          <div className="text-center py-16">
            <div className="bg-slate-800/50 rounded-2xl p-12 border border-slate-700">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-500" />
              <h3 className="text-2xl font-semibold text-white mb-2">
                {searchQuery || selectedCategory !== 'all' ? 'No Creators Found' : 'No Creators Yet'}
              </h3>
              <p className="text-gray-400 mb-6">
                {searchQuery || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Be the first to join the DecentraSpace creator community!'
                }
              </p>
              {searchQuery || selectedCategory !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => navigate('/upload')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200"
                >
                  Become a Creator
                </button>
              )}
            </div>
          </div>
        )}

        {/* Show More Button (for non-full page usage) */}
        {!isFullPage && limit && creators.length > limit && (
          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/discover')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
            >
              View All Creators
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default DiscoverCreators;
