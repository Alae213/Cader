# Feature: Community Creation

> **Status:** `partial`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The community creation modal is the first thing a creator does after authenticating  . It is a
2-step modal: Step 1 collects the community name and auto-generates an editable slug. Step 2
collects pricing model, Chargily API keys (if paid), and Wilaya selection. On completion the
creator is taken to their new community's About tab as owner. The same modal is reused for
both new-user creation (from `/`) and additional community creation (from the top bar dropdown).

---

## Users

**Creator (new or returning, authenticated)** — triggered from:
1. `/` platform landing → "Create community" CTA → Clerk auth → this modal
2. `/[communitySlug]` → top bar → community dropdown → "Create new community"

---

## User Stories

- As a **creator**, I want to **name my community and get a slug automatically** so that I don't have to think about URL formatting.
- As a **creator**, I want to **choose a pricing model in DZD** so that I can monetize my community without currency conversion.
- As a **creator**, I want to **enter my Chargily API keys once** so that payments flow directly into my own bank account.
- As a **creator**, I want to **edit my community settings later** so that I'm not locked in at creation time.

---

## Behaviour

### Step 1 — Name & Slug

1. Creator types a community name.
2. Slug is auto-generated from the name (lowercase, hyphens, no spaces or special chars).
3. Slug field is editable — creator can override the generated value.
4. Slug is validated in real time (debounced) against existing slugs in Convex.
5. If slug is taken: inline error shown ("This URL is already in use — try a different name").
6. Creator clicks "Continue" (disabled until name is filled and slug is valid).

### Step 2 — Pricing & Configuration

7. Creator selects pricing type: **Free / Monthly / Annual / One-time**.
8. If not free: price input in DZD appears (required).
9. If not free: Chargily Public Key and Secret Key fields appear (required).
10. Keys are validated client-side for format, then a test API call confirms they are active.
11. Creator selects their Wilaya from a dropdown (68 options).
12. Creator clicks "Create Community".
13. Community record is written to Convex `communities` table.
14. Chargily keys are encrypted before storage.
15. Creator is redirected to `/[communitySlug]` → About tab (owner view, empty community).

### Edge Cases & Rules

- **EC-5 (slug conflict):** Slug uniqueness validated on input (debounced 300ms) AND again on submit. Duplicate slugs are rejected at both layers.
- **EC-4 (missing Chargily keys):** If a creator creates a paid community without valid keys, the Join flow for visitors will show a graceful error: "This community is not yet configured for payments. Contact the owner." Creator can update keys via Settings.
- **EC-12 (pricing model change):** Owner can edit pricing via Settings → opens this modal at step 1/2. Changes apply to new members only. Existing members retain their original access terms.
- Slug cannot be changed after the community has active members (warn the owner in UI).
- Community names have a max length of 60 characters.
- Slug has a max length of 50 characters.
- DZD price must be a positive integer ≥ 100 DZD.

---

## Connections

- **Depends on:** Clerk auth (user must be authenticated before modal opens)
- **Triggers:** Chargily key validation (action), `communities` table write (mutation)
- **Shares data with:** About tab (reads community record), Settings modal (edits same record), Onboarding modal (reads pricing type + Chargily keys)

---

## MVP vs Full Version

| Aspect                       | MVP (v1)                        | Full Version                   |
| ---------------------------- | ------------------------------- | ------------------------------ |
| Pricing types                | Free, Monthly, Annual, One-time | Same + tiered memberships      |
| Chargily key entry           | Manual copy-paste               | OAuth-style Chargily connect   |
| Slug editable after creation | Blocked if active members       | Blocked always (permanent URL) |
| Community avatar             | Upload at creation              | Yes                            |
| Custom domain                | Not supported                   | v2                             |

---

## Security Considerations

- Chargily Secret Key must never be returned to the client. Stored encrypted at rest in Convex. Retrieved server-side only during checkout session creation.
- Slug validation happens server-side on submit — client-side is UX only.
- Community creation requires a valid Clerk session. Server-side auth check on the Convex mutation.
- Rate limit: max 1 community creations per user per hour (prevent abuse).

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Create `communities` Convex table with schema (id, name, slug, ownerId, pricingType, priceInDZD, chargilyPublicKey, chargilySecretKey encrypted, wilayaId, createdAt) |
| T— | `[ ]` | Build community creation modal — Step 1 (name input + slug auto-gen + real-time uniqueness check) |
| T— | `[ ]` | Build community creation modal — Step 2 (pricing selector + DZD price input + Chargily key fields + Wilaya dropdown) |
| T— | `[ ]` | Convex action: validate Chargily API keys (test call to Chargily) |
| T— | `[ ]` | Convex mutation: `createCommunity` — writes community, encrypts keys, returns slug |
| T— | `[ ]` | Post-creation redirect to `/[communitySlug]` |
| T— | `[ ]` | Wire Settings modal "Edit community" button to open this modal in edit mode |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] Should we validate Chargily keys via a live API test call during creation, or accept them and fail gracefully later?
- [ ] Can a creator create a community without Chargily keys (free community only) and add keys later via Settings?
- [ ] What is the maximum number of communities one user can own?

---

## Notes

- The same modal component is reused for creation and editing. Edit mode pre-fills all fields.
- In edit mode, the slug field shows a warning if members exist: "Changing the URL will break existing links."
