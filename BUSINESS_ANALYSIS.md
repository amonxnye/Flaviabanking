# Horizon (Flaviabanking) — Full System Review & Business Analysis

**Date:** July 2026 · **Branch:** `claude/software-review-usecases-j3b7lr` · **Status:** Post-hardening review

---

## 1. What the System Is

Horizon is a Next.js 14 personal-finance platform that lets a user:

1. **Sign up / sign in** (Appwrite auth, KYC-style fields: SSN last-4, DOB, address)
2. **Connect real bank accounts** via Plaid Link (OAuth to 12,000+ US institutions)
3. **See unified balances and transactions** across all connected banks
4. **Send P2P / ACH transfers** to other Horizon users via Dwolla, using a signed "shareable ID"
5. **Self-serve account management** — settings, GDPR data export, account deletion, billing/usage view

**Stack:** Next.js 14 App Router · TypeScript · Appwrite (auth + DB) · Plaid (aggregation) · Dwolla (ACH) · Sentry (monitoring) · TailwindCSS/ShadCN (UI) · Chart.js.

---

## 2. What's Done (Audit of Completed Work)

| Area | State | Evidence |
|---|---|---|
| Core banking flows | ✅ Working | Plaid link, balance aggregation, transaction sync, Dwolla transfers |
| Security hardening | ✅ Done | HMAC-signed shareable IDs (was reversible Base64), middleware route protection, CSP/HSTS/X-Frame headers, strict Zod validation (SSN, postal, password complexity) |
| Server-side transfer validation | ✅ Done | $1–$10K limits, self-transfer block, Zod schema on the server |
| Reliability bug purge | ✅ Done | 33 bugs fixed: silent auth failures now surfaced to users, null-guards on every page/action, typo fixes (`sharaebleId`, `hiddenl`), debug artifacts removed |
| Error handling UX | ✅ Done | Error boundaries, app-level error page, 404 page, loading skeletons on all routes, auth + transfer error banners |
| Self-service | ✅ Done | Settings (profile edit), GDPR export (Art. 20), account deletion (Art. 17), bank unlink |
| Monetization scaffolding | ✅ Done | 3-tier plan model with enforced limits (`lib/plans.ts`), billing page, usage dashboard |
| Enterprise scaffolding | ✅ Done | RBAC (4 roles + permission matrix), audit logging (login/signup/logout/transfers), i18n framework with RTL |
| Accessibility | ✅ Done | Skip-to-content, ARIA labels/roles, keyboard-accessible logout, non-color debit/credit indicators |
| Documentation | ✅ Done | SRS.md (requirements, 8 use cases, architecture, 6-phase corrective plan), this analysis |
| Build | ✅ Green | `next build` passes; all routes compile |

### What's scaffolded but NOT wired to money or data yet
- **No payment processor for subscriptions** — plans exist in code; there is no Stripe checkout, so no revenue can actually be collected.
- **Plan tier is not persisted per user** — `getPlanForUser` defaults everyone to `free`; limits aren't enforced against a real stored tier.
- **RBAC/organizations have no backing collections** — the permission matrix exists; org membership doesn't.
- **No automated tests or CI** — the largest remaining engineering risk.
- **Single-region, US-only rails** — Plaid US country code, Dwolla US ACH only.

---

## 3. Documentation Review

- **SRS.md** is genuinely useful: traceable requirement IDs, use cases, a corrective-action log that matches what was shipped. It should now be updated each release (add a revision table).
- **README.md** is still largely the upstream tutorial README (1,600+ lines, tutorial branding). It misrepresents the project's current state and should be rewritten to ~150 lines: what Horizon is, setup, env vars, architecture diagram, link to SRS.
- **Gaps:** no API documentation, no runbook (what to do when Plaid/Dwolla degrade), no threat model document, no data-retention policy doc (needed for the GDPR features to mean anything contractually).

---

## 4. Economic Viability — Honest Assessment

### Unit economics per active user (US market, list prices)

| Cost driver | Est. monthly cost/user | Notes |
|---|---|---|
| Plaid (Auth + Transactions) | $0.30 – $1.80 | Per connected account; Transactions is the expensive product. Free plan users with 2 banks cost ~$0.60–$3.60 |
| Dwolla ACH | $0.05 – $0.25/transfer or platform fee | Dwolla now sells platform plans (~$250+/mo minimum) |
| Appwrite Cloud | ~$0.02 – $0.10 | Pro plan amortized |
| Vercel + Sentry | ~$0.05 – $0.15 | Amortized at small scale |
| **Total COGS** | **~$0.50 – $2.50/user/mo** | Dominated by Plaid |

### The verdict on the current model

**As a consumer PFM app at $14.99/mo: viable on paper, brutal in practice.**

- Gross margin on a Pro user is healthy (~80–90%), **but** every *free* user with connected banks costs real Plaid money (~$1–3/mo) while paying nothing. Mint died on exactly this math. Free-tier bank connections are a cash furnace unless conversion to paid exceeds roughly 5–8%, which is well above the consumer-fintech norm of 1–4%.
- The consumer PFM market is a graveyard (Mint shut down; Copilot/Monarch survive at $8–15/mo with heavy differentiation). Horizon currently has no differentiator versus them.
- Fixed floor: Dwolla platform minimums + Plaid production access mean roughly **$500–1,000/mo in fixed costs before the first customer** — the break-even is ~50–70 Pro subscribers, which is achievable, but only if acquisition is near-free.

**Conclusion: the software is economically viable only if the free tier is de-fanged and/or the business pivots up-market.** The engineering built this quarter (RBAC, audit logs, plan limits, GDPR) is exactly the asset that makes the up-market pivot credible.

---

## 5. Recommended Monetization Plan

### Phase A — Stop the bleeding, start charging (0–3 months)
1. **Integrate Stripe Billing** against the existing `lib/plans.ts` tiers (the single highest-ROI task in the repo — pricing exists but nothing collects money).
2. **Restrict the free tier to 1 connected bank, read-only** (no transfers). Transfers become the paywall. This caps Plaid COGS at ~$0.30–1.80/free user and makes the upgrade motion natural.
3. **Persist `planTier` on the user document** and enforce `checkBankLimit`/`checkTransferLimit` server-side at connect/transfer time.
4. Add **annual pricing** (2 months free) to pull cash forward.

### Phase B — Move where the margin is (3–9 months)
5. **Pivot the Enterprise tier from $49.99 "big consumer" to true B2B SMB finance** at $99–299/mo per organization: multi-user orgs (the RBAC is built), shared visibility into company bank accounts, approval workflows on transfers, exportable audit logs. SMBs pay 10× consumer prices for the same Plaid data because it saves bookkeeper hours.
6. **Transaction-based revenue:** take 0.25–0.5% (capped) on instant transfers via Dwolla's push-to-debit, while standard ACH stays free-with-plan. Payments revenue scales with usage, not seats.

### Phase C — Platform revenue (9–18 months)
7. **White-label / API tier:** the Enterprise feature list already promises "API access & webhooks" — sell Horizon as an embeddable money-movement dashboard to credit unions and vertical SaaS at $1–3K/mo. This is where fintech infrastructure margins (Unit, Treasury Prime pattern) actually live.
8. **Data-adjacent upsells** (compliant, opt-in): cash-flow underwriting reports, accountant seat licenses.

### Revenue model summary

| Stream | Price point | Margin | Depends on |
|---|---|---|---|
| Pro subscriptions | $14.99/mo ($149/yr) | ~85% | Stripe integration (Phase A) |
| SMB/Org plans | $99–299/mo | ~90% | Org collections + approval flows (Phase B) |
| Instant-transfer fees | 0.25–0.5%/txn | ~50% | Dwolla push-to-debit (Phase B) |
| White-label/API | $1–3K/mo | ~90% | API layer + docs (Phase C) |

### Pre-revenue blockers to clear (in order)
1. Stripe billing integration
2. Free-tier COGS cap (1 bank, read-only)
3. Test suite + CI (no fintech buyer will onboard without it)
4. README rewrite + API docs
5. SOC 2 readiness path (the audit-log work is the first brick)

---

## 6. Bottom Line

**What's done:** a tutorial codebase has been converted into a hardened, documented, self-service SaaS foundation — security fixed, 33 user-facing bugs removed, GDPR/RBAC/audit/plan-limit scaffolding in place, build green.

**Is it economically viable?** Not as currently configured (free bank connections + no billing = negative unit economics and zero revenue). It **becomes viable** with two weeks of work (Stripe + free-tier caps) and **becomes attractive** with the SMB/organization pivot the codebase is already architected for.

**The monetization plan in one sentence:** charge consumers for transfers, charge businesses for visibility and control, and charge platforms for the rails — in that order.
