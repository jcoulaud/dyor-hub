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
  Info,
  Loader2,
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
      setShouldAutoCheck(false); // Don't auto-check when modal opens
    }
  }, [isOpen]);

  // Reset to choose step when wallet disconnects
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
      // Create signature message
      const message = `Sign this message to authenticate with DYOR Hub.\n\nWallet: ${publicKey.toBase58()}`;
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);

      await walletAuth.login({
        walletAddress: publicKey.toBase58(),
        signature: Buffer.from(signature).toString('base64'),
      });

      // Refresh auth state
      await checkAuth(true);
      setStep('wallet-success');

      setTimeout(() => {
        onClose();
      }, 1500);
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
      // Create signature message
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

      // Only include referralCode if there's actually a value
      if (displayedReferralCode && displayedReferralCode.trim()) {
        signupData.referralCode = displayedReferralCode.trim();
      }

      await walletAuth.signup(signupData);

      // Refresh auth state
      await checkAuth(true);
      setStep('wallet-success');

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Username is already taken')) {
        setError('Username is already taken. Please choose a different one.');
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB

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
      // 1. Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // 2. Get presigned URL from backend
      const presignedResponse = await uploads.getSignupPresignedImageUrl({
        filename: file.name,
        contentType: file.type,
        contentLength: file.size,
      });

      // 3. Upload to S3
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

      // 4. Store the S3 URL for later use in signup
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
    console.log('goBack clicked, current step:', step, 'connected:', connected);
    setError(null);
    setShouldAutoCheck(false); // Prevent auto-check when going back

    if (step === 'wallet-profile' || step === 'wallet-verify') {
      // Disconnect wallet when going back from profile/verify step
      if (connected && disconnect) {
        try {
          console.log('Disconnecting wallet...');
          await disconnect();
          console.log('Wallet disconnected successfully');

          // Wait a bit to ensure the disconnect is fully processed
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Failed to disconnect wallet:', error);
        }
      }
      // Go back to wallet connect step
      setStep('wallet-connect');
      setWalletStatus(null);
    } else if (step === 'wallet-connect') {
      // Go back to choose step
      setStep('choose');
      setWalletStatus(null);
    }
  };

  // Auto-check wallet status when connected (but only in wallet-connect step)
  useEffect(() => {
    if (shouldAutoCheck && connected && publicKey && step === 'wallet-connect') {
      checkWalletStatus();
    }
  }, [connected, publicKey, step, shouldAutoCheck]);

  const renderContent = () => {
    switch (step) {
      case 'choose':
        return (
          <div className='space-y-6'>
            {displayedReferralCode && (
              <div className='text-center mb-4'>
                <div className='inline-flex items-center px-4 py-2 rounded-full bg-blue-50 border border-blue-200'>
                  <span className='text-sm text-blue-700 font-medium'>
                    🎁 Referral code: {displayedReferralCode}
                  </span>
                </div>
              </div>
            )}

            <div className='text-center space-y-2'>
              <h2 className='text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent'>
                Welcome to DYOR Hub
              </h2>
              <p className='text-muted-foreground text-sm'>
                Your gateway to smarter crypto research
              </p>
            </div>

            <div className='space-y-4'>
              <Button
                onClick={handleTwitterLogin}
                className='w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl font-semibold relative overflow-hidden group'
                size='lg'>
                <div className='absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000'></div>
                <Twitter className='h-5 w-5 mr-3' />
                Continue with Twitter
              </Button>

              <div className='relative'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-gray-200'></div>
                </div>
                <div className='relative flex justify-center text-xs'>
                  <span className='bg-background px-4 text-muted-foreground font-medium'>or</span>
                </div>
              </div>

              <Button
                onClick={handleWalletAuth}
                variant='outline'
                className='w-full h-12 border-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 rounded-xl font-semibold group'
                size='lg'>
                <WalletIcon className='h-5 w-5 mr-3 text-purple-600 group-hover:text-purple-700' />
                <span className='text-purple-700 group-hover:text-purple-800'>
                  Continue with Wallet
                </span>
              </Button>
            </div>

            <div className='text-center'>
              <p className='text-xs text-muted-foreground'>
                By continuing, you agree to our Terms of Service
              </p>
            </div>
          </div>
        );

      case 'wallet-connect':
        return (
          <div className='space-y-6'>
            <div className='flex items-center gap-3 mb-4'>
              <Button
                variant='ghost'
                size='sm'
                onClick={goBack}
                className='p-2 hover:bg-gray-100 rounded-lg'>
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div>
                <h3 className='text-lg font-semibold'>Connect Your Wallet</h3>
                <p className='text-xs text-muted-foreground'>Step 1 of 3</p>
              </div>
            </div>

            <div className='space-y-4'>
              <div className='text-center space-y-4'>
                <div className='w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center'>
                  <WalletIcon className='h-8 w-8 text-gray-600' />
                </div>
                <div>
                  <h4 className='font-semibold text-lg'>Choose Your Wallet</h4>
                  <p className='text-sm text-muted-foreground'>
                    Connect your Solana wallet to continue
                  </p>
                </div>
              </div>

              <div className='space-y-3'>
                {wallets
                  .filter((wallet) => wallet.readyState === 'Installed')
                  .map((wallet) => (
                    <Button
                      key={wallet.adapter.name}
                      onClick={() => connectWallet(wallet)}
                      variant='outline'
                      className='w-full h-12 justify-start'
                      disabled={loading}>
                      <img
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                        className='w-6 h-6 mr-3'
                      />
                      <span className='flex-1 text-left'>{wallet.adapter.name}</span>
                      <span className='text-xs text-muted-foreground'>Detected</span>
                    </Button>
                  ))}

                {wallets
                  .filter((wallet) => wallet.readyState !== 'Installed')
                  .slice(0, 2)
                  .map((wallet) => (
                    <Button
                      key={wallet.adapter.name}
                      onClick={() => connectWallet(wallet)}
                      variant='outline'
                      className='w-full h-12 justify-start'
                      disabled={loading}>
                      <img
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                        className='w-6 h-6 mr-3'
                      />
                      <span className='flex-1 text-left'>{wallet.adapter.name}</span>
                    </Button>
                  ))}
              </div>

              {loading && (
                <div className='text-center text-sm text-muted-foreground'>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin inline' />
                  Connecting...
                </div>
              )}

              {error && (
                <Alert variant='destructive'>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        );

      case 'wallet-profile':
        return (
          <div className='space-y-6'>
            <div className='flex items-center gap-3 mb-4'>
              <Button
                variant='outline'
                size='sm'
                onClick={goBack}
                className='flex items-center justify-center p-3 border-gray-300 hover:bg-gray-50 rounded-lg min-w-[40px] min-h-[40px]'>
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div className='flex-1'>
                <h3 className='text-lg font-semibold text-gray-900'>Create Your Profile</h3>
                <p className='text-xs text-muted-foreground'>Step 2 of 3</p>
              </div>
            </div>

            <div className='space-y-6'>
              {/* Avatar Upload Section */}
              <div className='text-center space-y-4'>
                <div className='relative inline-block'>
                  <div
                    onClick={!isUploadingAvatar ? triggerFileUpload : undefined}
                    className={`w-24 h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center transition-all duration-200 border-2 border-dashed border-purple-300 hover:border-purple-400 relative ${
                      isUploadingAvatar
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:from-purple-500/30 hover:to-pink-500/30'
                    }`}>
                    {isUploadingAvatar ? (
                      <div className='text-center'>
                        <Loader2 className='h-8 w-8 text-purple-500 mx-auto mb-1 animate-spin' />
                        <p className='text-xs text-purple-600 font-medium'>Uploading...</p>
                      </div>
                    ) : avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt='Avatar preview'
                        className='w-full h-full rounded-full object-cover'
                      />
                    ) : (
                      <div className='text-center'>
                        <Camera className='h-8 w-8 text-purple-500 mx-auto mb-1' />
                        <p className='text-xs text-purple-600 font-medium'>Upload</p>
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

                <div className='space-y-3'>
                  <Alert className='border-blue-200 bg-blue-50'>
                    <Info className='h-4 w-4 text-blue-600' />
                    <AlertDescription className='text-blue-700'>
                      🎉 This wallet is new to DYOR Hub. Let&apos;s create your profile!
                    </AlertDescription>
                  </Alert>
                  <p className='text-xs text-center text-muted-foreground'>
                    Click the camera icon to upload your avatar (max 5MB, JPG/PNG/GIF/WebP)
                  </p>
                </div>
              </div>

              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='username' className='text-sm font-medium text-gray-700'>
                    Username *
                  </Label>
                  <Input
                    id='username'
                    value={profileData.username}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, username: e.target.value }))
                    }
                    placeholder='johndoe'
                    className='h-12'
                  />
                  <p className='text-xs text-muted-foreground'>
                    This will be your unique identifier
                  </p>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='displayName' className='text-sm font-medium text-gray-700'>
                    Display Name *
                  </Label>
                  <Input
                    id='displayName'
                    value={profileData.displayName}
                    onChange={(e) =>
                      setProfileData((prev) => ({ ...prev, displayName: e.target.value }))
                    }
                    placeholder='John Doe'
                    className='h-12'
                  />
                  <p className='text-xs text-muted-foreground'>
                    How your name will appear to others
                  </p>
                </div>
              </div>

              {error && (
                <Alert variant='destructive'>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleWalletSignup}
                className='w-full h-12 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 font-medium rounded-lg'
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
          <div className='space-y-4'>
            <div className='flex items-center gap-3 mb-4'>
              <Button
                variant='outline'
                size='sm'
                onClick={goBack}
                className='flex items-center justify-center p-3 border-gray-300 hover:bg-gray-50 rounded-lg min-w-[40px] min-h-[40px]'>
                <ArrowLeft className='h-4 w-4' />
              </Button>
              <div>
                <h3 className='text-lg font-semibold'>Sign In</h3>
                <p className='text-xs text-muted-foreground'>Step 3 of 3</p>
              </div>
            </div>

            <div className='text-center space-y-4'>
              <div className='w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center'>
                <WalletIcon className='h-8 w-8 text-green-600' />
              </div>

              <Alert>
                <Info className='h-4 w-4' />
                <AlertDescription>
                  This wallet is linked to an existing account. Sign the message to verify ownership
                  and access your account.
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant='destructive'>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className='space-y-3'>
                <Button
                  onClick={handleWalletLogin}
                  className='w-full h-12 bg-blue-600 hover:bg-blue-700 text-white'
                  disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                      Signing In...
                    </>
                  ) : (
                    'Sign In with Wallet'
                  )}
                </Button>
              </div>
            </div>
          </div>
        );

      case 'wallet-success':
        return (
          <div className='text-center space-y-4'>
            <div className='w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center'>
              <span className='text-green-600 text-2xl'>✓</span>
            </div>

            <div className='space-y-1'>
              <h3 className='text-lg font-medium'>Success!</h3>
              <p className='text-sm text-muted-foreground'>
                {walletStatus === 'existing_user'
                  ? 'You have been signed in'
                  : 'Your account has been created'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-md'>
        <DialogHeader className='pb-6'>
          <DialogTitle className='text-center text-xl font-semibold'>
            {step === 'choose' ? 'Sign in to your account' : 'Authentication'}
          </DialogTitle>
          {step === 'choose' && (
            <DialogDescription className='text-center text-sm text-muted-foreground mt-2'>
              Connect with Twitter or your Solana wallet
            </DialogDescription>
          )}
          {step !== 'choose' && (
            <DialogDescription className='text-center text-sm text-muted-foreground'>
              Complete the authentication process
            </DialogDescription>
          )}
        </DialogHeader>

        <div className='pb-6'>{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
}
