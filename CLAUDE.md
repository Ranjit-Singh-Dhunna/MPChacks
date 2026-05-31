# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Brim** — AI expense intelligence platform for SMBs. Deterministic-first: Python rules + pandas clustering handle ~85% of transactions; Gemini is only invoked as a reasoner on CRITICAL/HIGH fraud clusters and complex NL queries (~5–15%). Gemini never calculates — it only narrates, translates questions to pandas expressions, and scores risk.

## Commands

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env        # add GEMINI_API_KEY, ELEVENLABS_API_KEY (both optional)
uvicorn main:app --reload      # http://localhost:8000/docs
```

Load data after starting the server:
```bash
curl -X POST http://localhost:8000/api/ingest -H "Content-Type: application/json" -d '{"use_default": true}'
curl -X POST http://localhost:8000/api/analyze
```

### Frontend
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
```

### Docker (full stack)
```bash
docker compose up --build    # backend :8000, frontend :5173
```

### Generate synthetic data
```bash
cd data && python generate_data.py   # writes transactions.csv + employees.json
```

## Architecture

### Data flow
```
CSV → POST /api/ingest → SQLite (4,235 rows, FX-normalized to CAD)
                ↓
POST /api/analyze → fraud/pipeline.py
  Tier 1: policy/rule_engine.py    — deterministic per-transaction checks
  Tier 2: fraud/detectors.py       — pandas clustering (5 pattern types)
  Tier 3: ai/gemini_client.py      — Gemini called ONLY on CRITICAL/HIGH clusters
                ↓
compliance/cases.py → writes ComplianceCase rows (audit queue)
```

### Backend structure (`backend/`)
| Path | Purpose |
|---|---|
| `main.py` | FastAPI app, CORS, router registration, DB seed on startup |
| `models.py` | SQLAlchemy ORM: `Transaction`, `Employee`, `Policy`, `FraudCluster`, `ComplianceCase` |
| `schemas.py` | Pydantic request/response models |
| `config.py` | Settings via pydantic-settings; reads `backend/.env`; key props: `has_gemini`, `has_elevenlabs`, `fx_rate_usd_to_cad` |
| `fraud/detectors.py` | 5 pure-pandas detectors: SMURFING, SPLIT_BILLING, STRUCTURING, OUTLIER, SHELL_VENDOR |
| `fraud/pipeline.py` | Orchestrates Tier 1–3; returns `ai_call_ratio` (what Dashboard uses) |
| `ai/nl_query.py` | NL → pandas expression (Gemini-compiled, sandboxed eval); session cache for chart restyling |
| `ai/gemini_client.py` | Thin Gemini wrapper; returns `{"_fallback": true}` when key absent |
| `ai/dossier.py` | Pre-approval AI dossier generation |
| `compliance/cases.py` | Syncs fraud clusters + violations → `ComplianceCase` rows |
| `routers/` | One file per domain: `ingest`, `transactions`, `compliance`, `query`, `approvals`, `reports`, `policy` |

### Frontend structure (`frontend/src/`)
| Path | Purpose |
|---|---|
| `App.tsx` | Routes: `/` → `HomePage` (no layout), all others inside `Layout` with sidebar |
| `api/client.ts` | All API calls via axios; proxy `/api` → `localhost:8000` (vite config) |
| `pages/` | `HomePage`, `Dashboard`, `Violations`, `TalkToData`, `PreApprovals`, `ExpenseReports`, `PolicyManager` |
| `components/fraud/` | `ClusterCard` + 4 pattern-specific mini-charts (Smurfing/OutlierViz etc.) |
| `components/globe/` | `GlobeHero` (landing page, react-globe.gl, 25 arcs + rings), `MiniGlobe` (Map View in TalkToData) |
| `components/upload/` | `UploadHero` (drag-drop), `PipelineOverlay` (4-step animated progress) |
| `components/query/ChainOfTrust.tsx` | Shows Det/AI decision path below query results |
| `lib/geoData.ts` | Arc, point, and ring data for both globes (GLOBE_ARCS, GLOBE_POINTS, GLOBE_RINGS) |
| `lib/motion.ts` | Shared Framer Motion variants (FADE_UP, SCALE_IN, cardEnter, FADE_SCALE) |
| `hooks/useAsync.ts` | Generic fetch hook with `{ data, loading, error, reload }` |

### Key design decisions
- **AI efficiency metric**: `Dashboard.tsx` reads `data.ai_call_ratio` from the backend (set by `fraud/pipeline.py`). Falls back to 0.15 (15%) if ratio is 0 but clusters exist (no Gemini key in demo).
- **Violations page** fetches violations with `size: 1000` so all cluster transaction IDs can be matched to `ClusterCard` components in the "Patterns" tab.
- **NL query sandbox**: `ai/nl_query.py` evaluates Gemini-generated pandas expressions with `SAFE_GLOBALS` (no builtins, blocked patterns list). Chart restyling ("show as pie") reuses cached data without hitting Gemini.
- **ElevenLabs**: in `TalkToData.tsx` voice mode. The `update_expense_chart` client tool lets the voice agent trigger chart updates. Do not restructure that component — ElevenLabs session lifecycle is fragile.
- **FX**: all policy checks run on `amount_cad` (USD × 1.379). The $499 USD → $688 CAD threshold bypass is a seeded demo case.

### Seeded fraud patterns (demo)
| Pattern | Employee | Detection |
|---|---|---|
| Smurfing (72h rolling) | Frank Miller | 8 × $49.50 USD within 60h |
| Split billing (collusion) | Frank + Eric Tran | Same merchant, ±28 min, equal amounts |
| Round-number structuring | Grace Lee | 12 × $200/$400/$500 to "Premium Fleet Services Inc" |
| Statistical outlier (Z>3) | CFO | $264K "Intercontinental Fleet Acquisition" |
| Shell vendor | Grace Lee | "Premium Fleet Services Inc" — new vendor, all round numbers |

### Environment variables (`backend/.env`)
```
GEMINI_API_KEY=...         # optional — all AI features gracefully degrade
ELEVENLABS_API_KEY=...     # optional — voice summary in TalkToData
ELEVENLABS_VOICE_ID=...    # defaults to Rachel
FX_RATE_USD_TO_CAD=1.379   # override FX rate
```
