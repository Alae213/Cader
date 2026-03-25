# Testing Strategy

> Stub — populate during build.

---

## Philosophy

Test what breaks user trust. Focus on:
1. Payment flows — webhook handling, membership grant/revoke
2. Access control — tabs hidden for non-members, admin-only actions blocked
3. Edge cases from the IA spec (EC-1 through EC-13)

Do not test Convex internals — test the behaviour from the component's perspective.

---

## Unit Tests

<!-- Framework: Vitest -->
<!-- What gets unit tested: -->
- `slugify()` utility function
- `formatDZD()` utility function
- Level derivation logic (given a set of pointEvents, returns correct level)
- URL validation (YouTube/Vimeo/GDrive URL allowlist)
- Webhook signature verification helper

---

## Integration Tests

<!-- Key flows to integration test: -->
- Community creation: name → slug generation → uniqueness check → creation
- Chargily webhook: valid signature → membership granted → member can access tabs
- Chargily webhook: invalid signature → rejected → no membership granted
- Onboarding free flow: name + phone → immediate membership grant
- Tab restoration: localStorage hint → server-side access check → correct tab shown

---

## E2E Tests

<!-- Framework: Playwright (future) -->
<!-- Critical paths: -->
- Flow 1: Creator creates a paid community end-to-end
- Flow 3: Student joins a paid community (Chargily checkout)
- Flow 4: Student joins a free community
- Flow 5: Member accesses a classroom
- EC-1: Join intent preserved through auth

---

## Coverage Goals

- Unit tests: 90%+ for utility functions and pure logic
- Integration tests: all webhook handlers and critical Convex mutations
- E2E: the 5 flows listed above before launch
