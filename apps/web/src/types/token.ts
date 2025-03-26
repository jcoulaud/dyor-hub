import { Token as BaseToken } from '@dyor-hub/types';

export interface Token extends BaseToken {
  twitterHistory?: {
    id: string;
    tokenMintAddress: string;
    twitterUsername: string;
    history: Array<{
      last_checked: string;
      username: string;
    }> | null;
    createdAt: Date;
  };
}
