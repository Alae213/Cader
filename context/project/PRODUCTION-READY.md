# Production Readiness Checklist

> Last updated: March 26, 2026
> This document lists all manual steps required to deploy Cader to production.

---

## 1. Environment Variables

You need to configure these environment variables in your deployment platform (Vercel, etc.):

### Required Environment Variables

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `NEXT_PUBLIC_CONVEX_URL` | Convex deployment URL | Convex dashboard → your project → URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Clerk Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk secret key | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk webhook signing secret | Clerk Dashboard → Webhooks |
| `CONVEX_DEPLOY_KEY` | Convex deploy key | Convex dashboard → Deploy |
| `CHARGILY_API_KEY` | Chargily API key | Chargily Developer Dashboard |
| `CHARGILY_WEBHOOK_SECRET` | Chargily webhook secret | Chargily Developer Dashboard |
| `CHARGILY_APP_ID` | Chargily App ID | Chargily Developer Dashboard |
| `NEXT_PUBLIC_CHARGILY_APP_ID` | Chargily App ID (public) | Chargily Developer Dashboard |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_APP_URL` | Your production URL | `http://localhost:3000` |

---

## 2. Clerk Setup

### 2.1 Create Clerk Application
1. Go to [Clerk.com](https://clerk.com) and sign up
2. Create a new application
3. Configure redirect URLs:
   - `http://localhost:3000/sign-in` (dev)
   - `http://localhost:3000/sign-up` (dev)
   - `https://your-project.vercel.app/sign-in` (prod)
   - `https://your-project.vercel.app/sign-up` (prod)

### 2.2 Configure Webhooks
1. In Clerk Dashboard → Webhooks → Add Endpoint
2. Endpoint URL: `https://your-domain.com/api/webhooks/clerk`
3. Select events: `user.created`, `user.updated`
4. Copy webhook signing secret to `CLERK_WEBHOOK_SECRET`

---

## 3. Convex Setup

### 3.1 Deploy Convex
```bash
npx convex deploy
```

### 3.2 Run Seed Data (Optional)
```bash
npx convex run seed runSeed
```
This creates sample communities for the Explore page.

---

## 4. Chargily Setup (For Payments)

### 4.1 Create Chargily Account
1. Go to [Chargily.dz](https://chargily.dz) and register
2. Create a test/live API key
3. Configure webhook:
   - URL: `https://your-domain.com/api/webhooks/chargily`
   - Events: `checkout.paid`, `checkout.failed`, `checkout.canceled`

### 4.2 Test Payments
- Use test mode API keys during development
- Switch to live mode when ready for production

---

## 5. Vercel Deployment

### 5.1 Connect Repository
1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Framework Preset: Next.js

### 5.2 Configure Environment Variables
Add all environment variables from Section 1 in Vercel dashboard.

### 5.3 Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Note your production URL

---

## 6. Domain & SSL

### 6.1 Custom Domain (Optional)
1. In Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### 6.2 SSL
- Vercel provides free SSL for all domains
- Automatic certificate generation

---

## 7. Post-Deployment Checklist

### 7.1 Verify Functionality
- [ ] Sign up / Sign in flow works
- [ ] Community creation works
- [ ] Explore modal shows communities
- [ ] Feed posts can be created
- [ ] Classrooms can be created (if owner)
- [ ] Payment flow works (with test cards)

### 7.2 Security Checks
- [ ] Environment variables are not exposed in client
- [ ] Webhook signatures are verified
- [ ] API routes have proper authentication

### 7.3 Performance
- [ ] Build completes without errors
- [ ] No console errors in production
- [ ] Pages load under 3 seconds

---

## 8. Going to Market

### 8.1 Pre-Launch
- [ ] Run seed data: `npx convex run seed runSeed`
- [ ] Test entire user flow
- [ ] Add privacy policy page
- [ ] Add terms of service page
- [ ] Add contact/support page

### 8.2 Launch
- [ ] Announce on social media
- [ ] Share with target audience
- [ ] Monitor for bugs/issues

---

## Quick Start Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Deploy to production (Vercel)
vercel --prod

# Deploy Convex
npx convex deploy

# Run seed data
npx convex run seed runSeed
```

---

## Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check Convex function logs
3. Verify environment variables
4. Review webhook delivery status in Clerk/Chargily dashboards