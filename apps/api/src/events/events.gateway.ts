import { TrackedWalletHolderStats } from '@dyor-hub/types';
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
import { ChartWhispererOutput } from '../token-ai-technical-analysis/ai-analysis.service';

const corsOptions = {
  origin: process.env.CLIENT_URL || true,
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['cookie', 'Cookie', 'authorization', 'Authorization'],
};

export interface AnalysisProgressEvent {
  status: 'analyzing' | 'complete' | 'error' | 'queued';
  message?: string;
  error?: string;
  analysisData?: TrackedWalletHolderStats[];
  currentWallet?: number;
  totalWallets?: number;
  currentWalletAddress?: string;
  tradesFound?: number;
  sessionId?: string;
}

export interface TradingAnalysisProgressEvent {
  status: 'analyzing' | 'complete' | 'error' | 'queued';
  message?: string;
  error?: string;
  analysisData?: ChartWhispererOutput;
  progress?: number; // 0-100 percentage
  stage?: string; // e.g., 'Fetching price data', 'Analyzing patterns', 'Generating insights'
  sessionId?: string;
}

@WebSocketGateway({
  namespace: '/analysis',
  cors: corsOptions,
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private clients: Map<string, string> = new Map();
  private lastProgressByUser: Map<string, AnalysisProgressEvent> = new Map();
  private lastTradingAnalysisByUser: Map<string, TradingAnalysisProgressEvent> =
    new Map();

  constructor(private readonly authService: AuthService) {}

  afterInit(server: Server) {
    setInterval(() => {
      this.server.emit('ping');
    }, 25000);
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
        try {
          cookies = parse(cookieHeader);
        } catch (parseError) {
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

      this.clients.set(client.id, userId);
      client.join(userId);

      // If there was a previous progress event for this user, send it
      const lastProgress = this.lastProgressByUser.get(userId);
      if (lastProgress) {
        client.emit('analysis_progress', lastProgress);
      }

      const lastTradingAnalysis = this.lastTradingAnalysisByUser.get(userId);
      if (lastTradingAnalysis) {
        client.emit('trading_analysis_progress', lastTradingAnalysis);
      }
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
      this.clients.delete(client.id);
    }
  }

  sendAnalysisProgress(userId: string, progress: AnalysisProgressEvent): void {
    if (userId) {
      this.lastProgressByUser.set(userId, progress);
      this.server.to(userId).emit('analysis_progress', progress);

      // Clean up completed or errored analysis progress
      if (progress.status === 'complete' || progress.status === 'error') {
        setTimeout(() => {
          const currentProgress = this.lastProgressByUser.get(userId);
          if (currentProgress === progress) {
            this.lastProgressByUser.delete(userId);
          }
        }, 90000);
      }
    }
  }

  sendTradingAnalysisProgress(
    userId: string,
    progress: TradingAnalysisProgressEvent,
  ): void {
    if (userId) {
      this.lastTradingAnalysisByUser.set(userId, progress);
      this.server.to(userId).emit('trading_analysis_progress', progress);

      if (progress.status === 'complete' || progress.status === 'error') {
        setTimeout(() => {
          const currentProgress = this.lastTradingAnalysisByUser.get(userId);
          if (currentProgress === progress) {
            this.lastTradingAnalysisByUser.delete(userId);
          }
        }, 90000);
      }
    }
  }
}
