"""Tier-2 deterministic fraud cluster detection (pure pandas, no AI).

Each detector returns a list[FraudFlag]. A flag groups one or more transaction_ids
under a named pattern with a severity and a fact-based description.
"""
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from config import settings


@dataclass
class FraudFlag:
    pattern_type: str            # SMURFING | SPLIT_BILLING | STRUCTURING | OUTLIER | SHELL_VENDOR
    transaction_ids: list[str]
    employee_names: list[str]
    severity: str
    total_amount_cad: float
    description: str
    extra: dict = field(default_factory=dict)


def _round_tolerance(amount: float, base: int, tol: float = 1.0) -> bool:
    return amount >= base and abs(amount % base) <= tol


def detect_smurfing(df: pd.DataFrame, window_hours: int = 72,
                    threshold_cad: float = 500.0) -> list[FraudFlag]:
    """Multiple sub-pre-auth transactions by one employee summing over a CAD threshold
    inside a rolling window — classic structuring/smurfing."""
    flags: list[FraudFlag] = []
    sub_limit = settings.pre_auth_threshold_usd
    window = pd.Timedelta(hours=window_hours)

    for emp_id, grp in df.groupby("employee_id"):
        g = grp[grp["amount_usd"] < sub_limit].sort_values("transaction_date")
        if len(g) < 3:
            continue
        times = g["transaction_date"].to_numpy()
        amounts = g["amount_cad"].to_numpy()
        ids = g["transaction_id"].to_numpy()
        start = 0
        for end in range(len(g)):
            while times[end] - times[start] > window:
                start += 1
            window_sum = amounts[start:end + 1].sum()
            if window_sum > threshold_cad and (end - start + 1) >= 4:
                member_ids = list(ids[start:end + 1])
                flags.append(FraudFlag(
                    pattern_type="SMURFING",
                    transaction_ids=member_ids,
                    employee_names=[g.iloc[0]["employee_name"]],
                    severity="CRITICAL",
                    total_amount_cad=round(float(window_sum), 2),
                    description=(
                        f"{len(member_ids)} sub-${sub_limit:.0f} transactions by "
                        f"{g.iloc[0]['employee_name']} totalling ${window_sum:,.2f} CAD "
                        f"within {window_hours}h — possible threshold structuring."
                    ),
                ))
                break  # one flag per employee is enough for the demo
    return flags


def detect_split_billing(df: pd.DataFrame, window_minutes: int = 30,
                         amount_tol: float = 2.5, min_leg_usd: float = 40.0) -> list[FraudFlag]:
    """Same merchant, two different employees, within ±window minutes, for near-equal
    amounts above a material floor — the signature of one bill split across two accounts."""
    flags: list[FraudFlag] = []
    window = pd.Timedelta(minutes=window_minutes)
    for merchant, grp in df.groupby("merchant_name"):
        g = grp.sort_values("transaction_date").reset_index(drop=True)
        for i in range(len(g)):
            for j in range(i + 1, len(g)):
                dt = g.loc[j, "transaction_date"] - g.loc[i, "transaction_date"]
                if dt > window:
                    break
                same_amount = abs(g.loc[i, "amount_usd"] - g.loc[j, "amount_usd"]) <= amount_tol
                material = min(g.loc[i, "amount_usd"], g.loc[j, "amount_usd"]) >= min_leg_usd
                if g.loc[i, "employee_id"] != g.loc[j, "employee_id"] and same_amount and material:
                    total = g.loc[i, "amount_cad"] + g.loc[j, "amount_cad"]
                    flags.append(FraudFlag(
                        pattern_type="SPLIT_BILLING",
                        transaction_ids=[g.loc[i, "transaction_id"], g.loc[j, "transaction_id"]],
                        employee_names=[g.loc[i, "employee_name"], g.loc[j, "employee_name"]],
                        severity="HIGH",
                        total_amount_cad=round(float(total), 2),
                        description=(
                            f"{g.loc[i, 'employee_name']} and {g.loc[j, 'employee_name']} "
                            f"both charged {merchant} within "
                            f"{int(dt.total_seconds() // 60)} min "
                            f"(${total:,.2f} CAD combined) — possible split billing."
                        ),
                    ))
    return flags


def detect_structuring(df: pd.DataFrame) -> list[FraudFlag]:
    """A merchant receiving repeated exact round-number charges ($200/$400/$500)."""
    flags: list[FraudFlag] = []
    df = df.copy()
    df["is_round"] = df["amount_usd"].apply(
        lambda a: any(_round_tolerance(a, b) for b in (200, 400, 500))
    )
    for merchant, grp in df.groupby("merchant_name"):
        rounds = grp[grp["is_round"]]
        if len(rounds) >= 5:
            total = rounds["amount_cad"].sum()
            flags.append(FraudFlag(
                pattern_type="STRUCTURING",
                transaction_ids=list(rounds["transaction_id"]),
                employee_names=sorted(set(rounds["employee_name"])),
                severity="HIGH",
                total_amount_cad=round(float(total), 2),
                description=(
                    f"{len(rounds)} exact round-number charges to {merchant} "
                    f"(${total:,.2f} CAD) — payments structured to avoid scrutiny."
                ),
            ))
    return flags


def detect_zscore_outliers(df: pd.DataFrame, threshold: float = 5.0,
                           min_amount_cad: float = 300.0) -> list[FraudFlag]:
    """Per-MCC z-score on amount_cad; flag extreme, material outliers (e.g. the $264K
    charge). Threshold is deliberately high — and a material-amount floor applied — so
    only genuinely anomalous spend surfaces, not the natural fat tail of a log-normal
    amount distribution."""
    flags: list[FraudFlag] = []
    for mcc, grp in df.groupby("mcc_code"):
        if len(grp) < 5:
            continue
        amounts = grp["amount_cad"].to_numpy()
        mean, std = amounts.mean(), amounts.std()
        if std == 0:
            continue
        z = (amounts - mean) / std
        for idx, zval in zip(grp.index, z):
            if zval > threshold and grp.loc[idx, "amount_cad"] >= min_amount_cad:
                row = grp.loc[idx]
                flags.append(FraudFlag(
                    pattern_type="OUTLIER",
                    transaction_ids=[row["transaction_id"]],
                    employee_names=[row["employee_name"]],
                    severity="CRITICAL",
                    total_amount_cad=round(float(row["amount_cad"]), 2),
                    description=(
                        f"${row['amount_cad']:,.2f} CAD at {row['merchant_name']} "
                        f"by {row['employee_name']} is {zval:.1f}σ above the "
                        f"{row['mcc_description']} norm — statistical outlier."
                    ),
                    extra={"z_score": round(float(zval), 2)},
                ))
    return flags


def detect_shell_vendors(df: pd.DataFrame, lookback_days: int = 45,
                         round_ratio: float = 0.8) -> list[FraudFlag]:
    """Newly-appeared merchant whose charges are overwhelmingly round numbers."""
    flags: list[FraudFlag] = []
    if df.empty:
        return flags
    dataset_end = df["transaction_date"].max()
    df = df.copy()
    df["is_round"] = df["amount_usd"].apply(
        lambda a: any(_round_tolerance(a, b) for b in (100, 200, 400, 500))
    )
    for merchant, grp in df.groupby("merchant_name"):
        first_seen = grp["transaction_date"].min()
        age_days = (dataset_end - first_seen).days
        ratio = grp["is_round"].mean()
        if age_days <= lookback_days and ratio >= round_ratio and len(grp) >= 3:
            total = grp["amount_cad"].sum()
            flags.append(FraudFlag(
                pattern_type="SHELL_VENDOR",
                transaction_ids=list(grp["transaction_id"]),
                employee_names=sorted(set(grp["employee_name"])),
                severity="HIGH",
                total_amount_cad=round(float(total), 2),
                description=(
                    f"{merchant} first appeared {age_days} days before period end with "
                    f"{ratio:.0%} round-number charges (${total:,.2f} CAD) — "
                    f"possible shell vendor."
                ),
            ))
    return flags


ALL_DETECTORS = [
    detect_smurfing,
    detect_split_billing,
    detect_structuring,
    detect_zscore_outliers,
    detect_shell_vendors,
]


def run_all_detectors(df: pd.DataFrame) -> list[FraudFlag]:
    flags: list[FraudFlag] = []
    for det in ALL_DETECTORS:
        try:
            flags.extend(det(df))
        except Exception:  # noqa: BLE001  — a single detector failure must not abort analysis
            continue
    return flags
