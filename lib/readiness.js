/**
 * Server-side FDA / export readiness scoring (Task T3).
 *
 * Pipeline truth lives here — E UI and glue must consume `_meta`, not invent
 * the export band from client-only math.
 */

export const DOC_CHAR_LIMIT = 20_000;

export const PILLAR_WEIGHTS = {
  product_classification: 0.15,
  labeling_compliance: 0.25,
  ingredient_safety: 0.25,
  manufacturing_compliance: 0.2,
  import_admissibility: 0.15,
};

export const SEVERITY_DEDUCTIONS = {
  CRITICAL: 1.0,
  HIGH: 0.6,
  MEDIUM: 0.3,
  LOW: 0.1,
};

/** Machine band keys (stable for glue / contracts). */
export const BANDS = {
  EXPORT_READY: {
    key: 'EXPORT_READY',
    label: 'EXPORT READY',
    desc: 'Minor documentation gaps only. Proceed with registration after human review.',
  },
  CONDITIONAL_READY: {
    key: 'CONDITIONAL_READY',
    label: 'CONDITIONAL READY',
    desc: 'Moderate gaps. Resolve HIGH items before shipping.',
  },
  SIGNIFICANT_REMEDIATION: {
    key: 'SIGNIFICANT_REMEDIATION',
    label: 'SIGNIFICANT REMEDIATION REQUIRED',
    desc: 'Major labeling/ingredient/cGMP gaps. 3–6 month remediation timeline required.',
  },
  NOT_EXPORT_READY: {
    key: 'NOT_EXPORT_READY',
    label: 'NOT EXPORT READY',
    desc: 'Critical violations present. Extremely high risk of customs detention or seizure.',
  },
};

export function bandFromScore(score) {
  const n = Number(score);
  if (n >= 85) return { ...BANDS.EXPORT_READY };
  if (n >= 65) return { ...BANDS.CONDITIONAL_READY };
  if (n >= 40) return { ...BANDS.SIGNIFICANT_REMEDIATION };
  return { ...BANDS.NOT_EXPORT_READY };
}

/**
 * Weighted pillar score from AI violation list.
 * @param {Array<{ severity?: string, pillar?: string }>} violations
 */
export function calculateReadinessScore(violations) {
  const list = Array.isArray(violations) ? violations : [];
  const pillarScores = {
    product_classification: 100,
    labeling_compliance: 100,
    ingredient_safety: 100,
    manufacturing_compliance: 100,
    import_admissibility: 100,
  };
  for (const v of list) {
    const pillar = v && v.pillar;
    if (!pillar || !(pillar in pillarScores)) continue;
    const d = SEVERITY_DEDUCTIONS[v.severity] || 0;
    pillarScores[pillar] = Math.max(0, pillarScores[pillar] - 100 * d);
  }
  let totalScore = 0;
  for (const p of Object.keys(PILLAR_WEIGHTS)) {
    totalScore += pillarScores[p] * PILLAR_WEIGHTS[p];
  }
  totalScore = Math.round(totalScore);
  const band = bandFromScore(totalScore);
  return { readinessScore: totalScore, band, pillarScores };
}

/**
 * Slice document text to DOC_CHAR_LIMIT and record truncation for `_meta`.
 * @param {Array<{ name?: string, text?: string }>} documents
 */
export function applyDocumentCharLimit(documents, limit = DOC_CHAR_LIMIT) {
  const docs = Array.isArray(documents) ? documents : [];
  const truncatedDocuments = [];
  let truncated = false;
  const limited = docs.map((d, i) => {
    const name = (d && d.name) || `document_${i + 1}`;
    const text = (d && d.text) || '';
    const originalLength = text.length;
    if (originalLength > limit) {
      truncated = true;
      truncatedDocuments.push({
        name,
        originalLength,
        usedLength: limit,
        droppedChars: originalLength - limit,
      });
      return { ...d, name, text: text.slice(0, limit) };
    }
    return d;
  });
  return {
    documents: limited,
    truncation: {
      truncated,
      truncationLimit: limit,
      truncatedDocuments,
      note: truncated
        ? `One or more documents exceeded ${limit} characters and were truncated before analysis. Safety/auth content near the end of long dossiers may be missing.`
        : null,
    },
  };
}

/**
 * Build readiness fields for analyze `_meta`.
 *
 * `pipelineReady` = AI path produced a server-scored report (authoritative for
 * glue/UI). It is NOT shipping clearance — `exportAuthorized` stays false until
 * the Human Review Gate (Task T20).
 */
export function buildReadinessMeta({
  violations,
  truncation,
  categoryResolution,
  marketResolution,
  humanReviewApproved = false,
} = {}) {
  const { readinessScore, band, pillarScores } = calculateReadinessScore(violations);
  const reviewOk = humanReviewApproved === true;
  // Score may say EXPORT_READY; export is not authorized without human review.
  const exportAuthorized =
    reviewOk && band.key === 'EXPORT_READY' && !(truncation && truncation.truncated);

  return {
    readinessScore,
    band: band.key,
    bandLabel: band.label,
    bandDesc: band.desc,
    pillarScores,
    pipelineReady: true,
    humanReviewRequired: !reviewOk,
    humanReviewApproved: reviewOk,
    exportAuthorized,
    truncation: truncation || {
      truncated: false,
      truncationLimit: DOC_CHAR_LIMIT,
      truncatedDocuments: [],
      note: null,
    },
    categoryResolution: categoryResolution || null,
    marketResolution: marketResolution || null,
  };
}
