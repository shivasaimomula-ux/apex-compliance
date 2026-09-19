# APEX Compliance Platform

AI-driven FDA / EU / Gulf compliance analysis for Indian Ayurvedic & nutraceutical exporters.
Upload a **product dossier** (label + Certificate of Analysis + Master Manufacturing Record,
or any subset, or pasted text), and Claude produces a structured compliance report:
classification verdict, a weighted FDA Readiness Score, prioritized violations with CFR
citations, claim reframing, and ingredient flags.

## Running it

```bash
npm install

# Enable real AI analysis (recommended):
export ANTHROPIC_API_KEY=sk-ant-...      # get one at https://console.anthropic.com
npm start                                # → http://localhost:8000
```

Open http://localhost:8000, go to **Document Audit → Upload Your Document**, add one or
more files (or paste text), and click **🤖 Analyze Full Dossier with AI**. Results populate
the Dashboard, Document Audit, Product Classification, and Claim Translator views.

### Without an API key

The app still runs. The header badge shows AI is offline and it falls back to the built-in
rule-based (regex) engine, so the demo works without any cost or key — just with shallower
analysis.

## How it works

- **`server.js`** — Express server. Serves the static frontend and exposes `POST /api/analyze`,
  which sends the dossier to **Claude Opus 4.8** with a regulatory-expert system prompt and a
  strict JSON schema (`output_config.format`), returning a structured report. `GET /api/health`
  reports whether AI mode is enabled.
- **Frontend** (`index.html`, `app.js`, `mock_data.js`, `index.css`) — vanilla JS. PDF text is
  extracted in-browser via PDF.js, bundled into a dossier, and sent to the backend. The returned
  report is rendered across all views; the FDA Readiness Score is computed from the AI-derived
  violations.

## Configuration

| Variable            | Default            | Purpose                          |
| ------------------- | ------------------ | -------------------------------- |
| `ANTHROPIC_API_KEY` | —                  | Enables AI analysis              |
| `PORT`              | `8000`             | Server port                      |
| `APEX_MODEL`        | `claude-opus-4-8`  | Model used for analysis          |

> Informational research tool only — not a substitute for licensed regulatory or legal counsel.
