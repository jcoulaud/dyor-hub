import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { parse } from 'cookie';
import { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import { JwtPayload } from '../auth/interfaces/auth.types';
import { NotificationEntity } from '../entities';

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'https://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true,
};

@WebSocketGateway({ namespace: '/notifications', cors: corsOptions })
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  // Inject WebSocket Server instance
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // Store connected clients
  private clients: Map<string, string> = new Map();

  constructor(private readonly authService: AuthService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized (Notifications)');
  }

  async handleConnection(client: Socket, ...args: any[]) {
    let token: string | undefined;
    const AUTH_COOKIE_NAME = 'jwt';

    try {
      const handshakeData = client.handshake;
      const cookieHeader = handshakeData.headers.cookie;
      const parsedCookiesByMiddleware = (handshakeData as any).cookies;
      let cookies: Record<string, string> | null = null;

      // Attempt 1: Use cookies parsed by middleware if available
      if (
        parsedCookiesByMiddleware &&
        typeof parsedCookiesByMiddleware === 'object'
      ) {
        cookies = parsedCookiesByMiddleware;
      }
      // Attempt 2: Manually parse if middleware didn't work but header exists
      else if (cookieHeader) {
        this.logger.warn(
          `[Auth Attempt] request.cookies not found. Manually parsing cookie header for socket ${client.id}.`,
        );
        try {
          cookies = parse(cookieHeader);
        } catch (parseError) {
          this.logger.error(
            `[Auth Attempt] Failed to manually parse cookie header: ${parseError}`,
          );
          throw new WsException('Failed to parse authentication cookie.');
        }
      } else {
        this.logger.warn('[Auth Attempt] No cookie header found in handshake.');
      }

      // Extract token if cookies were found/parsed
      if (cookies) {
        token = cookies[AUTH_COOKIE_NAME];
      }

      // Final check if token was extracted
      if (!token) {
        throw new WsException(
          `Auth cookie '${AUTH_COOKIE_NAME}' not found in received cookies.`,
        );
      }

      // --- Token verification ---
      const payload: JwtPayload = this.authService.verifyToken(token);
      const userId = payload.sub;
      if (!userId) {
        throw new WsException('Invalid token payload: Missing user ID.');
      }

      this.logger.log(
        `Client connected via secure cookie auth: ${client.id}, User ID: ${userId}`,
      );
      this.clients.set(client.id, userId);
      client.join(userId);
    } catch (error) {
      this.logger.error(
        `WebSocket Authentication failed for socket ${client.id}: ${error.message || error}`,
        error instanceof Error ? error.stack : undefined,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.clients.get(client.id);
    if (userId) {
      this.logger.log(`Client disconnected: ${client.id}, User ID: ${userId}`);
      this.clients.delete(client.id);
    } else {
      this.logger.log(
        `Client disconnected: ${client.id} (User ID unknown or auth failed)`,
      );
    }
  }

  sendNotificationToUser(
    userId: string,
    notification: NotificationEntity,
  ): void {
    if (userId && notification) {
      this.logger.log(`Emitting new_notification to user room: ${userId}`);
      this.server.to(userId).emit('new_notification', notification);
    }
  }

  sendUnreadCountToUser(userId: string, count: number): void {
    if (userId) {
      this.logger.log(
        `Emitting update_unread_count (${count}) to user room: ${userId}`,
      );
      this.server.to(userId).emit('update_unread_count', count);
    }
  }

  /**
   * Broadcasts a system-wide message.
   */
  sendSystemBroadcast(message: any): void {
    this.logger.log('Emitting system_broadcast to all connected clients');
    this.server.emit('system_broadcast', message);
  }
}
