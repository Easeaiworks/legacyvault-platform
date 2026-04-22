import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * AuthService — thin orchestration layer over the external auth provider.
 *
 * Modes:
 *   - workos: redirects through WorkOS AuthKit; verifies tokens from their JWKS.
 *   - clerk:  same pattern, different SDK — left as a TODO to keep scope tight.
 *   - local:  dev-only; issues a JWT against a seeded user so the frontend can
 *             run without external dependencies. Rejected at startup in production
 *             (see env.validation).
 *
 * We intentionally DO NOT implement password auth here. Enterprise customers need
 * SSO (SAML/OIDC) which WorkOS delivers out of the box. Consumer users get magic
 * link / OTP through the same provider.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async startLogin(email: string): Promise<{ redirectUrl?: string; devToken?: string }> {
    const provider = this.config.getOrThrow<'workos' | 'clerk' | 'local'>('AUTH_PROVIDER');

    if (provider === 'workos') {
      // Implementation sketch — requires @workos-inc/node:
      //   const workos = new WorkOS(this.config.getOrThrow('WORKOS_API_KEY'));
      //   const url = workos.userManagement.getAuthorizationUrl({
      //     clientId: this.config.getOrThrow('WORKOS_CLIENT_ID'),
      //     redirectUri: this.config.getOrThrow('WORKOS_REDIRECT_URI'),
      //     provider: 'authkit',
      //     loginHint: email,
      //   });
      //   return { redirectUrl: url };
      throw new Error('WorkOS integration TODO — wire up in Session 2.');
    }

    if (provider === 'local') {
      // Dev-only shortcut: look up a seeded user by email, issue a JWT.
      const user = await this.prisma.user.findFirst({
        where: { email: email.toLowerCase(), authProvider: 'local' },
        include: { roles: true },
      });
      if (!user) throw new UnauthorizedException('No dev user — run db:seed first');
      const token = await this.issueToken(user.id, user.tenantId, user.roles.map((r) => r.role));
      return { devToken: token };
    }

    throw new Error(`Auth provider ${provider} not implemented`);
  }

  async completeLogin(_code: string, _state: string): Promise<never> {
    throw new Error('OAuth callback handler TODO — implement in Session 2.');
  }

  async issueToken(userId: string, tenantId: string, roles: string[]): Promise<string> {
    return this.jwt.signAsync({ sub: userId, tenantId, roles });
  }

  async createRefreshSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
    const raw = randomBytes(48).toString('base64url');
    const hash = createHash('sha256').update(raw).digest('hex');
    const ttlDays = Number(this.config.get('JWT_REFRESH_EXPIRES_IN', '7d').replace('d', ''));
    await this.prisma.session.create({
      data: {
        userId,
        refreshHash: hash,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        expiresAt: new Date(Date.now() + ttlDays * 86400_000),
      },
    });
    return raw;
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
