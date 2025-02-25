import { UserEntity } from '../../entities/user.entity';

export interface TwitterProfile {
  id: string;
  username: string;
  displayName: string;
  photos?: Array<{ value: string }>;
  _json?: {
    id_str: string;
    name: string;
    screen_name: string;
    location?: string;
    description?: string;
    url?: string;
    verified: boolean;
    profile_image_url?: string;
    profile_image_url_https?: string;
    followers_count?: number;
    friends_count?: number;
    created_at?: string;
    email?: string;
  };
  emails?: Array<{ value: string }>;
  provider: string;
  _raw?: string;
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
  clientId: string;
  clientSecret: string;
  callbackURL: string;
  includeEmail?: boolean;
  userAuthorizationURL?: string;
  // OAuth 2.0 specific fields
  scope: string[];
  state: boolean;
  pkce: boolean;
}

export interface CookieConfig {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  maxAge: number;
  path: string;
  domain?: string;
}
