# Feature: @Mentions

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

@Mentions allow community members to reference other members in posts and comments by typing `@` followed by their name. Mentioned members receive in-app notifications and can click the mention to navigate to the mentioned user's profile. Mentions work within the same community only — no cross-community member exposure.

**Integration:** Works in BOTH post composer AND comment composer.

---

## Users

- **Member:** Can mention other members in posts and comments
- **Owner / Admin:** Can mention members and receive mentions
- **Visitor / non-member:** No access (cannot mention or be mentioned)

---

## User Stories

- As a **member**, I want to **@mention someone** in a post so that they are notified about my post.
- As a **member**, I want to **@mention someone** in a comment so that they are notified about my comment.
- As a **member**, I want to **see mentions as clickable links** so that I can view the mentioned person's profile.
- As a **mentioned user**, I want to **receive a notification** so that I know someone referenced me.

---

## UI/UX Specification

### Autocomplete Dropdown

When user types `@`:
1. Dropdown appears below cursor
2. Shows community members: avatar, name, level badge `[Level X]`
3. User types to filter: `@Ahm` → shows members starting with "Ahm"
4. Keyboard navigation: Arrow Up/Down, Enter to select, Escape to close
5. Click a suggestion or press Enter
6. Mention inserted as styled element: `@DisplayName`

### Display in Composer (While Editing)
- Mention shown as inline chip/tag with user's name
- Can backspace to remove

### Display in Rendered Content
- Mention shown as clickable link: `@username`
- Click opens Profile modal for that user
- Hover shows tooltip with basic profile info

### Where @Mentions Work
- ✅ Post composer (text, image, video, gif, poll)
- ✅ Comment composer (inline below post)
- ✅ Reply composer (inline below comment)

### Notification
1. When a post or comment with @mentions is submitted:
2. Each mentioned user receives an in-app notification:
   ```
   @John Doe mentioned you in a post/comment
   [View Post]
   ```
3. Notification appears in real-time
4. Clicking notification navigates to the post

---

## Functionality Specification

### Autocomplete Behavior
- Only shows members of the current community
- Search is case-insensitive
- Search matches: display name (partial match)
- Minimum characters: type `@` shows all members, type `@Jo` filters
- Maximum results shown: 10
- Keyboard navigation: Arrow Up/Down + Enter + Escape

### Mentions Limit
- Max 20 mentions per post/comment (prevent spam)
- Validation enforced server-side

### Notification Timing
- Notifications sent in real-time on submit
- Optimistic UI: show immediately, sync with server

### Autocomplete Data
Each suggestion shows:
- Avatar (24px)
- Display name
- Level badge `[Level X]`
- @username (if available)

---

## Gamification Integration

Per `leaderboard-gamification.md`:
- No points awarded for mentions alone
- Points awarded for post/comment creation still apply

---

## Edge Cases & Rules

- Mentioned user must be an active member of the current community
- Non-members cannot be mentioned
- Mentioning yourself: allowed but no notification sent
- Duplicate mentions in same post: only one notification sent per user
- Search is scoped to the current community (no cross-community leakage)
- Post/comment deleted: associated mentions remain but link to 404

---

## Data Flow

1. User types `@` in composer
2. Client calls `searchMembers(communityId, searchTerm)` query
3. Dropdown shows results
4. User selects → mention stored as `{ userId, displayName }` in content
5. On submit:
   - Parse mentions from content
   - Save post/comment with mentions array
   - Send notifications to each mentioned user (except self)
6. Real-time: notification appears instantly

---

## Required Convex Functions

### Query: searchMembers
```typescript
searchMembers(args: {
  communityId: string;
  searchTerm: string;
}): Member[] // max 10 results
```

### Mutation: createNotification
```typescript
createNotification(args: {
  type: "mention";
  recipientId: string;
  senderId: string;
  postId?: string;
  commentId?: string;
}): void
```

---

## MVP vs Full Version

| Aspect | MVP (v1) | Full Version |
|---|---|---|
| Mention scope | Same community only | Cross-community mentions |
| Mention types | @username only | @everyone, @role, @username |
| Notification | In-app only | + Email notification |
| Autocomplete shows | Avatar, name, level badge | + username, more details |
| Max mentions | 20 per post/comment | Configurable |

---

## Security Considerations

- Member list for autocomplete: only returns members of the current community (communityId scoped)
- Mention notification: only sent to users who are active members of the community
- Mention parsing: sanitize input to prevent XSS via crafted mention content
- Rate limiting: max 20 mentions per post/comment
- Mention autocomplete: server-side query, not client-side member list

---

## Implementation Tasks

See TASK-LIST.md for implementation tasks.

---

## Acceptance Criteria

- [ ] Typing `@` in post composer shows member autocomplete
- [ ] Typing `@` in comment composer shows member autocomplete
- [ ] Autocomplete shows avatar + name + level badge
- [ ] Selecting mention inserts styled chip in composer
- [ ] Rendered post shows mention as clickable `@username`
- [ ] Rendered comment shows mention as clickable `@username`
- [ ] Clicking mention opens Profile modal
- [ ] Mentioned user receives notification in real-time
- [ ] Max 20 mentions enforced server-side
- [ ] No cross-community member exposure in autocomplete
