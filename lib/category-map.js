/**
 * Shared category + market enum adapters (Audit Finding #10 / Tasks T3 + T8).
 *
 * Canonical vocabulary lives in herbenzo-contracts (`schemas/enums.v1.json`).
 * This module mirrors that export so E (JS) stays aligned without a Python runtime.
 *
 * Unknown-value policy (default): warn via resolution.dropped — never invent
 * SUPPLEMENT or silently fall back to US for a non-empty unrecognized market.
 * Empty market → US for E only.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnumsCatalog() {
  try {
    const raw = readFileSync(join(__dirname, 'enums.v1.json'), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const CATALOG = loadEnumsCatalog();

/** Canonical E category keys → display labels (must match CATEGORY_BRIEFS). */
export const E_CATEGORY_LABELS = CATALOG?.regulatory_category?.labels || {
  AYUSH: 'AYUSH / Ayurvedic medicine',
  SUPPLEMENT: 'Nutraceutical / food supplement',
  HERBAL: 'Herbal / botanical product',
  FOOD: 'Functional / conventional food',
};

/**
 * Incoming aliases → E category key.
 * Keys are normalized: lower-case, hyphens → underscores.
 * @deprecated Prefer REGULATORY_CATEGORY_ALIASES; kept for T3 test imports.
 */
export const C_TO_E_CATEGORY_MAP =
  CATALOG?.regulatory_category?.aliases || {
    ayush: 'AYUSH',
    supplement: 'SUPPLEMENT',
    herbal: 'HERBAL',
    food: 'FOOD',
    dietary_supplement: 'SUPPLEMENT',
    food_supplement: 'SUPPLEMENT',
    nutraceutical: 'SUPPLEMENT',
    health_supplement: 'SUPPLEMENT',
    dietary: 'SUPPLEMENT',
    ayurvedic: 'AYUSH',
    ayurvedic_medicine: 'AYUSH',
    ayush_medicine: 'AYUSH',
    traditional_medicine: 'AYUSH',
    botanical: 'HERBAL',
    herbal_product: 'HERBAL',
    botanical_product: 'HERBAL',
    herbal_blend: 'HERBAL',
    functional_food: 'FOOD',
    conventional_food: 'FOOD',
    foodstuff: 'FOOD',
  };

export const REGULATORY_CATEGORY_ALIASES = C_TO_E_CATEGORY_MAP;

export const E_MARKET_LABELS = {
  US: 'United States (FDA)',
  EU: 'European Union (EFSA / DG SANTE)',
  UK: 'United Kingdom — Great Britain (MHRA / FSA)',
  GULF: 'Gulf / Oman (GSO / Oman MoH)',
  NZ: 'New Zealand (FSANZ / MPI / Medsafe)',
};

export const E_SUPPORTED_MARKETS = new Set(
  CATALOG?.target_market?.e_supported || ['US', 'EU', 'UK', 'GULF', 'NZ'],
);

export const E_MARKET_FALLBACKS = CATALOG?.target_market?.e_fallbacks || {
  AU: 'NZ',
};

export const TARGET_MARKET_ALIASES = CATALOG?.target_market?.aliases || {
  us: 'US',
  usa: 'US',
  united_states: 'US',
  fda: 'US',
  eu: 'EU',
  europe: 'EU',
  european_union: 'EU',
  uk: 'UK',
  gb: 'UK',
  great_britain: 'UK',
  united_kingdom: 'UK',
  nz: 'NZ',
  new_zealand: 'NZ',
  au: 'AU',
  australia: 'AU',
  in: 'IN',
  india: 'IN',
  ca: 'CA',
  canada: 'CA',
  gulf: 'GULF',
  gcc: 'GULF',
  oman: 'GULF',
};

function normalizeIncoming(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * Resolve an incoming category string to an E regulatory key.
 * @returns {{
 *   category: string|null,
 *   categoryLabel: string|null,
 *   input: string|null,
 *   mappedFrom: string|null,
 *   recognized: boolean,
 *   dropped: boolean,
 *   warning: string|null,
 * }}
 */
export function resolveProductCategory(raw) {
  if (raw == null || (typeof raw === 'string' && !raw.trim())) {
    return {
      category: null,
      categoryLabel: null,
      input: raw == null ? null : String(raw),
      mappedFrom: null,
      recognized: false,
      dropped: false,
      warning: null,
    };
  }
  const input = String(raw).trim();
  if (Object.prototype.hasOwnProperty.call(E_CATEGORY_LABELS, input)) {
    return {
      category: input,
      categoryLabel: E_CATEGORY_LABELS[input],
      input,
      mappedFrom: null,
      recognized: true,
      dropped: false,
      warning: null,
    };
  }
  const upper = input.toUpperCase().replace(/[\s-]+/g, '_');
  if (Object.prototype.hasOwnProperty.call(E_CATEGORY_LABELS, upper)) {
    return {
      category: upper,
      categoryLabel: E_CATEGORY_LABELS[upper],
      input,
      mappedFrom: null,
      recognized: true,
      dropped: false,
      warning: null,
    };
  }
  const norm = normalizeIncoming(input);
  const mapped = REGULATORY_CATEGORY_ALIASES[norm];
  if (mapped) {
    return {
      category: mapped,
      categoryLabel: E_CATEGORY_LABELS[mapped],
      input,
      mappedFrom: norm,
      recognized: true,
      dropped: false,
      warning: null,
    };
  }
  return {
    category: null,
    categoryLabel: null,
    input,
    mappedFrom: null,
    recognized: false,
    dropped: true,
    warning: `Unknown regulatory category ${JSON.stringify(input)}; E omits regulatory lens`,
  };
}

/**
 * Resolve market for E briefs. Empty → US. AU → NZ (FSANZ). IN/CA → dropped.
 */
export function resolveTargetMarket(raw) {
  if (raw == null || (typeof raw === 'string' && !raw.trim())) {
    return {
      market: 'US',
      marketLabel: E_MARKET_LABELS.US,
      input: raw == null ? null : String(raw),
      mappedFrom: null,
      recognized: true,
      dropped: false,
      warning: 'Empty market; defaulting to US for E',
    };
  }
  const input = String(raw).trim();
  let canon = null;
  let mappedFrom = null;
  if (Object.prototype.hasOwnProperty.call(TARGET_MARKET_ALIASES, normalizeIncoming(input))
    || ['US', 'EU', 'NZ', 'AU', 'IN', 'UK', 'CA', 'GULF'].includes(input.toUpperCase())) {
    if (['US', 'EU', 'NZ', 'AU', 'IN', 'UK', 'CA', 'GULF'].includes(input.toUpperCase().replace(/[\s-]+/g, '_'))) {
      canon = input.toUpperCase().replace(/[\s-]+/g, '_');
    } else {
      canon = TARGET_MARKET_ALIASES[normalizeIncoming(input)];
      mappedFrom = normalizeIncoming(input);
    }
  }
  if (!canon) {
    return {
      market: null,
      marketLabel: null,
      input,
      mappedFrom: null,
      recognized: false,
      dropped: true,
      warning: `Unknown target market ${JSON.stringify(input)}`,
    };
  }

  let value = canon;
  let warning = null;
  if (!E_SUPPORTED_MARKETS.has(value)) {
    const fallback = E_MARKET_FALLBACKS[value];
    if (fallback) {
      warning = `Market ${value} has no dedicated E brief; mapped to ${fallback}`;
      mappedFrom = mappedFrom || value;
      value = fallback;
    } else {
      return {
        market: null,
        marketLabel: null,
        input,
        mappedFrom,
        recognized: false,
        dropped: true,
        warning: `Market ${canon} is not supported by Stage E briefs; refusing silent US fallback`,
      };
    }
  }

  return {
    market: value,
    marketLabel: E_MARKET_LABELS[value] || null,
    input,
    mappedFrom,
    recognized: true,
    dropped: false,
    warning,
  };
}
