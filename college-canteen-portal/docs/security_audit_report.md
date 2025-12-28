# SkipQ College Canteen Portal — Security & Production Readiness Audit

**Date**: December 25, 2024  
**Auditor**: Principal Backend Engineer / Security Auditor  
**System**: Next.js 14 (App Router) + Prisma + MongoDB + Razorpay + Twilio/Meta WhatsApp

---

## A. Executive Summary

| Aspect                       | Rating      |
| ---------------------------- | ----------- |
| **Overall Risk Level**       | **HIGH**    |
| Authentication/Authorization | Medium      |
| Rate Limiting                | Critical    |
| Payment Safety               | Medium-High |
| Idempotency                  | High        |
| Observability                | Medium      |

### Top 3 Systemic Weaknesses

1. **In-Memory Rate Limiting** — Rate limits reset on every deploy, restart, or scale-out event. Under load or attack, this provides zero protection.

2. **Missing Idempotency Keys** — Order creation has no deduplication mechanism. Network retries or user double-clicks can create duplicate orders and payments.

3. **Non-Atomic Payment State Updates** — `markOrderAsPaid` updates Payment and Order in separate queries without a transaction, creating race conditions and potential state inconsistency.

### One-Sentence Verdict

> **This system has solid authentication foundations but lacks the replay protection, persistent rate limiting, and atomic state management required for safe production deployment handling real money.**

---

## B. Critical Findings (Must Fix)

### 1. ❌ In-Memory Rate Limiting Resets on Deploy

**Location**: [middleware.ts](file:///e:/SKIPQ/college-canteen-portal/src/middleware.ts#L15-L54)

**Why Dangerous**: Rate limiting uses `globalThis._rateLimitMap` which:

- Resets completely on every Vercel deploy
- Is not shared across serverless function instances
- Provides zero protection in a multi-instance environment

**Real-World Scenario**: Attacker sends 10,000 login attempts. Requests get distributed across instances, each starting fresh. Credential stuffing succeeds.

**Concrete Fix**:

```typescript
// Use Vercel KV (Redis) or Upstash for distributed rate limiting
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
});

// In middleware:
const { success } = await ratelimit.limit(ip);
if (!success) return new Response("Too Many Requests", { status: 429 });
```

---

### 2. ❌ Order Creation Lacks Idempotency Key

**Location**: [api/orders/route.ts](file:///e:/SKIPQ/college-canteen-portal/src/app/api/orders/route.ts#L41-L87)

**Why Dangerous**: POST /api/orders creates new Order + Payment records with no deduplication. Mobile network retries or user double-tap creates duplicate orders.

**Real-World Scenario**: User's app times out, auto-retries. Two orders created, user charged twice via Razorpay.

**Concrete Fix**:

```typescript
// Client must send: X-Idempotency-Key: <uuid>
const idempotencyKey = req.headers.get('x-idempotency-key')
if (!idempotencyKey) return NextResponse.json({ error: 'Missing idempotency key' }, { status: 400 })

// Check for existing order with this key
const existing = await prisma.order.findFirst({
  where: { idempotencyKey, userId: session.userId }
})
if (existing) return NextResponse.json({ id: existing.id, ... }) // Return cached result

// Create order with idempotency key stored
const order = await prisma.order.create({
  data: {
    idempotencyKey, // Add to schema: String? @unique
    ...
  }
})
```

**Schema Change Required**:

```prisma
model Order {
  idempotencyKey String? @unique
  // ...
}
```

---

### 3. ❌ Non-Atomic Payment + Order Update

**Location**: [order-payment.ts](file:///e:/SKIPQ/college-canteen-portal/src/lib/order-payment.ts#L87-L112)

**Why Dangerous**: `markOrderAsPaid` updates Payment then Order in separate queries. If the process crashes between updates, Payment shows PAID but Order shows PENDING — money taken, order never fulfilled.

**Real-World Scenario**: Server crash mid-update. Customer charged ₹500, order stuck in PENDING. No easy recovery.

**Concrete Fix**:

```typescript
export async function markOrderAsPaid(orderId: string) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { payment: true /* ... */ },
    });
    if (!order) throw new Error(`Order ${orderId} not found`);

    if (order.payment?.status === "PAID" && order.status === "PAID") {
      return { alreadyPaid: true, order };
    }

    const now = new Date();

    if (order.payment) {
      await tx.payment.update({
        where: { orderId },
        data: { status: "PAID", paidAt: now },
      });
    } else {
      await tx.payment.create({
        data: {
          orderId,
          amountCents: order.totalCents,
          status: "PAID",
          paidAt: now,
          provider: "manual",
        },
      });
    }

    await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });

    const updated = await tx.order.findUnique({
      where: { id: orderId } /* include relations */,
    });
    return { alreadyPaid: false, order: updated };
  });
  // WhatsApp notification AFTER transaction commits
}
```

---

### 4. ❌ Gupshup/Meta Webhook Missing Signature Verification

**Location**: [webhooks/whatsapp/route.ts](file:///e:/SKIPQ/college-canteen-portal/src/app/api/webhooks/whatsapp/route.ts#L125-L139)

**Why Dangerous**: JSON webhook path (Gupshup/Meta) has **zero signature verification**. Anyone can forge requests to complete/cancel orders.

```typescript
if (contentType.includes("application/json")) {
  const json = await req.json(); // ← No signature check!
  // Proceeds to update order status
}
```

**Real-World Scenario**: Attacker discovers endpoint, sends `{"type":"message","payload":{"source":"...","type":"button_reply","payload":{"id":"1|ORDER_ID"}}}`. Order marked COMPLETED without vendor action.

**Concrete Fix**:

```typescript
if (contentType.includes("application/json")) {
  const raw = await req.text();
  const gupshupSignature = req.headers.get("x-gupshup-signature") || "";
  const gupshupSecret = process.env.GUPSHUP_WEBHOOK_SECRET || "";

  if (
    !gupshupSecret ||
    !verifyGupshupSignature(raw, gupshupSignature, gupshupSecret)
  ) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const json = JSON.parse(raw);
  // ... proceed
}
```

---

### 5. ❌ Seed Endpoint Should Be Removed in Production

**Location**: [api/seed/route.ts](file:///e:/SKIPQ/college-canteen-portal/src/app/api/seed/route.ts)

**Why Dangerous**: Even with `ENABLE_SEED_ROUTE=false`, the code exists. If env var accidentally set, credentials are exposed in response.

**Real-World Scenario**: Developer accidentally sets `ENABLE_SEED_ROUTE=true` in production. Response includes admin password in plaintext JSON.

**Concrete Fix**:

- Delete `src/app/api/seed/route.ts` entirely
- Use a separate CLI script: `npx prisma db seed`
- Never expose credentials in HTTP responses

---

## C. Medium-Priority Improvements

### 1. ⚠️ Registration Lacks Password Strength Validation

**Location**: [auth/register/route.ts](file:///e:/SKIPQ/college-canteen-portal/src/app/api/auth/register/route.ts#L12-L15)

**Issue**: Accepts any non-empty password.

**Fix**: Add minimum length (8+), complexity requirements:

```typescript
if (password.length < 8)
  return NextResponse.json({ error: "Password too short" }, { status: 400 });
```

---

### 2. ⚠️ POS Order Creation Has Implicit `any` Cast

**Location**: [vendor/actions.ts](file:///e:/SKIPQ/college-canteen-portal/src/app/vendor/actions.ts#L37)

```typescript
const markup = (canteen as any).posMarkup ?? 0.05; // ← as any
```

**Issue**: Type safety bypassed. If `posMarkup` is unexpectedly a string, arithmetic fails silently.

**Fix**: Use proper Prisma types or explicit validation.

---

### 3. ⚠️ Vendor Orders POST Action Validation Incomplete

**Location**: [api/vendor/orders/route.ts](file:///e:/SKIPQ/college-canteen-portal/src/app/api/vendor/orders/route.ts#L23-L107)

**Issue**: Action string accepted without strict validation. While safe (unknown actions are no-ops), explicit allowlist is better.

**Fix**:

```typescript
const ALLOWED_ACTIONS = [
  "CONFIRM",
  "EXTEND_PREP",
  "CANCELLED",
  "READY",
  "COMPLETED",
  "SET_PREP",
];
if (!ALLOWED_ACTIONS.includes(action)) {
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
```

---

### 4. ⚠️ Session Expiry Not Enforced on DB Side

**Location**: [session.ts](file:///e:/SKIPQ/college-canteen-portal/src/lib/session.ts)

**Issue**: `getSession()` checks `expiresAt < new Date()` but expired sessions remain in DB indefinitely.

**Fix**: Add TTL index in MongoDB or periodic cleanup cron.

---

### 5. ⚠️ WhatsApp Notification Failures Are Swallowed

**Location**: Multiple routes use `try/catch` that log errors but don't surface them.

**Issue**: Critical notifications (order ready, payment received) can silently fail.

**Fix**: Add retry logic, dead-letter queue, or alerting on notification failures.

---

## D. Safe As-Is ✅

| Component                           | Assessment                                                       |
| ----------------------------------- | ---------------------------------------------------------------- |
| **Razorpay Signature Verification** | ✅ Uses timing-safe comparison correctly                         |
| **Payment Webhook Idempotency**     | ✅ Uses `updateMany` with conditional `status: { not: 'PAID' }`  |
| **Vendor Action Authorization**     | ✅ Consistently checks `session.role === 'VENDOR'` and ownership |
| **Admin Route Protection**          | ✅ Uses `requireRole(['ADMIN'])` consistently                    |
| **Session Cookie Security**         | ✅ HttpOnly, Secure (in prod), SameSite=Lax                      |
| **AI Training Job Locking**         | ✅ Uses DB-level transactions with proper conflict handling      |
| **Audit Logging**                   | ✅ Persisted to DB with IP, actor, result tracking               |
| **Input Validation on Order Items** | ✅ Validates quantity bounds (1-100)                             |

---

## E. Hardening Roadmap

### Quick Wins (1-2 Days)

| Priority | Task                                                     | Effort |
| -------- | -------------------------------------------------------- | ------ |
| P0       | Replace in-memory rate limiting with Upstash/Vercel KV   | 2 hrs  |
| P0       | Add idempotency key to Order model and check on creation | 3 hrs  |
| P0       | Wrap `markOrderAsPaid` in `prisma.$transaction`          | 1 hr   |
| P0       | Add Gupshup webhook signature verification               | 2 hrs  |
| P1       | Delete seed endpoint, move to CLI script                 | 30 min |
| P1       | Add password strength validation in registration         | 30 min |

---

### Structural Fixes (1-2 Weeks)

| Priority | Task                                                        | Effort |
| -------- | ----------------------------------------------------------- | ------ |
| P1       | Add session cleanup cron (delete expired sessions)          | 2 hrs  |
| P1       | Add notification retry queue (e.g., BullMQ or Vercel Queue) | 1 day  |
| P2       | Add explicit state machine for Order.status transitions     | 4 hrs  |
| P2       | Add uniqueness constraint on `Payment.externalOrderId`      | 1 hr   |
| P2       | Implement request signing for mobile API calls              | 1 day  |

---

### Future Improvements (Optional)

| Task                                                        | Notes                                   |
| ----------------------------------------------------------- | --------------------------------------- |
| Move AI training to background worker (Vercel Cron + Queue) | Currently synchronous, blocks request   |
| Add Razorpay refund automation                              | Currently manual `REFUND_PENDING` state |
| Implement CSRF tokens for session-based forms               | Cookie-based auth is vulnerable         |
| Add admin action confirmation (2FA for destructive ops)     | Currently single-click delete           |

---

## F. Failure Mode Analysis

### Scenario: Duplicate Order Request (Network Retry)

| Question                   | Answer                                                                      |
| -------------------------- | --------------------------------------------------------------------------- |
| What breaks?               | Two orders created, two Razorpay orders, customer potentially charged twice |
| Can it be retried?         | No — damage is done                                                         |
| Is system left consistent? | No — extra order in DB with payment                                         |
| **Fix**                    | Idempotency key required                                                    |

---

### Scenario: Crash During `markOrderAsPaid`

| Question                   | Answer                                                         |
| -------------------------- | -------------------------------------------------------------- |
| What breaks?               | Payment marked PAID, Order still PENDING                       |
| Can it be retried?         | Webhook retry will hit "already PAID" check in webhook handler |
| Is system left consistent? | **NO** — money taken, order not progressed                     |
| **Fix**                    | Use `$transaction` for atomic update                           |

---

### Scenario: Razorpay Webhook Races with `/confirm`

| Question                   | Answer                                                 |
| -------------------------- | ------------------------------------------------------ |
| What breaks?               | Both paths call `markOrderAsPaid` simultaneously       |
| Can it be retried?         | Yes — `updateMany` with conditional check handles this |
| Is system left consistent? | Yes ✅ — only one update wins                          |

---

### Scenario: Server Restart Mid-Rate-Limit Window

| Question                   | Answer                              |
| -------------------------- | ----------------------------------- |
| What breaks?               | Rate limit counter resets to 0      |
| Can it be retried?         | N/A (attack scenario)               |
| Is system left consistent? | Yes, but **unprotected**            |
| **Fix**                    | Use persistent rate limiter (Redis) |

---

### Scenario: Gupshup Webhook Forgery

| Question                   | Answer                                        |
| -------------------------- | --------------------------------------------- |
| What breaks?               | Attacker can complete/cancel any active order |
| Can it be retried?         | Attacker can repeat at will                   |
| Is system left consistent? | Yes, but **unauthorized state change**        |
| **Fix**                    | Add signature verification                    |

---

## G. Endpoint Authentication Matrix

| Endpoint                                | Auth                     | Role Check         | Verdict             |
| --------------------------------------- | ------------------------ | ------------------ | ------------------- |
| `POST /api/auth/login`                  | None                     | N/A                | ✅ Correct (public) |
| `POST /api/auth/register`               | None                     | N/A                | ✅ Correct (public) |
| `POST /api/orders`                      | Session                  | USER               | ✅ Correct          |
| `GET /api/orders`                       | Session                  | USER               | ✅ Correct          |
| `POST /api/vendor/orders`               | Session                  | VENDOR + ownership | ✅ Correct          |
| `PATCH /api/admin/menu/item/[id]`       | Session                  | ADMIN              | ✅ Correct          |
| `POST /api/ai/train`                    | API Key or ADMIN Session | ✅                 | ✅ Correct          |
| `POST /api/payment/webhook`             | Razorpay Signature       | N/A                | ✅ Correct          |
| `POST /api/webhooks/whatsapp` (Twilio)  | Twilio Signature         | N/A                | ✅ Correct          |
| `POST /api/webhooks/whatsapp` (Gupshup) | **NONE**                 | N/A                | ❌ **CRITICAL**     |
| `GET /api/seed`                         | Token param              | N/A                | ⚠️ Should not exist |

---

## H. Conclusion

This system demonstrates **good security hygiene in authentication and authorization patterns** but has **critical gaps in operational resilience** that would cause real problems under production conditions:

1. Network retries create duplicate orders
2. Partial failures leave inconsistent state
3. Rate limiting provides false sense of security
4. Webhook forgery is trivially possible on one path

**Recommendation**: Address P0 items before any production traffic involving real money. The platform is approximately **70% production-ready** — the remaining 30% carries disproportionate risk.

---

_Report generated: December 25, 2024_
