# Feature: Platform Landing Page

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The `/` route is the public landing page of the Cader platform. It introduces the platform
to potential creators and learners, communicates the core value proposition (DZD payments,
Algerian community), and drives two actions: creating a community (for creators) and exploring
existing communities (for learners). Authentication is triggered on CTA click — not on page load.

---

## Users

- **Unauthenticated visitor:** Views landing, clicks CTA → Clerk auth → community creation modal
- **Authenticated user with communities:** Sees landing but CTA goes directly to community creation modal (skips Clerk auth)
- **Authenticated user with no communities (EC-10):** Same as above — no automatic redirect

---

## User Stories

- As a **potential creator**, I want to **understand what Cader is in seconds** so that I can decide whether to sign up.
- As a **visitor**, I want to **click one button and start creating** so that onboarding is frictionless.

---

## Behaviour

### Page Sections

1. **Hero:**
   - Logo / wordmark
   - Headline (e.g. "Meet Education Business Again")
   - Primary CTA button: "Create my community"

3. **How it works** (3 steps): Create → Charge in DZD → Grow your community

4. **Chargily Pay highlight:** Explain that payments go directly into the creator's Algerian bank account

5. **Footer:** Links (Help, etc.)

### CTA Behaviour

- **Unauthenticated:** CTA click → Clerk auth modal opens → after sign-in/sign-up → community creation modal opens
- **Authenticated, no communities:** CTA click → community creation modal opens directly (skips Clerk)
- **Authenticated, has communities:** TBD — CTA could redirect to most recent community or open creation modal (open question)

### Help Page Link

- Footer or nav link → `/help` (static page)

---

## Edge Cases & Rules

- EC-10: Authenticated user with 0 communities visiting `/` — no automatic redirect. The CTA is still the primary action. The platform landing is always the home regardless of auth state.
- The Clerk auth modal is never shown on page load — only triggered by user action (CTA click).

---

## Connections

- **Triggers:** Clerk auth modal (if unauthenticated), Community creation modal (post-auth or if already authed)
- **Depends on:** Nothing (public route, no auth required to render)

---

## MVP vs Full Version

| Aspect      | MVP (v1)                    | Full Version                                         |
| ----------- | --------------------------- | ---------------------------------------------------- |
| Content     | Hero + CTA                  | Full marketing page with sections, testimonials, FAQ |
| Animations  | Rich motion (Framer Motion) | -                                                    |
| SEO         | Basic meta tags             | Full OG tags, structured data, sitemap               |
| A/B testing | Not in v1                   | CTA copy/design experiments                          |

---

## Security Considerations

- No sensitive data on this page — fully public
- No auth state exposed in SSR render to prevent hydration leaks

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Build `/` route layout (hero, CTA, basic sections) |
| T— | `[ ]` | Implement auth-aware CTA (Clerk modal if unauthenticated, creation modal if authed) |
| T— | `[ ]` | Build `/help` static page |
| T— | `[ ]` | Add basic SEO meta tags (title, description, OG) |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] What happens when an authenticated user who already has communities visits `/` and clicks the CTA — does it open the creation modal, or redirect to their most recent community?
- [ ] Is there a "Sign in" link/button on the landing page separate from the main CTA?
