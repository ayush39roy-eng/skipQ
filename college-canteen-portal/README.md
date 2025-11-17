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
- admin@college.local / admin123 (ADMIN)

## Notes
- MongoDB provider does not use SQL migrations; schema changes are applied directly via the Prisma client. Remove old `prisma/migrations` if present.
- Payments are simulated via a local stub. Replace with a real provider (e.g., Stripe Checkout) and mark `commissionCents` via your payout flow.
- Commission is set to 2.5% of order total and stored per-order.
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
- WhatsApp / Twilio variables (optional) for messaging
 - Cashfree payment gateway:
	 - `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY` — credentials
	 - `CASHFREE_ENV` — `sandbox` or `production`
	 - `APP_BASE_URL` — base URL for return/notify callbacks

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

## Payments (Cashfree)
If Cashfree credentials are present, the payment link route creates a Cashfree order (`/api/payment/create-link?orderId=...`) and redirects to the hosted payment page. Webhook updates payment status via `/api/payment/webhook` (ensure this URL is reachable publicly and configured in the Cashfree dashboard). Without credentials, a stub local payment page is used.