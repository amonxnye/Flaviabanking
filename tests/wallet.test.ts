import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "./fake-firestore";

const h = vi.hoisted(() => ({
  db: null as unknown as FakeFirestore,
  initiateCollection: vi.fn(),
  getTransactionStatus: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/firebase/admin", async () => (await import("./fake-firestore")).fakeAdminModule(() => h.db));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/lib/actions/user.actions", () => ({ getLoggedInUser: async () => ({ $id: "alice" }) }));
vi.mock("@/lib/iotec/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/iotec/client")>()),
  initiateCollection: h.initiateCollection,
  getTransactionStatus: h.getTransactionStatus,
}));

import { collectFromUser, getWallet, syncLedgerStatus } from "@/lib/actions/iotec.actions";
import { IotecHttpError } from "@/lib/iotec/client";

const input = { phone: "0772123456", amount: 1000, channel: "Mtn" as const };
const rows = () => h.db.all("walletTransactions").map(([, d]) => d);

beforeEach(() => {
  h.db = new FakeFirestore();
  h.initiateCollection.mockReset();
  h.getTransactionStatus.mockReset();
});

describe("collectFromUser", () => {
  it("does not ask the payer if the ledger row cannot be written (D12)", async () => {
    const queryProto = Object.getPrototypeOf(h.db.collection("walletTransactions"));
    vi.spyOn(queryProto, "add").mockRejectedValueOnce(new Error("write failed"));
    await expect(collectFromUser(input)).rejects.toThrow(/No payment was requested/);
    expect(h.initiateCollection).not.toHaveBeenCalled();
  });

  it("marks a rejected request Failed (D13)", async () => {
    h.initiateCollection.mockRejectedValue(new IotecHttpError("bad request", 400));
    await expect(collectFromUser(input)).rejects.toThrow();
    expect(rows()[0].status).toBe("Failed");
  });

  it("marks an unknown outcome Indeterminate so a callback can still settle it (D13)", async () => {
    h.initiateCollection.mockRejectedValue(new TypeError("fetch failed"));
    await expect(collectFromUser(input)).rejects.toThrow(/could not confirm/);
    expect(rows()[0].status).toBe("Indeterminate");

    await syncLedgerStatus("T9", "Success", rows()[0].externalId);
    expect(rows()[0]).toMatchObject({ status: "Success", iotecTransactionId: "T9" });
  });
});

describe("syncLedgerStatus (D14)", () => {
  it("never changes a settled row", async () => {
    h.db.col("walletTransactions").set("r1", { userId: "alice", iotecTransactionId: "T1", status: "Success", amount: 1000 });
    await syncLedgerStatus("T1", "Failed");
    expect(rows()[0].status).toBe("Success");
  });
});

describe("getWallet (D11, D25)", () => {
  it("re-checks stale in-flight rows with ioTec", async () => {
    const old = new Date(Date.now() - 10 * 60_000);
    h.db.col("walletTransactions").set("r1", { userId: "alice", iotecTransactionId: "T1", status: "Pending", amount: 1000, createdAt: old });
    h.getTransactionStatus.mockResolvedValue({ id: "T1", status: "Success" });

    const wallet = await getWallet();

    expect(h.getTransactionStatus).toHaveBeenCalledWith("T1");
    expect(wallet.balance).toBe(1000);
    expect(wallet.transactions[0].status).toBe("Success");
  });

  it("leaves fresh in-flight rows alone", async () => {
    h.db.col("walletTransactions").set("r1", { userId: "alice", iotecTransactionId: "T1", status: "Pending", amount: 1000, createdAt: new Date() });
    await getWallet();
    expect(h.getTransactionStatus).not.toHaveBeenCalled();
  });

  it("flags a load failure instead of showing a zero balance", async () => {
    vi.spyOn(h.db, "collection").mockImplementationOnce(() => {
      throw new Error("unavailable");
    });
    const wallet = await getWallet();
    expect(wallet.loadFailed).toBe(true);
  });
});
