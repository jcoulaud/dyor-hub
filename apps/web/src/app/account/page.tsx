'use client';

import { Edit2, Trash2, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { users } from '@/lib/api';
import { isValidSolanaAddress } from '@/lib/utils';
import { useAuthContext } from '@/providers/auth-provider';

type WalletFormProps = {
  walletAddress: string;
  isSaving: boolean;
  onWalletAddressChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
  onCancel: () => void;
};

const WalletForm = ({
  walletAddress,
  isSaving,
  onWalletAddressChange,
  onSave,
  onCancel,
}: WalletFormProps) => (
  <div className='space-y-4'>
    <div className='space-y-2'>
      <Label htmlFor='wallet' className='text-sm font-medium'>
        Solana Wallet Address
      </Label>
      <Input
        id='wallet'
        placeholder='Enter your Solana wallet address'
        value={walletAddress}
        onChange={onWalletAddressChange}
        className='font-mono bg-zinc-900/50 border-zinc-800/50 focus:border-blue-500/50 focus:ring-blue-500/50 transition-colors'
      />
    </div>
    <div className='flex gap-3 justify-end'>
      <Button
        variant='outline'
        onClick={onCancel}
        className='cursor-pointer hover:bg-zinc-800/50 transition-colors'>
        Cancel
      </Button>
      <Button
        onClick={onSave}
        disabled={isSaving}
        className='cursor-pointer bg-blue-500 hover:bg-blue-600 transition-colors'>
        {isSaving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  </div>
);

type WalletDisplayProps = {
  walletAddress: string;
  onEdit: () => void;
  onDelete: () => void;
};

const WalletDisplay = ({ walletAddress, onEdit, onDelete }: WalletDisplayProps) => (
  <div className='group flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-200'>
    <div className='flex items-center gap-3'>
      <div className='p-2 rounded-lg bg-blue-500/10'>
        <Wallet className='h-5 w-5 text-blue-500' />
      </div>
      <div className='font-mono text-sm'>{walletAddress}</div>
    </div>
    <div className='flex items-center gap-2'>
      <Button
        variant='ghost'
        size='icon'
        onClick={onEdit}
        className='h-8 w-8 cursor-pointer hover:bg-zinc-800/50 transition-colors'>
        <Edit2 className='h-4 w-4' />
      </Button>
      <Button
        variant='ghost'
        size='icon'
        onClick={onDelete}
        className='h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer transition-colors'>
        <Trash2 className='h-4 w-4' />
      </Button>
    </div>
  </div>
);

export default function AccountPage() {
  const { user, checkAuth } = useAuthContext();
  const router = useRouter();
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth(true);
      setIsLoading(false);
    };
    initAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user?.walletAddress) {
      setWalletAddress(user.walletAddress);
    }
  }, [user?.walletAddress]);

  const validateSolanaAddress = useCallback((value: string): boolean => {
    if (!value) return true;
    return isValidSolanaAddress(value);
  }, []);

  const handleWalletAddressChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    setWalletAddress(newAddress);
  }, []);

  const handleSaveWallet = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!walletAddress.trim()) {
        toast({
          title: 'Invalid Address',
          description: 'Please enter a wallet address',
          variant: 'destructive',
        });
        return;
      }

      if (walletAddress && !validateSolanaAddress(walletAddress)) {
        toast({
          title: 'Invalid Address',
          description: 'Please enter a valid Solana wallet address',
          variant: 'destructive',
        });
        return;
      }

      setIsSaving(true);
      try {
        await users.updateWalletAddress(walletAddress);
        await checkAuth(true);
        setIsEditing(false);
        toast({
          title: 'Success',
          description: 'Wallet address saved successfully',
        });
      } catch (error) {
        console.error('Failed to save wallet:', error);
        toast({
          title: 'Error',
          description: 'Failed to update wallet address',
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [walletAddress, validateSolanaAddress, toast, checkAuth],
  );

  const handleSaveClick = useCallback(() => {
    handleSaveWallet({ preventDefault: () => {} } as React.FormEvent);
  }, [handleSaveWallet]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setWalletAddress(user?.walletAddress || '');
  }, [user?.walletAddress]);

  const handleRemoveWallet = useCallback(async () => {
    try {
      setIsSaving(true);
      await users.updateWalletAddress('');
      await checkAuth(true);
      setWalletAddress('');
      setShowDeleteDialog(false);
      toast({
        title: 'Success',
        description: 'Wallet address removed',
      });
    } catch (error) {
      console.error('Failed to remove wallet:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove wallet address',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [toast, checkAuth]);

  if (isLoading) {
    return null;
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='max-w-2xl mx-auto'>
        <div className='flex items-center gap-3 mb-8'>
          <h1 className='text-2xl font-bold'>Account</h1>
          <div className='h-px flex-1 bg-zinc-800/50' />
        </div>

        <div className='grid gap-6'>
          <Card className='border-zinc-800/50 bg-zinc-900/50'>
            <CardHeader>
              <CardTitle className='text-xl'>Wallet Integration</CardTitle>
              <CardDescription className='text-zinc-400'>
                Connect your Solana wallet to your profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {isEditing ? (
                  <WalletForm
                    walletAddress={walletAddress}
                    isSaving={isSaving}
                    onWalletAddressChange={handleWalletAddressChange}
                    onSave={handleSaveClick}
                    onCancel={handleCancel}
                  />
                ) : user.walletAddress ? (
                  <WalletDisplay
                    walletAddress={user.walletAddress}
                    onEdit={() => setIsEditing(true)}
                    onDelete={() => setShowDeleteDialog(true)}
                  />
                ) : (
                  <div className='space-y-4'>
                    <div className='space-y-2'>
                      <Label htmlFor='wallet' className='text-sm font-medium'>
                        Solana Wallet Address
                      </Label>
                      <Input
                        id='wallet'
                        placeholder='Enter your Solana wallet address'
                        value={walletAddress}
                        onChange={handleWalletAddressChange}
                        className='font-mono bg-zinc-900/50 border-zinc-800/50 focus:border-blue-500/50 focus:ring-blue-500/50 transition-colors'
                      />
                    </div>
                    <Button
                      onClick={handleSaveClick}
                      disabled={isSaving}
                      className='cursor-pointer bg-blue-500 hover:bg-blue-600 transition-colors'>
                      {isSaving ? 'Saving...' : 'Save Wallet Address'}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className='bg-zinc-900 border-zinc-800/50'>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Wallet Address</AlertDialogTitle>
            <AlertDialogDescription className='text-zinc-400'>
              Are you sure you want to remove your wallet address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className='hover:bg-zinc-800/50 transition-colors'>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveWallet}
              className='bg-red-500 hover:bg-red-600 transition-colors'>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
