import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "./fake-firestore";
import { encryptId } from "@/lib/utils";

const h = vi.hoisted(() => ({
  db: null as unknown as FakeFirestore,
  uid: "alice" as string | null,
  createTransfer: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", async () => (await import("./fake-firestore")).fakeAdminModule(() => h.db));
vi.mock("@/lib/session", () => ({ getSessionUid: async () => h.uid }));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/lib/actions/dwolla.actions", () => ({ createTransfer: h.createTransfer }));

import { transferFunds } from "@/lib/actions/transfer.actions";

const KEY = "8a6e0804-2bd0-4672-b79d-d97027f9071a";

function seed() {
  h.db = new FakeFirestore();
  const banks = h.db.col("banks");
  banks.set("bankA", { userId: "alice", accountId: "accA", fundingSourceUrl: "https://dwolla/fs/A" });
  banks.set("bankB", { userId: "bob", accountId: "accB", fundingSourceUrl: "https://dwolla/fs/B" });
  banks.set("bankA2", { userId: "alice", accountId: "accA2", fundingSourceUrl: "https://dwolla/fs/A2" });
  h.db.col("users").set("alice", { planTier: "free" });
}

const input = (over: Partial<Parameters<typeof transferFunds>[0]> = {}) => ({
  idempotencyKey: KEY,
  senderBankId: "bankA",
  sharableId: encryptId("accB"),
  amount: "25.00",
  name: "Rent",
  email: "bob@example.com",
  ...over,
});

beforeEach(() => {
  seed();
  h.uid = "alice";
  h.createTransfer.mockReset();
  h.createTransfer.mockResolvedValue("https://dwolla/transfers/T1");
});

describe("transferFunds", () => {
  it("decodes the sharable id on the server and starts the transfer (D1)", async () => {
    const res = await transferFunds(input());
    expect(res).toEqual({ ok: true, transactionId: KEY });
    expect(h.createTransfer).toHaveBeenCalledWith(
      { sourceFundingSourceUrl: "https://dwolla/fs/A", destinationFundingSourceUrl: "https://dwolla/fs/B", amount: "25.00" },
      KEY
    );
    const [, row] = h.db.all("transactions")[0];
    expect(row).toMatchObject({ status: "pending", senderId: "alice", receiverId: "bob", dwollaTransferUrl: "https://dwolla/transfers/T1" });
  });

  it("rejects a forged sharable id", async () => {
    const res = await transferFunds(input({ sharableId: "YWNjQg.0000000000000000" }));
    expect(res.ok).toBe(false);
    expect(h.createTransfer).not.toHaveBeenCalled();
  });

  it("requires a session (D2)", async () => {
    h.uid = null;
    const res = await transferFunds(input());
    expect(res).toMatchObject({ ok: false, error: "Please sign in again." });
    expect(h.createTransfer).not.toHaveBeenCalled();
  });

  it("refuses to send from another user's bank (D2)", async () => {
    h.uid = "bob";
    const res = await transferFunds(input({ sharableId: encryptId("accA2") }));
    expect(res.ok).toBe(false);
    expect(h.createTransfer).not.toHaveBeenCalled();
  });

  it("starts only one transfer for a double click (D4)", async () => {
    const [a, b] = await Promise.all([transferFunds(input()), transferFunds(input())]);
    expect(a.ok && b.ok).toBe(true);
    expect(h.createTransfer).toHaveBeenCalledTimes(1);
    expect(h.db.all("transactions")).toHaveLength(1);
  });

  it("checks self-transfer and amount before any money moves (D5)", async () => {
    expect((await transferFunds(input({ sharableId: encryptId("accA2") }))).ok).toBe(false);
    expect((await transferFunds(input({ amount: "0.50" }))).ok).toBe(false);
    expect(h.createTransfer).not.toHaveBeenCalled();
    expect(h.db.all("transactions")).toHaveLength(0);
  });

  it("reports a Dwolla rejection and marks the row failed (D6)", async () => {
    h.createTransfer.mockRejectedValue(Object.assign(new Error("Invalid funding source"), { status: 400 }));
    const res = await transferFunds(input());
    expect(res).toMatchObject({ ok: false, retryable: false });
    expect(h.db.all("transactions")[0][1].status).toBe("failed");
  });

  it("keeps an unknown outcome pending and retries with the same key (D6)", async () => {
    h.createTransfer.mockRejectedValueOnce(new Error("socket hang up"));
    const first = await transferFunds(input());
    expect(first).toMatchObject({ ok: false, retryable: true });
    expect(h.db.all("transactions")[0][1].status).toBe("pending");

    const retry = await transferFunds(input());
    expect(retry).toEqual({ ok: true, transactionId: KEY });
    expect(h.createTransfer).toHaveBeenCalledTimes(2);
    expect(h.createTransfer.mock.calls[1][1]).toBe(KEY);
  });

  it("enforces the plan's per-transfer limit (D20)", async () => {
    const res = await transferFunds(input({ amount: "1500.00" }));
    expect(res.ok).toBe(false);
    expect(h.createTransfer).not.toHaveBeenCalled();
  });

  it("enforces the plan's monthly transfer count (D20)", async () => {
    for (let i = 0; i < 5; i++) {
      h.db.col("transactions").set(`old${i}`, { senderId: "alice", createdAt: new Date(), status: "processed" });
    }
    const res = await transferFunds(input());
    expect(res.ok).toBe(false);
    expect(h.createTransfer).not.toHaveBeenCalled();
  });
});
