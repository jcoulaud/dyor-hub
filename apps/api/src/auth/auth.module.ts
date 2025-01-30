import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config/auth.config';
import { JwtStrategy } from './jwt.strategy';
import { OptionalAuthGuard } from './optional-auth.guard';
import { TwitterStrategy } from './twitter.strategy';

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
    TypeOrmModule.forFeature([UserEntity]),
  ],
  providers: [
    AuthConfigService,
    AuthService,
    TwitterStrategy,
    JwtStrategy,
    AuthGuard,
    OptionalAuthGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PassportModule, AuthConfigService],
})
export class AuthModule {}
