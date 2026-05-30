"""Idempotent seeding of employees and default (fallback) policy rules."""
import json

from sqlalchemy.orm import Session

from config import settings
from models import Employee, Policy

# Default rules — also used as the fallback when PDF extraction fails.
DEFAULT_RULES = [
    {
        "rule_name": "Pre-authorization threshold",
        "rule_type": "AMOUNT_LIMIT",
        "rule_parameters": {"max_amount_usd": 50.0, "applies_to_mcc": None},
        "severity": "HIGH",
        "source_text": "All expenses over $50.00 must be pre-authorized by your manager and receipts are required before any expense is reimbursed.",
    },
    {
        "rule_name": "General tips cap",
        "rule_type": "TIP_CAP",
        "rule_parameters": {"meal_type": "GENERAL", "max_tip_pct": 15.0},
        "severity": "MEDIUM",
        "source_text": "Tips may be expensed, up to fifteen percent (15%) for services and porterage.",
    },
    {
        "rule_name": "Meal tips cap",
        "rule_type": "TIP_CAP",
        "rule_parameters": {"meal_type": "MEAL", "max_tip_pct": 20.0},
        "severity": "MEDIUM",
        "source_text": "Meal tips are to be included with meal claims and will not be reimbursed above twenty percent (20%).",
    },
    {
        "rule_name": "Alcohol Restriction",
        "rule_type": "MCC_BANNED",
        "rule_parameters": {"item": "Alcohol", "exception": "Dining with a customer"},
        "severity": "CRITICAL",
        "source_text": "Unless dining with a customer, expensing alcoholic beverages is not permitted.",
    },
    {
        "rule_name": "Vehicle Sharing & Size",
        "rule_type": "VEHICLE_RESTRICTION",
        "rule_parameters": {"min_travelers_for_nonstandard": 4, "share_required": True},
        "severity": "HIGH",
        "source_text": "If there are multiple Company team members at the same location, you may be required to share a car. If business reasons dictate the use of a non-standard vehicle (i.e., four (4) or more Company travelers), you will be reimbursed accordingly.",
    },
    {
        "rule_name": "Exclusions from Reimbursement",
        "rule_type": "EXCLUDED_REIMBURSEMENT",
        "rule_parameters": {"excluded_items": ["traffic tickets", "parking tickets", "personal car rentals", "personal credit card fees"]},
        "severity": "CRITICAL",
        "source_text": "Brim does not pay for traffic or parking tickets, or for cars rented for personal use. The fees for other personal credit cards are not reimbursed by the Company.",
    },
    {
        "rule_name": "Corporate Card Restriction",
        "rule_type": "CARD_USAGE_RESTRICTION",
        "rule_parameters": {"authorized_user_only": True},
        "severity": "CRITICAL",
        "source_text": "Only the individual named on the card may use it.",
    },
    {
        "rule_name": "Receipt required over $50",
        "rule_type": "RECEIPT_REQUIRED",
        "rule_parameters": {"min_amount_usd": 50.0},
        "severity": "MEDIUM",
        "source_text": "All expenses over $50.00 must be pre-authorized by your manager and receipts are required before any expense is reimbursed.",
    },
]


def seed_employees(db: Session) -> int:
    if db.query(Employee).count() > 0:
        return 0
    if not settings.employees_json.exists():
        return 0
    records = json.loads(settings.employees_json.read_text())
    for e in records:
        db.add(Employee(
            employee_id=e["employee_id"],
            transaction_code=e["transaction_code"],
            name=e["name"],
            department=e["department"],
            manager_id=e.get("manager_id"),
            job_level=e["job_level"],
            monthly_budget=e["monthly_budget"],
            email=e["email"],
        ))
    db.commit()
    return len(records)


def seed_policies(db: Session) -> int:
    if db.query(Policy).count() > 0:
        return 0
    for rule in DEFAULT_RULES:
        db.add(Policy(**rule))
    db.commit()
    return len(DEFAULT_RULES)
