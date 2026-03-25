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
- Chargily Secret Keys (platform or creator)
- Clerk secret key or webhook secret
- Convex deploy key
- Database connection strings
- JWT secrets
- Private keys or certificates

**Creator Chargily keys:** Stored encrypted at rest in Convex `communities` table.
Retrieved server-side only inside Convex `action` functions. Never returned to the client.
Never logged.

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

## Payments (Chargily Pay)

- Chargily Secret Key is **never returned to the client**. Read only inside Convex `action` functions.
- Membership and classroom access are granted **only** via webhook handler, after signature verification.
- Frontend never grants access optimistically (EC-3).
- Webhook handler returns `401` on invalid signature — does not process the event.
- Checkout metadata (`userId`, `communityId`, `type`) is validated on webhook receipt.
- Do not log raw Chargily webhook payloads in production — they may contain payment details.

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
- Chargily API keys (creator's)
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

- **No optimistic payment access** — access is always webhook-gated (EC-3)
- **Community-scoped permissions** — every permission check uses `(userId, communityId)` — no global role shortcuts
- **Creator Chargily keys** — encrypted at rest, never logged, never returned to client
- **Slug uniqueness** — validated on the server at both input-time and submit-time (EC-5)
- **Minimum 1 admin** — enforced server-side before any admin removal (EC-8)
- **Deletion guard** — community deletion blocked server-side if active paying members exist (EC-7)
