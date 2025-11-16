# College Canteen Portal

A minimal full-stack Next.js app for college users to order from canteens, with vendor and admin portals, stubbed payment link, and 2.5% commission handling.

## Features
- User login (credentials), browse canteens, view menu, create orders
- Vendor dashboard: confirm/cancel orders, set preparation time
- Payment link (stub): simulate checkout and mark as paid
- Admin dashboard: sales totals, commission, recent orders
- Prisma + SQLite schema and seed data

## Stack
- Next.js 14 (App Router) + TypeScript
- Prisma ORM + SQLite
- Tailwind CSS
- Vitest (unit tests)

## Setup
```powershell
# From the project root
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Open http://localhost:3000

Demo logins:
- student@college.local / user123 (USER)
- vendor@college.local / vendor123 (VENDOR)
- admin@college.local / admin123 (ADMIN)

## Notes
- Payments are simulated via a local stub. Replace with a real provider (e.g., Stripe Checkout) and mark `commissionCents` via your payout flow.
- Commission is set to 2.5% of order total and stored per-order.

## Tests
```powershell
npm test
```

## Scripts
- `npm run dev` — start dev server
- `npm run build && npm start` — production build and start
- `npm run db:seed` — seed demo data
- `npm run prisma:migrate` — create and apply migrations