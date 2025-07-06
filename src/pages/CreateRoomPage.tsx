// src/pages/CreateRoomPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  AlertCircle, ArrowLeft, CheckCircle, Copy, Info, Loader2,
  Phone, PhoneOff, Users, Wifi, WifiOff, Video, VideoOff, Mic, MicOff,
  Settings, ExternalLink, Shield, Zap
} from 'lucide-react';

import { useContractIntegration } from '../hooks/useContractIntegration';
import { huddleService } from '../services/huddleService';

// Huddle01 React SDK imports
import {
  useRoom,
  useLocalVideo,
  useLocalAudio,
  usePeerIds,
  useRemoteVideo,
  useRemoteAudio,
} from '@huddle01/react/hooks';
import { Video as HuddleVideo, Audio as HuddleAudio } from '@huddle01/react/components';

const CreateRoomPage: React.FC = () => {
  const {
    accountId,
    createLiveRoom,
    isConnected,
    networkInfo,
    connectWallet,
    isCreatorRegistered,
  } = useContractIntegration();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [checkingBackend, setCheckingBackend] = useState(true);

  const [apiStatus, setApiStatus] = useState<'unknown' | 'working' | 'failed'>('unknown');
  const [roomId, setRoomId] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const [roomData, setRoomData] = useState({
    title: '',
    description: '',
    category: 'general',
  });

  // Huddle01 hooks
  const { joinRoom, leaveRoom, state: roomState } = useRoom({
    onJoin: () => {
      console.log('✅ Successfully joined room');
      setSuccess('🎉 Connected to live room! Your camera and microphone will activate shortly.');
    },
    onLeave: () => {
      console.log('👋 Left the room');
      setSuccess('Session ended successfully');
    },
  });

  const { 
    stream: localVideoStream, 
    enableVideo, 
    disableVideo, 
    isVideoOn 
  } = useLocalVideo();
  
  const { 
    stream: localAudioStream, 
    enableAudio, 
    disableAudio, 
    isAudioOn 
  } = useLocalAudio();
  
  const { peerIds } = usePeerIds();

  // Check backend health on mount with retry logic
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 3;
    
    const checkBackend = async () => {
      setCheckingBackend(true);
      try {
        const healthy = await huddleService.checkHealth();
        setBackendHealthy(healthy);
        
        if (!healthy && retryCount < maxRetries) {
          retryCount++;
          console.log(`⏳ Backend not ready, retrying... (${retryCount}/${maxRetries})`);
          setTimeout(checkBackend, 2000); // Retry after 2 seconds
        } else if (!healthy) {
          setError('Backend server not detected. Please ensure the backend is running on port 3001.');
        } else {
          console.log('✅ Backend is healthy and ready!');
          setError(''); // Clear any previous errors
        }
      } catch (err) {
        console.error('Backend check failed:', err);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkBackend, 2000);
        } else {
          setError('Cannot connect to backend server. Please start it with: cd backend && node server.js');
        }
      } finally {
        setCheckingBackend(false);
      }
    };
    
    checkBackend();
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setRoomData({ ...roomData, [e.target.name]: e.target.value });
    if (error && !error.includes('backend')) setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!isConnected) return setError('Please connect your wallet first');
    if (!networkInfo.isCorrectNetwork) return setError('Please switch to Sepolia testnet');
    if (!roomData.title.trim()) return setError('Room title is required');
    if (roomData.title.trim().length < 3) return setError('Room title must be at least 3 characters');
    if (!backendHealthy) return setError('Backend server is not available. Please start it first.');

    try {
      const registered = await isCreatorRegistered();
      if (!registered) return setError('Please register as a creator first from your profile page');
    } catch {
      return setError('Could not verify creator status. Please try again.');
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Step 1: Create room via backend
      console.log('🚀 Step 1: Creating room via backend...');
      setSuccess('Creating your room...');
      
      const enrichedDescription = `[${roomData.category}] ${roomData.description.trim()}`;
      const roomResponse = await huddleService.createRoom(
        roomData.title.trim(), 
        accountId,
        enrichedDescription
      );
      
      setRoomId(roomResponse.roomId);
      setMeetingLink(roomResponse.meetingLink);
      console.log('✅ Room created with ID:', roomResponse.roomId);

      // Step 2: Get access token
      console.log('🔑 Step 2: Generating access token...');
      setSuccess('Securing your room...');
      
      const token = await huddleService.getAccessToken(roomResponse.roomId, accountId, 'host');
      setAccessToken(token);
      console.log('✅ Access token generated');

      // Step 3: Store on blockchain
      console.log('⛓️ Step 3: Storing room on blockchain...');
      setSuccess('Saving to blockchain... Please confirm the transaction.');
      
      await createLiveRoom(
        roomData.title.trim(), 
        enrichedDescription, 
        roomResponse.meetingLink
      );
      console.log('✅ Room stored on blockchain');

      setApiStatus('working');
      setSuccess('🎉 Room created successfully! Click "Start Session" to go live.');
      
    } catch (err: any) {
      console.error('❌ Room creation failed:', err);
      setApiStatus('failed');
      
      // Provide helpful error messages
      if (err.message.includes('backend')) {
        setError('Backend connection failed. Please ensure the server is running.');
      } else if (err.message.includes('wallet')) {
        setError('Wallet transaction failed. Please try again.');
      } else {
        setError(err?.message || 'Room creation failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    if (!roomId || !accessToken) {
      setError('Missing room credentials. Please create the room again.');
      return;
    }
    
    try {
      setError('');
      setSuccess('Connecting to your room...');
      console.log('🔌 Joining room with ID:', roomId);
      
      await joinRoom({ roomId, token: accessToken });
      
      // Enable media after a short delay for better UX
      setTimeout(async () => {
        try {
          console.log('📹 Enabling video...');
          await enableVideo();
          console.log('🎤 Enabling audio...');
          await enableAudio();
          setSuccess('You are now live! 🎉');
        } catch (mediaErr) {
          console.error('Media error:', mediaErr);
          setError('Camera/microphone access denied. Please check your browser permissions.');
        }
      }, 1500);
      
    } catch (err: any) {
      console.error('❌ Failed to join room:', err);
      // Better error messages based on error type
      if (err.message?.includes('token')) {
        setError('Invalid access token. Please try creating the room again.');
      } else if (err.message?.includes('network')) {
        setError('Network error. Please check your internet connection.');
      } else if (err.message?.includes('room')) {
        setError('Room not found or expired. Please create a new room.');
      } else {
        setError(`Failed to join room: ${err.message || 'Unknown error'}`);
      }
    }
  };

  const endSession = async () => {
    try {
      console.log('Ending session...');
      await disableVideo();
      await disableAudio();
      await leaveRoom();
      setSuccess('Session ended successfully. Thank you for streaming!');
    } catch (err) {
      console.error('Error ending session:', err);
    }
  };

  const toggleVideo = async () => {
    try {
      if (isVideoOn) {
        await disableVideo();
      } else {
        await enableVideo();
      }
    } catch (err) {
      console.error('Error toggling video:', err);
      setError('Failed to toggle video. Please check camera permissions.');
    }
  };

  const toggleAudio = async () => {
    try {
      if (isAudioOn) {
        await disableAudio();
      } else {
        await enableAudio();
      }
    } catch (err) {
      console.error('Error toggling audio:', err);
      setError('Failed to toggle audio. Please check microphone permissions.');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(meetingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback copy method
      const textArea = document.createElement('textarea');
      textArea.value = meetingLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openInNewTab = () => {
    window.open(meetingLink, '_blank', 'noopener,noreferrer');
  };

  // Status indicators
  const getApiStatusIcon = () => {
    if (checkingBackend) return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    if (apiStatus === 'working' || backendHealthy) return <Wifi className="w-4 h-4 text-green-400" />;
    if (apiStatus === 'failed' || !backendHealthy) return <WifiOff className="w-4 h-4 text-red-400" />;
    return <Info className="w-4 h-4 text-blue-400" />;
  };

  const getApiStatusText = () => {
    if (checkingBackend) return 'Checking...';
    if (apiStatus === 'working' || backendHealthy) return 'Connected';
    if (apiStatus === 'failed' || !backendHealthy) return 'Disconnected';
    return 'Unknown';
  };

  // Not connected screen
  if (!isConnected) {
    return (
      <GuardScreen
        icon={<AlertCircle className="w-16 h-16 text-yellow-400" />}
        title="Wallet Not Connected"
        subtitle="Please connect your wallet to create a live room"
        actionText="Connect Wallet"
        action={connectWallet}
      />
    );
  }

  // Wrong network screen
  if (!networkInfo.isCorrectNetwork) {
    return (
      <GuardScreen
        icon={<AlertCircle className="w-16 h-16 text-yellow-400" />}
        title="Wrong Network"
        subtitle={`Please switch to Sepolia testnet. Current: ${networkInfo.networkName || 'Unknown'}`}
      />
    );
  }

  // Room created - show meeting interface
  if (meetingLink && roomId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
        <header className="flex items-center justify-between mb-6 max-w-7xl mx-auto">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center text-white hover:text-purple-300 transition-all duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Create Another Room
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-sm">
              {getApiStatusIcon()}
              {getApiStatusText()}
            </div>
            
            {roomState === 'connected' && (
              <div className="flex items-center gap-2 bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                LIVE
              </div>
            )}
          </div>
        </header>

        {success && <Banner color="green" icon={CheckCircle} text={success} />}
        {error && <Banner color="red" icon={AlertCircle} text={error} />}

        <div className="max-w-7xl mx-auto bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              🎙️ {roomData.title}
              <span className="flex items-center bg-white/10 px-3 py-1 rounded-full text-sm font-normal">
                <Users className="w-4 h-4 mr-1" />
                {peerIds.length + (roomState === 'connected' ? 1 : 0)} participant{peerIds.length + (roomState === 'connected' ? 1 : 0) !== 1 ? 's' : ''}
              </span>
            </h2>
            
            <button
              onClick={openInNewTab}
              className="flex items-center gap-2 text-purple-300 hover:text-purple-200 transition-all"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Open in Huddle01</span>
            </button>
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Local Video */}
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-2xl">
              {localVideoStream ? (
                <HuddleVideo stream={localVideoStream} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/20 to-pink-900/20">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      {isVideoOn ? <Video className="w-10 h-10" /> : <VideoOff className="w-10 h-10" />}
                    </div>
                    <p className="text-lg font-medium">You (Host)</p>
                    <p className="text-sm text-gray-400">
                      {roomState === 'connected' ? 'Camera starting...' : 'Not connected'}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Local controls overlay */}
              {roomState === 'connected' && (
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <button
                    onClick={toggleVideo}
                    className={`p-3 rounded-full transition-all ${
                      isVideoOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/80 hover:bg-red-600'
                    }`}
                    title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
                  >
                    {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={toggleAudio}
                    className={`p-3 rounded-full transition-all ${
                      isAudioOn ? 'bg-white/20 hover:bg-white/30' : 'bg-red-500/80 hover:bg-red-600'
                    }`}
                    title={isAudioOn ? 'Mute' : 'Unmute'}
                  >
                    {isAudioOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                </div>
              )}
              
              {/* Host badge */}
              <div className="absolute top-4 left-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                Host
              </div>
            </div>

            {/* Remote Peers */}
            {peerIds.length > 0 ? (
              peerIds.map((peerId) => (
                <RemotePeer key={peerId} peerId={peerId} />
              ))
            ) : (
              <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Users className="w-16 h-16 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">Waiting for participants...</p>
                  <p className="text-sm text-gray-500 mt-2">Share the room link to invite others</p>
                </div>
              </div>
            )}
          </div>

          {/* Audio Streams */}
          {localAudioStream && <HuddleAudio stream={localAudioStream} />}
          {peerIds.map((peerId) => (
            <RemoteAudioStream key={`audio-${peerId}`} peerId={peerId} />
          ))}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {roomState === 'connected' ? (
              <button
                onClick={endSession}
                className="bg-red-600 hover:bg-red-700 px-8 py-4 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <PhoneOff className="w-5 h-5" />
                End Session
              </button>
            ) : (
              <button
                onClick={startSession}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 px-8 py-4 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Phone className="w-5 h-5" />
                Start Session
              </button>
            )}
            
            <button
              onClick={copyLink}
              className="bg-purple-600/20 hover:bg-purple-600/30 px-6 py-4 rounded-lg font-semibold flex items-center gap-2 transition-all border border-purple-400/50"
            >
              {copied ? <CheckCircle className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
              {copied ? 'Link Copied!' : 'Copy Room Link'}
            </button>
          </div>

          {/* Room Info and Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Room Details */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Room Details
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Room ID:</span>
                  <span className="ml-2 font-mono text-purple-300">{roomId}</span>
                </div>
                <div>
                  <span className="text-gray-400">Category:</span>
                  <span className="ml-2 capitalize">{roomData.category}</span>
                </div>
                <div>
                  <span className="text-gray-400">Status:</span>
                  <span className="ml-2">{roomState === 'connected' ? '🟢 Live' : '⚪ Ready'}</span>
                </div>
              </div>
            </div>
            
            {/* Features */}
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Room Features
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>End-to-end encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span>HD video quality</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>Up to 100 participants</span>
                </div>
              </div>
            </div>
          </div>

          {/* Meeting Link */}
          <div className="mt-4 p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-gray-400 mb-1">Share this link to invite participants:</p>
            <p className="text-xs font-mono text-purple-300 break-all">{meetingLink}</p>
          </div>
        </div>
      </div>
    );
  }

  // Create room form
  return (
    <FormScreen
      roomData={roomData}
      loading={loading}
      error={error}
      backendHealthy={backendHealthy}
      checkingBackend={checkingBackend}
      handleInput={handleInput}
      handleSubmit={handleSubmit}
    />
  );
};

/* ────────────── Helper Components ────────────── */

const RemotePeer: React.FC<{ peerId: string }> = ({ peerId }) => {
  const { stream: videoStream } = useRemoteVideo({ peerId });
  
  return (
    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden shadow-xl">
      {videoStream ? (
        <HuddleVideo stream={videoStream} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="text-center">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-10 h-10" />
            </div>
            <p className="text-sm text-gray-400">Participant</p>
            <p className="text-xs text-gray-500">Connecting...</p>
          </div>
        </div>
      )}
      
      {/* Participant badge */}
      <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium">
        Viewer
      </div>
    </div>
  );
};

const RemoteAudioStream: React.FC<{ peerId: string }> = ({ peerId }) => {
  const { stream } = useRemoteAudio({ peerId });
  return stream ? <HuddleAudio stream={stream} /> : null;
};

const FormScreen = ({ roomData, loading, error, backendHealthy, checkingBackend, handleInput, handleSubmit }: any) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-6">
    <div className="max-w-xl mx-auto">
      <h1 className="text-4xl font-bold mb-2">🎙️ Create a Live Room</h1>
      <p className="text-gray-300 mb-6">Start streaming to your audience in seconds</p>
      
      {/* Backend Status */}
      {checkingBackend ? (
        <Banner 
          color="blue" 
          icon={Loader2} 
          text="Checking backend connection..." 
        />
      ) : !backendHealthy ? (
        <Banner 
          color="yellow" 
          icon={AlertCircle} 
          text="Backend server not detected. Make sure to run: cd backend && node server.js" 
        />
      ) : (
        <Banner 
          color="green" 
          icon={CheckCircle} 
          text="Backend connected and ready!" 
        />
      )}
      
      {error && <Banner color="red" icon={AlertCircle} text={error} />}
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white/10 backdrop-blur-md p-8 rounded-xl border border-white/20">
        <div>
          <label className="block text-sm font-medium mb-2">Room Title *</label>
          <input
            type="text"
            name="title"
            placeholder="My Awesome Stream"
            value={roomData.title}
            onChange={handleInput}
            className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:border-purple-400 focus:outline-none transition-all"
            disabled={loading || !backendHealthy}
            maxLength={50}
          />
          <p className="text-xs text-gray-400 mt-1">{roomData.title.length}/50 characters</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Description (Optional)</label>
          <textarea
            name="description"
            placeholder="Tell viewers what your stream is about..."
            value={roomData.description}
            onChange={handleInput}
            rows={3}
            className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:border-purple-400 focus:outline-none transition-all resize-none"
            disabled={loading || !backendHealthy}
            maxLength={200}
          />
          <p className="text-xs text-gray-400 mt-1">{roomData.description.length}/200 characters</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            name="category"
            value={roomData.category}
            onChange={handleInput}
            className="w-full p-3 rounded-lg bg-white/10 text-white border border-white/20 focus:border-purple-400 focus:outline-none transition-all cursor-pointer"
            disabled={loading || !backendHealthy}
          >
            <option value="general" className="bg-slate-800">💬 General Discussion</option>
            <option value="education" className="bg-slate-800">📚 Education & Learning</option>
            <option value="gaming" className="bg-slate-800">🎮 Gaming</option>
            <option value="music" className="bg-slate-800">🎵 Music & Performance</option>
            <option value="tech" className="bg-slate-800">💻 Technology</option>
            <option value="business" className="bg-slate-800">💼 Business & Finance</option>
          </select>
        </div>
        
        <button
          type="submit"
          disabled={loading || !backendHealthy || checkingBackend}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-4 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Room...
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              Create Room
            </>
          )}
        </button>
        
        {/* Help text */}
        <div className="text-center text-sm text-gray-400">
          <p>By creating a room, you agree to our streaming guidelines</p>
        </div>
      </form>
    </div>
  </div>
);

const GuardScreen = ({ icon, title, subtitle, actionText, action }: any) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center text-white p-6">
    {icon}
    <h2 className="text-3xl font-bold mt-4 mb-2">{title}</h2>
    <p className="text-gray-300 mb-6 text-center max-w-md">{subtitle}</p>
    {actionText && (
      <button
        onClick={action}
        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 px-8 py-4 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        {actionText}
      </button>
    )}
  </div>
);

const Banner = ({ color, icon: Icon, text }: any) => {
  const colorClasses = {
    green: 'bg-green-500/20 border-green-500/50 text-green-100',
    red: 'bg-red-500/20 border-red-500/50 text-red-100',
    yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100',
    blue: 'bg-blue-500/20 border-blue-500/50 text-blue-100',
  };
  
  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} border p-4 rounded-lg flex items-center gap-3 mb-6`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${Icon === Loader2 ? 'animate-spin' : ''}`} />
      <span>{text}</span>
    </div>
  );
};

export default CreateRoomPage;
