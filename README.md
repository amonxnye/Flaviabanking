<div align="center">
  <h1>Horizon — Flaviabanking</h1>
  <p><b>A financial platform for account aggregation, ACH transfers, and mobile-money collections.</b></p>

  <img src="https://img.shields.io/badge/-Next.js_14-black?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logo=typescript&color=3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/-Appwrite-black?style=for-the-badge&logo=appwrite&color=FD366E" alt="Appwrite" />
  <img src="https://img.shields.io/badge/-Plaid-black?style=for-the-badge&color=00B57E" alt="Plaid" />
  <img src="https://img.shields.io/badge/-Dwolla-black?style=for-the-badge&color=444444" alt="Dwolla" />
  <img src="https://img.shields.io/badge/-ioTec_Pay-black?style=for-the-badge&color=1E88E5" alt="ioTec" />
</div>

---

## Overview

Horizon lets a user connect real bank accounts, see unified balances and transactions,
send ACH transfers to other users, and **collect mobile-money payments from customers
into a wallet**. It began as a tutorial project and has since been hardened toward
production: security fixes, reliability bug purge, self-service (GDPR export/deletion),
plan tiers, audit logging, accessibility, and the ioTec Pay collections feature.

- **Requirements & design:** see [`SRS.md`](./SRS.md)
- **Business & monetization analysis:** see [`BUSINESS_ANALYSIS.md`](./BUSINESS_ANALYSIS.md)

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router), React 18, TypeScript |
| UI | TailwindCSS, ShadCN / Radix UI, Chart.js |
| Auth & DB | Appwrite |
| Bank aggregation | Plaid |
| ACH payments | Dwolla |
| Mobile money (UGX) | ioTec Pay |
| Monitoring | Sentry |

## Features

- **Bank connections** via Plaid Link; unified balances and transaction history.
- **ACH transfers** between users (Dwolla) with server-side amount limits and validation.
- **Mobile-money wallet** — request payments from customers by phone (MTN/Airtel),
  confirmed authoritatively and tracked as a wallet balance. See below.
- **Self-service** — profile editing, GDPR data export (Art. 20), account deletion (Art. 17).
- **Plan tiers** (Free / Pro / Enterprise) with usage limits, billing & usage dashboard.
- **Security** — route-protecting middleware, CSP/HSTS/Permissions-Policy headers,
  HMAC-signed shareable IDs (timing-safe), server-side Zod validation, audit logging.
- **Resilience & UX** — error boundaries, loading skeletons, friendly empty states,
  accessible components (ARIA, keyboard nav, skip-to-content).

## Quick start

**Prerequisites:** Node 18+, and accounts for Appwrite, Plaid, Dwolla (and ioTec Pay for the wallet).

```bash
git clone <repo-url>
cd Flaviabanking
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

Copy `.env.example` and fill in. Key groups:

- **Appwrite** — endpoint, project, database & collection IDs, API key.
- **Plaid** — client id, secret, env, products, country codes.
- **Dwolla** — key, secret, base URL, env.
- **Security** — `ID_SIGNING_SECRET` (**required in production**; `openssl rand -hex 32`).
- **ioTec Pay** — see the next section.

> The app **refuses to start signing shareable IDs in production** without a unique
> `ID_SIGNING_SECRET`, and never commits any third-party secret — keep them in the host env.

## ioTec Pay — mobile-money collections

The `/wallet` page lets an operator charge a customer's mobile money and track the balance.

### 1. Configure environment

```
IOTEC_CLIENT_ID=pay-xxxxxxxx
IOTEC_CLIENT_SECRET=xxxxxxxx          # keep secret; rotate if ever exposed
IOTEC_WALLET_ID=xxxxxxxx              # test wallet first, then the live wallet
IOTEC_WEBHOOK_SECRET=xxxxxxxx         # openssl rand -hex 24
APPWRITE_WALLET_TX_COLLECTION_ID=xxx  # Appwrite collection for the ledger
# Optional overrides (defaults shown):
# IOTEC_AUTH_URL=https://id.iotec.io/connect/token
# IOTEC_BASE_URL=https://pay.iotec.io
# IOTEC_COLLECT_PATH=/api/collections/collect
# IOTEC_STATUS_PATH=/api/collections/{id}
```

### 2. Create the Appwrite ledger collection

Create a collection and set its id as `APPWRITE_WALLET_TX_COLLECTION_ID`, with attributes:

| Attribute | Type | Notes |
|---|---|---|
| `userId` | string | Operator (owner of the collection) |
| `iotecTransactionId` | string | ioTec transaction id (empty until returned) |
| `externalId` | string | Our idempotency key |
| `amount` | integer | Whole UGX |
| `currency` | string | `UGX` |
| `phone` | string | Payer MSISDN (2567XXXXXXXX) |
| `channel` | string | `Mtn` / `Airtel` |
| `status` | string | `Pending` / `Success` / `Failed` / … |
| `note` | string | Optional |
| `direction` | string | `collection` |

Recommended indexes: `userId`, `iotecTransactionId`, `externalId`, `status`.

### 3. Configure the webhook

In the ioTec wallet settings, set the callback URL to:

```
https://<your-domain>/api/iotec/webhook?secret=<IOTEC_WEBHOOK_SECRET>
```

The endpoint is secret-gated and **re-verifies status with ioTec** rather than trusting the
callback body, so a spoofed callback cannot credit the wallet.

### 4. Test

Use the **test wallet** and ioTec's test number **0111777777** to simulate a collection,
then switch `IOTEC_WALLET_ID` to the live wallet for real transactions.

### How it works

1. Operator submits phone + amount + network on `/wallet`.
2. A `Pending` ledger row is written **before** the ioTec call (no lost-confirmation race).
3. ioTec pushes a prompt to the payer's phone; settlement is asynchronous.
4. Status is confirmed two ways, both authoritative: the **webhook** and **client polling**.
5. The row becomes `Success`/`Failed`; **wallet balance = sum of all `Success` collections**.

## Project structure

```
app/(root)/            Authenticated pages (dashboard, my-banks, transfer, wallet, settings, billing)
app/api/iotec/webhook  ioTec Pay callback receiver
components/             UI components (forms, tables, cards, wallet)
lib/actions/           Server actions (user, bank, transaction, settings, iotec)
lib/iotec/             ioTec API client + phone normalization
lib/                   utils, appwrite, plaid, audit, rbac, plans, i18n
middleware.ts          Route protection + security headers
SRS.md                 Software Requirements Specification
BUSINESS_ANALYSIS.md   System review, economics, monetization plan
```

## Scripts

```bash
npm run dev     # start dev server
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```

## Security notes

- Never commit real credentials — all secrets live in the host environment.
- Rotate any secret that has been shared in plaintext (chat, email, tickets).
- `ID_SIGNING_SECRET` and `IOTEC_*` are required for their respective features in production.

## Status & roadmap

Hardened toward production; the remaining gaps before "fully production-grade" are an
automated test suite + CI, per-user plan-tier persistence, and Stripe billing.
See `BUSINESS_ANALYSIS.md` §5 for the prioritized plan.
