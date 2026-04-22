import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WorkOS } from '@workos-inc/node';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * AuthService — orchestration over WorkOS AuthKit (primary) with a local dev fallback.
 *
 * Modes:
 *   - workos: AuthKit hosted login; we verify the resulting sealed session.
 *             Magic link, SSO (SAML/OIDC), and MFA all flow through this path.
 *   - local:  dev-only; seeded user + issued JWT. Rejected in production at startup.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly workos: WorkOS | null;
  private readonly provider: 'workos' | 'clerk' | 'local';

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {
    this.provider = this.config.getOrThrow<'workos' | 'clerk' | 'local'>('AUTH_PROVIDER');
    const key = this.config.get<string>('WORKOS_API_KEY');
    this.workos = this.provider === 'workos' && key ? new WorkOS(key) : null;
  }

  /**
   * Step 1: user submits their email. In workos mode we return an AuthKit URL
   * the client redirects to. In local mode we issue a dev JWT immediately.
   */
  async startLogin(email: string): Promise<{ redirectUrl?: string; devToken?: string }> {
    if (this.provider === 'workos') {
      if (!this.workos) throw new Error('WorkOS not configured');
      const url = this.workos.userManagement.getAuthorizationUrl({
        clientId: this.config.getOrThrow<string>('WORKOS_CLIENT_ID'),
        redirectUri: this.config.getOrThrow<string>('WORKOS_REDIRECT_URI'),
        provider: 'authkit',
        loginHint: email,
        state: this.buildState(),
      });
      return { redirectUrl: url };
    }

    if (this.provider === 'local') {
      // Find or create a local dev user with this email.
      let user = await this.prisma.user.findFirst({
        where: { email: email.toLowerCase(), authProvider: 'local' },
        include: { roles: true },
      });
      if (!user) {
        user = await this.bootstrapLocalUser(email.toLowerCase());
      }
      const token = await this.issueToken(user.id, user.tenantId, user.roles.map((r) => r.role));
      return { devToken: token };
    }

    throw new Error(`Auth provider ${this.provider} not implemented`);
  }

  /**
   * Step 2 (workos mode): the AuthKit redirect comes back with a `code`.
   * We exchange it for the authenticated user + session, upsert our User row,
   * and mint our own JWT for downstream API calls.
   */
  async completeLogin(code: string, _state: string): Promise<{ token: string; user: { id: string; email: string } }> {
    if (!this.workos) throw new UnauthorizedException('WorkOS not configured');

    const res = await this.workos.userManagement.authenticateWithCode({
      clientId: this.config.getOrThrow<string>('WORKOS_CLIENT_ID'),
      code,
    });

    // Upsert the local User record. For MVP we create an INDIVIDUAL tenant
    // per user on first login; family/org membership is wired in Session 3+.
    const email = res.user.email.toLowerCase();
    let user = await this.prisma.user.findFirst({
      where: { authProviderId: res.user.id },
      include: { roles: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          authProviderId: res.user.id,
          authProvider: 'workos',
          email,
          firstName: res.user.firstName ?? null,
          lastName: res.user.lastName ?? null,
          emailVerifiedAt: new Date(),
          status: 'ACTIVE',
          tenant: {
            create: {
              type: 'INDIVIDUAL',
              name: `${res.user.firstName ?? ''} ${res.user.lastName ?? ''}`.trim() || email,
              jurisdiction: 'US',
            },
          },
          principalAccounts: {
            create: {
              tenant: { connect: { id: undefined } } as never, // fixed below
              legalFirstName: res.user.firstName ?? '',
              legalLastName: res.user.lastName ?? '',
              residenceCountry: 'US',
            } as never,
          },
          roles: { create: [{ role: 'VAULT_OWNER' }] },
        },
        include: { roles: true },
      });
      // The Principal was created without a tenantId linkage above because
      // the nested create can't reference the parent's tenant in the same op;
      // fix it with a follow-up update.
      await this.prisma.principal.updateMany({
        where: { ownerUserId: user.id },
        data: { tenantId: user.tenantId },
      });
    } else {
      // Refresh profile data from the identity provider on every login.
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          firstName: res.user.firstName ?? null,
          lastName: res.user.lastName ?? null,
          emailVerifiedAt: new Date(),
        },
      });
    }

    const token = await this.issueToken(user.id, user.tenantId, user.roles.map((r) => r.role));
    return { token, user: { id: user.id, email } };
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

  // ---- helpers ----

  private buildState(): string {
    return randomBytes(16).toString('base64url');
  }

  private async bootstrapLocalUser(email: string) {
    this.logger.warn(`Creating local-dev user ${email} on first sign-in`);
    return this.prisma.user.create({
      data: {
        authProviderId: `local-${email}`,
        authProvider: 'local',
        email,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
        tenant: { create: { type: 'INDIVIDUAL', name: email, jurisdiction: 'US' } },
        principalAccounts: { create: { legalFirstName: '', legalLastName: '', residenceCountry: 'US' } as never },
        roles: { create: [{ role: 'VAULT_OWNER' }] },
      },
      include: { roles: true },
    }) as never;
  }
}
