"""
Synthetic data generator for the Brim expense intelligence platform.

Produces:
  - employees.json   : 9-person org with a self-referencing manager hierarchy
  - transactions.csv : 4,235 rows (Aug 2025 - Mar 2026) including 5 seeded fraud patterns

Deterministic: random.seed(42) so every teammate gets identical data.

Run:  python generate_data.py
"""

import csv
import json
import math
import random
from datetime import datetime, timedelta
from pathlib import Path

SEED = 42
random.seed(SEED)

HERE = Path(__file__).resolve().parent
FX_RATE = 1.379  # USD -> CAD, fixed for the demo
TARGET_ROWS = 4235
DATE_START = datetime(2025, 8, 1)
DATE_END = datetime(2026, 3, 31)
SPAN_DAYS = (DATE_END - DATE_START).days

# --------------------------------------------------------------------------- #
# 1. Employee hierarchy (9 people)
# --------------------------------------------------------------------------- #
# job_level: L6 CEO ... L1 driver.  monthly_budget in CAD.
BUDGET_BY_LEVEL = {6: 50000, 5: 20000, 4: 8000, 3: 3000, 2: 1500, 1: 500}

EMPLOYEES = [
    # employee_id, code, name, department, manager_id, job_level
    ("EMP001", "TXC-001", "Olivia Reyes",  "Executive",  None,     6),  # CEO
    ("EMP002", "TXC-002", "Priya Nair",     "Finance",    "EMP001", 5),  # CFO
    ("EMP003", "TXC-003", "Marcus Webb",    "Operations", "EMP001", 5),  # VP Ops
    ("EMP004", "TXC-004", "Alice Chen",     "Finance",    "EMP002", 4),  # Finance Manager
    ("EMP005", "TXC-005", "Dana Park",      "Finance",    "EMP002", 3),  # Finance Analyst
    ("EMP006", "TXC-006", "Bob Kumar",      "Finance",    "EMP004", 2),  # Analyst
    ("EMP007", "TXC-007", "Carol White",    "Finance",    "EMP004", 2),  # Analyst
    ("EMP008", "TXC-008", "Eric Tran",      "Operations", "EMP003", 4),  # Ops Manager
    ("EMP009", "TXC-009", "Grace Lee",      "Operations", "EMP008", 3),  # Logistics Coord
    # Note: Frank Miller (driver) is folded into EMP009's reports below via a 10th? -> keep 9
]
# PRD says 9 cardholders. The "driver" fraud actor is Grace Lee's role here is logistics;
# we make EMP008 Eric Tran (manager) + EMP009 Grace Lee the operations fraud pair, and add
# a driver as the primary actor. To stay at 9 cardholders we treat EMP009 Grace Lee as the
# driver-level fraud actor for structuring/shell-vendor, and Eric Tran for split-billing.

def build_employee_records():
    records = []
    for emp_id, code, name, dept, mgr, level in EMPLOYEES:
        records.append({
            "employee_id": emp_id,
            "transaction_code": code,
            "name": name,
            "department": dept,
            "manager_id": mgr,
            "job_level": level,
            "monthly_budget": BUDGET_BY_LEVEL[level],
            "email": f"{name.lower().replace(' ', '.')}@brimsmb.example",
        })
    return records

EMP_BY_ID = {e[0]: e for e in EMPLOYEES}

def emp_meta(emp_id):
    eid, code, name, dept, mgr, level = EMP_BY_ID[emp_id]
    return {"code": code, "name": name, "dept": dept, "manager_id": mgr or "", "level": level}

# --------------------------------------------------------------------------- #
# 2. Merchant + MCC pools per category
# --------------------------------------------------------------------------- #
CATEGORIES = {
    "Fuel": {
        "mcc": ["5541", "5172"],
        "merchants": ["SHELL DT #4421", "PETRO-CANADA 8821", "ESSO RETAIL 113",
                      "FLYING J #771", "PILOT TRAVEL 209", "ULTRAMAR 55", "QUICK FUEL STOP"],
        "median": 62.0, "sigma": 0.55, "weight": 1400,
    },
    "Meals": {
        "mcc": ["5812", "5814"],
        "merchants": ["MCDONALDS DT QPS", "TIM HORTONS #882", "SUBWAY 40021",
                      "BOSTON PIZZA 12", "A&W STORE 551", "WENDYS 7781", "ROADSIDE GRILL CO"],
        "median": 24.0, "sigma": 0.6, "weight": 820,
    },
    "Lodging": {
        "mcc": ["7011"],
        "merchants": ["HOLIDAY INN EXPRESS", "COMFORT INN 442", "SUPER 8 MOTEL",
                      "BEST WESTERN 71", "DAYS INN 209"],
        "median": 142.0, "sigma": 0.4, "weight": 480,
    },
    "Office Supplies": {
        "mcc": ["5111", "5943"],
        "merchants": ["STAPLES #112", "AMAZON MKTPLACE", "GRAND & TOY 5"],
        "median": 48.0, "sigma": 0.7, "weight": 180,
    },
    "Parking & Tolls": {
        "mcc": ["7523", "4131"],
        "merchants": ["407 ETR TOLL", "IMPARK LOT 88", "GREEN P PARKING", "PRECISE PARKLINK"],
        "median": 18.0, "sigma": 0.5, "weight": 290,
    },
    "Vehicle Repair": {
        "mcc": ["7531", "7538"],
        "merchants": ["MIDAS AUTO 21", "CANADIAN TIRE 445", "KAL TIRE 9", "FOUNTAIN TIRE"],
        "median": 210.0, "sigma": 0.5, "weight": 180,
    },
    "Software": {
        "mcc": ["5734", "4814"],
        "merchants": ["AWS MEMB", "MICROSOFT 365", "ROGERS WIRELESS", "GOOGLE WORKSPACE"],
        "median": 95.0, "sigma": 0.6, "weight": 200,
    },
    "Supplies": {
        "mcc": ["5300", "5045"],
        "merchants": ["COSTCO WHSE 44", "BEST BUY 112", "HOME DEPOT 88"],
        "median": 130.0, "sigma": 0.6, "weight": 200,
    },
}

MCC_DESC = json.loads((HERE / "mcc_codes.json").read_text())

# Per-employee activity weighting (drivers/ops transact more than execs)
ACTIVITY_WEIGHT = {
    "EMP001": 0.4, "EMP002": 0.7, "EMP003": 1.0, "EMP004": 1.0, "EMP005": 1.1,
    "EMP006": 1.2, "EMP007": 1.2, "EMP008": 1.5, "EMP009": 1.8,
}

def tokenized_card(emp_id):
    # deterministic tokenized PAN — last 4 only, never a real number
    last4 = 4000 + int(emp_id[-3:])
    return f"****-****-****-{last4}"

def lognormal_amount(median, sigma):
    # median of lognormal is exp(mu); draw and round to cents
    mu = math.log(median)
    val = random.lognormvariate(mu, sigma)
    return round(max(1.5, val), 2)

def random_datetime():
    day = random.randint(0, SPAN_DAYS)
    # business-ish hours 7am-10pm
    minute = random.randint(7 * 60, 22 * 60)
    return DATE_START + timedelta(days=day, minutes=minute)

# Global running expense_report trip assignment for lodging clusters
_trip_counter = [0]
def new_trip_id():
    _trip_counter[0] += 1
    return f"TRIP-{_trip_counter[0]:04d}"

# --------------------------------------------------------------------------- #
# 3. Row factory
# --------------------------------------------------------------------------- #
ROWS = []
_txn_counter = [0]

def make_row(emp_id, merchant, amount_usd, dt, mcc, *,
             pre_authorized=None, trip_id="", receipt=True):
    _txn_counter[0] += 1
    meta = emp_meta(emp_id)
    amount_usd = round(amount_usd, 2)
    amount_cad = round(amount_usd * FX_RATE, 2)
    if pre_authorized is None:
        # >$50 USD requires pre-auth; ~15% of those intentionally lack it (violations)
        if amount_usd > 50:
            pre_authorized = random.random() > 0.15
        else:
            pre_authorized = True
    approval = "APPROVED" if (amount_usd <= 50 or pre_authorized) else "PENDING"
    has_receipt = receipt and (amount_usd <= 50 or random.random() > 0.1)
    row = {
        "transaction_id": f"TXN-{_txn_counter[0]:06d}",
        "card_number": tokenized_card(emp_id),
        "merchant_name": merchant,
        "amount_usd": amount_usd,
        "amount_cad": amount_cad,
        "currency": "USD",
        "conversion_rate": FX_RATE,
        "transaction_date": dt.strftime("%Y-%m-%d %H:%M:%S"),
        "mcc_code": mcc,
        "mcc_description": MCC_DESC.get(mcc, {}).get("description", "Unknown"),
        "transaction_code": meta["code"],
        "employee_id": emp_id,
        "employee_name": meta["name"],
        "department": meta["dept"],
        "manager_id": meta["manager_id"],
        "job_level": meta["level"],
        "approval_status": approval,
        "expense_report_id": "",          # populated later by report generation
        "ai_risk_score": "",              # populated by /api/analyze
        "ai_category": "",                # populated by /api/analyze
        "policy_flag": "",                # populated by /api/analyze
        "flag_reason": "",                # populated by /api/analyze
        "severity": "",                   # populated by /api/analyze
        "receipt_url": f"https://receipts.brim.example/{_txn_counter[0]:06d}.pdf" if has_receipt else "",
        "trip_id": trip_id,
        "is_pre_authorized": pre_authorized,
    }
    ROWS.append(row)
    return row

# --------------------------------------------------------------------------- #
# 4. Bulk "normal" transactions
# --------------------------------------------------------------------------- #
def generate_normal(target_total):
    """Generate normal transactions until ROWS reaches target_total (incl. seeded)."""
    cat_names = list(CATEGORIES.keys())
    cat_weights = [CATEGORIES[c]["weight"] for c in cat_names]
    emp_ids = list(ACTIVITY_WEIGHT.keys())
    emp_weights = [ACTIVITY_WEIGHT[e] for e in emp_ids]

    while len(ROWS) < target_total:
        cat = random.choices(cat_names, weights=cat_weights, k=1)[0]
        spec = CATEGORIES[cat]
        emp = random.choices(emp_ids, weights=emp_weights, k=1)[0]
        merchant = random.choice(spec["merchants"])
        amount = lognormal_amount(spec["median"], spec["sigma"])
        dt = random_datetime()
        mcc = random.choice(spec["mcc"])

        trip = ""
        if cat == "Lodging" and random.random() < 0.6:
            # lodging anchors a trip; attach nearby fuel + meals
            trip = new_trip_id()
            make_row(emp, merchant, amount, dt, mcc, trip_id=trip)
            for _k in range(random.randint(1, 3)):
                sub_cat = random.choice(["Fuel", "Meals"])
                sub = CATEGORIES[sub_cat]
                sub_dt = dt + timedelta(days=random.randint(-2, 2),
                                        minutes=random.randint(-300, 300))
                make_row(emp, random.choice(sub["merchants"]),
                         lognormal_amount(sub["median"], sub["sigma"]),
                         sub_dt, random.choice(sub["mcc"]), trip_id=trip)
        else:
            make_row(emp, merchant, amount, dt, mcc)

# --------------------------------------------------------------------------- #
# 5. Seeded fraud patterns
# --------------------------------------------------------------------------- #
def fraud_smurfing():
    """8 sub-$50 transactions in 60h -> $396 USD ($546 CAD) > Frank/Grace L1-ish budget.
    Actor: Grace Lee (EMP009, L3 logistics) using fuel cards rapidly."""
    base = datetime(2025, 11, 14, 9, 0)
    merchants = ["QUICK FUEL STOP", "ULTRAMAR 55", "ESSO RETAIL 113"]
    for i in range(8):
        make_row("EMP009", merchants[i % 3], 49.50,
                 base + timedelta(hours=i * 7.5), "5541",
                 pre_authorized=True)

def fraud_split_billing():
    """Same merchant, two employees within 28 min — split one bill across accounts.
    Actors: Eric Tran (EMP008) + Grace Lee (EMP009)."""
    dt = datetime(2025, 12, 5, 12, 14)
    make_row("EMP009", "ROADSIDE GRILL CO", 78.00, dt, "5812", pre_authorized=True)
    make_row("EMP008", "ROADSIDE GRILL CO", 78.00,
             dt + timedelta(minutes=28), "5812", pre_authorized=True)

def fraud_structuring_and_shell():
    """Round-number structuring at a shell vendor that first appears mid-March.
    Actor: Grace Lee (EMP009). Merchant 'PREMIUM FLEET SERVICES INC' has no prior history
    and emits only round $200/$400/$500 charges -> shell vendor + structuring."""
    start = datetime(2026, 3, 15, 10, 0)
    amounts = [200, 400, 500, 200, 500, 400, 200, 400, 500, 200, 500, 400]
    for i, amt in enumerate(amounts):
        make_row("EMP009", "PREMIUM FLEET SERVICES INC", float(amt),
                 start + timedelta(days=i * 1.1, hours=random.randint(0, 6)),
                 "5172", pre_authorized=True)

def fraud_outlier():
    """$264K CAD statistical outlier. Actor: CFO Priya Nair (EMP002)."""
    make_row("EMP002", "INTERCONTINENTAL FLEET ACQUISITION", 191442.00,
             datetime(2026, 2, 28, 15, 30), "5172", pre_authorized=False,
             receipt=False)

# --------------------------------------------------------------------------- #
# 6. Assemble + write
# --------------------------------------------------------------------------- #
def main():
    fraud_smurfing()
    fraud_split_billing()
    fraud_structuring_and_shell()
    fraud_outlier()
    seeded = len(ROWS)

    generate_normal(TARGET_ROWS)
    # Trim any overshoot from the last trip batch to hit the exact target,
    # but never drop a seeded fraud row (those are first in ROWS).
    del ROWS[TARGET_ROWS:]

    # Sort by date for realism
    ROWS.sort(key=lambda r: r["transaction_date"])

    fieldnames = list(ROWS[0].keys())
    csv_path = HERE / "transactions.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(ROWS)

    emp_path = HERE / "employees.json"
    emp_path.write_text(json.dumps(build_employee_records(), indent=2))

    # Summary
    print(f"[OK] wrote {len(ROWS)} transactions -> {csv_path.name}")
    print(f"[OK] wrote {len(EMPLOYEES)} employees   -> {emp_path.name}")
    print(f"     seeded fraud rows: {seeded}")
    over50 = sum(1 for r in ROWS if r["amount_usd"] > 50)
    no_preauth = sum(1 for r in ROWS if r["amount_usd"] > 50 and not r["is_pre_authorized"])
    print(f"     transactions > $50 USD: {over50}  (lacking pre-auth: {no_preauth})")
    print(f"     date range: {ROWS[0]['transaction_date']} .. {ROWS[-1]['transaction_date']}")


if __name__ == "__main__":
    main()
