// api/huddle/access-token.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { roomId, userAddress, role = 'host' } = req.body;

  if (!process.env.HUDDLE_API_KEY) {
    return res.status(500).json({ error: 'HUDDLE_API_KEY not configured' });
  }

  if (!roomId) {
    return res.status(400).json({ error: 'Room ID is required' });
  }

  try {
    // Generate a basic JWT-like token for demo purposes
    // In production, you'd use the Huddle01 server SDK
    const basicToken = Buffer.from(JSON.stringify({
      roomId,
      userAddress,
      role,
      timestamp: Date.now()
    })).toString('base64');

    res.status(200).json({ token: basicToken });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
}
