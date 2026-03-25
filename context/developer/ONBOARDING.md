# Onboarding Guide

> Populate once dev environment is stable.
> Solo project — this file is a personal reference.

---

## Prerequisites

- Node.js 20+
- npm 10+
- Git
- A Convex account → [convex.dev](https://convex.dev)
- A Clerk account → [clerk.com](https://clerk.com)
- A Chargily Pay account (for testing payments) → [chargily.com](https://chargily.com)

---

## Setup Steps

1. Clone the repo:
   ```bash
   git clone https://github.com/[your-org]/cader.git
   cd cader
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy env template and fill in values:
   ```bash
   cp .env.example .env.local
   ```
   See `context/technical/ENVIRONMENT.md` for what each variable means.

4. Run Convex dev server (Terminal 1):
   ```bash
   npx convex dev
   ```

5. Run Next.js dev server (Terminal 2):
   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`

---

## Project Structure

```
/app              ← Next.js App Router routes
/components       ← React components (grouped by feature/type)
/convex           ← All backend logic (queries, mutations, actions, schema)
/hooks            ← Custom React hooks
/lib              ← Utilities, constants, validation schemas
/context          ← Project documentation (not source code)
```

See `context/developer/CONVENTIONS.md` for full folder structure.

---

## First Tasks

Good starting points for getting oriented:

1. Read `context/project/OVERVIEW.md` — understand what we're building
2. Read `context/project/DECISIONS.md` — understand why the stack is what it is
3. Check `context/project/TASK-LIST.md` — see what's next
4. Run the app locally and confirm it loads
