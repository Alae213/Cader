# Environment Variables

> Never commit real values. This file documents every variable needed and why.
> Real values live in `.env.local` (local) and the Vercel dashboard (production).
> `.env.local` is in `.gitignore` — verify before every commit.

---

## Required — Next.js / Vercel

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Full public URL of the app (e.g. `https://cader.app`) | Set manually in Vercel dashboard |
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | Convex dashboard → Settings → URL & Deploy Key |

---

## Required — Clerk

| Variable | Description | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (safe to expose client-side) | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk secret key — **never expose client-side** | Clerk dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Signing secret for Clerk webhook (`user.created`) | Clerk dashboard → Webhooks → endpoint secret |

Clerk auth redirect URLs (set in Clerk dashboard, not env vars):
- Sign-in redirect: `/` (platform landing)
- Sign-up redirect: `/` (then community creation modal opens if triggered from CTA)

---

## Required — Convex

| Variable | Description | Where to get it |
|---|---|---|
| `CONVEX_DEPLOY_KEY` | Convex deploy key for CI/CD | Convex dashboard → Settings → URL & Deploy Key |

> Note: `NEXT_PUBLIC_CONVEX_URL` (above) is the only Convex variable needed at runtime on the
> client. `CONVEX_DEPLOY_KEY` is only used in CI/CD pipelines and is never exposed in the app.

---

## Required — Platform Billing (SofizPay — Platform's own account)

These are for the **platform's** SofizPay account — used to charge creators the 2,000 DZD/month subscription.

| Variable | Description | Where to get it |
|---|---|---|
| `SOFIZPAY_PLATFORM_PUBLIC_KEY` | Platform's SofizPay public key (Stellar format G...) | SofizPay dashboard → API Keys |

**Note:** SofizPay doesn't support webhooks - payment verification uses return URL + transaction search pattern. No webhook secret needed!

---

## Per-Community SofizPay Keys (stored in Convex, not env vars)

> Creator SofizPay keys are **not** environment variables.
> They are stored in the Convex `communities` table after the creator enters them
> during community creation. Only the public key is stored (no secret needed for CIB flow).
> Never logged. Never returned to the client.

---

## Optional

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Custom sign-in page URL | Clerk hosted page |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Custom sign-up page URL | Clerk hosted page |

---

## Local Development Setup

### 1. Clone and install
```bash
git clone https://github.com/[your-org]/cader.git
cd cader
npm install
```

### 2. Create your local env file
```bash
cp .env.example .env.local
```
Fill in all required values from the sections above.

### 3. Run Convex dev server (in a separate terminal)
```bash
npx convex dev
```
This generates your local `NEXT_PUBLIC_CONVEX_URL` and hot-reloads Convex functions.

### 4. Run Next.js dev server
```bash
npm run dev
```
App runs at `http://localhost:3000`.

### 5. Payment testing (Clerk only)
Use [ngrok](https://ngrok.com/) or [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/) to expose localhost to the internet.
Register the tunnel URL as the webhook endpoint in:
- Clerk dashboard → Webhooks → `https://[tunnel]/api/webhooks/clerk`

**Note:** SofizPay doesn't support webhooks - payments are verified via return URL + transaction search. No webhook setup needed for SofizPay!

---

## `.env.example` Template

```env
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Convex
NEXT_PUBLIC_CONVEX_URL=https://[your-deployment].convex.cloud
CONVEX_DEPLOY_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# SofizPay (Platform account — for creator subscriptions via manual monthly rebilling)
# Note: No webhooks - use return URL + transaction search pattern
SOFIZPAY_PLATFORM_PUBLIC_KEY=

# Config
MIN_PAYMENT_AMOUNT=1000
```
