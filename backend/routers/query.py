"""Talk-to-Your-Data NL query endpoint."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ai.nl_query import restyle_cached, run_query
from ai.voice import text_to_speech
from database import get_db
from schemas import NLQueryResponse, QueryRequest

router = APIRouter(prefix="/api", tags=["query"])

_RESTYLE = {"bar": "bar", "line": "line", "pie": "pie", "area": "area", "table": "table"}


@router.post("/query", response_model=NLQueryResponse)
async def query(req: QueryRequest, db: Session = Depends(get_db)):
    # Visual-only follow-up ("change to pie chart") — reuse cached data, no DB/LLM.
    lowered = req.question.lower()
    for chart in _RESTYLE:
        if f"{chart} chart" in lowered or lowered.strip() == chart:
            cached = restyle_cached(req.session_id, chart)
            if cached:
                return cached
            break

    try:
        resp = await asyncio.to_thread(run_query, db, req.question, req.session_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if req.voice and resp.summary:
        audio = await asyncio.to_thread(text_to_speech, resp.summary)
        resp.audio_base64 = audio
    return resp
