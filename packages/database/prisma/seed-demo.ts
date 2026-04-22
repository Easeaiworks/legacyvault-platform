// Rich demo seed — loads a fully-populated estate so a first-time demo visitor
// sees the product with meaningful data rather than empty states.
//
// Persona: "Ada Lovelace" — a 39-year-old New York resident with dual-country
// investments (US + some Canadian legacy accounts from a previous employer),
// a spouse, two children, an estranged sibling (executor), an attorney,
// and a documented financial advisor.
//
// Run:  npm run db:seed:demo  (from packages/database)
// Idempotent: safe to re-run; upserts by stable IDs.

import {
  PrismaClient,
  TenantType,
  Role,
  UserStatus,
  AssetCategory,
  AssetType,
  AssetStatus,
  Relationship,
  BeneficiaryDesignation,
  AccessTier,
  TriggerType,
  DocumentCategory,
  InstructionCategory,
  RegistryVisibility,
} from '@prisma/client';

const prisma = new PrismaClient();

const IDS = {
  tenant: '10000000-0000-0000-0000-000000000001',
  user: '10000000-0000-0000-0000-000000000002',
  principal: '10000000-0000-0000-0000-000000000003',
  persons: {
    spouse:   '10000000-0000-0000-0000-000000000010',
    child1:   '10000000-0000-0000-0000-000000000011',
    child2:   '10000000-0000-0000-0000-000000000012',
    parent:   '10000000-0000-0000-0000-000000000013',
    sibling:  '10000000-0000-0000-0000-000000000014',
    attorney: '10000000-0000-0000-0000-000000000015',
    advisor:  '10000000-0000-0000-0000-000000000016',
    friend:   '10000000-0000-0000-0000-000000000017',
  },
};

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_DEMO_SEED) {
    throw new Error(
      'Refusing to seed demo data in production without ALLOW_DEMO_SEED=true',
    );
  }
  console.log('Seeding demo estate…');

  // --- Tenant, User, Principal ---
  const tenant = await prisma.tenant.upsert({
    where: { id: IDS.tenant },
    update: {},
    create: {
      id: IDS.tenant,
      type: TenantType.INDIVIDUAL,
      name: 'Ada Lovelace',
      jurisdiction: 'US',
    },
  });

  const user = await prisma.user.upsert({
    where: { authProviderId: 'demo-ada-lovelace' },
    update: {},
    create: {
      id: IDS.user,
      tenantId: tenant.id,
      authProviderId: 'demo-ada-lovelace',
      authProvider: 'local',
      email: 'demo@legacyvault.app',
      emailVerifiedAt: new Date(),
      firstName: 'Ada',
      lastName: 'Lovelace',
      status: UserStatus.ACTIVE,
      lastCheckInAt: new Date(Date.now() - 12 * 86_400_000), // 12 days ago — healthy
      roles: { create: [{ role: Role.VAULT_OWNER }] },
    },
  });

  const principal = await prisma.principal.upsert({
    where: { id: IDS.principal },
    update: {},
    create: {
      id: IDS.principal,
      tenantId: tenant.id,
      ownerUserId: user.id,
      legalFirstName: 'Ada',
      legalMiddleName: 'Augusta',
      legalLastName: 'Lovelace',
      priorNames: [{ firstName: 'Ada', lastName: 'Byron', type: 'maiden' }],
      dateOfBirth: new Date('1985-12-10'),
      residenceRegion: 'NY',
      residenceCountry: 'US',
    },
  });

  // --- People in Ada's life ---
  const people = await Promise.all([
    upsertPerson(IDS.persons.spouse,   principal.id, 'Charles',  'Babbage',   Relationship.SPOUSE,            'charles@example.com'),
    upsertPerson(IDS.persons.child1,   principal.id, 'Byron',    'Lovelace',  Relationship.CHILD,             null),
    upsertPerson(IDS.persons.child2,   principal.id, 'Anne',     'Lovelace',  Relationship.CHILD,             null),
    upsertPerson(IDS.persons.parent,   principal.id, 'Anne',     'Byron',     Relationship.PARENT,            'anne.byron@example.com'),
    upsertPerson(IDS.persons.sibling,  principal.id, 'Augusta',  'Byron',     Relationship.SIBLING,           'augusta@example.com'),
    upsertPerson(IDS.persons.attorney, principal.id, 'Mary',     'Somerville',Relationship.ATTORNEY,          'mary@somerville-law.example.com'),
    upsertPerson(IDS.persons.advisor,  principal.id, 'Michael',  'Faraday',   Relationship.FINANCIAL_ADVISOR, 'michael@royal-advisors.example.com'),
    upsertPerson(IDS.persons.friend,   principal.id, 'Charles',  'Dickens',   Relationship.FRIEND,            null),
  ]);
  console.log(`  + ${people.length} people`);

  // --- Assets (15 of them, spanning categories + countries) ---
  await upsertAsset('Primary Checking',        principal.id, AssetCategory.BANKING,     AssetType.CHECKING,            'Chase',          '4532',  850_000n,     'USD');
  await upsertAsset('Emergency Savings',       principal.id, AssetCategory.BANKING,     AssetType.SAVINGS,             'Chase',          '4540',  4_200_000n,   'USD');
  await upsertAsset('Joint Money Market',      principal.id, AssetCategory.BANKING,     AssetType.MONEY_MARKET,        'Ally',           '7812',  2_150_000n,   'USD');
  await upsertAsset('Vanguard Brokerage',      principal.id, AssetCategory.INVESTMENT,  AssetType.BROKERAGE,           'Vanguard',       '2201',  18_400_000n,  'USD');
  await upsertAsset('Employer 401(k)',         principal.id, AssetCategory.RETIREMENT,  AssetType.K401,                'Fidelity',       '9981',  34_250_000n,  'USD');
  await upsertAsset('Roth IRA',                principal.id, AssetCategory.RETIREMENT,  AssetType.IRA_ROTH,            'Fidelity',       '9120',  8_900_000n,   'USD');
  await upsertAsset('Legacy RRSP (2012-2016)', principal.id, AssetCategory.RETIREMENT,  AssetType.RRSP,                'RBC',            '5501',  4_800_000n,   'CAD');
  await upsertAsset('Brooklyn Brownstone',     principal.id, AssetCategory.REAL_ESTATE, AssetType.PRIMARY_RESIDENCE,   null,             null,    185_000_000n, 'USD', '432 Jay Street, Brooklyn, NY 11201');
  await upsertAsset('Hudson Valley Cabin',     principal.id, AssetCategory.REAL_ESTATE, AssetType.SECONDARY_RESIDENCE, null,             null,    62_500_000n,  'USD', '17 Ridge Rd, Catskill, NY');
  await upsertAsset('Term Life — 20yr',        principal.id, AssetCategory.INSURANCE,   AssetType.LIFE_INSURANCE_TERM, 'Northwestern',   '3321',  200_000_000n, 'USD');
  await upsertAsset('Whole Life',              principal.id, AssetCategory.INSURANCE,   AssetType.LIFE_INSURANCE_WHOLE,'MassMutual',     '6720',  50_000_000n,  'USD');
  await upsertAsset('Volvo XC90 (2022)',       principal.id, AssetCategory.PHYSICAL,    AssetType.VEHICLE,             null,             null,    4_200_000n,   'USD');
  await upsertAsset('Grandmother\'s Pearls',  principal.id, AssetCategory.PHYSICAL,    AssetType.JEWELRY,             null,             null,    1_800_000n,   'USD', 'Safe deposit box, Chase Brooklyn Heights, Box 412');
  await upsertAsset('Coinbase',                principal.id, AssetCategory.CRYPTO,      AssetType.CRYPTO_CUSTODIAL,    'Coinbase',       null,    320_000n,     'USD');
  await upsertAsset('Remaining mortgage',      principal.id, AssetCategory.DEBT,        AssetType.MORTGAGE,            'Wells Fargo',    '0011', -48_000_000n,  'USD');
  console.log('  + 15 assets');

  // --- Beneficiaries (includes a deliberate conflict so the UI demonstrates detection) ---
  const assetList = await prisma.asset.findMany({ where: { principalId: principal.id } });
  const a = Object.fromEntries(assetList.map((x) => [x.nickname, x.id]));

  // Spouse primary on most accounts; children split on the brokerage.
  // Roth IRA missing beneficiary — will fire the conflict engine.
  await bene(principal.id, a['Primary Checking'],   IDS.persons.spouse, 'PRIMARY', 10000);
  await bene(principal.id, a['Emergency Savings'],  IDS.persons.spouse, 'PRIMARY', 10000);
  await bene(principal.id, a['Joint Money Market'], IDS.persons.spouse, 'PRIMARY', 10000);

  await bene(principal.id, a['Vanguard Brokerage'], IDS.persons.child1, 'PRIMARY', 5000);
  await bene(principal.id, a['Vanguard Brokerage'], IDS.persons.child2, 'PRIMARY', 5000);

  await bene(principal.id, a['Employer 401(k)'], IDS.persons.spouse, 'PRIMARY', 10000);
  // Roth IRA intentionally has no beneficiary — conflict detector flags this.

  // RRSP: spouse primary on 401k but NOT on the RRSP — triggers "inconsistent coverage" warning.
  await bene(principal.id, a['Legacy RRSP (2012-2016)'], IDS.persons.parent, 'PRIMARY', 10000);

  await bene(principal.id, a['Term Life — 20yr'],  IDS.persons.spouse, 'PRIMARY', 10000);
  await bene(principal.id, a['Term Life — 20yr'],  IDS.persons.child1, 'CONTINGENT', 5000);
  await bene(principal.id, a['Term Life — 20yr'],  IDS.persons.child2, 'CONTINGENT', 5000);

  await bene(principal.id, a['Whole Life'],        IDS.persons.spouse, 'PRIMARY', 10000);

  // Brownstone designations under-allocated: only 80% assigned — triggers error-level conflict.
  await bene(principal.id, a['Brooklyn Brownstone'], IDS.persons.spouse, 'PRIMARY', 8000);

  console.log('  + beneficiaries with 1 missing + 1 under-allocated + 1 inconsistent (demos the conflict engine)');

  // --- Trusted contacts ---
  await upsertTrustedContact(principal.id, IDS.persons.spouse,   AccessTier.EXECUTOR,    TriggerType.CHECK_IN_MISSED, 7);
  await upsertTrustedContact(principal.id, IDS.persons.sibling,  AccessTier.EXECUTOR,    TriggerType.DEATH_CERTIFIED, 14);
  await upsertTrustedContact(principal.id, IDS.persons.attorney, AccessTier.VIEW_GENERAL,TriggerType.CHECK_IN_MISSED, 30);
  console.log('  + 3 trusted contacts');

  // --- Instructions (letters & wishes) ---
  await upsertInstruction(principal.id, InstructionCategory.LETTER_OF_WISHES,
    'Letter to my executor',
    'My dear Augusta — the attached will is the legal document; this letter is the human one. Please focus first on the children. Their day-to-day routines, school schedules, and emotional ballast are more important than the financial decisions. For those, consult with Mary Somerville; she understands my priorities.');
  await upsertInstruction(principal.id, InstructionCategory.FUNERAL_PREFERENCES,
    'My service',
    'Small. Family only. A modest gathering at the Hudson Valley cabin rather than a formal service. I would like a string quartet and real coffee, not the church kind. No speeches about my work — only family stories.');
  await upsertInstruction(principal.id, InstructionCategory.PET_CARE,
    'Caring for Luna (our cat)',
    'Luna takes her medication hidden in salmon pâté. She hates strangers for the first 48 hours; give her space. Her vet is Dr. Patel, East Village Vet, 212-555-0141. If neither Charles nor the children can keep her, Charles Dickens has offered.');
  await upsertInstruction(principal.id, InstructionCategory.DIGITAL_ACCOUNT_DISPOSITION,
    'Digital accounts',
    'Facebook → memorialize. Twitter → delete. Google account → download archive for the children and then delete. iCloud photo library → full export for the family shared album. Passwords are in the 1Password vault; emergency access is configured for Charles.');
  await upsertInstruction(principal.id, InstructionCategory.PERSONAL_MESSAGE,
    'A note for Byron and Anne',
    'My darlings — if you\'re reading this you are older than I hoped to see you become. Know that every choice I made, I made thinking of you. Be kind to your father. Be kind to each other. Be brave.');
  console.log('  + 5 instructions');

  // --- Registry entry — opted in, identity verified, institutions-only visibility ---
  await prisma.registryEntry.upsert({
    where: { principalId: principal.id },
    update: {
      visibility: RegistryVisibility.INSTITUTIONS_VERIFIED_ONLY,
      identityVerifiedAt: new Date('2024-06-15'),
      identityProvider: 'stripe_identity_demo',
      nameVariations: [
        { firstName: 'Ada', lastName: 'Byron', type: 'maiden', usedFrom: '1985-12-10', usedTo: '2011-05-14' },
        { firstName: 'A.', middleName: 'Augusta', lastName: 'Lovelace', type: 'transliteration' },
      ] as never,
      addressHistory: [
        { country: 'US', region: 'NY', city: 'Brooklyn', from: '2014-03-01' },
        { country: 'US', region: 'MA', city: 'Cambridge', from: '2008-08-15', to: '2014-02-28' },
        { country: 'CA', region: 'ON', city: 'Toronto', from: '2011-05-01', to: '2016-07-01' },
      ] as never,
    },
    create: {
      principalId: principal.id,
      visibility: RegistryVisibility.INSTITUTIONS_VERIFIED_ONLY,
      identityVerifiedAt: new Date('2024-06-15'),
      identityProvider: 'stripe_identity_demo',
      nameVariations: [
        { firstName: 'Ada', lastName: 'Byron', type: 'maiden' },
      ] as never,
      addressHistory: [
        { country: 'US', region: 'NY', city: 'Brooklyn', from: '2014-03-01' },
      ] as never,
    },
  });
  console.log('  + registry entry (verified, institutions-only)');

  // --- Sample documents (metadata only — no S3 bytes in demo) ---
  const docs = [
    { title: 'Last Will and Testament (2024)',  category: DocumentCategory.WILL },
    { title: 'Revocable Living Trust',          category: DocumentCategory.TRUST },
    { title: 'Durable Power of Attorney',       category: DocumentCategory.POWER_OF_ATTORNEY },
    { title: 'Healthcare Directive',            category: DocumentCategory.HEALTHCARE_DIRECTIVE },
    { title: 'Brownstone Deed',                 category: DocumentCategory.DEED },
    { title: 'MassMutual Whole Life Policy',    category: DocumentCategory.INSURANCE_POLICY },
    { title: '2024 Joint Federal Return',       category: DocumentCategory.TAX_RETURN },
    { title: 'Marriage Certificate',            category: DocumentCategory.MARRIAGE_CERTIFICATE },
  ];
  for (const d of docs) {
    await prisma.document.upsert({
      where: { s3Key: `demo/${d.title.replace(/\s+/g, '-')}.pdf` },
      update: {},
      create: {
        principalId: principal.id,
        category: d.category,
        title: d.title,
        s3Key: `demo/${d.title.replace(/\s+/g, '-')}.pdf`,
        contentSha256: '0'.repeat(64),
        sizeBytes: BigInt(1024 * 1024 * Math.floor(Math.random() * 8 + 1)),
        mimeType: 'application/pdf',
        uploadedById: user.id,
        tags: ['demo'],
      },
    });
  }
  console.log(`  + ${docs.length} document records (metadata only)`);

  console.log('\nDemo seed complete.');
  console.log('  Login:  demo@legacyvault.app (AUTH_PROVIDER=local)');
  console.log('  Or visit /demo to auto-sign in.');
}

// ---- helpers ----

async function upsertPerson(
  id: string,
  principalId: string,
  firstName: string,
  lastName: string,
  relationship: Relationship,
  email: string | null,
) {
  return prisma.person.upsert({
    where: { id },
    update: {},
    create: { id, principalId, firstName, lastName, relationship, email },
  });
}

async function upsertAsset(
  nickname: string,
  principalId: string,
  category: AssetCategory,
  type: AssetType,
  institutionName: string | null,
  accountLast4: string | null,
  estimatedValueCents: bigint | null,
  currency: string,
  location?: string,
) {
  const existing = await prisma.asset.findFirst({ where: { principalId, nickname } });
  if (existing) return existing;
  return prisma.asset.create({
    data: {
      principalId,
      category,
      type,
      nickname,
      institutionName,
      accountLast4,
      estimatedValueCents,
      currency,
      location: location ?? null,
      status: AssetStatus.ACTIVE,
    },
  });
}

async function bene(
  principalId: string,
  assetId: string,
  personId: string,
  designation: string,
  shareBps: number,
) {
  const existing = await prisma.beneficiary.findFirst({
    where: { principalId, assetId, personId, designation: designation as BeneficiaryDesignation },
  });
  if (existing) return existing;
  return prisma.beneficiary.create({
    data: {
      principalId,
      assetId,
      personId,
      designation: designation as BeneficiaryDesignation,
      shareBps,
    },
  });
}

async function upsertTrustedContact(
  principalId: string,
  personId: string,
  accessTier: AccessTier,
  triggerType: TriggerType,
  waitingPeriodDays: number,
) {
  const existing = await prisma.trustedContact.findFirst({ where: { principalId, personId } });
  if (existing) return existing;
  return prisma.trustedContact.create({
    data: {
      principalId,
      personId,
      accessTier,
      triggerType,
      waitingPeriodDays,
    },
  });
}

async function upsertInstruction(
  principalId: string,
  category: InstructionCategory,
  title: string,
  body: string,
) {
  const existing = await prisma.instruction.findFirst({ where: { principalId, title } });
  if (existing) return existing;
  // Body is NOT encrypted in the demo seed — encryption happens at the app layer,
  // and this seed runs at the DB layer directly. That means bodyEncrypted stores
  // plaintext here; the API's decrypt() will fail gracefully. The demo UI still
  // shows the title/category, which is what the demo needs.
  return prisma.instruction.create({
    data: { principalId, category, title, bodyEncrypted: body },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
