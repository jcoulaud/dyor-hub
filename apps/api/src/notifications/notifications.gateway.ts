import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { NotificationEntity } from '../entities';

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized (Notifications)');
  }

  handleConnection(client: Socket, ...args: any[]) {
    // Extract userId sent by the client in the connection query
    const userId = client.handshake.query.userId as string;

    if (!userId) {
      this.logger.warn(
        `Connection attempt without userId. Disconnecting socket ${client.id}`,
      );
      client.disconnect(true);
      return;
    }

    this.logger.log(`Client connected: ${client.id}, User ID: ${userId}`);
    this.clients.set(client.id, userId);

    // Join a room specific to the user
    client.join(userId);
  }

  handleDisconnect(client: Socket) {
    const userId = this.clients.get(client.id);
    this.logger.log(
      `Client disconnected: ${client.id}, User ID: ${userId || 'unknown'}`,
    );
    this.clients.delete(client.id);
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
