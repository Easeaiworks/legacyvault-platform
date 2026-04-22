import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ConfigService } from '@nestjs/config';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { Audit } from '../../common/audit/audit.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login/start')
  @Audit({ event: 'auth.login.start' })
  async start(@Body('email') email: string) {
    if (!email) throw new UnauthorizedException('email required');
    return this.auth.startLogin(email);
  }

  @Public()
  @Get('callback')
  @Audit({ event: 'auth.callback' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: FastifyReply,
  ) {
    if (!code) throw new UnauthorizedException('missing code');
    const { token } = await this.auth.completeLogin(code, state);

    const appUrl = this.config.getOrThrow<string>('APP_URL');
    const secure = this.config.get<string>('NODE_ENV') === 'production';
    res
      .setCookie('lv_session', token, {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60,
      })
      .status(HttpStatus.FOUND)
      .redirect(`${appUrl}/app`);
  }

  /**
   * Demo auto-login endpoint. Only usable when DEMO_MODE=true; unconditionally
   * disabled in production unless the operator explicitly opts in. Returns a
   * token for the seeded demo user so anyone visiting /demo on the web app
   * lands in a fully-populated vault.
   */
  @Public()
  @Post('demo/login')
  @Audit({ event: 'auth.demo.login' })
  async demoLogin() {
    if (this.config.get('DEMO_MODE') !== 'true') {
      throw new UnauthorizedException('Demo mode is disabled on this environment.');
    }
    return this.auth.demoLogin();
  }

  @Get('me')
  async me(@Req() req: FastifyRequest & { user?: unknown }) {
    return req.user;
  }

  @Post('logout')
  @Audit({ event: 'auth.logout' })
  async logout(
    @Req() req: FastifyRequest & { user?: { id: string } },
    @Res() res: FastifyReply,
  ) {
    if (req.user?.id) await this.auth.revokeAllSessions(req.user.id);
    res
      .clearCookie('lv_session', { path: '/' })
      .status(HttpStatus.OK)
      .send({ ok: true });
  }
}
