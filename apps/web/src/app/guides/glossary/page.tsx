import Link from 'next/link';
import { cookies } from 'next/headers';
import { FlagToggle } from '@/components/flag-toggle';

interface Term {
  term: string;
  definition: string;
  country?: 'US' | 'CA';
}

const TERMS: Term[] = [
  // Universal core
  {
    term: 'Administrator',
    definition:
      'The person appointed by the court to settle an estate when there is no will (US) or no executor named. Analogous role to an executor, but chosen by the court from among close relatives under a statutory priority.',
  },
  {
    term: 'Attestation',
    definition:
      'The formal witnessing of a will’s signing. Most jurisdictions require two disinterested witnesses. Improper attestation is the most common cause of will invalidation.',
  },
  {
    term: 'Beneficiary',
    definition:
      'A person or entity named to receive an asset. Named beneficiaries on retirement accounts, insurance policies, and TOD/POD accounts inherit those assets directly, bypassing the will.',
  },
  {
    term: 'Bequest',
    definition:
      'A gift of personal property made in a will. Contrasts with a devise (gift of real property). Modern statutes often use bequest for both.',
  },
  {
    term: 'Capacity',
    definition:
      'The legal ability to make a valid will or estate planning document. Requires understanding of the nature of the act, the extent of one’s property, and the natural objects of one’s bounty (i.e. close family). Lack of capacity is a common ground for challenge.',
  },
  {
    term: 'Codicil',
    definition:
      'A formal amendment to an existing will. Requires the same signing formalities as the will itself. Multiple codicils can make an estate plan confusing; a full re-execution of the will is often cleaner.',
  },
  {
    term: 'Contingent beneficiary',
    definition:
      'The backup beneficiary who inherits if the primary beneficiary predeceases the account holder or disclaims. Naming one is essential; without a contingent, the asset falls to the estate.',
  },
  {
    term: 'Deemed disposition',
    definition:
      'A tax concept, especially prominent in Canadian tax law, in which assets are treated as if they were sold at death (or at another triggering event) even though no actual sale has occurred. Triggers capital gains tax on accrued gains.',
    country: 'CA',
  },
  {
    term: 'Devise',
    definition:
      'Historically, a gift of real property made in a will. Now largely synonymous with bequest.',
  },
  {
    term: 'Digital asset',
    definition:
      'Any asset that exists in digital form or is accessible only online: cryptocurrency, cloud-stored photos, domain names, subscription accounts, online business inventory. Many jurisdictions have specific fiduciary access laws (RUFADAA in most US states; broadly similar rules in Canadian provinces).',
  },
  {
    term: 'Disclaim',
    definition:
      'To formally refuse an inheritance. A disclaimed asset is treated as if the disclaiming beneficiary had predeceased the deceased, so it passes to the next beneficiary. Must generally be done within nine months (US) or a similar window.',
  },
  {
    term: 'Escheat',
    definition:
      'The reversion of unclaimed property to the state or province after a statutory dormancy period. Unclaimed bank accounts, uncashed cheques, and unfound safe-deposit contents typically escheat after 3–7 years of inactivity.',
  },
  {
    term: 'Estate',
    definition:
      'The collection of everything a person owned at death, minus what already passed by beneficiary designation, joint tenancy, or trust. The estate is what the will governs.',
  },
  {
    term: 'Executor',
    definition:
      'The person named in a will to administer the estate: gather assets, pay debts and taxes, and distribute what remains. Also called personal representative (US) or estate trustee (Ontario).',
  },
  {
    term: 'Fiduciary',
    definition:
      'A person legally required to act in another’s best interest, with duties of loyalty, care, and impartiality. Executors, trustees, powers of attorney, and financial advisors in some capacities are fiduciaries.',
  },
  {
    term: 'Grant of probate',
    definition:
      'The court document (called Letters Testamentary in the US) authorizing the executor to act on behalf of the estate. Third parties (banks, land registrars) require it before releasing assets.',
    country: 'CA',
  },
  {
    term: 'Guardian',
    definition:
      'The person named to raise minor children. Named in a will; can be challenged, but the will’s designation carries substantial weight.',
  },
  {
    term: 'Healthcare directive',
    definition:
      'A document expressing your wishes about medical treatment if you cannot communicate them yourself. Also called a living will, advance directive, personal directive, or healthcare power of attorney depending on the jurisdiction.',
  },
  {
    term: 'Holographic will',
    definition:
      'A will written entirely in the deceased’s own handwriting, without witnesses. Accepted in some states and provinces, not in others. Even where accepted, holographic wills are routinely challenged.',
  },
  {
    term: 'Intestate',
    definition:
      'Dying without a valid will. State or provincial intestacy statutes then dictate who inherits, following a rigid formula that ignores relationships and specific wishes.',
  },
  {
    term: 'Joint tenancy with right of survivorship',
    definition:
      'Ownership structure where two or more people own an asset together; when one dies, the survivor(s) automatically own the whole. Bypasses probate. Contrasts with tenancy in common, where each owner’s share passes through their estate.',
  },
  {
    term: 'Life-interest / life estate',
    definition:
      'A right to use or receive income from an asset for one’s lifetime, with the underlying asset passing to a different beneficiary at death. Common in second-marriage planning: current spouse has the life interest, children from a prior marriage are the remainder beneficiaries.',
  },
  {
    term: 'Living trust',
    definition:
      'A trust created and funded during your lifetime. Most commonly revocable, meaning you can change or dissolve it. Assets in the trust bypass probate at death.',
  },
  {
    term: 'Marital deduction',
    definition:
      'US federal estate tax rule allowing unlimited transfers to a US-citizen spouse without estate tax. Non-citizen spouses are subject to different (much stricter) rules; a Qualified Domestic Trust (QDOT) may be required.',
    country: 'US',
  },
  {
    term: 'Multiple wills',
    definition:
      'A drafting strategy in some Canadian provinces (notably Ontario) using two wills — one for probated assets, one for private assets (like private company shares) — to reduce probate fees. Requires precise drafting.',
    country: 'CA',
  },
  {
    term: 'Payable-on-death (POD) / Transfer-on-death (TOD)',
    definition:
      'Beneficiary designation options on bank and brokerage accounts. Assets transfer directly to the named beneficiary at death, bypassing probate. Available in most US states; more limited in Canada.',
  },
  {
    term: 'Per stirpes / per capita',
    definition:
      'How an inheritance is divided among descendants when a beneficiary predeceases the account holder. Per stirpes: the deceased beneficiary’s share is split among their children. Per capita: only surviving beneficiaries share.',
  },
  {
    term: 'Personal representative',
    definition:
      'US term for the person who administers an estate. Combines the roles of executor (if there’s a will) and administrator (if there isn’t).',
    country: 'US',
  },
  {
    term: 'Power of attorney (POA)',
    definition:
      'A legal document authorizing another person to act on your behalf. Financial POAs cover money and property; healthcare POAs (or personal directives) cover medical decisions. “Durable” or “enduring” POAs continue to be valid if you become incapacitated.',
  },
  {
    term: 'Probate',
    definition:
      'The court-supervised process of validating a will and authorizing the executor to distribute the estate. In some jurisdictions (California, Ontario) probate is expensive and slow; in others (Alberta, small US estates) it is quick and cheap.',
  },
  {
    term: 'Residue / residuary estate',
    definition:
      'What remains of the estate after specific bequests, debts, taxes, and expenses have been paid. The residuary beneficiary receives everything not specifically given away elsewhere.',
  },
  {
    term: 'Right of election / spousal share',
    definition:
      'Statutory right of a surviving spouse to elect a minimum share of the deceased spouse’s estate, regardless of what the will says. Prevents disinheritance of spouses in most jurisdictions.',
  },
  {
    term: 'Rollover',
    definition:
      'Transfer of retirement account or registered plan assets to a spouse (or certain dependants) at death without immediate tax consequences. RRSP/RRIF rollover to a spouse (Canada) and IRA rollover to a spouse (US) are among the most valuable estate tax planning tools.',
  },
  {
    term: 'Small estate procedure',
    definition:
      'Simplified probate process available in most US states (and some Canadian provinces) for estates under a threshold amount — typically $50,000–$150,000. Skips much of the paperwork and delay of full probate.',
  },
  {
    term: 'Spousal trust / testamentary spouse trust',
    definition:
      'Canadian trust created in a will for the benefit of a surviving spouse or common-law partner. Qualifies for tax rollover of capital assets — the trust receives assets at their cost base and defers gain until the spouse’s death.',
    country: 'CA',
  },
  {
    term: 'Successor',
    definition:
      'A general term for a person who takes over a role. Successor trustee: takes over management of a trust. Successor executor: named in the will to serve if the primary executor cannot.',
  },
  {
    term: 'Testamentary',
    definition:
      'Relating to a will. A testamentary trust is one created inside a will; a testamentary gift is a gift made by will.',
  },
  {
    term: 'Testator / testatrix',
    definition:
      'The person who makes a will. Testator historically for men, testatrix for women; modern usage is gender-neutral.',
  },
  {
    term: 'Trustee',
    definition:
      'The person or institution responsible for managing a trust. Duties include following the trust document, investing prudently, keeping records, filing tax returns, and distributing to beneficiaries.',
  },
  {
    term: 'Uniform Transfers to Minors Act (UTMA)',
    definition:
      'US statutory framework allowing an adult custodian to hold assets on behalf of a minor. Assets are held until the age of majority, then transfer outright. Simpler than a trust for smaller amounts.',
    country: 'US',
  },
  {
    term: 'Undue influence',
    definition:
      'A legal ground for challenging a will, based on the argument that the testator was pressured into terms they would not have chosen freely. Most common in cases involving elderly testators and caregivers.',
  },
  {
    term: 'WESA (Wills, Estates and Succession Act)',
    definition:
      'British Columbia’s consolidated estate legislation, in force since 2014. Governs wills, intestacy, and estate administration in BC. Similar legislation exists in other provinces under different names.',
    country: 'CA',
  },
];

export default async function GlossaryPage() {
  const c = await cookies();
  const country: 'US' | 'CA' = c.get('lv_country')?.value === 'CA' ? 'CA' : 'US';

  const visible = TERMS.filter((t) => !t.country || t.country === country);
  const sorted = [...visible].sort((a, b) => a.term.localeCompare(b.term));

  return (
    <div className="min-h-screen bg-paper">
      <PublicNav />

      <section className="border-b border-ink-200 bg-paper px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-700">
            Estate planning glossary
          </div>
          <h1 className="font-serif text-5xl font-medium tracking-tight text-navy-900">
            The words estate planners use
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-700">
            {country === 'CA'
              ? 'Every term you’re likely to encounter with a Canadian estate lawyer or notary — in plain English.'
              : 'Every term you’re likely to encounter with a US estate attorney or financial planner — in plain English.'}
          </p>
          <p className="mt-3 text-sm text-ink-500">
            Terms marked <span className="rounded bg-ink-100 px-1.5 py-0.5 text-xs">{country}</span>{' '}
            are specific to your jurisdiction. Toggle the flag above to see the other country’s
            terms.
          </p>
        </div>
      </section>

      <section className="bg-paper-warm px-6 py-14">
        <div className="mx-auto max-w-4xl">
          <dl className="divide-y divide-ink-200 rounded-3xl border border-ink-200 bg-paper shadow-soft">
            {sorted.map((t) => (
              <div key={t.term} className="p-6">
                <dt className="flex items-center gap-3 font-serif text-lg text-navy-900">
                  {t.term}
                  {t.country && (
                    <span className="rounded bg-ink-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-ink-500">
                      {t.country}
                    </span>
                  )}
                </dt>
                <dd className="mt-2 text-ink-700">{t.definition}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 text-center text-sm text-ink-500">
            Missing a term? <Link href="/contact" className="underline">Suggest an addition.</Link>
          </p>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}

function PublicNav() {
  return (
    <nav className="border-b border-ink-200 bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-serif text-2xl tracking-tight text-navy-900">
          LegacyVault
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/guides" className="text-sm text-navy-700 hover:text-navy-900">
            Guides
          </Link>
          <Link
            href="/calculators/cost-of-dying"
            className="text-sm text-navy-700 hover:text-navy-900"
          >
            Calculators
          </Link>
          <FlagToggle />
          <Link href="/login" className="text-sm text-navy-700 hover:text-navy-900">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-md bg-navy-700 px-4 py-2 text-sm font-medium text-paper hover:bg-navy-900"
          >
            Register — free
          </Link>
        </div>
      </div>
    </nav>
  );
}

function PublicFooter() {
  return (
    <footer className="bg-navy-900 py-16 text-center">
      <div className="mx-auto max-w-3xl px-6">
        <div className="font-serif text-4xl font-medium tracking-tight text-paper">
          Take good care.
        </div>
        <div className="mt-3 text-sm text-ink-300">
          The trust layer beneath everything you&apos;ll leave behind.
        </div>
        <div className="mt-10 text-xs text-ink-500">
          Definitions are educational. Not legal advice. Terminology varies by jurisdiction.
          Verify specific applications with a qualified attorney or notary.
        </div>
      </div>
    </footer>
  );
}
