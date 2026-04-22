import { Body, Controller, Get, Post, Query, Req, UnauthorizedException } from '@nestjs/common';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { Audit } from '../../common/audit/audit.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Kick off an auth flow. In WorkOS mode returns an AuthKit URL.
   * In local/dev mode issues a short-lived token against a seeded user.
   */
  @Public()
  @Post('login/start')
  @Audit({ event: 'auth.login.start' })
  async start(@Body('email') email: string) {
    if (!email) throw new UnauthorizedException('email required');
    return this.auth.startLogin(email);
  }

  /** OAuth callback from WorkOS / Clerk. */
  @Public()
  @Get('callback')
  @Audit({ event: 'auth.callback' })
  async callback(@Query('code') code: string, @Query('state') state: string) {
    return this.auth.completeLogin(code, state);
  }

  @Get('me')
  async me(@Req() req: { user: unknown }) {
    return req.user;
  }

  @Post('logout')
  @Audit({ event: 'auth.logout' })
  async logout(@Req() req: { user?: { id: string } }) {
    if (req.user?.id) await this.auth.revokeAllSessions(req.user.id);
    return { ok: true };
  }
}
