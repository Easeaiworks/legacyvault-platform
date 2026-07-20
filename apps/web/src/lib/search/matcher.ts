/**
 * Confidence scoring for search matches.
 *
 * We compute a 0..1 score for how likely a returned record represents the
 * subject we searched for. Signals:
 *   - Last-name exact match:       +0.35
 *   - First-name exact / initial:  +0.25 / +0.10
 *   - Middle-name match:           +0.10
 *   - Prior name match (fuzzy):    +0.20
 *   - City or region match:        +0.15
 *   - Year-of-birth ±1 match:      +0.15
 *   - Country match:               +0.05
 *
 * Any single signal is not enough to auto-confirm; we require human review for
 * matches under 0.85. The scoring is deliberately conservative — a false
 * positive is much more expensive than a missed match.
 */

export interface Subject {
  legalFirstName: string;
  legalMiddleName?: string | null;
  legalLastName: string;
  priorNames?: string[];
  dateOfBirth?: string | Date | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}

export interface Candidate {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;   // fallback if source doesn't split
  dateOfBirth?: string;
  city?: string;
  region?: string;
  country?: string;
}

const norm = (s?: string | null) => (s ?? '').toLowerCase().replace(/[^a-z]/g, '');

function levenshtein(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i]![0] = i;
  for (let j = 0; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[a.length]![b.length]!;
}

function fuzzyEq(a: string, b: string, tolerance = 2): boolean {
  return levenshtein(a, b) <= tolerance;
}

function extractName(c: Candidate): { first: string; middle?: string; last: string } {
  if (c.firstName || c.lastName) {
    return { first: norm(c.firstName), middle: c.middleName ? norm(c.middleName) : undefined, last: norm(c.lastName) };
  }
  const parts = (c.fullName ?? '').trim().split(/\s+/);
  if (parts.length === 0) return { first: '', last: '' };
  if (parts.length === 1) return { first: '', last: norm(parts[0]!) };
  return {
    first: norm(parts[0]!),
    middle: parts.length > 2 ? norm(parts[1]!) : undefined,
    last: norm(parts[parts.length - 1]!),
  };
}

function yearOf(date: string | Date | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? null : d.getFullYear();
}

export interface Score {
  confidence: number;
  reasons: string[];
}

export function scoreMatch(subject: Subject, candidate: Candidate): Score {
  let score = 0;
  const reasons: string[] = [];

  const subj = { first: norm(subject.legalFirstName), middle: norm(subject.legalMiddleName), last: norm(subject.legalLastName) };
  const cand = extractName(candidate);

  // Last name — the strongest signal
  if (subj.last && cand.last) {
    if (subj.last === cand.last) {
      score += 0.35;
      reasons.push('last name exact');
    } else if (fuzzyEq(subj.last, cand.last, 1)) {
      score += 0.2;
      reasons.push('last name fuzzy');
    }
  }

  // First name
  if (subj.first && cand.first) {
    if (subj.first === cand.first) {
      score += 0.25;
      reasons.push('first name exact');
    } else if (subj.first[0] === cand.first[0] && cand.first.length <= 2) {
      score += 0.1;
      reasons.push('first initial matches');
    } else if (fuzzyEq(subj.first, cand.first, 1)) {
      score += 0.15;
      reasons.push('first name fuzzy');
    }
  }

  // Middle name
  if (subj.middle && cand.middle && subj.middle === cand.middle) {
    score += 0.1;
    reasons.push('middle name matches');
  }

  // Prior / maiden names
  for (const p of subject.priorNames ?? []) {
    const pn = norm(p);
    if (pn && cand.last && (pn === cand.last || fuzzyEq(pn, cand.last, 1))) {
      score += 0.2;
      reasons.push(`prior name "${p}" matches`);
      break;
    }
  }

  // Location
  if (subject.city && candidate.city && norm(subject.city) === norm(candidate.city)) {
    score += 0.1;
    reasons.push('city matches');
  } else if (subject.region && candidate.region && norm(subject.region) === norm(candidate.region)) {
    score += 0.05;
    reasons.push('region matches');
  }

  // Country
  if (subject.country && candidate.country && subject.country === candidate.country) {
    score += 0.05;
    reasons.push('country matches');
  }

  // Year of birth
  const subYear = yearOf(subject.dateOfBirth);
  const candYear = yearOf(candidate.dateOfBirth);
  if (subYear && candYear && Math.abs(subYear - candYear) <= 1) {
    score += 0.15;
    reasons.push('year of birth within 1');
  }

  return { confidence: Math.min(1, score), reasons };
}

/** Threshold above which the match is considered "high confidence" for user notification. */
export const AUTO_NOTIFY_THRESHOLD = 0.85;

/** Threshold above which the match is worth queuing for human review. */
export const REVIEW_THRESHOLD = 0.5;
