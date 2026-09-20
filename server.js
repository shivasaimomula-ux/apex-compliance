/**
 * APEX Compliance Platform — Backend
 *
 * Serves the static frontend and exposes POST /api/analyze, which sends a
 * product dossier (uploaded documents + pasted text + structured form fields)
 * to Claude and returns a structured FDA/EU/Gulf compliance report.
 *
 * Set your key once in a .env file (ANTHROPIC_API_KEY=sk-ant-...), then run:
 *   npm start
 */

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { resolveProductCategory } from './lib/category-map.js';
import {
  applyDocumentCharLimit,
  buildReadinessMeta,
  DOC_CHAR_LIMIT,
} from './lib/readiness.js';
import { validateAnalyzeResponse } from './lib/contract_validate.js';
import { resolveAnalyzeIntake } from './lib/dossier_intake.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Minimal .env loader (no dependency). Reads KEY=VALUE lines from ./.env and
// populates process.env. Already-set environment variables win, so an explicit
// `export` still overrides the file. Silently does nothing if .env is absent.
// ---------------------------------------------------------------------------
function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  let raw;
  try {
    raw = fs.readFileSync(envPath, 'utf8');
  } catch {
    return; // no .env file — fine
  }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Strip surrounding single/double quotes if present.
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv();
// Default 8002 so Stage E does not clash with Stage A on :8000.
const PORT = process.env.PORT || 8002;

// ---------------------------------------------------------------------------
// LLM providers. APEX can run on Anthropic (Claude) OR NVIDIA (Nemotron, via
// its OpenAI-compatible endpoint). Provider is chosen by APEX_PROVIDER, else
// auto-detected from whichever key is present (NVIDIA preferred, Claude fallback).
// ---------------------------------------------------------------------------
const MODEL = process.env.APEX_MODEL || 'claude-opus-4-8';              // Anthropic model
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || 'nvidia/llama-3.3-nemotron-super-49b-v1';
const NVIDIA_BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MAX_TOKENS = parseInt(process.env.NVIDIA_MAX_TOKENS || '8192', 10);

function anthropicKeyOk() {
  const k = process.env.ANTHROPIC_API_KEY;
  return typeof k === 'string' && k.startsWith('sk-ant-');
}
function nvidiaKeyOk() {
  const k = process.env.NVIDIA_API_KEY;
  return typeof k === 'string' && k.startsWith('nvapi-');
}

// Resolve the active provider: explicit APEX_PROVIDER wins (if its key is set),
// otherwise prefer NVIDIA, then Anthropic (Claude). Returns null when no usable key.
function resolveProvider() {
  const p = (process.env.APEX_PROVIDER || '').toLowerCase();
  if (p === 'nvidia' && nvidiaKeyOk()) return 'nvidia';
  if (p === 'anthropic' && anthropicKeyOk()) return 'anthropic';
  if (nvidiaKeyOk()) return 'nvidia';
  if (anthropicKeyOk()) return 'anthropic';
  return null;
}

function activeModel() {
  return resolveProvider() === 'nvidia' ? NVIDIA_MODEL : MODEL;
}

// Is a specific provider usable (has a valid key)?
function providerUsable(p) {
  return (p === 'anthropic' && anthropicKeyOk()) || (p === 'nvidia' && nvidiaKeyOk());
}

// Model id for a given provider.
function modelFor(p) {
  return p === 'nvidia' ? NVIDIA_MODEL : MODEL;
}

function hasUsableKey() {
  return resolveProvider() !== null;
}

// Tolerant JSON extraction (models sometimes wrap output in prose/code fences).
function parseReportJson(text) {
  const t = (text || '').trim();
  try { return JSON.parse(t); } catch { /* fall through */ }
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) return JSON.parse(t.slice(start, end + 1));
  throw new Error('No JSON object found in model output.');
}

const app = express();

// CORS for cross-origin Stage C / pipeline callers (localhost ports differ).
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With',
  );
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Accept JSON dossiers and raw markdown/plain text (C → E handoff).
app.use(express.json({ limit: '10mb' }));
app.use(express.text({
  type: ['text/markdown', 'text/x-markdown', 'text/plain'],
  limit: '10mb',
}));

// ---------------------------------------------------------------------------
// Compliance analysis schema — Claude is constrained to return exactly this.
// The `violations[]` shape matches the frontend's FRS scoring contract
// ({severity, pillar, finding, citation, remediation}), so the dashboard
// score is computed from genuinely AI-derived findings.
// ---------------------------------------------------------------------------
const REPORT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    productName: { type: 'string' },
    productSummary: {
      type: 'string',
      description: 'One-paragraph plain-English summary of the product and its overall export readiness.',
    },
    documentsAssessed: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          type: {
            type: 'string',
            enum: ['LABEL', 'COA', 'MMR', 'FORM_INTAKE', 'OTHER'],
          },
          summary: { type: 'string' },
        },
        required: ['name', 'type', 'summary'],
      },
    },
    classification: {
      type: 'object',
      additionalProperties: false,
      properties: {
        verdict: {
          type: 'string',
          enum: [
            'DIETARY_SUPPLEMENT',
            'CONVENTIONAL_FOOD',
            'UNAPPROVED_NEW_DRUG',
            'MISBRANDED_PRODUCT',
            'REQUIRES_REVIEW',
          ],
        },
        title: { type: 'string', description: 'Human-readable verdict label.' },
        governingLaw: {
          type: 'string',
          description: 'Specific statute/regulation, e.g. "21 USC §321(g)(1)(B); 21 CFR §310".',
        },
        rationale: { type: 'string' },
        decisionSteps: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              gate: { type: 'string' },
              status: { type: 'string', enum: ['PASS', 'FAIL', 'REVIEW'] },
              detail: { type: 'string' },
            },
            required: ['gate', 'status', 'detail'],
          },
        },
      },
      required: ['verdict', 'title', 'governingLaw', 'rationale', 'decisionSteps'],
    },
    violations: {
      type: 'array',
      description: 'Every compliance gap found, mapped to a readiness pillar.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          pillar: {
            type: 'string',
            enum: [
              'product_classification',
              'labeling_compliance',
              'ingredient_safety',
              'manufacturing_compliance',
              'import_admissibility',
            ],
          },
          finding: { type: 'string' },
          citation: { type: 'string', description: 'The exact CFR/USC/guidance reference.' },
          remediation: { type: 'string', description: 'Concrete, actionable fix.' },
        },
        required: ['severity', 'pillar', 'finding', 'citation', 'remediation'],
      },
    },
    claimAnalysis: {
      type: 'array',
      description: 'Each marketing/health claim found, with an FDA-compliant reframing.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          originalClaim: { type: 'string' },
          risk: {
            type: 'string',
            enum: ['CRITICAL', 'HIGH', 'MODERATE', 'LOW', 'COMPLIANT'],
          },
          issue: { type: 'string' },
          reframedClaim: {
            type: 'string',
            description: 'A lawful structure/function reframing, or the same claim if already compliant.',
          },
          citation: { type: 'string' },
        },
        required: ['originalClaim', 'risk', 'issue', 'reframedClaim', 'citation'],
      },
    },
    ingredientFindings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          fdaStatus: {
            type: 'string',
            enum: [
              'GRAS',
              'NDI_REQUIRED',
              'PROHIBITED',
              'RESTRICTED',
              'REQUIRES_TTB_PERMIT',
              'REVIEW',
            ],
          },
          note: { type: 'string' },
        },
        required: ['name', 'fdaStatus', 'note'],
      },
    },
  },
  required: [
    'productName',
    'productSummary',
    'documentsAssessed',
    'classification',
    'violations',
    'claimAnalysis',
    'ingredientFindings',
  ],
};

// ---------------------------------------------------------------------------
// Multi-market compliance knowledge base. The US brief above is a full,
// standalone prompt. For every other market we compose BASE_SYSTEM (shared
// method + schema-field guidance) with a market-specific regulatory brief so
// citations, classification, and ingredient status reflect the SELECTED market.
// ---------------------------------------------------------------------------
const BASE_SYSTEM = `You are a senior international regulatory consultant advising Indian Ayurvedic and nutraceutical exporters. Analyze the product DOSSIER for the SPECIFIED TARGET MARKET below and produce a rigorous, defensible compliance assessment for THAT market.

You will receive a DOSSIER assembled from any combination of uploaded document text (labels, Certificates of Analysis, Master Manufacturing Records), pasted text, and structured intake fields. Analyze it as a single product.

General method (applies to every market):
- Classify the product: food supplement vs. conventional food vs. medicine/therapeutic product. ANY disease treatment/prevention/cure claim moves the product into the medicine/unlicensed-drug category in every market covered here.
- Reframe disease claims into lawful structure/function or authorised-claim language for the target market.
- Assess ingredient status in the target market: permitted / prohibited / restricted / requires pre-market notification or novel-food authorisation. Metallic bhasmas (Swarna/gold, Abhraka, Tamra, Naga, Vanga, Hartala/arsenic, Manahshila), Ephedra, and Aristolochic acid are prohibited or high-risk everywhere. Fermented arishta/asava with self-generated alcohol raises alcohol-control issues (and is a critical barrier in Gulf markets).
- Check heavy-metal / contaminant limits and labelling (allergens, mandatory panel, language) for the target market.
- Map each violation to exactly one readiness pillar: product_classification, labeling_compliance, ingredient_safety, manufacturing_compliance, import_admissibility.

Schema-field guidance (interpret the enums in the TARGET MARKET's terms):
- classification.verdict: DIETARY_SUPPLEMENT = lawful food supplement; CONVENTIONAL_FOOD; UNAPPROVED_NEW_DRUG = unlicensed medicine / requires medicinal or therapeutic registration; MISBRANDED_PRODUCT = labelling/claim breach; REQUIRES_REVIEW = dossier too thin. Put the market-specific statute in governingLaw.
- ingredientFindings.fdaStatus: GRAS = permitted as food; NDI_REQUIRED = pre-market notification / novel-food authorisation required; PROHIBITED; RESTRICTED; REQUIRES_TTB_PERMIT = alcohol / therapeutic control applies; REVIEW.
- Every citation MUST reference the target market's own instruments listed below — never cite another market's regulations.

Depth & rigor — IDENTICAL for every market; match the depth of a specialist regulatory attorney for the target market:
- Work classification through explicit decision GATES (product identity established; composition/dose form documented; food-vs-therapeutic claim triage; ingredient admissibility; heavy-metal/contaminant evidence; mandatory label elements) and record each as PASS / FAIL / REVIEW with a specific reason.
- Give a per-ingredient regulatory status, with a market-specific reason, for EVERY ingredient.
- Extract EVERY marketing/label claim and reframe each into lawful wording with a specific citation.
- Produce a thorough remediation list — do not stop at one or two gaps if more exist.

Rules:
- Ground every finding in a specific citation from the target market (statute / regulation / standard number). Do not invent regulations, and never cite another market's rules.
- Severity honestly: CRITICAL = import detention/seizure/unlicensed drug; HIGH = major labelling/ingredient/GMP gap; MEDIUM = correctable documentation; LOW = minor/best-practice.
- MISSING EVIDENCE IS A GAP, NOT A PASS. Do NOT award high pillar scores for manufacturing_compliance or import_admissibility when no Certificate of Analysis, Master Manufacturing Record, identity testing, or finished label is supplied — score those pillars low and flag the missing artefacts.
- If the dossier is thin, contradictory, or describes a different product than the one stated, classify REQUIRES_REVIEW and enumerate exactly what is missing.
- Be specific to the actual product; never return generic boilerplate.
- Informational analysis, not legal advice — written at the rigor a regulatory attorney would expect.`;

const MARKET_BRIEFS = {
  US: {
    label: 'United States (FDA)',
    brief: `Authorities: US FDA (CFSAN) for foods/supplements; TTB for alcohol; California OEHHA for Prop 65.
- Classification: drug vs. dietary supplement vs. conventional food (21 USC §321(g); 21 CFR §101, §111, §117). Disease/treatment/cure/prevention claims => unapproved new drug (21 USC §355; 21 CFR §310).
- Claims: structure/function claims require the mandatory DSHEA disclaimer (21 CFR §101.93). Reframe disease claims into lawful structure/function language.
- New Dietary Ingredient (NDI) notification (21 USC §350b; 21 CFR §190.6) for botanicals not marketed in the US before Oct 15, 1994.
- PROHIBITED: metallic bhasmas (Swarna/gold, Abhraka, Tamra, Naga, Vanga, Hartala/arsenic, Manahshila), Ephedra, Aristolochic acid; RESTRICTED: Kava, Comfrey, Aconite.
- Heavy metals: USP <2232> — Lead 5 ppm, Arsenic 1.5 ppm, Mercury 1 ppm, Cadmium 0.3 ppm; FDA Import Alert 54-15 (DWPE detention) targets Ayurvedic products.
- cGMP: 21 CFR Part 111 — identity testing (§111.75), specifications (§111.70), independent QC release (§111.123), Master Manufacturing Record (§111.255).
- Labelling: Supplement Facts panel (21 CFR §101.36), net quantity, responsible firm, DSHEA disclaimer; FALCPA allergen declaration.
- Fermented arishta/asava with self-generated alcohol => TTB permit (27 CFR) / alcohol labelling. California Prop 65 lead-exposure warning (Cal. Health & Safety Code §25249.6; 0.5 µg/day safe harbour).`,
  },
  EU: {
    label: 'European Union (EFSA / DG SANTE)',
    brief: `Authorities: EFSA and the European Commission (DG SANTE); national competent authorities; EMA/HMPC for herbal medicines.
- Food supplements: Directive 2002/46/EC (vitamins/minerals harmonised; botanicals under national competence — check the destination member state).
- Novel Food: botanicals without significant EU consumption before 15 May 1997 need authorisation under Regulation (EU) 2015/2283 (18–36 months; a traditional-third-country notification route may apply). Commonly caught: Shilajit, certain Ashwagandha extract forms.
- Medicinal presentation (disease claims) => medicinal product; the traditional route is the Traditional Herbal Medicinal Products Directive 2004/24/EC (THR): 30 years' traditional use incl. 15 in the EU, quality dossier, per-member-state registration.
- Health/nutrition claims: Regulation (EC) 1924/2006 — only claims on the EU Register (Art.13/14) allowed; most botanical claims are "on hold"/unauthorised; disease risk-reduction/treatment claims prohibited on food.
- Contaminants: Regulation (EC) 1881/2006 as amended by (EU) 2023/915 — Lead and Cadmium limits for food supplements (Cadmium is frequently the binding constraint for Ayurvedic botanicals); ISO 17025 testing. RASFF alerts commonly cite heavy metals / undeclared actives.
- PROHIBITED/high-risk: metallic bhasmas, Aristolochia, Ephedra.
- Labelling: Regulation (EU) 1169/2011 (FIC) — allergen declaration, legibility (x-height ≥1.2 mm), member-state language; plus supplement labelling under 2002/46/EC (recommended daily dose, "do not exceed", "not a substitute for a varied diet", keep out of reach of children).`,
  },
  UK: {
    label: 'United Kingdom — Great Britain (MHRA / FSA)',
    brief: `Authorities: MHRA (medicines, incl. herbal) and the Food Standards Agency (FSA) / Food Standards Scotland. Post-Brexit, Great Britain (England, Wales, Scotland) runs its OWN regime — EU authorisations do NOT carry over. Northern Ireland follows EU rules under the Windsor Framework.
- Food supplements: The Food Supplements (England) Regulations 2003 and devolved equivalents (assimilated from 2002/46/EC).
- Medicinal claims => medicine under the Human Medicines Regulations 2012; traditional herbal products use the UK Traditional Herbal Registration (THR) via MHRA (30 years' use, 15 in the EU/UK).
- Novel foods: assimilated Regulation (EU) 2015/2283 — a SEPARATE GB novel-food authorisation via the FSA is required; EU novel-food status is not recognised in GB.
- Health/nutrition claims: assimilated Regulation (EC) 1924/2006 — GB Nutrition & Health Claims Register; no disease treatment/prevention claims on food.
- Contaminants: assimilated Regulation (EC) 1881/2006 (GB retained limits) — heavy-metal testing required.
- PROHIBITED/high-risk: metallic bhasmas, Aristolochia, Ephedra.
- Labelling: Food Information Regulations 2014 (+ assimilated 1169/2011) — allergen declaration, a UK/GB-based responsible food business operator (FBO) address (mandatory post-Brexit), recommended daily dose, warnings. Flag GB-vs-NI divergence where routing differs.`,
  },
  GULF: {
    label: 'Gulf / Oman (GSO / Oman MoH)',
    brief: `Authorities: the GCC Standardization Organization (GSO) sets pan-Gulf standards; in Oman the Ministry of Health (MoH) registers herbal/supplement products and the Ministry of Commerce, Industry & Investment Promotion oversees market entry.
- Registration: herbal/health products bearing therapeutic claims require Oman MoH product registration as a herbal/traditional medicine; unregistered products with disease claims are unlicensed medicines subject to detention. A Certificate of Free Sale from FSSAI/AYUSH is typically required.
- Labelling: GSO 2233 (labelling of prepackaged foodstuffs); GSO health & nutrition claim standards; supplement-specific GSO standards. ARABIC labelling is mandatory (bilingual Arabic/English), with production and expiry dates and importer details.
- HALAL (CRITICAL): GSO 2055 series — halal certification effectively mandatory; gelatin capsule shells and animal-derived excipients must be halal (switch to HPMC/vegetarian capsules); certify via a recognised body (ESMA/SASO/JAKIM).
- ALCOHOL (CRITICAL): arishta/asava or any self-generated or added alcohol (>0.5% ABV) is prohibited/heavily restricted under Islamic law — a standalone import barrier.
- Heavy-metal/contaminant limits per applicable GSO/Codex standards — Pb, As, Cd, Hg testing required for Ayurvedic botanicals.
- PROHIBITED/high-risk: metallic bhasmas, Aristolochia, Ephedra.`,
  },
  NZ: {
    label: 'New Zealand (FSANZ / MPI / Medsafe)',
    brief: `Authorities: Food Standards Australia New Zealand (FSANZ) sets the joint Food Standards Code; the NZ Ministry for Primary Industries (MPI) administers food/import; Medsafe (Ministry of Health) regulates medicines and therapeutic products.
- Classification: food-type supplements under the Dietary Supplements Regulations 1985 (transitioning to the Natural Health & Supplementary Products regime / Therapeutic Products Act 2023). Any therapeutic (treat/prevent/cure) claim => therapeutic product regulated by Medsafe under the Therapeutic Products Act 2023 — not permissible on a dietary-supplement basis.
- Contaminants: Australia NZ Food Standards Code Standard 1.4.1 (Contaminants & Natural Toxicants) — heavy-metal maximum levels; MPI import health standard for food; batch COAs required.
- Health/nutrition claims: Standard 1.2.7 — only pre-approved (Schedule) or self-substantiated food-health relationships; substantiation required (cl 12–16); no therapeutic claims on food.
- Novel foods: Standard 1.5.1 — confirm each botanical's novel-food status / history of safe use.
- Labelling: Standards 1.2.3 (allergen declaration), 1.2.8 (nutrition information panel), 1.2.11 (country of origin); DSR 1985 reg 8 (minimum quantity of each active per dose, recommended daily dose, NZ importer name/address, warnings).
- PROHIBITED/high-risk: metallic bhasmas, Aristolochia, Ephedra.`,
  },
};

// Map of market key -> label, for the frontend selector and validation.
const MARKETS = {
  US: 'United States (FDA)',
  EU: MARKET_BRIEFS.EU.label,
  UK: MARKET_BRIEFS.UK.label,
  GULF: MARKET_BRIEFS.GULF.label,
  NZ: MARKET_BRIEFS.NZ.label,
};

// ---------------------------------------------------------------------------
// Product-category briefs. The category sets the EXPECTED regulatory lens
// (medicine vs. supplement vs. food vs. botanical). It is context, not an
// override — the model still classifies honestly from the actual dossier.
// ---------------------------------------------------------------------------
const CATEGORY_BRIEFS = {
  AYUSH: {
    label: 'AYUSH / Ayurvedic medicine',
    brief: `The exporter presents this as an AYUSH / Ayurvedic medicinal product with therapeutic intent. In most destination markets a product presented to treat, prevent, or cure disease is a MEDICINE, not a food, and needs the medicinal / traditional-herbal route:
- US: no food route for disease claims — it is an unapproved new drug unless ALL disease claims are removed and it is relabelled/reformulated as a dietary supplement.
- EU: Traditional Herbal Medicinal Products Directive 2004/24/EC (THMPD registration).
- UK: MHRA Traditional Herbal Registration (THR) under the Human Medicines Regulations 2012.
- Gulf/Oman: Oman MoH herbal/traditional-medicine product registration.
- New Zealand: therapeutic product under the Therapeutic Products Act 2023 (Medsafe).
On the India side, AYUSH GMP (Schedule T / revised AYUSH GMP), the AYUSH Premium Mark, and AYUSH Ministry export requirements apply. Metallic bhasmas (Swarna, Tamra, Naga, Vanga, Abhraka, Hartala, Manahshila) are a critical barrier in Western markets. Treat classification with a strong presumption of "medicine" unless the product carries no disease claims.`,
  },
  SUPPLEMENT: {
    label: 'Nutraceutical / food supplement',
    brief: `The exporter presents this as a dietary / food supplement (nutraceutical). Classify under the supplement/food framework of the target market:
- US: DSHEA — dietary supplement (21 CFR §111 cGMP, §101.36 Supplement Facts, §101.93 structure/function + disclaimer); NDI notification (21 USC §350b) for post-1994 ingredients.
- EU: Food Supplements Directive 2002/46/EC; UK: Food Supplements (England) Regulations 2003.
- Gulf/Oman: GSO supplement standards + MoH registration.
- NZ: Dietary Supplements Regulations 1985 (transitioning to the Therapeutic Products regime).
Only structure/function or authorised claims are permitted — ANY disease treatment/prevention claim reclassifies the product as a medicine. In India, the FSSAI Health Supplements & Nutraceuticals Regulations 2022 apply.`,
  },
  HERBAL: {
    label: 'Herbal / botanical product',
    brief: `The exporter presents this as a herbal / botanical product (single-herb or blend extract) without a classical-medicine positioning. Key focus areas:
- Novel Food status: botanicals lacking significant pre-15-May-1997 EU / pre-15-Oct-1994 US consumption history require authorisation (US NDI 21 USC §350b; EU & GB Novel Food Regulation 2015/2283).
- Botanical identity, standardisation, and adulteration; correct Latin binomial and plant part.
- Heavy-metal and contaminant limits.
- The claims made determine whether it is regulated as a food supplement or, if disease claims appear, as a medicine.`,
  },
  FOOD: {
    label: 'Functional / conventional food',
    brief: `The exporter presents this as a conventional or functional food (e.g. herbal tea, spice blend, ghee-, honey- or grain-based product). Classify under general food law:
- US: 21 CFR §101 (labelling) and §117 (preventive controls / food GMP).
- EU: Regulation (EU) 1169/2011 (FIC) + Regulation (EC) 1924/2006 (claims).
- UK: Food Information Regulations 2014.
- Gulf/Oman: GSO 2233 (labelling of prepackaged foodstuffs).
- NZ: Australia NZ Food Standards Code.
Nutrition and health claims are tightly restricted and disease claims are prohibited. Food-additive and contaminant limits apply.`,
  },
};

const CATEGORIES = Object.fromEntries(
  Object.entries(CATEGORY_BRIEFS).map(([k, v]) => [k, v.label])
);

function buildSystemPrompt(marketKey, categoryKey) {
  const cat = CATEGORY_BRIEFS[categoryKey];
  const catBlock = cat
    ? `\n\n=== STATED PRODUCT CATEGORY: ${cat.label} ===\n${cat.brief}\n\nUse the stated category as the expected regulatory lens, but CLASSIFY HONESTLY from the actual claims and composition in the dossier — if the evidence contradicts the stated category (e.g. a "food supplement" that carries disease claims), say so explicitly and classify on the facts.`
    : '';
  // Every market composes the SAME rigorous base + an equally-detailed brief,
  // so non-US markets get the same depth of analysis as the US/FDA one.
  const m = MARKET_BRIEFS[marketKey] || MARKET_BRIEFS.US;
  const base = `${BASE_SYSTEM}\n\n=== TARGET MARKET: ${m.label} ===\n${m.brief}`;
  return base + catBlock;
}

function buildUserPrompt({ productName, documents, formText, marketLabel, categoryLabel }) {
  const parts = [];
  if (productName) parts.push(`Stated product name: ${productName}`);

  if (Array.isArray(documents) && documents.length) {
    parts.push(`\n=== ${documents.length} DOCUMENT(S) IN DOSSIER ===`);
    documents.forEach((d, i) => {
      // Documents are pre-truncated via applyDocumentCharLimit (surfaced on _meta).
      const text = d.text || '';
      parts.push(`\n--- Document ${i + 1}: ${d.name || 'untitled'} ---\n${text}`);
    });
  }

  if (formText && formText.trim()) {
    parts.push(`\n=== STRUCTURED INTAKE FIELDS ===\n${formText.trim()}`);
  }

  parts.push(
    `\nAnalyze this dossier and return the structured compliance report. Target market: ${marketLabel || 'United States (FDA)'}. Stated product category: ${categoryLabel || 'not specified'}. Every citation must reference that market's own regulations, applied through the correct framework for the product category.`
  );
  return parts.join('\n');
}

// --- Provider callers: both return { text, model, usage, refused } ----------

async function callAnthropic({ system, userPrompt }) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'high', format: { type: 'json_schema', schema: REPORT_SCHEMA } },
    system,
    messages: [{ role: 'user', content: userPrompt }],
  });
  if (response.stop_reason === 'refusal') return { refused: true };
  const textBlock = response.content.find((b) => b.type === 'text');
  return { text: textBlock ? textBlock.text : '', model: response.model, usage: response.usage };
}

async function callNvidia({ system, userPrompt }) {
  // NVIDIA's endpoint is OpenAI-compatible. Not all Nemotron models honour a
  // strict json_schema response_format, so we require JSON via the prompt and
  // parse tolerantly. "detailed thinking off" keeps reasoning models terse.
  const sys =
    `detailed thinking off\n${system}\n\nRespond with a SINGLE JSON object that strictly conforms to this JSON Schema. ` +
    `Output only the JSON — no markdown, no code fences, no commentary:\n${JSON.stringify(REPORT_SCHEMA)}`;
  const resp = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: NVIDIA_MODEL,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: NVIDIA_MAX_TOKENS,
    }),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw Object.assign(new Error(`NVIDIA API ${resp.status}: ${body.slice(0, 300)}`), { status: resp.status });
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return { text: content, model: data?.model || NVIDIA_MODEL, usage: data?.usage };
}

app.post('/api/analyze', async (req, res) => {
  if (!hasUsableKey()) {
    // Hard fail — regex/offline analysis is UI demo only and is never success here.
    return res.status(503).json({
      error: 'no_api_key',
      message:
        'No valid API key is set. Add an NVIDIA (nvapi-...) or Anthropic (sk-ant-...) key to the .env file and restart. Regex fallback is not pipeline success.',
    });
  }
  // Normalize intake: prefer structured Dossier (Task T7), else markdown/docs.
  const body = (req.body && typeof req.body === 'object' && !Array.isArray(req.body))
    ? req.body
    : {};
  const requestedProvider = (typeof body.provider === 'string')
    ? body.provider.toLowerCase()
    : null;
  const provider = (requestedProvider && providerUsable(requestedProvider))
    ? requestedProvider
    : resolveProvider();

  const intake = resolveAnalyzeIntake(body, req.body);
  if (!intake.ok) {
    return res.status(intake.status).json(intake.body);
  }

  let { productName, documents, formText } = intake;
  if (!productName && typeof body.productName === 'string') {
    productName = body.productName;
  }

  // Target market (default US for backward compatibility).
  // Structured dossier may hint market; explicit body.market still wins.
  const marketCandidate =
    (typeof body.market === 'string' && body.market) ||
    intake.marketHint ||
    'US';
  const market = (typeof marketCandidate === 'string' && MARKETS[marketCandidate])
    ? marketCandidate
    : 'US';
  const marketLabel = MARKETS[market];
  // Product category: map A/C/glue vocabulary (e.g. dietary_supplement) → E keys.
  // Reuse T3 category map; full enum alignment is Task T8.
  const categoryRaw =
    (typeof body.category === 'string' && body.category) ||
    intake.categoryHint ||
    null;
  const categoryResolution = resolveProductCategory(categoryRaw);
  const category = categoryResolution.category;
  const categoryLabel = categoryResolution.categoryLabel;
  const hasDocs = Array.isArray(documents) && documents.some((d) => d && d.text && d.text.trim());
  if (!hasDocs && !(formText && formText.trim())) {
    return res.status(400).json({
      error: 'empty_dossier',
      message: 'Provide at least one document, markdown body, or intake text to analyze.',
    });
  }

  const { documents: limitedDocs, truncation } = applyDocumentCharLimit(
    Array.isArray(documents) ? documents : [],
    DOC_CHAR_LIMIT,
  );
  const humanReviewApproved = body.humanReviewApproved === true;

  const system = buildSystemPrompt(market, category);
  const userPrompt = buildUserPrompt({
    productName,
    documents: limitedDocs,
    formText,
    marketLabel,
    categoryLabel,
  });

  try {
    const result = provider === 'nvidia'
      ? await callNvidia({ system, userPrompt })
      : await callAnthropic({ system, userPrompt });

    if (result.refused) {
      return res.status(422).json({ error: 'refused', message: 'The model declined to analyze this content.' });
    }
    if (!result.text) {
      return res.status(502).json({ error: 'no_output', message: 'No analysis returned.' });
    }

    let report;
    try {
      report = parseReportJson(result.text);
    } catch {
      return res.status(502).json({ error: 'parse_error', message: 'Could not parse the analysis output.' });
    }

    const readiness = buildReadinessMeta({
      violations: report.violations,
      truncation,
      categoryResolution,
      humanReviewApproved,
    });

    report._meta = {
      provider,
      model: result.model,
      usage: result.usage,
      analyzedAt: new Date().toISOString(),
      market,
      marketLabel,
      category,
      categoryLabel,
      dossierIntake: intake.intake,
      ...readiness,
    };
    const gate = validateAnalyzeResponse(report);
    if (!gate.ok) {
      return res.status(gate.status).json(gate.body);
    }
    res.json(report);
  } catch (err) {
    const status = err?.status || 500;
    console.error('Analysis error:', err?.message || err);
    res.status(status).json({
      error: 'analysis_failed',
      message: err?.message || 'Unexpected error during analysis.',
    });
  }
});

// Health check — lets the frontend decide whether AI mode is available.
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiEnabled: hasUsableKey(),
    provider: resolveProvider(),
    model: activeModel(),
    providers: { anthropic: anthropicKeyOk(), nvidia: nvidiaKeyOk() },
    models: { anthropic: MODEL, nvidia: NVIDIA_MODEL },
    markets: MARKETS,
    readinessContract: true,
    docCharLimit: DOC_CHAR_LIMIT,
    humanReviewGate: 'pending_t20',
  });
});

// Available target markets for the compliance analysis selector.
app.get('/api/markets', (_req, res) => {
  res.json({ markets: MARKETS, default: 'US' });
});

// Available product categories for the compliance analysis selector.
app.get('/api/categories', (_req, res) => {
  res.json({ categories: CATEGORIES, default: 'SUPPLEMENT' });
});

// Serve the static frontend (index.html, app.js, mock_data.js, index.css, ...).
// Disable caching so the browser always fetches the latest build — avoids the
// "my edits aren't showing up" stale-cache problem during development/demos.
app.use(express.static(__dirname, {
  etag: false,
  lastModified: false,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  },
}));

app.listen(PORT, () => {
  const provider = resolveProvider();
  const aiState = provider
    ? `AI analysis ENABLED — provider: ${provider} (${activeModel()})`
    : 'AI analysis DISABLED — add an NVIDIA (nvapi-...) or Anthropic (sk-ant-...) key to the .env file';
  console.log(`APEX Compliance Platform running at http://localhost:${PORT}  •  ${aiState}`);
});
