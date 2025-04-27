import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  DYORHUB_CONTRACT_ADDRESS,
  MIN_TOKEN_HOLDING_FOR_FOLDERS,
} from '../common/constants';
import { TokenWatchlistFolderItemEntity } from '../entities/token-watchlist-folder-item.entity';
import { TokenEntity } from '../entities/token.entity';
import { UserWatchlistFolderItemEntity } from '../entities/user-watchlist-folder-item.entity';
import { UserEntity } from '../entities/user.entity';
import { WatchlistFolderEntity } from '../entities/watchlist-folder.entity';
import { WalletsService } from '../wallets/wallets.service';

@Injectable()
export class WatchlistFolderService {
  private readonly logger = new Logger(WatchlistFolderService.name);

  constructor(
    @InjectRepository(WatchlistFolderEntity)
    private readonly folderRepository: Repository<WatchlistFolderEntity>,
    @InjectRepository(TokenWatchlistFolderItemEntity)
    private readonly tokenItemRepository: Repository<TokenWatchlistFolderItemEntity>,
    @InjectRepository(UserWatchlistFolderItemEntity)
    private readonly userItemRepository: Repository<UserWatchlistFolderItemEntity>,
    @InjectRepository(TokenEntity)
    private readonly tokenRepository: Repository<TokenEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly walletsService: WalletsService,
  ) {}

  async checkFolderAccess(userId: string): Promise<boolean> {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If user is admin, grant access regardless of token balance
    if (user.isAdmin) {
      return true;
    }

    try {
      // Get primary wallet
      const primaryWallet =
        await this.walletsService.getUserPrimaryWallet(userId);

      if (!primaryWallet?.address) {
        return false;
      }

      // Get token balance
      const balance = await this.walletsService.getSplTokenBalance(
        primaryWallet.address,
        DYORHUB_CONTRACT_ADDRESS,
      );

      const currentBalance =
        typeof balance === 'bigint' ? Number(balance) : Number(balance);

      // Explicitly return a boolean value based on the comparison
      return currentBalance >= MIN_TOKEN_HOLDING_FOR_FOLDERS;
    } catch (error) {
      this.logger.error(
        `Error checking token balance for user ${userId}:`,
        error,
      );
      return false;
    }
  }

  async getUserTokenBalance(userId: string): Promise<number> {
    try {
      const primaryWallet =
        await this.walletsService.getUserPrimaryWallet(userId);

      if (!primaryWallet?.address) {
        return 0;
      }

      const balance = await this.walletsService.getSplTokenBalance(
        primaryWallet.address,
        DYORHUB_CONTRACT_ADDRESS,
      );

      return typeof balance === 'bigint' ? Number(balance) : Number(balance);
    } catch (error) {
      this.logger.error(
        `Error getting token balance for user ${userId}:`,
        error,
      );
      return 0;
    }
  }

  async createFolder(
    userId: string,
    name: string,
    folderType: 'token' | 'user',
  ): Promise<WatchlistFolderEntity> {
    // Get highest position
    const highestPositionFolder = await this.folderRepository.findOne({
      where: { userId, folderType },
      order: { position: 'DESC' },
    });

    const position = highestPositionFolder
      ? highestPositionFolder.position + 1
      : 0;

    const folder = this.folderRepository.create({
      userId,
      name,
      folderType,
      position,
    });

    return this.folderRepository.save(folder);
  }

  async updateFolder(
    userId: string,
    folderId: string,
    data: { name?: string; position?: number },
  ): Promise<WatchlistFolderEntity> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, userId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    if (data.name) {
      folder.name = data.name;
    }

    if (data.position !== undefined) {
      folder.position = data.position;
    }

    return this.folderRepository.save(folder);
  }

  async deleteFolder(userId: string, folderId: string): Promise<void> {
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, userId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    await this.folderRepository.remove(folder);
  }

  async getUserFolders(
    userId: string,
    folderType: 'token' | 'user',
  ): Promise<WatchlistFolderEntity[]> {
    return this.folderRepository.find({
      where: { userId, folderType },
      order: { position: 'ASC' },
    });
  }

  // Token folder item methods
  async addTokenToFolder(
    userId: string,
    folderId: string,
    tokenMintAddress: string,
  ): Promise<TokenWatchlistFolderItemEntity> {
    // Check if folder exists and belongs to user
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, userId, folderType: 'token' },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Check if token exists
    const token = await this.tokenRepository.findOne({
      where: { mintAddress: tokenMintAddress },
    });

    if (!token) {
      throw new NotFoundException('Token not found');
    }

    // Check if already in folder
    const existing = await this.tokenItemRepository.findOne({
      where: { folderId, tokenMintAddress },
    });

    if (existing) {
      return existing;
    }

    // Get highest position
    const highestPositionItem = await this.tokenItemRepository.findOne({
      where: { folderId },
      order: { position: 'DESC' },
    });

    const position = highestPositionItem ? highestPositionItem.position + 1 : 0;

    // Create new folder item
    const folderItem = this.tokenItemRepository.create({
      folderId,
      tokenMintAddress,
      position,
    });

    return this.tokenItemRepository.save(folderItem);
  }

  async removeTokenFromFolder(
    userId: string,
    folderId: string,
    tokenMintAddress: string,
  ): Promise<void> {
    // Check if folder exists and belongs to user
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, userId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const result = await this.tokenItemRepository.delete({
      folderId,
      tokenMintAddress,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Token not found in folder');
    }
  }

  async getFolderTokens(
    userId: string,
    folderId: string,
  ): Promise<(TokenEntity & { position: number })[]> {
    // Check if folder exists and belongs to user
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, userId, folderType: 'token' },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const folderItems = await this.tokenItemRepository.find({
      where: { folderId },
      relations: { token: true },
      order: { position: 'ASC' },
    });

    return folderItems.map((item) => ({
      ...item.token,
      position: item.position,
    }));
  }

  // User folder item methods
  async addUserToFolder(
    userId: string,
    folderId: string,
    watchedUserId: string,
  ): Promise<UserWatchlistFolderItemEntity> {
    // Check if folder exists and belongs to user
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, userId, folderType: 'user' },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    // Check if watched user exists
    const watchedUser = await this.userRepository.findOne({
      where: { id: watchedUserId },
    });

    if (!watchedUser) {
      throw new NotFoundException('User not found');
    }

    // Check if already in folder
    const existing = await this.userItemRepository.findOne({
      where: { folderId, watchedUserId },
    });

    if (existing) {
      return existing;
    }

    // Get highest position
    const highestPositionItem = await this.userItemRepository.findOne({
      where: { folderId },
      order: { position: 'DESC' },
    });

    const position = highestPositionItem ? highestPositionItem.position + 1 : 0;

    // Create new folder item
    const folderItem = this.userItemRepository.create({
      folderId,
      watchedUserId,
      position,
    });

    return this.userItemRepository.save(folderItem);
  }

  async removeUserFromFolder(
    userId: string,
    folderId: string,
    watchedUserId: string,
  ): Promise<void> {
    // Check if folder exists and belongs to user
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, userId },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const result = await this.userItemRepository.delete({
      folderId,
      watchedUserId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('User not found in folder');
    }
  }

  async getFolderUsers(
    userId: string,
    folderId: string,
  ): Promise<(UserEntity & { position: number })[]> {
    // Check if folder exists and belongs to user
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, userId, folderType: 'user' },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const folderItems = await this.userItemRepository.find({
      where: { folderId },
      relations: { watchedUser: true },
      order: { position: 'ASC' },
    });

    return folderItems.map((item) => ({
      ...item.watchedUser,
      position: item.position,
    }));
  }

  // Reordering methods
  async updateTokenPositionInFolder(
    userId: string,
    folderId: string,
    tokenMintAddress: string,
    newPosition: number,
  ): Promise<void> {
    // Check if folder exists and belongs to user
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, userId, folderType: 'token' },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const item = await this.tokenItemRepository.findOne({
      where: { folderId, tokenMintAddress },
    });

    if (!item) {
      throw new NotFoundException('Token not found in folder');
    }

    // Update position
    item.position = newPosition;
    await this.tokenItemRepository.save(item);
  }

  async updateUserPositionInFolder(
    userId: string,
    folderId: string,
    watchedUserId: string,
    newPosition: number,
  ): Promise<void> {
    // Check if folder exists and belongs to user
    const folder = await this.folderRepository.findOne({
      where: { id: folderId, userId, folderType: 'user' },
    });

    if (!folder) {
      throw new NotFoundException('Folder not found');
    }

    const item = await this.userItemRepository.findOne({
      where: { folderId, watchedUserId },
    });

    if (!item) {
      throw new NotFoundException('User not found in folder');
    }

    // Update position
    item.position = newPosition;
    await this.userItemRepository.save(item);
  }
}
