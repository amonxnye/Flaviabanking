import "server-only";

/**
 * ioTec Pay API client.
 *
 * Endpoints and hosts are env-overridable so they can be pointed at sandbox vs
 * production, or adjusted if ioTec changes a path, without code changes.
 * Defaults match ioTec Pay's documented API (https://iotec.io/docs/pay).
 *
 * Required environment variables:
 *   IOTEC_CLIENT_ID       - OAuth client id (e.g. pay-xxxx)
 *   IOTEC_CLIENT_SECRET   - OAuth client secret  (NEVER commit this)
 *   IOTEC_WALLET_ID       - Wallet that receives collected funds
 * Optional (have sane defaults):
 *   IOTEC_AUTH_URL        - default https://id.iotec.io/connect/token
 *   IOTEC_BASE_URL        - default https://pay.iotec.io
 *   IOTEC_COLLECT_PATH    - default /api/collections/collect
 *   IOTEC_STATUS_PATH     - default /api/collections/{id}
 */

const AUTH_URL = process.env.IOTEC_AUTH_URL || "https://id.iotec.io/connect/token";
const BASE_URL = process.env.IOTEC_BASE_URL || "https://pay.iotec.io";
const COLLECT_PATH = process.env.IOTEC_COLLECT_PATH || "/api/collections/collect";
const STATUS_PATH = process.env.IOTEC_STATUS_PATH || "/api/collections/{id}";

export type IotecChannel = "Mtn" | "Airtel";

// ioTec transaction lifecycle. Anything not clearly success/failure is "in flight".
export type IotecStatus =
  | "New"
  | "Pending"
  | "Sent"
  | "Processing"
  | "Success"
  | "Failed"
  | "Cancelled"
  | "Indeterminate";

export interface CollectRequest {
  amount: number;
  /** MSISDN in 2567XXXXXXXX / 2567XXXXXXXX form (no leading +). */
  payer: string;
  channel: IotecChannel;
  externalId: string;
  payerNote?: string;
  payeeNote?: string;
}

export interface IotecTransaction {
  id: string;
  status: IotecStatus;
  statusMessage?: string;
  amount?: number;
  currency?: string;
  externalId?: string;
  [key: string]: unknown;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Cache the bearer token in module memory until shortly before it expires.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 30_000) {
    return cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: requireEnv("IOTEC_CLIENT_ID"),
    client_secret: requireEnv("IOTEC_CLIENT_SECRET"),
  });

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ioTec auth failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in?: number };
  if (!json.access_token) {
    throw new Error("ioTec auth response missing access_token");
  }

  const expiresInMs = (json.expires_in ?? 3600) * 1000;
  cachedToken = { value: json.access_token, expiresAt: now + expiresInMs };
  return cachedToken.value;
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
}

/**
 * Initiate a mobile-money collection. This triggers a prompt on the payer's
 * phone; the transaction settles asynchronously (confirm via webhook/status).
 */
export async function initiateCollection(req: CollectRequest): Promise<IotecTransaction> {
  const payload = {
    category: "MobileMoney",
    currency: "UGX",
    walletId: requireEnv("IOTEC_WALLET_ID"),
    externalId: req.externalId,
    payer: req.payer,
    amount: req.amount,
    channel: req.channel,
    payerNote: req.payerNote ?? "Payment to Feyti Medical Group",
    payeeNote: req.payeeNote ?? "Collection",
  };

  const res = await authedFetch(COLLECT_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ioTec collection failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  return (await res.json()) as IotecTransaction;
}

/** Fetch the authoritative status of a collection from ioTec. */
export async function getTransactionStatus(transactionId: string): Promise<IotecTransaction> {
  const path = STATUS_PATH.replace("{id}", encodeURIComponent(transactionId));
  const res = await authedFetch(path, { method: "GET" });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ioTec status check failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  return (await res.json()) as IotecTransaction;
}

export function isSuccess(status: IotecStatus): boolean {
  return status === "Success";
}

export function isFailure(status: IotecStatus): boolean {
  return status === "Failed" || status === "Cancelled";
}

export function isPending(status: IotecStatus): boolean {
  return !isSuccess(status) && !isFailure(status);
}
