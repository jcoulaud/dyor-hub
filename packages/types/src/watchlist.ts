export interface WatchlistFolder {
  id: string;
  name: string;
  position: number;
  folderType: 'token' | 'user';
  userId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface TokenFolderItem {
  id: string;
  folderId: string;
  tokenMintAddress: string;
  position: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface UserFolderItem {
  id: string;
  folderId: string;
  watchedUserId: string;
  position: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}
