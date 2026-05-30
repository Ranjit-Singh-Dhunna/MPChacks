"""Talk-to-Your-Data: NL question -> pandas expression -> sandboxed execution -> chart.

Gemini is a logic-compiler here, never a calculator. It emits a single pandas expression
which we execute in a locked-down namespace (no builtins, no import/os/sys/eval). Visual-only
follow-ups reuse cached data and skip the DB + LLM entirely.
"""
import re

import pandas as pd
from sqlalchemy.orm import Session

from ai.gemini_client import gemini
from models import Transaction
from schemas import NLQueryResponse, UIConfig

BLOCKED_PATTERNS = [
    r"\bimport\b", r"\bos\b", r"\bsys\b", r"\beval\b", r"\bexec\b",
    r"\bopen\b", r"__\w+__", r"\bsubprocess\b", r"\bgetattr\b",
    r"\bsetattr\b", r"\bglobals\b", r"\blocals\b", r"\bcompile\b",
]

SAFE_GLOBALS = {
    "__builtins__": {},
    "pd": pd,
    "len": len, "sum": sum, "round": round, "abs": abs,
    "min": min, "max": max, "sorted": sorted,
}

COLUMNS_DESC = (
    "transaction_id(str), merchant_name(str), amount_usd(float), amount_cad(float), "
    "transaction_date(datetime64), employee_name(str), department(str), mcc_code(str), "
    "mcc_description(str), ai_category(str), policy_flag(str: COMPLIANT/VIOLATION/REVIEW), "
    "severity(str), ai_risk_score(int), approval_status(str), is_pre_authorized(bool)"
)

_PROMPT = """You are a data analyst for Brim, an expense platform.
User question: "{question}"

A pandas DataFrame `df` has columns:
{columns}

Return ONLY valid JSON:
{{
  "pandas_expression": "<single pandas expression on df returning a DataFrame or scalar>",
  "ui_config": {{"chart_type": "bar|line|pie|area|table", "x_axis": "<col or null>",
                 "y_axis": "<col or null>", "title": "<title>", "color_key": "<col or null>"}},
  "summary": "<1-2 sentence plain-English answer>"
}}

RULES:
- Single expression only. No assignments, imports, os, sys, eval, exec, open, or dunders.
- For grouped totals return a DataFrame with columns ['label','value'], e.g.
  df.groupby('department')['amount_cad'].sum().reset_index().rename(columns={{'department':'label','amount_cad':'value'}})
- For time series use ['label','value'] where label is a date/period string.
- amounts are in CAD (amount_cad) unless the user asks for USD.
"""

# very small in-process cache for conversational follow-ups
_CACHE: dict[str, dict] = {}


def _validate_expression(expr: str) -> None:
    for pat in BLOCKED_PATTERNS:
        if re.search(pat, expr):
            raise ValueError(f"Query rejected for safety (matched {pat!r}).")


def _load_df(db: Session) -> pd.DataFrame:
    rows = db.query(Transaction).all()
    return pd.DataFrame([{
        "transaction_id": t.transaction_id, "merchant_name": t.merchant_name,
        "amount_usd": t.amount_usd, "amount_cad": t.amount_cad,
        "transaction_date": t.transaction_date, "employee_name": t.employee_name,
        "department": t.department, "mcc_code": t.mcc_code,
        "mcc_description": t.mcc_description, "ai_category": t.ai_category,
        "policy_flag": t.policy_flag, "severity": t.severity,
        "ai_risk_score": t.ai_risk_score, "approval_status": t.approval_status,
        "is_pre_authorized": t.is_pre_authorized,
    } for t in rows])


def _result_to_records(result) -> list[dict]:
    if isinstance(result, pd.DataFrame):
        out = result.head(100).copy()
        for c in out.columns:
            if pd.api.types.is_datetime64_any_dtype(out[c]):
                out[c] = out[c].astype(str)
        return out.to_dict(orient="records")
    if isinstance(result, pd.Series):
        return result.head(100).reset_index().rename(
            columns={result.index.name or "index": "label", result.name or 0: "value"}
        ).to_dict(orient="records")
    return [{"label": "result", "value": _json_safe(result)}]


def _json_safe(v):
    try:
        if hasattr(v, "item"):
            return v.item()
    except Exception:  # noqa: BLE001
        pass
    return v


def _fallback_response(question: str, db: Session) -> NLQueryResponse:
    """Deterministic default when Gemini is unavailable or returns bad JSON:
    spend by department (the most common ask)."""
    df = _load_df(db)
    if df.empty:
        data = []
    else:
        data = (df.groupby("department")["amount_cad"].sum().round(2)
                .reset_index().rename(columns={"department": "label", "amount_cad": "value"})
                .to_dict(orient="records"))
    return NLQueryResponse(
        question=question,
        query_string="df.groupby('department')['amount_cad'].sum()",
        data=data,
        ui_config=UIConfig(chart_type="bar", x_axis="label", y_axis="value",
                           title="Spend by Department (CAD)"),
        summary="Showing total spend by department (AI unavailable — deterministic fallback).",
        used_fallback=True,
    )


def run_query(db: Session, question: str, session_id: str = "default") -> NLQueryResponse:
    if not gemini.available:
        return _fallback_response(question, db)

    plan = gemini.call_json(_PROMPT.format(question=question, columns=COLUMNS_DESC))
    if isinstance(plan, dict) and plan.get("_fallback"):
        return _fallback_response(question, db)

    try:
        expr = plan["pandas_expression"]
        _validate_expression(expr)
        df = _load_df(db)
        result = eval(expr, SAFE_GLOBALS, {"df": df})  # noqa: S307 — sandboxed namespace
        data = _result_to_records(result)
        ui = UIConfig(**plan.get("ui_config", {}))
        resp = NLQueryResponse(
            question=question, query_string=expr, data=data,
            ui_config=ui, summary=plan.get("summary", ""),
        )
        _CACHE[session_id] = {"data": data, "ui": ui.model_dump(),
                              "summary": resp.summary, "expr": expr}
        return resp
    except ValueError:
        raise  # safety rejection -> surfaced as HTTP 400 by the router
    except Exception:  # noqa: BLE001 — bad expression etc. -> deterministic fallback
        return _fallback_response(question, db)


def restyle_cached(session_id: str, chart_type: str) -> NLQueryResponse | None:
    """Visual-only follow-up ('make it a pie chart'): reuse cached data, no DB/LLM."""
    cached = _CACHE.get(session_id)
    if not cached:
        return None
    ui = dict(cached["ui"])
    ui["chart_type"] = chart_type
    return NLQueryResponse(
        question=f"(restyle to {chart_type})", query_string=cached["expr"],
        data=cached["data"], ui_config=UIConfig(**ui),
        summary=cached["summary"], used_fallback=False,
    )
