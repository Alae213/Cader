# Feature: SofizPay Integration

> **Status:** `planned`
> **Phase:** Phase 27
> **Last updated:** April 2026

---

## Summary

Complete replacement of Chargily Pay with SofizPay for all payment processing.

**Key Changes:**
- Replace Chargily with SofizPay as payment provider
- Use CIB hosted payment flow (user redirected to SofizPay page)
- **No webhooks** - Use polling/return URL pattern instead
- Keep DZD currency only (no XLM/crypto for users)
- Complete migration - all at once flip

---

## Migration Decisions (April 2026)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Payment Provider | SofizPay | Replace Chargily (DZD card payments) |
| Migration Type | Complete replacement | All at once, no dual system |
| Payment Method | CIB (Hosted) | User redirected to SofizPay page via `makeCIBTransaction` |
| Verification Method | **No webhooks** | SofizPay doesn't support webhooks - use return URL + transaction check |
| Currency | DZD only | No XLM/crypto exposure for users |
| Minimum Amount | 1000 DZD | Block below SofizPay/CIB minimum |
| Refunds | No refunds | Policy documented in T&C |
| Chargebacks | Owner bears risk | Platform not liable - documented in T&C |
| Existing Members | Keep access | No re-payment required |

---

## Architecture

### Payment Flow (Polling-based, NO webhooks)

```
User clicks "Join/Pay"
    → createSofizpayCheckout (Convex mutation)
    → SofizPay SDK makeCIBTransaction()
    → Returns payment URL + order_number
    → Redirect to SofizPay hosted page
    → User enters CIB card details
    → Payment processes
    → SofizPay redirects to return_url (?status=success&order=XXX)
    → Frontend shows "Verifying payment..."
    → Convex calls: searchTransactionsByMemo(memo) or getTransactions()
    → If paid → Grant access (membership/classroomAccess)
```

**Key Point:** Since SofizPay doesn't support webhooks, we verify payments by:
1. Using return URL (SofizPay redirects user back after payment)
2. Searching transactions by memo (contains community + user info)
3. Checking if payment was successful

### How to Track Payments

The `memo` field is critical:
```typescript
memo: `Community:${slug} - User:${email}`
```

After return, we search:
```typescript
sdk.searchTransactionsByMemo(ownerPublicKey, `Community:${slug} - User:${email}`)
```

If transaction found with matching amount → payment confirmed!

### File Changes

| Component | File | Action |
|-----------|------|--------|
| Schema | `convex/schema.ts` | Replace Chargily fields with SofizPay |
| SDK Wrapper | `convex/lib/sofizpay.ts` | Create (NEW) |
| Mutations | `convex/functions/payments.ts` | Replace checkout functions + add verifyPayment |
| Frontend | Multiple components | Update to use SofizPay + handle return URL |
| Env Config | `.env.example` | Update variables |

**No webhook endpoint needed!**

---

## Users

- **Student joining a paid community** — triggers checkout during onboarding
- **Member purchasing a price-gated classroom** — triggers checkout from access gate overlay
- **Creator** — enters and manages their SofizPay Public Key in Settings
- **Platform** — charges creator subscriptions (2000 DZD/month) via platform's SofizPay account

---

## User Stories

- As a **student**, I want to **pay with my Algerian CIB card** so that I can access content without foreign payment methods.
- As a **creator**, I want **payments to go directly into my bank account** so that I receive funds directly.
- As a **creator**, I want to **set my own price in DZD** so that I can price for the local market.
- As a **platform**, I want to **verify payments after user returns** so that no one gets in without paying.

---

## Technical Implementation

### Schema Changes

```typescript
// convex/schema.ts - communities table

// REMOVE:
chargilyApiKey: v.optional(v.string()),
chargilyWebhookSecret: v.optional(v.string()),

// ADD:
sofizpayPublicKey: v.optional(v.string()),  // Owner's public key for identification
```

### SDK Wrapper (`convex/lib/sofizpay.ts`)

```typescript
"use node";
import SofizPaySDK from "sofizpay-sdk-js";

const sdk = new SofizPaySDK();

// Create CIB Transaction
export async function createCIBTransaction(params: {
  account: string;      // Owner's public key
  amount: number;        // Amount in DZD
  full_name: string;     // Customer name
  phone: string;         // Customer phone
  email: string;        // Customer email
  memo?: string;        // Payment description (use for tracking!)
  return_url: string;   // URL to redirect after payment
  redirect?: "yes" | "no";
}): Promise<{ success: boolean; url?: string; data?: any; error?: string }>

// Verify Payment by Searching Transactions
export async function verifyPaymentByMemo(params: {
  ownerPublicKey: string;   // Owner's public key
  communitySlug: string;   // For memo matching
  userEmail: string;       // For memo matching
  expectedAmount: number; // Verify amount matches
}): Promise<{ verified: boolean; transaction?: any; error?: string }>

// Alternative: Get Transaction by Hash
export async function getTransactionByHash(hash: string): Promise<any>

// Get All Transactions (for manual verification)
export async function getTransactions(publicKey: string, limit?: number): Promise<any>
```

### Mutations

| Mutation | Description |
|----------|-------------|
| `createSofizpayCheckout` | Create CIB transaction, returns payment URL |
| `verifyPaymentStatus` | Search transactions by memo, verify payment |
| `validateSofizpayKeys` | Validate owner's public key format (Stellar G... format) |
| `createPlatformSubscriptionCheckout` | Create platform subscription payment (2000 DZD) |

### Frontend Return URL Handling

```typescript
// After user returns from SofizPay
// URL: /community?status=success&order=XXX

// 1. Parse URL params
const status = searchParams.get("status"); // "success", "cancelled", "failed"

// 2. If success, call verifyPaymentStatus mutation
const result = await verifyPaymentStatus({
  orderId: searchParams.get("order"),
  communityId: ...,
  userId: ...,
});

// 3. If verified → grant access
// If pending → show "Checking again..." + retry
// If failed → show error
```

### Frontend Components to Update

| Component | Changes |
|-----------|---------|
| `CreateCommunityModal.tsx` | Replace Chargily key inputs with SofizPay Public Key |
| `EditCommunityModal.tsx` | Same as Create |
| `OnboardingModal.tsx` | Use createSofizpayCheckout, handle return URL, update "Powered by" text |
| `LockedClassroomModal.tsx` | Same as Onboarding |
| `SettingsModal.tsx` | Platform subscription updates |
| `help/page.tsx` | Replace Chargily references with SofizPay |
| `app/layout.tsx` | Update meta description |

---

## Payment Verification Strategy

Since no webhooks, we use **memo-based verification**:

### Step 1: Create Payment with Rich Memo

```typescript
const memo = `Community:${communitySlug} - User:${userEmail} - Type:${type}`;
```

Example: `Community:tech-algeria - User:john@example.com - Type:community`

### Step 2: After Return, Search Transactions

```typescript
const result = await sdk.searchTransactionsByMemo(
  ownerPublicKey,
  `Community:${slug} - User:${email}`,
  10  // limit
);
```

### Step 3: Verify Amount Matches

```typescript
if (result.success && result.transactions.length > 0) {
  const tx = result.transactions[0];
  if (tx.amount === expectedAmount) {
    // Payment verified!
    return { verified: true, transaction: tx };
  }
}
```

---

## Edge Cases & Rules

| Edge Case | Handling |
|-----------|----------|
| **EC-SF-1: Invalid public key** | Validate format (G... 56 chars) before save |
| **EC-SF-2: Payment below minimum** | Block creation if price < 1000 DZD |
| **EC-SF-3: Payment pending** | Show "Verifying..." polling UI, retry 2-3 times |
| **EC-SF-4: SofizPay API failure** | Show "Payment unavailable, try again later" |
| **EC-SF-5: Transaction not found** | After return, if no matching transaction → show error |
| **EC-SF-6: Amount mismatch** | Verify amount matches expected from DB |
| **EC-SF-7: Payment cancelled** | Handle `?status=cancelled` in return URL |
| **EC-SF-8: Existing member pays again** | Update existing membership, re-activate if needed |
| **EC-SF-9: No webhooks** | Use polling + return URL pattern instead |

---

## Environment Variables

```env
# Platform SofizPay (for platform subscriptions)
SOFIZPAY_PLATFORM_PUBLIC_KEY=GAxxx

# Config
MIN_PAYMENT_AMOUNT=1000

# Optional (if using Stellar features)
SOFIZPAY_SECRET_KEY=  # Only if using direct Stellar transactions
```

**Note:** No webhook secret needed - SofizPay doesn't support webhooks!

---

## Security

- Public key stored in plaintext (no sensitive data)
- No secret key stored (CIB hosted flow doesn't require it)
- Payment verification via transaction search (memo + amount check)
- Memo format: `Community:{slug} - User:{email} - Type:{type}`
- Verify amount matches expected before granting access

---

## Testing Checklist

- [ ] Create community with valid SofizPay key
- [ ] Create community with invalid key (validation error)
- [ ] Create community with price < 1000 DZD (blocked)
- [ ] Join free community (no payment)
- [ ] Join paid community (SofizPay flow)
- [ ] Payment cancelled flow
- [ ] Payment verified via transaction search
- [ ] Amount verification (correct + incorrect)
- [ ] Platform subscription payment
- [ ] Purchase classroom (same flow)

---

## Cleanup (After Testing)

```bash
# Delete deprecated files
rm convex/lib/chargily.ts
rm src/app/api/webhooks/chargily/route.ts
```

---

## Dependencies

- **Requires:** Community creation (public key stored), Clerk auth, Onboarding modal
- **Triggers:** grantMembership mutation, grantClassroomAccess mutation
- **Shares data with:** Leaderboard, Classroom access model, Settings

---

## Migration Timeline

1. **Day 1:** Schema + SDK wrapper + mutations + verifyPayment
2. **Day 2:** Frontend return URL handling + payment verification UI
3. **Day 3:** Test all payment flows
4. **Day 4:** Cleanup + production deploy

---

## Key Differences from Chargily

| Feature | Chargily | SofizPay |
|---------|----------|----------|
| Notifications | Webhook (SofizPay calls you) | Return URL (you check) |
| Signature verification | Webhook signature | Transaction search |
| Speed | Instant | After redirect |
| Implementation | Webhook handler | Memo-based polling |
| Keys needed | API Key + Secret Key | Public Key only |

---

## Open Questions (RESOLVED)

- [x] Does SofizPay support webhooks? → **No** - Use return URL + transaction check
- [x] Does makeCIBTransaction return order_number? → **Yes** - In response.data
- [x] How to verify payment? → Use `searchTransactionsByMemo(memo)` or `getTransactions()`
- [x] What is memo format? → `Community:{slug} - User:{email} - Type:{type}`