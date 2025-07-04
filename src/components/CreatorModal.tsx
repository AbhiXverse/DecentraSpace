// src/components/CreatorModal.tsx
import React, { useState, useEffect } from 'react';
import { X, User, AlertCircle, Check } from 'lucide-react';
import { useContractIntegration } from '../hooks/useContractIntegration';

interface CreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  onSuccess?: () => void;
}

const CreatorModal: React.FC<CreatorModalProps> = ({ 
  isOpen, 
  onClose, 
  accountId, 
  onSuccess 
}) => {
  const { 
    registerCreator, 
    isCreatorRegistered, 
    isConnected, 
    isLoading: contractLoading,
    error: contractError,
    networkInfo 
  } = useContractIntegration();

  // Form state
  const [formData, setFormData] = useState({
    creatorName: '',
    description: '',
    category: 'general'
  });

  // Component state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);

  // Available categories
  const categories = [
    { value: 'general', label: 'General' },
    { value: 'art', label: 'Art & Design' },
    { value: 'music', label: 'Music' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'education', label: 'Education' },
    { value: 'technology', label: 'Technology' },
    { value: 'lifestyle', label: 'Lifestyle' }
  ];

  // Check if user is already registered when modal opens
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (isOpen && isConnected && accountId) {
        setCheckingRegistration(true);
        try {
          const registered = await isCreatorRegistered(accountId);
          setIsAlreadyRegistered(registered);
        } catch (err) {
          console.error('Failed to check registration status:', err);
        } finally {
          setCheckingRegistration(false);
        }
      }
    };

    checkRegistrationStatus();
  }, [isOpen, isConnected, accountId, isCreatorRegistered]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ creatorName: '', description: '', category: 'general' });
      setError(null);
      setIsAlreadyRegistered(false);
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.creatorName.trim()) {
      setError('Please enter a creator name');
      return;
    }
    if (formData.creatorName.trim().length > 50) {
      setError('Creator name must be 50 characters or less');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please enter a description');
      return;
    }
    if (formData.description.trim().length > 500) {
      setError('Description must be 500 characters or less');
      return;
    }

    // Check wallet connection
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    // Check network
    if (!networkInfo.isCorrectNetwork) {
      setError('Please switch to Sepolia testnet');
      return;
    }

    try {
      setIsLoading(true);

      // Get category label for description
      const categoryLabel = categories.find(cat => cat.value === formData.category)?.label || 'General';
      
      // Create enhanced description with category
      const enhancedDescription = `${formData.description.trim()} | Category: ${categoryLabel}`;

      // Register creator on blockchain
      await registerCreator(formData.creatorName.trim(), enhancedDescription);

      // Success callback
      if (onSuccess) onSuccess();

      // Close modal and reset form
      onClose();
      setFormData({ creatorName: '', description: '', category: 'general' });
      
      // Show success message
      alert('🎉 Creator registration successful! Welcome to DecentraSpace!');

    } catch (err: any) {
      console.error('❌ Error registering creator:', err);
      
      // Handle specific error types
      if (err.message?.includes('already registered') || err.message?.includes('AlreadyRegistered')) {
        setError('You are already registered as a creator');
        setIsAlreadyRegistered(true);
      } else if (err.message?.includes('insufficient')) {
        setError('Insufficient ETH balance to pay gas fees');
      } else if (err.message?.includes('User denied') || err.message?.includes('rejected')) {
        setError('Transaction was rejected by user');
      } else if (err.message?.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Failed to register creator. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-600/50 relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={isLoading}
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Become a Creator</h2>
          <p className="text-gray-400 text-lg">Join DecentraSpace and start earning ETH</p>
        </div>

        {/* Loading Check */}
        {checkingRegistration && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-3">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400" />
            <p className="text-blue-400 text-sm">Checking registration status...</p>
          </div>
        )}

        {/* Already Registered Message */}
        {isAlreadyRegistered && !checkingRegistration && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
            <Check className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-green-400 text-sm font-medium">You're already a creator!</p>
              <p className="text-green-300 text-xs">You can start uploading content and earning ETH.</p>
            </div>
          </div>
        )}

        {/* Error Display */}
        {(error || contractError) && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error || contractError}</p>
          </div>
        )}

        {/* Registration Form */}
        {!isAlreadyRegistered && !checkingRegistration && (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Creator Name */}
            <div>
              <label htmlFor="creatorName" className="block text-white font-medium mb-2">
                Creator Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="creatorName"
                name="creatorName"
                value={formData.creatorName}
                onChange={handleInputChange}
                placeholder="Your creator name"
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                required
                disabled={isLoading}
                maxLength={50}
              />
              <p className="text-gray-400 text-xs mt-1">
                {formData.creatorName.length}/50 characters
              </p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-white font-medium mb-2">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                required
                disabled={isLoading}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <p className="text-gray-400 text-xs mt-1">
                Category will be included in your profile description
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-white font-medium mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Tell us about your content and what you create..."
                rows={4}
                className="w-full bg-slate-700/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-gray-500 resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                required
                disabled={isLoading}
                maxLength={500}
              />
              <p className="text-gray-400 text-xs mt-1">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-4">
              <p className="text-gray-400 text-sm">
                <span className="text-white font-medium">Note:</span> Your profile avatar will be automatically generated based on your wallet address. 
                Custom profile images will be available in a future update.
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isLoading || 
                contractLoading || 
                !formData.creatorName.trim() || 
                !formData.description.trim() ||
                !isConnected ||
                !networkInfo.isCorrectNetwork
              }
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold text-lg flex justify-center items-center gap-2 transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Registering...
                </>
              ) : (
                'Register as Creator'
              )}
            </button>
          </form>
        )}

        {/* Already Registered Action */}
        {isAlreadyRegistered && !checkingRegistration && (
          <div className="space-y-4">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 rounded-xl font-semibold text-lg transition-all duration-200"
            >
              Continue to Dashboard
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-slate-600/50">
          <p className="text-sm text-gray-400 text-center">
            Connected as: <span className="text-purple-400 font-medium">{accountId}</span>
          </p>
          <p className="text-xs text-gray-500 text-center mt-1">
            Network: <span className="text-purple-400">{networkInfo.networkName || 'Unknown'}</span>
          </p>
          <p className="text-xs text-gray-500 text-center mt-1">
            Gas fees will apply for this transaction
          </p>
        </div>
      </div>
    </div>
  );
};

export default CreatorModal;
