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
 * Whether a human-review record counts as an approve sign-off.
 * @param {object|null|undefined} humanReview
 */
export function isApprovedHumanReview(humanReview) {
  return (
    !!humanReview &&
    humanReview.decision === 'approve' &&
    humanReview.jurisdictionDisclaimerAck === true &&
    typeof humanReview.reviewerId === 'string' &&
    humanReview.reviewerId.length > 0 &&
    typeof humanReview.reviewerName === 'string' &&
    humanReview.reviewerName.length > 0 &&
    typeof humanReview.reviewedAt === 'string' &&
    humanReview.reviewedAt.length > 0
  );
}

/**
 * Build readiness fields for analyze `_meta`.
 *
 * `pipelineReady` = AI path produced a server-scored report (authoritative for
 * glue/UI). It is NOT shipping clearance — `released` / `exportAuthorized`
 * stay false until the Human Review Gate (Task T20) when policy ≠ off.
 *
 * @param {object} opts
 * @param {'enforce'|'warn'|'off'} [opts.policy]
 * @param {object|null} [opts.humanReview] named sign-off record (or null)
 */
export function buildReadinessMeta({
  violations,
  truncation,
  categoryResolution,
  marketResolution,
  humanReview = null,
  policy = 'enforce',
} = {}) {
  const { readinessScore, band, pillarScores } = calculateReadinessScore(violations);
  const reviewOk = isApprovedHumanReview(humanReview);
  const truncated = !!(truncation && truncation.truncated);
  const scoreExportReady = band.key === 'EXPORT_READY';
  // Policy off: demo may release on score alone. Enforce/warn: named record required.
  const gateAllowsRelease = policy === 'off' ? true : reviewOk;
  const exportAuthorized = gateAllowsRelease && scoreExportReady && !truncated;
  const released = exportAuthorized;
  // Finding #18: EXPORT_READY language requires a named review when policy ≠ off.
  const humanReviewRequired = policy !== 'off' && scoreExportReady && !reviewOk;

  return {
    readinessScore,
    band: band.key,
    bandLabel: band.label,
    bandDesc: band.desc,
    pillarScores,
    pipelineReady: true,
    humanReviewRequired,
    humanReviewApproved: reviewOk,
    humanReview: reviewOk
      ? {
          reviewerId: humanReview.reviewerId,
          reviewerName: humanReview.reviewerName,
          reviewedAt: humanReview.reviewedAt,
          decision: humanReview.decision,
          jurisdictionDisclaimerAck: true,
          complianceHash: humanReview.complianceHash || null,
          notes: humanReview.notes ?? null,
        }
      : null,
    exportAuthorized,
    released,
    humanReviewGate: policy,
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
