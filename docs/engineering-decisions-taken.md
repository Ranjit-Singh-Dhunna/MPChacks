# Engineering Decisions Taken

## Compliance Action Queue

- The Compliance page is designed for a non-technical finance manager, so the interface must prioritize actionability, plain evidence, and next steps over detector internals.
- The primary UI model is a unified compliance case queue.
- Direct policy violations and passive anomaly findings are shown in the same compliance layer.
- Fraud and compliance detection v1 is deterministic and auditable.
- AI can enrich summaries, but scoring, detection, and review decisions must not depend on AI availability.
- Compliance actions persist as workflow state.
- Approval integration is warning-only in v1. Open findings can inform approvals, but they do not block or auto-reject approvals.
- Scans run during the existing `Ingest + Analyze` flow, not on page load and not through a background scheduler.
- Overlapping anomaly and policy evidence is merged into one case to avoid duplicate manager review.
- Case explanations use finance-manager-readable evidence first, with technical detector details secondary.
- V1 case actions are mark reviewed, escalate, request info, dismiss false positive, and add note.

## Fraud Detection Engine v2

- Each detector must have a **unique kill zone** — a class of fraud it catches that no existing detector can. If two detectors fire on the same data for the same reason, one is dead weight.
- Five new detectors were added alongside the original five. None were removed. The original detectors remain Tier 2a; the new ones are Tier 2b.
- **Benford's Law** (chi-squared test per employee): Industry-standard forensic accounting technique (IRS, Big 4, ACFE). Catches fabricated expenses whose leading-digit distribution deviates from the expected logarithmic curve. Does not overlap with structuring, which checks round numbers at one merchant — Benford checks digit distribution across all merchants for one employee.
- **Velocity anomaly** (rolling 7-day personal baseline): AML/FINCEN standard. Flags spending-rate spikes vs. the employee's own historical norm. Does not overlap with smurfing, which checks sub-$50 transactions against a fixed policy threshold — velocity checks any transactions against the employee's personal baseline.
- **Duplicate expense detection** (same employee, same merchant, near-identical amount within 7 days): ACFE's #1 most common corporate expense fraud pattern. Does not overlap with split billing, which requires two different employees — duplicate detection is one employee submitting twice.
- **Peer-group comparison** (department-level z-score on total spend): Standard Big 4 internal audit technique. Does not overlap with z-score outlier, which checks one transaction vs. its MCC — peer comparison checks one employee's total vs. their department peers.
- **Merchant concentration (HHI)**: Card-network fraud team standard. Catches disproportionate vendor allocation using Herfindahl-Hirschman Index. Does not overlap with shell vendor, which requires a new merchant with round amounts — HHI catches concentration at any merchant regardless of age or amount pattern.
- **Rejected approaches**: Network graph / collusion ring detection was rejected because 9 employees is too small for graph clique analysis to be statistically meaningful. Temporal anomaly as a standalone detector was rejected because weekend/off-hours transactions alone are a weak signal; instead, temporal data feeds into the composite risk profile as one signal among many.
- **Composite risk profiling** runs after all detectors. Each signal contributes a 0–100 sub-score. Only signals that actually fire are included in the weighted average — inactive signals are excluded from the denominator so profiles with few but strong signals aren't artificially deflated.
- Risk tiers: CRITICAL (≥80), HIGH (≥60), MEDIUM (≥35), LOW (<35).
- Employee risk profiles are persisted in a dedicated table and rebuilt on every analysis run, consistent with the existing scan-on-analyze-not-on-page-load pattern.
- The only new dependency is `scipy` for the chi-squared test in Benford's detector. scipy was already in requirements.txt.
- Three new seeded fraud patterns were added to `generate_data.py` for demo coverage: Benford violation (Bob Kumar), velocity spike (Carol White), merchant concentration (Dana Park). Existing seeded patterns are untouched.
- New API surface: `/api/fraud/intelligence`, `/api/fraud/risk-profiles`, `/api/fraud/risk-profiles/{employee_id}`, `/api/fraud/clusters`, `/api/fraud/clusters/{cluster_id}`. All are read-only GETs against data produced by the analyze pipeline.

## Implementation Defaults

- SQLite remains the local persistence layer.
- Reviewer identity is passed as a simple field and defaults to `Finance Manager` until authentication exists.
- Case fingerprints are stable across analysis runs so status, notes, and event history survive rescans.
- Cases no longer detected on a later scan are marked resolved instead of being deleted.
- Direct policy violation transactions remain available as a transaction-level view under Compliance.
