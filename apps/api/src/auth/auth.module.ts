import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditTransaction } from '../credits/entities/credit-transaction.entity';
import { AuthMethodEntity } from '../entities/auth-method.entity';
import { UserEntity } from '../entities/user.entity';
import { WalletEntity } from '../entities/wallet.entity';
import { GamificationModule } from '../gamification/gamification.module';
import { ReferralModule } from '../referral/referral.module';
import { UploadsModule } from '../uploads/uploads.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config/auth.config';

import { JwtStrategy } from './jwt.strategy';
import { OptionalAuthGuard } from './optional-auth.guard';
import { TwitterStrategy } from './twitter.strategy';
import { WalletAuthController } from './wallet-auth.controller';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({
      defaultStrategy: 'jwt',
      property: 'user',
      session: true,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN') || '24h',
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      UserEntity,
      CreditTransaction,
      AuthMethodEntity,
      WalletEntity,
    ]),
    forwardRef(() => GamificationModule),
    UsersModule,
    ReferralModule,
    UploadsModule,
  ],
  providers: [
    AuthConfigService,
    AuthService,
    TwitterStrategy,
    JwtStrategy,
    AuthGuard,
    OptionalAuthGuard,
  ],
  controllers: [AuthController, WalletAuthController],
  exports: [
    AuthService,
    JwtModule,
    PassportModule,
    AuthConfigService,
    JwtStrategy,
    AuthGuard,
    OptionalAuthGuard,
  ],
})
export class AuthModule {}
