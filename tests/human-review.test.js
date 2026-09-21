/**
 * Unit tests: Human Review Gate (Task T20).
 * Run: node --test tests/human-review.test.js
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  HumanReviewStore,
  computeComplianceHash,
  createReportId,
  humanReviewGatePolicy,
  validateReviewSubmission,
  JURISDICTION_DISCLAIMER,
} from '../lib/human-review.js';
import { buildReadinessMeta, isApprovedHumanReview } from '../lib/readiness.js';

const emptyTruncation = {
  truncated: false,
  truncationLimit: 20_000,
  truncatedDocuments: [],
  note: null,
};

function approveRecord(overrides = {}) {
  return {
    reviewerId: 'rev-001',
    reviewerName: 'Ada Reviewer',
    reviewedAt: '2026-09-21T00:00:00.000Z',
    decision: 'approve',
    jurisdictionDisclaimerAck: true,
    complianceHash: 'abc',
    notes: null,
    ...overrides,
  };
}

describe('humanReviewGatePolicy', () => {
  it('defaults to enforce', () => {
    assert.equal(humanReviewGatePolicy({}), 'enforce');
  });

  it('honors off / false', () => {
    assert.equal(humanReviewGatePolicy({ HUMAN_REVIEW_GATE: 'off' }), 'off');
    assert.equal(
      humanReviewGatePolicy({ HUMAN_REVIEW_REQUIRED_FOR_EXPORT: 'false' }),
      'off',
    );
  });

  it('honors warn', () => {
    assert.equal(humanReviewGatePolicy({ HUMAN_REVIEW_GATE: 'warn' }), 'warn');
  });
});

describe('buildReadinessMeta human review / released', () => {
  it('keeps EXPORT_READY score but blocks released without review (enforce)', () => {
    const meta = buildReadinessMeta({
      violations: [],
      truncation: emptyTruncation,
      policy: 'enforce',
    });
    assert.equal(meta.band, 'EXPORT_READY');
    assert.equal(meta.humanReviewRequired, true);
    assert.equal(meta.humanReview, null);
    assert.equal(meta.exportAuthorized, false);
    assert.equal(meta.released, false);
    assert.equal(meta.humanReviewGate, 'enforce');
  });

  it('releases only with named approve + disclaimer ack', () => {
    const meta = buildReadinessMeta({
      violations: [],
      truncation: emptyTruncation,
      policy: 'enforce',
      humanReview: approveRecord(),
    });
    assert.equal(meta.released, true);
    assert.equal(meta.exportAuthorized, true);
    assert.equal(meta.humanReviewRequired, false);
    assert.equal(meta.humanReview.reviewerId, 'rev-001');
    assert.equal(meta.humanReview.reviewerName, 'Ada Reviewer');
    assert.ok(isApprovedHumanReview(meta.humanReview));
  });

  it('policy off allows release without a review record', () => {
    const meta = buildReadinessMeta({
      violations: [],
      truncation: emptyTruncation,
      policy: 'off',
    });
    assert.equal(meta.released, true);
    assert.equal(meta.humanReviewRequired, false);
  });

  it('rejects incomplete review records', () => {
    const meta = buildReadinessMeta({
      violations: [],
      truncation: emptyTruncation,
      policy: 'enforce',
      humanReview: { decision: 'approve', reviewerId: 'x' },
    });
    assert.equal(meta.released, false);
    assert.equal(meta.humanReview, null);
  });

  it('does not require review for non-export bands', () => {
    const meta = buildReadinessMeta({
      violations: [
        { severity: 'CRITICAL', pillar: 'product_classification' },
        { severity: 'CRITICAL', pillar: 'labeling_compliance' },
      ],
      truncation: emptyTruncation,
      policy: 'enforce',
    });
    assert.notEqual(meta.band, 'EXPORT_READY');
    assert.equal(meta.humanReviewRequired, false);
    assert.equal(meta.released, false);
  });
});

describe('validateReviewSubmission', () => {
  it('requires disclaimer ack and reviewer identity', () => {
    const bad = validateReviewSubmission({
      reportId: 'e-rpt-1',
      reviewerId: 'r1',
      reviewerName: 'N',
      jurisdictionDisclaimerAck: false,
    });
    assert.equal(bad.ok, false);
    assert.equal(bad.body.error, 'disclaimer_required');
  });

  it('accepts approve payload', () => {
    const ok = validateReviewSubmission({
      reportId: 'e-rpt-1',
      reviewerId: 'r1',
      reviewerName: 'N',
      jurisdictionDisclaimerAck: true,
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.record.decision, 'approve');
    assert.match(ok.record.jurisdictionDisclaimer, /jurisdiction/i);
    assert.ok(JURISDICTION_DISCLAIMER.length > 20);
  });
});

describe('HumanReviewStore', () => {
  let dir;
  let store;

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apex-hr-'));
    store = new HumanReviewStore(path.join(dir, 'human-reviews.json'));
  });

  after(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('stores snapshot and applies sign-off', () => {
    const reportId = createReportId();
    const report = {
      productName: 'Test Product',
      productSummary: 's',
      classification: { verdict: 'REQUIRES_REVIEW' },
      violations: [],
      claimAnalysis: [],
      ingredientFindings: [],
      _meta: {
        band: 'EXPORT_READY',
        readinessScore: 100,
        reportId,
      },
    };
    const hash = computeComplianceHash(report);
    store.saveReportSnapshot(reportId, report);
    assert.equal(store.getSnapshot(reportId).complianceHash, hash);

    const submitted = store.submitReview({
      reportId,
      reviewerId: 'rev-9',
      reviewerName: 'Sam',
      decision: 'approve',
      jurisdictionDisclaimerAck: true,
      jurisdictionDisclaimer: JURISDICTION_DISCLAIMER,
      reviewedAt: new Date().toISOString(),
      notes: null,
    });
    assert.equal(submitted.ok, true);
    assert.equal(submitted.review.reviewerName, 'Sam');
    assert.equal(store.getReview(reportId).complianceHash, hash);
  });

  it('404s unknown reportId', () => {
    const r = store.submitReview({
      reportId: 'missing',
      reviewerId: 'r',
      reviewerName: 'n',
      decision: 'approve',
      jurisdictionDisclaimerAck: true,
      jurisdictionDisclaimer: JURISDICTION_DISCLAIMER,
      reviewedAt: new Date().toISOString(),
      notes: null,
    });
    assert.equal(r.ok, false);
    assert.equal(r.status, 404);
  });
});
