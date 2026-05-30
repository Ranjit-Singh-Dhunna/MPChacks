"""Auto-group transactions into CFO-ready expense reports.

Grouping precedence: trip_id, else (employee + calendar month). Each report carries inline
per-line policy status and an AI exception summary (deterministic fallback if no LLM).
"""
from datetime import datetime

from sqlalchemy.orm import Session

from ai.gemini_client import gemini
from models import ExpenseReport, Transaction

_SUMMARY_PROMPT = """You are preparing a CFO-facing expense report summary.

Employee: {employee}
Period: {start} to {end}
Line items: {count}
Total: ${total:,.2f} CAD
Policy exceptions: {violations}
Exception details: {details}

Write ONLY valid JSON: {{"summary": "<2-3 sentence CFO-facing summary noting any exceptions>"}}
"""


def _deterministic_summary(employee, count, total, violations, details) -> str:
    if violations == 0:
        return (f"{employee}'s report covers {count} line items totalling "
                f"${total:,.2f} CAD with no policy exceptions. Ready for approval.")
    return (f"{employee}'s report covers {count} line items totalling ${total:,.2f} CAD "
            f"with {violations} policy exception(s): {details}. CFO review recommended.")


def _ai_summary(employee, start, end, count, total, violations, details) -> str:
    fallback = _deterministic_summary(employee, count, total, violations, details)
    if not gemini.available:
        return fallback
    res = gemini.call_json(_SUMMARY_PROMPT.format(
        employee=employee, start=start, end=end, count=count,
        total=total, violations=violations, details=details or "none"))
    if isinstance(res, dict) and not res.get("_fallback"):
        return str(res.get("summary", fallback))[:1000]
    return fallback


def _build_report(db: Session, report_id: str, trip_id: str | None,
                  txns: list[Transaction]) -> ExpenseReport:
    txns = sorted(txns, key=lambda t: t.transaction_date)
    total = round(sum(t.amount_cad for t in txns), 2)
    violations = [t for t in txns if t.policy_flag in ("VIOLATION", "REVIEW")]
    details = "; ".join(t.flag_reason for t in violations[:3] if t.flag_reason)
    summary = _ai_summary(
        txns[0].employee_name, txns[0].transaction_date.date(),
        txns[-1].transaction_date.date(), len(txns), total, len(violations), details)

    report = ExpenseReport(
        report_id=report_id,
        trip_id=trip_id,
        employee_id=txns[0].employee_id,
        employee_name=txns[0].employee_name,
        start_date=txns[0].transaction_date,
        end_date=txns[-1].transaction_date,
        total_amount_cad=total,
        line_item_count=len(txns),
        violation_count=len(violations),
        status="SUBMITTED",
        ai_summary=summary,
    )
    # link transactions to the report
    for t in txns:
        t.expense_report_id = report_id
    return report


def generate_reports(db: Session, employee_id: str | None = None,
                     start_date: str | None = None,
                     end_date: str | None = None) -> list[ExpenseReport]:
    """(Re)generate reports. Clears existing reports and regroups."""
    q = db.query(Transaction)
    if employee_id:
        q = q.filter(Transaction.employee_id == employee_id)
    if start_date:
        q = q.filter(Transaction.transaction_date >= datetime.fromisoformat(start_date))
    if end_date:
        q = q.filter(Transaction.transaction_date <= datetime.fromisoformat(end_date))
    txns = q.all()

    db.query(ExpenseReport).delete()
    for t in db.query(Transaction).all():
        t.expense_report_id = None

    groups: dict[str, list[Transaction]] = {}
    for t in txns:
        if t.trip_id:
            key = f"trip::{t.trip_id}"
        else:
            key = f"emp::{t.employee_id}::{t.transaction_date.strftime('%Y-%m')}"
        groups.setdefault(key, []).append(t)

    reports = []
    seq = 1
    for key, group in sorted(groups.items()):
        if len(group) < 2:
            continue  # skip singletons — not worth a report
        trip_id = group[0].trip_id if key.startswith("trip::") else None
        report_id = f"RPT-{seq:04d}"
        reports.append(_build_report(db, report_id, trip_id, group))
        seq += 1

    db.add_all(reports)
    db.commit()
    return reports
