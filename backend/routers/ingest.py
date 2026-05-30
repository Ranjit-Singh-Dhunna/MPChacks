"""Ingestion + analysis endpoints."""
import asyncio

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from fraud.pipeline import run_fraud_pipeline
from ingestion.loader import load_csv
from schemas import AnalysisResult, IngestRequest, IngestResult

router = APIRouter(prefix="/api", tags=["ingest"])


@router.post("/ingest", response_model=IngestResult)
def ingest(req: IngestRequest, db: Session = Depends(get_db)):
    result = load_csv(db)  # uses default data/transactions.csv
    return IngestResult(**result)


@router.post("/analyze", response_model=AnalysisResult)
async def analyze(db: Session = Depends(get_db)):
    # Run the (CPU-bound) pipeline off the event loop.
    result = await asyncio.to_thread(run_fraud_pipeline, db)
    return AnalysisResult(**result)
