// api/huddle/create-room.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, hostAddress, description } = req.body;

  if (!process.env.HUDDLE_API_KEY) {
    return res.status(500).json({ error: 'HUDDLE_API_KEY not configured' });
  }

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
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

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.message || 'Room creation failed' 
      });
    }

    if (!data.data?.roomId) {
      return res.status(500).json({ error: 'Invalid response from Huddle01' });
    }

    const result = {
      roomId: data.data.roomId,
      meetingLink: `https://iframe.huddle01.com/${data.data.roomId}/lobby`
    };

    res.status(200).json(result);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
