// huddleService.ts
const HUDDLE_API_KEY = import.meta.env.VITE_HUDDLE_API_KEY || '';
const HUDDLE_PROJECT_ID = import.meta.env.VITE_HUDDLE_PROJECT_ID || '';

interface CreateRoomResponse {
  roomId: string;
  meetingLink: string;
  roomLocked: boolean;
}

interface RoomDetails {
  roomId: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  hostWalletAddress: string[];
  roomLocked: boolean;
  muteOnEntry: boolean;
  videoOnEntry: boolean;
}

class HuddleService {
  private baseUrl = '/huddle-api/api/v1';
  constructor() {
    if (!HUDDLE_API_KEY) {
      console.warn('⚠️ Huddle01 API key not configured');
    }
  }

  async createRoom(title: string, hostAddress: string, description?: string): Promise<CreateRoomResponse> {
    const res = await fetch(`${this.baseUrl}/create-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': HUDDLE_API_KEY,
      },
      body: JSON.stringify({
        title,
        description,
        roomLocked: false,
        muteOnEntry: false,
        videoOnEntry: true,
        hostWallets: [hostAddress.toLowerCase()],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[Huddle01] Failed to create room:', data?.message || data);
      throw new Error(data?.message || 'Unknown error creating room');
    }

    return {
      roomId: data.data.roomId,
      meetingLink: `https://app.huddle01.com/${data.data.roomId}`,
      roomLocked: data.data.roomLocked || false,
    };
  }

  async getRoomDetails(roomId: string): Promise<RoomDetails | null> {
    try {
      const res = await fetch(`${this.baseUrl}/room-details/${roomId}`, {
        method: 'GET',
        headers: { 'x-api-key': HUDDLE_API_KEY },
      });

      if (!res.ok) return null;

      const data = await res.json();
      return data.data;
    } catch {
      return null;
    }
  }

  async joinRoom(roomId: string, userAddress?: string, isHost?: boolean): Promise<string> {
    const baseUrl = `https://app.huddle01.com/${roomId}`;
    let queryParams = '';
  
    if (userAddress) {
      const displayName = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      queryParams += `?displayName=${encodeURIComponent(displayName)}`;
    }
  
    if (isHost) {
      queryParams += userAddress ? `&host=true` : `?host=true`;
    }
  
    return `${baseUrl}${queryParams}`;
  }
  
  getRoomJoinUrl(roomId: string): string {
    return `https://app.huddle01.com/${roomId}`;
  }

  async updateRoom(roomId: string, updates: Partial<Omit<RoomDetails, 'roomId'>>): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/update-room-details/${roomId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': HUDDLE_API_KEY,
      },
      body: JSON.stringify(updates),
    });

    return res.ok;
  }

  async endRoom(roomId: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/end-room`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': HUDDLE_API_KEY,
      },
      body: JSON.stringify({ roomId }),
    });

    return res.ok;
  }

  async getLivePeers(roomId: string): Promise<any[]> {
    try {
      const res = await fetch(`${this.baseUrl}/live-peers?roomId=${roomId}`, {
        method: 'GET',
        headers: { 'x-api-key': HUDDLE_API_KEY },
      });

      if (!res.ok) return [];

      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  createMeetingLink(roomId: string): string {
    return `https://app.huddle01.com/${roomId}`;
  }

  createEmbedCode(roomId: string, width = '100%', height = '600px'): string {
    return `<iframe src="https://app.huddle01.com/${roomId}" width="${width}" height="${height}" frameborder="0" allow="camera; microphone; display-capture"></iframe>`;
  }

  isValidRoomId(roomId: string): boolean {
    return /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(roomId);
  }

  extractRoomIdFromLink(link: string): string | null {
    try {
      const url = new URL(link);
      const parts = url.pathname.split('/');
      const id = parts[parts.length - 1];
      return this.isValidRoomId(id) ? id : null;
    } catch {
      return null;
    }
  }
}

export const huddleService = new HuddleService();
export type { CreateRoomResponse, RoomDetails };
