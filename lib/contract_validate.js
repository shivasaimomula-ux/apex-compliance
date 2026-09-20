/**
 * Outbound wire-shape checks for E /api/analyze responses (Task T6).
 *
 * Trade-off: herbenzo-contracts exports snake_case ComplianceReport JSON Schema
 * (+ meta, report_id, confidence). Live E wire is camelCase + `_meta` without
 * those contract IDs. Full ComplianceReport validation lives in glue via
 * `compliance_report_from_e_wire` (Python). Here we only reject incomplete
 * camelCase report / readiness `_meta` with clear 4xx/5xx before clients see it.
 */

const REQUIRED_REPORT_KEYS = [
  'productName',
  'productSummary',
  'classification',
  'violations',
  'claimAnalysis',
  'ingredientFindings',
];

const REQUIRED_META_KEYS = ['readinessScore', 'band', 'pipelineReady'];

/**
 * @param {unknown} report
 * @returns {{ ok: true } | { ok: false, status: number, body: object }}
 */
export function validateAnalyzeResponse(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    return {
      ok: false,
      status: 502,
      body: {
        error: 'contract_validation',
        message: 'Analyze response must be a JSON object',
      },
    };
  }
  const missing = REQUIRED_REPORT_KEYS.filter((k) => !(k in report));
  if (missing.length) {
    return {
      ok: false,
      status: 502,
      body: {
        error: 'contract_validation',
        message: `Report missing required fields: ${missing.join(', ')}`,
        details: { missing },
      },
    };
  }
  const classification = report.classification;
  if (!classification || typeof classification !== 'object') {
    return {
      ok: false,
      status: 502,
      body: {
        error: 'contract_validation',
        message: 'Report.classification must be an object',
      },
    };
  }
  for (const key of ['verdict', 'title', 'governingLaw', 'rationale', 'decisionSteps']) {
    if (!(key in classification)) {
      return {
        ok: false,
        status: 502,
        body: {
          error: 'contract_validation',
          message: `classification missing ${key}`,
        },
      };
    }
  }
  const meta = report._meta;
  if (!meta || typeof meta !== 'object') {
    return {
      ok: false,
      status: 502,
      body: {
        error: 'contract_validation',
        message: 'Report._meta readiness block required',
      },
    };
  }
  const missingMeta = REQUIRED_META_KEYS.filter((k) => !(k in meta));
  if (missingMeta.length) {
    return {
      ok: false,
      status: 502,
      body: {
        error: 'contract_validation',
        message: `_meta missing readiness fields: ${missingMeta.join(', ')}`,
        details: { missing: missingMeta },
      },
    };
  }
  if (typeof meta.readinessScore !== 'number') {
    return {
      ok: false,
      status: 502,
      body: {
        error: 'contract_validation',
        message: '_meta.readinessScore must be a number',
      },
    };
  }
  return { ok: true };
}
