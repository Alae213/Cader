# API Contracts

> Stub — populate during build.
> Note: Cader has no REST API of its own. All client↔server communication goes through Convex
> queries and mutations. The only HTTP endpoints are webhook receivers.

---

## Conventions

### Authentication
All Convex queries and mutations require a valid Clerk JWT, passed automatically via the
Convex/Clerk integration. No manual auth headers needed on the client.

### Webhook Endpoints

Base path: `/api/webhooks/`

All webhook endpoints:
- Accept `POST` only
- Verify the request signature before processing
- Return `200 OK` for all valid events (including unhandled event types — prevents retries)
- Return `401 Unauthorized` for invalid signatures
- Never return raw error details in the response body

### Error Format (Convex)
Convex mutations throw `ConvexError` with a message string.
Client components catch this and display it as a toast.
Format: plain English message — no internal IDs, no stack traces.

---

## Webhook Endpoints

### POST `/api/webhooks/clerk`

**Purpose:** Sync new Clerk users to Convex `users` table.
**Trigger:** Clerk fires this on `user.created`.
**Signature:** Verified via `clerk-sdk-node` `Webhook.verify()` using `CLERK_WEBHOOK_SECRET`.

Events handled:
| Event | Action |
|---|---|
| `user.created` | Create `users` record in Convex with Clerk userId, email, name |
| `user.updated` | Update `users` record (email or name change) |
| `user.deleted` | Soft-anonymize user data in Convex |

Response: always `200 { received: true }` after signature verification.

---

### POST `/api/webhooks/chargily`

**Purpose:** Process payment events from Chargily Pay.
**Trigger:** Chargily fires this on payment events.
**Signature:** Verified via HMAC using `CHARGILY_WEBHOOK_SECRET`.

Events handled:
| Event | Action |
|---|---|
| `checkout.paid` | Grant community membership OR classroom access (based on `metadata.type`). Set `subscriptionPeriodStart/End` for monthly subscriptions. |
| `checkout.failed` | Log failure (no immediate action — member must rejoin manually) |
| `checkout.canceled` | Log cancellation (no immediate action) |

> **Note:** There is no `subscription.cancelled` webhook because Chargily has no native subscription API. Subscription expiry is handled via daily Convex cron job.

Metadata expected on checkout creation:
```json
{
  "userId": "<Convex user Id>",
  "communityId": "<Convex community Id>",
  "type": "community" | "classroom",
  "classroomId": "<Convex classroom Id> (if type=classroom)"
}
```

Response: always `200 { received: true }` after signature verification.
Response on invalid signature: `401 { error: "Invalid signature" }`.

---

## Convex Functions

> These are not HTTP endpoints — they are Convex-native functions called from the client
> via the Convex SDK. Listed here for contract reference.

### Queries (read, live-reactive)
| Function | Returns | Notes |
|---|---|---|
| `getCommunity(slug)` | Community object | For About tab |
| `getMembership(userId, communityId)` | Membership or null | Auth gate check |
| `listPosts(communityId, categoryId?)` | Paginated posts | Live feed |
| `listMembers(communityId)` | Members with Wilaya | Members tab |
| `getLeaderboard(communityId, window)` | Ranked members | 7d/30d/all |
| `getMemberLevel(userId, communityId)` | Level (1–5) | Derived from pointEvents |
| `listClassrooms(communityId, userId)` | Classrooms + access status | Classrooms tab |
| `getClassroomContent(classroomId)` | Module/page tree | Classroom viewer |
| `listDiscoverableCommunities(query?)` | Communities for Explore | |

### Mutations (write)
| Function | Purpose |
|---|---|
| `createCommunity(data)` | Community creation |
| `updateCommunity(communityId, data)` | Settings/edit |
| `deleteCommunity(communityId)` | With EC-7 active-member check |
| `grantMembership(userId, communityId, pricingType)` | Free join |
| `revokeMembership(userId, communityId)` | Subscription lapse / block |
| `createPost(communityId, data)` | Post creation |
| `toggleUpvote(postId, userId)` | Upvote + pointEvent |
| `createComment(postId, data)` | Comment creation |
| `deletePost(postId)` | Admin or author |
| `pinPost(postId)` | Admin only |
| `markPageViewed(pageId, userId)` | Lesson progress |
| `addAdmin(communityId, userId)` | Role elevation |
| `removeAdmin(communityId, userId)` | With EC-8 guard |
| `updateUserProfile(data)` | Name, avatar, bio, wilaya |

### Actions (external API calls — server-side only)
| Function | Purpose |
|---|---|
| `createChargilyCheckout(communityId, userId, type, classroomId?)` | Chargily checkout session |
| `validateChargilyKeys(publicKey, secretKey)` | Test keys during community creation |
