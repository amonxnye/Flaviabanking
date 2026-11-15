import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "./fake-firestore";

const h = vi.hoisted(() => ({
  db: null as unknown as FakeFirestore,
  deleteUser: vi.fn(),
  itemRemove: vi.fn(),
  deactivate: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", async () =>
  (await import("./fake-firestore")).fakeAdminModule(() => h.db, () => ({ deleteUser: h.deleteUser }))
);
vi.mock("@/lib/session", () => ({ getSessionUid: async () => "alice", clearSessionCookie: vi.fn() }));
vi.mock("@/lib/plaid", () => ({ plaidClient: { itemRemove: h.itemRemove } }));
vi.mock("@/lib/actions/dwolla.actions", () => ({ deactivateDwollaCustomer: h.deactivate }));

import { deleteUserAccount } from "@/lib/actions/settings.actions";

beforeEach(() => {
  h.db = new FakeFirestore();
  vi.clearAllMocks();
  h.itemRemove.mockResolvedValue({});
  h.db.col("users").set("alice", { dwollaCustomerUrl: "https://dwolla/customers/c1" });
  h.db.col("banks").set("bankA", { userId: "alice", accessToken: "tok-A" });
  h.db.col("transactions").set("sent", { senderBankId: "bankA", receiverBankId: "bankB" });
  h.db.col("transactions").set("received", { senderBankId: "bankB", receiverBankId: "bankA" });
  h.db.col("walletTransactions").set("w1", { userId: "alice" });
  h.db.col("walletTransactions").set("w2", { userId: "bob" });
});

describe("deleteUserAccount (D21, D22)", () => {
  it("deletes what the page promises and keeps what it says it keeps", async () => {
    await deleteUserAccount("alice");

    expect(h.db.col("users").has("alice")).toBe(false);
    expect(h.db.col("banks").has("bankA")).toBe(false);
    expect(h.db.col("transactions").has("sent")).toBe(false);
    expect(h.db.col("walletTransactions").has("w1")).toBe(false);
    // Kept: another customer's record and other users' data.
    expect(h.db.col("transactions").has("received")).toBe(true);
    expect(h.db.col("walletTransactions").has("w2")).toBe(true);

    expect(h.itemRemove).toHaveBeenCalledWith({ access_token: "tok-A" });
    expect(h.deactivate).toHaveBeenCalledWith("https://dwolla/customers/c1");
    expect(h.deleteUser).toHaveBeenCalledWith("alice");
  });

  it("still deletes the account when Plaid is down", async () => {
    h.itemRemove.mockRejectedValue(new Error("plaid down"));
    await deleteUserAccount("alice");
    expect(h.deleteUser).toHaveBeenCalled();
  });

  it("deletes the login last, so a failed run can be retried", async () => {
    const queryProto = Object.getPrototypeOf(h.db.collection("x"));
    vi.spyOn(queryProto, "get").mockRejectedValueOnce(new Error("firestore down"));
    await expect(deleteUserAccount("alice")).rejects.toThrow();
    expect(h.deleteUser).not.toHaveBeenCalled();
    expect(h.db.col("users").has("alice")).toBe(true);
  });
});
