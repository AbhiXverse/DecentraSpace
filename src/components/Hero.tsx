// src/components/Hero.tsx
import React from 'react';
import { Wallet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useContractIntegration } from '../hooks/useContractIntegration';

const Hero: React.FC = () => {
  const { 
    isConnected, 
    isLoading, 
    connectWallet, 
    accountId, 
    networkInfo,
    error 
  } = useContractIntegration();

  const handleConnectWallet = async () => {
    try {
      if (!isConnected) {
        await connectWallet();
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden"
    >
      {/* Background glowing orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>

      {/* Hero Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="text-center lg:text-left">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
            Empowering Creators
            <br />
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Through Web3
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto lg:mx-0 leading-relaxed">
            Join the decentralized creator economy. Stream live, share content, and earn ETH directly from your audience on Ethereum.
          </p>

          {/* Connection Status & Actions */}
          <div className="flex flex-col items-center lg:items-start space-y-6">
            
            {/* Wallet Connection Status */}
            {isConnected && accountId && (
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 max-w-md w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Wallet Connected</p>
                      <p className="text-gray-400 text-sm font-mono">
                        {accountId.slice(0, 6)}...{accountId.slice(-4)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${networkInfo.isCorrectNetwork ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span className="text-xs text-gray-400">
                      {networkInfo.isCorrectNetwork ? 'Sepolia' : 'Wrong Network'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 max-w-md w-full">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {!isConnected ? (
                <button
                  onClick={handleConnectWallet}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-full transition-all duration-200 font-semibold text-lg flex items-center justify-center space-x-2 transform hover:scale-105 shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Wallet className="w-5 h-5" />
                      <span>Connect Wallet</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => window.location.href = '/profile'}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-full transition-all duration-200 font-semibold text-lg flex items-center justify-center space-x-2 transform hover:scale-105 shadow-lg"
                  >
                    <span>View Profile</span>
                  </button>
                  <button
                    onClick={() => window.location.href = '/discover'}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-8 py-4 rounded-full transition-all duration-200 font-semibold text-lg flex items-center justify-center space-x-2 transform hover:scale-105"
                  >
                    <span>Discover Creators</span>
                  </button>
                </div>
              )}
            </div>

            {/* Network Warning */}
            {isConnected && !networkInfo.isCorrectNetwork && (
              <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl p-4 max-w-md w-full">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                  <div>
                    <p className="text-yellow-300 font-medium">Wrong Network</p>
                    <p className="text-yellow-200 text-sm">Please switch to Sepolia testnet to use DecentraSpace</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto lg:mx-0">
            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:bg-slate-800/50 transition-all duration-200">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Wallet className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Earn ETH</h3>
              <p className="text-gray-400 text-sm">Receive tips and payments directly to your wallet in ETH</p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:bg-slate-800/50 transition-all duration-200">
              <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Decentralized</h3>
              <p className="text-gray-400 text-sm">Your content is stored on IPFS, ensuring permanent availability</p>
            </div>

            <div className="bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:bg-slate-800/50 transition-all duration-200">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-white font-semibold mb-2">Live Streaming</h3>
              <p className="text-gray-400 text-sm">Stream live content and interact with your audience in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
