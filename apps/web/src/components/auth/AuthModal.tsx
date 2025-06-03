'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { auth, uploads, walletAuth } from '@/lib/api';
import { useAuthContext } from '@/providers/auth-provider';
import { WalletName } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Info,
  Loader2,
  Shield,
  Sparkles,
  Twitter,
  User,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type AuthStep =
  | 'choose'
  | 'wallet-connect'
  | 'wallet-status'
  | 'wallet-profile'
  | 'wallet-verify'
  | 'wallet-success';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { toast } = useToast();
  const { checkAuth } = useAuthContext();
  const { publicKey, signMessage, connected, wallets, select, disconnect } = useWallet();

  const [step, setStep] = useState<AuthStep>('choose');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedReferralCode, setDisplayedReferralCode] = useState<string | null>(null);
  const [shouldAutoCheck, setShouldAutoCheck] = useState(true);

  // Wallet auth state
  const [walletStatus, setWalletStatus] = useState<
    'existing_user' | 'needs_verification' | 'new_wallet' | 'conflict' | null
  >(null);
  const [profileData, setProfileData] = useState({
    username: '',
    displayName: '',
    avatarUrl: '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const codeFromStorage = localStorage.getItem('pendingReferralCode');
      setDisplayedReferralCode(codeFromStorage);
      setStep('choose');
      setError(null);
      setWalletStatus(null);
      setShouldAutoCheck(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (
      !connected &&
      (step === 'wallet-verify' || step === 'wallet-profile' || step === 'wallet-success')
    ) {
      setStep('choose');
      setError(null);
      setWalletStatus(null);
      setShouldAutoCheck(true);
    }
  }, [connected, step]);

  const handleTwitterLogin = async () => {
    try {
      const loginUrl = await auth.getTwitterLoginUrl({
        usePopup: false,
        referralCode: displayedReferralCode,
      });
      window.location.href = loginUrl;
    } catch {
      toast({
        title: 'Error',
        description: 'Could not initiate Twitter login. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleWalletAuth = () => {
    setError(null);
    setWalletStatus(null);
    setStep('wallet-connect');
    setShouldAutoCheck(true);
  };

  const connectWallet = (wallet: {
    adapter: { name: WalletName; icon: string };
    readyState: string;
  }) => {
    try {
      select(wallet.adapter.name);
    } catch {
      setError('Failed to connect wallet. Please try again.');
    }
  };

  const checkWalletStatus = async () => {
    if (!publicKey) return;

    setLoading(true);
    setError(null);

    try {
      const walletAddress = publicKey.toBase58();
      const result = await walletAuth.checkWallet(walletAddress);

      setWalletStatus(result.status);

      if (result.status === 'existing_user') {
        setStep('wallet-verify');
      } else if (result.status === 'new_wallet') {
        setStep('wallet-profile');
      } else if (result.status === 'conflict') {
        setError(result.message || 'This wallet is already linked to another account');
      }
    } catch {
      setError('Failed to check wallet status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletLogin = async () => {
    if (!publicKey || !signMessage) return;

    setLoading(true);
    setError(null);

    try {
      const message = `Sign this message to authenticate with DYOR Hub.\n\nWallet: ${publicKey.toBase58()}`;
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);

      await walletAuth.login({
        walletAddress: publicKey.toBase58(),
        signature: Buffer.from(signature).toString('base64'),
      });

      await checkAuth(true);
      setStep('wallet-success');

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      setError('Failed to sign in with wallet. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalletSignup = async () => {
    if (!publicKey || !signMessage) return;

    if (!profileData.username.trim() || !profileData.displayName.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const message = `Sign this message to authenticate with DYOR Hub.\n\nWallet: ${publicKey.toBase58()}`;
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);

      const signupData: {
        walletAddress: string;
        signature: string;
        username: string;
        displayName: string;
        avatarUrl: string;
        referralCode?: string;
      } = {
        walletAddress: publicKey.toBase58(),
        signature: Buffer.from(signature).toString('base64'),
        username: profileData.username.trim(),
        displayName: profileData.displayName.trim(),
        avatarUrl:
          profileData.avatarUrl ||
          `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.username}`,
      };

      if (displayedReferralCode && displayedReferralCode.trim()) {
        signupData.referralCode = displayedReferralCode.trim();
      }

      await walletAuth.signup(signupData);
      await checkAuth(true);
      setStep('wallet-success');

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Display the actual API error message instead of generic message
      setError(errorMessage || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return;
    }

    if (file.size > maxSizeBytes) {
      setError('File too large. Maximum size: 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      const presignedResponse = await uploads.getSignupPresignedImageUrl({
        filename: file.name,
        contentType: file.type,
        contentLength: file.size,
      });

      const uploadResponse = await fetch(presignedResponse.presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const avatarUrl = `https://${process.env.NEXT_PUBLIC_S3_UPLOAD_BUCKET}.s3.${process.env.NEXT_PUBLIC_AWS_REGION}.amazonaws.com/${presignedResponse.objectKey}`;
      setProfileData((prev) => ({ ...prev, avatarUrl }));

      toast({
        title: 'Avatar uploaded successfully!',
        description: 'Your avatar will be used when you create your account.',
      });
    } catch {
      setError('Failed to upload avatar. Please try again.');
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const goBack = async () => {
    setError(null);
    setShouldAutoCheck(false);

    if (step === 'wallet-profile' || step === 'wallet-verify') {
      if (connected && disconnect) {
        try {
          await disconnect();
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Failed to disconnect wallet:', error);
        }
      }
      setStep('wallet-connect');
      setWalletStatus(null);
    } else if (step === 'wallet-connect') {
      setStep('choose');
      setWalletStatus(null);
    }
  };

  useEffect(() => {
    if (shouldAutoCheck && connected && publicKey && step === 'wallet-connect') {
      checkWalletStatus();
    }
  }, [connected, publicKey, step, shouldAutoCheck]);

  const renderContent = () => {
    switch (step) {
      case 'choose':
        return (
          <div className='space-y-8'>
            {/* Header */}
            <div className='text-center space-y-3'>
              <div className='relative mx-auto w-16 h-16 mb-4'>
                <div className='absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-2xl opacity-20 animate-pulse'></div>
                <div className='relative bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-2xl p-4 flex items-center justify-center'>
                  <Sparkles className='h-8 w-8 text-white' />
                </div>
              </div>

              <div className='space-y-2'>
                <h1 className='text-3xl font-bold tracking-tight text-white'>
                  Welcome to DYOR Hub
                </h1>
                <p className='text-gray-300 text-lg font-medium'>
                  Your gateway to smarter trading decisions
                </p>
              </div>
            </div>

            {/* Referral Code Badge */}
            {displayedReferralCode && (
              <div className='flex justify-center'>
                <div className='inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-400/30'>
                  <div className='w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse'></div>
                  <span className='text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent'>
                    Referral: {displayedReferralCode}
                  </span>
                </div>
              </div>
            )}

            {/* Auth Options */}
            <div className='space-y-4'>
              {/* Twitter Login */}
              <Button
                onClick={handleTwitterLogin}
                className='w-full h-14 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl font-semibold text-base border border-[#1DA1F2] hover:border-[#1a8cd8]'
                size='lg'>
                <div className='flex items-center justify-center space-x-3'>
                  <Twitter className='h-5 w-5' />
                  <span>Continue with Twitter</span>
                </div>
              </Button>

              {/* Divider */}
              <div className='relative py-2'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-gray-600'></div>
                </div>
                <div className='relative flex justify-center'>
                  <span className='bg-gray-900 px-4 text-sm font-medium text-gray-400'>or</span>
                </div>
              </div>

              {/* Wallet Auth */}
              <Button
                onClick={handleWalletAuth}
                variant='outline'
                className='group w-full h-14 border-2 border-gray-600 hover:border-purple-400 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 transition-all duration-300 rounded-2xl font-semibold text-base bg-gray-800/50'
                size='lg'>
                <div className='flex items-center justify-center space-x-3'>
                  <div className='relative'>
                    <WalletIcon className='h-5 w-5 text-gray-300 group-hover:text-purple-400 transition-colors duration-300' />
                    <div className='absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300'></div>
                  </div>
                  <span className='text-gray-200 group-hover:text-purple-300 transition-colors duration-300'>
                    Continue with Wallet
                  </span>
                </div>
              </Button>
            </div>
          </div>
        );

      case 'wallet-connect':
        return (
          <div className='space-y-6'>
            {/* Header with Back Button */}
            <div className='flex items-center space-x-4'>
              <Button
                variant='ghost'
                size='sm'
                onClick={goBack}
                className='p-2 hover:bg-gray-700 rounded-xl transition-colors text-gray-300'>
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div className='flex-1'>
                <h2 className='text-xl font-bold text-white'>Connect Wallet</h2>
                <p className='text-sm text-gray-400 mt-1'>Choose your Solana wallet</p>
              </div>
            </div>

            {/* Main Content */}
            <div className='space-y-6'>
              {/* Wallet List */}
              <div className='space-y-3'>
                {/* Installed Wallets */}
                {wallets
                  .filter((wallet) => wallet.readyState === 'Installed')
                  .map((wallet) => (
                    <Button
                      key={wallet.adapter.name}
                      onClick={() => connectWallet(wallet)}
                      variant='outline'
                      className='group w-full h-16 border-2 border-gray-600 hover:border-purple-400 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-pink-500/10 transition-all duration-300 rounded-2xl justify-start p-4 bg-gray-800/50'
                      disabled={loading}>
                      <div className='flex items-center space-x-4 w-full'>
                        <div className='relative'>
                          <img
                            src={wallet.adapter.icon}
                            alt={wallet.adapter.name}
                            className='w-8 h-8 rounded-lg'
                          />
                          <div className='absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800'></div>
                        </div>
                        <div className='flex-1 text-left'>
                          <p className='font-semibold text-white group-hover:text-purple-300 transition-colors'>
                            {wallet.adapter.name}
                          </p>
                          <p className='text-xs text-green-400 font-medium'>Detected</p>
                        </div>
                        <div className='w-2 h-2 bg-purple-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'></div>
                      </div>
                    </Button>
                  ))}

                {/* Available Wallets */}
                {wallets
                  .filter((wallet) => wallet.readyState !== 'Installed')
                  .slice(0, 2)
                  .map((wallet) => (
                    <Button
                      key={wallet.adapter.name}
                      onClick={() => connectWallet(wallet)}
                      variant='outline'
                      className='group w-full h-16 border-2 border-gray-700 hover:border-gray-600 hover:bg-gray-800/30 transition-all duration-300 rounded-2xl justify-start p-4 bg-gray-800/20'
                      disabled={loading}>
                      <div className='flex items-center space-x-4 w-full'>
                        <img
                          src={wallet.adapter.icon}
                          alt={wallet.adapter.name}
                          className='w-8 h-8 rounded-lg opacity-60 group-hover:opacity-80 transition-opacity'
                        />
                        <div className='flex-1 text-left'>
                          <p className='font-semibold text-gray-300 group-hover:text-gray-200 transition-colors'>
                            {wallet.adapter.name}
                          </p>
                          <p className='text-xs text-gray-500'>Install to use</p>
                        </div>
                      </div>
                    </Button>
                  ))}
              </div>

              {/* Loading State */}
              {loading && (
                <div className='text-center py-4'>
                  <div className='inline-flex items-center space-x-2 text-gray-300'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span className='text-sm font-medium'>Connecting...</span>
                  </div>
                </div>
              )}

              {/* Error State */}
              {error && (
                <Alert variant='destructive' className='rounded-xl border-red-500/50 bg-red-500/10'>
                  <AlertDescription className='text-red-400'>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );

      case 'wallet-profile':
        return (
          <div className='space-y-6'>
            {/* Header */}
            <div className='flex items-center space-x-4'>
              <Button
                variant='ghost'
                size='sm'
                onClick={goBack}
                className='p-2 hover:bg-gray-700 rounded-xl transition-colors text-gray-300'>
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div className='flex-1'>
                <h2 className='text-xl font-bold text-white'>Create Profile</h2>
                <p className='text-sm text-gray-400 mt-1'>Set up your account details</p>
              </div>
            </div>

            {/* Content */}
            <div className='space-y-8'>
              {/* Avatar Upload */}
              <div className='text-center space-y-4'>
                <div className='relative inline-block'>
                  <div
                    onClick={!isUploadingAvatar ? triggerFileUpload : undefined}
                    className={`relative w-28 h-28 rounded-3xl cursor-pointer group transition-all duration-300 ${
                      isUploadingAvatar ? 'cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'
                    }`}>
                    {isUploadingAvatar ? (
                      <div className='w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center border border-purple-500/30'>
                        <div className='text-center space-y-2'>
                          <Loader2 className='h-6 w-6 text-purple-400 mx-auto animate-spin' />
                          <p className='text-xs text-purple-400 font-medium'>Uploading...</p>
                        </div>
                      </div>
                    ) : avatarPreview ? (
                      <div className='relative w-full h-full'>
                        <img
                          src={avatarPreview}
                          alt='Avatar preview'
                          className='w-full h-full rounded-3xl object-cover'
                        />
                        <div className='absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-3xl transition-colors duration-300 flex items-center justify-center'>
                          <Camera className='h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
                        </div>
                      </div>
                    ) : (
                      <div className='w-full h-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center border-2 border-dashed border-purple-400/50 group-hover:border-purple-400 transition-colors duration-300'>
                        <div className='text-center space-y-1'>
                          <Camera className='h-6 w-6 text-purple-400 mx-auto group-hover:text-purple-300 transition-colors duration-300' />
                          <p className='text-xs text-purple-400 font-medium'>Add Photo</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <input
                  type='file'
                  ref={fileInputRef}
                  onChange={handleAvatarUpload}
                  accept='image/*'
                  className='hidden'
                />

                <p className='text-xs text-gray-400 max-w-xs mx-auto'>
                  Upload your avatar (max 5MB, JPG/PNG/WebP)
                </p>
              </div>

              {/* Form Fields */}
              <div className='space-y-6'>
                <div className='space-y-3'>
                  <Label htmlFor='username' className='text-sm font-semibold text-gray-200'>
                    Username
                  </Label>
                  <Input
                    id='username'
                    value={profileData.username}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, username: e.target.value }))
                    }
                    placeholder='johndoe'
                    className='h-12 rounded-xl border-2 border-gray-600 bg-gray-800/50 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/30 transition-colors'
                  />
                  <p className='text-xs text-gray-400'>Your unique identifier</p>
                </div>

                <div className='space-y-3'>
                  <Label htmlFor='displayName' className='text-sm font-semibold text-gray-200'>
                    Display Name
                  </Label>
                  <Input
                    id='displayName'
                    value={profileData.displayName}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, displayName: e.target.value }))
                    }
                    placeholder='John Doe'
                    className='h-12 rounded-xl border-2 border-gray-600 bg-gray-800/50 text-white placeholder:text-gray-400 focus:border-purple-400 focus:ring-purple-400/30 transition-colors'
                  />
                  <p className='text-xs text-gray-400'>How others will see your name</p>
                </div>
              </div>

              {/* Error */}
              {error && (
                <Alert variant='destructive' className='rounded-xl border-red-500/50 bg-red-500/10'>
                  <AlertDescription className='text-red-400'>{error}</AlertDescription>
                </Alert>
              )}

              {/* Create Button */}
              <Button
                onClick={handleWalletSignup}
                className='w-full h-14 bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl font-semibold text-base border border-purple-600 hover:border-purple-700'
                disabled={
                  loading ||
                  isUploadingAvatar ||
                  !profileData.username.trim() ||
                  !profileData.displayName.trim()
                }
                size='lg'>
                {loading ? (
                  <div className='flex items-center justify-center space-x-2'>
                    <Loader2 className='h-5 w-5 animate-spin' />
                    <span>Creating Account...</span>
                  </div>
                ) : (
                  <div className='flex items-center justify-center space-x-2'>
                    <User className='h-5 w-5' />
                    <span>Create Account</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        );

      case 'wallet-verify':
        return (
          <div className='space-y-6'>
            {/* Header */}
            <div className='flex items-center space-x-4'>
              <Button
                variant='ghost'
                size='sm'
                onClick={goBack}
                className='p-2 hover:bg-gray-700 rounded-xl transition-colors text-gray-300'>
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div className='flex-1'>
                <h2 className='text-xl font-bold text-white'>Verify Wallet</h2>
                <p className='text-sm text-gray-400 mt-1'>Confirm wallet ownership</p>
              </div>
            </div>

            {/* Content */}
            <div className='space-y-6'>
              <div className='text-center space-y-4'>
                <div className='relative mx-auto w-20 h-20'>
                  <div className='absolute inset-0 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-3xl animate-pulse'></div>
                  <div className='relative bg-gradient-to-br from-green-500/30 to-blue-500/30 rounded-3xl p-5 flex items-center justify-center border border-green-500/30'>
                    <Shield className='h-10 w-10 text-green-400' />
                  </div>
                </div>

                <div className='space-y-2'>
                  <h3 className='text-lg font-semibold text-white'>Welcome Back!</h3>
                  <p className='text-gray-300'>Sign the message to verify your wallet ownership</p>
                </div>
              </div>

              <div className='p-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-2xl border border-green-500/30'>
                <div className='flex items-start space-x-3'>
                  <Info className='h-5 w-5 text-green-400 mt-0.5 flex-shrink-0' />
                  <div className='text-sm text-green-300'>
                    <p className='font-medium'>Wallet Found</p>
                    <p>This wallet is linked to an existing account. Verify to continue.</p>
                  </div>
                </div>
              </div>

              {error && (
                <Alert variant='destructive' className='rounded-xl border-red-500/50 bg-red-500/10'>
                  <AlertDescription className='text-red-400'>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleWalletLogin}
                className='w-full h-14 bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl font-semibold text-base border border-green-600 hover:border-green-700'
                disabled={loading}>
                {loading ? (
                  <div className='flex items-center justify-center space-x-2'>
                    <Loader2 className='h-5 w-5 animate-spin' />
                    <span>Signing In...</span>
                  </div>
                ) : (
                  <div className='flex items-center justify-center space-x-2'>
                    <Shield className='h-5 w-5' />
                    <span>Verify & Sign In</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        );

      case 'wallet-success':
        return (
          <div className='text-center space-y-6 py-8'>
            <div className='relative mx-auto w-24 h-24'>
              <div className='absolute inset-0 bg-gradient-to-br from-green-500/30 to-emerald-500/30 rounded-full animate-ping'></div>
              <div className='relative bg-gradient-to-br from-green-500 to-emerald-500 rounded-full p-6 flex items-center justify-center'>
                <CheckCircle2 className='h-12 w-12 text-white' />
              </div>
            </div>

            <div className='space-y-3'>
              <h2 className='text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'>
                {walletStatus === 'existing_user' ? 'Welcome Back!' : 'Account Created!'}
              </h2>
              <p className='text-gray-300 text-lg'>
                {walletStatus === 'existing_user'
                  ? 'You have been successfully signed in'
                  : 'Your account has been created successfully'}
              </p>
            </div>

            <div className='pt-4'>
              <div className='inline-flex items-center space-x-2 text-green-400'>
                <div className='w-2 h-2 bg-green-500 rounded-full animate-pulse'></div>
                <span className='text-sm font-medium'>Redirecting...</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-md border-0 shadow-2xl rounded-3xl p-0 overflow-hidden bg-gray-900'>
        <div className='bg-gray-900 p-2'>
          <DialogHeader className='sr-only'>
            <DialogTitle>Authentication</DialogTitle>
            <DialogDescription>Complete the authentication process</DialogDescription>
          </DialogHeader>

          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
