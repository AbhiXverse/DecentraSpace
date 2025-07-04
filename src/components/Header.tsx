// src/components/Header.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Video, 
  Upload, 
  User, 
  Wallet, 
  LogOut, 
  Home, 
  Users, 
  Loader2, 
  PlusCircle,
  Menu,
  X,
  Star,
  AlertCircle
} from 'lucide-react';
import { useContractIntegration } from '../hooks/useContractIntegration';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { 
    isConnected,
    accountId,
    isLoading,
    connectWallet,
    disconnectWallet,
    isCreatorRegistered,
    networkInfo,
    error: contractError
  } = useContractIntegration();
  
  // Component state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [checkingCreator, setCheckingCreator] = useState(false);

  // Check creator status when wallet connects
  useEffect(() => {
    const checkCreatorStatus = async () => {
      if (!isConnected || !accountId) {
        setIsCreator(null);
        return;
      }

      try {
        setCheckingCreator(true);
        const registered = await isCreatorRegistered(accountId);
        setIsCreator(registered);
      } catch (error) {
        console.error('Failed to check creator status:', error);
        setIsCreator(false);
      } finally {
        setCheckingCreator(false);
      }
    };

    checkCreatorStatus();
  }, [isConnected, accountId, isCreatorRegistered]);

  // Handle wallet connection
  const handleWalletConnect = async () => {
    try {
      if (isConnected) {
        await disconnectWallet();
      } else {
        await connectWallet();
      }
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  };

  // Format account ID for display
  const formatAccountId = (id: string) => {
    if (id.length <= 20) return id;
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  };

  // Handle navigation with proper protection
  const handleNavigation = (path: string) => {
    // Close mobile menu
    setMobileMenuOpen(false);

    // Routes that require wallet connection
    const walletRequiredRoutes = ['/upload', '/profile', '/create-room'];
    
    // Routes that require creator registration
    const creatorRequiredRoutes = ['/upload', '/create-room'];

    if (walletRequiredRoutes.includes(path) && !isConnected) {
      alert('❌ Please connect your wallet first');
      return;
    }

    if (!networkInfo.isCorrectNetwork && isConnected) {
      alert('❌ Please switch to Sepolia testnet');
      return;
    }

    // For creator-required routes, redirect to profile if not registered
    if (creatorRequiredRoutes.includes(path) && isConnected && isCreator === false) {
      alert('ℹ️ You need to register as a creator first');
      navigate('/profile'); // ProfilePage will show registration form
      return;
    }

    navigate(path);
  };

  // Navigation items configuration
  const navItems = [
    { 
      path: '/', 
      label: 'Home', 
      icon: Home,
      requiresWallet: false,
      requiresCreator: false
    },
    { 
      path: '/discover', 
      label: 'Discover', 
      icon: Users,
      requiresWallet: false,
      requiresCreator: false
    },
    { 
      path: '/create-room', 
      label: 'Live Room', 
      icon: PlusCircle,
      requiresWallet: true,
      requiresCreator: true
    },
    { 
      path: '/upload', 
      label: 'Upload', 
      icon: Upload,
      requiresWallet: true,
      requiresCreator: true
    },
    { 
      path: '/profile', 
      label: 'Profile', 
      icon: User,
      requiresWallet: true,
      requiresCreator: false
    },
  ];

  // Get navigation item status
  const getNavItemStatus = (item: typeof navItems[0]) => {
    if (item.requiresWallet && !isConnected) {
      return 'disabled';
    }
    if (!networkInfo.isCorrectNetwork && isConnected) {
      return 'network-error';
    }
    if (item.requiresCreator && isConnected && isCreator === false) {
      return 'needs-registration';
    }
    return 'enabled';
  };

  // Render navigation button
  const renderNavButton = (item: typeof navItems[0], isMobile = false) => {
    const isActive = location.pathname === item.path;
    const status = getNavItemStatus(item);
    const Icon = item.icon;

    const baseClasses = `
      ${isMobile ? 'w-full justify-start px-4 py-3' : 'px-4 py-2'} 
      rounded-lg transition-all duration-200 font-medium flex items-center space-x-2
    `;

    const statusClasses = 
      isActive
        ? 'bg-purple-600 text-white shadow-lg'
        : status === 'disabled'
          ? 'text-gray-500 cursor-not-allowed opacity-50'
          : status === 'network-error'
            ? 'text-red-400 hover:text-red-300 hover:bg-slate-800'
            : status === 'needs-registration'
              ? 'text-yellow-400 hover:text-yellow-300 hover:bg-slate-800'
              : 'text-gray-300 hover:text-white hover:bg-slate-800';

    return (
      <button
        key={item.path}
        onClick={() => handleNavigation(item.path)}
        disabled={status === 'disabled'}
        className={`${baseClasses} ${statusClasses}`}
        title={
          status === 'disabled' 
            ? 'Connect wallet required'
            : status === 'network-error'
              ? 'Switch to Sepolia testnet'
              : status === 'needs-registration'
                ? 'Creator registration required'
                : undefined
        }
      >
        <Icon className="w-4 h-4" />
        <span>{item.label}</span>
        {status === 'needs-registration' && (
          <span className="text-xs bg-yellow-400/20 text-yellow-300 px-1 rounded">!</span>
        )}
        {status === 'network-error' && (
          <AlertCircle className="w-3 h-3 text-red-400" />
        )}
      </button>
    );
  };

  return (
    <>
      <header className="bg-slate-900/95 backdrop-blur-sm border-b border-purple-500/20 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <div
              className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleNavigation('/')}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">DecentraSpace</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map(item => renderNavButton(item))}
            </nav>

            {/* Desktop Wallet Section */}
            <div className="hidden md:flex items-center space-x-3">
              
              {/* Network Status */}
              {isConnected && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${networkInfo.isCorrectNetwork ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-xs text-gray-400">
                    {networkInfo.isCorrectNetwork ? 'Sepolia' : 'Wrong Network'}
                  </span>
                </div>
              )}

              {/* Creator Status Indicator */}
              {isConnected && accountId && (
                <div className="flex items-center space-x-2">
                  {checkingCreator ? (
                    <div className="text-gray-400 text-sm flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Checking...</span>
                    </div>
                  ) : isCreator ? (
                    <div className="text-green-400 text-sm flex items-center gap-1" title="Registered Creator">
                      <Star className="w-3 h-3" />
                      <span className="hidden lg:inline">Creator</span>
                    </div>
                  ) : (
                    <div className="text-yellow-400 text-sm flex items-center gap-1" title="Not registered as creator">
                      <User className="w-3 h-3" />
                      <span className="hidden lg:inline">User</span>
                    </div>
                  )}
                </div>
              )}

              {/* Account Button */}
              {isConnected && accountId && (
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="text-gray-300 px-4 py-2 rounded-lg bg-slate-800 font-medium flex items-center space-x-2 hover:bg-slate-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{formatAccountId(accountId)}</span>
                  <span className="sm:hidden">Profile</span>
                </button>
              )}

              {/* Wallet Connect/Disconnect Button */}
              <button
                onClick={handleWalletConnect}
                disabled={isLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-full transition-all duration-200 font-medium flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : isConnected ? (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Disconnect</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center space-x-2">
              
              {/* Mobile Network Status */}
              {isConnected && (
                <div className={`w-2 h-2 rounded-full ${networkInfo.isCorrectNetwork ? 'bg-green-400' : 'bg-red-400'}`} 
                     title={networkInfo.isCorrectNetwork ? 'Sepolia Network' : 'Wrong Network'}
                />
              )}

              {/* Mobile Creator Status */}
              {isConnected && accountId && !checkingCreator && (
                <div className={`w-2 h-2 rounded-full ${isCreator ? 'bg-green-400' : 'bg-yellow-400'}`} 
                     title={isCreator ? 'Registered Creator' : 'User (not creator)'}
                />
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-0 right-0 w-80 max-w-[90vw] h-full bg-slate-900 border-l border-slate-700 shadow-xl" onClick={(e) => e.stopPropagation()}>
            
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Menu</h3>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Navigation */}
            <nav className="p-4 space-y-2">
              {navItems.map(item => renderNavButton(item, true))}
            </nav>

            {/* Mobile Account Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 space-y-3">
              
              {/* Network Status */}
              {isConnected && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Network:</span>
                  <div className={`text-sm flex items-center gap-1 ${networkInfo.isCorrectNetwork ? 'text-green-400' : 'text-red-400'}`}>
                    <div className={`w-2 h-2 rounded-full ${networkInfo.isCorrectNetwork ? 'bg-green-400' : 'bg-red-400'}`} />
                    <span>{networkInfo.isCorrectNetwork ? 'Sepolia' : 'Wrong Network'}</span>
                  </div>
                </div>
              )}

              {/* Creator Status */}
              {isConnected && accountId && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Status:</span>
                  {checkingCreator ? (
                    <div className="text-gray-400 text-sm flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Checking...</span>
                    </div>
                  ) : (
                    <div className={`text-sm flex items-center gap-1 ${isCreator ? 'text-green-400' : 'text-yellow-400'}`}>
                      {isCreator ? <Star className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      <span>{isCreator ? 'Creator' : 'User'}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Account Info */}
              {isConnected && accountId && (
                <button
                  onClick={() => handleNavigation('/profile')}
                  className="w-full text-left text-gray-300 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{formatAccountId(accountId)}</span>
                  </div>
                </button>
              )}

              {/* Wallet Button */}
              <button
                onClick={handleWalletConnect}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-all duration-200 font-medium flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : isConnected ? (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Disconnect Wallet</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    <span>Connect Wallet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
