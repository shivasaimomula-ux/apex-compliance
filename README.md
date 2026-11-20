# APEX Compliance Platform

AI-driven FDA / EU / Gulf compliance analysis for Indian Ayurvedic & nutraceutical exporters.
Upload a **product dossier** (label + Certificate of Analysis + Master Manufacturing Record,
or any subset, or pasted text), and Gemini produces a structured compliance report:
classification verdict, a weighted FDA Readiness Score, prioritized violations with CFR
citations, claim reframing, and ingredient flags.

## Running it

```bash
npm install

# Enable real AI analysis (recommended):
export GEMINI_API_KEY=AIza...            # get one at https://aistudio.google.com/apikey
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

- **`backend/server.js`** — Express server. Serves the built frontend and exposes `POST /api/analyze`,
  which sends the dossier to **Gemini 4 Hydrogen** (`gemini-4-hydrogen`) with a regulatory-expert
  system prompt and a strict JSON schema, returning a structured report. `GET /api/health`
  reports whether AI mode is enabled.
- **Frontend** (`index.html`, `app.js`, `mock_data.js`, `index.css`) — vanilla JS. PDF text is
  extracted in-browser via PDF.js, bundled into a dossier, and sent to the backend. The returned
  report is rendered across all views; the FDA Readiness Score is computed from the AI-derived
  violations.

## Configuration

| Variable            | Default            | Purpose                          |
| ------------------- | ------------------ | -------------------------------- |
| `GEMINI_API_KEY`    | —                    | Enables AI analysis. `GOOGLE_API_KEY` is also accepted. Put it in `backend/.env` or export it. |
| `PORT`              | `8000`               | Server port                      |
| `APEX_MODEL`        | `gemini-4-hydrogen`  | Model used for analysis          |

> Informational research tool only — not a substitute for licensed regulatory or legal counsel.
