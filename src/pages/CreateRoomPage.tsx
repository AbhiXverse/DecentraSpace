// src/pages/CreateRoomPage.tsx

import React, { useState } from 'react';
import { useContractIntegration } from '../hooks/useContractIntegration';
import { huddleService } from '../services/huddleService';
import { AlertCircle, Loader2 } from 'lucide-react';

const CreateRoomPage: React.FC = () => {
  const { 
    accountId, 
    createLiveRoom, 
    isConnected, 
    networkInfo,
    connectWallet,
    isCreatorRegistered 
  } = useContractIntegration();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [roomData, setRoomData] = useState({
    title: '',
    description: '',
    category: 'general',
    scheduledTime: '',
    scheduledDate: '',
  });

  const categories = [
    { value: 'general', label: 'General Discussion' },
    { value: 'education', label: 'Education & Learning' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'music', label: 'Music & Performance' },
    { value: 'art', label: 'Art & Design' },
    { value: 'tech', label: 'Technology' },
    { value: 'business', label: 'Business & Finance' },
    { value: 'wellness', label: 'Health & Wellness' },
  ];

  const validateScheduledDateTime = (): boolean => {
    if (!roomData.scheduledDate) return true;
    const now = new Date();
    const scheduledDateTime = new Date(
      `${roomData.scheduledDate}${roomData.scheduledTime ? 'T' + roomData.scheduledTime : ''}`
    );
    if (scheduledDateTime <= now) {
      setError('❌ Scheduled time must be in the future');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check wallet connection
    if (!isConnected) {
      setError('❌ Please connect your wallet first');
      return;
    }

    // Check network
    if (!networkInfo.isCorrectNetwork) {
      setError('❌ Please switch to Sepolia testnet');
      return;
    }

    // Check if user is registered as creator
    try {
      const isRegistered = await isCreatorRegistered();
      if (!isRegistered) {
        setError('❌ Please register as a creator first');
        return;
      }
    } catch (err) {
      setError('❌ Failed to check creator status');
      return;
    }

    if (!roomData.title.trim()) {
      setError('❌ Room title is required');
      return;
    }

    if (roomData.title.trim().length < 3) {
      setError('❌ Room title must be at least 3 characters long');
      return;
    }

    if (!validateScheduledDateTime()) return;

    setLoading(true);
    setError('');

    try {
      const scheduledFor = roomData.scheduledDate
        ? new Date(
            `${roomData.scheduledDate}${roomData.scheduledTime ? 'T' + roomData.scheduledTime : ''}`
          ).toISOString()
        : '';

      const enrichedDescription = `[${roomData.category}] ${roomData.description?.trim() || ''}`.trim();

      console.log('Creating room with data:', {
        title: roomData.title.trim(),
        description: enrichedDescription,
        creator: accountId
      });

      // Step 1: Create room on Huddle01
      let huddleRoom;
      try {
        huddleRoom = await huddleService.createRoom(
          roomData.title.trim(),
          accountId,
          enrichedDescription
        );
        console.log('Huddle room created:', huddleRoom);
      } catch (huddleError: any) {
        console.error('Huddle01 API Error:', huddleError);
        
        // Provide more specific error messages
        if (huddleError.message.includes('Failed to fetch')) {
          setError('❌ Failed to connect to Huddle01. Please check your internet connection and API key.');
        } else {
          setError(`❌ Huddle01 Error: ${huddleError.message}`);
        }
        setLoading(false);
        return;
      }

      const roomId = huddleRoom.roomId;
      const meetingLink = huddleRoom.meetingLink;

      // Step 2: Store on-chain using smart contract
      try {
        await createLiveRoom(roomData.title.trim(), enrichedDescription, meetingLink);
        console.log('Room stored on blockchain');
      } catch (contractError: any) {
        console.error('Smart Contract Error:', contractError);
        setError(`❌ Blockchain Error: ${contractError.message}`);
        setLoading(false);
        return;
      }

      // Success!
      if (scheduledFor) {
        alert(`🌟 Room scheduled!\n📅 ${scheduledFor}\n🔗 Room ID: ${roomId}`);
        window.location.href = '#/live-now';
      } else {
        alert(`🎉 Room created!\n🔗 Joining: ${meetingLink}`);
        window.open(meetingLink, '_blank');
        window.location.href = '#/live-now';
      }
    } catch (err: any) {
      console.error('❌ Room creation failed:', err);
      setError('❌ ' + (err.message || 'Something went wrong. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setRoomData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  // Show connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Wallet Not Connected</h2>
          <p className="text-gray-300 mb-6">
            Please connect your wallet to create a live room
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Wrong Network</h2>
          <p className="text-gray-300 mb-6">
            Please switch to Sepolia testnet to create a live room
          </p>
          <p className="text-sm text-gray-400">
            Current network: {networkInfo.networkName || 'Unknown'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🎙️ Create a Live Room</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-100 p-4 rounded-lg mb-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/20">
          <div>
            <label className="block text-sm font-medium mb-2">Room Title *</label>
            <input
              type="text"
              name="title"
              placeholder="Enter room title"
              className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 border border-white/20 focus:border-purple-400 focus:outline-none transition-all"
              value={roomData.title}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              name="description"
              placeholder="What will you discuss in this room?"
              className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-sm text-white placeholder-gray-400 border border-white/20 focus:border-purple-400 focus:outline-none transition-all"
              rows={3}
              value={roomData.description}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              name="category"
              className="w-full p-3 rounded-lg bg-white/10 backdrop-blur-sm text-white border border-white/20 focus:border-purple-400 focus:outline-none transition-all"
              value={roomData.category}
              onChange={handleInputChange}
              disabled={loading}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value} className="bg-slate-800">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Schedule for Later (Optional)</label>
            <div className="flex gap-4">
              <input
                type="date"
                name="scheduledDate"
                className="flex-1 p-3 rounded-lg bg-white/10 backdrop-blur-sm text-white border border-white/20 focus:border-purple-400 focus:outline-none transition-all"
                value={roomData.scheduledDate}
                onChange={handleInputChange}
                disabled={loading}
              />
              <input
                type="time"
                name="scheduledTime"
                className="flex-1 p-3 rounded-lg bg-white/10 backdrop-blur-sm text-white border border-white/20 focus:border-purple-400 focus:outline-none transition-all"
                value={roomData.scheduledTime}
                onChange={handleInputChange}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3 rounded-lg text-white font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Room'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomPage;
