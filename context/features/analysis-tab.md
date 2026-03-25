# Feature: Analysis Tab

> **Status:** `placeholder`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The Analysis tab is an owner-only tab that displays a "Coming Soon" placeholder in v1.
Full analytics (member growth, engagement metrics, revenue data) are deferred to v1.1.
The tab exists to reserve the UI slot and signal to creators that analytics are on the roadmap.

---

## Users

- **Owner / Admin:** Sees the "Coming Soon" placeholder
- **Member:** Tab is hidden (not visible in tab navigation)
- **Visitor / non-member:** Tab is hidden

---

## User Stories

- As an **owner**, I want to **see the Analysis tab** so that I know analytics are coming.
- As an **owner**, I want to **understand what analytics will be available** so I can plan for them.

---

## Behaviour

### Tab Visibility

- Only visible to community owner/admin
- Hidden from members and non-members
- Tab label: "Analysis" with a chart icon

### Placeholder Content

When clicked, displays:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   📊                                            │
│                                                 │
│   Analytics are coming soon!                    │
│                                                 │
│   In v1.1, you'll be able to track:             │
│   • Member growth over time                     │
│   • Post engagement (upvotes, comments)         │
│   • Classroom completion rates                  │
│   • Revenue events (subscriptions, payments)    │
│                                                 │
│   Stay tuned!                                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Design Notes

- Centered content, max-width 400px
- Icon: Lucide `BarChart3` or similar
- Secondary text color for the description
- No interactive elements in v1

---

## MVP vs Full Version (v1.1)

| Aspect | MVP (v1) | Full Version (v1.1) |
|---|---|---|
| Content | "Coming Soon" placeholder | Full dashboard |
| Metrics | None | Member growth, engagement, revenue |
| Time range | N/A | 7d / 30d / 90d / all-time |
| Exports | N/A | CSV export |
| Charts | None | Line charts, bar charts |

---

## Connections

- **Depends on:** Community context (community-scoped data)
- **Triggers:** None in v1
- **Shares data with:** None in v1 (future: all community data sources)

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T-001 | `[ ]` | Add "Analysis" tab to community tab navigation (owner-only visibility) |
| T-002 | `[ ]` | Create placeholder component with "Coming Soon" messaging |
| T-003 | `[ ]` | Style placeholder (centered, icon, secondary text) |
| T-004 | `[ ]` | Ensure tab is hidden for non-admin users (server-side check) |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] Should the placeholder include a "Request early access" CTA for analytics?
- [ ] Should owner see any aggregate stats in v1 (total members, total posts) or keep it empty?
