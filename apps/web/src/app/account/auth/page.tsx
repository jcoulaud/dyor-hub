'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { auth, walletAuth } from '@/lib/api';
import { CheckCircle2, Loader2, Shield, Trash2, Twitter, Wallet } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface AuthMethod {
  id: string;
  provider: string;
  providerId: string;
  isPrimary: boolean;
  createdAt: string;
}

export default function AuthenticationPage() {
  const [authMethods, setAuthMethods] = useState<AuthMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinkingTwitter, setIsLinkingTwitter] = useState(false);
  const [removingMethodId, setRemovingMethodId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAuthMethods = useCallback(async () => {
    try {
      setIsLoading(true);
      const methods = await walletAuth.getUserAuthMethods();
      setAuthMethods(methods);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load authentication methods',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAuthMethods();
  }, [fetchAuthMethods]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const twitterLinkSuccess = params.get('twitter_link_success');
    const twitterLinkError = params.get('twitter_link_error');

    if (twitterLinkSuccess) {
      toast({
        title: 'Success!',
        description: 'Twitter account linked successfully',
      });
      fetchAuthMethods();

      window.history.replaceState({}, '', '/account/auth');
    }

    if (twitterLinkError) {
      toast({
        title: 'Linking Failed',
        description: decodeURIComponent(twitterLinkError),
        variant: 'destructive',
      });

      window.history.replaceState({}, '', '/account/auth');
    }
  }, [toast, fetchAuthMethods]);

  const handleLinkTwitter = async () => {
    try {
      setIsLinkingTwitter(true);
      await auth.twitterLink();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to start Twitter linking process',
        variant: 'destructive',
      });
      setIsLinkingTwitter(false);
    }
  };

  const handleRemoveAuthMethod = async (authMethodId: string) => {
    // Prevent removing the only auth method
    if (authMethods.length <= 1) {
      toast({
        title: 'Cannot Remove',
        description: 'You must have at least one authentication method to sign in.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setRemovingMethodId(authMethodId);
      const result = await walletAuth.removeAuthMethod(authMethodId);

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
        // Refresh the auth methods list
        await fetchAuthMethods();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to remove authentication method',
        variant: 'destructive',
      });
    } finally {
      setRemovingMethodId(null);
    }
  };

  const formatProvider = (provider: string) => {
    switch (provider) {
      case 'twitter':
        return 'Twitter';
      case 'wallet':
        return 'Wallet';
      default:
        return provider;
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'twitter':
        return <Twitter className='h-5 w-5 text-[#1DA1F2]' />;
      case 'wallet':
        return <Wallet className='h-5 w-5 text-purple-500' />;
      default:
        return <Shield className='h-5 w-5 text-gray-500' />;
    }
  };

  const truncateProviderId = (provider: string, providerId: string) => {
    if (provider === 'wallet' && providerId.length > 20) {
      return `${providerId.slice(0, 8)}...${providerId.slice(-8)}`;
    }
    return providerId;
  };

  const hasTwitter = authMethods.some((method) => method.provider === 'twitter');

  if (isLoading) {
    return (
      <div className='flex justify-center items-center py-12'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    );
  }

  return (
    <div className='space-y-8'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-2xl font-bold'>Authentication Methods</h2>
        <Badge variant='outline' className='px-3'>
          <Shield className='h-3 w-3 mr-1' />
          <span className='text-xs'>Security</span>
        </Badge>
      </div>

      {/* Linked Authentication Methods */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <CheckCircle2 className='h-5 w-5 text-green-500' />
            Linked Accounts
          </CardTitle>
          <CardDescription>Authentication methods currently linked to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {authMethods.length === 0 ? (
            <p className='text-muted-foreground text-center py-4'>
              No authentication methods found
            </p>
          ) : (
            <div className='space-y-3'>
              {authMethods.map((method) => (
                <div
                  key={method.id}
                  className='flex items-center justify-between p-4 border rounded-lg'>
                  <div className='flex items-center gap-3'>
                    {getProviderIcon(method.provider)}
                    <div>
                      <p className='font-medium'>
                        {formatProvider(method.provider)}
                        {method.isPrimary && (
                          <Badge variant='secondary' className='ml-2 text-xs'>
                            Primary
                          </Badge>
                        )}
                      </p>
                      <p className='text-sm text-muted-foreground'>
                        {truncateProviderId(method.provider, method.providerId)}
                      </p>
                    </div>
                  </div>
                  <div className='flex items-center gap-3'>
                    <p className='text-xs text-muted-foreground'>
                      Linked {new Date(method.createdAt).toLocaleDateString()}
                    </p>
                    {authMethods.length > 1 && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => handleRemoveAuthMethod(method.id)}
                        disabled={removingMethodId === method.id}
                        className='text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200'>
                        {removingMethodId === method.id ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Trash2 className='h-4 w-4' />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Twitter Account */}
      {!hasTwitter && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Twitter className='h-5 w-5 text-[#1DA1F2]' />
              Link Twitter Account
            </CardTitle>
            <CardDescription>
              Connect your Twitter account to enable Twitter authentication and enhance your profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='p-4 bg-muted/50 rounded-lg'>
                <h4 className='font-medium mb-2'>Benefits of linking Twitter:</h4>
                <ul className='text-sm text-muted-foreground space-y-1'>
                  <li>• Sign in with either wallet or Twitter</li>
                  <li>• Display Twitter verification on your profile</li>
                </ul>
              </div>

              <Button
                onClick={handleLinkTwitter}
                disabled={isLinkingTwitter}
                className='w-full bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white'>
                {isLinkingTwitter ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Twitter className='h-4 w-4 mr-2' />
                    Link Twitter Account
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <Card className='border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-yellow-800 dark:text-yellow-200'>
            <Shield className='h-5 w-5' />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-yellow-700 dark:text-yellow-300'>
            Your authentication methods allow you to sign in to your account. Make sure to keep your
            wallet secure and use strong passwords for linked social accounts.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
