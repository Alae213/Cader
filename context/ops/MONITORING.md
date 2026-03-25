# Monitoring & Observability

> Stub — populate when monitoring is set up.

---

## Error Tracking

<!-- Tool: TBD (Sentry on free tier is a good option for v1.1) -->
<!-- Setup: populate when configured -->

---

## Logging

### Convex Functions
- Convex provides built-in function logs in the Convex dashboard
- Do NOT log: Chargily secret keys, phone numbers, email addresses, raw webhook payloads

### Vercel
- Vercel provides request logs and function logs for Route Handlers
- Production logs accessible via Vercel dashboard

---

## Alerts

<!-- Define alerts when monitoring is configured -->
<!-- Priority alerts for v1: -->
- Webhook handler 401 errors (potential invalid signature or misconfiguration)
- Convex mutation error rate spikes
- Chargily checkout creation failures

---

## Key Metrics to Track (Future)

- Community creation rate
- Checkout → membership conversion rate
- Webhook delivery success rate
- Active member count per community
- Leaderboard query latency
