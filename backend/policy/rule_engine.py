"""Deterministic policy rule engine — the Tier-1 filter (no AI).

Handles ~85% of policy decisions with zero LLM calls. Every monetary check runs on
amount_cad so FX-evasion (a $499 USD charge = ~$688 CAD) cannot slip through.
"""
from models import Employee, Policy, Transaction
from policy.evaluator import SEVERITY_ORDER, PolicyResult, RuleResult


class RuleEngine:
    def __init__(self, rules: list[Policy]):
        self.rules = [r for r in rules if r.is_active]

    def check_transaction(
        self, txn: Transaction, employee: Employee | None = None,
        month_spend_cad: float = 0.0,
    ) -> PolicyResult:
        violations: list[RuleResult] = []
        for rule in self.rules:
            res = self._apply(rule, txn, employee, month_spend_cad)
            if res.violated:
                violations.append(res)

        if not violations:
            return PolicyResult(flag="COMPLIANT")

        worst = max(violations, key=lambda v: SEVERITY_ORDER.get(v.severity, 0))
        # MEDIUM/LOW-only violations are flagged for human REVIEW rather than hard VIOLATION
        flag = "VIOLATION" if SEVERITY_ORDER.get(worst.severity, 0) >= 3 else "REVIEW"
        return PolicyResult(
            flag=flag,
            severity=worst.severity,
            reasons=[v.reason for v in violations],
        )

    # ----- dispatch -----
    def _apply(self, rule, txn, employee, month_spend_cad) -> RuleResult:
        p = rule.rule_parameters or {}
        t = rule.rule_type
        if t == "AMOUNT_LIMIT":
            return self._amount_limit(rule, txn, p)
        if t == "FX_THRESHOLD":
            return self._fx_threshold(rule, txn, p)
        if t == "MCC_BANNED":
            return self._mcc_banned(rule, txn, p)
        if t == "RECEIPT_REQUIRED":
            return self._receipt_required(rule, txn, p)
        if t == "BUDGET_CAP":
            return self._budget_cap(rule, txn, employee, month_spend_cad, p)
        if t == "TIP_CAP":
            return self._tip_cap(rule, txn, p)
        return RuleResult(violated=False)

    def _amount_limit(self, rule, txn, p) -> RuleResult:
        limit = float(p.get("max_amount_usd", 50.0))
        mcc_filter = p.get("applies_to_mcc")
        if mcc_filter and txn.mcc_code not in mcc_filter:
            return RuleResult(violated=False)
        requires_pre_auth = bool(p.get("requires_pre_authorization", True))
        if txn.amount_usd > limit and (not requires_pre_auth or not txn.is_pre_authorized):
            suffix = " with no pre-authorization" if requires_pre_auth else ""
            return RuleResult(
                violated=True, severity=rule.severity, rule_name=rule.rule_name,
                reason=f"${txn.amount_usd:.2f} USD exceeds ${limit:.0f} limit{suffix}",
            )
        return RuleResult(violated=False)

    def _fx_threshold(self, rule, txn, p) -> RuleResult:
        limit_cad = float(p.get("max_amount_cad", 68.95))
        requires_pre_auth = bool(p.get("requires_pre_authorization", True))
        if txn.amount_cad > limit_cad and (not requires_pre_auth or not txn.is_pre_authorized):
            suffix = " with no pre-authorization" if requires_pre_auth else ""
            return RuleResult(
                violated=True, severity=rule.severity, rule_name=rule.rule_name,
                reason=f"${txn.amount_usd:.2f} USD = ${txn.amount_cad:.2f} CAD exceeds "
                       f"${limit_cad:.2f} CAD threshold (FX-adjusted){suffix}",
            )
        return RuleResult(violated=False)

    def _mcc_banned(self, rule, txn, p) -> RuleResult:
        banned = set(p.get("mcc_codes", []))
        if txn.mcc_code in banned:
            return RuleResult(
                violated=True, severity=rule.severity, rule_name=rule.rule_name,
                reason=f"MCC {txn.mcc_code} ({p.get('description', 'banned category')}) "
                       f"is prohibited",
            )
        return RuleResult(violated=False)

    def _receipt_required(self, rule, txn, p) -> RuleResult:
        min_amt = float(p.get("min_amount_usd", 50.0))
        if txn.amount_usd > min_amt and not txn.receipt_url:
            return RuleResult(
                violated=True, severity=rule.severity, rule_name=rule.rule_name,
                reason=f"Missing receipt for ${txn.amount_usd:.2f} USD (> ${min_amt:.0f})",
            )
        return RuleResult(violated=False)

    def _budget_cap(self, rule, txn, employee, month_spend_cad, p) -> RuleResult:
        if employee is None:
            return RuleResult(violated=False)
        department = p.get("department")
        if department and txn.department != department:
            return RuleResult(violated=False)
        budget = float(p.get("limit_cad") or employee.monthly_budget)
        projected = month_spend_cad + txn.amount_cad
        if projected > budget:
            owner = department or employee.name
            return RuleResult(
                violated=True, severity=rule.severity, rule_name=rule.rule_name,
                reason=f"Monthly spend ${projected:.2f} CAD exceeds "
                       f"${budget:.0f} CAD budget for {owner}",
            )
        return RuleResult(violated=False)

    def _tip_cap(self, rule, txn, p) -> RuleResult:
        # No discrete tip field in the source data; rule is registered/editable but
        # cannot fire deterministically. Kept for policy completeness.
        return RuleResult(violated=False)
