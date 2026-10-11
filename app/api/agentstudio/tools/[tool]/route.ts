import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { verifyStudioSignature } from "@/lib/agentstudio/security";
import { loadWalletForUser } from "@/lib/wallet-ledger";
import { getAccounts } from "@/lib/actions/bank.actions";

/**
 * Tool endpoints called BY AgentStudio on behalf of a signed-in customer.
 *
 * Register each tool (POST /v1/tools) with url:
 *   https://<your-domain>/api/agentstudio/tools/<tool_name>
 * and store its one-time signing secret as STUDIO_SECRET_<TOOL_NAME_UPPERCASE>.
 *
 * Security: every request is signature-verified against the raw body with a
 * per-tool secret and a 5-minute replay window. The customer is identified
 * only by `external_user_id`, which we set from the authenticated session when
 * the conversation was created — never from model-supplied input.
 * All tools here are read-only and return minimal, masked data.
 */

const maskPhone = (phone: string) =>
  phone ? `${"*".repeat(Math.max(phone.length - 3, 0))}${phone.slice(-3)}` : "";

const listInput = z.object({
  limit: z.number().int().min(1).max(10).optional(),
  status: z.enum(["Success", "Pending", "Failed"]).optional(),
});

type Handler = (userId: string, input: unknown) => Promise<unknown>;

const TOOLS: Record<string, Handler> = {
  async get_wallet_balance(userId) {
    const wallet = await loadWalletForUser(userId);
    if (wallet.notConfigured) return { available: false, reason: "Wallet is not set up yet." };
    return {
      available: true,
      balance: wallet.balance,
      currency: wallet.currency,
      note: "Balance counts only confirmed (Success) mobile-money collections.",
    };
  },

  async list_recent_collections(userId, input) {
    const parsed = listInput.safeParse(input ?? {});
    if (!parsed.success) throw new BadInput("limit must be 1-10; status must be Success, Pending or Failed.");
    const { limit = 5, status } = parsed.data;

    const wallet = await loadWalletForUser(userId);
    const rows = wallet.transactions
      .filter((t) => !status || t.status === status)
      .slice(0, limit)
      .map((t) => ({
        amount: t.amount,
        currency: t.currency,
        payer: maskPhone(t.phone),
        network: t.channel,
        status: t.status,
        note: t.note || "",
        date: t.createdAt,
      }));
    return { count: rows.length, collections: rows };
  },

  async get_linked_accounts(userId) {
    const accounts = await getAccounts({ userId });
    const data: Array<Record<string, unknown>> = accounts?.data ?? [];
    return {
      count: data.length,
      accounts: data.map((a) => ({
        name: a.name,
        type: a.type,
        last4: a.mask,
        availableBalance: a.availableBalance,
        currentBalance: a.currentBalance,
        currency: "USD",
      })),
    };
  },
};

class BadInput extends Error {}

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  const toolName = params.tool;
  const handler = TOOLS[toolName];
  if (!handler) return NextResponse.json({ error: "Unknown tool" }, { status: 404 });

  // Must read the raw body BEFORE parsing — the signature covers the exact bytes.
  const rawBody = await request.text();

  const secret = process.env[`STUDIO_SECRET_${toolName.toUpperCase()}`];
  const valid = verifyStudioSignature({
    rawBody,
    timestamp: request.headers.get("x-studio-timestamp"),
    signature: request.headers.get("x-studio-signature"),
    secret,
  });
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  let body: { tool?: string; input?: unknown; external_user_id?: string };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.tool !== toolName) {
    return NextResponse.json({ error: "Tool mismatch" }, { status: 400 });
  }
  const userId = body.external_user_id;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing user" }, { status: 400 });
  }

  try {
    const result = await handler(userId, body.input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BadInput) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(`AgentStudio tool ${toolName} failed:`, error);
    return NextResponse.json({ error: "Tool failed" }, { status: 500 });
  }
}
