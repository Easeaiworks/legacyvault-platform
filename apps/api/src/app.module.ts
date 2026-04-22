import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './common/config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AuditModule } from './common/audit/audit.module';
import { StorageModule } from './common/storage/storage.module';
import { AuditInterceptor } from './common/audit/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { AssetsModule } from './modules/assets/assets.module';
import { PersonsModule } from './modules/persons/persons.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { BeneficiariesModule } from './modules/beneficiaries/beneficiaries.module';
import { TrustedContactsModule } from './modules/trusted-contacts/trusted-contacts.module';
import { InstructionsModule } from './modules/instructions/instructions.module';
import { ExportModule } from './modules/export/export.module';
import { RegistryModule } from './modules/registry/registry.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
          '*.password',
          '*.ssn',
          '*.sin',
          '*.govId',
          '*.accountNumber',
        ],
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
        limit: Number(process.env.RATE_LIMIT_MAX ?? 100),
      },
    ]),
    PrismaModule,
    CryptoModule,
    AuditModule,
    StorageModule,
    AuthModule,
    HealthModule,
    AssetsModule,
    PersonsModule,
    DocumentsModule,
    BeneficiariesModule,
    TrustedContactsModule,
    InstructionsModule,
    ExportModule,
    RegistryModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
