import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { WalletsService } from '../../wallets/wallets.service';
import {
  DYORHUB_CONTRACT_ADDRESS,
  MIN_TOKEN_HOLDING_FOR_FEED,
} from '../constants';

@Injectable()
export class TokenGatedGuard implements CanActivate {
  private readonly logger = new Logger(TokenGatedGuard.name);

  constructor(private readonly walletsService: WalletsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      this.logger.warn('TokenGatedGuard requires an authenticated user.');
      throw new ForbiddenException('Authentication required.');
    }

    const requiredTokenAddress = DYORHUB_CONTRACT_ADDRESS;
    const minTokenHolding = MIN_TOKEN_HOLDING_FOR_FEED;

    if (
      !requiredTokenAddress ||
      typeof minTokenHolding !== 'number' ||
      minTokenHolding < 0
    ) {
      this.logger.error(
        'Token gating constants are invalid or not configured properly.',
      );
      throw new InternalServerErrorException(
        'Token gating configuration error.',
      );
    }

    try {
      const primaryWallet = await this.walletsService.getUserPrimaryWallet(
        user.id,
      );
      if (!primaryWallet?.address) {
        this.logger.warn(
          `User ${user.id} has no primary wallet for token gated access check.`,
        );
        throw new ForbiddenException(
          'A verified primary wallet is required to access this feature.',
        );
      }

      const walletAddress = primaryWallet.address;
      const balance = await this.walletsService.getSplTokenBalance(
        walletAddress,
        requiredTokenAddress,
      );

      if (balance < minTokenHolding) {
        this.logger.log(
          `User ${user.id} denied token gated access. Balance: ${balance}, Required: ${minTokenHolding}`,
        );
        throw new ForbiddenException(
          `Insufficient token balance. Requires ${minTokenHolding} tokens.`,
        );
      }

      this.logger.log(`User ${user.id} granted token gated access.`);
      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error(
        `Error during token gated check for user ${user.id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Error checking token gated access requirements.',
      );
    }
  }
}
