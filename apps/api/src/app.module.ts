import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { CommentsModule } from './comments/comments.module';
import { databaseConfig } from './config/database.config';
import { HealthModule } from './health/health.module';
import { TelegramNotificationService } from './services/telegram-notification.service';
import { SessionModule } from './session/session.module';
import { SolanaModule } from './solana/solana.module';
import { TokensModule } from './tokens/tokens.module';
import { UsersModule } from './users/users.module';
import { WalletsModule } from './wallets/wallets.module';
import { WatchlistModule } from './watchlist/watchlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      cache: true,
    }),
    PassportModule.register({}),
    TypeOrmModule.forRootAsync(databaseConfig),
    AuthModule,
    TokensModule,
    CommentsModule,
    SessionModule,
    HealthModule,
    UsersModule,
    WalletsModule,
    WatchlistModule,
    SolanaModule,
  ],
  controllers: [AppController],
  providers: [TelegramNotificationService],
})
export class AppModule {}
