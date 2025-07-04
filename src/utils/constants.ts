// src/utils/constants.ts

// Network Configuration
export const NETWORK_CONFIG = {
    SEPOLIA_CHAIN_ID: '0xaa36a7',
    SEPOLIA_RPC_URL: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    MAINNET_CHAIN_ID: '0x1',
    SUPPORTED_NETWORKS: ['0xaa36a7'] // Only Sepolia for now
  } as const;
  
  // App Configuration
  export const APP_CONFIG = {
    APP_NAME: 'DecentraSpace',
    APP_VERSION: '1.0.0',
    AUTHOR: 'DecentraSpace Team',
    DESCRIPTION: 'Decentralized creator platform on Ethereum'
  } as const;
  
  // File Upload Limits
  export const FILE_LIMITS = {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    MIN_FILE_SIZE: 1, // 1 byte
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],
    ALLOWED_FILE_TYPES: [
      'video/mp4',
      'video/webm', 
      'video/ogg',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword'
    ]
  } as const;
  
  // Content Configuration
  export const CONTENT_CONFIG = {
    MAX_TITLE_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_CREATOR_NAME_LENGTH: 50,
    MAX_CREATOR_BIO_LENGTH: 500,
    MAX_LIVE_ROOM_TITLE_LENGTH: 100,
    MAX_LIVE_ROOM_DESCRIPTION_LENGTH: 500,
    DEFAULT_CONTENT_LIMIT: 6,
    DEFAULT_CREATORS_LIMIT: 6,
    DEFAULT_LIVE_ROOMS_LIMIT: 6
  } as const;
  
  // UI Configuration
  export const UI_CONFIG = {
    MOBILE_BREAKPOINT: 768,
    TABLET_BREAKPOINT: 1024,
    DESKTOP_BREAKPOINT: 1280,
    ANIMATION_DURATION: 200, // milliseconds
    LOADING_TIMEOUT: 10000, // 10 seconds
    RETRY_ATTEMPTS: 3
  } as const;
  
  // Error Messages
  export const ERROR_MESSAGES = {
    WALLET_NOT_CONNECTED: 'Please connect your wallet first',
    WRONG_NETWORK: 'Please switch to Sepolia testnet',
    INSUFFICIENT_FUNDS: 'Insufficient ETH balance',
    TRANSACTION_REJECTED: 'Transaction was rejected by user',
    CREATOR_NOT_REGISTERED: 'Please register as a creator first',
    ALREADY_REGISTERED: 'You are already registered as a creator',
    FILE_TOO_LARGE: 'File size exceeds maximum limit',
    INVALID_FILE_TYPE: 'File type not supported',
    UPLOAD_FAILED: 'Upload failed. Please try again.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
    CONTRACT_ERROR: 'Smart contract error. Please try again.',
    IPFS_ERROR: 'IPFS storage error. Please try again.',
    GENERIC_ERROR: 'An unexpected error occurred. Please try again.'
  } as const;
  
  // Success Messages
  export const SUCCESS_MESSAGES = {
    WALLET_CONNECTED: 'Wallet connected successfully!',
    CREATOR_REGISTERED: 'Creator registration successful! Welcome to DecentraSpace!',
    PROFILE_UPDATED: 'Profile updated successfully!',
    CONTENT_UPLOADED: 'Content uploaded successfully!',
    LIVE_ROOM_CREATED: 'Live room created successfully!',
    TIP_SENT: 'Tip sent successfully!',
    TRANSACTION_CONFIRMED: 'Transaction confirmed!'
  } as const;
  
  // IPFS Configuration
  export const IPFS_CONFIG = {
    GATEWAYS: [
      'https://gateway.lighthouse.storage/ipfs/',
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/'
    ],
    TIMEOUT: 10000, // 10 seconds
    MAX_RETRIES: 3
  } as const;
  
  // Transaction Configuration
  export const TX_CONFIG = {
    DEFAULT_GAS_LIMIT: 300000,
    DEFAULT_TIP_AMOUNT: '0.001', // ETH
    MIN_TIP_AMOUNT: '0.001',
    MAX_TIP_AMOUNT: '10',
    CONFIRMATIONS_REQUIRED: 1
  } as const;
  
  // Routes
  export const ROUTES = {
    HOME: '/',
    DISCOVER: '/discover',
    PROFILE: '/profile',
    UPLOAD: '/upload',
    CREATE_ROOM: '/create-room',
    CONTENT: '/content',
    LIVE_ROOM: '/live-room'
  } as const;
  
  // Storage Keys (for localStorage - though not used in artifacts)
  export const STORAGE_KEYS = {
    WALLET_CONNECTED: 'decentraspace_wallet_connected',
    LAST_CONNECTED_ACCOUNT: 'decentraspace_last_account',
    USER_PREFERENCES: 'decentraspace_preferences',
    THEME: 'decentraspace_theme'
  } as const;
  
  // Social Media & External Links
  export const EXTERNAL_LINKS = {
    ETHEREUM_DOCS: 'https://ethereum.org/en/developers/docs/',
    SEPOLIA_FAUCET: 'https://sepoliafaucet.com/',
    METAMASK_DOWNLOAD: 'https://metamask.io/download/',
    IPFS_DOCS: 'https://docs.ipfs.io/',
    HUDDLE_DOCS: 'https://docs.huddle01.com/'
  } as const;
  
  // Categories for Content/Creators
  export const CATEGORIES = [
    { id: 'general', label: 'General' },
    { id: 'art', label: 'Art & Design' },
    { id: 'music', label: 'Music' },
    { id: 'gaming', label: 'Gaming' },
    { id: 'education', label: 'Education' },
    { id: 'technology', label: 'Technology' },
    { id: 'lifestyle', label: 'Lifestyle' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'cooking', label: 'Cooking' },
    { id: 'travel', label: 'Travel' }
  ] as const;
  
  // Export commonly used values
  export const SEPOLIA_CHAIN_ID = NETWORK_CONFIG.SEPOLIA_CHAIN_ID;
  export const MAX_FILE_SIZE = FILE_LIMITS.MAX_FILE_SIZE;
  export const ALLOWED_FILE_TYPES = FILE_LIMITS.ALLOWED_FILE_TYPES;
  