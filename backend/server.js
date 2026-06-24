/**
 * APEX Compliance Platform — Backend (React/Express Framework Setup)
 */

import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

// Load environment variables from .env
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8000;
const MODEL = process.env.APEX_MODEL || 'claude-opus-4-8';

// A usable key must exist and look real (Anthropic keys start with "sk-ant-").
function hasUsableKey() {
  const k = process.env.ANTHROPIC_API_KEY;
  return typeof k === 'string' && k.startsWith('sk-ant-');
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Compliance analysis schema — Claude is constrained to return exactly this.
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

const SYSTEM_PROMPT = `You are a senior U.S. FDA regulatory consultant specializing in DSHEA-compliant exports of Indian Ayurvedic and nutraceutical products to the United States. You also have working knowledge of EU Novel Food / EFSA and Gulf (GCC/GSO) frameworks.

You will receive a product DOSSIER assembled from any combination of: uploaded document text (labels, Certificates of Analysis, Master Manufacturing Records), pasted text, and structured intake fields. Analyze it as a single product and produce a rigorous, defensible compliance assessment.

Apply real regulatory knowledge, including:
- Drug vs. dietary supplement vs. conventional food classification (21 USC §321(g); 21 CFR §101, §111, §117). Disease/treatment/cure/prevention claims => unapproved new drug.
- Structure/function claims and the mandatory DSHEA disclaimer (21 CFR §101.93). Reframe disease claims into lawful structure/function language.
- New Dietary Ingredient (NDI) notification requirements (21 USC §350b) for botanicals not marketed in the US before Oct 15, 1994.
- GRAS status, and PROHIBITED ingredients: metallic bhasmas (Swarna/gold, Abhraka, Tamra, Naga, Vanga, Hartala/arsenic, Manahshila), Ephedra, Aristolochic acid; RESTRICTED: Kava, Comfrey, Aconite, etc.
- Heavy-metal limits (USP <2232>: Lead 5ppm, Arsenic 1.5ppm, Mercury 1ppm, Cadmium 0.3ppm) and Import Alert 54-15 / DWPE detention risk.
- cGMP for dietary supplements (21 CFR §111): identity testing, independent QC sign-off, specifications.
- Fermented arishta/asava products with self-generated alcohol => TTB permit / alcohol labeling implications.
- California Prop 65 (lead/heavy-metal warning) exposure.

Rules:
- Ground every finding in a specific citation. Do not invent regulations.
- Map each violation to exactly one readiness pillar.
- Use severity honestly: CRITICAL = customs detention / seizure / unapproved drug; HIGH = major labeling/ingredient/cGMP gap; MEDIUM = correctable documentation; LOW = minor/best-practice.
- If the dossier is thin or ambiguous, classify as REQUIRES_REVIEW and flag what is missing rather than guessing.
- Be specific to the actual product in the dossier; never return generic boilerplate.
- This is informational analysis, not legal advice — but write it at the rigor a regulatory attorney would expect.`;

function buildUserPrompt({ productName, documents, formText }) {
  const parts = [];
  if (productName) parts.push(`Stated product name: ${productName}`);

  if (Array.isArray(documents) && documents.length) {
    parts.push(`\n=== ${documents.length} DOCUMENT(S) IN DOSSIER ===`);
    documents.forEach((d, i) => {
      const text = (d.text || '').slice(0, 20000);
      parts.push(`\n--- Document ${i + 1}: ${d.name || 'untitled'} ---\n${text}`);
    });
  }

  if (formText && formText.trim()) {
    parts.push(`\n=== STRUCTURED INTAKE FIELDS ===\n${formText.trim()}`);
  }

  parts.push(
    '\nAnalyze this dossier and return the structured compliance report. Assess US FDA readiness as the primary focus.'
  );
  return parts.join('\n');
}

app.post('/api/analyze', async (req, res) => {
  if (!hasUsableKey()) {
    return res.status(503).json({
      error: 'no_api_key',
      message:
        'No valid Anthropic API key is set. Add your sk-ant-... key to the .env file and restart.',
    });
  }

  const { productName, documents, formText } = req.body || {};
  const hasDocs = Array.isArray(documents) && documents.some((d) => d && d.text && d.text.trim());
  if (!hasDocs && !(formText && formText.trim())) {
    return res.status(400).json({
      error: 'empty_dossier',
      message: 'Provide at least one document or some intake text to analyze.',
    });
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: 'adaptive' },
      output_config: {
        effort: 'high',
        format: {
          type: 'json_schema',
          schema: REPORT_SCHEMA,
        },
      },
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: buildUserPrompt({ productName, documents, formText }) },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return res.status(422).json({
        error: 'refused',
        message: 'The model declined to analyze this content.',
      });
    }

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock) {
      return res.status(502).json({ error: 'no_output', message: 'No analysis returned.' });
    }

    let report;
    try {
      report = JSON.parse(textBlock.text);
    } catch {
      return res
        .status(502)
        .json({ error: 'parse_error', message: 'Could not parse the analysis output.' });
    }

    report._meta = {
      model: response.model,
      usage: response.usage,
      analyzedAt: new Date().toISOString(),
    };
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
  res.json({ ok: true, aiEnabled: hasUsableKey(), model: MODEL });
});

// Serve the static frontend built assets (from React production bundle)
const distPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  const indexFile = path.join(distPath, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send('Not Found - Frontend has not been built yet. Run npm run build.');
  }
});

app.listen(PORT, () => {
  const aiState = hasUsableKey()
    ? `AI analysis ENABLED (${MODEL})`
    : 'AI analysis DISABLED — add your sk-ant-... key to the .env file to enable';
  console.log(`APEX Compliance Platform running at http://localhost:${PORT}  •  ${aiState}`);
});
