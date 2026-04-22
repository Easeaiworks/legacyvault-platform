import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global guard — accepts either:
 *   - Authorization: Bearer <jwt> header (API / mobile clients, local dev)
 *   - lv_session HttpOnly cookie (web app after WorkOS callback)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers?.authorization;
    const cookieToken: string | undefined = req.cookies?.lv_session;

    const token = header?.startsWith('Bearer ') ? header.slice(7) : cookieToken;
    if (!token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<{
        sub: string;
        tenantId: string;
        roles?: string[];
      }>(token);
      req.user = {
        id: payload.sub,
        tenantId: payload.tenantId,
        roles: payload.roles ?? [],
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
