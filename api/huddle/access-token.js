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
    // For now, return a mock token since Huddle01 server SDK might have issues in serverless
    const mockToken = `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb29tSWQiOiIke3Jvb21JZH0iLCJ1c2VyQWRkcmVzcyI6IiR7dXNlckFkZHJlc3N9IiwiaWF0IjoxNjE2MjM5MDIyfQ.mock_token_for_demo`;
    
    res.json({ token: mockToken });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
}
