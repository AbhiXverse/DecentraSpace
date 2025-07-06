// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

// ✅ Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Huddle01 Backend API',
    endpoints: {
      health: '/api/health',
      createRoom: 'POST /api/huddle/create-room',
      accessToken: 'POST /api/huddle/access-token'
    }
  });
});

// ✅ Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    hasApiKey: !!process.env.HUDDLE_API_KEY 
  });
});

// ✅ Create Room API - FIXED WITH V2 ENDPOINT
app.post('/api/huddle/create-room', async (req, res) => {
  console.log('📥 Create room request received:', req.body);
  
  const { title, hostAddress, description } = req.body;

  if (!process.env.HUDDLE_API_KEY) {
    console.error('❌ HUDDLE_API_KEY not configured');
    return res.status(500).json({ error: 'HUDDLE_API_KEY not configured' });
  }

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    // Use dynamic import for node-fetch
    const fetch = (await import('node-fetch')).default;
    
    console.log('🚀 Calling Huddle01 API v2...');
    
    // FIXED: Use v2 endpoint instead of v1
    const response = await fetch('https://api.huddle01.com/api/v2/sdk/rooms/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.HUDDLE_API_KEY
      },
      body: JSON.stringify({
        roomLocked: false,
        metadata: { 
          title, 
          hostWallets: hostAddress ? [hostAddress] : [] 
        }
      })
    });

    const raw = await response.text();

    // Try to parse manually
    let data;
    try {
      data = JSON.parse(raw);
    } catch (jsonErr) {
      console.error('❌ Invalid JSON response from Huddle01:\n', raw);
      return res.status(502).json({
        error: 'Invalid response from Huddle01 API',
        rawHtml: raw
      });
    }
    console.log('📦 Huddle01 API response:', data);
    
    if (!response.ok) {
      console.error('❌ Huddle API Error:', data);
      return res.status(response.status).json({ 
        error: data.message || 'Room creation failed' 
      });
    }

    // FIXED: v2 API returns data.data.roomId structure
    if (!data.data?.roomId) {
      console.error('❌ Invalid response structure:', data);
      return res.status(500).json({ error: 'Invalid response from Huddle01' });
    }

    // FIXED: Add /lobby to the meeting link for proper room access
    const result = {
      roomId: data.data.roomId,
      meetingLink: `https://iframe.huddle01.com/${data.data.roomId}/lobby`
    };
    
    console.log('✅ Room created successfully:', result);
    res.json(result);
    
  } catch (err) {
    console.error('❌ Error creating room:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// ✅ Generate Access Token - FIXED
app.post('/api/huddle/access-token', async (req, res) => {
  console.log('📥 Access token request received:', req.body);
  
  const { roomId, userAddress, role = 'host' } = req.body;

  if (!process.env.HUDDLE_API_KEY) {
    console.error('❌ HUDDLE_API_KEY not configured');
    return res.status(500).json({ error: 'HUDDLE_API_KEY not configured' });
  }

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    // Import AccessToken from the server SDK
    const { AccessToken, Role } = await import('@huddle01/server-sdk/auth');
    
    console.log('🔑 Generating access token for room:', roomId);
    const accessToken = new AccessToken({
      apiKey: process.env.HUDDLE_API_KEY,
      roomId,
      role: role === 'host' ? Role.HOST : Role.GUEST,
      permissions: {
        admin: role === 'host',
        canConsume: true,
        canProduce: true,
        canProduceSources: {
          cam: true,
          mic: true,
          screen: true,
        },
        canRecvData: true,
        canSendData: true,
        canUpdateMetadata: true,
      },
      options: {
        metadata: {
          displayName: userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'User',
          walletAddress: userAddress
        }
      }
    });

    const token = await accessToken.toJwt();
    console.log('✅ Access token generated successfully');
    res.json({ token });
    
  } catch (err) {
    console.error('❌ Error generating token:', err);
    res.status(500).json({ error: err.message || 'Token generation failed' });
  }
});

// ✅ 404 handler - IMPORTANT: This should be last
app.use((req, res) => {
  console.log('⚠️ 404 - Route not found:', req.method, req.url);
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error('💥 Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Huddle01 backend is running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 API Key: ${process.env.HUDDLE_API_KEY ? 'Configured' : '❌ Missing'}`);
  console.log(`\n📍 Available endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/huddle/create-room`);
  console.log(`   POST http://localhost:${PORT}/api/huddle/access-token`);
});
