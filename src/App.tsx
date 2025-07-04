// src/App.tsx
import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Loader2, AlertCircle, Home as HomeIcon, Users, Wallet } from 'lucide-react';
import { useContractIntegration } from './hooks/useContractIntegration';

// Layout Components
import Header from './components/Header';
import Footer from './components/Footer';

// Home Page Components
import Hero from './components/Hero';
import LiveNow from './components/LiveNow';

// Page Components (from pages/)
import ProfilePage from './pages/ProfilePage';
import ContentDetailPage from './pages/ContentDetailPage';
import CreateRoomPage from './pages/CreateRoomPage';

// Feature Components (from components/)
import FeaturedContent from './components/FeaturedContent';
import DiscoverCreators from './components/DiscoverCreators';
import UploadContent from './components/UploadContent';

// ✅ Enhanced Loading Component
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading..." }) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="text-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border border-purple-400 opacity-20"></div>
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">DecentraSpace</h3>
      <p className="text-gray-400">{message}</p>
    </div>
  </div>
);

// ✅ Enhanced Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 Error caught by boundary:', error, errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack || null
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
          <div className="text-center max-w-2xl">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-red-400 mb-4">Oops! Something went wrong</h2>
            <p className="text-gray-400 mb-6 text-lg">
              {this.state.error?.message || 'An unexpected error occurred while loading DecentraSpace'}
            </p>
            
            {/* Error Details (Development) */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="bg-slate-800 rounded-xl p-4 mb-6 text-left">
                <summary className="cursor-pointer text-purple-400 mb-2">Error Details</summary>
                <pre className="text-xs text-gray-300 overflow-auto">
                  {this.state.error?.stack}
                  {this.state.errorInfo}
                </pre>
              </details>
            )}

            <div className="space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ✅ Enhanced 404 Not Found Page
const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 mb-4">
          404
        </div>
        <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
        <p className="text-gray-400 mb-8 text-lg">
          The page you're looking for doesn't exist in the DecentraSpace universe.
        </p>
        <div className="space-y-4">
          <a
            href="/"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200"
          >
            <HomeIcon className="w-5 h-5" />
            Go Home
          </a>
          <br />
          <a
            href="/discover"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 underline transition-colors"
          >
            <Users className="w-4 h-4" />
            Discover Creators
          </a>
        </div>
      </div>
    </div>
  );
};

// ✅ Wallet Connection Guard
const WalletGuard: React.FC<{ 
  children: React.ReactNode;
  requireConnection?: boolean;
  requireNetwork?: boolean;
  fallbackPath?: string;
}> = ({ children, requireConnection = true, requireNetwork = true, fallbackPath = "/" }) => {
  const { isConnected, isLoading, connectWallet, networkInfo, error } = useContractIntegration();

  // Show loading while wallet is connecting
  if (isLoading) {
    return <LoadingSpinner message="Connecting to Ethereum wallet..." />;
  }

  // Show connection required screen
  if (requireConnection && !isConnected) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6 text-lg">
            Please connect your Ethereum wallet to access this feature.
          </p>
          
          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-xl p-4 mb-6">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={connectWallet}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </>
              )}
            </button>
            <a
              href={fallbackPath}
              className="block text-purple-400 hover:text-purple-300 underline transition-colors"
            >
              Continue browsing without wallet
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show network required screen
  if (requireNetwork && isConnected && !networkInfo.isCorrectNetwork) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Wrong Network</h2>
          <p className="text-gray-400 mb-6 text-lg">
            Please switch to Sepolia testnet to use DecentraSpace features.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200"
            >
              Refresh Page
            </button>
            <a
              href={fallbackPath}
              className="block text-purple-400 hover:text-purple-300 underline transition-colors"
            >
              Continue browsing
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// ✅ ScrollToTop Component
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  
  return null;
};

// ✅ Home Page Component
const HomePage: React.FC = () => {
  return (
    <>
      <Hero />
      <LiveNow />
      <FeaturedContent />
      <DiscoverCreators limit={6} />
    </>
  );
};

// ✅ Full Discover Page Component
const DiscoverPage: React.FC = () => {
  return <DiscoverCreators isFullPage={true} />;
};

// ✅ Main App Component
const App: React.FC = () => {
  const { isConnected, isLoading, error: contractError, networkInfo } = useContractIntegration();
  const [appInitialized, setAppInitialized] = useState(false);

  // Monitor app initialization
  useEffect(() => {
    // Simple initialization check
    const timer = setTimeout(() => {
      setAppInitialized(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Show loading spinner during initial app load
  if (!appInitialized && isLoading) {
    return <LoadingSpinner message="Initializing DecentraSpace..." />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-slate-900 text-white flex flex-col">
          <Header />
          <main className="flex-1">
            <Suspense fallback={<LoadingSpinner message="Loading page..." />}>
              <Routes>
                {/* ✅ Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/featured" element={<FeaturedContent />} />
                <Route path="/discover" element={<DiscoverPage />} />
                <Route path="/content/:id" element={<ContentDetailPage />} />
                
                {/* ✅ Live streaming routes (public) */}
                <Route path="/live" element={<LiveNow />} />
                <Route path="/live-now" element={<LiveNow />} />
                
                {/* ✅ Profile routes (flexible - can view others without wallet) */}
                <Route 
                  path="/profile" 
                  element={
                    <WalletGuard requireConnection={true} requireNetwork={true}>
                      <ProfilePage />
                    </WalletGuard>
                  } 
                />
                <Route path="/profile/:creatorId" element={<ProfilePage />} />
                
                {/* ✅ Creator routes (require wallet + network) */}
                <Route 
                  path="/upload" 
                  element={
                    <WalletGuard requireConnection={true} requireNetwork={true} fallbackPath="/discover">
                      <UploadContent />
                    </WalletGuard>
                  } 
                />
                
                <Route 
                  path="/create-room" 
                  element={
                    <WalletGuard requireConnection={true} requireNetwork={true} fallbackPath="/live">
                      <CreateRoomPage />
                    </WalletGuard>
                  } 
                />
                
                {/* ✅ Redirect routes for better UX */}
                <Route path="/creators" element={<DiscoverPage />} />
                <Route path="/browse" element={<DiscoverPage />} />
                <Route path="/videos" element={<FeaturedContent />} />
                
                {/* ✅ 404 catch-all route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
