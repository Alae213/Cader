# Feature: Analysis Tab

> **Status:** `removed`
> **Phase:** v1
> **Last updated:** March 2026
> **Removed:** April 2026 — placeholder tab removed from codebase

---

## Archive

This feature was removed in April 2026. The Analysis tab was a v1 placeholder that
displayed "Coming Soon" to community owners. It has been fully removed from:
- `src/components/community/AnalysisTab.tsx` (deleted)
- `src/components/layout/CommunityShell.tsx` (import + render removed)
- `src/components/layout/TabNav.tsx` (tab entry removed)

Analytics functionality is still planned for v1.1 as a creator dashboard, but it
will be built fresh at that time rather than evolving from this placeholder.

---

## Original Spec (preserved for reference)

### Summary

The Analysis tab was an owner-only tab that displayed a "Coming Soon" placeholder in v1.
Full analytics (member growth, engagement metrics, revenue data) were deferred to v1.1.

### Users

- **Owner / Admin:** Saw the "Coming Soon" placeholder
- **Member:** Tab was hidden
- **Visitor / non-member:** Tab was hidden

### Behaviour

Only visible to community owner/admin. When clicked, displayed centered "Coming Soon"
content with a chart icon.

### MVP vs Full Version (v1.1)

| Aspect | MVP (v1) | Full Version (v1.1) |
|---|---|---|
| Content | "Coming Soon" placeholder | Full dashboard |
| Metrics | None | Member growth, engagement, revenue |
| Time range | N/A | 7d / 30d / 90d / all-time |
| Exports | N/A | CSV export |
| Charts | None | Line charts, bar charts |
