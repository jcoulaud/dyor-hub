import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config/auth.config';
import { UserResponseDto } from './dto/user-response.dto';
import { TwitterAuthenticationException } from './exceptions/auth.exceptions';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user?: any;
}

interface AuthResponse {
  authenticated: boolean;
  user?: UserResponseDto;
}

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly authConfigService: AuthConfigService,
  ) {}

  @Get('twitter')
  @UseGuards(AuthGuard('twitter'))
  async twitterAuth(): Promise<void> {
    this.logger.log('Starting Twitter auth');
  }

  @Get('twitter/callback')
  @UseGuards(AuthGuard('twitter'))
  async twitterAuthCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    try {
      this.logger.debug('Processing Twitter callback');

      if (!req.user) {
        throw new TwitterAuthenticationException(
          'No user data received from Twitter',
        );
      }

      const token = await this.authService.login(req.user);
      this.logger.debug('JWT token generated successfully');

      // Set JWT token in cookie
      const cookieConfig = this.authConfigService.getCookieConfig(
        this.authConfigService.isDevelopment,
      );

      this.logger.debug('Setting authentication cookie');
      res.cookie('jwt', token, cookieConfig);

      // Always use popup mode with postMessage
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'AUTH_SUCCESS', token: '${token}' }, '*');
                window.close();
              } else {
                window.location.href = '${this.authConfigService.clientUrl}';
              }
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      this.logger.error('Twitter callback error:', error);
      const errorRedirectUrl = `${this.authConfigService.clientUrl}/auth/error`;
      this.logger.debug(`Redirecting to error page: ${errorRedirectUrl}`);
      res.redirect(errorRedirectUrl);
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: AuthenticatedRequest): AuthResponse {
    if (!req.user) {
      return { authenticated: false };
    }
    return {
      authenticated: true,
      user: UserResponseDto.fromEntity(req.user),
    };
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('jwt', {
      path: '/',
    });
    res.json({ success: true });
  }
}
