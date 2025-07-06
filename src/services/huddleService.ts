// src/services/huddleService.ts
const BACKEND_URL = import.meta.env.DEV
  ? '/api/huddle'  // Use proxy in development
  : '/api/huddle';

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
  private baseUrl = import.meta.env.DEV 
    ? ''  // Use proxy in development
    : '';

  constructor() {
    console.log('🔧 Huddle Service initialized');
    console.log('📍 Backend URL:', BACKEND_URL);
  }

  /**
   * ✅ Create room via backend
   */
  async createRoom(title: string, hostAddress: string, description?: string): Promise<CreateRoomResponse> {
    try {
      const response = await fetch(`${BACKEND_URL}/create-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, hostAddress, description }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to create room (${response.status})`);
      }

      const data = await response.json();
      
      // FIXED: Ensure proper meeting link format with /lobby
      const meetingLink = data.meetingLink || this.getRoomJoinUrl(data.roomId);
      
      return {
        roomId: data.roomId,
        meetingLink,
        roomLocked: false,
      };
    } catch (error) {
      console.error('Create room error:', error);
      throw error;
    }
  }

  /**
   * ✅ Get access token via backend
   */
  async getAccessToken(roomId: string, userAddress: string, role: 'host' | 'guest' = 'host'): Promise<string> {
    try {
      const response = await fetch(`${BACKEND_URL}/access-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomId, userAddress, role }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Failed to get access token (${response.status})`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Get access token error:', error);
      throw error;
    }
  }

  /**
   * ✅ Check backend health - FIXED to handle non-JSON responses
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // First check if response is ok
      if (!response.ok) {
        console.error('Health check failed with status:', response.status);
        return false;
      }
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Health check returned non-JSON response');
        return false;
      }
      
      // Try to parse JSON
      const text = await response.text();
      if (!text) {
        console.error('Health check returned empty response');
        return false;
      }
      
      try {
        const data = JSON.parse(text);
        return data.status === 'ok' && data.hasApiKey === true;
      } catch (parseError) {
        console.error('Failed to parse health check response:', text);
        return false;
      }
      
    } catch (error) {
      console.error('Health check network error:', error);
      return false;
    }
  }

  /**
   * ✅ FIXED: Build room join URL with /lobby path
   */
  getRoomJoinUrl(roomId: string, displayName?: string): string {
    // FIXED: Add /lobby to make the URL work properly
    const baseUrl = `https://iframe.huddle01.com/${roomId}/lobby`;
    
    if (displayName) {
      const params = new URLSearchParams({ displayName });
      return `${baseUrl}?${params.toString()}`;
    }
    return baseUrl;
  }

  /**
   * ✅ FIXED: Build room join URL with user parameters and /lobby
   */
  async joinRoom(roomId: string, userAddress?: string, isHost?: boolean): Promise<string> {
    // FIXED: Add /lobby to the URL
    const baseUrl = `https://iframe.huddle01.com/${roomId}/lobby`;
    const params = new URLSearchParams();

    if (userAddress) {
      const displayName = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
      params.append('displayName', displayName);
    }

    if (isHost) {
      params.append('host', 'true');
    }

    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }

  /**
   * ✅ FIXED: Extract room ID from meeting link (handles /lobby URLs)
   */
  extractRoomIdFromLink(link: string): string | null {
    try {
      // Handle empty or invalid links
      if (!link || typeof link !== 'string') {
        return null;
      }
      
      // Handle different URL formats
      const url = new URL(link);
      const pathname = url.pathname;
      
      // Extract the room ID (second-to-last segment if /lobby is present)
      const parts = pathname.split('/').filter(part => part.length > 0);
      
      // Handle both formats: /roomId and /roomId/lobby
      let roomId: string;
      if (parts.length >= 2 && parts[parts.length - 1] === 'lobby') {
        // URL format: /roomId/lobby
        roomId = parts[parts.length - 2];
      } else {
        // URL format: /roomId
        roomId = parts[parts.length - 1];
      }
      
      // Remove any query parameters
      const cleanId = roomId.split('?')[0];
      
      // Validate the ID format before returning
      if (cleanId && this.isValidRoomId(cleanId)) {
        return cleanId;
      }
      
      // If not valid format, still return it for debugging
      return cleanId || null;
    } catch (error) {
      console.error('Failed to extract room ID from link:', link, error);
      return null;
    }
  }

  /**
   * ✅ Validate room ID format
   */
  isValidRoomId(roomId: string): boolean {
    // Huddle01 room ID format: xxx-xxxx-xxx (lowercase alphanumeric)
    return /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/.test(roomId);
  }

  /**
   * ✅ Generate a fallback room ID (for demo/testing)
   */
  generateLocalRoomId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const getRandomChar = () => chars[Math.floor(Math.random() * chars.length)];
    
    // Generate format: xxx-xxxx-xxx
    const part1 = Array.from({ length: 3 }, getRandomChar).join('');
    const part2 = Array.from({ length: 4 }, getRandomChar).join('');
    const part3 = Array.from({ length: 3 }, getRandomChar).join('');
    
    return `${part1}-${part2}-${part3}`;
  }

  /**
   * ✅ Get service configuration info
   */
  getServiceInfo(): {
    isConfigured: boolean;
    hasProjectId: boolean;
    backendUrl: string;
    environment: string;
  } {
    return {
      isConfigured: !!import.meta.env.VITE_HUDDLE_PROJECT_ID,
      hasProjectId: !!import.meta.env.VITE_HUDDLE_PROJECT_ID,
      backendUrl: BACKEND_URL,
      environment: import.meta.env.DEV ? 'development' : 'production'
    };
  }

  /**
   * ✅ Test backend connectivity with better error handling
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      console.log('🧪 Testing backend connectivity...');
      
      // First check if backend is reachable
      try {
        const healthResponse = await fetch('/api/health', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        if (!healthResponse.ok) {
          return {
            success: false,
            message: `Backend returned error status: ${healthResponse.status}`,
            details: { status: healthResponse.status }
          };
        }
        
        // Check if we got JSON
        const contentType = healthResponse.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          return {
            success: false,
            message: 'Backend is not returning JSON. Check if backend server is running correctly.',
            details: { contentType }
          };
        }
        
      } catch (networkError) {
        return {
          success: false,
          message: 'Cannot reach backend server. Please ensure it\'s running on port 3001.',
          details: { error: networkError }
        };
      }
      
      // Now check health
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        return {
          success: false,
          message: 'Backend server is running but health check failed',
          details: { backendUrl: BACKEND_URL }
        };
      }
      
      return {
        success: true,
        message: 'Backend connection successful',
        details: { backendUrl: BACKEND_URL }
      };
      
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error, backendUrl: BACKEND_URL }
      };
    }
  }

  /**
   * ✅ Format wallet address for display
   */
  formatAddress(address: string): string {
    if (!address) return 'Unknown';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * ✅ NEW: Get proper room URL for iframe embedding
   */
  getIframeUrl(roomId: string, accessToken?: string): string {
    const baseUrl = `https://iframe.huddle01.com/${roomId}`;
    
    if (accessToken) {
      const params = new URLSearchParams({ accessToken });
      return `${baseUrl}?${params.toString()}`;
    }
    
    return baseUrl;
  }

  /**
   * ✅ NEW: Get lobby URL (for direct browser access)
   */
  getLobbyUrl(roomId: string, displayName?: string): string {
    return this.getRoomJoinUrl(roomId, displayName);
  }
}

// Create and export a singleton instance
export const huddleService = new HuddleService();

// Export types
export type { CreateRoomResponse, RoomDetails };

// Export the class type for TypeScript
export type { HuddleService };
