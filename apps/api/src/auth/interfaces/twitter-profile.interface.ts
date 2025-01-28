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
