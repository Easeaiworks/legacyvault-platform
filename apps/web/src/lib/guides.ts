import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

/**
 * File-based guide pipeline.
 *
 * Guides live at apps/web/content/guides/<countryLower>/<slug>.md
 * with YAML frontmatter. Jurisdiction cascade at read time:
 *
 *   1. Try the requested country variant (US or CA)
 *   2. Fall back to UNIVERSAL
 *   3. Return null if neither exists
 *
 * Region-specific variants (e.g. Ontario-only) can be added later at
 * content/guides/<countryLower>/<regionLower>/<slug>.md.
 */

export type Country = 'US' | 'CA';

export type Category =
  | 'ESSENTIAL_DOCUMENTS'
  | 'FINANCIAL'
  | 'DIGITAL'
  | 'PRACTICAL';

export interface WithoutWith {
  document: string;
  without: {
    what: string;
    cost: string;
    timeline: string;
  };
  with: {
    what: string;
    cost: string;
    timeline: string;
  };
}

export interface GuideFrontmatter {
  slug: string;
  title: string;
  subtitle?: string;
  country?: Country;
  category: Category;
  readTimeMinutes: number;
  publishedAt: string;
  withoutWith?: WithoutWith;
  scenario?: string;
  nextInApp?: { href: string; label: string };
  professionalCta?: { href: string; label: string };
}

export interface Guide extends GuideFrontmatter {
  bodyMarkdown: string;
  bodyExcerpt: string;
}

const GUIDES_ROOT = path.join(process.cwd(), 'content', 'guides');

function loadFile(country: Country | 'universal', slug: string): Guide | null {
  const rel = country === 'universal' ? 'universal' : country.toLowerCase();
  const full = path.join(GUIDES_ROOT, rel, `${slug}.md`);
  if (!fs.existsSync(full)) return null;
  const raw = fs.readFileSync(full, 'utf8');
  const parsed = matter(raw);
  const fm = parsed.data as GuideFrontmatter;
  return {
    ...fm,
    bodyMarkdown: parsed.content.trim(),
    bodyExcerpt: firstParagraph(parsed.content),
  };
}

function firstParagraph(md: string): string {
  const noFm = md.trim();
  const firstBlock = noFm
    .split(/\n\s*\n/)
    .find((block) => block.trim() && !block.trim().startsWith('#'));
  return (firstBlock ?? '').replace(/\n/g, ' ').slice(0, 220);
}

/**
 * Fetch a single guide for a given (slug, country). Cascades to UNIVERSAL if
 * no country-specific variant is present.
 */
export function getGuide(slug: string, country: Country): Guide | null {
  return loadFile(country, slug) ?? loadFile('universal', slug);
}

/**
 * List all guides available for a given country. Returns country-specific
 * variants plus universal fallbacks not overridden by a country variant.
 */
export function listGuides(country: Country): Guide[] {
  const seen = new Set<string>();
  const out: Guide[] = [];

  const push = (dir: 'universal' | Country) => {
    const rel = dir === 'universal' ? 'universal' : dir.toLowerCase();
    const dirPath = path.join(GUIDES_ROOT, rel);
    if (!fs.existsSync(dirPath)) return;
    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith('.md')) continue;
      const slug = file.replace(/\.md$/, '');
      if (seen.has(slug)) continue;
      const g = loadFile(dir, slug);
      if (g) {
        seen.add(slug);
        out.push(g);
      }
    }
  };

  push(country);       // country-specific first
  push('universal');   // then universal fills gaps

  return out.sort((a, b) => a.title.localeCompare(b.title));
}

/**
 * List all guides currently in the content tree (both country variants +
 * universal), used to generate static params for [slug] pages.
 */
export function listAllSlugs(): string[] {
  const set = new Set<string>();
  for (const dir of ['us', 'ca', 'universal'] as const) {
    const dirPath = path.join(GUIDES_ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const file of fs.readdirSync(dirPath)) {
      if (file.endsWith('.md')) set.add(file.replace(/\.md$/, ''));
    }
  }
  return [...set];
}
