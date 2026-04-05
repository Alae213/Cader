# Security

> Claude reads this file before writing any code that touches auth, user data,
> payments, file uploads, external APIs, or environment variables.
> Security violations are always Must Fix — they block commits regardless of anything else.

---

## Secrets and Credentials

Never hardcode any secret, key, token, or password in source code — ever.
This includes placeholder values, test values, and "temporary" values.

- All secrets live in environment variables (see `context/technical/ENVIRONMENT.md`)
- `.env.local` is always in `.gitignore` — verify before every commit
- If a secret is accidentally committed, treat it as compromised immediately and rotate it

Forbidden in code:
- SofizPay Secret Keys (platform or creator)
- Clerk secret key or webhook secret
- Convex deploy key
- Database connection strings
- JWT secrets
- Private keys or certificates

**Creator SofizPay keys:** Only the public key is stored (Stellar format G...). No secret key needed for CIB hosted flow. Retrieved server-side only inside Convex `action` functions. Never returned to the client. Never logged.

---

## Authentication and Authorisation

Every Convex query, mutation, and action that operates on community data must:

1. Verify the user is authenticated (`ctx.auth.getUserIdentity()`)
2. Check the user's membership and role in the relevant community via the `memberships` table

**The authoritative access check is always:**
```ts
memberships.filter(m => m.userId === userId && m.communityId === communityId && m.status === "active")
```

Rules:
- Auth checks happen server-side (in Convex functions) — never trust the client to enforce access
- Admin-only operations (delete post, pin post, add/remove admin) must verify `role === "admin"`
- Community deletion requires `role === "admin"` AND zero active paying members (EC-7)
- Last admin removal is blocked server-side (EC-8) — always check admin count before removing

---

## Payments (SofizPay)

- SofizPay **does not support webhooks** - payment verification via transaction search (memo-based)
- Public key stored in plaintext (no secret needed for CIB hosted flow)
- Membership and classroom access granted **only** after return URL verification
- Payment verified by searching transactions with matching memo + amount
- Frontend never grants access optimistically (EC-SF-3).
- Payment amount is verified against expected amount from database (prevent price manipulation)
- Do not log raw transaction data in production — may contain payment details

---

## User Input

All user input is untrusted. Validate and sanitise before using in a query, rendering to
the page, or passing to an external service.

- Validate on the server (Convex mutations) — client validation is UX only
- Sanitise rich text content (post body, lesson content, community description) server-side before storage
- Video embed URLs: validate against an allowlist of accepted origins (youtube.com, youtu.be, vimeo.com, drive.google.com) before storing
- Slug input: validate format (lowercase alphanumeric + hyphens) and uniqueness server-side
- File uploads (avatar, lesson attachment): validate MIME type by content (not extension), enforce size limits server-side

---

## Sensitive Data

What counts as sensitive in Cader:
- Phone numbers collected during onboarding
- Email addresses (from Clerk)
- SofizPay API keys (creator's - public key only, no secret)
- Payment amounts and payment status

Rules:
- Phone numbers and emails are never included in public-facing queries
- Payment amounts are returned only to the community admin, not to members
- Sensitive data is never logged (not in Convex function logs, not in Vercel logs)
- Sensitive data is never included in URLs or query parameters

---

## Rate Limiting and Abuse Prevention

Protect operations that can be abused:
- Community creation: max 5 per user per hour
- Post creation: max 20 posts per member per hour
- Comment creation: max 60 comments per member per hour
- Onboarding modal: max 3 checkout session creations per user per hour per community
- Webhook endpoints: accept only POST, verify signature on every request

---

## Project-Specific Rules

- **No optimistic payment access** — access is always webhook-gated (EC-SF-3)
- **Community-scoped permissions** — every permission check uses `(userId, communityId)` — no global role shortcuts
- **Creator SofizPay keys** — public key stored (no secret for CIB flow), never logged, never returned to client
- **Slug uniqueness** — validated on the server at both input-time and submit-time (EC-5)
- **Minimum 1 admin** — enforced server-side before any admin removal (EC-8)
- **Deletion guard** — community deletion blocked server-side if active paying members exist (EC-7)
- **Minimum payment amount** — block payments below 1000 DZD (EC-SF-2)
