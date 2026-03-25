# Infrastructure

> Stub — populate when deployment is set up.

---

## Environments

| Environment | URL | Purpose |
|---|---|---|
| Local | `http://localhost:3000` | Development |
| Preview | Vercel preview URL (auto-generated per branch) | Testing before merging to main |
| Production | `https://cader.app` (TBD) | Live |

---

## Hosting

**Vercel** — zero-config Next.js deployment on free tier.
- Auto-deploys on push to `main`
- Preview deployments on all other branches
- Edge middleware handles Clerk auth globally

---

## Database Hosting

**Convex** — hosted backend, database, and file storage.
- Free tier covers solo MVP traffic
- Real-time WebSocket connections managed by Convex

---

## Storage

**Convex file storage** — for avatars and lesson file attachments.
**No native video storage** — video content is YouTube/Vimeo/GDrive embed URLs only (see ADR-007).

---

## DNS & Domains

<!-- Populate when domain is configured -->

---

## Environment Variables

All environment variables documented in `context/technical/ENVIRONMENT.md`.
Production values managed via Vercel dashboard — never in source code.
