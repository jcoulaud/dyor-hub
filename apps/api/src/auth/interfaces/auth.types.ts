import { UserEntity } from '../../entities/user.entity';

export interface TwitterProfile {
  id: string;
  username: string;
  displayName: string;
  photos?: Array<{ value: string }>;
  _json?: {
    verified: boolean;
    profile_image_url?: string;
  };
  emails?: Array<{ value: string }>;
}

export interface TwitterTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  displayName: string;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  user: UserEntity;
  token: string;
}

export interface TwitterAuthConfig {
  consumerKey: string;
  consumerSecret: string;
  callbackURL: string;
  includeEmail: boolean;
  userAuthorizationURL: string;
}

export interface CookieConfig {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}
