import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { syncTransferByUrl } from "@/lib/transfers";
import { isValidDwollaSignature } from "@/lib/webhook-signature";

/**
 * Dwolla webhook receiver: keeps stored transfer statuses in sync.
 *
 * Create a Dwolla webhook subscription to
 *   https://<your-domain>/api/dwolla/webhook
 * and store its secret as DWOLLA_WEBHOOK_SECRET.
 *
 * Security: the body is signed (X-Request-Signature-SHA-256 = HMAC-SHA256 of
 * the raw body). We only read the transfer link from it, then re-fetch the
 * authoritative status from Dwolla before writing anything.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const valid = isValidDwollaSignature(
    rawBody,
    request.headers.get("x-request-signature-sha-256"),
    process.env.DWOLLA_WEBHOOK_SECRET
  );
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let event: { topic?: string; _links?: { resource?: { href?: string } } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const href = event._links?.resource?.href;
  if (!event.topic?.includes("transfer") || !href) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const status = await syncTransferByUrl(href);
    return NextResponse.json({ received: true, status });
  } catch (error) {
    console.error("Dwolla webhook processing failed:", error);
    // Non-2xx so Dwolla retries the delivery.
    return NextResponse.json({ error: "Temporary failure" }, { status: 503 });
  }
}
