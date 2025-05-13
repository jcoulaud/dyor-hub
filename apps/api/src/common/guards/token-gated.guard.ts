import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WalletsService } from '../../wallets/wallets.service';
import { DYORHUB_CONTRACT_ADDRESS, MIN_TOKEN_HOLDING_KEY } from '../constants';

@Injectable()
export class TokenGatedGuard implements CanActivate {
  private readonly logger = new Logger(TokenGatedGuard.name);

  constructor(
    private readonly walletsService: WalletsService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      this.logger.warn('TokenGatedGuard requires an authenticated user.');
      throw new ForbiddenException('Authentication required.');
    }

    const requiredTokenAddress = DYORHUB_CONTRACT_ADDRESS;
    const minTokenHolding = this.reflector.get<number | undefined>(
      MIN_TOKEN_HOLDING_KEY,
      context.getHandler(),
    );

    if (
      !requiredTokenAddress ||
      typeof minTokenHolding !== 'number' ||
      minTokenHolding < 0
    ) {
      this.logger.error(
        `Token gating is not configured properly for handler: ${context.getClass().name}.${context.getHandler().name}. ` +
          `Ensure @SetMetadata(MIN_TOKEN_HOLDING_KEY, value) is used with a valid number. Current value: ${minTokenHolding}`,
      );
      throw new InternalServerErrorException(
        'Token gating configuration error for this feature.',
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

      const currentBalanceNum =
        typeof balance === 'bigint' ? Number(balance) : balance;
      const minHoldingNum =
        typeof minTokenHolding === 'bigint'
          ? Number(minTokenHolding)
          : minTokenHolding;

      if (currentBalanceNum < minHoldingNum) {
        this.logger.log(
          `User ${user.id} denied token gated access. Balance: ${currentBalanceNum}, Required: ${minHoldingNum}`,
        );
        throw new ForbiddenException({
          message: 'Insufficient token balance.',
          currentBalance: currentBalanceNum.toString(),
          requiredBalance: minHoldingNum.toString(),
        });
      }

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof InternalServerErrorException) {
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
