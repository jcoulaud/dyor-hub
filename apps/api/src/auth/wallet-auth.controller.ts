import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config/auth.config';
import { Public } from './decorators/public.decorator';
import {
  CheckWalletDto,
  WalletLoginDto,
  WalletSignupDto,
} from './dto/wallet-auth.dto';

@Controller('auth/wallet')
export class WalletAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authConfigService: AuthConfigService,
  ) {}

  @Public()
  @Post('check')
  async checkWallet(@Body() checkWalletDto: CheckWalletDto): Promise<any> {
    return this.authService.checkWalletAuth(checkWalletDto.walletAddress);
  }

  @Public()
  @Post('login')
  async walletLogin(
    @Body() walletLoginDto: WalletLoginDto,
    @Res() res: Response,
  ): Promise<void> {
    const user = await this.authService.authenticateWithWallet(
      walletLoginDto.walletAddress,
      walletLoginDto.signature,
    );
    const token = await this.authService.login(user);

    const cookieConfig = this.authConfigService.getCookieConfig(
      this.authConfigService.isDevelopment,
    );

    res.cookie('jwt', token, cookieConfig);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode,
        preferences: user.preferences,
      },
    });
  }

  @Public()
  @Post('signup')
  async walletSignup(
    @Body() walletSignupDto: WalletSignupDto,
    @Res() res: Response,
  ): Promise<void> {
    const user = await this.authService.signupWithWallet(walletSignupDto);
    const token = await this.authService.login(user);

    const cookieConfig = this.authConfigService.getCookieConfig(
      this.authConfigService.isDevelopment,
    );

    res.cookie('jwt', token, cookieConfig);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        isAdmin: user.isAdmin,
        referralCode: user.referralCode,
        preferences: user.preferences,
      },
    });
  }
}
