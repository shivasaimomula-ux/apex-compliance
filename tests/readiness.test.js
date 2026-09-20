/**
 * Unit tests: readiness scoring + category map + `_meta` shape (Task T3).
 * Run: node --test tests/readiness.test.js
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDocumentCharLimit,
  bandFromScore,
  buildReadinessMeta,
  calculateReadinessScore,
  DOC_CHAR_LIMIT,
} from '../lib/readiness.js';
import { resolveProductCategory, C_TO_E_CATEGORY_MAP } from '../lib/category-map.js';

describe('calculateReadinessScore', () => {
  it('scores empty violations as 100 / EXPORT_READY', () => {
    const r = calculateReadinessScore([]);
    assert.equal(r.readinessScore, 100);
    assert.equal(r.band.key, 'EXPORT_READY');
  });

  it('deducts CRITICAL on a pillar to zero contribution for that pillar', () => {
    const r = calculateReadinessScore([
      { severity: 'CRITICAL', pillar: 'import_admissibility' },
    ]);
    assert.equal(r.pillarScores.import_admissibility, 0);
    // 100 - 15% of 100 = 85 → still EXPORT_READY boundary
    assert.equal(r.readinessScore, 85);
    assert.equal(r.band.key, 'EXPORT_READY');
  });

  it('lands in NOT_EXPORT_READY with multiple criticals', () => {
    const r = calculateReadinessScore([
      { severity: 'CRITICAL', pillar: 'product_classification' },
      { severity: 'CRITICAL', pillar: 'labeling_compliance' },
      { severity: 'CRITICAL', pillar: 'ingredient_safety' },
    ]);
    assert.ok(r.readinessScore < 40);
    assert.equal(r.band.key, 'NOT_EXPORT_READY');
  });
});

describe('bandFromScore', () => {
  it('maps thresholds', () => {
    assert.equal(bandFromScore(85).key, 'EXPORT_READY');
    assert.equal(bandFromScore(65).key, 'CONDITIONAL_READY');
    assert.equal(bandFromScore(40).key, 'SIGNIFICANT_REMEDIATION');
    assert.equal(bandFromScore(39).key, 'NOT_EXPORT_READY');
  });
});

describe('applyDocumentCharLimit', () => {
  it('surfaces truncation metadata when over limit', () => {
    const long = 'x'.repeat(DOC_CHAR_LIMIT + 500);
    const { documents, truncation } = applyDocumentCharLimit([
      { name: 'dossier.md', text: long },
    ]);
    assert.equal(truncation.truncated, true);
    assert.equal(truncation.truncationLimit, DOC_CHAR_LIMIT);
    assert.equal(documents[0].text.length, DOC_CHAR_LIMIT);
    assert.equal(truncation.truncatedDocuments[0].droppedChars, 500);
    assert.ok(truncation.note);
  });

  it('does not flag short docs', () => {
    const { truncation } = applyDocumentCharLimit([{ name: 'a.md', text: 'short' }]);
    assert.equal(truncation.truncated, false);
    assert.equal(truncation.truncatedDocuments.length, 0);
  });
});

describe('buildReadinessMeta', () => {
  it('emits pipeline contract fields; exportAuthorized false without review', () => {
    const meta = buildReadinessMeta({
      violations: [],
      truncation: { truncated: false, truncationLimit: DOC_CHAR_LIMIT, truncatedDocuments: [], note: null },
      categoryResolution: {
        category: 'SUPPLEMENT',
        categoryLabel: 'Nutraceutical / food supplement',
        input: 'dietary_supplement',
        mappedFrom: 'dietary_supplement',
        recognized: true,
        dropped: false,
      },
    });
    assert.equal(meta.pipelineReady, true);
    assert.equal(meta.readinessScore, 100);
    assert.equal(meta.band, 'EXPORT_READY');
    assert.equal(meta.bandLabel, 'EXPORT READY');
    assert.equal(meta.humanReviewRequired, true);
    assert.equal(meta.exportAuthorized, false);
    assert.equal(meta.categoryResolution.mappedFrom, 'dietary_supplement');
    assert.ok(meta.pillarScores);
  });

  it('allows exportAuthorized only with human review + EXPORT_READY + no truncation', () => {
    const meta = buildReadinessMeta({
      violations: [],
      humanReviewApproved: true,
      truncation: { truncated: false, truncationLimit: DOC_CHAR_LIMIT, truncatedDocuments: [], note: null },
    });
    assert.equal(meta.exportAuthorized, true);
    assert.equal(meta.humanReviewRequired, false);
  });
});

describe('resolveProductCategory (C→E map)', () => {
  it('maps dietary_supplement → SUPPLEMENT (Finding #10)', () => {
    const r = resolveProductCategory('dietary_supplement');
    assert.equal(r.category, 'SUPPLEMENT');
    assert.equal(r.recognized, true);
    assert.equal(r.dropped, false);
    assert.equal(r.mappedFrom, 'dietary_supplement');
  });

  it('passes through E keys', () => {
    assert.equal(resolveProductCategory('HERBAL').category, 'HERBAL');
    assert.equal(resolveProductCategory('ayush').category, 'AYUSH');
  });

  it('marks unknown as dropped (not silent success)', () => {
    const r = resolveProductCategory('totally_unknown_cat');
    assert.equal(r.category, null);
    assert.equal(r.dropped, true);
    assert.equal(r.recognized, false);
    assert.equal(r.input, 'totally_unknown_cat');
  });

  it('documents map covers glue happy-path aliases', () => {
    assert.equal(C_TO_E_CATEGORY_MAP.dietary_supplement, 'SUPPLEMENT');
    assert.equal(C_TO_E_CATEGORY_MAP.nutraceutical, 'SUPPLEMENT');
    assert.equal(C_TO_E_CATEGORY_MAP.ayurvedic, 'AYUSH');
    assert.equal(C_TO_E_CATEGORY_MAP.botanical, 'HERBAL');
    assert.equal(C_TO_E_CATEGORY_MAP.functional_food, 'FOOD');
  });
});
