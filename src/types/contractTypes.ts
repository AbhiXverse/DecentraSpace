// Creator struct from Solidity
export interface Creator {
    name: string;
    description: string;
    totalEarnings: string;
    contentCount: number;
    liveRoomCount: number;
    createdAt: number;
  }
  
  // Content struct from Solidity
  export interface Content {
    id: string;
    creator: string;
    title: string;
    cid: string;
    timestamp: number;
    tipsReceived: string;
    views: number;
  }
  
  // LiveRoom struct from Solidity
  export interface LiveRoom {
    id: string;
    creator: string;
    title: string;
    description: string;
    huddleLink: string;
    createdAt: number;
    participantCount: number;
    isLive: boolean;
  }
  
  // PlatformStats response from getPlatformStats()
  export interface PlatformStats {
    creatorsCount: number;
    contentCount: number;
    liveRoomsCount: number;
    totalTipsAmount: string;
  }
  