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
import { TokensModule } from './tokens/tokens.module';

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
  ],
  controllers: [AppController],
  providers: [TelegramNotificationService],
})
export class AppModule {}
