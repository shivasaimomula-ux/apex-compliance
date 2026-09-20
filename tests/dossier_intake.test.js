/**
 * Unit tests: E structured Dossier intake (Task T7).
 * Run: node --test tests/dossier_intake.test.js
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatStructuredDossierDocument,
  resolveAnalyzeIntake,
  validateInboundDossier,
} from '../lib/dossier_intake.js';

function sampleDossier(overrides = {}) {
  return {
    schema_version: '1.0.0',
    dossier_id: 'D-turma-001',
    product_name: 'TurmaMax Joint Support',
    product_category: 'anti-inflammatory',
    target_market: 'US',
    dosage_form: 'capsule',
    claimed_benefits: ['joint comfort', 'cures arthritis'],
    ingredients: [
      {
        name: 'Turmeric extract',
        latin_name: 'Curcuma longa',
        stated_dose: '500 mg',
      },
    ],
    sections: [
      {
        key: 'authentication',
        title: 'Citation authentication',
        items: [
          {
            claim: 'anti-inflammatory support',
            pmid: '12345678',
            status: 'supported',
            tier: 'human_pilot',
          },
        ],
        gaps: ['PMID:99999999 UNVERIFIED'],
      },
      {
        key: 'safety',
        title: 'Safety',
        items: [],
        gaps: [],
      },
    ],
    markdown: '# Human companion\n\nLate safety section here.',
    confidence: 0.7,
    inherited_confidence: 0.8,
    engine_version: 'C-dossier/1.1.0',
    modernized_sku_present: false,
    ...overrides,
  };
}

describe('validateInboundDossier', () => {
  it('accepts versioned Dossier', () => {
    const r = validateInboundDossier(sampleDossier());
    assert.equal(r.ok, true);
    assert.equal(r.dossier.dossier_id, 'D-turma-001');
  });

  it('rejects raised confidence floor', () => {
    const r = validateInboundDossier(
      sampleDossier({ confidence: 0.95, inherited_confidence: 0.5 }),
    );
    assert.equal(r.ok, false);
    assert.equal(r.status, 422);
    assert.match(r.body.message, /inherited_confidence/);
  });

  it('rejects missing ingredients', () => {
    const r = validateInboundDossier(sampleDossier({ ingredients: [] }));
    assert.equal(r.ok, false);
  });

  it('rejects wrong schema_version', () => {
    const r = validateInboundDossier(sampleDossier({ schema_version: '0.9.0' }));
    assert.equal(r.ok, false);
  });
});

describe('resolveAnalyzeIntake', () => {
  it('prefers structured dossier over markdown', () => {
    const body = {
      productName: 'Override Name',
      markdown: '# should be companion only',
      dossier: sampleDossier(),
    };
    const r = resolveAnalyzeIntake(body, body);
    assert.equal(r.ok, true);
    assert.equal(r.intake.mode, 'structured_dossier');
    assert.equal(r.intake.dossierId, 'D-turma-001');
    assert.equal(r.documents[0].name, 'dossier.structured.json.txt');
    assert.match(r.documents[0].text, /Citation authentication/);
    assert.match(r.documents[0].text, /PMID:12345678/);
    assert.equal(r.documents[1].name, 'dossier.md');
    assert.equal(r.productName, 'Override Name');
    assert.equal(r.marketHint, 'US');
    assert.equal(r.categoryHint, 'anti-inflammatory');
  });

  it('accepts top-level Dossier-shaped body', () => {
    const d = sampleDossier();
    const r = resolveAnalyzeIntake(d, d);
    assert.equal(r.ok, true);
    assert.equal(r.intake.mode, 'structured_dossier');
    assert.equal(r.productName, 'TurmaMax Joint Support');
  });

  it('falls back to markdown with clear meta note', () => {
    const body = {
      productName: 'MD Only',
      markdown: '# Dossier\n\nmarkdown only path',
      market: 'EU',
      category: 'dietary_supplement',
    };
    const r = resolveAnalyzeIntake(body, body);
    assert.equal(r.ok, true);
    assert.equal(r.intake.mode, 'markdown_fallback');
    assert.match(r.intake.note, /No structured Dossier/);
    assert.equal(r.documents.length, 1);
    assert.equal(r.documents[0].name, 'dossier.md');
  });

  it('returns 422 when dossier present but invalid', () => {
    const body = {
      markdown: '# ok markdown',
      dossier: sampleDossier({ ingredients: [] }),
    };
    const r = resolveAnalyzeIntake(body, body);
    assert.equal(r.ok, false);
    assert.equal(r.status, 422);
  });

  it('returns 400 when nothing provided', () => {
    const body = {};
    const r = resolveAnalyzeIntake(body, body);
    assert.equal(r.ok, false);
    assert.equal(r.status, 400);
  });
});

describe('formatStructuredDossierDocument', () => {
  it('surfaces auth gaps for the LLM', () => {
    const text = formatStructuredDossierDocument(sampleDossier());
    assert.match(text, /UNVERIFIED/);
    assert.match(text, /cures arthritis/);
    assert.match(text, /Turmeric extract/);
  });
});
