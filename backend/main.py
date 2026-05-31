"""Brim API — FastAPI application entrypoint."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import SessionLocal, init_db
from routers import approvals, compliance, fraud_intel, ingest, policy, query, reports, transactions
from seed import seed_employees, seed_policies


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed_employees(db)
        seed_policies(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Brim — Expense Intelligence API",
    version="1.0.0",
    description="Deterministic-first / AI-second expense intelligence platform.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (ingest, transactions, policy, query, approvals, reports, compliance, fraud_intel):
    app.include_router(r.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "gemini": settings.has_gemini,
        "elevenlabs": settings.has_elevenlabs,
    }
