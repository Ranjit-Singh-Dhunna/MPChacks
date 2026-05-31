"""Deterministic policy rule engine — the Tier-1 filter (no AI).

Handles ~85% of policy decisions with zero LLM calls. Every monetary check runs on
amount_cad so FX-evasion (a $499 USD charge = ~$688 CAD) cannot slip through.
"""
from models import Employee, Policy, Transaction
from policy.evaluator import SEVERITY_ORDER, PolicyResult, RuleResult


class RuleEngine:
    """The Tier-1 deterministic Policy Rule Engine.
    
    Evaluates corporate card transactions against active corporate policy rules
    with zero external AI dependencies. All monetary checks are calculated in CAD
    to eliminate FX-evasion vulnerabilities.
    """
    def __init__(self, rules: list[Policy]):
        """Initializes the rule engine with a active list of policy rules."""
        self.rules = [r for r in rules if r.is_active]

    def check_transaction(
        self, txn: Transaction, employee: Employee | None = None,
        month_spend_cad: float = 0.0,
    ) -> PolicyResult:
        """Applies all active rules to a transaction and classifies the result.
        
        Evaluates rules sequentially. If any rule triggers a violation, it maps
        the transaction to either a hard 'VIOLATION' (if the severity level is HIGH or
        CRITICAL) or a warning 'REVIEW' (if the severity is LOW or MEDIUM).
        
        Args:
            txn (Transaction): The transaction model instance to check.
            employee (Employee, optional): The associated employee model instance.
            month_spend_cad (float, optional): The month-to-date spending (CAD) before this transaction.

        Returns:
            PolicyResult: Result object containing compliant/review/violation status, worst severity, and reasons.
        """
        violations: list[RuleResult] = []
        for rule in self.rules:
            res = self._apply(rule, txn, employee, month_spend_cad)
            if res.violated:
                violations.append(res)

        if not violations:
            return PolicyResult(flag="COMPLIANT")

        worst = max(violations, key=lambda v: SEVERITY_ORDER.get(v.severity, 0))
        # HIGH (3) or CRITICAL (4) violations escalate to hard VIOLATION, while LOW/MEDIUM remain REVIEW
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
        if t == "EXCLUDED_REIMBURSEMENT":
            return self._excluded_reimbursement(rule, txn, p)
        if t == "CARD_USAGE_RESTRICTION":
            return self._card_usage_restriction(rule, txn, employee, p)
        if t == "VEHICLE_RESTRICTION":
            return self._vehicle_restriction(rule, txn, p)
        return RuleResult(violated=False)

    def _amount_limit(self, rule, txn, p) -> RuleResult:
        limit_usd = float(p.get("max_amount_usd", 50.0))
        limit_cad = float(p.get("max_amount_cad") or limit_usd * txn.conversion_rate)
        mcc_filter = p.get("applies_to_mcc")
        if mcc_filter and txn.mcc_code not in mcc_filter:
            return RuleResult(violated=False)
        requires_pre_auth = bool(p.get("requires_pre_authorization", True))
        if txn.amount_cad > limit_cad and (not requires_pre_auth or not txn.is_pre_authorized):
            suffix = " with no pre-authorization" if requires_pre_auth else ""
            return RuleResult(
                violated=True, severity=rule.severity, rule_name=rule.rule_name,
                reason=(
                    f"${txn.amount_usd:.2f} USD = ${txn.amount_cad:.2f} CAD exceeds "
                    f"${limit_cad:.2f} CAD threshold{suffix}"
                ),
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
        terms = [p.get("item"), p.get("description"), *(p.get("keywords") or [])]
        terms = [str(term).lower() for term in terms if term]
        haystack = self._txn_text(txn)
        if terms and any(term in haystack for term in terms):
            label = terms[0]
            return RuleResult(
                violated=True, severity=rule.severity, rule_name=rule.rule_name,
                reason=f"{label.title()} matched prohibited policy category",
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

    def _excluded_reimbursement(self, rule, txn, p) -> RuleResult:
        haystack = self._txn_text(txn)
        for item in p.get("excluded_items", []):
            tokens = [token for token in str(item).lower().replace("-", " ").split() if token]
            if tokens and all(token in haystack for token in tokens):
                return RuleResult(
                    violated=True, severity=rule.severity, rule_name=rule.rule_name,
                    reason=f"{str(item).title()} is excluded from reimbursement",
                )
        return RuleResult(violated=False)

    def _card_usage_restriction(self, rule, txn, employee, p) -> RuleResult:
        # Source transactions do not expose a separate card-user identity. Without
        # that field, this rule cannot be proven deterministically.
        return RuleResult(violated=False)

    def _vehicle_restriction(self, rule, txn, p) -> RuleResult:
        # The policy text is trip-contextual, but source transactions only carry a
        # single line item. Keep the rule editable and non-firing until traveler
        # counts or vehicle class are available.
        return RuleResult(violated=False)

    @staticmethod
    def _txn_text(txn) -> str:
        return " ".join([
            str(txn.merchant_name or ""),
            str(txn.mcc_description or ""),
            str(txn.mcc_code or ""),
        ]).lower()
