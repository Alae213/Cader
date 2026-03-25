# Feature: Settings

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The Settings modal is a member/owner overlay accessible from the top bar (Profile → Settings).
It contains sections for personal profile, notification preferences, community admin management,
platform billing, danger zone, and account actions. Settings are community-context-aware:
the Admins, Billing, and Danger Zone sections are only visible to the owner/admin of the
current community.

---

## Users

- **Any authenticated user:** Profile, Notifications, Account sections
- **Owner / Admin only:** Admins section, Billing section, Danger Zone section

---

## User Stories

- As a **member**, I want to **update my profile** so that others see accurate information about me.
- As an **owner**, I want to **add or remove admins** so that I can delegate moderation.
- As an **owner**, I want to **view my platform subscription** so that I know when it renews.
- As an **owner**, I want to **delete my community** so that I can close it if needed.
- As a **user**, I want to **sign out or delete my account** so that I can manage my platform presence.

---

## Behaviour

### Settings Sections

#### Profile
- Display name (text input)
- Avatar (file upload → Convex storage)
- Bio (short text, max 160 characters)
- Wilaya (dropdown, 58 options)
- Save button (or auto-save on blur)

#### Notifications
- Email notifications: on/off toggle
- In-app notifications: on/off toggle
- Specific event toggles (basic in v1):
  - New comment on my post
  - @mention in a post or comment
  - New member joins my community (owner only)

#### Admins (Owner / Admin only, community-scoped)
- List of current admins with their avatar, name, and "Remove" button
- Search/invite input: enter a member's name or email to add as admin
- On add: member's `memberships.role` updated to `admin` for this community
- Remove admin: sets role back to `member`
- **Safety rule (EC-8):** Last admin cannot remove themselves. "Remove" button is disabled for the last admin. Tooltip: "You are the only admin. Add another admin before removing yourself."

#### Billing (Owner / Admin only, community-scoped)
- Current platform subscription status: Free tier / Subscribed / Locked
- Members used: `X / 50` (free tier) or `Unlimited` (subscribed)
- Next billing date (if subscribed)
- "Subscribe" CTA (if on free/locked tier) → triggers platform Chargily checkout
- "Cancel subscription" link (if subscribed)
- On cancel: subscription status set to cancel-at-period-end; community moves to locked tier after period ends

#### Danger Zone (Owner only, community-scoped)
- "Delete this community" button (red, requires confirmation)
- Confirmation dialog: "Type the community name to confirm deletion"
- **Block condition (EC-7):** If active paying members exist:
  - Button shows, but on click: error toast shown: "You have [N] active paying members. Remove or refund them before deleting."
  - No confirmation dialog shown.
- If no active paying members: confirmation dialog → community soft-deleted → redirect to `/`

#### Account
- Sign out button
- "Delete my account" link
  - Confirmation: "Are you sure? This cannot be undone."
  - Account deletion: anonymizes user data, removes from all communities, cancels any active subscriptions

---

## Edge Cases & Rules

- EC-7: Delete blocked by active paying members
- EC-8: Last admin cannot self-remove
- Admins can add or remove other admins — symmetric permissions
- An admin cannot remove themselves if they are the only admin
- Community deletion is soft-delete in v1 (data retained for 30 days, then purged) — or hard delete? (open question)
- Account deletion: user is removed from all `memberships` records; their posts are anonymized ("Deleted user") not deleted
- Settings modal opens in the context of the current community for Admins/Billing/Danger Zone. Visiting a different community switches the community context.

---

## Connections

- **Depends on:** Clerk auth (all settings require auth), Active community context (Admins/Billing/Danger Zone are community-scoped)
- **Triggers:** Platform Chargily checkout (Billing → Subscribe), `revokeMembership` (Billing → Cancel), community deletion mutation
- **Shares data with:** Top bar (display name + avatar), Members tab (Wilaya update), About tab (community thumbnail/name changes reflected immediately)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Notification granularity | Basic toggles | Per-community, per-event granularity |
| Admin permissions | Symmetric (all admins equal) | Role-based admin levels |
| Billing history | Not in v1 | Invoice history download |
| Data export | Not in v1 | GDPR data export |
| Community transfer | Not in v1 | Transfer ownership to another member |
| Two-factor auth | Clerk handles | Custom 2FA settings |

---

## Security Considerations

- Admins/Billing/Danger Zone sections must check admin role server-side before rendering and before accepting mutations. Client-side hiding is UX only.
- Community deletion mutation: double-check for active paying members server-side regardless of client-side block.
- Account deletion: Clerk account deletion + Convex user data anonymization must be atomic (or handled gracefully if one fails).
- Admin addition: validate that the target user is already a member of this community before elevating role.
- Settings mutations use Clerk JWT for auth — no unauthenticated mutations accepted.

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T— | `[ ]` | Build Settings modal shell (tabbed/sectioned layout) |
| T— | `[ ]` | Build Profile section (name, avatar upload, bio, Wilaya) |
| T— | `[ ]` | Build Notifications section (email/in-app toggles) |
| T— | `[ ]` | Build Admins section (list, add, remove, EC-8 last-admin guard) |
| T— | `[ ]` | Build Billing section (subscription status, subscribe CTA, cancel) |
| T— | `[ ]` | Build Danger Zone (delete community, EC-7 active-members block) |
| T— | `[ ]` | Build Account section (sign out, delete account) |
| T— | `[ ]` | Convex mutation: `updateUserProfile` (name, avatar, bio, wilaya) |
| T— | `[ ]` | Convex mutation: `addAdmin` / `removeAdmin` (with EC-8 guard) |
| T— | `[ ]` | Convex mutation: `deleteCommunity` (with EC-7 active-member check) |
| T— | `[ ]` | Convex mutation: `deleteAccount` (anonymize posts, remove memberships) |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] Is community deletion a soft-delete (with a recovery window) or hard-delete?
- [ ] When an account is deleted, are the user's posts removed or anonymized?
- [ ] Can an owner transfer community ownership to another member?
- [ ] Should the Settings modal remember the last active section (e.g. always open on Profile)?
