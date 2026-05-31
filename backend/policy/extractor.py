"""Policy PDF -> structured JSON rules with deterministic extraction first."""
import re

from ai.gemini_client import gemini
from seed import DEFAULT_RULES

_PROMPT = """You are a compliance officer extracting expense-policy rules from a document.

Policy text:
\"\"\"
{policy_text}
\"\"\"

Extract all expense policy rules. Return ONLY a valid JSON array, no prose:
[
  {{
    "rule_name": "<short name>",
    "rule_type": "AMOUNT_LIMIT|MCC_BANNED|TIP_CAP|RECEIPT_REQUIRED|BUDGET_CAP|FX_THRESHOLD|EXCLUDED_REIMBURSEMENT|CARD_USAGE_RESTRICTION|VEHICLE_RESTRICTION",
    "rule_parameters": {{<type-specific object>}},
    "severity": "CRITICAL|HIGH|MEDIUM|LOW",
    "source_text": "<exact quote>"
  }}
]

rule_parameters by rule_type:
- AMOUNT_LIMIT: {{"max_amount_usd": float, "applies_to_mcc": [str] or null}}
- MCC_BANNED: {{"mcc_codes": [str], "description": str}}
- TIP_CAP: {{"meal_type": "LUNCH|DINNER|ANY", "max_tip_pct": float}}
- RECEIPT_REQUIRED: {{"min_amount_usd": float}}
- BUDGET_CAP: {{"period": "MONTHLY", "department": str or null, "limit_cad": float or null}}
- FX_THRESHOLD: {{"max_amount_cad": float, "note": str}}
- EXCLUDED_REIMBURSEMENT: {{"excluded_items": [str]}}
- CARD_USAGE_RESTRICTION: {{"authorized_user_only": bool}}
- VEHICLE_RESTRICTION: {{"min_travelers_for_nonstandard": int, "share_required": bool}}
"""

_VALID_TYPES = {"AMOUNT_LIMIT", "MCC_BANNED", "TIP_CAP",
                "RECEIPT_REQUIRED", "BUDGET_CAP", "FX_THRESHOLD",
                "EXCLUDED_REIMBURSEMENT", "CARD_USAGE_RESTRICTION",
                "VEHICLE_RESTRICTION"}
_VALID_SEV = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    try:
        import io

        import pdfplumber

        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            return "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception:  # noqa: BLE001
        # Maybe it's a plain-text file uploaded as .pdf — try utf-8
        try:
            return pdf_bytes.decode("utf-8", errors="ignore")
        except Exception:  # noqa: BLE001
            return ""


def _validate(rules) -> list[dict]:
    clean = []
    if not isinstance(rules, list):
        return clean
    for r in rules:
        if not isinstance(r, dict):
            continue
        if r.get("rule_type") not in _VALID_TYPES:
            continue
        sev = r.get("severity", "MEDIUM")
        clean.append({
            "rule_name": str(r.get("rule_name", "Unnamed rule"))[:128],
            "rule_type": r["rule_type"],
            "rule_parameters": r.get("rule_parameters") or {},
            "severity": sev if sev in _VALID_SEV else "MEDIUM",
            "source_text": str(r.get("source_text", ""))[:1000],
        })
    return clean


def _deterministic_extract(text: str) -> list[dict]:
    normalized = " ".join(text.split())
    lower = normalized.lower()
    rules: list[dict] = []

    amount_match = re.search(r"(?:over|above|exceed(?:ing)?|greater than)\s*\$?\s*(\d+(?:\.\d{1,2})?)", lower)
    if amount_match and ("pre-author" in lower or "pre author" in lower):
        limit = float(amount_match.group(1))
        rules.append({
            "rule_name": "Pre-authorization threshold",
            "rule_type": "AMOUNT_LIMIT",
            "rule_parameters": {"max_amount_usd": limit, "applies_to_mcc": None},
            "severity": "HIGH",
            "source_text": amount_match.group(0),
        })
    if amount_match and "receipt" in lower:
        limit = float(amount_match.group(1))
        rules.append({
            "rule_name": f"Receipt required over ${limit:.0f}",
            "rule_type": "RECEIPT_REQUIRED",
            "rule_parameters": {"min_amount_usd": limit},
            "severity": "MEDIUM",
            "source_text": amount_match.group(0),
        })
    if "alcohol" in lower or "alcoholic beverage" in lower:
        rules.append({
            "rule_name": "Alcohol restriction",
            "rule_type": "MCC_BANNED",
            "rule_parameters": {"item": "alcohol", "keywords": ["alcohol", "liquor"]},
            "severity": "CRITICAL",
            "source_text": "alcoholic beverages are not permitted",
        })
    excluded = []
    for item in ("traffic tickets", "parking tickets", "personal car rentals", "personal credit card fees"):
        if item in lower:
            excluded.append(item)
    if excluded:
        rules.append({
            "rule_name": "Exclusions from reimbursement",
            "rule_type": "EXCLUDED_REIMBURSEMENT",
            "rule_parameters": {"excluded_items": excluded},
            "severity": "CRITICAL",
            "source_text": "; ".join(excluded),
        })
    if "only the individual named on the card" in lower or "authorized user" in lower:
        rules.append({
            "rule_name": "Corporate card restriction",
            "rule_type": "CARD_USAGE_RESTRICTION",
            "rule_parameters": {"authorized_user_only": True},
            "severity": "CRITICAL",
            "source_text": "Only the individual named on the card may use it.",
        })
    return _validate(rules)


def extract_policy_rules(pdf_bytes: bytes) -> tuple[list[dict], bool]:
    """Return (rules, used_fallback)."""
    text = extract_text_from_pdf(pdf_bytes)
    if not text.strip():
        return list(DEFAULT_RULES), True

    deterministic_rules = _deterministic_extract(text)
    if deterministic_rules:
        return deterministic_rules, False

    if not gemini.available:
        return list(DEFAULT_RULES), True

    result = gemini.call_json(_PROMPT.format(policy_text=text[:8000]))
    if isinstance(result, dict) and result.get("_fallback"):
        return list(DEFAULT_RULES), True

    rules = _validate(result)
    if not rules:
        return list(DEFAULT_RULES), True
    return rules, False
