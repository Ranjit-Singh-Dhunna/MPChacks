"""Unified fraud intelligence engine.

Combines deterministic and statistical pattern detectors with the composite 
employee risk profiling system into a single self-contained, explainable component.
"""
import math
from dataclasses import dataclass, field
import numpy as np
import pandas as pd
from scipy.stats import chisquare

from config import settings

# ---------------------------------------------------------------------------
# 1. Core Models and Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class FraudFlag:
    """Represents a flagged fraud or anomaly pattern detected in transaction data.
    
    Fields:
        pattern_type (str): The unique key matching the specific detector (e.g., 'SMURFING', 'SPLIT_BILLING').
        transaction_ids (list[str]): The IDs of all transactions that triggered this flag.
        employee_names (list[str]): The names of employees associated with these transactions.
        severity (str): The calculated severity of this anomaly ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW').
        total_amount_cad (float): The combined CAD exposure value for the flagged transactions.
        description (str): A user-friendly, human-readable description of the warning and evidence.
        extra (dict): Arbitrary metadata mapping metrics like p-values, Z-scores, HHI index or historical baselines.
    """
    pattern_type: str
    transaction_ids: list[str]
    employee_names: list[str]
    severity: str
    total_amount_cad: float
    description: str
    extra: dict = field(default_factory=dict)


@dataclass
class EmployeeRiskProfile:
    """Represents the composite credit/spend risk status for an individual employee.
    
    Fields:
        employee_id (str): The unique identifier of the employee.
        employee_name (str): The full name of the employee.
        department (str): The operational business unit or department.
        composite_score (int): The weighted aggregate risk score, scaled 0 to 100.
        risk_tier (str): Categorical risk level ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW').
        signal_breakdown (dict): Dictionary mapping individual signal scores and description details.
        top_signals (list[str]): Bullet points summarizing the top active risk indicators.
        transaction_count (int): The total number of transactions processed for this employee.
        total_spend_cad (float): Cumulative CAD expenditure for the employee during the period.
        flags_count (int): The count of active fraud flags referencing this employee.
    """
    employee_id: str
    employee_name: str
    department: str
    composite_score: int
    risk_tier: str
    signal_breakdown: dict
    top_signals: list[str]
    transaction_count: int
    total_spend_cad: float
    flags_count: int


# ---------------------------------------------------------------------------
# 2. Anomaly and Fraud Pattern Detectors (Deterministic and Statistical)
# ---------------------------------------------------------------------------

def _round_tolerance(amount: float, base: int, tol: float = 1.0) -> bool:
    return amount >= base and abs(amount % base) <= tol


def detect_smurfing(df: pd.DataFrame, window_hours: int = 72,
                    threshold_cad: float = 500.0) -> list[FraudFlag]:
    """Multiple sub-pre-auth transactions by one employee summing over a CAD threshold
    inside a rolling window — classic structuring/smurfing.
    """
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
    amounts above a material floor — the signature of one bill split across two accounts.
    """
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
    """Per-MCC z-score on amount_cad; flag extreme, material outliers.
    """
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


def detect_benfords_law(df: pd.DataFrame, p_threshold: float = 0.01,
                        min_transactions: int = 30) -> list[FraudFlag]:
    """Flag employees whose expense first-digit distribution deviates from Benford's Law."""
    BENFORD = {d: math.log10(1 + 1 / d) for d in range(1, 10)}
    flags: list[FraudFlag] = []

    for emp_id, grp in df.groupby("employee_id"):
        amounts = grp["amount_usd"].dropna()
        digits = []
        for a in amounts:
            a = abs(a)
            if a < 1:
                continue
            digits.append(int(str(a).lstrip("0").lstrip(".")[0]))
        if len(digits) < min_transactions:
            continue

        n = len(digits)
        observed = np.zeros(9)
        for d in digits:
            if 1 <= d <= 9:
                observed[d - 1] += 1

        expected = np.array([BENFORD[d] * n for d in range(1, 10)])
        if np.any(expected == 0):
            continue

        chi2, p_value = chisquare(observed, f_exp=expected)

        if p_value < p_threshold:
            severity = "CRITICAL" if p_value < 0.001 else "HIGH"
            obs_pct = {d: round(observed[d - 1] / n, 3) for d in range(1, 10)}
            exp_pct = {d: round(BENFORD[d], 3) for d in range(1, 10)}
            max_dev_digit = max(range(1, 10),
                                key=lambda d: observed[d - 1] / n - BENFORD[d])
            max_dev = obs_pct[max_dev_digit] - exp_pct[max_dev_digit]

            flags.append(FraudFlag(
                pattern_type="BENFORDS_VIOLATION",
                transaction_ids=list(grp["transaction_id"]),
                employee_names=[grp.iloc[0]["employee_name"]],
                severity=severity,
                total_amount_cad=round(float(grp["amount_cad"].sum()), 2),
                description=(
                    f"{grp.iloc[0]['employee_name']}'s {n} expenses fail Benford's "
                    f"Law (p={p_value:.4f}). Digit {max_dev_digit} appears "
                    f"{obs_pct[max_dev_digit]:.1%} vs. expected "
                    f"{exp_pct[max_dev_digit]:.1%} (+{max_dev:.1%} deviation) — "
                    f"consistent with fabricated or manipulated amounts."
                ),
                extra={"chi2": round(float(chi2), 2), "p_value": round(float(p_value), 6),
                        "observed_pct": obs_pct, "expected_pct": exp_pct},
            ))
    return flags


def detect_velocity_anomalies(df: pd.DataFrame, z_threshold: float = 3.0,
                               min_weeks: int = 4) -> list[FraudFlag]:
    """Flag employees with spending velocity significantly above their personal baseline."""
    flags: list[FraudFlag] = []
    if df.empty:
        return flags

    for emp_id, grp in df.groupby("employee_id"):
        g = grp.sort_values("transaction_date").copy()
        if len(g) < 10:
            continue

        g["date"] = g["transaction_date"].dt.date
        daily = g.groupby("date")["amount_cad"].sum()
        full_range = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
        daily = daily.reindex(full_range, fill_value=0.0)
        weekly = daily.rolling(7, min_periods=1).sum()

        if len(weekly) < min_weeks * 7:
            continue

        baseline = weekly.iloc[:-7]
        if len(baseline) < 7:
            continue

        mean_w = baseline.mean()
        std_w = baseline.std()
        if std_w == 0 or mean_w == 0:
            continue

        recent_windows = weekly.iloc[-28:]
        max_val = recent_windows.max()
        max_date = recent_windows.idxmax()
        z = (max_val - mean_w) / std_w

        if z > z_threshold and max_val > 500:  # material floor
            spike_start = max_date - pd.Timedelta(days=6)
            spike_txns = g[
                (g["transaction_date"] >= pd.Timestamp(spike_start)) &
                (g["transaction_date"] <= pd.Timestamp(max_date))
            ]
            if spike_txns.empty:
                continue

            flags.append(FraudFlag(
                pattern_type="VELOCITY_SPIKE",
                transaction_ids=list(spike_txns["transaction_id"]),
                employee_names=[grp.iloc[0]["employee_name"]],
                severity="HIGH" if z > 5 else "MEDIUM",
                total_amount_cad=round(float(spike_txns["amount_cad"].sum()), 2),
                description=(
                    f"{grp.iloc[0]['employee_name']}'s weekly spend spiked to "
                    f"${max_val:,.2f} CAD vs. baseline ${mean_w:,.2f} CAD/week "
                    f"({z:.1f}σ above normal) — abnormal spending velocity."
                ),
                extra={"baseline_weekly_cad": round(float(mean_w), 2),
                        "spike_weekly_cad": round(float(max_val), 2),
                        "velocity_z": round(float(z), 2),
                        "spike_period": f"{spike_start.date()} to {max_date.date()}"},
            ))
    return flags


def detect_duplicate_expenses(df: pd.DataFrame, amount_tolerance_pct: float = 0.0,
                               day_window: int = 7,
                               min_amount_usd: float = 40.0) -> list[FraudFlag]:
    """Flag same-employee, same-merchant, identical-amount transactions within a short window."""
    flags: list[FraudFlag] = []
    window = pd.Timedelta(days=day_window)

    for (emp_id, merchant), grp in df.groupby(["employee_id", "merchant_name"]):
        g = grp[grp["amount_usd"] >= min_amount_usd].sort_values("transaction_date")
        if len(g) < 2:
            continue

        seen: set[str] = set()
        for i in range(len(g)):
            if g.iloc[i]["transaction_id"] in seen:
                continue
            for j in range(i + 1, len(g)):
                dt = g.iloc[j]["transaction_date"] - g.iloc[i]["transaction_date"]
                if dt > window:
                    break
                amt_i = g.iloc[i]["amount_usd"]
                amt_j = g.iloc[j]["amount_usd"]
                if amt_i == 0:
                    continue
                variance = abs(amt_i - amt_j) / amt_i
                if variance <= amount_tolerance_pct:
                    tid_i = g.iloc[i]["transaction_id"]
                    tid_j = g.iloc[j]["transaction_id"]
                    if tid_j in seen:
                        continue
                    seen.update([tid_i, tid_j])
                    total = g.iloc[i]["amount_cad"] + g.iloc[j]["amount_cad"]
                    days_apart = dt.days
                    flags.append(FraudFlag(
                        pattern_type="DUPLICATE_EXPENSE",
                        transaction_ids=[tid_i, tid_j],
                        employee_names=[g.iloc[i]["employee_name"]],
                        severity="HIGH",
                        total_amount_cad=round(float(total), 2),
                        description=(
                            f"{g.iloc[i]['employee_name']} submitted two charges "
                            f"of ${amt_i:,.2f} and ${amt_j:,.2f} USD at {merchant} "
                            f"{days_apart} day(s) apart — possible duplicate "
                            f"expense submission."
                        ),
                        extra={"amount_variance_pct": round(float(variance * 100), 2),
                                "day_span": days_apart},
                    ))
    return flags


def detect_peer_anomalies(df: pd.DataFrame, z_threshold: float = 0.8,
                           min_peer_group: int = 3) -> list[FraudFlag]:
    """Flag employees whose total spend is significantly above their department peer group."""
    flags: list[FraudFlag] = []

    # Exclude extreme capital purchases (> $10,000) from standard operational spend benchmarks
    df_filtered = df[df["amount_usd"] <= 10000].copy()

    emp_spend = (df_filtered.groupby(["employee_id", "employee_name", "department"])
                   ["amount_cad"].sum().reset_index())
    emp_spend.columns = ["employee_id", "employee_name", "department", "total_cad"]

    for dept, grp in emp_spend.groupby("department"):
        if len(grp) < min_peer_group:
            continue
        mean_spend = grp["total_cad"].mean()
        std_spend = grp["total_cad"].std()
        if std_spend == 0:
            continue

        for _, row in grp.iterrows():
            z = (row["total_cad"] - mean_spend) / std_spend
            if z > z_threshold:
                emp_txns = df[df["employee_id"] == row["employee_id"]]
                flags.append(FraudFlag(
                    pattern_type="PEER_ANOMALY",
                    transaction_ids=list(emp_txns["transaction_id"]),
                    employee_names=[row["employee_name"]],
                    severity="HIGH" if z > 3.0 else "MEDIUM",
                    total_amount_cad=round(float(row["total_cad"]), 2),
                    description=(
                        f"{row['employee_name']}'s total spend "
                        f"${row['total_cad']:,.2f} CAD is {z:.1f}σ above the "
                        f"{dept} department average of ${mean_spend:,.2f} CAD "
                        f"(excluding capital purchases) — significantly higher than peers."
                    ),
                    extra={"peer_group": dept,
                            "employee_total_cad": round(float(row["total_cad"]), 2),
                            "peer_mean_cad": round(float(mean_spend), 2),
                            "peer_std_cad": round(float(std_spend), 2),
                            "peer_z": round(float(z), 2)},
                ))
    return flags


def detect_merchant_concentration(df: pd.DataFrame, hhi_threshold: float = 0.4,
                                   min_transactions: int = 10,
                                   min_merchants: int = 3) -> list[FraudFlag]:
    """Flag employees funnelling a disproportionate share of spend to a single vendor (HHI)."""
    flags: list[FraudFlag] = []

    for emp_id, grp in df.groupby("employee_id"):
        if len(grp) < min_transactions:
            continue
        merchant_counts = grp["merchant_name"].nunique()
        if merchant_counts < min_merchants:
            continue

        total_spend = grp["amount_cad"].sum()
        if total_spend == 0:
            continue

        merchant_spend = grp.groupby("merchant_name")["amount_cad"].sum()
        shares = merchant_spend / total_spend
        hhi = float((shares ** 2).sum())

        if hhi > hhi_threshold:
            top_merchant = shares.idxmax()
            top_pct = float(shares.max())
            top_txns = grp[grp["merchant_name"] == top_merchant]

            flags.append(FraudFlag(
                pattern_type="MERCHANT_CONCENTRATION",
                transaction_ids=list(top_txns["transaction_id"]),
                employee_names=[grp.iloc[0]["employee_name"]],
                severity="HIGH" if hhi > 0.6 else "MEDIUM",
                total_amount_cad=round(float(top_txns["amount_cad"].sum()), 2),
                description=(
                    f"{grp.iloc[0]['employee_name']} directs {top_pct:.0%} of "
                    f"total spend to {top_merchant} (HHI={hhi:.2f}) — "
                    f"disproportionate vendor concentration."
                ),
                extra={"hhi_score": round(hhi, 3),
                        "top_merchant": top_merchant,
                        "top_merchant_pct": round(top_pct, 3),
                        "merchant_count": int(merchant_counts)},
            ))
    return flags


ALL_DETECTORS = [
    detect_smurfing,
    detect_split_billing,
    detect_structuring,
    detect_zscore_outliers,
    detect_shell_vendors,
    detect_benfords_law,
    detect_velocity_anomalies,
    detect_duplicate_expenses,
    detect_peer_anomalies,
    detect_merchant_concentration,
]


def run_all_detectors(df: pd.DataFrame) -> list[FraudFlag]:
    flags: list[FraudFlag] = []
    for det in ALL_DETECTORS:
        try:
            flags.extend(det(df))
        except Exception:  # a single detector failure must not abort analysis
            continue
    return flags


# ---------------------------------------------------------------------------
# 3. Employee Risk Profiling Engine (Aggregation Layer)
# ---------------------------------------------------------------------------

SIGNAL_WEIGHTS = {
    "cluster_involvement": 0.30,
    "benfords_deviation":  0.20,
    "velocity_spike":      0.15,
    "policy_violation_rate": 0.15,
    "peer_deviation":      0.10,
    "merchant_concentration": 0.10,
}

SEVERITY_SCORE = {"CRITICAL": 90, "HIGH": 70, "MEDIUM": 45, "LOW": 20}


def _score_from_z(z: float, thresholds: tuple = (5, 3, 2)) -> int:
    if z > thresholds[0]:
        return 100
    if z > thresholds[1]:
        return 70
    if z > thresholds[2]:
        return 40
    return 0


def _tier_from_score(score: int) -> str:
    if score >= 80:
        return "CRITICAL"
    if score >= 60:
        return "HIGH"
    if score >= 35:
        return "MEDIUM"
    return "LOW"


def build_risk_profiles(
    df: pd.DataFrame,
    flags: list[FraudFlag],
    policy_violation_counts: dict[str, int] | None = None,
) -> list[EmployeeRiskProfile]:
    """Builds a composite risk profile for each employee based on multiple fraud signals.
    
    This function compiles signals from deterministic violations and statistical anomalies.
    It rates risk on a 0-100 scale using a weighted average. To prevent score deflation,
    only actively triggered signals are factored into the calculation.

    Args:
        df (pd.DataFrame): The complete historical transaction table.
        flags (list[FraudFlag]): The active list of fraud clusters/flags detected.
        policy_violation_counts (dict[str, int], optional): Map of employee_id to policy violation counts.

    Returns:
        list[EmployeeRiskProfile]: A list of completed risk profiles sorted by composite score descending.
    """
    if df.empty:
        return []

    policy_violation_counts = policy_violation_counts or {}

    # Index flags by employee name for fast lookup during aggregation
    emp_flags: dict[str, list[FraudFlag]] = {}
    for f in flags:
        for name in f.employee_names:
            emp_flags.setdefault(name, []).append(f)

    # Build lookup metadata table mapping: employee_name -> (employee_id, department)
    emp_meta = (
        df.groupby("employee_name")
        .agg(employee_id=("employee_id", "first"), department=("department", "first"))
        .to_dict("index")
    )

    profiles: list[EmployeeRiskProfile] = []

    for emp_name, meta in emp_meta.items():
        emp_id = meta["employee_id"]
        dept = meta["department"]
        
        # Filter transactions matching this individual employee
        emp_df = df[df["employee_id"] == emp_id]
        txn_count = len(emp_df)
        total_spend = float(emp_df["amount_cad"].sum())
        my_flags = emp_flags.get(emp_name, [])
        flags_count = len(my_flags)

        # Dictionary to store score (0-100) and details for triggered risk signals
        signals: dict[str, dict] = {}

        # ---------------------------------------------------------
        # Signal 1: Transaction Cluster/Fraud Pattern Involvement
        # ---------------------------------------------------------
        cluster_types = {f.pattern_type for f in my_flags
                         if f.pattern_type in ("SMURFING", "SPLIT_BILLING", "STRUCTURING",
                                               "OUTLIER", "SHELL_VENDOR", "DUPLICATE_EXPENSE")}
        cluster_severities = [f.severity for f in my_flags
                              if f.pattern_type in cluster_types]
        if cluster_severities:
            # Map worst severity level to baseline points
            worst = max(cluster_severities, key=lambda s: SEVERITY_SCORE.get(s, 0))
            score = SEVERITY_SCORE.get(worst, 40)
            
            # Apply additive penalties for involvement in multiple discrete patterns
            if len(cluster_types) >= 3:
                score = min(100, score + 20)
            elif len(cluster_types) >= 2:
                score = min(100, score + 10)
            patterns = ", ".join(sorted(cluster_types))
            signals["cluster_involvement"] = {
                "score": score,
                "detail": f"Involved in {len(cluster_types)} fraud pattern(s): {patterns}",
            }

        # ---------------------------------------------------------
        # Signal 2: Benford's Law Digit Distribution Failure
        # ---------------------------------------------------------
        benford_flags = [f for f in my_flags if f.pattern_type == "BENFORDS_VIOLATION"]
        if benford_flags:
            p_val = benford_flags[0].extra.get("p_value", 1.0)
            if p_val < 0.001:
                score = 100
            elif p_val < 0.01:
                score = 70
            elif p_val < 0.05:
                score = 40
            else:
                score = 20
            signals["benfords_deviation"] = {
                "score": score,
                "detail": f"Expense digit distribution fails Benford's Law (p={p_val:.4f})",
            }

        # ---------------------------------------------------------
        # Signal 3: Velocity Spike (Personal Weekly Spending Baseline)
        # ---------------------------------------------------------
        velocity_flags = [f for f in my_flags if f.pattern_type == "VELOCITY_SPIKE"]
        if velocity_flags:
            max_z = max(f.extra.get("velocity_z", 0) for f in velocity_flags)
            score = _score_from_z(max_z)
            if score > 0:
                signals["velocity_spike"] = {
                    "score": score,
                    "detail": f"Spending velocity {max_z:.1f}σ above personal baseline",
                }

        # ---------------------------------------------------------
        # Signal 4: Policy Violation Rate (% of non-compliant spend)
        # ---------------------------------------------------------
        viol_count = policy_violation_counts.get(emp_id, 0)
        if txn_count > 0 and viol_count > 0:
            rate = viol_count / txn_count
            if rate > 0.20:
                score = 100
            elif rate > 0.10:
                score = 70
            elif rate > 0.05:
                score = 40
            else:
                score = 20
            signals["policy_violation_rate"] = {
                "score": score,
                "detail": f"{viol_count}/{txn_count} transactions ({rate:.0%}) violate policy",
            }

        # ---------------------------------------------------------
        # Signal 5: Department Peer Group Deviation (Total Spend Z-Score)
        # ---------------------------------------------------------
        peer_flags = [f for f in my_flags if f.pattern_type == "PEER_ANOMALY"]
        if peer_flags:
            peer_z = max(f.extra.get("peer_z", 0) for f in peer_flags)
            score = _score_from_z(peer_z, thresholds=(3.0, 1.5, 0.8))
            if score >= 0:
                signals["peer_deviation"] = {
                    "score": score,
                    "detail": f"Total spend {peer_z:.1f}σ above {dept} department average",
                }

        # ---------------------------------------------------------
        # Signal 6: Merchant Concentration (HHI Index Allocation)
        # ---------------------------------------------------------
        conc_flags = [f for f in my_flags if f.pattern_type == "MERCHANT_CONCENTRATION"]
        if conc_flags:
            hhi = max(f.extra.get("hhi_score", 0) for f in conc_flags)
            top_m = conc_flags[0].extra.get("top_merchant", "unknown")
            top_pct = conc_flags[0].extra.get("top_merchant_pct", 0)
            if hhi > 0.7:
                score = 100
            elif hhi > 0.5:
                score = 70
            elif hhi > 0.4:
                score = 40
            else:
                score = 20
            signals["merchant_concentration"] = {
                "score": score,
                "detail": f"{top_pct:.0%} of spend directed to {top_m} (HHI={hhi:.2f})",
            }

        # ---------------------------------------------------------
        # Composite score calculation (weighted average of active signals)
        # ---------------------------------------------------------
        if signals:
            # sum active weights to dynamically scale denominator (prevents dilution)
            total_weight = sum(SIGNAL_WEIGHTS.get(k, 0.1) for k in signals)
            weighted_sum = sum(
                signals[k]["score"] * SIGNAL_WEIGHTS.get(k, 0.1) for k in signals
            )
            composite = int(round(weighted_sum / total_weight)) if total_weight > 0 else 0
        else:
            composite = 0

        ranked = sorted(
            signals.items(),
            key=lambda kv: kv[1]["score"] * SIGNAL_WEIGHTS.get(kv[0], 0.1),
            reverse=True,
        )
        top_signals = [v["detail"] for _, v in ranked[:3]]

        profiles.append(EmployeeRiskProfile(
            employee_id=emp_id,
            employee_name=emp_name,
            department=dept,
            composite_score=composite,
            risk_tier=_tier_from_score(composite),
            signal_breakdown=signals,
            top_signals=top_signals,
            transaction_count=txn_count,
            total_spend_cad=round(total_spend, 2),
            flags_count=flags_count,
        ))

    profiles.sort(key=lambda p: p.composite_score, reverse=True)
    return profiles
