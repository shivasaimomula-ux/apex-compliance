# APEX Compliance Platform

AI-driven FDA / EU / Gulf compliance analysis for Indian Ayurvedic & nutraceutical exporters.
Upload a **product dossier** (label + Certificate of Analysis + Master Manufacturing Record,
or any subset, or pasted / markdown text), and NVIDIA (preferred) or Claude produces a
structured compliance report: classification verdict, a weighted FDA Readiness Score,
prioritized violations with CFR citations, claim reframing, and ingredient flags.

## Running it

```bash
npm install

# Enable real AI analysis (recommended). NVIDIA preferred; Claude is fallback:
export NVIDIA_API_KEY=nvapi-...          # get one at https://build.nvidia.com
# export ANTHROPIC_API_KEY=sk-ant-...    # optional fallback
npm start                                # → http://localhost:8002
```

Open http://localhost:8002, go to **Document Audit → Upload Your Document**, add one or
more files (PDF / TXT / CSV / Markdown), and click **🤖 Analyze Full Dossier with AI**.
Results populate the Dashboard, Document Audit, Product Classification, and Claim Translator views.

### Port

Default **`PORT=8002`** so Stage E does not clash with Stage A on `:8000`. Override with
`PORT=… npm start`. Prefer that over `Start APEX.command` while Stage A is running.

### Pipeline handoff (Stage C → E)

```bash
# JSON with markdown field or documents[].text
curl -s -X POST http://localhost:8002/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"productName":"Demo","market":"US","category":"SUPPLEMENT","markdown":"# Dossier\n…"}'

# Or raw markdown body
curl -s -X POST http://localhost:8002/api/analyze \
  -H 'Content-Type: text/markdown' \
  --data-binary @dossier.md
```

CORS is enabled so callers on other localhost ports can POST `/api/analyze`.

### Without an API key

The server still boots and the UI loads, but **`POST /api/analyze` returns 503**. Offline
regex analysis is **not** treated as pipeline success — configure an NVIDIA or Anthropic key
for real compliance output.

## How it works

- **`server.js`** — Express server. Serves the static frontend and exposes `POST /api/analyze`,
  which sends the dossier to **NVIDIA Nemotron** (or Claude fallback) with a regulatory-expert
  system prompt and a JSON schema, returning a structured report. `GET /api/health` reports
  whether AI mode is enabled. Accepts JSON dossiers and raw `text/markdown`.
- **Frontend** (`index.html`, `app.js`, `mock_data.js`, `index.css`) — vanilla JS. PDF text is
  extracted in-browser via PDF.js, bundled into a dossier, and sent to the backend. The returned
  report is rendered across all views; the FDA Readiness Score is computed from the AI-derived
  violations.

## Configuration

| Variable            | Default                                      | Purpose                          |
| ------------------- | -------------------------------------------- | -------------------------------- |
| `NVIDIA_API_KEY`    | —                                            | Preferred AI provider            |
| `ANTHROPIC_API_KEY` | —                                            | Claude fallback                  |
| `APEX_PROVIDER`     | auto (NVIDIA → Claude)                       | Force `nvidia` or `anthropic`    |
| `PORT`              | `8002`                                       | Server port                      |
| `APEX_MODEL`        | `claude-opus-4-8`                            | Anthropic model                  |
| `NVIDIA_MODEL`      | `nvidia/llama-3.3-nemotron-super-49b-v1`     | NVIDIA model                     |

> Informational research tool only — not a substitute for licensed regulatory or legal counsel.
