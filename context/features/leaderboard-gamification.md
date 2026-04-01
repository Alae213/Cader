# Feature: Leaderboard & Gamification

> **Status:** `draft`
> **Phase:** v1
> **Last updated:** March 2026

---

## Summary

The gamification system rewards members for visible participation and learning inside a community.

The system has two separate outcomes:

- **Progression:** members earn all-time points that determine Level 1–5.
- **Competition:** members are ranked on the Leaderboard by points earned in the selected time window, Last 7 Days, Last 30 Days, or All Time.

Points are stored as an append-only event log in pointEvents. Total points and level are always derived on read and are never stored as mutable counters on membership records.

This feature exists primarily to strengthen community identity, make contribution visible, and create lightweight status progression that can also gate classroom access.

---

## Product Goals

- Strengthen community identity by making contribution visible.
- Reward members for participating in both discussion and learning.
- Give owners a simple way to gate classrooms by member level.
- Make progress easy to understand at a glance.
- Keep scoring fair, community-scoped, and server-authoritative.

---

## Non-Goals for v1

- Custom level names.
- Badges beyond numeric level badges.
- Streak leaderboards.
- Point history UI.
- Owner-defined custom rewards.
- Complex anti-abuse scoring models.

---

## Users

### Member
Can view the Leaderboard tab, see their own level, and earn points.

### Owner / Admin
Can view the Leaderboard tab, configure classroom level requirements, and earn points like any other member. Owner/admin accounts appear on the leaderboard and are eligible for all rewards.

### Visitor / Non-member
No access to the Leaderboard tab.

---

## Core Game Loop

1. A member participates in the community by opening the app, posting, commenting, receiving upvotes, and completing lessons.
2. Each eligible action creates one or more server-side pointEvents.
3. The system derives the member's all-time point total and current level from those events.
4. The member sees their level badge across the product and their relative rank in the Leaderboard.
5. Higher levels unlock classrooms when the member meets the required threshold.
6. If points later drop below a required threshold, the member can lose that level and lose access again.

---

## Progression Model

Level is based on all-time community-scoped points only.

| Level | Name | All-time points required |
|-------|------|--------------------------|
| 1 | — | 0 |
| 2 | — | 20 |
| 3 | — | 60 |
| 4 | — | 140 |
| 5 | — | 280 |

### Progression Rules

- All members start at Level 1.
- Level is derived from total all-time points in that community only.
- Levels are reversible; if point total drops below a threshold, the user drops to the lower level immediately on next derivation.
- A member's level in one community has no effect on any other community.
- The threshold curve is intentionally fast, designed so an active member can realistically reach Level 5 in roughly 4–6 weeks.

---

## Point Sources

All points are community-scoped and awarded server-side only.

| Source | Points | Award rule | Reversible |
|--------|--------|------------|------------|
| Daily open streak | +1 on days 1–3, +2 on days 4–6, +3 on day 7+ | First app open of the day only | No |
| Create a post | +2 | Once per post, only if post remains visible for at least 10 minutes | Yes |
| Create a comment | +1 | Once per comment, only if comment has at least 20 non-whitespace characters and remains visible for at least 2 minutes | Yes |
| Your post receives an upvote from another member | +1 | Once per active upvote | Yes |
| Your comment receives an upvote from another member | +1 | Once per active upvote | Yes |
| Lesson completed | +10 | Once per user per lesson ever, triggered by manual completion checkbox | No |

### Scoring Rules

- Self-upvotes are allowed in the UI but award 0 points.
- Upvotes from owner/admin accounts function as social interactions and award points normally.
- Post and comment creation points are intended to reward participation, while upvote points are intended to reward community validation.
- Lesson completion is intentionally high-value because learning should matter, not only posting.

## Streak Logic

A streak is based on app open, exactly one qualifying open per calendar day.

### Streak Rules

- A day counts when the member opens the app at least once while logged in and still an active member of the community.
- Only the first qualifying open of the day can award streak points.
- Missing one calendar day resets the streak to day 1.
- Day boundaries use the member's saved local timezone when available; otherwise use UTC.

### Streak Points

Streak points are awarded as:

- **Days 1–3:** +1 each day.
- **Days 4–6:** +2 each day.
- **Day 7 and onward:** +3 each day.

## Leaderboard

The Leaderboard tab ranks members by points earned in the selected time window.

### Time Filters

- Last 7 Days.
- Last 30 Days.
- All Time.

### Ranking Rules

- Ranking score is the sum of eligible pointEvents inside the selected window.
- "All Time" sums all events for that user in that community.
- Members with the same score share the same rank.
- Tiebreaker for visual order: member with the most recent point earned appears higher.
- If still tied after that, sort alphabetically by display name for stable rendering.

### Display Rules

- Show Top 10 by default.
- Provide an explicit "Show more" action to expand to Top 20.
- Always show the current viewer's own row, pinned below the list if they are not already in the visible Top N.
- All active members (including owners/admins) appear in the ranking.
### UX Copy Requirement

The Leaderboard must clearly explain:

> "Level is based on all-time points."
> "Leaderboard rank changes based on the selected time filter."

This copy is required to prevent users from confusing short-term rank with long-term level.

### Leaderboard Layout

#### Header

* **Title:** "Leaderboard"
* **Filter tabs:** Last 7 Days, Last 30 Days, All Time

#### Progress Panel

Show the current viewer's all-time progression, not the selected leaderboard window.

**Required fields:**

* Current level
* Current all-time points
* Next level target
* Points needed to reach next level
* Progress bar across 5 levels

##### Recommended Layout Behavior

* Use a horizontal stepped progress bar, not an arc.
* Highlight current level.
* Show "Level X" badge and a short label like "42 points to Level 4."
* If already Level 5, show "Max level reached."

#### Ranked List

Each row includes:

* Rank number
* Avatar
* Display name
* Level badge
* Point total for the selected filter

### Level Badges

A numeric level badge is shown in the following surfaces:

* Community feed posts
* Community feed comments
* Member profile card or modal
* Members tab rows
* Leaderboard rows

#### Badge Rules

* Badge always reflects current derived all-time level.
* Badge updates live when level changes.
* Badge appearance is consistent across all surfaces.
* **Badge format:** `[Level X]` (e.g., `[Level 1]`, `[Level 3]`, `[Level 5]`)
* Badge shown on:
  * Post author (in post card)
  * Comment author (in comment)
  * Member profile card/modal
  * Members tab rows
  * Leaderboard rows

### Classroom Access Gating

Owners/admins can set a required minimum level for each classroom.

#### Default Behavior

* Default classroom requirement is Level 1.
* Owner/admin can set required level per classroom to Level 1, 2, 3, 4, or 5.

#### Access Rules

* A member can open a classroom only if their current derived level is greater than or equal to the classroom's required level.
* Access is not permanent; it is continuously derived from the member's current level.
* If a member's point total falls and their level drops below the requirement, access is revoked.
* Revocation must apply on the next protected classroom read and should update live when feasible.

#### Locked-State UX

When a classroom is locked:

* Show required level
* Show current member level
* Show points needed to unlock
* Do not reveal lesson content behind the lock

### Data Model

`pointEvents` is the source of truth for all scoring.

#### Required Fields

* `id`
* `communityId`
* `userId`
* `eventType`
* `points`
* `sourceType`
* `sourceId`
* `actorUserId` for interaction-driven events where relevant
* `createdAt`

#### Suggested Event Types

* `streak_day_awarded`
* `post_created_awarded`
* `post_created_reversed`
* `comment_created_awarded`
* `comment_created_reversed`
* `post_upvote_received`
* `post_upvote_reversed`
* `comment_upvote_received`
* `comment_upvote_reversed`
* `lesson_completed_awarded`

#### Derivation Rules

* All-time points = sum of all points for that user and community.
* Window score = sum of all points in the selected date range for that user and community.
* Displayed total is clamped to minimum 0.
* Stored event history remains append-only; no event is edited or deleted for score correction.

### Important Scoring Constraint

Do not allow hidden negative debt in UX.

If internal calculation goes below 0 due to reversal ordering or data repair, clamp derived score to 0 before computing level and before rendering progress.

Users should never need to "work off" invisible negative points.

### Reversal Rules

Reversals must also be append-only events.

#### Upvotes

* When a valid upvote is added, create the corresponding +1 event if the voter is not the author.
* When that upvote is removed, append the corresponding -1 reversal event.
* Duplicate active upvotes for the same voter and target are not allowed.

#### Post/Comment Creation

* Creation points are awarded only after the content survives the minimum visibility delay.
* If the content is deleted or moderation-hidden after the award, append a reversal event for the creation reward.
* Existing upvote points remain unless an admin moderation action explicitly performs reversal logic for abuse cleanup.

#### Lesson Completion

* Lesson completion is awarded once per user per lesson ever.
* Unchecking and rechecking the lesson must not generate additional completion rewards.

### Fairness and Anti-Exploit Rules

* All score writes are server-side only.
* Client assertions never directly set or submit point totals.
* A user cannot score from self-upvotes.
* A lesson completion reward can happen only once per (userId, lessonId).
* A streak reward can happen only once per (userId, communityId, dayKey).
* A post creation reward can happen only once per (userId, postId).
* A comment creation reward can happen only once per (userId, commentId).
* An upvote reward can happen only once per active (voterId, targetId) pair.
* Leaderboard queries must be scoped by communityId.
* Only active members are eligible to appear on the leaderboard.
* Soft-deleted or banned members must be excluded from public leaderboard results.

### Real-Time Behavior

* Leaderboard data is served as a live query.
* New eligible point events should update leaderboard totals in real time.
* A member's level badge should update live across feed, members list, profile, and leaderboard.
* Classroom lock state should refresh live when the member's level changes, where practical.

### Edge Cases

* If a user has 0 points, they are still Level 1.
* If a user is not in the Top 10 or Top 20, their own row still appears pinned below the visible list.
* If a community has fewer than 10 eligible ranked members, show only available members.
* If two users share a score and one earns a new point later, the more recent scorer appears above the other shared-rank user.
* If a user loses enough points to fall below 0 mathematically, display 0 and assign Level 1.
* If a lesson is later deleted, previously awarded lesson completion points remain unless a manual migration or moderation tool explicitly reverses them.

### MVP vs Later

| Aspect | v1 | Later |
|--------|----|-------|
| Point sources | Streak, post creation, comment creation, post upvotes, comment upvotes, lesson completion | Additional social and learning events |
| Levels | Fixed 1–5 numeric levels | Custom level names and custom threshold presets |
| Rewards | Classroom gating | Badges, perks, custom rewards |
| Visibility | Level badge + leaderboard | Personal history, achievement views |
| Notifications | No level-up notification | Level-up celebration and inbox notifications |
| Abuse controls | Rule-based server validation | Advanced spam and anomaly detection |

### Implementation Notes

* Use all-time points for level everywhere in the product.
* Use selected time-window points only for leaderboard ranking.
* Do not store currentLevel as a mutable source-of-truth field.
* It is acceptable to cache derived values for performance, but cache must be invalidated from pointEvents.
* The product should treat gamification as identity and contribution infrastructure, not only as engagement decoration.
