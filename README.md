# APEX Compliance Platform

AI-driven FDA / EU / Gulf compliance analysis for Indian Ayurvedic & nutraceutical exporters.
Upload a **product dossier** (label + Certificate of Analysis + Master Manufacturing Record,
or any subset, or pasted / markdown text), and NVIDIA (preferred) or Claude produces a
structured compliance report: classification verdict, a weighted FDA Readiness Score,
prioritized violations with CFR citations, claim reframing, and ingredient flags.

## Running it

> **Pipeline Stage E = this tree only** (`apex_compliance_platform-harden-e`).  
> Do **not** launch the base Desktop folder `apex_compliance_platform` for glue/pipeline work.

```bash
npm install

# Enable real AI analysis (recommended). NVIDIA preferred; Claude is fallback:
export NVIDIA_API_KEY=nvapi-...          # get one at https://build.nvidia.com
# export ANTHROPIC_API_KEY=sk-ant-...    # optional fallback
npm start                                # → http://localhost:8002
```

**Double-click launcher:** `Start APEX.command` resolves to **this** worktree (via `$0`),
prints a **HARDEN-E** banner with the absolute path, and **refuses** if it somehow runs from
the base tree (Audit Finding #16). Prefer `npm start` from this directory when scripting.

Open http://localhost:8002, go to **Document Audit → Upload Your Document**, add one or
more files (PDF / TXT / CSV / Markdown), and click **🤖 Analyze Full Dossier with AI**.
Results populate the Dashboard, Document Audit, Product Classification, and Claim Translator views.

### Port

Default **`PORT=8002`** so Stage E does not clash with Stage A on `:8000`. Override with
`PORT=… npm start` or `PORT=… ./Start\ APEX.command`.

### Pipeline handoff (Stage C → E)

Prefer a versioned structured `Dossier` (herbenzo-contracts `schema_version: "1.0.0"`).
Markdown remains a human companion; when no dossier is present, E falls back to
markdown/documents and records `_meta.dossierIntake.mode = "markdown_fallback"`.

```bash
# Preferred: structured Dossier from Stage C
curl -s -X POST http://localhost:8002/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"productName":"Demo","market":"US","category":"SUPPLEMENT","dossier":{"schema_version":"1.0.0","dossier_id":"D-demo","product_name":"Demo","product_category":"dietary_supplement","target_market":"US","ingredients":[{"name":"Ashwagandha"}],"confidence":0.7,"inherited_confidence":0.8,"engine_version":"C-dossier/1.1.0"}}'

# Fallback: JSON with markdown field or documents[].text
curl -s -X POST http://localhost:8002/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"productName":"Demo","market":"US","category":"SUPPLEMENT","markdown":"# Dossier\n…"}'

# Or raw markdown body
curl -s -X POST http://localhost:8002/api/analyze \
  -H 'Content-Type: text/markdown' \
  --data-binary @dossier.md
```

CORS is an **allowlist** of known stage origins (F `:7860`/`:8081`, A `:8000`, E `:8002`,
B `:8003`, C `:8010`, plus `127.0.0.1` twins and `null` for `file://`). Arbitrary `Origin`
is **not** reflected. Override with `CORS_ALLOW_ORIGINS` (JSON array or comma-separated).
Glue/curl callers send no `Origin` and are unaffected. Never set `*`.

### Without an API key

The server still boots and the UI loads, but **`POST /api/analyze` returns 503**. Offline
regex analysis is **not** treated as pipeline success — configure an NVIDIA or Anthropic key
for real compliance output.

## How it works

- **`server.js`** — Express server. Serves the static frontend and exposes `POST /api/analyze`,
  which sends the dossier to **NVIDIA Nemotron** (or Claude fallback) with a regulatory-expert
  system prompt and a JSON schema, returning a structured report. **Readiness scoring is
  server-side**: `_meta` includes `readinessScore`, `band`, `pipelineReady`, truncation flags,
  category resolution, and `dossierIntake` (structured vs markdown). `GET /api/health` reports whether AI mode is enabled. Accepts structured Dossier JSON, document arrays, and raw `text/markdown`.
- **Frontend** (`index.html`, `app.js`, `mock_data.js`, `index.css`) — vanilla JS. PDF text is
  extracted in-browser via PDF.js, bundled into a dossier, and sent to the backend. The returned
  report is rendered across all views; the FDA Readiness Score for AI analyses is **read from
  server `_meta`** (demo/offline docs may still use local math labeled as non-pipeline).

### C → E category / market map (Task T8)

Shared enums live in `herbenzo-contracts` (`schemas/enums.v1.json`, mirrored at
`lib/enums.v1.json`). Stage A/C/glue aliases such as `dietary_supplement` map to
`SUPPLEMENT` | `HERBAL` | `FOOD` | `AYUSH`. Prefer `regulatory_category` on the
structured Dossier when present; `product_category` remains C's MeSH / indication
string and must **not** silently become a regulatory lens.

Unknown values set `_meta.categoryResolution.dropped=true` (or
`marketResolution.dropped`) instead of inventing SUPPLEMENT / US. AU maps to NZ
(FSANZ) with a warning. Empty market still defaults to US for E.

### `_meta` readiness contract (pipeline)

| Field | Meaning |
|-------|---------|
| `readinessScore` | 0–100 weighted FRS |
| `band` | `EXPORT_READY` \| `CONDITIONAL_READY` \| `SIGNIFICANT_REMEDIATION` \| `NOT_EXPORT_READY` |
| `pipelineReady` | `true` when AI path produced a server-scored report |
| `humanReviewRequired` / `exportAuthorized` / `released` | Human Review Gate (T20) |
| `humanReview` | Named sign-off record or `null` |
| `truncation` | Whether any document hit the 20 000-char limit |

Human Review Gate: `POST /api/human-review` with `{ reportId, reviewerId, reviewerName,
jurisdictionDisclaimerAck: true }`. Policy via `HUMAN_REVIEW_GATE=enforce|warn|off`
(default **enforce**). Score band may still read `EXPORT_READY`; `released` stays
false until a server-side sign-off exists.

```bash
npm test
```


## Configuration

| Variable            | Default                                      | Purpose                          |
| ------------------- | -------------------------------------------- | -------------------------------- |
| `NVIDIA_API_KEY`    | —                                            | Preferred AI provider            |
| `ANTHROPIC_API_KEY` | —                                            | Claude fallback                  |
| `APEX_PROVIDER`     | auto (NVIDIA → Claude)                       | Force `nvidia` or `anthropic`    |
| `PORT`              | `8002`                                       | Server port                      |
| `APEX_MODEL`        | `claude-opus-4-8`                            | Anthropic model                  |
| `NVIDIA_MODEL`      | `nvidia/llama-3.3-nemotron-super-49b-v1`     | NVIDIA model                     |
| `HUMAN_REVIEW_GATE` | `enforce`                                    | Require named sign-off for `released` when band is EXPORT_READY |

> Informational research tool only — not a substitute for licensed regulatory or legal counsel.
