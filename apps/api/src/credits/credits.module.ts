import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { SolanaModule } from '../solana/solana.module';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { CreditPackage } from './entities/credit-package.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreditPackage,
      CreditTransaction,
      UserEntity,
      WalletEntity,
    ]),
    AuthModule,
    SolanaModule,
  ],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
