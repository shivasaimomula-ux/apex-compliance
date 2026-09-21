/**
 * Unit tests: E outbound wire contract gate (Task T6).
 * Run: node --test tests/contract_validate.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateAnalyzeResponse } from '../lib/contract_validate.js';

function goodReport() {
  return {
    productName: 'Test Product',
    productSummary: 'A summary.',
    documentsAssessed: [],
    classification: {
      verdict: 'REQUIRES_REVIEW',
      title: 'Review',
      governingLaw: 'n/a',
      rationale: 'n/a',
      decisionSteps: [{ gate: 'g', status: 'REVIEW', detail: 'd' }],
    },
    violations: [],
    claimAnalysis: [],
    ingredientFindings: [],
    _meta: {
      readinessScore: 40,
      band: 'NOT_EXPORT_READY',
      pipelineReady: true,
    },
  };
}

describe('validateAnalyzeResponse', () => {
  it('accepts T3-shaped report', () => {
    const r = validateAnalyzeResponse(goodReport());
    assert.equal(r.ok, true);
  });

  it('rejects missing _meta readiness', () => {
    const bad = goodReport();
    delete bad._meta.readinessScore;
    const r = validateAnalyzeResponse(bad);
    assert.equal(r.ok, false);
    assert.equal(r.status, 502);
    assert.match(r.body.message, /readinessScore/);
  });

  it('rejects missing classification.verdict', () => {
    const bad = goodReport();
    delete bad.classification.verdict;
    const r = validateAnalyzeResponse(bad);
    assert.equal(r.ok, false);
  });
});
