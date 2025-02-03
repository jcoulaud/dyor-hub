export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isAdmin: boolean;
}

export interface UserProfile extends User {
  twitterId?: string;
  twitterAccessToken?: string;
  twitterRefreshToken?: string;
}
