import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config/auth.config';
import { UserResponseDto } from './dto/user-response.dto';
import { TwitterAuthenticationException } from './exceptions/auth.exceptions';

interface AuthenticatedRequest extends Request {
  user?: any;
  cookies?: { [key: string]: string };
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
    private readonly jwtService: JwtService,
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
      if (!req.user) {
        this.logger.error('No user data in request after Twitter auth');
        throw new TwitterAuthenticationException(
          'No user data received from Twitter',
        );
      }

      const token = await this.authService.login(req.user);
      const cookieConfig = this.authConfigService.getCookieConfig(
        this.authConfigService.isDevelopment,
      );

      res.cookie('jwt', token, cookieConfig);

      // Always use popup mode with postMessage
      const responseHtml = `
        <html>
          <body>
            <script>
              if (window.opener) {
                try {
                  window.opener.postMessage({ 
                    type: 'AUTH_SUCCESS', 
                    token: '${token}',
                    timestamp: ${Date.now()}
                  }, '*');
                  window.close();
                } catch (err) {
                  console.error('Failed to post message:', err);
                }
              } else {
                window.location.href = '${this.authConfigService.clientUrl}';
              }
            </script>
          </body>
        </html>
      `;

      res.send(responseHtml);
    } catch (error) {
      this.logger.error('Twitter callback error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      const errorRedirectUrl = `${this.authConfigService.clientUrl}/auth/error`;
      res.redirect(errorRedirectUrl);
    }
  }

  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest): Promise<AuthResponse> {
    try {
      const token = req.cookies?.jwt;

      if (!token) {
        return { authenticated: false };
      }

      try {
        const payload = this.jwtService.verify(token, {
          secret: this.authConfigService.jwtSecret,
        });

        const user = await this.authService.findUserById(payload.sub);

        if (!user) {
          return { authenticated: false };
        }

        return {
          authenticated: true,
          user: UserResponseDto.fromEntity(user),
        };
      } catch (error) {
        return { authenticated: false };
      }
    } catch (error) {
      this.logger.error(
        'Profile check error:',
        error instanceof Error ? error.message : error,
      );
      return { authenticated: false };
    }
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    const cookieConfig = this.authConfigService.getCookieConfig(
      this.authConfigService.isDevelopment,
    );

    res.clearCookie('jwt', {
      ...cookieConfig,
      maxAge: 0,
    });
    res.json({ success: true });
  }
}
