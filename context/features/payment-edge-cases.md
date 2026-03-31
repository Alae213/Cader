# Feature: Payment Edge Cases & Security Gaps

> **Status:** `planned`
> **Phase:** v1.1
> **Last updated:** March 2026

---

## Purpose

This feature addresses the critical and high-priority gaps identified in the payment system audit. The focus is on preventing duplicate payments, securing webhook endpoints, handling race conditions, and improving the user experience around payment failures.

---

## Audit Summary

| Category | Count |
|----------|-------|
| Edge Cases Already Implemented | 7 (EC-3, EC-4, EC-6, EC-7, EC-8, EC-9, EC-14) |
| Critical Gaps | 3 |
| High Priority Gaps | 3 |
| Medium Gaps | 6 |
| Low Gaps | 3 |

---

## Gaps to Fix

### Phase 1 — Critical (Fix Now)

| Gap ID | Description | Severity | File to Change |
|--------|-------------|----------|----------------|
| **G-001** | Duplicate payment — no idempotency key on checkout creation | Critical | `convex/functions/payments.ts` |
| **G-002** | No rate limiting on webhook endpoint | Critical | `src/app/api/webhooks/chargily/route.ts` |
| **G-003** | User existence not verified in webhook before granting access | Critical | `src/app/api/webhooks/chargily/route.ts` |

### Phase 2 — High Priority (Fix Soon)

| Gap ID | Description | Severity | File to Change |
|--------|-------------|----------|----------------|
| **G-004** | Expired checkout handling — no message if checkout URL expires | High | `src/components/onboarding/OnboardingModal.tsx` |
| **G-005** | Cancel redirect handling — no "payment cancelled" state | High | `src/components/onboarding/OnboardingModal.tsx` |
| **G-006** | Platform tier verification before webhook processing | High | `src/app/api/webhooks/chargily/route.ts` |

### Phase 3 — Medium Priority (V2)

| Gap ID | Description | Severity | File to Change |
|--------|-------------|----------|----------------|
| **G-007** | Orphaned classroom access if classroom deleted | Medium | `convex/functions/classrooms.ts` |
| **G-008** | Test mode vs live mode separation | Medium | `convex/functions/payments.ts` |
| **G-009** | Price change mid-checkout unclear error | Medium | `convex/functions/payments.ts` |
| **G-010** | Concurrent membership grant race condition | Medium | `convex/functions/memberships.ts` |
| **G-011** | Member limit race condition | Medium | `convex/functions/memberships.ts` |
| **G-012** | Payment history view for members | Medium | `src/components/settings/BillingSection.tsx` |

---

## Implementation Plan

### Phase 1 — Critical Fixes

#### G-001: Idempotency Key for Checkout Creation

**Problem:** User can pay twice if they refresh the checkout page.

**Solution:** 
1. Add `paymentReference` field to `memberships` table to store Chargily checkout ID
2. In `grantMembership`, check if `paymentReference` already exists before creating new record
3. Return early with existing membership if duplicate detected

**Files Changed:**
- `convex/schema.ts` — add `paymentReference` field to `memberships` table
- `convex/functions/payments.ts` — pass `paymentReference` to checkout creation
- `convex/functions/memberships.ts` — check for existing paymentReference in grantMembership
- `src/app/api/webhooks/chargily/route.ts` — pass paymentReference to mutation

#### G-002: Rate Limiting on Webhook Endpoint

**Problem:** Webhook endpoint could be flooded with requests.

**Solution:**
1. Use Upstash rate limiting (Redis) for webhook endpoint
2. Limit: 100 requests per minute per IP

**Files Changed:**
- `src/app/api/webhooks/chargily/route.ts` — add rate limiting middleware

#### G-003: User Existence Verification

**Problem:** If user gets deleted before webhook fires, grant fails silently.

**Solution:**
1. In webhook handler, query user existence before calling grant mutation
2. If user not found, return 200 (prevent retry) but log error
3. Better: use upsert pattern to handle gracefully

**Files Changed:**
- `src/app/api/webhooks/chargily/route.ts` — add user existence check

---

### Phase 2 — High Priority Fixes

#### G-004: Expired Checkout Handling

**Problem:** User takes too long to pay, Chargily checkout URL expires.

**Solution:**
1. After checkout redirect, poll for membership status
2. If checkout fails/expires, show "Checkout expired, please try again" message
3. Listen for `checkout.canceled` event to detect user cancelled

**Files Changed:**
- `src/components/onboarding/OnboardingModal.tsx` — add expired state UI

#### G-005: Cancel Redirect Handling

**Problem:** User redirected to cancel URL but no clear feedback.

**Solution:**
1. Add `?status=cancelled` query param to cancel URL
2. On page load, check for cancelled status and show appropriate UI

**Files Changed:**
- `convex/functions/payments.ts` — add status to cancel URL
- `src/components/onboarding/OnboardingModal.tsx` — handle cancelled state

#### G-006: Platform Tier Verification

**Problem:** Webhook should verify community still exists and has correct tier.

**Solution:**
1. Before granting platform subscription, verify community exists and tier is correct
2. Add additional verification in webhook handler

**Files Changed:**
- `src/app/api/webhooks/chargily/route.ts` — add tier verification

---

### Phase 3 — Medium Priority Fixes

#### G-007: Orphaned Classroom Access

**Problem:** If classroom deleted, access records remain.

**Solution:**
1. In `listClassrooms` query, filter out access records for deleted classrooms
2. Add cleanup mutation for orphaned access

**Files Changed:**
- `convex/functions/classrooms.ts` — add filter for deleted classrooms

#### G-008: Test vs Live Mode Separation

**Problem:** Test payments could accidentally grant access in production.

**Solution:**
1. Use environment variable `CHARGILY_MODE` to determine mode
2. In webhook handler, verify mode matches checkout mode
3. Reject test-mode checkouts in production

**Files Changed:**
- `src/app/api/webhooks/chargily/route.ts` — add mode verification
- `convex/functions/payments.ts` — pass mode in metadata

#### G-009: Price Change Mid-Checkout

**Problem:** If creator changes price after user starts checkout, amount mismatch blocks access.

**Solution:**
1. Store expected price in checkout metadata at creation time
2. In webhook, verify against stored price, not current price
3. This ensures user pays the price they saw when starting checkout

**Files Changed:**
- `convex/functions/payments.ts` — store price in metadata
- `src/app/api/webhooks/chargily/route.ts` — verify against metadata price

#### G-010: Concurrent Membership Grant

**Problem:** Webhook retry could create duplicate memberships.

**Solution:**
1. Use database unique constraint on `(communityId, userId, paymentReference)`
2. Catch duplicate key error gracefully

**Files Changed:**
- `convex/schema.ts` — add unique index
- `convex/functions/memberships.ts` — handle unique constraint

#### G-011: Member Limit Race Condition

**Problem:** Between checking limit and granting access, other requests could fill the limit.

**Solution:**
1. Use optimistic locking or database transaction
2. Check-and-set in single atomic operation

**Files Changed:**
- `convex/functions/memberships.ts` — use atomic check

#### G-012: Payment History View

**Problem:** Members can't see their payment history.

**Solution:**
1. Create `paymentHistory` query for members
2. Add PaymentHistory component to settings

**Files Changed:**
- `convex/functions/payments.ts` — add paymentHistory query
- `src/components/settings/BillingSection.tsx` — add history view

---

## New Edge Cases to Add

| Code | Description | Implementation |
|------|-------------|----------------|
| **EC-15** | Duplicate payment prevention | Check paymentReference before grant |
| **EC-16** | Webhook retry handling | Idempotent mutations, return 200 on duplicates |
| **EC-17** | Test mode webhook rejection | Verify CHARGILY_MODE matches |
| **EC-18** | Price locked at checkout | Store price in metadata at creation |
| **EC-19** | Checkout expiration | Poll and show expired message |
| **EC-20** | Cancel redirect handling | Parse status param and show UI |

---

## Connections

- **Depends on:** Chargily integration (already implemented)
- **Triggers:** Updated mutations and webhook handler
- **Shares data with:** Onboarding modal, Billing section, Settings

---

## User Acceptance Tests

**UAT Status:** `pending`

| Test | Expected Result |
|------|-----------------|
| User refreshes checkout page | No duplicate charge, membership granted once |
| 100+ webhook requests/minute | Excess requests rejected with 429 |
| User deleted before webhook fires | Graceful handling, no crash |
| User takes 24 hours to pay | Checkout expires, clear message shown |
| User clicks cancel on Chargily | Returns to app with cancelled state |
| Test-mode checkout in production | Rejected, access not granted |
| Creator changes price mid-checkout | User pays old price, access granted |
| Concurrent webhook for same user | Only one membership created |

---

## Tasks

| Task # | Status | What needs to be done |
|--------|--------|----------------------|
| T-PAY-001 | `[ ]` | Add `paymentReference` field to `memberships` schema |
| T-PAY-002 | `[ ]` | Add idempotency check in `grantMembership` mutation |
| T-PAY-003 | `[ ]` | Add rate limiting to webhook endpoint |
| T-PAY-004 | `[ ]` | Add user existence check in webhook handler |
| T-PAY-005 | `[ ]` | Handle checkout expiration in OnboardingModal |
| T-PAY-006 | `[ ]` | Handle cancel redirect in OnboardingModal |
| T-PAY-007 | `[ ]` | Add platform tier verification in webhook |
| T-PAY-008 | `[ ]` | Filter deleted classrooms from access queries |
| T-PAY-009 | `[ ]` | Add test/live mode verification in webhook |
| T-PAY-010 | `[ ]` | Store price in checkout metadata at creation |
| T-PAY-011 | `[ ]` | Add unique index for membership duplicates |
| T-PAY-012 | `[ ]` | Use atomic check for member limit |
| T-PAY-013 | `[ ]` | Create payment history query and UI |

---

## Open Questions

- [ ] Should we use Upstash Redis for rate limiting, or is there a simpler solution?
- [ ] How long should checkout URLs be valid? 24 hours seems reasonable.
- [ ] Should we implement automatic refund detection from Chargily webhooks?

---

## Related Files

- `convex/schema.ts`
- `convex/functions/payments.ts`
- `convex/functions/memberships.ts`
- `convex/functions/classrooms.ts`
- `src/app/api/webhooks/chargily/route.ts`
- `src/components/onboarding/OnboardingModal.tsx`
- `src/components/settings/BillingSection.tsx`
