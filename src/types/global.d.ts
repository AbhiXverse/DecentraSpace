// Global type declarations for the project

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (args: any) => void) => void;
      removeListener: (event: string, handler: (args: any) => void) => void;
    };
  }
}

// MetaMask specific types
export interface MetaMaskError {
  code: number;
  message: string;
  data?: any;
}

// Common blockchain types
export interface TransactionResponse {
  hash: string;
  wait: () => Promise<any>;
}

export interface NetworkInfo {
  chainId: string;
  chainName: string;
  rpcUrls: string[];
  blockExplorerUrls: string[];
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export {};