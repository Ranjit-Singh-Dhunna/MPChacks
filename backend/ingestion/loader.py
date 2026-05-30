"""CSV -> SQLite loader. Idempotent on transaction_id."""
from datetime import datetime

import pandas as pd
from sqlalchemy.orm import Session

from config import settings
from ingestion.enricher import (
    assign_employee,
    compute_amount_cad,
    lookup_mcc_description,
)
from models import Transaction

REQUIRED_COLUMNS = {
    "transaction_id", "merchant_name", "amount_usd",
    "transaction_date", "mcc_code", "transaction_code",
}


def _parse_bool(val) -> bool:
    if isinstance(val, bool):
        return val
    return str(val).strip().lower() in {"true", "1", "yes"}


def _parse_dt(val) -> datetime:
    if isinstance(val, datetime):
        return val
    return pd.to_datetime(val).to_pydatetime()


def _clean(val):
    """Turn NaN / empty strings into None."""
    if val is None:
        return None
    if isinstance(val, float) and pd.isna(val):
        return None
    if isinstance(val, str) and val.strip() == "":
        return None
    return val


def load_csv(db: Session, filepath: str | None = None) -> dict:
    """Load (or reload) transactions from CSV into the DB.

    Re-enriches FX + MCC + employee on the fly so raw CSVs (without amount_cad)
    also work. Returns {rows_loaded, rows_skipped, errors}.
    """
    path = filepath or str(settings.transactions_csv)
    errors: list[str] = []
    df = pd.read_csv(path, dtype={"mcc_code": str, "transaction_code": str})

    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        return {"rows_loaded": 0, "rows_skipped": len(df),
                "errors": [f"Missing required columns: {sorted(missing)}"]}

    existing_ids = {tid for (tid,) in db.query(Transaction.transaction_id).all()}
    loaded = 0
    skipped = 0
    batch: list[Transaction] = []

    for _, r in df.iterrows():
        tid = str(r["transaction_id"])
        if tid in existing_ids:
            skipped += 1
            continue
        try:
            amount_usd = float(r["amount_usd"])
            rate = float(_clean(r.get("conversion_rate")) or settings.fx_rate_usd_to_cad)
            amount_cad = _clean(r.get("amount_cad"))
            if amount_cad is None or float(amount_cad) <= 0:
                amount_cad = compute_amount_cad(amount_usd, rate)
            else:
                amount_cad = float(amount_cad)

            code = str(r["transaction_code"])
            emp = assign_employee(code) or {}
            mcc = str(r["mcc_code"])

            txn = Transaction(
                transaction_id=tid,
                card_number=_clean(r.get("card_number")) or "****",
                merchant_name=str(r["merchant_name"]),
                amount_usd=amount_usd,
                amount_cad=amount_cad,
                currency=_clean(r.get("currency")) or "USD",
                conversion_rate=rate,
                transaction_date=_parse_dt(r["transaction_date"]),
                mcc_code=mcc,
                mcc_description=_clean(r.get("mcc_description")) or lookup_mcc_description(mcc),
                transaction_code=code,
                employee_id=_clean(r.get("employee_id")) or emp.get("employee_id", "UNKNOWN"),
                employee_name=_clean(r.get("employee_name")) or emp.get("name", "Unknown"),
                department=_clean(r.get("department")) or emp.get("department", "Unknown"),
                manager_id=_clean(r.get("manager_id")) or emp.get("manager_id"),
                job_level=int(_clean(r.get("job_level")) or emp.get("job_level", 1)),
                approval_status=_clean(r.get("approval_status")) or "APPROVED",
                expense_report_id=_clean(r.get("expense_report_id")),
                is_pre_authorized=_parse_bool(r.get("is_pre_authorized", True)),
                trip_id=_clean(r.get("trip_id")),
                receipt_url=_clean(r.get("receipt_url")),
            )
            batch.append(txn)
            existing_ids.add(tid)
            loaded += 1
            if len(batch) >= 500:
                db.add_all(batch)
                db.commit()
                batch = []
        except Exception as exc:  # noqa: BLE001
            skipped += 1
            if len(errors) < 10:
                errors.append(f"{tid}: {exc}")

    if batch:
        db.add_all(batch)
        db.commit()

    return {"rows_loaded": loaded, "rows_skipped": skipped, "errors": errors}
