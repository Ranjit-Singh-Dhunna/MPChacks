# Brim — AI-Powered Expense Intelligence Platform

An AI expense intelligence platform for SMBs, built on a **deterministic-first / AI-second**
pipeline. Python rules and pandas clustering handle ~85 % of transactions and policy checks.
Google Gemini is invoked only as a *reasoner and translator* on the ~5–15 % that are flagged
or anomalous — it never calculates.

---

## Capabilities

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Talk to Your Data** | Natural-language queries → charts, tables, and voice summaries (ElevenLabs). Chain-of-trust shows whether the answer came from deterministic logic or AI. |
| 2 | **Policy Compliance Engine** | Upload a PDF policy → AI extracts editable rules → deterministic per-transaction checks with severity levels. |
| 3 | **Fraud Cluster Detection** | Ten pure-pandas detectors (smurfing, split billing, structuring, outlier, shell vendor, Benford's law, velocity spike, duplicate expense, peer anomaly, merchant concentration) with optional Gemini narrative on CRITICAL/HIGH clusters. |
| 4 | **AI Pre-Approval Workflow** | Dossier-first approval queue — confidence gauge, AI recommendation, risk/mitigating factors, policy compliance, and budget utilization are shown for every pending transaction. |
| 5 | **Automated Expense Reports** | Auto-grouped, policy-checked reports with AI executive summaries and PDF export. |
| 6 | **Compliance Case Management** | Cases auto-generated from fraud clusters and violations. Escalate, request info, dismiss, or add notes with a full audit trail. |

---

## Architecture

```
CSV → POST /api/ingest → SQLite (4,235 rows, FX-normalized to CAD)
                ↓
POST /api/analyze → fraud/pipeline.py
  Tier 1: policy/rule_engine.py    — deterministic per-transaction checks
  Tier 2: fraud/detectors.py       — pandas clustering (5 pattern types)
  Tier 3: ai/gemini_client.py      — Gemini called ONLY on CRITICAL/HIGH clusters
                ↓
compliance/cases.py → ComplianceCase rows (audit queue)
```

### Fraud Detection Justification
Brim's `engine.py` implements a 10-detector deterministic and statistical pipeline instead of relying solely on an LLM for fraud detection. 
This is because expense fraud is often numerical and systemic, which LLMs struggle to catch reliably across thousands of rows without hallucinating or missing strict mathematical conditions. 
Our pandas-based engine targets 10 unique "kill zones"—classes of fraud that require specialized logical or statistical evaluation:
- **Smurfing / Structuring**: Circumvents hard limits via multiple smaller charges. Requires historical windowing.
- **Split Billing / Duplicate Expenses**: Identifies deliberate cost-splitting across employees or copy-pasted receipts.
- **Statistical Outliers / Peer Anomalies**: Flags extreme variations within an MCC or department using Z-scores.
- **Benford's Law**: A Big 4 forensic accounting standard. Proves fabrication if an employee's expense amounts deviate from the expected logarithmic digit distribution.
- **Velocity Spikes**: Compares current spending frequency and volume against a personalized rolling historical baseline.
- **Merchant Concentration (HHI) / Shell Vendors**: Uses Herfindahl-Hirschman Index and vendor age to catch kickback schemes or employee-owned shell companies.
By computing these deterministically, the engine guarantees 100% auditable, hallucination-free compliance, reserving LLMs strictly for plain-english summarization (Tier 3).

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Backend** | Python 3.11 · FastAPI · SQLAlchemy · SQLite · Pandas · SciPy |
| **AI** | Google Gemini (`google-generativeai`) — reasoner / translator only |
| **Voice** | ElevenLabs — TalkToData voice summaries |
| **Frontend** | React 19 · TypeScript 5.7 · Vite 6 · Tailwind CSS 3 |
| **Visualization** | Recharts · react-globe.gl · Three.js · Framer Motion |
| **PDF** | html2canvas + jsPDF (frontend) · PyPDF2 (backend policy extraction) |
| **Infra** | Docker Compose (2-service) |

---

## Quickstart

### Option A — Docker (recommended)

```bash
cp .env.example .env          # add keys (both optional)
docker compose up --build     # backend :8000, frontend :5173
```

### Option B — Manual

#### 1. Generate synthetic data

```bash
cd data
python generate_data.py       # writes transactions.csv + employees.json
```

#### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env       # then fill in keys (optional)
uvicorn main:app --reload     # http://localhost:8000/docs
```

Then load and analyze the data:

```bash
curl -X POST http://localhost:8000/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"use_default": true}'
curl -X POST http://localhost:8000/api/analyze
```

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

---

## Environment Variables

All keys are optional — every AI feature gracefully degrades when keys are absent.

| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_API_KEY` | — | Enables AI narratives, NL queries, policy extraction, dossier reasoning |
| `ELEVENLABS_API_KEY` | — | Enables voice summaries in Talk to Data |
| `ELEVENLABS_VOICE_ID` | Rachel | Voice selection for ElevenLabs |
| `FX_RATE_USD_TO_CAD` | `1.379` | Override the USD → CAD exchange rate |

---

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | **Home** | Animated 3D globe hero, feature cards, CSV drag-drop upload with 4-step pipeline overlay |
| `/dashboard` | **Dashboard** | KPI cards (spend, violations, pending approvals, fraud clusters, AI efficiency), category breakdown, recent flagged transactions |
| `/query` | **Talk to Data** | Natural-language input + voice mode → dynamic charts (bar, line, pie, area, table) with chain-of-trust visualization |
| `/violations` | **Compliance** | Two tabs — *Cases* (risk-scored compliance case cards) and *Patterns* (fraud cluster cards with pattern-specific mini-charts) |
| `/approvals` | **Approvals** | Dossier-first view — confidence ring, AI recommendation, risk/mitigating factors, policy compliance, budget utilization, employee history. Prev/Next with `←`/`→` keyboard shortcuts, sort by risk or recency |
| `/approvals/history` | **Approval Queue** | Full table of pending approvals with AI verdict, risk bar, policy status, and "viewed" indicators |
| `/reports` | **Expense Reports** | AI chat interface — type a prompt (e.g. "Generate a report for Sarah's San Diego trip"), get a live PDF preview with AI executive summary |
| `/reports/:id` | **Report Detail** | Individual report with AI summary, line items, PDF preview, and CFO approval |
| `/policy` | **Policy Settings** | Three tabs — *Active Rules*, *Upload Policy* (PDF → extracted rules), *Rule Builder* |

---

## Backend API

| Router | Key Endpoints |
|--------|--------------|
| **Ingest** | `POST /api/ingest` — CSV ingestion with FX normalization |
| **Analyze** | `POST /api/analyze` — Runs the full Tier 1–3 pipeline |
| **Dashboard** | `GET /api/dashboard` — Aggregated stats |
| **Transactions** | `GET /api/transactions` — Paginated, filterable list |
| **Compliance** | `GET /api/compliance/overview` · `GET /api/compliance/cases` · `PATCH /api/compliance/cases/{id}` · `GET /api/compliance/violations` · `GET /api/compliance/export` |
| **Approvals** | `GET /api/approvals` — AI-enriched dossiers · `POST /api/approvals/{id}/decide` |
| **Query** | `POST /api/query` — NL → pandas → results + chart config |
| **Reports** | `GET /api/reports` · `POST /api/reports/generate` · `POST /api/reports/{id}/approve` · `POST /api/reports/ai-generate` |
| **Policy** | `CRUD /api/policy/rules` · `POST /api/policy/upload` (PDF extraction) |
| **Fraud Intel** | `GET /api/fraud/clusters` · `GET /api/fraud/intelligence` · `GET /api/fraud/risk-profiles` |

Full Swagger docs available at `http://localhost:8000/docs`.

---

## Project Structure

```
├── backend/
│   ├── main.py                  # FastAPI app, CORS, router registration
│   ├── models.py                # SQLAlchemy ORM (Transaction, Employee, Policy, etc.)
│   ├── schemas.py               # Pydantic request/response models
│   ├── config.py                # Environment settings (pydantic-settings)
│   ├── database.py              # SQLite connection + session management
│   ├── ai/
│   │   ├── gemini_client.py     # Thin Gemini wrapper with fallback
│   │   ├── nl_query.py          # NL → pandas expression (sandboxed eval)
│   │   ├── dossier.py           # Pre-approval AI dossier builder
│   │   ├── report_generator.py  # AI-powered report generation
│   │   └── voice.py             # ElevenLabs TTS integration
│   ├── fraud/
│   │   ├── engine.py            # Pattern detectors + anomaly scoring
│   │   └── pipeline.py          # Tier 1–3 orchestrator
│   ├── compliance/
│   │   └── cases.py             # Cluster + violation → ComplianceCase sync
│   ├── ingestion/
│   │   ├── loader.py            # CSV data loading
│   │   └── enricher.py          # Transaction enrichment + FX
│   ├── policy/
│   │   ├── rule_engine.py       # Deterministic per-transaction checks
│   │   ├── extractor.py         # PDF → rules extraction (via Gemini)
│   │   └── evaluator.py         # Rule evaluation engine
│   ├── reports/
│   │   ├── generator.py         # Expense report builder
│   │   ├── formatter.py         # Report formatting
│   │   └── latex.py             # LaTeX export
│   └── routers/                 # One file per domain
│       ├── ingest.py
│       ├── transactions.py
│       ├── compliance.py
│       ├── approvals.py
│       ├── query.py
│       ├── reports.py
│       ├── policy.py
│       └── fraud_intel.py
│
├── frontend/
│   └── src/
│       ├── App.tsx              # Routes + Layout wrapper
│       ├── index.css            # Design tokens, dark mode, component styles
│       ├── api/client.ts        # All API calls (axios, proxied via Vite)
│       ├── pages/               # 9 page components (see table above)
│       ├── components/
│       │   ├── charts/          # SmartChart (Recharts wrapper)
│       │   ├── fraud/           # ClusterCard + pattern mini-charts
│       │   ├── globe/           # GlobeHero + MiniGlobe (react-globe.gl)
│       │   ├── layout/          # Sidebar, dark mode toggle
│       │   ├── query/           # ChainOfTrust visualization
│       │   ├── reports/         # ReportPreview (PDF export)
│       │   ├── ui/              # Badge, KPICard, PageHeader, SideDrawer
│       │   └── upload/          # UploadHero, PipelineOverlay
│       ├── hooks/useAsync.ts    # Generic fetch hook
│       ├── lib/                 # Utilities (format, geoData, motion, theme, pdfExport)
│       └── types/index.ts       # All TypeScript interfaces
│
├── data/
│   ├── generate_data.py         # Synthetic CSV + JSON generator
│   ├── transactions.csv         # Default demo dataset (~4,235 rows)
│   ├── employees.json           # Employee seed data
│   └── mcc_codes.json           # MCC code reference lookup
│
├── docs/
│   ├── engineering-decisions-taken.md
│   └── valsoft_dataset_observations.md
│
├── docker-compose.yml
├── .env.example
└── CLAUDE.md                    # AI coding assistant guidance
```

---

## Seeded Fraud Patterns (Demo)

| Pattern | Actor | What to look for |
|---------|-------|-----------------|
| Smurfing (72 h cumulative) | Frank Miller | 8 × $49.50 USD across 60 h → $546 CAD > $500 budget |
| Split billing (collusion) | Frank + Eric Tran | $78 USD each at "Roadside Grill Co" within 28 min |
| Round-number structuring | Grace Lee | 12 × exact $200/$400/$500 to "Premium Fleet Services Inc" |
| Statistical outlier (Z > 3) | CFO | $264 K CAD "Intercontinental Fleet Acquisition" |
| Shell vendor | Grace Lee | "Premium Fleet Services Inc" — new vendor, all round numbers |

**FX demo beat:** A $499 USD charge becomes **$688 CAD** and silently breaches the $500
threshold — caught because all policy checks run on the CAD-normalized amount.

---

## Design System

The frontend ships with a full dual-theme (light + dark) design token system:

- **Light mode**: Warm paper tones (`#f6f4ee`), deep blue accent (`#0051d5`)
- **Dark mode**: Binance-inspired (`#0b0e11` base, `#FCD535` gold accent)
- **Typography**: Inter (UI), JetBrains Mono (financial data), serif (headings)
- **Theming**: All components use CSS custom properties — the dark mode toggle flips the entire UI instantly

---

## License

Private — MPC Hacks 2026.
