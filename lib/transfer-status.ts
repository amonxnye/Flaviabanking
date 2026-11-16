// Transfer status state machine (pure, shared by server and UI).
//
//   pending ──> processed
//      │──────> failed
//      └──────> cancelled
//
// Terminal states never change. Status comes from Dwolla, never from the date.

export type TransferStatus = "pending" | "processed" | "failed" | "cancelled";

const KNOWN: TransferStatus[] = ["pending", "processed", "failed", "cancelled"];
const TERMINAL: TransferStatus[] = ["processed", "failed", "cancelled"];

export function toTransferStatus(value: unknown): TransferStatus | null {
  return KNOWN.includes(value as TransferStatus) ? (value as TransferStatus) : null;
}

export function canChangeTransferStatus(
  from: TransferStatus | null | undefined,
  to: TransferStatus
): boolean {
  if (!from) return true;
  if (TERMINAL.includes(from)) return false;
  return from !== to;
}

export type DisplayStatus = "Processing" | "Success" | "Failed" | "Cancelled";

const DISPLAY: Record<TransferStatus, DisplayStatus> = {
  pending: "Processing",
  processed: "Success",
  failed: "Failed",
  cancelled: "Cancelled",
};

/**
 * Status shown in the transactions table.
 * - Transfers made by this app: their stored Dwolla status.
 * - Plaid bank transactions: Plaid's own `pending` flag.
 * - Transfers saved before statuses were stored: the old date rule
 *   (under 2 days old shows Processing), because nothing better is known.
 */
export function displayStatus(t: {
  transferStatus?: unknown;
  pending?: unknown;
  date: string;
}): DisplayStatus {
  const status = toTransferStatus(t.transferStatus);
  if (status) return DISPLAY[status];
  if (typeof t.pending === "boolean") return t.pending ? "Processing" : "Success";

  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  return new Date(t.date) > twoDaysAgo ? "Processing" : "Success";
}
