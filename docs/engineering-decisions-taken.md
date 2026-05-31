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

## Implementation Defaults

- SQLite remains the local persistence layer.
- Reviewer identity is passed as a simple field and defaults to `Finance Manager` until authentication exists.
- Case fingerprints are stable across analysis runs so status, notes, and event history survive rescans.
- Cases no longer detected on a later scan are marked resolved instead of being deleted.
- Direct policy violation transactions remain available as a transaction-level view under Compliance.
