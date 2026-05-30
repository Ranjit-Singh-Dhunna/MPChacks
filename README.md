# Brim — AI-Powered Expense Intelligence Platform

An AI expense intelligence platform for SMBs, built on a **deterministic-first / AI-second**
pipeline. Python and an indexed SQLite database handle all math, sanitization, and ~85% of
policy checks. Gemini is used only as a *reasoner, translator, and layout orchestrator* on the
~5–15% of transactions that are flagged or anomalous — never as a calculator.

## Four Capabilities

1. **Talk to Your Data** — natural-language queries → charts + voice summaries.
2. **Policy Compliance Engine** — PDF policy → editable rules + deterministic checks + fraud cluster detection.
3. **AI Pre-Approval Workflow** — one-click approvals with a full AI-generated dossier.
4. **Automated Expense Report Generation** — auto-grouped, policy-checked, CFO-ready reports.

## Architecture

```
CSV → Ingestion (FX normalize, enrich) → SQLite
                                            │
                  ┌─────────────────────────┼─────────────────────────┐
                  ▼                         ▼                         ▼
          Deterministic Policy      Fraud Cluster Detection      NL Query Engine
          Engine (Tier 1)           (Tier 2, pandas)             (safe-eval sandbox)
                  │                         │                         │
                  └────────► flagged ~5–15% ◄────────┐               │
                                    ▼                  │               ▼
                            Gemini Reasoner ───────────┘        Recharts + Voice
                          (risk score, narrative,
                           dossier, policy extract)
```

## Tech Stack

- **Backend**: Python + FastAPI + SQLAlchemy + SQLite
- **AI**: Google Gemini (reasoner / translator only)
- **Voice**: ElevenLabs
- **Frontend**: React + TypeScript + Vite + Tailwind + Recharts

## Quickstart

### 1. Generate synthetic data
```bash
cd data
python generate_data.py        # writes transactions.csv + employees.json
```

### 2. Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
copy ..\.env.example .env        # then fill in keys (optional)
uvicorn main:app --reload        # http://localhost:8000/docs
```

Then load + analyze the data:
```bash
curl -X POST http://localhost:8000/api/ingest -H "Content-Type: application/json" -d "{\"use_default\": true}"
curl -X POST http://localhost:8000/api/analyze
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                      # http://localhost:5173
```

## Seeded Fraud Cases (for the demo)

| Pattern | Actor | What to look for |
|---|---|---|
| Smurfing (72h cumulative) | Frank Miller | 8 × $49.50 USD across 60h → $546 CAD > $500 budget |
| Split billing (collusion) | Frank + Eric Tran | $78 USD each at "Roadside Grill Co" within 28 min |
| Round-number structuring | Grace Lee | 12 × exact $200/$400/$500 to "Premium Fleet Services Inc" |
| Statistical outlier (Z>3) | CFO | $264K CAD "Intercontinental Fleet Acquisition" |
| Shell vendor | Grace Lee | "Premium Fleet Services Inc" appears Mar 15, all round numbers |

**FX demo beat:** a $499 USD charge becomes **$688 CAD** and silently breaches the $500
threshold — caught because all checks run on the CAD-normalized amount.
