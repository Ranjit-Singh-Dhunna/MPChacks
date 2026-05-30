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
        "source_text": "All transactions exceeding $50 require prior manager approval.",
    },
    {
        "rule_name": "FX-adjusted threshold",
        "rule_type": "FX_THRESHOLD",
        "rule_parameters": {"max_amount_cad": 68.95,
                            "note": "Check CAD-equivalent, not stated currency."},
        "severity": "HIGH",
        "source_text": "Thresholds apply to the CAD-equivalent amount after conversion.",
    },
    {
        "rule_name": "Banned merchant categories",
        "rule_type": "MCC_BANNED",
        "rule_parameters": {"mcc_codes": ["7995", "7993", "7996"],
                            "description": "Gambling / gaming"},
        "severity": "CRITICAL",
        "source_text": "Gambling and gaming transactions are strictly prohibited.",
    },
    {
        "rule_name": "Lunch tip cap",
        "rule_type": "TIP_CAP",
        "rule_parameters": {"meal_type": "LUNCH", "max_tip_pct": 15.0},
        "severity": "MEDIUM",
        "source_text": "Lunch tips may not exceed 15%.",
    },
    {
        "rule_name": "Dinner tip cap",
        "rule_type": "TIP_CAP",
        "rule_parameters": {"meal_type": "DINNER", "max_tip_pct": 20.0},
        "severity": "MEDIUM",
        "source_text": "Dinner tips may not exceed 20%.",
    },
    {
        "rule_name": "Receipt required over $50",
        "rule_type": "RECEIPT_REQUIRED",
        "rule_parameters": {"min_amount_usd": 50.0},
        "severity": "MEDIUM",
        "source_text": "A receipt is required for any transaction over $50.",
    },
    {
        "rule_name": "Monthly budget cap",
        "rule_type": "BUDGET_CAP",
        "rule_parameters": {"period": "MONTHLY"},
        "severity": "MEDIUM",
        "source_text": "Spending may not exceed the employee's monthly budget.",
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
