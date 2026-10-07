import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getTransactionStatus, type IotecStatus } from "@/lib/iotec/client";
import { syncLedgerStatus } from "@/lib/actions/iotec.actions";

/**
 * ioTec Pay callback/webhook receiver.
 *
 * Configure this URL in the ioTec wallet settings as:
 *   https://<your-domain>/api/iotec/webhook?secret=<IOTEC_WEBHOOK_SECRET>
 *
 * Security model: we do NOT trust the callback body. We only read the
 * transaction id from it, then re-fetch the authoritative status from ioTec
 * before updating our ledger. The shared secret gates who can trigger a lookup.
 */
export async function POST(request: NextRequest) {
  const expectedSecret = process.env.IOTEC_WEBHOOK_SECRET;
  const providedSecret =
    request.nextUrl.searchParams.get("secret") ||
    request.headers.get("x-iotec-secret");

  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // ioTec may send form-encoded or empty bodies; fall through to param lookup.
  }

  const transactionId =
    (body.id as string) ||
    (body.transactionId as string) ||
    (body.internalId as string) ||
    request.nextUrl.searchParams.get("id") ||
    "";

  if (!transactionId) {
    return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
  }

  try {
    // Authoritative re-fetch, then persist.
    const txn = await getTransactionStatus(transactionId);
    await syncLedgerStatus(
      transactionId,
      txn.status as IotecStatus,
      txn.externalId as string | undefined
    );
    return NextResponse.json({ received: true, status: txn.status });
  } catch (error) {
    console.error("ioTec webhook processing failed:", error);
    // 200 so ioTec does not hammer retries on our transient errors; we log it.
    return NextResponse.json({ received: true, deferred: true });
  }
}

// Some providers verify the endpoint with a GET first.
export async function GET() {
  return NextResponse.json({ ok: true });
}
