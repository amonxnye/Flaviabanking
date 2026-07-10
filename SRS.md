# Software Requirements Specification (SRS)

## Flaviabanking (Horizon) — Enterprise Banking SaaS Platform

**Version:** 2.2
**Date:** 2026-07-10
**Status:** Revised after reliability hardening, security fixes, and ioTec Pay mobile-money collections

---

## 1. Introduction

### 1.1 Purpose

This SRS defines the functional and non-functional requirements for Flaviabanking (Horizon), a multi-tenant financial management SaaS platform designed for global enterprise adoption. The document reflects corrective actions taken after a comprehensive audit of the original MVP.

### 1.2 Scope

Horizon enables businesses and individuals worldwide to:

- Connect and manage multiple bank accounts from a single dashboard
- View consolidated balances, transactions, and spending analytics
- Transfer funds between platform users via ACH
- Collect mobile-money payments from customers into a wallet (ioTec Pay, UGX)
- Manage user roles, permissions, and organizational access
- Meet regulatory compliance (GDPR, SOC 2, PCI-DSS awareness)

### 1.3 Target Users

| User Type | Description |
|---|---|
| **Individual Consumer** | Personal finance management across multiple banks |
| **Small Business Owner** | Business account monitoring, payroll transfers, expense tracking |
| **Enterprise Finance Team** | Multi-user access with role-based permissions, audit trails |
| **Platform Administrator** | System configuration, user management, compliance monitoring |

### 1.4 Business Model

| Revenue Stream | Description |
|---|---|
| **Freemium Tier** | 1 connected bank, basic dashboard, limited transfers |
| **Pro Tier** | Unlimited banks, full transaction history, scheduled transfers, spending reports |
| **Enterprise Tier** | Multi-tenant workspaces, RBAC, audit logs, API access, SLA guarantees |
| **Transaction Fees** | Per-transfer fee on ACH payments (absorbed or passed through) |
| **White-label Licensing** | B2B licensing for companies embedding Horizon in their products |

---

## 2. Critical Design Review & Corrective Actions

### 2.1 Design Criticisms

| # | Area | Criticism | Severity |
|---|---|---|---|
| C1 | **Security** | `encryptId`/`decryptId` use `btoa`/`atob` (Base64 encoding, not encryption). Shareable IDs are trivially reversible. | Critical |
| C2 | **Security** | No middleware for route protection — auth check only in layout (bypassable). No security headers (CSP, HSTS, X-Frame-Options). | Critical |
| C3 | **Validation** | Server actions trust client-side Zod validation blindly. No server-side re-validation of transfer amounts, SSN format, or email. | Critical |
| C4 | **Error Handling** | All server actions `console.log(error)` and return `undefined`. Users see blank pages on failure. No error boundaries. | High |
| C5 | **Self-Service** | No password reset, profile editing, account deletion, bank unlinking, data export, or 2FA. Users are locked in after signup. | High |
| C6 | **Business Model** | No pricing tiers, usage limits, or monetization. A SaaS with no revenue model. | High |
| C7 | **Accessibility** | Only 2 ARIA attributes in entire codebase. Color-only indicators. No keyboard navigation. Not WCAG 2.1 compliant. | High |
| C8 | **i18n** | Hardcoded `en-US` locale, USD currency. Zero internationalization support. Excludes global markets. | Medium |
| C9 | **Multi-tenancy** | No organizations, workspaces, or RBAC. Single-user model only. Cannot serve companies. | Medium |
| C10 | **Audit & Compliance** | No audit logs, no GDPR data export/deletion, no transaction audit trail. Not enterprise-ready. | High |
| C11 | **Resilience** | No rate limiting, no retry logic, no circuit breakers. One Plaid outage takes down the entire app. | Medium |
| C12 | **Performance** | `force-dynamic` on root layout disables all caching. Every page load hits Plaid API. | Medium |
| C13 | **Testing** | Zero tests — no unit, integration, or E2E tests. No CI/CD pipeline. | High |
| C14 | **Data Privacy** | SSN stored unencrypted. No data retention policy. `.env` with secrets checked into repo history. | Critical |

### 2.2 Phased Corrective Actions

#### Phase 1: Critical Security & Validation (Immediate)

- [x] Replace `btoa`/`atob` with HMAC-based ID signing
- [x] Add Next.js middleware for route protection and security headers
- [x] Add server-side validation on all server actions (transfers, auth)
- [x] Add transfer amount limits and duplicate prevention
- [x] Strengthen Zod schemas (SSN format, password complexity, amount ranges)

#### Phase 2: Error Handling & User Experience (Week 1)

- [x] Add global error boundary component
- [x] Add structured error responses from all server actions
- [x] Add loading states and skeleton UI for all pages
- [x] Add toast notification system for user feedback
- [x] Add proper error pages (404, 500, auth errors)

#### Phase 3: Self-Service & User Empowerment (Week 2)

- [x] Add password reset flow
- [x] Add profile editing page
- [x] Add bank account unlinking
- [x] Add data export (GDPR right to portability)
- [x] Add account deletion (GDPR right to erasure)
- [x] Add notification preferences / settings page

#### Phase 4: Business Model & Monetization (Week 3)

- [x] Add pricing tier constants and plan definitions
- [x] Add usage tracking (connected banks, transfers/month)
- [x] Add plan enforcement middleware
- [x] Add upgrade/downgrade flow
- [x] Add billing page with usage dashboard

#### Phase 5: Accessibility & Internationalization (Week 4)

- [x] Add ARIA labels, roles, and live regions across all components
- [x] Add keyboard navigation and focus management
- [x] Add skip-to-content navigation
- [x] Add i18n framework with locale detection
- [x] Add multi-currency support in formatAmount
- [x] Add RTL layout support

#### Phase 6: Enterprise Features (Month 2)

- [x] Add organization/workspace model
- [x] Add role-based access control (Admin, Member, Viewer)
- [x] Add audit logging for all sensitive actions
- [x] Add API rate limiting
- [x] Add transaction search and filtering
- [x] Add spending analytics and reports

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | Users shall sign up with email, password, and KYC information | Must |
| FR-AUTH-02 | Users shall sign in with email and password | Must |
| FR-AUTH-03 | Users shall be able to reset their password via email | Must |
| FR-AUTH-04 | Sessions shall be managed via HTTP-only secure cookies | Must |
| FR-AUTH-05 | All protected routes shall be guarded by middleware | Must |
| FR-AUTH-06 | Failed login attempts shall be rate-limited (5 per 15 min) | Must |
| FR-AUTH-07 | Passwords shall require minimum 8 chars, 1 uppercase, 1 number, 1 special char | Must |

### 3.2 Bank Account Management

| ID | Requirement | Priority |
|---|---|---|
| FR-BANK-01 | Users shall connect bank accounts via Plaid Link | Must |
| FR-BANK-02 | Users shall view all connected accounts with balances | Must |
| FR-BANK-03 | Users shall be able to unlink/disconnect a bank account | Must |
| FR-BANK-04 | Account IDs shared externally shall use HMAC-signed tokens, not Base64 | Must |
| FR-BANK-05 | Connected bank count shall be enforced per pricing tier | Should |

### 3.3 Transactions

| ID | Requirement | Priority |
|---|---|---|
| FR-TXN-01 | Users shall view paginated transaction history per account | Must |
| FR-TXN-02 | Users shall search and filter transactions by date, amount, category | Should |
| FR-TXN-03 | Transaction display shall include debit/credit indicators beyond color | Must |
| FR-TXN-04 | Users shall export transaction history as CSV | Should |

### 3.4 Fund Transfers

| ID | Requirement | Priority |
|---|---|---|
| FR-XFR-01 | Users shall transfer funds to other platform users via Dwolla | Must |
| FR-XFR-02 | Transfer amounts shall be validated: min $1.00, max $10,000.00 per transaction | Must |
| FR-XFR-03 | Duplicate transfers (same recipient, amount, within 5 min) shall require confirmation | Must |
| FR-XFR-04 | Users shall see real-time transfer status feedback (success, error, processing) | Must |
| FR-XFR-05 | Daily transfer limits shall be enforced per pricing tier | Should |

### 3.5 Mobile-Money Wallet & Collections (ioTec Pay)

| ID | Requirement | Priority |
|---|---|---|
| FR-WAL-01 | Operators shall request a mobile-money collection from a payer by phone number, amount (UGX), and network (MTN/Airtel) | Must |
| FR-WAL-02 | Phone numbers shall be normalized to MSISDN (2567XXXXXXXX) and validated as Ugandan mobile numbers | Must |
| FR-WAL-03 | Each collection shall persist a ledger entry (Pending) before the ioTec request, so no confirmation can be lost to a race | Must |
| FR-WAL-04 | Collection status shall be confirmed from ioTec authoritatively — via client polling and/or webhook — never trusted from the raw callback body | Must |
| FR-WAL-05 | Wallet balance shall equal the sum of ALL confirmed (Success) collections for the operator | Must |
| FR-WAL-06 | The collect form shall show live status feedback (sending → waiting for approval → success/failed) | Must |
| FR-WAL-07 | The webhook endpoint shall be gated by a shared secret and idempotent under repeated callbacks | Must |
| FR-WAL-08 | Collection amounts shall be whole shillings within a configured range (500 – 5,000,000 UGX) | Must |

### 3.6 Self-Service Account Management

| ID | Requirement | Priority |
|---|---|---|
| FR-SELF-01 | Users shall edit their profile (name, address, contact) | Must |
| FR-SELF-02 | Users shall export all personal data (GDPR Article 20) | Must |
| FR-SELF-03 | Users shall delete their account and all associated data (GDPR Article 17) | Must |
| FR-SELF-04 | Users shall manage notification preferences | Should |
| FR-SELF-05 | Users shall view a settings page with security and billing info | Should |

### 3.7 Enterprise & Multi-Tenancy

| ID | Requirement | Priority |
|---|---|---|
| FR-ENT-01 | Organizations shall support multiple members with roles (Admin, Member, Viewer) | Should |
| FR-ENT-02 | Admins shall view audit logs of all member actions | Should |
| FR-ENT-03 | API access shall be available for Enterprise tier | Could |

---

## 4. Non-Functional Requirements

### 4.1 Security

| ID | Requirement |
|---|---|
| NFR-SEC-01 | All pages shall be served with security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| NFR-SEC-02 | Server actions shall re-validate all inputs server-side |
| NFR-SEC-03 | Sensitive data (SSN) shall be masked in API responses (last 4 digits only) |
| NFR-SEC-04 | API endpoints shall be rate-limited (100 req/min per user) |
| NFR-SEC-05 | All external IDs shall use HMAC signing, never plain Base64 |
| NFR-SEC-06 | Signed-ID signature comparison shall be constant-time (timing-safe) |
| NFR-SEC-07 | Production shall refuse the default ID signing key; a unique secret is mandatory |
| NFR-SEC-08 | CSP shall allow production Plaid/Dwolla/Appwrite/Sentry hosts (wildcarded), not sandbox-only |
| NFR-SEC-09 | Powerful browser features (camera, mic, geolocation, payment, USB) shall be disabled via Permissions-Policy |
| NFR-SEC-10 | Third-party payment credentials (ioTec) shall live only in environment variables, never in source |
| NFR-SEC-11 | Payment webhooks shall be secret-gated and shall re-verify status with the provider before mutating state |

### 4.2 Performance

| ID | Requirement |
|---|---|
| NFR-PERF-01 | Dashboard shall load within 3 seconds on 3G connection |
| NFR-PERF-02 | Caching shall be used for non-sensitive, infrequently changing data (institution info) |
| NFR-PERF-03 | `force-dynamic` shall be removed from root layout; use per-route revalidation instead |

### 4.3 Accessibility

| ID | Requirement |
|---|---|
| NFR-A11Y-01 | Application shall meet WCAG 2.1 Level AA compliance |
| NFR-A11Y-02 | All interactive elements shall be keyboard accessible |
| NFR-A11Y-03 | All images and icons shall have meaningful alt text |
| NFR-A11Y-04 | Status changes shall use ARIA live regions |
| NFR-A11Y-05 | Color shall not be the sole indicator of information |

### 4.4 Internationalization

| ID | Requirement |
|---|---|
| NFR-I18N-01 | Application shall support locale-aware date/time/currency formatting |
| NFR-I18N-02 | UI text shall be externalized for translation readiness |
| NFR-I18N-03 | Layout shall support RTL languages |

### 4.5 Reliability

| ID | Requirement |
|---|---|
| NFR-REL-01 | External API failures (Plaid, Dwolla) shall show graceful fallback UI |
| NFR-REL-02 | Critical operations shall retry with exponential backoff (max 3 retries) |
| NFR-REL-03 | Application shall have error boundaries preventing full-page crashes |

### 4.6 Compliance

| ID | Requirement |
|---|---|
| NFR-COMP-01 | Platform shall support GDPR data export and deletion |
| NFR-COMP-02 | All sensitive actions shall generate audit log entries |
| NFR-COMP-03 | Data retention policies shall be documented and enforced |

---

## 5. Use Cases

### UC-01: Personal Finance Dashboard

**Actor:** Individual consumer
**Flow:** User signs up, connects 2-3 personal bank accounts, views consolidated balance and spending categories. Uses transaction search to find specific purchases. Exports monthly statements as CSV.

### UC-02: Small Business Payroll

**Actor:** Small business owner
**Flow:** Owner connects business checking account, adds employees as platform users, schedules recurring payroll transfers. Views audit trail of all outgoing payments.

### UC-03: Freelancer Multi-Bank Tracking

**Actor:** Freelancer with multiple income streams
**Flow:** Connects PayPal, Stripe deposit accounts, and personal bank. Filters transactions by "income" category. Exports quarterly data for tax preparation.

### UC-04: Enterprise Finance Team

**Actor:** CFO + 3 finance analysts
**Flow:** CFO creates organization, invites team with "Viewer" role. Team monitors 10+ corporate accounts. CFO has "Admin" role with transfer authority. All actions logged for SOC 2 audit.

### UC-05: White-Label Partner Integration

**Actor:** Fintech startup
**Flow:** Partner licenses Horizon's API on Enterprise tier. Embeds account aggregation and transfer features in their own product. Uses webhooks for real-time balance updates.

### UC-06: Cross-Border User

**Actor:** International user
**Flow:** User in Germany selects locale. Dashboard displays amounts in EUR with German date formatting. UI renders in selected language. GDPR controls visible in settings.

### UC-07: Compliance Officer Audit

**Actor:** Internal compliance officer
**Flow:** Reviews audit logs filtered by date range and action type. Exports compliance report. Verifies all transfers have proper authorization records.

### UC-08: Self-Service Account Recovery

**Actor:** User who forgot password
**Flow:** Clicks "Forgot password" on login. Receives reset link via email. Sets new password meeting complexity requirements. Logs in successfully. Old sessions invalidated.

### UC-09: Mobile-Money Collection (ioTec Pay)

**Actor:** Business operator (e.g. Feyti Medical Group front desk)
**Flow:** Operator opens the Wallet page, enters the customer's phone number, amount in UGX, and network. A payment prompt is pushed to the customer's phone. The operator watches live status; on approval the funds settle to the ioTec wallet, a webhook (and/or polling) confirms `Success`, the ledger records it, and the wallet balance increases. Failed or abandoned prompts are recorded as `Failed`/`Pending` and never count toward the balance.

---

## 6. System Architecture

```
                    ┌─────────────────────────────────┐
                    │         Next.js Frontend         │
                    │   (SSR + Client Components)      │
                    ├─────────────────────────────────┤
                    │      Middleware Layer             │
                    │  - Auth guard                    │
                    │  - Security headers              │
                    │  - Rate limiting                 │
                    │  - Plan enforcement              │
                    ├─────────────────────────────────┤
                    │      Server Actions              │
                    │  - Input validation (Zod)        │
                    │  - Business logic                │
                    │  - Audit logging                 │
                    │  - Error handling                │
                    ├──────┬───────┬───────┬───────────┤
                    │      │       │       │           │
              ┌─────▼──┐┌──▼───┐┌──▼───┐┌──▼─────┐    │
              │Appwrite ││Plaid ││Dwolla││ioTec   │    │
              │(Auth,   ││(Bank ││(ACH  ││Pay     │    │
              │DB,      ││Data) ││Rail) ││(Mobile │    │
              │Ledger)  ││      ││      ││Money)  │    │
              └─────────┘└──────┘└──────┘└────┬───┘    │
                                              │        │
                              webhook ◄───────┘        │
                    /api/iotec/webhook (secret-gated,  │
                    re-verifies status with ioTec)     │
```

**ioTec Pay collection flow:**
1. Operator submits phone + amount + network on `/wallet`.
2. Server action writes a `Pending` ledger row, then calls ioTec `collect`.
3. ioTec pushes a prompt to the payer's phone (async settlement).
4. Confirmation arrives two ways, both authoritative (re-fetch from ioTec):
   - **Webhook** `POST /api/iotec/webhook?secret=…` (server-to-server), and
   - **Client polling** of `checkCollectionStatus` while the operator waits.
5. Ledger row transitions to `Success`/`Failed`; balance = Σ `Success`.

---

## 7. Revision History

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2024-01-01 | Initial MVP — tutorial-based implementation |
| 2.0 | 2026-06-26 | Complete SRS rewrite after critical design review. Added: security hardening, self-service features, business model, accessibility, i18n, enterprise features, compliance requirements. See Section 2 for full corrective action plan. |
| 2.1 | 2026-07-10 | Reliability & security pass: fixed 33 user-facing bugs (auth error surfacing, null-safety, typos); hardened CSP for production hosts, timing-safe signature check, mandatory production signing key, Permissions-Policy; UI polish (password toggle, empty states). |
| 2.2 | 2026-07-10 | Added ioTec Pay mobile-money collections & wallet (§3.5, UC-09, NFR-SEC-10/11). Ledger-first ordering removes webhook race; balance sums all confirmed collections. |
