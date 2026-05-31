import logging
from datetime import datetime

from sqlalchemy import or_
from sqlalchemy.orm import Session

from ai.gemini_client import gemini
from models import Transaction
from schemas import AIReportResponse, ReportGroup, ReportTransaction

logger = logging.getLogger(__name__)

_PARSE_PROMPT = """
You are an AI assistant generating an expense report.
Parse this user request and return a JSON object with filtering parameters.
Request: "{query}"

Return exactly this JSON schema:
{{
    "employee_name": "string or null (if looking for a specific person's expenses)",
    "department": "string or null (if looking for a specific department)",
    "group_by": "string: 'category' or 'employee' or 'date'",
    "report_title": "string: a professional title for this report"
}}
"""

_SUMMARY_PROMPT = """
You are a CFO-level AI assistant. Write a short, professional executive summary (2-3 sentences) for an expense report.
Here is the data summary:
Report Title: {title}
Total Spend: ${total}
Number of Transactions: {count}
Key Groups: {groups}

Write the summary analyzing the spend and noting any policy violations if they exist in the data.
"""

def generate_ai_report(db: Session, query: str) -> AIReportResponse:
    # 1. Parse intent
    plan = {"employee_name": None, "department": None, "group_by": "category", "report_title": "AI Expense Report"}
    if gemini.available:
        parsed = gemini.call_json(_PARSE_PROMPT.format(query=query))
        if isinstance(parsed, dict) and not parsed.get("_fallback"):
            plan.update(parsed)

    logger.info("AI Report Plan: %s", plan)

    # 2. Fetch data
    q = db.query(Transaction)
    if plan["employee_name"]:
        q = q.filter(Transaction.employee_name.ilike(f"%{plan['employee_name']}%"))
    if plan["department"]:
        q = q.filter(Transaction.department.ilike(f"%{plan['department']}%"))
    
    rows = q.order_by(Transaction.transaction_date.desc()).limit(100).all()

    # 3. Group data
    groups_dict = {}
    total_spend = 0.0
    for t in rows:
        total_spend += t.amount_usd
        if plan["group_by"] == "employee":
            g_key = t.employee_name
        elif plan["group_by"] == "date":
            g_key = t.transaction_date.strftime("%Y-%m-%d")
        else:
            g_key = t.ai_category or t.mcc_description or "Other"
        
        if g_key not in groups_dict:
            groups_dict[g_key] = {"category": g_key, "total": 0.0, "txns": []}
        
        groups_dict[g_key]["total"] += t.amount_usd
        groups_dict[g_key]["txns"].append(
            ReportTransaction(
                transaction_id=t.transaction_id,
                merchant_name=t.merchant_name,
                amount_usd=t.amount_usd,
                transaction_date=t.transaction_date.strftime("%Y-%m-%d"),
                mcc_description=t.mcc_description,
                policy_flag=t.policy_flag,
                flag_reason=t.flag_reason
            )
        )

    report_groups = []
    group_summaries = []
    for g in groups_dict.values():
        report_groups.append(ReportGroup(
            category=g["category"],
            total_amount=round(g["total"], 2),
            transactions=g["txns"]
        ))
        group_summaries.append(f"{g['category']} (${round(g['total'], 2)})")

    # 4. Generate narrative
    executive_summary = "A summary of recent expenditures."
    if gemini.available and rows:
        summary_resp = gemini.call_json(_SUMMARY_PROMPT.format(
            title=plan["report_title"],
            total=round(total_spend, 2),
            count=len(rows),
            groups=", ".join(group_summaries[:5])
        ), response_schema={"type": "object", "properties": {"summary": {"type": "string"}}})
        
        if isinstance(summary_resp, dict) and "summary" in summary_resp:
            executive_summary = summary_resp["summary"]

    return AIReportResponse(
        report_title=plan["report_title"],
        employee_name=plan["employee_name"] or ("Multiple" if not plan["department"] else plan["department"]),
        date_range="Recent",
        total_spend=round(total_spend, 2),
        executive_summary=executive_summary,
        groups=report_groups
    )
