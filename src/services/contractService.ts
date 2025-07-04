// ✅ Fixed contractService.ts - Proper BigNumber handling
import { ethers } from 'ethers';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../contracts';
import { Content, Creator, LiveRoom, PlatformStats } from '../types/contractTypes';

class ContractService {
  private contract: ethers.Contract | null = null;
  private signer: ethers.Signer | null = null;

  constructor(signer: ethers.Signer) {
    this.signer = signer;
    this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);
  }

  // ✅ Helper function to convert BigNumber to string
  private toBigNumberString(value: any): string {
    if (!value) return '0';
    return ethers.BigNumber.isBigNumber(value) ? value.toString() : String(value);
  }

  // ✅ Helper function to convert BigNumber to number
  private toBigNumberNumber(value: any): number {
    if (!value) return 0;
    return ethers.BigNumber.isBigNumber(value) ? value.toNumber() : Number(value);
  }

  async registerCreator(name: string, description: string): Promise<void> {
    const tx = await this.contract?.registerCreator(name, description);
    await tx.wait();
  }

  async uploadContent(title: string, cid: string): Promise<void> {
    const tx = await this.contract?.uploadContent(title, cid);
    await tx.wait();
  }

  async getCreator(address: string): Promise<Creator> {
    const result = await this.contract?.getCreator(address);
    
    // ✅ Convert all BigNumber fields to proper types
    return {
      name: result.name || '',
      description: result.description || '',
      totalEarnings: this.toBigNumberString(result.totalEarnings),
      contentCount: this.toBigNumberNumber(result.contentCount),
      liveRoomCount: this.toBigNumberNumber(result.liveRoomCount),
      createdAt: this.toBigNumberNumber(result.createdAt)
    };
  }

  async isCreatorRegistered(address: string): Promise<boolean> {
    return await this.contract?.isCreatorRegistered(address);
  }

  async getContent(contentId: string): Promise<Content> {
    const result = await this.contract?.getContent(contentId);
    
    // ✅ Convert all BigNumber fields to proper types
    return {
      id: result.id || contentId,
      creator: result.creator || '',
      title: result.title || '',
      cid: result.cid || '',
      timestamp: this.toBigNumberNumber(result.timestamp),
      tipsReceived: this.toBigNumberString(result.tipsReceived),
      views: this.toBigNumberNumber(result.views)
    };
  }

  async viewContent(contentId: string): Promise<void> {
    const tx = await this.contract?.viewContent(contentId);
    await tx.wait();
  }

  async tipContent(contentId: string, amount: string): Promise<void> {
    const tx = await this.contract?.tipContent(contentId, {
      value: ethers.utils.parseEther(amount),
    });
    await tx.wait();
  }

  async tipCreator(creator: string, amount: string): Promise<void> {
    const tx = await this.contract?.tipCreator(creator, {
      value: ethers.utils.parseEther(amount),
    });
    await tx.wait();
  }

  async tipLiveRoom(roomId: string, amount: string): Promise<void> {
    const tx = await this.contract?.tipLiveRoom(roomId, {
      value: ethers.utils.parseEther(amount),
    });
    await tx.wait();
  }

  async createLiveRoom(title: string, description: string, huddleLink: string): Promise<void> {
    const tx = await this.contract?.createLiveRoom(title, description, huddleLink);
    await tx.wait();
  }

  async joinLiveRoom(roomId: string): Promise<void> {
    const tx = await this.contract?.joinLiveRoom(roomId);
    await tx.wait();
  }

  async leaveLiveRoom(roomId: string): Promise<void> {
    const tx = await this.contract?.leaveLiveRoom(roomId);
    await tx.wait();
  }

  async updateCreator(name: string, description: string): Promise<void> {
    const tx = await this.contract?.updateCreator(name, description);
    await tx.wait();
  }

  async getActiveLiveRooms(): Promise<string[]> {
    if (!this.contract) throw new Error('Contract not initialized');
    return await this.contract.getActiveLiveRooms();
  }  

  async getCreatorContents(address: string): Promise<string[]> {
    return await this.contract?.getCreatorContents(address);
  }

  async getCreatorLiveRooms(address: string): Promise<string[]> {
    return await this.contract?.getCreatorLiveRooms(address);
  }

  async getFeaturedCreators(): Promise<string[]> {
    return await this.contract?.getFeaturedCreators();
  }

  async getLatestContent(): Promise<string[]> {
    return await this.contract?.getLatestContent();
  }

  async getLatestContents(limit = 6): Promise<Content[]> {
    const ids: string[] = await this.getLatestContent();
    const sliced = ids.slice(0, limit);

    const contentObjects: Content[] = await Promise.all(
      sliced.map(async (id) => {
        const result = await this.contract?.getContent(id);
        
        // ✅ Properly convert BigNumber fields
        return {
          id,
          cid: result.cid || '',
          title: result.title || '',
          creator: result.creator || '',
          timestamp: this.toBigNumberNumber(result.timestamp),
          tipsReceived: this.toBigNumberString(result.tipsReceived),
          views: this.toBigNumberNumber(result.views)
        };
      })
    );

    return contentObjects;
  }

  async getLiveRoom(roomId: string): Promise<LiveRoom> {
    const result = await this.contract?.getLiveRoom(roomId);
    
    // ✅ Convert all BigNumber fields to proper types
    return {
      id: result.id || roomId,
      creator: result.creator || '',
      title: result.title || '',
      description: result.description || '',
      huddleLink: result.huddleLink || '',
      createdAt: this.toBigNumberNumber(result.createdAt),
      participantCount: this.toBigNumberNumber(result.participantCount),
      isLive: Boolean(result.isLive)
    };
  }

  async getPlatformStats(): Promise<PlatformStats> {
    const result = await this.contract?.getPlatformStats();
    
    // ✅ Convert all BigNumber fields to proper types
    return {
      creatorsCount: this.toBigNumberNumber(result[0]),
      contentCount: this.toBigNumberNumber(result[1]),
      liveRoomsCount: this.toBigNumberNumber(result[2]),
      totalTipsAmount: this.toBigNumberString(result[3])
    };
  }
}

export default ContractService;
