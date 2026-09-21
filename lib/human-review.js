/**
 * Human Review Gate (Task T20 / Audit Finding #18).
 *
 * Named sign-off records live server-side. E UI and glue both consume the same
 * `_meta.humanReview` / `_meta.released` fields — never invent export clearance
 * in the browser alone.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

/** Shown in E UI; reviewer must ack before approve. */
export const JURISDICTION_DISCLAIMER =
  'I acknowledge that export-readiness language is jurisdiction-specific, that this ' +
  'automated score is not a legal determination, and that a qualified human reviewer ' +
  'is authorizing release of export-band claims for the stated market.';

/**
 * Policy for requiring a review record before `released` / `exportAuthorized`.
 * - enforce (default): EXPORT_READY cannot release without approve + disclaimer ack
 * - warn: same truth on `_meta`; callers (glue) may warn instead of fail
 * - off: demo only — EXPORT_READY may release without a named record
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {'enforce'|'warn'|'off'}
 */
export function humanReviewGatePolicy(env = process.env) {
  const raw = String(env.HUMAN_REVIEW_GATE || '').trim().toLowerCase();
  if (
    raw === 'off' ||
    raw === 'disabled' ||
    raw === 'false' ||
    String(env.HUMAN_REVIEW_REQUIRED_FOR_EXPORT || '').toLowerCase() === 'false'
  ) {
    return 'off';
  }
  if (raw === 'warn') return 'warn';
  return 'enforce';
}

/** @returns {string} */
export function createReportId() {
  return `e-rpt-${crypto.randomUUID()}`;
}

/**
 * Stable hash over the compliance payload (not provider usage noise).
 * @param {object} report
 * @returns {string}
 */
export function computeComplianceHash(report) {
  const payload = {
    productName: report?.productName ?? null,
    productSummary: report?.productSummary ?? null,
    classification: report?.classification ?? null,
    violations: report?.violations ?? [],
    claimAnalysis: report?.claimAnalysis ?? [],
    ingredientFindings: report?.ingredientFindings ?? [],
    market: report?._meta?.market ?? null,
    category: report?._meta?.category ?? null,
    readinessScore: report?._meta?.readinessScore ?? null,
    band: report?._meta?.band ?? null,
  };
  return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

/**
 * Validate + normalize an inbound sign-off body.
 * @param {object} body
 * @returns {{ ok: true, record: object } | { ok: false, status: number, body: object }}
 */
export function validateReviewSubmission(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      body: { error: 'invalid_body', message: 'JSON object required' },
    };
  }
  const reportId = typeof body.reportId === 'string' ? body.reportId.trim() : '';
  const reviewerId = typeof body.reviewerId === 'string' ? body.reviewerId.trim() : '';
  const reviewerName =
    typeof body.reviewerName === 'string' ? body.reviewerName.trim() : '';
  const decision =
    typeof body.decision === 'string' ? body.decision.trim().toLowerCase() : 'approve';
  const ack = body.jurisdictionDisclaimerAck === true;

  if (!reportId) {
    return {
      ok: false,
      status: 400,
      body: { error: 'missing_report_id', message: 'reportId is required' },
    };
  }
  if (!reviewerId || !reviewerName) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'missing_reviewer',
        message: 'reviewerId and reviewerName are required',
      },
    };
  }
  if (!ack) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'disclaimer_required',
        message: 'jurisdictionDisclaimerAck must be true',
      },
    };
  }
  if (decision !== 'approve' && decision !== 'reject') {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'invalid_decision',
        message: 'decision must be approve or reject',
      },
    };
  }

  return {
    ok: true,
    record: {
      reportId,
      reviewerId,
      reviewerName,
      decision,
      jurisdictionDisclaimerAck: true,
      jurisdictionDisclaimer: JURISDICTION_DISCLAIMER,
      reviewedAt: new Date().toISOString(),
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    },
  };
}

/**
 * File-backed store for report snapshots + review decisions.
 */
export class HumanReviewStore {
  /**
   * @param {string} filePath absolute path to JSON store
   */
  constructor(filePath) {
    this.filePath = filePath;
    this._data = { reports: {}, reviews: {} };
    this._load();
  }

  _load() {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        this._data = {
          reports: parsed.reports && typeof parsed.reports === 'object' ? parsed.reports : {},
          reviews: parsed.reviews && typeof parsed.reviews === 'object' ? parsed.reviews : {},
        };
      }
    } catch (err) {
      if (err && err.code !== 'ENOENT') {
        console.warn('human-review store load failed:', err.message || err);
      }
    }
  }

  _persist() {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this._data, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
  }

  /**
   * @param {string} reportId
   * @param {object} report full analyze report (with _meta)
   */
  saveReportSnapshot(reportId, report) {
    this._data.reports[reportId] = {
      savedAt: new Date().toISOString(),
      complianceHash: computeComplianceHash(report),
      report,
    };
    this._persist();
  }

  /** @param {string} reportId */
  getSnapshot(reportId) {
    return this._data.reports[reportId] || null;
  }

  /** @param {string} reportId */
  getReview(reportId) {
    return this._data.reviews[reportId] || null;
  }

  /**
   * @param {object} submission from validateReviewSubmission().record
   * @returns {{ ok: true, review: object, report: object } | { ok: false, status: number, body: object }}
   */
  submitReview(submission) {
    const snap = this.getSnapshot(submission.reportId);
    if (!snap || !snap.report) {
      return {
        ok: false,
        status: 404,
        body: {
          error: 'report_not_found',
          message: `No stored analyze report for reportId=${submission.reportId}`,
        },
      };
    }
    const review = {
      ...submission,
      complianceHash: snap.complianceHash,
      productName: snap.report.productName || null,
      band: snap.report._meta?.band || null,
      readinessScore: snap.report._meta?.readinessScore ?? null,
    };
    this._data.reviews[submission.reportId] = review;
    this._persist();
    return { ok: true, review, report: snap.report };
  }
}
