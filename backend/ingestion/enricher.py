"""Transaction enrichment: FX normalization, MCC lookup, employee assignment.

The FX normalization here is load-bearing: every threshold check downstream runs on
amount_cad, never amount_usd. A $499 USD charge becomes ~$688 CAD and is checked as such.
"""
import json
from functools import lru_cache

from config import settings


@lru_cache(maxsize=1)
def _mcc_table() -> dict:
    if settings.mcc_codes_json.exists():
        return json.loads(settings.mcc_codes_json.read_text())
    return {}


def lookup_mcc_description(mcc_code: str) -> str:
    return _mcc_table().get(str(mcc_code), {}).get("description", "Unknown")


def lookup_mcc_category(mcc_code: str) -> str:
    return _mcc_table().get(str(mcc_code), {}).get("category", "Uncategorized")


def compute_amount_cad(amount_usd: float, conversion_rate: float | None = None) -> float:
    """Normalize to CAD before any policy/threshold check."""
    rate = conversion_rate or settings.fx_rate_usd_to_cad
    return round(float(amount_usd) * float(rate), 2)


@lru_cache(maxsize=1)
def _employee_by_code() -> dict:
    """Map transaction_code -> employee record from employees.json."""
    if not settings.employees_json.exists():
        return {}
    employees = json.loads(settings.employees_json.read_text())
    return {e["transaction_code"]: e for e in employees}


def assign_employee(transaction_code: str) -> dict | None:
    return _employee_by_code().get(transaction_code)
