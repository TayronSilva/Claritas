import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { StudentsModule } from './students/students.module';
import { ChargesModule } from './charges/charges.module';
import { ScholarshipsModule } from './scholarships/scholarships.module';
import { FundModule } from './fund/fund.module';
import { GovernanceModule } from './governance/governance.module';
import { LedgerModule } from './ledger/ledger.module';
import { SolanaModule } from './solana/solana.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    InstitutionsModule,
    StudentsModule,
    ChargesModule,
    ScholarshipsModule,
    FundModule,
    GovernanceModule,
    LedgerModule,
    SolanaModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
