<div align="center">
  <h1>Horizon — Flaviabanking</h1>
  <p><b>A financial platform for account aggregation, ACH transfers, and mobile-money collections.</b></p>

  <img src="https://img.shields.io/badge/-Next.js_14-black?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/-TypeScript-black?style=for-the-badge&logo=typescript&color=3178C6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/-Firebase-black?style=for-the-badge&logo=firebase&color=FFCA28" alt="Firebase" />
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
| Auth & DB | Firebase Auth + Cloud Firestore (server-side Admin SDK) |
| Mobile money (UGX) | ioTec Pay |
| AI assistant | AgentStudio |
| Monitoring | Sentry |

## Features

- **Account management**: add the accounts you hold at any financial institution (name, institution, type, currency, balance) and see balances and history in one place.
- **Internal transfers** between your own accounts, recorded as ledger entries with both balances updated atomically.
- **Mobile-money wallet** — request payments from customers by phone (MTN/Airtel),
  confirmed authoritatively and tracked as a wallet balance. See below.
- **Self-service** — profile editing, GDPR data export (Art. 20), account deletion (Art. 17).
- **Plan tiers** (Free / Pro / Enterprise) with usage limits, billing & usage dashboard.
- **Security** — route-protecting middleware, CSP/HSTS/Permissions-Policy headers,
  HMAC-signed shareable IDs (timing-safe), server-side Zod validation, audit logging.
- **Resilience & UX** — error boundaries, loading skeletons, friendly empty states,
  accessible components (ARIA, keyboard nav, skip-to-content).

## Quick start

**Prerequisites:** Node 20+ and a Firebase project (Email/Password sign-in enabled, Firestore created). ioTec Pay is only needed for the mobile-money wallet.

```bash
git clone <repo-url>
cd Flaviabanking
npm install
cp .env.example .env.local   # fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

Copy `.env.example` and fill in. Key groups:

- **Firebase** — `NEXT_PUBLIC_FIREBASE_*` web config (public). Locally also `FIREBASE_SERVICE_ACCOUNT`; on App Hosting the backend service account is used automatically.
- **ioTec Pay** — see the next section.

> Never commit third-party secrets — keep them in the host env (`.env` is git-ignored).

## Firebase setup

1. **Authentication → Sign-in method**: enable *Email/Password* and *Google*.
   Under **Authentication → Settings → Authorized domains** add the site's domain
   (e.g. `flaviafintech--silkevents-ug.us-east4.hosted.app`), or Google sign-in fails with
   `auth/unauthorized-domain`.
2. **Firestore Database**: create a database (production mode). Then deploy the rules and indexes:
   ```bash
   firebase deploy --only firestore
   ```
   `firestore.rules` denies all client access on purpose: every read/write goes through
   server actions using the Admin SDK, which scope queries to the signed-in user.
3. **Collections** (created automatically on first write): `users/{uid}`, `accounts`, `transactions`,
   `auditLogs`, `walletTransactions`. User profile documents are keyed by the Firebase Auth uid.
   `accounts` holds the user's manually managed financial-institution accounts (name, institution,
   type, last-4, currency, balance); `transactions` records transfers between two of those accounts
   and moves both balances in a single Firestore transaction.
4. **Sessions**: the browser signs in with Firebase Auth (email/password or Google), then a server action
   exchanges the ID token for an httpOnly `__session` cookie (5 days). The browser-side Firebase session is
   signed out after that. A first Google sign-in creates the profile from the Google name and email.
5. **Who can sign up**: anyone — an individual or a business (optional organisation name). Each user
   manages their own accounts and the accounts of their clients (the *account holder* field). The app
   only records data; it never moves money.

### Deploying on Firebase App Hosting

`apphosting.yaml` holds the public Firebase config. Every secret has to be created first:

```bash
# IOTEC_* and STUDIO_* are only needed if those features are on
firebase apphosting:secrets:set IOTEC_CLIENT_SECRET
firebase apphosting:secrets:set STUDIO_API_KEY
```

then uncomment the matching `secret:` entries in `apphosting.yaml`. The backend's service
account needs the *Firebase Authentication Admin* and *Cloud Datastore User* roles.

## ioTec Pay — mobile-money collections

The `/wallet` page lets an operator charge a customer's mobile money and track the balance.

### 1. Configure environment

```
IOTEC_CLIENT_ID=pay-xxxxxxxx
IOTEC_CLIENT_SECRET=xxxxxxxx          # keep secret; rotate if ever exposed
IOTEC_WALLET_ID=xxxxxxxx              # test wallet first, then the live wallet
IOTEC_WEBHOOK_SECRET=xxxxxxxx         # openssl rand -hex 24
# Optional overrides (defaults shown):
# IOTEC_AUTH_URL=https://id.iotec.io/connect/token
# IOTEC_BASE_URL=https://pay.iotec.io
# IOTEC_COLLECT_PATH=/api/collections/collect
# IOTEC_STATUS_PATH=/api/collections/{id}
```

### 2. Ledger storage

Entries are written to the Firestore collection `walletTransactions` (created on first write). Fields:

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

## AI assistant (AgentStudio)

The `/assistant` page lets a signed-in user chat with an AI assistant hosted on
[AgentStudio](https://agentstudio--ridelinkx.us-east4.hosted.app/docs.md). The assistant answers
questions by calling **read-only tools** on this app. It cannot move money.

### Setup

1. Set `STUDIO_URL`, `STUDIO_API_KEY` and `STUDIO_AGENT_ID` (backend only; see `.env.example`).
2. Register each tool with AgentStudio (`POST /v1/tools`, `kind: "read"`), pointing `url` at
   `https://<your-domain>/api/agentstudio/tools/<tool_name>`:

   | Tool | Input | Returns |
   |---|---|---|
   | `get_wallet_balance` | none | Confirmed wallet balance (UGX) |
   | `list_recent_collections` | `limit` (1-10), `status` (Success/Pending/Failed) | Recent collections, payer phone masked |
   | `get_linked_accounts` | none | Linked bank names, last 4, balances |

3. Save each tool's one-time `signing_secret` as `STUDIO_SECRET_<TOOL_NAME_UPPERCASE>`
   (e.g. `STUDIO_SECRET_GET_WALLET_BALANCE`).
4. Create an agent with those `tool_ids` and set its id as `STUDIO_AGENT_ID`.

### Security model

- The API key never reaches the browser; the chat UI talks to server actions only.
- `external_user_id` is set from the authenticated session, never from client input.
- Conversation ids are HMAC-bound to their owner, so a user cannot post into another's conversation.
- Tool endpoints verify `X-Studio-Signature` over the raw body with a per-tool secret, constant-time,
  with a 5-minute replay window. Unsigned, stale or tampered calls get `401`.
- Action confirm/cancel happens only on an explicit button press and is audit-logged.
- The UI discloses that the user is talking to an AI.

## Project structure

```
app/(root)/            Authenticated pages (dashboard, my-banks, transfer, wallet, settings, billing)
app/api/iotec/webhook  ioTec Pay callback receiver
app/api/agentstudio    Signed tool endpoints for the AI assistant
components/             UI components (forms, tables, cards, wallet)
lib/actions/           Server actions (user, account, transaction, settings, iotec, assistant)
lib/iotec/             ioTec API client + phone normalization
lib/                   utils, firebase (admin + client), session, audit, rbac, plans, i18n
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
- `IOTEC_*` and `STUDIO_*` are required for their respective features in production.

## Status & roadmap

Hardened toward production; the remaining gaps before "fully production-grade" are an
automated test suite + CI, per-user plan-tier persistence, and Stripe billing.
See `BUSINESS_ANALYSIS.md` §5 for the prioritized plan.
