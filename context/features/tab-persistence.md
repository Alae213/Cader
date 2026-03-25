# Feature: Tab Persistence

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

Tab state is stored in localStorage, keyed by community slug. When a member revisits a
community, they are returned to the last tab they were on. This is a UI convenience only —
it never affects access control. Access is always re-validated server-side on every load.
If the stored tab is no longer accessible (e.g. member was removed), the system falls back
to the About tab.

---

## Users

- **Any authenticated user (member or visitor):** Tab state is stored and restored on return

---

## Behaviour

### On Tab Change

1. Member switches to a different tab (e.g. from Community to Classrooms)
2. `localStorage.setItem('cader:tab:[communitySlug]', 'classrooms')` is written immediately

### On Page Load / Return Visit

1. App reads `localStorage.getItem('cader:tab:[communitySlug]')`
2. If a stored tab exists AND the user has active membership → restore that tab
3. If no stored tab exists AND user is a member → default to Community (feed) tab
4. If no stored tab exists AND user is unauthenticated or non-member → default to About tab
5. If stored tab exists but user is unauthenticated or non-member → ignore stored tab, show About tab (EC-13)
6. If stored tab exists but the tab is now inaccessible (e.g. Analysis tab, now not admin) → fall back to Community tab

### localStorage Key Format

```
cader:tab:[communitySlug]
```

Values: `about` | `community` | `classrooms` | `members` | `leaderboard` | `analysis`

---

## Edge Cases & Rules

- EC-13: localStorage tab state is a UI hint only. Access is always validated server-side. A member who was removed from a community gets About only, regardless of what localStorage says.
- Tab state is never reflected in the URL.
- Tab state is per-community (keyed by slug) — switching between communities does not interfere.
- Analysis tab: if stored tab is `analysis` but user is no longer an admin, fall back to Community.
- Old/stale localStorage keys (for communities that no longer exist) are harmless — they are read, the community fails to load, and the user is shown a 404 or "Community not found" state.

---

## Connections

- **Depends on:** Active membership check (determines which tab is the valid default), Clerk auth
- **Shares data with:** All tabs (each tab sets the localStorage value on mount)

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Implement `useTabPersistence(communitySlug)` hook — reads/writes localStorage |
| T— | `[ ]` | Wire hook to tab navigation component — writes on tab change, reads on mount |
| T— | `[ ]` | Implement access-aware tab restoration logic (EC-13 fallback to About) |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] Should the stored tab for a community be cleared when the user explicitly logs out?
