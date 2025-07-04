// src/pages/ProfilePage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Edit3, 
  Eye, 
  Wallet, 
  Loader2, 
  Users, 
  Heart, 
  Video, 
  Upload, 
  AlertCircle,
  User,
  Sparkles,
  FileText,
  Check
} from 'lucide-react';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { storageService } from '../services/storageService';
import type { Creator, Content } from '../types/contractTypes';

interface ProfileMetadata {
  name: string;
  bio: string;
  avatar: string;
  category?: string;
}

interface EnhancedCreator extends Creator {
  profileData: ProfileMetadata;
  formattedDate: string;
  earningsInEth: number;
  address: string;
}

interface EnhancedContent extends Content {
  formattedDate: string;
  earningsInEth: number;
  contentUrl: string;
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const creatorIdParam = queryParams.get('creator');
  
  const { 
    isConnected,
    accountId,
    registerCreator,
    updateCreator,
    isCreatorRegistered,
    contractServiceInstance,
    tipCreator,
    isLoading: contractLoading,
    error: contractError,
    networkInfo
  } = useContractIntegration();

  const viewingOwnProfile = !creatorIdParam || creatorIdParam === accountId;
  const profileId = creatorIdParam || accountId;

  // Component state
  const [profile, setProfile] = useState<EnhancedCreator | null>(null);
  const [contents, setContents] = useState<EnhancedContent[]>([]);
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  
  // Registration state
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    creatorName: '',
    description: '',
    category: 'general'
  });
  
  // Tip state
  const [tipAmount, setTipAmount] = useState('');
  const [tipping, setTipping] = useState(false);
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  // Available categories
  const categories = [
    { value: 'general', label: 'General' },
    { value: 'art', label: 'Art & Design' },
    { value: 'music', label: 'Music' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'education', label: 'Education' },
    { value: 'technology', label: 'Technology' },
    { value: 'lifestyle', label: 'Lifestyle' }
  ];

  // Utility functions
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

  const convertEarnings = (earnings: string): number => {
    try {
      return parseFloat(earnings) / 1e18;
    } catch {
      return 0;
    }
  };

  const generateProfileData = async (address: string, creator: Creator): Promise<ProfileMetadata> => {
    return {
      name: creator.name || `Creator ${address.substring(0, 6)}...${address.substring(38)}`,
      bio: creator.description || 'Creator on DecentraSpace',
      avatar: `https://api.dicebear.com/7.x/identicon/svg?seed=${address}`,
      category: 'general'
    };
  };

  // Check registration status
  const checkRegistrationStatus = async () => {
    if (!profileId || !isConnected) return;

    try {
      setCheckingRegistration(true);
      const registered = await isCreatorRegistered(profileId);
      setIsRegistered(registered);
      
      if (registered) {
        await loadProfileData();
      }
    } catch (err) {
      console.error('Failed to check registration:', err);
    } finally {
      setCheckingRegistration(false);
    }
  };

  // Load profile data
  const loadProfileData = async () => {
    if (!profileId || !contractServiceInstance) return;

    try {
      setLoading(true);
      setError('');

      const creatorData = await contractServiceInstance.getCreator(profileId);
      const profileData = await generateProfileData(profileId, creatorData);

      const enhancedProfile: EnhancedCreator = {
        ...creatorData,
        address: profileId,
        profileData,
        formattedDate: formatTimestamp(creatorData.createdAt),
        earningsInEth: convertEarnings(creatorData.totalEarnings)
      };

      setProfile(enhancedProfile);
      setEditForm({
        name: enhancedProfile.profileData.name,
        description: enhancedProfile.profileData.bio
      });

      // Load creator's content
      const contentIds = await contractServiceInstance.getCreatorContents(profileId);
      const enhancedContents: EnhancedContent[] = await Promise.all(
        contentIds.map(async (id) => {
          const content = await contractServiceInstance.getContent(id);
          return {
            ...content,
            formattedDate: formatTimestamp(content.timestamp),
            earningsInEth: convertEarnings(content.tipsReceived),
            contentUrl: storageService.getFileUrl(content.cid)
          };
        })
      );

      setContents(enhancedContents);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  // Handle registration
  const handleRegister = async () => {
    if (!registrationForm.creatorName.trim()) {
      setError('Creator name is required');
      return;
    }
    if (!registrationForm.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setIsRegistering(true);
      setError('');

      const categoryLabel = categories.find(cat => cat.value === registrationForm.category)?.label || 'General';
      const enhancedDescription = `${registrationForm.description.trim()} | Category: ${categoryLabel}`;

      await registerCreator(registrationForm.creatorName.trim(), enhancedDescription);
      
      setIsRegistered(true);
      setRegistrationForm({ creatorName: '', description: '', category: 'general' });
      
      // Load the newly created profile
      await loadProfileData();
      
      alert('🎉 Creator registration successful! Welcome to DecentraSpace!');
    } catch (err: any) {
      console.error('Registration failed:', err);
      if (err.message?.includes('already registered')) {
        setError('You are already registered as a creator');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  // Handle profile update
  const handleUpdateProfile = async () => {
    if (!editForm.name.trim() || !editForm.description.trim()) {
      setError('Name and description are required');
      return;
    }

    try {
      setUpdating(true);
      setError('');

      await updateCreator(editForm.name.trim(), editForm.description.trim());
      await loadProfileData();
      setIsEditing(false);
      
      alert('✅ Profile updated successfully!');
    } catch (err: any) {
      console.error('Update failed:', err);
      setError('Profile update failed. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // Handle tip
  const handleTip = async () => {
    if (!profile || !tipAmount || parseFloat(tipAmount) <= 0) {
      setError('Please enter a valid ETH amount');
      return;
    }

    try {
      setTipping(true);
      setError('');

      await tipCreator(profile.address, tipAmount);
      await loadProfileData();
      
      alert(`✅ Successfully tipped ${tipAmount} ETH to ${profile.profileData.name}!`);
      setTipAmount('');
    } catch (err: any) {
      console.error('Tip failed:', err);
      setError('Tip failed. Please try again.');
    } finally {
      setTipping(false);
    }
  };

  // Effects
  useEffect(() => {
    if (isConnected && contractServiceInstance) {
      checkRegistrationStatus();
    }
  }, [isConnected, contractServiceInstance, profileId]);

  useEffect(() => {
    if (isRegistered) {
      loadProfileData();
    } else {
      setLoading(false);
    }
  }, [isRegistered]);

  // Handle input changes
  const handleEditInputChange = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleRegistrationInputChange = (field: string, value: string) => {
    setRegistrationForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400">Please connect your wallet to view profiles.</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading || checkingRegistration) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold mb-2">Loading Profile</h3>
          <p className="text-gray-400">
            {checkingRegistration 
              ? 'Checking registration status...'
              : 'Fetching profile data...'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)} 
          className="mb-6 text-sm text-purple-400 hover:text-purple-300 flex items-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>

        {/* Error Display */}
        {(error || contractError) && (
          <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300">{error || contractError}</p>
          </div>
        )}

        {/* Network Warning */}
        {!networkInfo.isCorrectNetwork && (
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-300">Please switch to Sepolia testnet to use this feature.</p>
          </div>
        )}

        {/* Registration Section (for unregistered users) */}
        {!isRegistered && viewingOwnProfile && (
          <div className="bg-slate-800/50 rounded-2xl p-8 mb-8 border border-slate-700">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Become a Creator</h2>
              <p className="text-gray-400 text-lg">Join DecentraSpace and start earning ETH</p>
            </div>

            <div className="max-w-md mx-auto space-y-6">
              {/* Creator Name */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Creator Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={registrationForm.creatorName}
                  onChange={(e) => handleRegistrationInputChange('creatorName', e.target.value)}
                  placeholder="Your creator name"
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  maxLength={50}
                  disabled={isRegistering}
                />
                <p className="text-gray-400 text-xs mt-1">
                  {registrationForm.creatorName.length}/50 characters
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={registrationForm.category}
                  onChange={(e) => handleRegistrationInputChange('category', e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  disabled={isRegistering}
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-white font-medium mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={registrationForm.description}
                  onChange={(e) => handleRegistrationInputChange('description', e.target.value)}
                  placeholder="Tell us about your content and what you create..."
                  rows={4}
                  className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                  maxLength={500}
                  disabled={isRegistering}
                />
                <p className="text-gray-400 text-xs mt-1">
                  {registrationForm.description.length}/500 characters
                </p>
              </div>

              {/* Register Button */}
              <button
                onClick={handleRegister}
                disabled={
                  isRegistering || 
                  !registrationForm.creatorName.trim() || 
                  !registrationForm.description.trim() ||
                  !networkInfo.isCorrectNetwork
                }
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg flex justify-center items-center gap-2 transition-all duration-200"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Register as Creator
                  </>
                )}
              </button>

              {/* Info */}
              <div className="text-center text-gray-400 text-sm">
                <p>Connected as: <span className="text-purple-400">{accountId}</span></p>
                <p className="mt-1">Gas fees will apply for registration</p>
              </div>
            </div>
          </div>
        )}

        {/* Profile exists but not found (viewing someone else's unregistered profile) */}
        {!isRegistered && !viewingOwnProfile && (
          <div className="text-center py-16">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Creator Not Found</h2>
            <p className="text-gray-400 mb-6">This creator is not registered on DecentraSpace yet.</p>
            <button
              onClick={() => navigate('/discover')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              Discover Other Creators
            </button>
          </div>
        )}

        {/* Profile Section (for registered users) */}
        {isRegistered && profile && (
          <>
            <div className="bg-slate-800/50 rounded-2xl p-8 mb-8 border border-slate-700">
              <div className="flex flex-col md:flex-row items-start gap-6">
                
                {/* Avatar */}
                <img
                  src={profile.profileData.avatar}
                  alt={`${profile.profileData.name}'s avatar`}
                  className="w-24 h-24 rounded-2xl object-cover border-2 border-slate-600"
                  onError={(e) => {
                    e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.address}`;
                  }}
                />
                
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <input
                        className="bg-slate-700 border border-slate-600 px-4 py-3 rounded-xl text-white w-full focus:border-purple-500 transition-colors"
                        value={editForm.name}
                        placeholder="Creator name"
                        onChange={(e) => handleEditInputChange('name', e.target.value)}
                        maxLength={50}
                        disabled={updating}
                      />
                      <textarea
                        className="bg-slate-700 border border-slate-600 px-4 py-3 rounded-xl text-white w-full resize-none focus:border-purple-500 transition-colors"
                        placeholder="Describe your content and what you create"
                        value={editForm.description}
                        onChange={(e) => handleEditInputChange('description', e.target.value)}
                        rows={4}
                        maxLength={500}
                        disabled={updating}
                      />
                      <div className="flex gap-3">
                        <button 
                          onClick={handleUpdateProfile} 
                          disabled={updating || !editForm.name.trim() || !editForm.description.trim()}
                          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl font-semibold transition-colors flex items-center gap-2"
                        >
                          {updating ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              Save Changes
                            </>
                          )}
                        </button>
                        <button 
                          onClick={() => setIsEditing(false)} 
                          disabled={updating}
                          className="bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-xl font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-3">
                        <h1 className="text-3xl font-bold">{profile.profileData.name}</h1>
                        {viewingOwnProfile && (
                          <button 
                            onClick={() => setIsEditing(true)}
                            className="text-gray-400 hover:text-white transition-colors"
                            title="Edit profile"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      
                      <p className="text-gray-300 text-lg mb-4 leading-relaxed">{profile.profileData.bio}</p>
                      
                      <div className="flex items-center gap-6 text-sm text-gray-400">
                        <span className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Joined {profile.formattedDate}
                        </span>
                        <span className="flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          {profile.contentCount} content{profile.contentCount !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-2">
                          <Wallet className="w-4 h-4" />
                          {profile.earningsInEth.toFixed(4)} ETH earned
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tip Section */}
            {!viewingOwnProfile && !isEditing && (
              <div className="bg-slate-800/50 rounded-2xl p-6 mb-8 border border-slate-700">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-purple-400" />
                  Support {profile.profileData.name}
                </h3>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    placeholder="Amount in ETH"
                    step="0.001"
                    min="0.001"
                    className="bg-slate-700 border border-slate-600 px-4 py-3 rounded-xl text-white w-48 focus:border-purple-500 transition-colors"
                    disabled={tipping}
                  />
                  <button
                    onClick={handleTip}
                    disabled={tipping || !tipAmount || parseFloat(tipAmount) <= 0}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-xl text-white font-semibold transition-colors flex items-center gap-2"
                  >
                    {tipping ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Heart className="w-4 h-4" />
                        Send Tip
                      </>
                    )}
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  Tips are sent directly to the creator's wallet
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <p className="text-gray-400 text-sm mb-1">Content Created</p>
                <p className="text-2xl font-bold text-white">{profile.contentCount}</p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <p className="text-gray-400 text-sm mb-1">Total Earnings</p>
                <p className="text-2xl font-bold text-white">{profile.earningsInEth.toFixed(4)} ETH</p>
              </div>
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                <p className="text-gray-400 text-sm mb-1">Wallet Address</p>
                <p className="text-sm font-mono text-purple-400 truncate">{profile.address}</p>
              </div>
            </div>

            {/* Content List */}
            <div>
              <h2 className="text-2xl font-semibold mb-6">
                {viewingOwnProfile ? 'Your Content' : `${profile.profileData.name}'s Content`}
              </h2>
              
              {contents.length === 0 ? (
                <div className="text-center py-16 bg-slate-800/50 rounded-2xl border border-slate-700">
                  <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Content Yet</h3>
                  <p className="text-gray-400 mb-6">
                    {viewingOwnProfile 
                      ? 'Start uploading content to build your presence on DecentraSpace!'
                      : 'This creator hasn\'t uploaded any content yet.'
                    }
                  </p>
                  {viewingOwnProfile && (
                    <Link 
                      to="/upload"
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors inline-flex items-center gap-2"
                    >
                      <Video className="w-5 h-5" />
                      Upload Content
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {contents.map((content) => (
                    <div key={content.id} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 hover:border-purple-500/50 transition-all duration-300">
                      <h3 className="text-lg font-bold mb-2 line-clamp-2 text-white">{content.title}</h3>
                      
                      <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
                        <span className="flex items-center gap-1">
                          <Wallet className="w-4 h-4" />
                          {content.earningsInEth.toFixed(4)} ETH
                        </span>
                        <span className="text-xs bg-slate-700 px-2 py-1 rounded">
                          {content.formattedDate}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => navigate(`/content/${content.id}`)}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Content
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
