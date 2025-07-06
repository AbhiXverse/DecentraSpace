// src/components/LiveNow.tsx
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  CalendarClock, Loader2, Users, Radio, AlertCircle, 
  ExternalLink, Copy, CheckCircle, Wifi, WifiOff, Info, 
  Video, Play, RefreshCw, Zap, Globe, Shield, Clock
} from 'lucide-react';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { huddleService } from '../services/huddleService';
import { LiveRoom } from '../types/contractTypes';

// Types
interface RoomStatus {
  type: 'working' | 'fallback' | 'unknown';
  message?: string;
}

interface CategoryConfig {
  [key: string]: {
    icon: string;
    color: string;
  };
}

// Constants
const MAX_ROOMS_DISPLAY = 3; // Show only 3 most recent rooms
const AUTO_REFRESH_INTERVAL = 15000; // Refresh every 15 seconds (faster for better updates)
const ROOM_EXPIRY_TIME = 24 * 60 * 60; // 24 hours in seconds

// Category configuration
const CATEGORY_CONFIG: CategoryConfig = {
  general: { icon: '💬', color: 'bg-blue-600/30 text-blue-300' },
  education: { icon: '📚', color: 'bg-green-600/30 text-green-300' },
  gaming: { icon: '🎮', color: 'bg-purple-600/30 text-purple-300' },
  music: { icon: '🎵', color: 'bg-pink-600/30 text-pink-300' },
  art: { icon: '🎨', color: 'bg-orange-600/30 text-orange-300' },
  tech: { icon: '💻', color: 'bg-cyan-600/30 text-cyan-300' },
  business: { icon: '💼', color: 'bg-yellow-600/30 text-yellow-300' },
  wellness: { icon: '🧘', color: 'bg-teal-600/30 text-teal-300' },
};

const LiveNow: React.FC = () => {
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<LiveRoom | null>(null);
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [roomStatuses, setRoomStatuses] = useState<Record<string, RoomStatus>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const {
    getActiveLiveRooms,
    getLiveRoom,
    isConnected,
    accountId,
    networkInfo,
    connectWallet,
    contractServiceInstance
  } = useContractIntegration();

  // Memoized functions
  const formatTime = useCallback((timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }, []);

  const formatAddress = useCallback((address: string): string => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  const getRoomIdFromLink = useCallback((huddleLink: string): string => {
    try {
      const roomId = huddleService.extractRoomIdFromLink(huddleLink);
      return roomId || 'unknown';
    } catch {
      return 'unknown';
    }
  }, []);

  const getParticipantLabel = useCallback((count: number): string => {
    if (count === 0) return 'No participants yet';
    if (count === 1) return '1 participant';
    return `${count} participants`;
  }, []);

  const getCategoryFromDescription = useCallback((description: string): string | null => {
    const match = description.match(/^\[([^\]]+)\]/);
    return match ? match[1].toLowerCase() : null;
  }, []);

  const getCleanDescription = useCallback((description: string): string => {
    return description.replace(/^\[[^\]]+\]\s*/, '').trim();
  }, []);

  // FIXED: Get proper room join URL with lobby
  const getRoomJoinUrl = useCallback((room: LiveRoom): string => {
    const roomId = getRoomIdFromLink(room.huddleLink);
    if (!roomId || roomId === 'unknown') {
      return room.huddleLink; // Fallback to original link
    }
    
    // Use the fixed huddleService method that includes /lobby
    return huddleService.getRoomJoinUrl(roomId, accountId ? formatAddress(accountId) : undefined);
  }, [getRoomIdFromLink, accountId, formatAddress]);

  // IMPROVED: Better room status determination with expiry check
  const determineRoomStatus = useCallback((room: LiveRoom): RoomStatus => {
    const roomId = getRoomIdFromLink(room.huddleLink);
    const now = Math.floor(Date.now() / 1000);
    const roomAge = now - room.createdAt;
    
    // Check if room is too old (likely ended)
    if (roomAge > ROOM_EXPIRY_TIME) {
      return { type: 'fallback', message: 'Room may have ended - too old' };
    }
    
    if (!roomId || roomId === 'unknown') {
      return { type: 'unknown', message: 'Invalid room ID' };
    }

    if (roomId.match(/^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/)) {
      return { type: 'working', message: 'Live on Huddle01' };
    }

    return { type: 'fallback', message: 'Demo mode - API unavailable' };
  }, [getRoomIdFromLink]);

  // IMPROVED: Filter and limit rooms
  const filterAndLimitRooms = useCallback((rooms: LiveRoom[]): LiveRoom[] => {
    const now = Math.floor(Date.now() / 1000);
    
    // Filter out very old rooms (older than 24 hours)
    const recentRooms = rooms.filter(room => {
      const roomAge = now - room.createdAt;
      return roomAge <= ROOM_EXPIRY_TIME && room.isLive;
    });
    
    // Sort by creation time (newest first) and limit to MAX_ROOMS_DISPLAY
    return recentRooms
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_ROOMS_DISPLAY);
  }, []);

  // IMPROVED: Fetch rooms with better filtering and error handling
  const fetchRooms = useCallback(async () => {
    if (!isConnected || !networkInfo.isCorrectNetwork || !contractServiceInstance) {
      setLoading(false);
      return;
    }

    try {
      if (!loading) setRefreshing(true);
      setError('');
      
      console.log('📡 Fetching live rooms...');
      const roomIds = await getActiveLiveRooms();
      console.log(`📊 Found ${roomIds.length} room IDs`);
      
      // Fetch room details with error handling for each room
      const roomPromises = roomIds.map(async (id) => {
        try {
          const room = await getLiveRoom(id);
          // Double-check if room is actually live and recent
          if (room && room.isLive) {
            const now = Math.floor(Date.now() / 1000);
            const roomAge = now - room.createdAt;
            if (roomAge <= ROOM_EXPIRY_TIME) {
              return room;
            }
          }
          return null;
        } catch (err) {
          console.error(`Failed to fetch room ${id}:`, err);
          return null;
        }
      });
      
      const rooms = await Promise.all(roomPromises);
      const validRooms = rooms.filter((room): room is LiveRoom => room !== null);
      
      // Filter and limit rooms to show only recent ones
      const filteredRooms = filterAndLimitRooms(validRooms);
      
      // Determine room statuses
      const statuses: Record<string, RoomStatus> = {};
      filteredRooms.forEach(room => {
        statuses[room.id] = determineRoomStatus(room);
      });
      
      setLiveRooms(filteredRooms);
      setRoomStatuses(statuses);
      setLastRefresh(new Date());
      
      console.log(`✅ Successfully loaded ${filteredRooms.length} recent live rooms (showing max ${MAX_ROOMS_DISPLAY})`);
      
      if (filteredRooms.length === 0) {
        setError('No active live rooms at the moment. Be the first to go live!');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch rooms:', err);
      setError(err?.message || 'Failed to load live rooms. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isConnected, networkInfo.isCorrectNetwork, contractServiceInstance, loading, getActiveLiveRooms, getLiveRoom, determineRoomStatus, filterAndLimitRooms]);

  // IMPROVED: Force refresh function
  const forceRefresh = useCallback(async () => {
    console.log('🔄 Force refreshing rooms...');
    await fetchRooms();
  }, [fetchRooms]);

  // FIXED: Copy link handler - uses proper room URL
  const handleCopyLink = useCallback(async (e: React.MouseEvent, room: LiveRoom) => {
    e.stopPropagation();
    try {
      const properUrl = getRoomJoinUrl(room);
      await navigator.clipboard.writeText(properUrl);
      setCopiedRoomId(room.id);
      setTimeout(() => setCopiedRoomId(null), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      // Fallback for browsers that don't support clipboard API
      const properUrl = getRoomJoinUrl(room);
      const textArea = document.createElement('textarea');
      textArea.value = properUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedRoomId(room.id);
      setTimeout(() => setCopiedRoomId(null), 2000);
    }
  }, [getRoomJoinUrl]);

  // Join room handlers
  const handleJoinRoom = useCallback((room: LiveRoom) => {
    setSelectedRoom(room);
  }, []);

  // FIXED: Open in Huddle handler - uses proper room URL
  const handleOpenInHuddle = useCallback((e: React.MouseEvent, room: LiveRoom) => {
    e.stopPropagation();
    const properUrl = getRoomJoinUrl(room);
    console.log('🚀 Opening room:', properUrl);
    window.open(properUrl, '_blank', 'noopener,noreferrer');
    
    // Refresh rooms after a delay to check if room status changed
    setTimeout(() => {
      console.log('🔄 Refreshing rooms after join...');
      forceRefresh();
    }, 3000);
  }, [getRoomJoinUrl, forceRefresh]);

  const handleBackToRooms = useCallback(() => {
    setSelectedRoom(null);
    // Refresh when coming back to main view
    forceRefresh();
  }, [forceRefresh]);

  // IMPROVED: Auto-refresh effect with faster interval
  useEffect(() => {
    if (isConnected && networkInfo.isCorrectNetwork && autoRefresh) {
      fetchRooms();
      const interval = setInterval(fetchRooms, AUTO_REFRESH_INTERVAL);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isConnected, networkInfo.isCorrectNetwork, autoRefresh, fetchRooms]);

  // Room status icon component
  const RoomStatusIcon: React.FC<{ status: RoomStatus }> = ({ status }) => {
    switch (status.type) {
      case 'working':
        return (
          <div className="flex items-center gap-1 text-green-400" title={status.message}>
            <Wifi className="w-3 h-3" />
            <span className="text-xs">Live</span>
          </div>
        );
      case 'fallback':
        return (
          <div className="flex items-center gap-1 text-yellow-400" title={status.message}>
            <WifiOff className="w-3 h-3" />
            <span className="text-xs">Demo</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-blue-400" title={status.message}>
            <Info className="w-3 h-3" />
            <span className="text-xs">Unknown</span>
          </div>
        );
    }
  };

  // Full-screen room view
  if (selectedRoom) {
    const selectedRoomStatus = roomStatuses[selectedRoom.id];
    const roomId = getRoomIdFromLink(selectedRoom.huddleLink);
    const category = getCategoryFromDescription(selectedRoom.description);
    const categoryConfig = category ? CATEGORY_CONFIG[category] : null;
    const properRoomUrl = getRoomJoinUrl(selectedRoom);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handleBackToRooms}
              className="flex items-center text-white hover:text-purple-300 transition-all duration-200"
            >
              <Radio className="mr-2 w-4 h-4" />
              Back to Live Rooms
            </button>
            
            <div className="flex items-center gap-4">
              <RoomStatusIcon status={selectedRoomStatus} />
              
              <div className="flex items-center gap-2 text-red-500">
                <Radio className="w-4 h-4 animate-pulse" />
                <span className="text-sm font-medium">LIVE</span>
              </div>
            </div>
          </div>

          {/* Demo Mode Warning */}
          {selectedRoomStatus?.type === 'fallback' && (
            <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-100 p-4 rounded-lg mb-6 flex items-center gap-3">
              <WifiOff className="w-5 h-5 flex-shrink-0" />
              <div>
                <span className="font-medium">Demo Mode:</span> This room is in demonstration mode. 
                The Huddle01 API might be unavailable. Click "Join Live Meeting" to try accessing the room directly.
              </div>
            </div>
          )}

          {/* Room Interface */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{selectedRoom.title}</h1>
                  {selectedRoomStatus?.type === 'fallback' && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full">
                      Demo Mode
                    </span>
                  )}
                </div>
                <p className="text-gray-300 mb-2">
                  Host: <span className="text-purple-300 font-medium">{formatAddress(selectedRoom.creator)}</span>
                  {accountId === selectedRoom.creator && (
                    <span className="ml-2 text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full">
                      You
                    </span>
                  )}
                </p>
                {getCleanDescription(selectedRoom.description) && (
                  <p className="text-gray-300">{getCleanDescription(selectedRoom.description)}</p>
                )}
              </div>
              
              <div className="flex flex-col items-end gap-2">
                {categoryConfig && (
                  <span className={`text-xs ${categoryConfig.color} px-3 py-1 rounded-full flex items-center gap-1`}>
                    <span>{categoryConfig.icon}</span>
                    {category}
                  </span>
                )}
                <span className="text-xs bg-white/10 text-gray-300 px-3 py-1 rounded-full flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {getParticipantLabel(selectedRoom.participantCount)}
                </span>
                <span className="text-xs text-gray-400">
                  Started {formatTime(selectedRoom.createdAt)}
                </span>
              </div>
            </div>

            {/* Meeting Preview */}
            <div className="aspect-video rounded-lg overflow-hidden shadow-2xl mb-6 bg-gradient-to-br from-gray-900 to-gray-800 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-purple-900/30 to-pink-900/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-purple-500/50 to-pink-500/50 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                    <Video className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-2xl font-semibold mb-2">{selectedRoom.title}</p>
                  <p className="text-gray-300 mb-6">Click below to join the live session</p>
                  
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => window.open(properRoomUrl, '_blank', 'noopener,noreferrer')}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-8 py-4 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Join Live Meeting
                    </button>
                    
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(properRoomUrl);
                        setCopiedRoomId(selectedRoom.id);
                        setTimeout(() => setCopiedRoomId(null), 2000);
                      }}
                      className="bg-purple-600/20 hover:bg-purple-600/30 px-6 py-4 rounded-lg border border-purple-400/50 transition-all duration-200 flex items-center gap-2"
                    >
                      {copiedRoomId === selectedRoom.id ? (
                        <>
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-5 h-5" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Live indicator */}
              <div className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                LIVE
              </div>
              
              {/* Room Info */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded text-sm">
                  Room ID: {roomId}
                </div>
                {selectedRoom.participantCount > 0 && (
                  <div className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded text-sm flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {selectedRoom.participantCount}
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/5 rounded-lg">
              <div className="text-center">
                <Globe className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                <p className="text-sm text-gray-400">Public Room</p>
                <p className="text-xs text-gray-500">Anyone can join</p>
              </div>
              <div className="text-center">
                <Zap className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                <p className="text-sm text-gray-400">HD Quality</p>
                <p className="text-xs text-gray-500">Powered by Huddle01</p>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-green-400" />
                <p className="text-sm text-gray-400">Secure</p>
                <p className="text-xs text-gray-500">End-to-end encrypted</p>
              </div>
            </div>

            {/* Debug Info (Dev Mode Only) */}
            {import.meta.env.DEV && (
              <div className="mt-4 p-3 bg-black/20 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Debug Info:</p>
                <p className="text-xs text-gray-500 font-mono">Original URL: {selectedRoom.huddleLink}</p>
                <p className="text-xs text-gray-500 font-mono">Proper URL: {properRoomUrl}</p>
                <p className="text-xs text-gray-500 font-mono">Room ID: {roomId}</p>
                <p className="text-xs text-gray-500 font-mono">Status: {selectedRoomStatus?.type || 'unknown'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Not Connected
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Radio className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Connect to View Live Rooms</h2>
          <p className="text-gray-300 mb-6 text-lg">
            Connect your wallet to discover and join live streaming sessions on DecentraSpace
          </p>
          <button
            onClick={connectWallet}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Wrong Network
  if (!networkInfo.isCorrectNetwork) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Wrong Network</h2>
          <p className="text-gray-300 mb-6 text-lg">
            Please switch to Sepolia testnet to view live rooms
          </p>
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-400">
              Current network: <span className="text-white font-medium">{networkInfo.networkName || 'Unknown'}</span>
            </p>
            <p className="text-sm text-gray-400">
              Required: <span className="text-purple-300 font-medium">Sepolia Testnet</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border border-purple-400 opacity-20"></div>
          </div>
          <p className="text-lg text-gray-300">Loading live rooms...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching from blockchain</p>
        </div>
      </div>
    );
  }

  // Main View - Room Grid
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Radio className="w-10 h-10 text-red-500 animate-pulse" />
              Live Now
              <span className="text-sm bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full">
                Top {MAX_ROOMS_DISPLAY}
              </span>
            </h1>
            <p className="text-gray-300">
              {liveRooms.length > 0 
                ? `${liveRooms.length} live room${liveRooms.length > 1 ? 's' : ''} streaming now${liveRooms.length >= MAX_ROOMS_DISPLAY ? ` (showing latest ${MAX_ROOMS_DISPLAY})` : ''}`
                : 'Join ongoing live sessions and connect with creators'
              }
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {lastRefresh && (
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Updated {formatTime(Math.floor(lastRefresh.getTime() / 1000))}
              </div>
            )}
            
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="text-gray-300">Auto-refresh</span>
            </label>
            
            <button
              onClick={forceRefresh}
              disabled={refreshing}
              className="bg-purple-600/20 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Error State */}
        {error && !loading && liveRooms.length === 0 && (
          <div className="text-center py-20">
            <Radio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">{error}</p>
            <button
              onClick={forceRefresh}
              className="mt-4 bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!error && liveRooms.length === 0 && !loading && (
          <div className="text-center py-20">
            <Radio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">No live rooms at the moment</p>
            <p className="text-gray-500 mb-6">Be the first to go live and connect with your audience!</p>
            <a
              href="/create-room"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
            >
              <Video className="w-5 h-5" />
              Create Live Room
            </a>
          </div>
        )}

        {/* Room Grid */}
        {liveRooms.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {liveRooms.map((room) => {
              const category = getCategoryFromDescription(room.description);
              const cleanDescription = getCleanDescription(room.description);
              const roomId = getRoomIdFromLink(room.huddleLink);
              const roomStatus = roomStatuses[room.id];
              const categoryConfig = category ? CATEGORY_CONFIG[category] : null;
              const isHost = accountId === room.creator;
              const properRoomUrl = getRoomJoinUrl(room);

              return (
                <div
                  key={room.id}
                  className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl p-6 hover:shadow-2xl transition-all duration-200 border border-white/20 group cursor-pointer transform hover:scale-[1.02]"
                  onClick={() => handleJoinRoom(room)}
                >
                  {/* Room Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 mr-2">
                      <h2 className="text-xl font-semibold group-hover:text-purple-300 transition-colors line-clamp-1">
                        {room.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        {roomStatus?.type === 'fallback' && (
                          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
                            Demo Mode
                          </span>
                        )}
                        {isHost && (
                          <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                            Your Room
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-red-500">
                      <Radio className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-medium">LIVE</span>
                    </div>
                  </div>

                  {/* Host Info */}
                  <p className="text-gray-300 text-sm mb-3">
                    Host: <span className="font-medium text-purple-300">{formatAddress(room.creator)}</span>
                  </p>

                  {/* Description */}
                  {cleanDescription && (
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">{cleanDescription}</p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {categoryConfig && (
                      <span className={`text-xs ${categoryConfig.color} px-2 py-1 rounded-full flex items-center gap-1`}>
                        <span>{categoryConfig.icon}</span>
                        {category}
                      </span>
                    )}
                    <span className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {getParticipantLabel(room.participantCount)}
                    </span>
                    <RoomStatusIcon status={roomStatus} />
                  </div>

                  {/* Time */}
                  <div className="text-xs text-gray-400 flex items-center mb-4">
                    <CalendarClock className="w-3 h-3 mr-1" />
                    Started {formatTime(room.createdAt)}
                  </div>

                  {/* Preview Video Area */}
                  <div className="w-full aspect-video mb-4 rounded-lg overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 relative group-hover:from-gray-800 group-hover:to-gray-700 transition-all duration-200">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-pink-900/20 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-sm group-hover:scale-110 transition-transform duration-200">
                          <Play className="w-8 h-8 text-white ml-1" />
                        </div>
                        <p className="text-sm text-gray-300">Click to preview</p>
                      </div>
                    </div>
                    
                    {/* Live indicator */}
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                      LIVE
                    </div>

                    {/* Participant count overlay */}
                    {room.participantCount > 0 && (
                      <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {room.participantCount}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleOpenInHuddle(e, room)}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-4 py-2 rounded-lg text-white font-medium transition-all duration-200 flex items-center justify-center gap-2 transform hover:scale-105"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {roomStatus?.type === 'fallback' ? 'View Demo' : 'Join Live'}
                    </button>
                    
                    <button
                      onClick={(e) => handleCopyLink(e, room)}
                      className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                      title="Copy room link"
                    >
                      {copiedRoomId === room.id ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Room ID for debugging (only in dev mode) */}
                  {import.meta.env.DEV && (
                    <div className="mt-2 text-xs text-gray-500 text-center font-mono">
                      <div>ID: {roomId}</div>
                      <div>URL: {properRoomUrl}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        {liveRooms.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-400">
            <p>Showing {liveRooms.length} of max {MAX_ROOMS_DISPLAY} recent rooms • Refreshes every {AUTO_REFRESH_INTERVAL / 1000} seconds</p>
            {autoRefresh && (
              <p className="text-xs mt-1">Auto-refresh is enabled • Rooms older than 24 hours are hidden</p>
            )}
            {lastRefresh && (
              <p className="text-xs mt-1">Last updated: {lastRefresh.toLocaleTimeString()}</p>
            )}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-8 bg-purple-600/10 border border-purple-500/20 rounded-lg p-4 text-center">
          <p className="text-purple-300 text-sm">
            <span className="font-medium">📡 Real-time updates:</span> Rooms refresh automatically to show the latest status. 
            When you end a meeting, it may take up to {AUTO_REFRESH_INTERVAL / 1000} seconds to update here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LiveNow;
