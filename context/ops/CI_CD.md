# CI/CD Pipeline

> Stub — populate when pipeline is set up.

---

## Pipeline Overview

Current state: Vercel auto-deploy only (no GitHub Actions in v1).

| Trigger | Action |
|---|---|
| Push to `main` | Vercel production deploy |
| Push to any other branch | Vercel preview deploy |

---

## Deploy Process

1. Merge `dev` → `main` (after manual review and local build check)
2. Vercel detects push to `main` and starts deployment
3. Vercel runs `npm run build` — if it fails, deployment is aborted
4. On success: live at production URL
5. Convex functions: deploy separately with `npx convex deploy` before or after Vercel deploy

---

## Secrets in CI

Production environment variables are stored in the Vercel dashboard (Settings → Environment Variables).
Never committed to the repository.
See `context/technical/ENVIRONMENT.md` for the full variable list.

---

## Future: GitHub Actions

When the project grows, consider adding:
- `npm run build` check on every PR
- `npm run lint` + `npm run type-check` on PR
- Automated Convex deploy on merge to main
