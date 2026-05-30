"""Build the detailed report view (summary + line items with inline policy status)."""
from sqlalchemy.orm import Session

from models import ExpenseReport, Transaction
from schemas import ExpenseReportDetail, ReportLineItem


def build_detail(db: Session, report: ExpenseReport) -> ExpenseReportDetail:
    txns = (db.query(Transaction)
            .filter(Transaction.expense_report_id == report.report_id)
            .order_by(Transaction.transaction_date)
            .all())
    line_items = [ReportLineItem(
        transaction_id=t.transaction_id,
        merchant_name=t.merchant_name,
        amount_cad=t.amount_cad,
        transaction_date=t.transaction_date,
        mcc_description=t.mcc_description,
        policy_flag=t.policy_flag,
        severity=t.severity,
        flag_reason=t.flag_reason,
    ) for t in txns]

    return ExpenseReportDetail(
        report_id=report.report_id,
        trip_id=report.trip_id,
        employee_name=report.employee_name,
        start_date=report.start_date,
        end_date=report.end_date,
        total_amount_cad=report.total_amount_cad,
        line_item_count=report.line_item_count,
        violation_count=report.violation_count,
        status=report.status,
        ai_summary=report.ai_summary,
        approved_by=report.approved_by,
        line_items=line_items,
    )
