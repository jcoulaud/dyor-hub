import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { Session } from 'express-session';
import { AuthService } from './auth.service';
import { AuthConfigService } from './config/auth.config';
import { UserResponseDto } from './dto/user-response.dto';
import { TwitterAuthenticationException } from './exceptions/auth.exceptions';

interface AuthenticatedRequest extends Request {
  user?: any;
  cookies?: { [key: string]: string };
  query?: { [key: string]: string };
  session?: Session & {
    destroy(callback?: (err?: any) => void): void;
    returnTo?: string;
    [key: string]: any;
  };
}

interface AuthResponse {
  authenticated: boolean;
  user?: UserResponseDto;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authConfigService: AuthConfigService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('twitter-login-url')
  getTwitterLoginUrl(@Req() req: AuthenticatedRequest): { url: string } {
    let apiBaseUrl: string;

    if (this.authConfigService.isDevelopment) {
      apiBaseUrl = new URL(
        '/api',
        this.authConfigService.clientUrl.replace('3000', '3001'),
      ).toString();
    } else {
      const clientUrl = new URL(this.authConfigService.clientUrl);
      const apiHostname = `api.${clientUrl.hostname}`;
      apiBaseUrl = `${clientUrl.protocol}//${apiHostname}`;
    }

    const baseUrl = `${apiBaseUrl}/auth/twitter`;
    const params = [];

    if (req.query?.return_to) {
      params.push(
        `return_to=${encodeURIComponent(req.query.return_to as string)}`,
      );
    }

    if (req.query?.use_popup) {
      params.push(`use_popup=${req.query.use_popup}`);
    }

    const url = params.length > 0 ? `${baseUrl}?${params.join('&')}` : baseUrl;
    return { url };
  }

  @Get('twitter')
  @UseGuards(AuthGuard('twitter'))
  async twitterAuth(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    if (req.query?.return_to && req.session) {
      req.session.returnTo = req.query.return_to as string;
    }

    if (req.user && req.user.redirectUrl) {
      return res.redirect(req.user.redirectUrl);
    }

    res.status(500).json({
      error: 'Twitter authentication failed to generate a redirect URL',
    });
  }

  @Get('twitter/callback')
  @UseGuards(AuthGuard('twitter'))
  async twitterAuthCallback(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw new TwitterAuthenticationException(
          'No user data received from Twitter',
        );
      }

      const token = await this.authService.login(req.user);
      const cookieConfig = this.authConfigService.getCookieConfig(
        this.authConfigService.isDevelopment,
      );

      res.cookie('jwt', token, cookieConfig);

      let redirectUrl: URL;
      const returnToParam = req.query?.return_to || req.session?.returnTo;
      const isPopup = req.user.usePopup === true;

      if (returnToParam) {
        try {
          const returnTo = decodeURIComponent(returnToParam as string);
          const returnToUrl = new URL(returnTo);
          const clientUrl = new URL(this.authConfigService.clientUrl);

          if (returnToUrl.hostname === clientUrl.hostname) {
            redirectUrl = returnToUrl;
            redirectUrl.searchParams.append('auth_success', 'true');
          } else {
            redirectUrl = new URL(this.authConfigService.clientUrl);
            redirectUrl.searchParams.append('auth_success', 'true');
          }
        } catch (error) {
          redirectUrl = new URL(this.authConfigService.clientUrl);
          redirectUrl.searchParams.append('auth_success', 'true');
        }
      } else {
        redirectUrl = new URL(this.authConfigService.clientUrl);
        redirectUrl.searchParams.append('auth_success', 'true');
      }

      if (isPopup) {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Successful</title>
            <script>
              window.onload = function() {
                if (window.opener) {
                  try {
                    window.opener.postMessage({ 
                      type: 'twitter_auth_result', 
                      success: true 
                    }, '*');
                    
                    setTimeout(function() {
                      window.close();
                    }, 500);
                  } catch(e) {
                    window.location.href = '${redirectUrl.toString()}';
                  }
                } else {
                  window.location.href = '${redirectUrl.toString()}';
                }
              };
            </script>
          </head>
          <body>
            <h3>Authentication Successful!</h3>
            <p>This window should close automatically. If it doesn't, you can <a href="${redirectUrl.toString()}">click here</a> to continue.</p>
          </body>
          </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.redirect(redirectUrl.toString());
      }
    } catch (error) {
      const clientUrl = new URL(this.authConfigService.clientUrl);
      const isPopup = req.user?.usePopup === true;

      let errorMessage = 'Authentication failed';
      let errorDetails = '';

      if (error instanceof Error) {
        errorMessage = error.message;
        errorDetails = error.stack || '';
      }

      clientUrl.searchParams.append(
        'auth_error',
        encodeURIComponent(errorMessage),
      );
      clientUrl.searchParams.append(
        'auth_error_details',
        encodeURIComponent(errorDetails),
      );

      if (isPopup) {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Authentication Failed</title>
            <script>
              window.onload = function() {
                if (window.opener) {
                  try {
                    window.opener.postMessage({ 
                      type: 'twitter_auth_result', 
                      success: false,
                      error: '${encodeURIComponent(errorMessage)}'
                    }, '*');
                    
                    setTimeout(function() {
                      window.close();
                    }, 500);
                  } catch(e) {
                    window.location.href = '${clientUrl.toString()}';
                  }
                } else {
                  window.location.href = '${clientUrl.toString()}';
                }
              };
            </script>
          </head>
          <body>
            <h3>Authentication Failed</h3>
            <p>${errorMessage}</p>
            <p>This window should close automatically. If it doesn't, you can <a href="${clientUrl.toString()}">click here</a> to continue.</p>
          </body>
          </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.redirect(clientUrl.toString());
      }
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
      return { authenticated: false };
    }
  }

  @Get('logout')
  async logout(@Req() req: AuthenticatedRequest, @Res() res: Response) {
    const cookieConfig = this.authConfigService.getCookieConfig(
      this.authConfigService.isDevelopment,
    );

    res.clearCookie('jwt', {
      ...cookieConfig,
      maxAge: 0,
    });

    res.clearCookie('dyor.sid', {
      ...cookieConfig,
      maxAge: 0,
    });

    if (req.session) {
      try {
        await new Promise<void>((resolve, reject) => {
          req.session.destroy((err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      } catch (error) {
        // Continue with the response even if session destruction fails
      }
    }

    res.json({ success: true });
  }
}
