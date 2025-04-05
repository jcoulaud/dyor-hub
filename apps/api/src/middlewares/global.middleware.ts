import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class PublicRouteMiddleware implements NestMiddleware {
  constructor() {}

  // Routes that should be public (no auth required at all)
  private publicRoutes = [
    // Public user profile routes - no auth needed
    /^\/users\/[^/]+\/stats$/, // /users/:username/stats
    /^\/users\/[^/]+\/activity$/, // /users/:username/activity
    /^\/users\/[^/]+$/, // /users/:username (basic profile)
    /^\/users\/[^/]+\/stats\?.+$/, // /users/:username/stats?page=1
    /^\/users\/[^/]+\/activity\?.+$/, // /users/:username/activity?page=1&limit=10
  ];

  use(req: Request, _: Response, next: NextFunction) {
    const normalizedPath = req.path.replace(/^\/api/, '');

    const isPublicRoute = this.publicRoutes.some((pattern) =>
      pattern.test(normalizedPath),
    );

    if (isPublicRoute) {
      (req as any).isPublicRoute = true;
    }

    next();
  }
}
