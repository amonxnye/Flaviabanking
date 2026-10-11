import "server-only";
import crypto from "crypto";

const MAX_SKEW_SECONDS = 300;

/**
 * Verify a signed tool call from AgentStudio.
 * Signature = "sha256=" + HMAC_SHA256(secret, `${timestamp}.${rawBody}`) (hex),
 * compared in constant time. Stale or malformed timestamps are rejected.
 */
export function verifyStudioSignature(params: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string | undefined;
}): boolean {
  const { rawBody, timestamp, signature, secret } = params;
  if (!secret || !timestamp || !signature) return false;
  if (!/^\d+$/.test(timestamp)) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (age > MAX_SKEW_SECONDS) return false;

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * Bind a conversation id to the user it was created for, so a client can never
 * send messages into someone else's conversation by swapping the id. Keyed with
 * the server-only API key; stateless, so no extra storage is needed.
 */
function conversationSig(userId: string, conversationId: string): string {
  return crypto
    .createHmac("sha256", process.env.STUDIO_API_KEY || "")
    .update(`conversation:${userId}:${conversationId}`)
    .digest("hex")
    .slice(0, 32);
}

export function signConversation(userId: string, conversationId: string): string {
  return `${conversationId}.${conversationSig(userId, conversationId)}`;
}

/** Returns the conversation id if the token belongs to this user, else null. */
export function openConversation(userId: string, token: string): string | null {
  const [conversationId, sig] = (token || "").split(".");
  if (!conversationId || !sig || !/^[\w-]+$/.test(conversationId)) return null;

  const expected = conversationSig(userId, conversationId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return conversationId;
}
