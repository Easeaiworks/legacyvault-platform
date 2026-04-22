// Seed script for local development only.
// Run: npm run db:seed (from packages/database)
//
// Creates a sample INDIVIDUAL tenant with one user + principal + a few assets
// so the frontend has realistic data to develop against.

import { PrismaClient, TenantType, Role, UserStatus, AssetCategory, AssetType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed in production.');
  }

  console.log('Seeding dev data...');

  const tenant = await prisma.tenant.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      type: TenantType.INDIVIDUAL,
      name: 'Demo User',
      jurisdiction: 'US',
    },
  });

  const user = await prisma.user.upsert({
    where: { authProviderId: 'dev-user-1' },
    update: {},
    create: {
      tenantId: tenant.id,
      authProviderId: 'dev-user-1',
      authProvider: 'local',
      email: 'demo@legacyvault.local',
      emailVerifiedAt: new Date(),
      firstName: 'Ada',
      lastName: 'Lovelace',
      status: UserStatus.ACTIVE,
      roles: {
        create: [{ role: Role.VAULT_OWNER }],
      },
    },
  });

  const principal = await prisma.principal.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      tenantId: tenant.id,
      ownerUserId: user.id,
      legalFirstName: 'Ada',
      legalLastName: 'Lovelace',
      dateOfBirth: new Date('1985-12-10'),
      residenceCountry: 'US',
      residenceRegion: 'NY',
    },
  });

  await prisma.asset.createMany({
    data: [
      {
        principalId: principal.id,
        category: AssetCategory.BANKING,
        type: AssetType.CHECKING,
        nickname: 'Primary Checking',
        institutionName: 'First National Bank',
        accountLast4: '4532',
        estimatedValueCents: 850000n,
        currency: 'USD',
      },
      {
        principalId: principal.id,
        category: AssetCategory.RETIREMENT,
        type: AssetType.K401,
        nickname: 'Employer 401(k)',
        institutionName: 'Fidelity',
        accountLast4: '9981',
        estimatedValueCents: 12500000n,
        currency: 'USD',
      },
      {
        principalId: principal.id,
        category: AssetCategory.REAL_ESTATE,
        type: AssetType.PRIMARY_RESIDENCE,
        nickname: 'Brooklyn Brownstone',
        estimatedValueCents: 185000000n,
        currency: 'USD',
        location: '123 Main St, Brooklyn, NY',
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded tenant ${tenant.id} with user ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
