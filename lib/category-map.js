/**
 * C / A → E product-category vocabulary map (Audit Finding #10 / Task T3).
 *
 * Stage A/C/glue historically emit snake_case values like `dietary_supplement`.
 * E's regulatory briefs are keyed `SUPPLEMENT` | `HERBAL` | `FOOD` | `AYUSH`.
 * Unknown values previously became `null` and silently dropped the lens.
 */

/** Canonical E category keys → display labels (must match CATEGORY_BRIEFS). */
export const E_CATEGORY_LABELS = {
  AYUSH: 'AYUSH / Ayurvedic medicine',
  SUPPLEMENT: 'Nutraceutical / food supplement',
  HERBAL: 'Herbal / botanical product',
  FOOD: 'Functional / conventional food',
};

/**
 * Incoming aliases (from A formulation_input.product_category, C, glue)
 * → E category key. Keys are normalized: lower-case, hyphens → underscores.
 */
export const C_TO_E_CATEGORY_MAP = {
  // Already-E keys (any case)
  ayush: 'AYUSH',
  supplement: 'SUPPLEMENT',
  herbal: 'HERBAL',
  food: 'FOOD',

  // A / glue / common snake_case
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

function normalizeIncoming(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
}

/**
 * Resolve an incoming category string to an E key.
 * @returns {{
 *   category: string|null,
 *   categoryLabel: string|null,
 *   input: string|null,
 *   mappedFrom: string|null,
 *   recognized: boolean,
 *   dropped: boolean,
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
    };
  }
  const input = String(raw).trim();
  // Exact E key pass-through
  if (Object.prototype.hasOwnProperty.call(E_CATEGORY_LABELS, input)) {
    return {
      category: input,
      categoryLabel: E_CATEGORY_LABELS[input],
      input,
      mappedFrom: null,
      recognized: true,
      dropped: false,
    };
  }
  const norm = normalizeIncoming(input);
  // Uppercase E key via normalized form
  const upper = input.toUpperCase().replace(/[\s-]+/g, '_');
  if (Object.prototype.hasOwnProperty.call(E_CATEGORY_LABELS, upper)) {
    return {
      category: upper,
      categoryLabel: E_CATEGORY_LABELS[upper],
      input,
      mappedFrom: null,
      recognized: true,
      dropped: false,
    };
  }
  const mapped = C_TO_E_CATEGORY_MAP[norm];
  if (mapped) {
    return {
      category: mapped,
      categoryLabel: E_CATEGORY_LABELS[mapped],
      input,
      mappedFrom: norm,
      recognized: true,
      dropped: false,
    };
  }
  return {
    category: null,
    categoryLabel: null,
    input,
    mappedFrom: null,
    recognized: false,
    dropped: true,
  };
}
