/**
 * Provenance / run-thread helpers for Stage E (Task T22).
 *
 * Chain: spec_id → formulation_id → sku_id → dossier_hash → compliance_hash
 * Echoed on `_meta.provenanceThread` — not a mega provenance UI.
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>|null}
 */
export function normalizeProvenanceThread(raw) {
  if (!isPlainObject(raw)) return null;
  const stages = Array.isArray(raw.stages)
    ? raw.stages.map((s) => String(s)).filter(Boolean)
    : [];
  return {
    schemaVersion: String(raw.schemaVersion || raw.schema_version || '1.0.0'),
    runId: raw.runId || raw.run_id || null,
    specId: raw.specId || raw.spec_id || null,
    formulationId: raw.formulationId || raw.formulation_id || null,
    skuId: raw.skuId || raw.sku_id || null,
    dossierId: raw.dossierId || raw.dossier_id || null,
    dossierHash: raw.dossierHash || raw.dossier_hash || null,
    complianceHash: raw.complianceHash || raw.compliance_hash || null,
    reportId: raw.reportId || raw.report_id || null,
    stages,
  };
}

/**
 * Merge upstream thread (from dossier / body) with E's compliance_hash + report_id.
 * @param {object|null} base
 * @param {{ complianceHash?: string|null, reportId?: string|null }} eIds
 * @returns {Record<string, unknown>}
 */
export function extendProvenanceForE(base, eIds = {}) {
  const thread = normalizeProvenanceThread(base) || {
    schemaVersion: '1.0.0',
    runId: null,
    specId: null,
    formulationId: null,
    skuId: null,
    dossierId: null,
    dossierHash: null,
    complianceHash: null,
    reportId: null,
    stages: [],
  };
  if (eIds.complianceHash) thread.complianceHash = eIds.complianceHash;
  if (eIds.reportId) thread.reportId = eIds.reportId;
  const stages = Array.isArray(thread.stages) ? [...thread.stages] : [];
  if (!stages.includes('E')) stages.push('E');
  thread.stages = stages;
  thread.chain = formatProvenanceChain(thread);
  return thread;
}

/**
 * @param {Record<string, unknown>|null|undefined} thread
 * @returns {string}
 */
export function formatProvenanceChain(thread) {
  if (!thread) return '(empty)';
  const parts = [];
  if (thread.specId) parts.push(`spec_id=${thread.specId}`);
  if (thread.formulationId) parts.push(`formulation_id=${thread.formulationId}`);
  if (thread.skuId) parts.push(`sku_id=${thread.skuId}`);
  if (thread.dossierHash) parts.push(`dossier_hash=${thread.dossierHash}`);
  if (thread.complianceHash) parts.push(`compliance_hash=${thread.complianceHash}`);
  return parts.length ? parts.join(' → ') : '(empty)';
}

/**
 * Pull provenance from analyze body / structured dossier.
 * @param {object} body
 * @param {object|null} dossier
 * @returns {Record<string, unknown>|null}
 */
export function extractInboundProvenance(body, dossier) {
  const fromBody =
    normalizeProvenanceThread(body?.provenance_thread) ||
    normalizeProvenanceThread(body?.provenanceThread);
  const fromDossier =
    normalizeProvenanceThread(dossier?.provenance_thread) ||
    normalizeProvenanceThread(dossier?.provenanceThread);
  const base = fromBody || fromDossier;
  if (!base && dossier) {
    return normalizeProvenanceThread({
      schema_version: '1.0.0',
      formulation_id: dossier.source_formulation_id || null,
      sku_id: dossier.source_sku_id || null,
      dossier_id: dossier.dossier_id || null,
      stages: ['C'],
    });
  }
  return base;
}
