// api/access-token.js
import { AccessToken, Role } from '@huddle01/server-sdk/auth';

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
    });

    const token = await accessToken.toJwt();
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Token generation failed' });
  }
}
