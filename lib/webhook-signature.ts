import "server-only";
import crypto from "crypto";

/** Dwolla signs webhooks with X-Request-Signature-SHA-256 = HMAC-SHA256(secret, rawBody) in hex. */
export function isValidDwollaSignature(rawBody: string, signature: string | null, secret: string | undefined) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
