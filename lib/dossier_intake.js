/**
 * Structured Dossier intake for POST /api/analyze (Task T7).
 *
 * Prefer herbenzo-contracts Dossier (snake_case, schema_version 1.0.0) when
 * present. Fall back to markdown/documents with a clear _meta note.
 * Does not invent regulatory lenses for MeSH indication strings (Task T8).
 */

const REQUIRED_DOSSIER_KEYS = [
  'schema_version',
  'dossier_id',
  'product_name',
  'product_category',
  'target_market',
  'ingredients',
  'confidence',
  'inherited_confidence',
  'engine_version',
];

const MARKETS = new Set(['US', 'EU', 'NZ', 'AU', 'IN', 'UK', 'CA', 'GULF']);

/**
 * @param {unknown} value
 * @returns {value is object}
 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Light wire check for Dossier v1 (snake_case). Full Pydantic validation lives
 * in C emit + glue; E only needs enough shape to prefer structured fields.
 *
 * @param {unknown} dossier
 * @returns {{ ok: true, dossier: object } | { ok: false, status: number, body: object }}
 */
export function validateInboundDossier(dossier) {
  if (!isPlainObject(dossier)) {
    return {
      ok: false,
      status: 422,
      body: {
        error: 'contract_validation',
        message: 'dossier must be a JSON object',
      },
    };
  }
  const missing = REQUIRED_DOSSIER_KEYS.filter((k) => !(k in dossier));
  if (missing.length) {
    return {
      ok: false,
      status: 422,
      body: {
        error: 'contract_validation',
        message: `dossier missing required fields: ${missing.join(', ')}`,
        details: { missing },
      },
    };
  }
  if (dossier.schema_version !== '1.0.0') {
    return {
      ok: false,
      status: 422,
      body: {
        error: 'contract_validation',
        message: `unsupported dossier.schema_version: ${dossier.schema_version}`,
      },
    };
  }
  if (!Array.isArray(dossier.ingredients) || dossier.ingredients.length < 1) {
    return {
      ok: false,
      status: 422,
      body: {
        error: 'contract_validation',
        message: 'dossier.ingredients must be a non-empty array',
      },
    };
  }
  for (const ing of dossier.ingredients) {
    if (!isPlainObject(ing) || typeof ing.name !== 'string' || !ing.name.trim()) {
      return {
        ok: false,
        status: 422,
        body: {
          error: 'contract_validation',
          message: 'each dossier.ingredients[] entry requires a non-empty name',
        },
      };
    }
  }
  if (typeof dossier.product_name !== 'string' || !dossier.product_name.trim()) {
    return {
      ok: false,
      status: 422,
      body: {
        error: 'contract_validation',
        message: 'dossier.product_name must be a non-empty string',
      },
    };
  }
  if (
    typeof dossier.target_market === 'string' &&
    dossier.target_market &&
    !MARKETS.has(dossier.target_market)
  ) {
    // Allow through with note — T8 will harden enum map; do not soft-drop here.
  }
  if (typeof dossier.confidence !== 'number' || typeof dossier.inherited_confidence !== 'number') {
    return {
      ok: false,
      status: 422,
      body: {
        error: 'contract_validation',
        message: 'dossier.confidence and inherited_confidence must be numbers',
      },
    };
  }
  if (dossier.confidence > dossier.inherited_confidence + 1e-9) {
    return {
      ok: false,
      status: 422,
      body: {
        error: 'contract_validation',
        message: 'dossier.confidence exceeds inherited_confidence (floor may only lower)',
      },
    };
  }
  return { ok: true, dossier };
}

/**
 * Build a compact structured document for the LLM from Dossier fields.
 * Prefer typed sections over prose so safety/auth late in markdown are not lost.
 *
 * @param {object} dossier
 * @returns {string}
 */
export function formatStructuredDossierDocument(dossier) {
  const lines = [];
  lines.push(`# Structured Dossier (${dossier.schema_version})`);
  lines.push(`dossier_id: ${dossier.dossier_id}`);
  lines.push(`product_name: ${dossier.product_name}`);
  lines.push(`product_category: ${dossier.product_category}`);
  lines.push(`target_market: ${dossier.target_market}`);
  if (dossier.dosage_form) lines.push(`dosage_form: ${dossier.dosage_form}`);
  if (dossier.serving_size_g != null) lines.push(`serving_size_g: ${dossier.serving_size_g}`);
  lines.push(`confidence: ${dossier.confidence} (inherited ${dossier.inherited_confidence})`);
  lines.push(`engine_version: ${dossier.engine_version}`);
  lines.push(`modernized_sku_present: ${Boolean(dossier.modernized_sku_present)}`);

  const benefits = Array.isArray(dossier.claimed_benefits) ? dossier.claimed_benefits : [];
  lines.push('\n## Claimed benefits');
  if (benefits.length) {
    for (const b of benefits) lines.push(`- ${b}`);
  } else {
    lines.push('- (none stated)');
  }

  lines.push('\n## Ingredients');
  for (const ing of dossier.ingredients) {
    const bits = [ing.name];
    if (ing.latin_name) bits.push(`(${ing.latin_name})`);
    if (ing.stated_dose) bits.push(`dose=${ing.stated_dose}`);
    if (ing.stated_standardization) bits.push(`std=${ing.stated_standardization}`);
    if (ing.ingredient_id) bits.push(`id=${ing.ingredient_id}`);
    if (ing.quantity_mg != null) bits.push(`${ing.quantity_mg} mg`);
    lines.push(`- ${bits.join(' ')}`);
  }

  const sections = Array.isArray(dossier.sections) ? dossier.sections : [];
  for (const section of sections) {
    if (!isPlainObject(section)) continue;
    lines.push(`\n## Section: ${section.title || section.key || 'untitled'}`);
    lines.push(`key: ${section.key || ''}`);
    const items = Array.isArray(section.items) ? section.items : [];
    for (const item of items) {
      if (!isPlainObject(item)) continue;
      const pmid = item.pmid ? ` PMID:${item.pmid}` : '';
      const tier = item.tier ? ` tier=${item.tier}` : '';
      const status = item.status ? ` status=${item.status}` : '';
      lines.push(`- ${item.claim || '(no claim)'}${pmid}${tier}${status}`);
      if (item.note) lines.push(`  note: ${item.note}`);
    }
    const gaps = Array.isArray(section.gaps) ? section.gaps : [];
    if (gaps.length) {
      lines.push('gaps:');
      for (const g of gaps) lines.push(`- ${g}`);
    }
  }

  return lines.join('\n');
}

/**
 * Resolve analyze intake: structured dossier first, else markdown/documents.
 *
 * @param {object} body — JSON body (already object)
 * @param {unknown} rawBody — original req.body (may be string for raw markdown)
 * @returns {{
 *   ok: true,
 *   productName: string|null,
 *   marketHint: string|null,
 *   categoryHint: string|null,
 *   documents: Array<{name: string, text: string}>,
 *   formText: string|null,
 *   intake: object,
 * } | { ok: false, status: number, body: object }}
 */
export function resolveAnalyzeIntake(body, rawBody) {
  const dossierField = isPlainObject(body?.dossier) ? body.dossier : null;
  // Also accept a top-level Dossier-shaped body (glue may POST dossier alone).
  const looksLikeDossier =
    !dossierField &&
    isPlainObject(body) &&
    body.schema_version === '1.0.0' &&
    typeof body.dossier_id === 'string' &&
    Array.isArray(body.ingredients);

  if (dossierField || looksLikeDossier) {
    const candidate = dossierField || body;
    const gate = validateInboundDossier(candidate);
    if (!gate.ok) return gate;

    const d = gate.dossier;
    const documents = [
      {
        name: 'dossier.structured.json.txt',
        text: formatStructuredDossierDocument(d),
      },
    ];
    // Markdown companion for humans / secondary context (not the primary signal).
    const md =
      (typeof d.markdown === 'string' && d.markdown.trim() && d.markdown) ||
      (typeof body.markdown === 'string' && body.markdown.trim() && body.markdown) ||
      null;
    if (md) {
      documents.push({ name: 'dossier.md', text: md });
    }
    // Extra uploaded docs still allowed alongside structured dossier.
    if (Array.isArray(body.documents)) {
      for (const doc of body.documents) {
        if (doc && typeof doc.text === 'string' && doc.text.trim()) {
          documents.push({ name: doc.name || 'untitled', text: doc.text });
        }
      }
    }

    return {
      ok: true,
      productName:
        (typeof body.productName === 'string' && body.productName) ||
        d.product_name ||
        null,
      marketHint: d.target_market || null,
      // Prefer shared regulatory_category (T8); fall back to product_category aliases.
      categoryHint:
        (typeof d.regulatory_category === 'string' && d.regulatory_category) ||
        d.product_category ||
        null,
      documents,
      formText: typeof body.formText === 'string' ? body.formText : null,
      intake: {
        mode: 'structured_dossier',
        schemaVersion: d.schema_version,
        dossierId: d.dossier_id,
        engineVersion: d.engine_version,
        modernizedSkuPresent: Boolean(d.modernized_sku_present),
        confidence: d.confidence,
        inheritedConfidence: d.inherited_confidence,
        note: 'Preferred structured Dossier (herbenzo-contracts v1); markdown is companion only.',
      },
    };
  }

  // --- Markdown / documents fallback ---
  let documents = Array.isArray(body.documents) ? [...body.documents] : [];
  const markdownField = typeof body.markdown === 'string' ? body.markdown : null;
  if (typeof rawBody === 'string' && rawBody.trim()) {
    documents = [{ name: 'dossier.md', text: rawBody }];
  } else if (markdownField && markdownField.trim()) {
    const mdDoc = { name: 'dossier.md', text: markdownField };
    documents = [...documents, mdDoc];
  }

  const formText = typeof body.formText === 'string' ? body.formText : null;
  const hasDocs = documents.some((d) => d && d.text && String(d.text).trim());
  if (!hasDocs && !(formText && formText.trim())) {
    return {
      ok: false,
      status: 400,
      body: {
        error: 'empty_dossier',
        message:
          'Provide a structured dossier, at least one document, markdown body, or intake text to analyze.',
      },
    };
  }

  return {
    ok: true,
    productName: typeof body.productName === 'string' ? body.productName : null,
    marketHint: typeof body.market === 'string' ? body.market : null,
    categoryHint: typeof body.category === 'string' ? body.category : null,
    documents,
    formText,
    intake: {
      mode: 'markdown_fallback',
      schemaVersion: null,
      dossierId: null,
      note:
        'No structured Dossier present; analyzing markdown/documents only. Prefer C dossier JSON (schema_version 1.0.0) to avoid prose truncation of safety/auth sections.',
    },
  };
}
