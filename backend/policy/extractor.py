"""Policy PDF -> structured JSON rules via Gemini, with deterministic fallback."""
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
    "rule_type": "AMOUNT_LIMIT|MCC_BANNED|TIP_CAP|RECEIPT_REQUIRED|BUDGET_CAP|FX_THRESHOLD",
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
"""

_VALID_TYPES = {"AMOUNT_LIMIT", "MCC_BANNED", "TIP_CAP",
                "RECEIPT_REQUIRED", "BUDGET_CAP", "FX_THRESHOLD"}
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


def extract_policy_rules(pdf_bytes: bytes) -> tuple[list[dict], bool]:
    """Return (rules, used_fallback)."""
    text = extract_text_from_pdf(pdf_bytes)
    if not text.strip():
        return list(DEFAULT_RULES), True

    result = gemini.call_json(_PROMPT.format(policy_text=text[:8000]))
    if isinstance(result, dict) and result.get("_fallback"):
        return list(DEFAULT_RULES), True

    rules = _validate(result)
    if not rules:
        return list(DEFAULT_RULES), True
    return rules, False
