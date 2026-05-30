"""Expense report generation, listing, detail, and CFO approval."""
import asyncio

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import ExpenseReport
from reports.formatter import build_detail
from reports.generator import generate_reports
from schemas import (
    ExpenseReportDetail,
    ExpenseReportSummary,
    ReportApproveRequest,
    ReportGenerateRequest,
)

router = APIRouter(prefix="/api", tags=["reports"])


@router.get("/reports", response_model=list[ExpenseReportSummary])
def list_reports(db: Session = Depends(get_db)):
    rows = db.query(ExpenseReport).order_by(ExpenseReport.start_date.desc()).all()
    return [ExpenseReportSummary.model_validate(r) for r in rows]


@router.post("/reports/generate", response_model=list[ExpenseReportSummary])
async def generate(req: ReportGenerateRequest, db: Session = Depends(get_db)):
    reports = await asyncio.to_thread(
        generate_reports, db, req.employee_id, req.start_date, req.end_date)
    return [ExpenseReportSummary.model_validate(r) for r in reports]


@router.get("/reports/{report_id}", response_model=ExpenseReportDetail)
def get_report(report_id: str, db: Session = Depends(get_db)):
    report = db.query(ExpenseReport).filter_by(report_id=report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    return build_detail(db, report)


@router.post("/reports/{report_id}/approve", response_model=ExpenseReportSummary)
def approve_report(report_id: str, req: ReportApproveRequest, db: Session = Depends(get_db)):
    report = db.query(ExpenseReport).filter_by(report_id=report_id).first()
    if not report:
        raise HTTPException(404, "Report not found")
    report.status = "APPROVED"
    report.approved_by = req.approved_by
    db.commit()
    db.refresh(report)
    return ExpenseReportSummary.model_validate(report)
