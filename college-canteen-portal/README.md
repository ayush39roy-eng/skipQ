# College Canteen Portal

A minimal full-stack Next.js app for college users to order from canteens, with vendor and admin portals, stubbed payment link, 2.5% commission handling, and optional WhatsApp vendor notifications.

## Features
- User login (credentials), browse canteens, view menu, create orders
- Vendor dashboard: confirm/cancel orders, set preparation time
- Payment link (stub): simulate checkout and mark as paid
- Admin dashboard: sales totals, commission, recent orders
- Prisma + SQLite schema and seed data

## Stack
- Next.js 14 (App Router) + TypeScript
- Prisma ORM (MongoDB provider)
- MongoDB (Atlas or self-hosted)
- Tailwind CSS
- Vitest (unit tests)

## Setup (MongoDB)
1. Create a MongoDB database (Atlas recommended).
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install and generate client.
4. Seed demo data.

```powershell
# From the project root
cp .env.example .env  # or copy manually on Windows
npm install
npx prisma generate
npm run db:seed
npm run dev
```

Open http://localhost:3000

Demo logins:
- student@college.local / user123 (USER)
- vendor@college.local / vendor123 (VENDOR)
- Admin credentials are configured privately via the `ADMIN_DEFAULT_PASSWORD` env var and are not shown on the login page.

## Notes
- MongoDB provider does not use SQL migrations; schema changes are applied directly via the Prisma client. Remove old `prisma/migrations` if present.
- Payments are simulated via a local stub. Replace with a real provider (e.g., Stripe Checkout) and mark `commissionCents` via your payout flow.
- Commission is set to 5% of order total and stored per-order.
- Optional WhatsApp integration (Meta API or Twilio) can notify vendors on new orders.

## Tests
```powershell
npm test
```

## Scripts
- `npm run dev` — start dev server
- `npm run build && npm start` — production build and start
- `npm run db:seed` — seed demo data
- (MongoDB) migrations script no longer required; remove references.

## Environment Variables
See `.env.example` for required and optional variables:
- `DATABASE_URL` — MongoDB connection string
- `ADMIN_DEFAULT_PASSWORD` — Seed/Admin password used for `admin@skipq.live` (default `skipq@dtu29`)
- `ENABLE_SEED_ROUTE` — leave blank (or anything other than `true`) to disable `/api/seed`; set to `true` only when you intentionally need to reseed
- WhatsApp / Twilio variables (optional) for messaging
 - Cashfree payment gateway:
	 - `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` — credentials
	 - `CASHFREE_ENV` — `sandbox` or `production`
	 - `APP_BASE_URL` — base URL for return/notify callbacks

### Security (WhatsApp Webhooks)
To protect inbound WhatsApp webhooks you MUST set the following when enabled:

Meta provider (`WHATSAPP_PROVIDER=meta`):
- `WHATSAPP_META_TOKEN` — API bearer token for sending messages.
- `WHATSAPP_META_PHONE_NUMBER_ID` — Business phone number ID.
- `WHATSAPP_META_APP_SECRET` — Used to validate `X-Hub-Signature-256` (HMAC SHA256 of raw body) for incoming POSTs.
- `WHATSAPP_META_VERIFY_TOKEN` — Static string you choose; must match `hub.verify_token` when Meta calls GET challenge.

Twilio provider (`WHATSAPP_PROVIDER=twilio`):
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` — Used both for sending and for verifying `X-Twilio-Signature` (HMAC SHA1 of request URL + sorted params).
- `TWILIO_WHATSAPP_FROM` — Your WhatsApp-enabled number.

Webhook Hardening Implemented:
- Signature verification (Meta HMAC SHA256 / Twilio HMAC SHA1) rejects unsigned or tampered requests with 401.
- Verify-token check on GET challenge returns 403 if token mismatch.
- Vendor command authorization: CONFIRM / CANCEL / PREP / ITEM only allowed when vendor phone matches order/menu item’s canteen.
- Idempotent state changes: repeated CONFIRM/CANCEL/PREP ignored.
- Allowed prep minutes enforced (20/30/40). Others dropped silently.
- Requires `paymentStatus=PAID` before CONFIRM or PREP.
- Deduplicated broadcast list combines `notificationPhones` + vendor phone without duplicates.

Operational Notes:
- Ensure phones stored follow E.164 (`+<country><number>`). Simple normalization tries variants but consistent formatting avoids misses.
- If signature validation fails, check you are passing the raw body (no middleware altering it) and that secrets match dashboard settings.
- Twilio sandbox may omit some params; confirm `X-Twilio-Signature` header is present when testing.

### WhatsApp Vendor Notifications
- `WHATSAPP_PROVIDER` — `meta` (default) or `twilio`.
- If `meta`:
	- `WHATSAPP_META_TOKEN` — Meta WhatsApp API token
	- `WHATSAPP_META_PHONE_NUMBER_ID` — Business phone number ID
	- Configure inbound webhook to `POST /api/webhooks/whatsapp` and verify `GET /api/webhooks/whatsapp` for challenge.
- If `twilio`:
	- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
	- `TWILIO_WHATSAPP_FROM` — your Twilio WhatsApp-enabled number (E.164 format, e.g. `+1415...` or `1415...`)
	- Set the Twilio WhatsApp sandbox/number webhook to `POST /api/webhooks/whatsapp`.
- Store each vendor’s WhatsApp phone in Admin → Vendor Settings in E.164 format to match inbound webhook `From` values.

On successful payment, the vendor receives a WhatsApp message with Confirm/Cancel buttons. Upon confirmation, they are prompted to choose a prep time. The chosen time appears on the user’s order page and in the Admin recent orders list.
If using Twilio (text-only), the same flow works by typing commands instead of tapping interactive buttons.

### Extended WhatsApp / Multi-Recipient
- Each canteen now supports multiple notification recipients via `notificationPhones` (comma‑separated in Admin UI). If present, all numbers receive order notifications instead of only the vendor’s phone.
- Initial message includes top 3 items summary and instructions: `Reply CONFIRM:<orderId> or CANCEL:<orderId>`.
- After confirmation, recipients get: `PREP:<orderId>:20`, `:30`, or `:40` buttons (Meta) or may type those commands (Twilio).
- Cancellation broadcasts a cancelled notice; prep time selection updates `prepMinutes` live.

### Real-Time Order Updates
- Order page (`/order/[id]`) polls `/api/orders/[id]` every 5s for status/prep minutes updates.
- Displays badges for statuses: `PENDING`, `PAID`, `CONFIRMED`, `CANCELLED`.
- If cancelled, user sees a clear cancellation notice; if confirmed with prep time, user sees prep minutes immediately.

### New Schema Field
- `Canteen.notificationPhones String[]` — optional array of E.164 phone numbers (e.g. `+15551234567`). Configure in Admin panel.

### Commands Summary (Twilio plain text)
- `CONFIRM:<orderId>` — confirm order
- `CANCEL:<orderId>` — cancel order
- `PREP:<orderId>:<minutes>` — set prep time (allowed: 20, 30, 40)

### Component Usage Quick Notes
| Component | Purpose | Notes |
|-----------|---------|-------|
| `Button` | Primary/secondary actions | Variants: primary, secondary, ghost, outline; sizes: sm/md/lg |
| `Card` | Surface container | Hover elevation & border accent |
| `Input` | Text inputs with label/hint | Uses token-based styles |
| `Badge` | Status indicators | Variants: default, success, warning, danger, info |
| `Table` | Structured data | Use TR/TH/TD subcomponents |
| `Stepper` | Increment/decrement quantity | Accessible buttons, tabular number |
| `ThemeToggle` | Light/dark mode | Persists to `localStorage` |

### Adding New Notification Phones
1. Go to Admin → Canteen section.
2. Enter comma-separated E.164 numbers (e.g. `+15551234567,+919876543210`).
3. Click “Save Phones”.
4. Next paid order will notify all listed numbers.

### Customization Ideas
- Swap polling for WebSockets/SSE for lower latency.
- Extend badges with order progression timeline.
- Add a user notification toast when status changes mid-session.

## Payments (Cashfree)
If Cashfree credentials are present, the payment link route creates a Cashfree order (`/api/payment/create-link?orderId=...`) and redirects to the hosted payment page. Webhook updates payment status via `/api/payment/webhook` (ensure this URL is reachable publicly and configured in the Cashfree dashboard). Without credentials, a stub local payment page is used.