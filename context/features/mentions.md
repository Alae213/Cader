# Feature: @Mentions

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

@Mentions allow community members to reference other members in posts and comments by typing `@` followed by their name. Mentioned members receive in-app notifications and can click the mention to navigate to the mentioned user's profile. Mentions work within the same community only — no cross-community member exposure.

---

## Users

- **Member:** Can mention other members in posts and comments
- **Owner / Admin:** Can mention members and receive mentions
- **Visitor / non-member:** No access (cannot mention or be mentioned)

---

## User Stories

- As a **member**, I want to **@mention someone** so that they are notified about my post or comment.
- As a **member**, I want to **see mentions as clickable links** so that I can view the mentioned person's profile.
- As a **mentioned user**, I want to **receive a notification** so that I know someone referenced me.

---

## Behaviour

### Typing a Mention

1. User types `@` in post composer or comment composer
2. Autocomplete dropdown appears showing community members
3. Dropdown shows: avatar, name, and level badge
4. User types to filter: `@Ahm` → shows members starting with "Ahm"
5. Click a suggestion or press Enter to select
6. Mention inserted as a styled inline element: `@Ahma Med`

### Mention Display

- In composer: mention is a styled chip/tag with user's name
- In rendered post/comment: mention is a clickable link (`@username`)
- Hovering over mention shows a tooltip with user's profile card preview
- Clicking mention opens the Profile modal for that user

### Notification

1. When a post or comment with @mentions is submitted:
2. Each mentioned user receives an in-app notification:
   ```
   @John Doe mentioned you in a post
   [View Post]
   ```
3. Notification appears in the notification bell dropdown
4. Clicking notification navigates to the post (opens post modal)

### Autocomplete Behavior

- Only shows members of the current community
- Search is case-insensitive
- Search matches: display name (partial match)
- Minimum characters: type `@` shows all members (paginated/limited), type `@Jo` filters
- Maximum results shown: 10
- Keyboard navigation: Arrow Up/Down to navigate, Enter to select, Escape to close

---

### Edge Cases & Rules

- Mentioned user must be an active member of the current community
- Non-members cannot be mentioned
- Mentioning yourself: allowed but no notification sent
- Mention in a deleted post: notification remains (post link leads to 404)
- Duplicate mentions in same post: only one notification sent per user
- Mention in comment: same behavior as post mention
- Search is scoped to the current community (no cross-community member leakage)

---

## Connections

- **Depends on:** Community Feed (post/comment composers), Members list
- **Triggers:** Notifications (in-app notification to mentioned user)
- **Shares data with:** Profile modal (mention link opens profile), Community Feed (mention rendering)

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Mention scope | Same community only | Cross-community mentions (if user in both) |
| Mention types | @username only | @everyone, @role, @username |
| Notification | In-app only | + Email notification |
| Mention styling | Inline chip | Custom styling, hover card preview |
| Mention search | Display name only | Display name, username, email |
| Undo mention | Delete and retype | Backspace on chip removes mention |

---

## Security Considerations

- Member list for autocomplete: only returns members of the current community (communityId scoped)
- Mention notification: only sent to users who are active members of the community
- Mention parsing: sanitize input to prevent XSS via crafted mention content
- Rate limiting: max 20 mentions per post/comment (prevent spam)
- Mention autocomplete: server-side query, not client-side member list exposure

---

## Tasks

| Task # | Status | What needs to be done |
|---|---|---|
| T-001 | `[ ]` | Create Convex query: `searchMembers(communityId, searchTerm)` for autocomplete |
| T-002 | `[ ]` | Create Convex mutation: `createNotification(type, recipientId, senderId, postId, commentId)` |
| T-003 | `[ ]` | Build mention autocomplete component (dropdown with search) |
| T-004 | `[ ]` | Integrate mention autocomplete into post composer |
| T-005 | `[ ]` | Integrate mention autocomplete into comment composer |
| T-006 | `[ ]` | Build mention rendering component (inline chip in composer, link in rendered content) |
| T-007 | `[ ]` | Parse mentions on post/comment submit and trigger notifications |
| T-008 | `[ ]` | Build in-app notification component for mention events |
| T-009 | `[ ]` | Add mention link click handler → open Profile modal |
| T-010 | `[ ]` | Handle edge case: don't send notification if author mentions themselves |

---

## User Acceptance Tests

**UAT Status:** `pending`
**Last tested:** —
**Outcome:** —

---

## Open Questions

- [ ] Should @mention autocomplete show user's level badge alongside name?
- [ ] Can you @mention someone in a reply to their comment (threaded mention)?
- [ ] Is there a visual indicator when you've been mentioned (besides notification)?
- [ ] Can an admin disable @mentions for their community (anti-spam)?
