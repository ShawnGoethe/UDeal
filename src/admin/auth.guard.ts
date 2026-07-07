import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'udeal-admin-secret-2026';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/admin/auth/login',
  '/admin/auth/verify',
];

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path;

    // Only protect /admin/* routes — everything else is public
    if (!path.startsWith('/admin')) {
      return true;
    }

    // Allow public routes
    if (PUBLIC_ROUTES.some(r => path.startsWith(r))) {
      return true;
    }

    // Allow serving HTML pages (auth check happens client-side)
    if (request.method === 'GET' && (path === '/admin' || path === '/admin/' || path === '/admin/login')) {
      return true;
    }

    // Extract token from Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录');
    }

    const token = authHeader.slice(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
      (request as any).user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }
  }
}
