import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MIN_TOKEN_HOLDING_FOR_FOLDERS,
  MIN_TOKEN_HOLDING_KEY,
} from '../common/constants';
import { TokenGatedGuard } from '../common/guards/token-gated.guard';
import { TokenEntity } from '../entities/token.entity';
import { UserEntity } from '../entities/user.entity';
import { WatchlistFolderEntity } from '../entities/watchlist-folder.entity';
import { WatchlistFolderService } from './watchlist-folder.service';

@Controller('watchlist/folders')
@UseGuards(JwtAuthGuard)
export class WatchlistFolderController {
  constructor(private readonly folderService: WatchlistFolderService) {}

  @Get('access-check')
  async checkFolderAccess(
    @CurrentUser() user: any,
  ): Promise<{ currentBalance: number; requiredBalance: number }> {
    const currentBalance = await this.folderService.getUserTokenBalance(
      user.id,
    );

    return {
      currentBalance,
      requiredBalance: MIN_TOKEN_HOLDING_FOR_FOLDERS,
    };
  }

  @Get('tokens')
  async getTokenFolders(
    @CurrentUser() user: any,
  ): Promise<WatchlistFolderEntity[]> {
    const hasAccess = await this.folderService.checkFolderAccess(user.id);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Insufficient token balance to access folders',
      );
    }

    return this.folderService.getUserFolders(user.id, 'token');
  }

  @Get('users')
  async getUserFolders(
    @CurrentUser() user: any,
  ): Promise<WatchlistFolderEntity[]> {
    const hasAccess = await this.folderService.checkFolderAccess(user.id);
    if (!hasAccess) {
      throw new ForbiddenException(
        'Insufficient token balance to access folders',
      );
    }

    return this.folderService.getUserFolders(user.id, 'user');
  }

  @Post()
  @UseGuards(TokenGatedGuard)
  @SetMetadata(MIN_TOKEN_HOLDING_KEY, MIN_TOKEN_HOLDING_FOR_FOLDERS)
  async createFolder(
    @CurrentUser() user: any,
    @Body() body: { name: string; folderType: 'token' | 'user' },
  ): Promise<WatchlistFolderEntity> {
    return this.folderService.createFolder(user.id, body.name, body.folderType);
  }

  @Put(':folderId')
  async updateFolder(
    @CurrentUser() user: any,
    @Param('folderId') folderId: string,
    @Body() body: { name?: string; position?: number },
  ): Promise<WatchlistFolderEntity> {
    return this.folderService.updateFolder(user.id, folderId, body);
  }

  @Delete(':folderId')
  async deleteFolder(
    @CurrentUser() user: any,
    @Param('folderId') folderId: string,
  ): Promise<void> {
    return this.folderService.deleteFolder(user.id, folderId);
  }

  // Token folder item endpoints
  @Get('tokens/:folderId/items')
  async getFolderTokens(
    @CurrentUser() user: any,
    @Param('folderId') folderId: string,
  ): Promise<(TokenEntity & { position: number })[]> {
    return this.folderService.getFolderTokens(user.id, folderId);
  }

  @Post('tokens/:folderId/items')
  async addTokenToFolder(
    @CurrentUser() user: any,
    @Param('folderId') folderId: string,
    @Body() body: { tokenMintAddress: string },
  ): Promise<any> {
    await this.folderService.addTokenToFolder(
      user.id,
      folderId,
      body.tokenMintAddress,
    );
    return { success: true };
  }

  @Delete('tokens/:folderId/items/:tokenMintAddress')
  async removeTokenFromFolder(
    @CurrentUser() user: any,
    @Param('folderId') folderId: string,
    @Param('tokenMintAddress') tokenMintAddress: string,
  ): Promise<void> {
    return this.folderService.removeTokenFromFolder(
      user.id,
      folderId,
      tokenMintAddress,
    );
  }

  @Put('tokens/:folderId/items/:tokenMintAddress/position')
  async updateTokenPositionInFolder(
    @CurrentUser() user: any,
    @Param('folderId') folderId: string,
    @Param('tokenMintAddress') tokenMintAddress: string,
    @Body() body: { position: number },
  ): Promise<void> {
    return this.folderService.updateTokenPositionInFolder(
      user.id,
      folderId,
      tokenMintAddress,
      body.position,
    );
  }

  // User folder item endpoints
  @Get('users/:folderId/items')
  async getFolderUsers(
    @CurrentUser() user: any,
    @Param('folderId') folderId: string,
  ): Promise<(UserEntity & { position: number })[]> {
    return this.folderService.getFolderUsers(user.id, folderId);
  }

  @Post('users/:folderId/items')
  async addUserToFolder(
    @CurrentUser() user: any,
    @Param('folderId') folderId: string,
    @Body() body: { userId: string },
  ): Promise<any> {
    await this.folderService.addUserToFolder(user.id, folderId, body.userId);
    return { success: true };
  }

  @Delete('users/:folderId/items/:userId')
  async removeUserFromFolder(
    @CurrentUser() user: any,
    @Param('folderId') folderId: string,
    @Param('userId') watchedUserId: string,
  ): Promise<void> {
    return this.folderService.removeUserFromFolder(
      user.id,
      folderId,
      watchedUserId,
    );
  }

  @Put('users/:folderId/items/:userId/position')
  async updateUserPositionInFolder(
    @CurrentUser() user: any,
    @Param('folderId') folderId: string,
    @Param('userId') watchedUserId: string,
    @Body() body: { position: number },
  ): Promise<void> {
    return this.folderService.updateUserPositionInFolder(
      user.id,
      folderId,
      watchedUserId,
      body.position,
    );
  }
}
