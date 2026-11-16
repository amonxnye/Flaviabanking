import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "./fake-firestore";

const h = vi.hoisted(() => ({
  db: null as unknown as FakeFirestore,
  uid: "alice" as string | null,
  sync: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", async () => (await import("./fake-firestore")).fakeAdminModule(() => h.db));
vi.mock("@/lib/session", () => ({ getSessionUid: async () => h.uid }));
vi.mock("@/lib/transfers", () => ({ refreshPendingTransfers: async (d: unknown[]) => d }));
vi.mock("@/lib/plaid", () => ({
  plaidClient: {
    transactionsSync: h.sync,
    accountsGet: async () => ({
      data: {
        accounts: [{ account_id: "accA", balances: { available: 10, current: 10 }, name: "Checking", mask: "0000", type: "depository", subtype: "checking" }],
        item: { institution_id: "ins_1" },
      },
    }),
    institutionsGetById: async () => ({ data: { institution: { institution_id: "ins_1" } } }),
  },
}));

import { getTransactions } from "@/lib/accounts";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";

const page = (ids: string[], hasMore: boolean, next: string) => ({
  data: {
    added: ids.map((id) => ({ transaction_id: id, name: id, payment_channel: "online", account_id: "a", amount: 1, pending: false, category: null, date: "2026-01-01", logo_url: null })),
    has_more: hasMore,
    next_cursor: next,
  },
});

beforeEach(() => {
  h.db = new FakeFirestore();
  h.db.col("banks").set("bankA", { userId: "alice", accountId: "accA", accessToken: "tok-A" });
  h.db.col("banks").set("bankB", { userId: "bob", accountId: "accB", accessToken: "tok-B" });
  h.uid = "alice";
  h.sync.mockReset();
});

describe("Plaid transaction sync (D7)", () => {
  it("passes the cursor, keeps every page, and stops", async () => {
    h.sync
      .mockResolvedValueOnce(page(["t1", "t2"], true, "c1"))
      .mockResolvedValueOnce(page(["t3"], false, "c2"));

    const txns = await getTransactions({ accessToken: "tok" });

    expect(txns.map((t: { id: string }) => t.id)).toEqual(["t1", "t2", "t3"]);
    expect(h.sync.mock.calls[0][0].cursor).toBeUndefined();
    expect(h.sync.mock.calls[1][0].cursor).toBe("c1");
  });

  it("stops after a fixed number of pages even if Plaid keeps saying has_more", async () => {
    h.sync.mockResolvedValue(page(["x"], true, "c"));
    await getTransactions({ accessToken: "tok" });
    expect(h.sync).toHaveBeenCalledTimes(10);
  });
});

describe("account access (D2)", () => {
  it("does not return another user's bank account", async () => {
    h.sync.mockResolvedValue(page([], false, "c"));
    const res = await getAccount({ appwriteItemId: "bankB" });
    expect(res.data).toBeNull();
  });

  it("returns the user's own account", async () => {
    h.sync.mockResolvedValue(page([], false, "c"));
    const res = await getAccount({ appwriteItemId: "bankA" });
    expect(res.data?.id).toBe("accA");
  });

  it("does not list another user's accounts", async () => {
    const res = await getAccounts({ userId: "bob" });
    expect(res.totalBanks).toBe(0);
  });
});
