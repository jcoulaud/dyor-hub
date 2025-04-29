import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  Connection,
  ParsedTransactionWithMeta,
  PublicKey,
} from '@solana/web3.js';
import { Repository } from 'typeorm';
import { DYORHUB_CONTRACT_ADDRESS } from '../common/constants';
import { BadgeEntity } from '../entities/badge.entity';
import { Tip } from '../entities/tip.entity';
import { UserBadgeEntity } from '../entities/user-badge.entity';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { SolanaRpcService } from '../solana/solana-rpc.service';
import { GetTippingEligibilityResponseDto } from './dto/get-tipping-eligibility-response.dto';
import { RecordTipRequestDto } from './dto/record-tip-request.dto';

@Injectable()
export class TippingService {
  private readonly logger = new Logger(TippingService.name);

  constructor(
    @InjectRepository(Tip) private readonly tipRepository: Repository<Tip>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(UserBadgeEntity)
    private readonly userBadgeRepository: Repository<UserBadgeEntity>,
    @InjectRepository(BadgeEntity)
    private readonly badgeRepository: Repository<BadgeEntity>,
    private readonly solanaRpcService: SolanaRpcService,
  ) {}

  /**
   * Checks if a user has a verified, primary wallet and is eligible for tips.
   */
  async getTippingEligibility(
    userId: string,
  ): Promise<GetTippingEligibilityResponseDto> {
    const primaryWallet = await this.walletRepository.findOne({
      where: { user: { id: userId }, isPrimary: true, isVerified: true },
    });

    if (!primaryWallet) {
      return { isEligible: false, recipientAddress: null };
    }

    return { isEligible: true, recipientAddress: primaryWallet.address };
  }

  /**
   * Verifies a Solana transaction and records the tip if valid.
   * Awards Tipper badge if it's the user's first tip.
   */
  async recordTip(
    senderUserId: string,
    dto: RecordTipRequestDto,
  ): Promise<Tip> {
    // 1. Fetch Sender and Recipient primary wallets
    const [senderWallet, recipientWallet] = await Promise.all([
      this.findPrimaryVerifiedWallet(senderUserId, 'Sender'),
      this.findPrimaryVerifiedWallet(dto.recipientUserId, 'Recipient'),
    ]);

    // Calculate expected ATAs
    const dyorhubMintPk = new PublicKey(DYORHUB_CONTRACT_ADDRESS);
    const senderWalletPk = new PublicKey(senderWallet.address);
    const recipientWalletPk = new PublicKey(recipientWallet.address);
    const expectedSenderAta = getAssociatedTokenAddressSync(
      dyorhubMintPk,
      senderWalletPk,
    );
    const expectedRecipientAta = getAssociatedTokenAddressSync(
      dyorhubMintPk,
      recipientWalletPk,
    );

    // 2. Verify Transaction on Solana
    const connection = this.solanaRpcService.getConnection();
    const txDetails = await this.verifyTransaction(
      connection,
      dto.transactionSignature,
      expectedSenderAta.toBase58(),
      expectedRecipientAta.toBase58(),
      dto.amount,
    );

    // Check if transaction details are valid
    if (!txDetails || txDetails.meta?.err) {
      this.logger.error(
        `Transaction verification failed or tx has error for ${dto.transactionSignature}`,
        { error: txDetails?.meta?.err },
      );
      throw new BadRequestException(
        `Transaction verification failed or transaction has an error: ${dto.transactionSignature}`,
      );
    }

    // 3. Check if tip already recorded (using unique constraint on signature)
    const existingTip = await this.tipRepository.findOneBy({
      transactionSignature: dto.transactionSignature,
    });
    if (existingTip) {
      this.logger.warn(
        `Tip with signature ${dto.transactionSignature} already recorded.`,
      );
      throw new BadRequestException(
        `Tip with signature ${dto.transactionSignature} already recorded.`,
      );
    }

    // 4. Create and Save Tip entity
    const sender = await this.userRepository.findOneBy({ id: senderUserId });
    const recipient = await this.userRepository.findOneBy({
      id: dto.recipientUserId,
    });

    if (!sender || !recipient) {
      throw new NotFoundException('Sender or Recipient user not found.');
    }

    const newTip = this.tipRepository.create({
      senderId: senderUserId,
      senderWalletAddress: senderWallet.address,
      recipientId: dto.recipientUserId,
      recipientWalletAddress: recipientWallet.address,
      amount: dto.amount, // Store amount in base units
      transactionSignature: dto.transactionSignature,
      contentType: dto.contentType,
      contentId: dto.contentId,
    });

    try {
      const savedTip = await this.tipRepository.save(newTip);

      // 5. Award Tipper Badge
      this.awardTipperBadge(senderUserId);

      return savedTip;
    } catch (error) {
      if (error.code === '23505') {
        this.logger.warn(
          `Tip with signature ${dto.transactionSignature} likely recorded concurrently.`,
        );
        throw new BadRequestException(
          `Tip with signature ${dto.transactionSignature} already recorded.`,
        );
      } else {
        this.logger.error(`Failed to save tip: ${error.message}`, error.stack);
        throw new InternalServerErrorException('Failed to record tip.');
      }
    }
  }

  // --- Helper Methods ---

  private async findPrimaryVerifiedWallet(
    userId: string,
    userType: string,
  ): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findOne({
      where: { user: { id: userId }, isPrimary: true, isVerified: true },
    });
    if (!wallet) {
      this.logger.error(
        `${userType} user ${userId} does not have a primary verified wallet.`,
      );
      throw new NotFoundException(
        `${userType} does not have a primary verified wallet.`,
      );
    }
    return wallet;
  }

  private async verifyTransaction(
    connection: Connection,
    signature: string,
    expectedSenderAta: string,
    expectedRecipientAta: string,
    expectedAmountLamports: number,
  ): Promise<ParsedTransactionWithMeta | null> {
    try {
      const tx = await connection.getParsedTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!tx) {
        return null;
      }

      if (tx.meta?.err) {
        return tx;
      }

      // Find the relevant token transfer instruction
      let transferInstructionFound = false;
      for (const instruction of tx.transaction.message.instructions) {
        // Check if it's a Token Program instruction
        if (instruction.programId.equals(TOKEN_PROGRAM_ID)) {
          // Check if it's a Parsed instruction
          if (
            'parsed' in instruction &&
            instruction.parsed.type === 'transferChecked'
          ) {
            const parsedInfo = instruction.parsed.info;
            if (
              parsedInfo.source === expectedSenderAta &&
              parsedInfo.destination === expectedRecipientAta &&
              parsedInfo.tokenAmount.uiAmount *
                Math.pow(10, parsedInfo.tokenAmount.decimals) ===
                expectedAmountLamports &&
              parsedInfo.mint === DYORHUB_CONTRACT_ADDRESS &&
              parsedInfo.tokenAmount.decimals === 6 // Explicitly check decimals match token
            ) {
              transferInstructionFound = true;
              break;
            }
            // Also check for 'transfer' type
          } else if (
            'parsed' in instruction &&
            instruction.parsed.type === 'transfer'
          ) {
            const parsedInfo = instruction.parsed.info;
            if (
              parsedInfo.source === expectedSenderAta &&
              parsedInfo.destination === expectedRecipientAta &&
              Number(parsedInfo.amount) === expectedAmountLamports
            ) {
              this.logger.warn(
                `Found 'transfer' instruction for ${signature}, assuming mint/decimals correct.`,
              );
              transferInstructionFound = true;
              break;
            }
          }
        }
      }

      if (!transferInstructionFound) {
        throw new BadRequestException(
          `Transaction ${signature} does not contain the expected DYORHUB token transfer.`,
        );
      }

      return tx;
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to verify transaction on Solana.',
      );
    }
  }

  private async awardTipperBadge(userId: string): Promise<void> {
    try {
      // 1. Find the 'Tipper' badge definition using the name directly
      const tipperBadge = await this.badgeRepository.findOneBy({
        name: 'Tipper',
        isActive: true,
      });
      if (!tipperBadge) {
        return;
      }

      // 2. Check if user already has the badge
      const existingUserBadge = await this.userBadgeRepository.findOneBy({
        userId: userId,
        badgeId: tipperBadge.id,
      });

      if (existingUserBadge) {
        return;
      }

      // 3. Award the badge
      const newUserBadge = this.userBadgeRepository.create({
        userId: userId,
        badgeId: tipperBadge.id,
        earnedAt: new Date(),
      });
      await this.userBadgeRepository.save(newUserBadge);

      // TODO: Trigger a notification for the user
    } catch (error) {
      this.logger.error(
        `Error awarding Tipper badge to user ${userId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
