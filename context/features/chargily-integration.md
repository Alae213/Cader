# Feature: Chargily Pay Integration

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

Chargily Pay is the commercial foundation of Cader. It is the only payment gateway that
accepts Algerian CIB and Edahabia bank cards — without it, the product cannot exist.

The integration model is creator-owned: each creator stores their own Chargily Public Key
and Secret Key in their community settings. All community and classroom revenue flows directly
into the creator's own Algerian bank account. The platform never holds or moves creator funds.

The platform has a separate Chargily account for charging creator subscriptions (2,000 DZD/month).

Two webhook endpoints handle all payment events:
- `/api/webhooks/chargily` — creator community/classroom payments
- Platform billing events — creator subscription payments

---

## Users

- **Student joining a paid community** — triggers checkout during onboarding
- **Member purchasing a price-gated classroom** — triggers checkout from access gate overlay
- **Creator** — enters and manages their own Chargily keys in Settings
- **Platform** — charges creator subscriptions via platform's own Chargily account

---

## User Stories

- As a **student**, I want to **pay with my Algerian CIB or Edahabia card** so that I don't need a foreign bank account to access content.
- As a **creator**, I want **payments to go directly into my bank account** so that I don't have to wait for a platform payout.
- As a **creator**, I want to **set my own price in DZD** so that I can price for the local market.
- As a **platform**, I want to **receive webhook confirmations before granting access** so that no one gets in without paying.

---

## Behaviour

### Community Membership Payment (Paid Join Flow)

1. Student clicks "Join" on a paid community.
2. Onboarding modal opens: Step 1 (name + phone), Step 2 (billing).
3. Server-side: Convex action calls Chargily API using the **creator's** Chargily keys to create a checkout session.
4. Student is redirected to Chargily hosted checkout page.
5. Student pays with CIB or Edahabia.
6. Chargily fires `checkout.paid` webhook to `/api/webhooks/chargily`.
7. Webhook handler:
   a. Verifies request signature.
   b. Identifies the community from the checkout metadata.
   c. Calls `grantMembership` mutation → writes `memberships` record with `status: active`.
8. Onboarding modal shows "Payment confirmed — welcome!" and closes.
9. Student sees the full community (top bar + all tabs).

### Classroom Payment (Price-Gated Access)

1. Member clicks a price-gated classroom card.
2. Access gate overlay shown: price in DZD + "Purchase" button.
3. (If level+price: level check first. Payment CTA only shown if level is met — EC-6.)
4. Server-side: Convex action creates Chargily checkout session using creator's keys.
5. Member redirected to Chargily checkout.
6. `checkout.paid` webhook fires.
7. Webhook handler writes `classroomAccess` record.
8. Member's classroom card unlocks.

### Subscription Lapse (Monthly Community — EC-9)

> **Note:** This uses manual monthly rebilling since Chargily has no native subscription API.

1. Member's 30-day subscription period expires (no automatic renewal).
2. Convex scheduled action detects expired subscriptions (runs daily).
3. System sends email reminder to member with renewal checkout link.
4. If member doesn't pay within 3 days → `memberships.status = inactive`.
5. Next time the member visits, they see the About tab only with the Join button visible.
6. Member can re-subscribe by clicking Join and going through checkout again.

### Platform Creator Subscription (2,000 DZD/month)

> **Note:** Uses manual monthly rebilling since Chargily has no native subscription API.

1. Creator hits the 50-member free tier limit.
2. Platform shows upgrade prompt in the top bar / Settings → Billing.
3. Platform's own Chargily account creates a checkout session.
4. Creator pays 2,000 DZD/month (manual rebilling via cron job + email).
5. `checkout.paid` webhook updates `communities.platformTier = subscribed`.
6. Community unlocks unlimited new members.

### Edge Cases & Rules

- **EC-3 (webhook delay):** Student completes checkout but webhook hasn't arrived yet. Onboarding modal shows a pending/waiting screen. Access is not granted until `checkout.paid` is confirmed. Frontend never grants access optimistically.
- **EC-4 (missing Chargily keys):** If keys are missing or invalid, the billing step in onboarding fails gracefully: "This community is not yet configured for payments. Contact the owner." Raw Chargily error messages are never shown to the student.
- **EC-6 (level+price gate):** Level threshold is checked before payment is offered. If member doesn't meet level, payment CTA is not shown — only the level requirement.
- **EC-7 (delete with active paying members):** Before community deletion, query active `memberships` with `status: active`. If any exist, block deletion.
- **EC-9 (subscription lapse):** Membership status is always derived from the subscription period dates (checked via daily cron), not from original join date.
- Webhook signature must be verified on every inbound request. Reject unsigned or invalid-signature requests with 401.
- Checkout metadata must include: `communityId`, `userId`, `type` (community | classroom), and optionally `classroomId`.
- Currency: DZD only. Reject any non-DZD checkout attempt at the API call level.
- **Manual rebilling:** Since Chargily has no subscription API, use 30-day periods with daily cron job to detect expiry and send renewal emails.

---

## Connections

- **Depends on:** Community creation (creator's Chargily keys stored there), Clerk auth (userId in webhook metadata), Onboarding modal (triggers checkout step)
- **Triggers:** `grantMembership` mutation, `classroomAccess` mutation, `revokeMembership` mutation
- **Shares data with:** Leaderboard (membership status affects tab visibility), Classroom access model, Settings (billing view)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Payment types | One-time, manual monthly rebilling (cron job + email) | Auto-retry, annual, installments (if Chargily adds subscriptions) |
| Checkout flow | Redirect to Chargily hosted page | Inline checkout (if Chargily supports it) |
| Refund handling | Manual (creator handles in their Chargily dashboard) | Automated refund API integration |
| Payment history (member view) | Not shown in v1 | Member can view their own payment history |
| Payment history (owner view) | Visible in Members tab | Full revenue dashboard |
| Failed payment retry | Manual — member must rejoin via email link | Automated retry + grace period |

---

## Security Considerations

- Chargily Secret Key is **never returned to the client**. Stored encrypted at rest in Convex. Read server-side only during Convex actions.
- Webhook signature verified on every request before any database write. No IP allowlisting available from Chargily.
- Checkout metadata is validated on webhook receipt — never trust metadata alone without also verifying the Chargily signature.
- Membership grant is a server-side Convex mutation triggered by webhook — never by client assertion.
- All Chargily API calls use HTTPS. No HTTP fallback.
- Do not log Chargily Secret Keys or raw webhook payloads in production logs.

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Create Convex schema: `memberships` table (userId, communityId, status, pricingType, joinedAt, expiresAt, subscriptionPeriodStart, subscriptionPeriodEnd) |
| T— | `[ ]` | Create Convex schema: `classroomAccess` table (userId, classroomId, communityId, grantedAt) |
| T— | `[ ]` | Convex action: `createChargilyCheckout` — builds checkout session via Chargily API using creator's keys |
| T— | `[ ]` | Build `/api/webhooks/chargily` Route Handler — signature verification + event routing |
| T— | `[ ]` | Convex mutation: `grantMembership` — called on `checkout.paid` for community join |
| T— | `[ ]` | Convex mutation: `grantClassroomAccess` — called on `checkout.paid` for classroom purchase |
| T— | `[ ]` | Convex mutation: `revokeMembership` — called on expired subscription |
| T— | `[ ]` | Convex scheduled action: `checkExpiringSubscriptions` — daily job to detect and process expired memberships |
| T— | `[ ]` | Build onboarding modal billing step (pending state while waiting for webhook — EC-3) |
| T— | `[ ]` | Build access gate overlay for price-gated classrooms |
| T— | `[ ]` | Platform subscription flow (platform's own Chargily account → creator pays 2,000 DZD/month via manual rebilling) |
| T— | `[ ]` | Settings → Billing tab (view subscription status, renew, cancel) |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions (RESOLVED - March 2026)

- [x] Does Chargily Pay support webhook IP allowlisting so we can restrict inbound webhooks? → **No**. Chargily does not provide IP allowlisting. Use signature verification instead (required).
- [x] What webhook events does Chargily fire for monthly subscription failures? → **Chargily has no native subscription API**. Webhook events: `checkout.paid`, `checkout.failed`, `checkout.canceled`. Use manual monthly rebilling (see below).
- [x] What is the Chargily API endpoint for checkout session creation? → **`POST https://pay.chargily.net/api/v2/checkouts`** (test: `https://pay.chargily.net/test/api/v2/checkouts`)
- [x] Does Chargily support per-checkout metadata that is returned unchanged in the webhook payload? → **Yes**. Pass `metadata` object in checkout request, returned unchanged in webhook.

---

## Manual Monthly Rebilling (v1)

Since Chargily has no native subscription/recurring payment API, implement manual rebilling:

1. **On first payment**: Store `subscriptionPeriodStart` and `subscriptionPeriodEnd` (30 days from now) in `memberships` table.
2. **Daily cron job**: Run a scheduled Convex action that queries memberships expiring within 3 days.
3. **Email reminder**: Send email to member with renewal checkout link.
4. **On renewal payment**: Update `subscriptionPeriodStart/End`, set `status: active`.
5. **On expired (no payment)**: Set `status: inactive`, revoke access.

This applies to both:
- Community monthly subscriptions (member pays creator)
- Platform creator subscription (creator pays platform 2,000 DZD/month)
