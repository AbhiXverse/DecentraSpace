// src/pages/LiveNow.tsx
import React, { useEffect, useState } from 'react';
import { CalendarClock, Loader2, Users, Radio, AlertCircle } from 'lucide-react';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { huddleService } from '../services/huddleService';
import { LiveRoom } from '../types/contractTypes';

const LiveNow: React.FC = () => {
  const [liveRooms, setLiveRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { 
    getActiveLiveRooms, 
    getLiveRoom, 
    isConnected, 
    accountId,
    networkInfo,
    connectWallet 
  } = useContractIntegration();

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const fetchRooms = async () => {
    // Don't fetch if wallet is not connected or wrong network
    if (!isConnected || !networkInfo.isCorrectNetwork) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
  
      const roomIds = await getActiveLiveRooms();
      const rooms = await Promise.all(roomIds.map(id => getLiveRoom(id)));
  
      setLiveRooms(rooms);
    } catch (err: any) {
      console.error('Failed to fetch rooms:', err);
      setError('Failed to load live rooms. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: string, huddleLink: string, creator: string) => {
    try {
      const huddleRoomId = huddleService.extractRoomIdFromLink(huddleLink);
      const isHost = accountId?.toLowerCase() === creator.toLowerCase();

      const joinUrl = huddleRoomId
        ? await huddleService.joinRoom(huddleRoomId, accountId, isHost)
        : huddleLink;

      window.open(joinUrl, '_blank');
    } catch (err) {
      console.error('Failed to join room:', err);
      alert('❌ Could not join the room. Please try again.');
    }
  };

  const getParticipantLabel = (count: number): string => {
    return count === 0 ? 'No participants yet' : `${count} participant${count > 1 ? 's' : ''}`;
  };

  const getCategoryFromDescription = (description: string): string | null => {
    const match = description.match(/^\[([^\]]+)\]/);
    return match ? match[1] : null;
  };

  const getCleanDescription = (description: string): string => {
    return description.replace(/^\[[^\]]+\]\s*/, '').trim();
  };

  useEffect(() => {
    // Only fetch if connected and on correct network
    if (isConnected && networkInfo.isCorrectNetwork) {
      fetchRooms();
      const interval = setInterval(fetchRooms, 30000); // Refresh every 30 sec
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isConnected, networkInfo.isCorrectNetwork]);

  // Show connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
          <p className="text-gray-300 mb-6">
            Please connect your wallet to view live rooms
          </p>
          <button
            onClick={connectWallet}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-6 py-3 rounded-lg font-semibold transition-all"
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Show network switch prompt if on wrong network
  if (!networkInfo.isCorrectNetwork) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Wrong Network</h2>
          <p className="text-gray-300 mb-6">
            Please switch to Sepolia testnet to view live rooms
          </p>
          <p className="text-sm text-gray-400">
            Current network: {networkInfo.networkName || 'Unknown'}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="animate-spin w-8 h-8 mx-auto mb-3" />
          <p className="text-lg">Loading live rooms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center max-w-md">
          <p className="text-red-400 text-lg mb-4">❌ {error}</p>
          <button
            onClick={fetchRooms}
            className="bg-purple-600 hover:bg-purple-700 px-6 py-2 rounded-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Radio className="w-8 h-8 text-red-500 animate-pulse" />
              Live Now
            </h1>
            <p className="text-gray-300">Join ongoing live sessions and connect with creators</p>
          </div>
          <button
            onClick={fetchRooms}
            className="bg-purple-600/20 hover:bg-purple-600/30 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
          >
            <Loader2 className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {liveRooms.length === 0 ? (
          <div className="text-center py-20">
            <Radio className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">No live rooms at the moment</p>
            <p className="text-gray-500">Check back soon or create your own live room!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {liveRooms.map((room) => {
              const category = getCategoryFromDescription(room.description);
              const cleanDescription = getCleanDescription(room.description);

              return (
                <div
                  key={room.id}
                  className="bg-white/10 backdrop-blur-md rounded-xl shadow-xl p-6 hover:shadow-2xl transition-all border border-white/20"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-xl font-semibold flex-1 mr-2">{room.title}</h2>
                    <div className="flex items-center gap-1 text-red-500">
                      <Radio className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-medium">LIVE</span>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm mb-3">
                    Host:{' '}
                    <span className="font-medium text-purple-300">
                      {formatAddress(room.creator)}
                    </span>
                  </p>

                  {cleanDescription && (
                    <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                      {cleanDescription}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-4">
                    {category && (
                      <span className="text-xs bg-purple-600/30 text-purple-300 px-2 py-1 rounded-full">
                        📌 {category}
                      </span>
                    )}
                    <span className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {getParticipantLabel(room.participantCount)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-400 flex items-center mb-4">
                    <CalendarClock className="w-3 h-3 mr-1" />
                    Started {formatTime(room.createdAt)}
                  </div>

                  <button
                    onClick={() =>
                      handleJoinRoom(room.id, room.huddleLink, room.creator)
                    }
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg transition-all font-medium shadow-lg hover:shadow-xl"
                  >
                    Join Room
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveNow;
