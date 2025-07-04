import { useState, useEffect, useCallback } from 'react';
import ContractService from '../services/contractService';
import { storageService, UploadProgress } from '../services/storageService';
import { ethers } from 'ethers';
import { Creator, Content, LiveRoom, PlatformStats } from '../types/contractTypes';

interface ExtendedContent extends Content {
  metadata?: any;
}

interface UploadState {
  isUploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
}

interface NetworkInfo {
  chainId: string | null;
  networkName: string | null;
  isCorrectNetwork: boolean;
}

export const useContractIntegration = () => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [accountId, setAccountId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Creator | null>(null);
  const [contractServiceInstance, setContractServiceInstance] = useState<ContractService | null>(null);

  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: null,
    error: null
  });

  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    chainId: null,
    networkName: null,
    isCorrectNetwork: false
  });

  const SEPOLIA_CHAIN_ID = '0xaa36a7';

  // Clear all state - extracted as a separate function
  const clearAllState = () => {
    setIsConnected(false);
    setAccountId('');
    setUserProfile(null);
    setError(null);
    setContractServiceInstance(null);
    setNetworkInfo({
      chainId: null,
      networkName: null,
      isCorrectNetwork: false
    });
  };

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      await checkConnection();
      await checkNetwork();
    };

    initializeApp();

    const handleAccountsChanged = (accounts: string[]) => {
      if (!mounted) return;
      if (accounts.length === 0) {
        // User disconnected from MetaMask
        clearAllState();
      } else if (accounts[0] !== accountId) {
        // User switched accounts
        setAccountId(accounts[0]);
        loadUserProfile(accounts[0]);
      }
    };

    const handleChainChanged = () => {
      if (!mounted) return;
      window.location.reload();
    };

    // Listen for disconnect event
    const handleDisconnect = () => {
      if (!mounted) return;
      clearAllState();
    };

    window.ethereum?.on('accountsChanged', handleAccountsChanged);
    window.ethereum?.on('chainChanged', handleChainChanged);
    window.ethereum?.on('disconnect', handleDisconnect);

    return () => {
      mounted = false;
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
      window.ethereum?.removeListener('disconnect', handleDisconnect);
    };
  }, [accountId]);

  const checkConnection = async () => {
    if (!window.ethereum) return;
    
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const instance = new ContractService(signer);
        setContractServiceInstance(instance);
        setIsConnected(true);
        setAccountId(accounts[0]);
        await loadUserProfile(accounts[0], instance);
      } else {
        // No accounts connected
        clearAllState();
      }
    } catch (error) {
      console.error('Connection check failed:', error);
      clearAllState();
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!window.ethereum) throw new Error('MetaMask is not installed');
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const instance = new ContractService(signer);
      setContractServiceInstance(instance);
      setIsConnected(true);
      setAccountId(address);
      await loadUserProfile(address, instance);
      await checkNetwork();
    } catch (err: any) {
      const msg = err.message || 'Failed to connect wallet';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const checkNetwork = async () => {
    try {
      if (!window.ethereum) return;
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const isCorrectNetwork = chainId === SEPOLIA_CHAIN_ID;
      setNetworkInfo({
        chainId,
        networkName: isCorrectNetwork ? 'Sepolia Testnet' : 'Unknown',
        isCorrectNetwork
      });
    } catch (error) {
      console.error('Network check failed:', error);
    }
  };

  const loadUserProfile = async (address: string, service = contractServiceInstance) => {
    try {
      if (!service) return;
      const profile = await service.getCreator(address);
      if (profile) {
        const formatted: Creator = {
          name: profile.name,
          description: profile.description,
          totalEarnings: profile.totalEarnings.toString(),
          contentCount: Number(profile.contentCount),
          liveRoomCount: Number(profile.liveRoomCount),
          createdAt: Number(profile.createdAt),
        };
        setUserProfile(formatted);
      }
    } catch (err) {
      console.error('Profile load failed:', err);
    }
  };

  // FIXED: Improved disconnect function
  const disconnectWallet = async () => {
    try {
      // Clear all state immediately
      clearAllState();
      
      // Note: MetaMask doesn't provide a programmatic way to disconnect
      // The user must manually disconnect from MetaMask
      // But we can clear our app's state to simulate disconnection
      
      // Optional: Show a message to user
      console.log('Wallet disconnected from app. To fully disconnect, please disconnect from MetaMask.');
      
      // Force a re-check of connection status
      setTimeout(() => {
        checkConnection();
      }, 100);
      
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  };

  const ensureReady = () => {
    if (!isConnected) throw new Error('Wallet not connected');
    if (!networkInfo.isCorrectNetwork) throw new Error('Please switch to Sepolia testnet');
    if (!contractServiceInstance) throw new Error('Contract service unavailable');
  };

  const registerCreator = async (name: string, description: string) => {
    ensureReady();
    setIsLoading(true);
    try {
      await contractServiceInstance!.registerCreator(name, description);
      await loadUserProfile(accountId);
    } catch (err: any) {
      setError(err.message || 'Failed to register creator');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateCreator = async (name: string, description: string) => {
    ensureReady();
    setIsLoading(true);
    try {
      await contractServiceInstance!.updateCreator(name, description);
      await loadUserProfile(accountId);
    } catch (err: any) {
      setError(err.message || 'Failed to update creator');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const isCreatorRegistered = useCallback(async (address?: string): Promise<boolean> => {
    try {
      const targetAddress = address || accountId;
      if (!targetAddress || !contractServiceInstance) return false;
      return await contractServiceInstance.isCreatorRegistered(targetAddress);
    } catch (err) {
      console.error('Check creator failed:', err);
      return false;
    }
  }, [accountId, contractServiceInstance]);

  const uploadContent = async (
    title: string,
    file: File,
    description?: string,
    tags?: string[],
    onProgress?: (progress: UploadProgress) => void
  ) => {
    ensureReady();
    const validation = storageService.validateFile(file);
    if (!validation.valid) throw new Error(validation.error);

    const isRegistered = await contractServiceInstance!.isCreatorRegistered(accountId);
    if (!isRegistered) throw new Error('Please register as a creator first');

    setUploadState({ isUploading: true, progress: null, error: null });
    setIsLoading(true);
    try {
      const { contentCid, metadataCid } = await storageService.uploadContentWithMetadata(
        file,
        {
          title: title.trim(),
          description: description?.trim() || '',
          creator: accountId,
          contentType: file.type,
          tags: tags || []
        },
        (progress) => {
          setUploadState(prev => ({ ...prev, progress }));
          if (onProgress) onProgress(progress);
        }
      );

      setUploadState(prev => ({
        ...prev,
        progress: {
          stage: 'metadata',
          progress: 95,
          message: 'Registering on blockchain...'
        }
      }));

      // IMPORTANT: Store the content CID, not metadata CID
      await contractServiceInstance!.uploadContent(title.trim(), contentCid);

      setUploadState(prev => ({
        ...prev,
        progress: {
          stage: 'complete',
          progress: 100,
          message: 'Content uploaded!'
        }
      }));
    } catch (err: any) {
      const msg = err.message || 'Upload failed';
      setError(msg);
      setUploadState(prev => ({ ...prev, error: msg }));
      throw new Error(msg);
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadState({ isUploading: false, progress: null, error: null }), 3000);
    }
  };

  const createLiveRoom = async (...args: Parameters<ContractService["createLiveRoom"]>) => {
    ensureReady();
    setIsLoading(true);
    try {
      const isRegistered = await contractServiceInstance!.isCreatorRegistered(accountId);
      if (!isRegistered) throw new Error('Please register as a creator');
      await contractServiceInstance!.createLiveRoom(...args);
    } catch (err: any) {
      const msg = err.message || 'Failed to create room';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const tipCreator = async (...args: Parameters<ContractService["tipCreator"]>) => {
    ensureReady();
    setIsLoading(true);
    try {
      await contractServiceInstance!.tipCreator(...args);
    } catch (err: any) {
      const msg = err.message || 'Failed to tip';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const tipContent = async (...args: Parameters<ContractService["tipContent"]>) => {
    ensureReady();
    setIsLoading(true);
    try {
      await contractServiceInstance!.tipContent(...args);
    } catch (err: any) {
      const msg = err.message || 'Failed to tip content';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getContent = async (id: string) => {
    ensureReady();
    return await contractServiceInstance!.getContent(id);
  };

  const getActiveLiveRooms = async (): Promise<string[]> => {
    ensureReady();
    return await contractServiceInstance!.getActiveLiveRooms();
  };

  const getLiveRoom = async (id: string): Promise<LiveRoom> => {
    ensureReady();
    return await contractServiceInstance!.getLiveRoom(id);
  };

  return {
    isConnected,
    accountId,
    isLoading,
    error,
    userProfile,
    uploadState,
    networkInfo,
    contractServiceInstance,

    connectWallet,
    disconnectWallet,
    registerCreator,
    updateCreator,
    isCreatorRegistered,
    uploadContent,
    createLiveRoom,
    tipCreator,
    tipContent,
    getContent,
    getActiveLiveRooms,
    getLiveRoom,
  };
};

export default useContractIntegration;
