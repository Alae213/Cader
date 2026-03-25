# Feature: Onboarding Modal

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The onboarding modal is the bridge between a visitor clicking "Join" and becoming an active
community member. It collects a display name and phone number, then — for paid communities —
opens a Chargily Pay checkout. Membership is only granted after the payment webhook confirms
success. For free communities, access is granted immediately on form submit. Partial completion
never creates a membership record.

---

## Users
- **Unauthenticated visitor:** Clicks Join → Clerk auth modal → then onboarding modal
- **Authenticated non-member:** Clicks Join → onboarding modal (skips Clerk, already signed in)

---

## User Stories

- As a **visitor**, I want to **join a community with minimal friction** so that I can start learning quickly.
- As a **student**, I want to **pay with my Algerian card during onboarding** so that I don't need to go through an external payment site separately.
- As the **platform**, I want to **only grant membership after payment is confirmed** so that no one gets free access to paid content.

---

## Behaviour

### Trigger

- Join button clicked on the About tab
- If not authenticated: Clerk auth modal opens first → after auth, onboarding modal opens automatically (Join intent is preserved — EC-1)
- If already authenticated: onboarding modal opens directly

### Step 1 — Profile

Fields:
- **Full name** (required, text input, max 80 characters) - filled automatically from Clerk 
- **Phone number** (required, numeric, Algerian format: start by 06 or 07 or 05) 
- Wilaya drop menu (69) if not selected (first time auth) - but if the wilaya selected in past communities don't show this field.

On "Continue": validates fields, writes to `pendingOnboarding` (or holds in state) — no membership record yet.

### Step 2 — Billing (Paid communities only)

- Skipped entirely for free communities
- Summary of what the member is paying for: community name + price + billing cycle
- "Pay [price] DZD" button
- On click:
  1. Convex action creates a Chargily checkout session (using creator's keys)
  2. Member is redirected to Chargily hosted checkout page
  3. Member pays with CIB or Edahabia
  4. Chargily fires `checkout.paid` webhook

### Pending State (EC-3)

- After the member completes Chargily checkout, they are redirected back to the community
- If the webhook has not yet arrived, the onboarding modal shows a "Confirming payment…" state
- A loading spinner or animation is shown
- Convex `useQuery` polls `memberships` for the userId + communityId — when a record appears, the modal closes automatically and the member sees the full community
- If webhook never arrives within [timeout — open question], show: "Payment is taking longer than expected. If you paid, please wait a moment or contact the creator."

### Access Grant (Free Community)

- On Step 1 submit: Convex mutation `grantMembership` is called immediately
- Membership record written with `status: active`, `pricingType: free`
- Onboarding modal closes
- Member sees the full community (top bar + all tabs appear)

### Access Grant (Paid Community)

- Only granted via `checkout.paid` webhook — never optimistically
- Webhook handler calls `grantMembership` mutation
- Modal detects the new membership record via `useQuery` and closes

### Partial Onboarding (EC-2)

- If the member closes the modal before completing Step 1: no record is created
- If the member closes the modal after Step 1 but before paying: no membership record is created; `pendingOnboarding` state (if any) is discarded
- Next time they click Join: they start Step 1 fresh (modal state is not persisted in localStorage)

### Missing Chargily Keys (EC-4)

- If the creator has not configured valid Chargily keys, the Convex action for checkout creation fails
- Onboarding modal Step 2 shows: "This community is not yet configured for payments. Please contact the community owner."
- The raw Chargily error is never shown

---

## Edge Cases & Rules

- EC-1: Join intent preserved through auth — auth modal and onboarding modal are sequential, not parallel
- EC-2: Partial onboarding creates no records
- EC-3: Webhook-gated access — pending state shown while waiting
- EC-4: Graceful error on missing Chargily keys
- Phone number is for identity/contact only in v1 — it is not verified via SMS OTP
- Full name is the member's display name inside this community (can differ per community — or is shared across platform: open question)
- The onboarding modal cannot be skipped by a non-member

---

## Connections

- **Depends on:** Clerk auth (userId must exist), Community creation (pricing type + Chargily keys), Chargily integration (checkout session creation + webhook)
- **Triggers:** `grantMembership` mutation (free) or webhook event (paid)
- **Shares data with:** Members tab (member's display name + phone stored on membership or user record), About tab (Join button state changes after membership granted)

---

## MVP vs Full Version

| Aspect                      | MVP (v1)                                                      | Full Version                |
| --------------------------- | ------------------------------------------------------------- | --------------------------- |
| Phone verification          | Collected, not verified                                       | SMS OTP verification        |
| Profile photo               | default google auth pfp                                       | -                           |
| Wilaya selection            | if first time auth show it if is selected before dont show it | -                           |
| Custom onboarding questions | Not in v1                                                     | Owner can add custom fields |
| Step count                  | 1 (free) or 2 (paid)                                          | Configurable by owner       |

---

## Security Considerations

- Phone number is stored in Convex — never logged, never returned to unauthorized users
- Full name and phone are stored server-side only after form submission — not held in localStorage
- Chargily checkout session is created server-side; creator's secret key never leaves the server
- Membership is granted only via server-side webhook handler — never via client-side assertion
- CSRF: Convex mutations use Clerk JWT for auth — no additional CSRF token needed

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Build onboarding modal Step 1 (full name + phone number, validation) |
| T— | `[ ]` | Build onboarding modal Step 2 — billing (summary + "Pay DZD" button → Chargily redirect) |
| T— | `[ ]` | Build pending/waiting state (payment confirming — Convex useQuery polling memberships) |
| T— | `[ ]` | Convex mutation: `grantMembership` (free — immediate) |
| T— | `[ ]` | Wire Join intent preservation through Clerk auth modal (EC-1) |
| T— | `[ ]` | Graceful error state for missing/invalid Chargily keys (EC-4) |
| T— | `[ ]` | Ensure no membership record is created on partial completion (EC-2) |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] Is the full name scoped per community (different name per community) or platform-wide (one name across all communities)?
- [ ] What is the timeout for the payment pending state before showing the "taking longer than expected" message?
- [ ] Is phone number stored on the `users` table (platform-wide) or on `memberships` (community-scoped)?
- [ ] Should Wilaya selection be included in onboarding Step 1 alongside name + phone?
