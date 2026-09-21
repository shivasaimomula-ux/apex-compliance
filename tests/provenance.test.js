/**
 * Unit tests: provenance thread helpers (Task T22).
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extendProvenanceForE,
  extractInboundProvenance,
  formatProvenanceChain,
  normalizeProvenanceThread,
} from '../lib/provenance.js';

describe('provenance thread (T22)', () => {
  it('normalizes snake_case and camelCase', () => {
    const a = normalizeProvenanceThread({
      schema_version: '1.0.0',
      spec_id: 's1',
      formulation_id: 'F-1',
      sku_id: 'SKU-1',
      dossier_hash: 'abc',
      stages: ['F', 'A', 'B', 'C'],
    });
    assert.equal(a.specId, 's1');
    assert.equal(a.formulationId, 'F-1');
    assert.equal(a.skuId, 'SKU-1');
    assert.equal(a.dossierHash, 'abc');
    const b = normalizeProvenanceThread({
      schemaVersion: '1.0.0',
      specId: 's1',
      formulationId: 'F-1',
    });
    assert.equal(b.specId, 's1');
  });

  it('extends with compliance_hash and report_id', () => {
    const out = extendProvenanceForE(
      { spec_id: 's1', sku_id: 'SKU-1', dossier_hash: 'dd', stages: ['C'] },
      { complianceHash: 'ee', reportId: 'e-rpt-1' },
    );
    assert.equal(out.complianceHash, 'ee');
    assert.equal(out.reportId, 'e-rpt-1');
    assert.ok(out.stages.includes('E'));
    assert.match(out.chain, /spec_id=s1/);
    assert.match(out.chain, /compliance_hash=ee/);
  });

  it('extracts from body or dossier', () => {
    const fromBody = extractInboundProvenance(
      { provenance_thread: { spec_id: 's2', stages: ['F'] } },
      null,
    );
    assert.equal(fromBody.specId, 's2');
    const fromDossier = extractInboundProvenance(
      {},
      {
        source_formulation_id: 'F-X',
        source_sku_id: 'SKU-X',
        dossier_id: 'D-X',
        provenance_thread: { dossier_hash: 'hh', stages: ['C'] },
      },
    );
    assert.equal(fromDossier.dossierHash, 'hh');
    assert.equal(formatProvenanceChain(fromDossier), 'dossier_hash=hh');
  });
});
