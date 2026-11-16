import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "./fake-firestore";

const h = vi.hoisted(() => ({
  db: null as unknown as FakeFirestore,
  uid: "alice" as string | null,
  auth: { verifyIdToken: vi.fn(), deleteUser: vi.fn() },
  dwolla: { createDwollaCustomer: vi.fn(), addFundingSource: vi.fn(), removeFundingSource: vi.fn() },
  plaid: { itemPublicTokenExchange: vi.fn(), accountsGet: vi.fn(), processorTokenCreate: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/firebase/admin", async () =>
  (await import("./fake-firestore")).fakeAdminModule(() => h.db, () => h.auth)
);
vi.mock("@/lib/session", () => ({
  getSessionUid: async () => h.uid,
  createSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ createAuditLog: vi.fn() }));
vi.mock("@/lib/actions/dwolla.actions", () => h.dwolla);
vi.mock("@/lib/plaid", () => ({ plaidClient: h.plaid }));

import { exchangePublicToken, signIn, signUp } from "@/lib/actions/user.actions";

const signUpInput = {
  idToken: "tok",
  email: "alice@example.com",
  firstName: "Alice",
  lastName: "Ng",
  address1: "1 Main Street",
  city: "Kampala",
  state: "NY",
  postalCode: "10001",
  dateOfBirth: "1990-01-01",
  ssn: "1234",
};

beforeEach(() => {
  h.db = new FakeFirestore();
  h.uid = "alice";
  Object.values(h.auth).forEach((f) => f.mockReset());
  Object.values(h.dwolla).forEach((f) => f.mockReset());
  Object.values(h.plaid).forEach((f) => f.mockReset());
  h.auth.verifyIdToken.mockResolvedValue({ uid: "alice", email: "alice@example.com" });
  h.auth.deleteUser.mockResolvedValue(undefined);
});

describe("sign-up (D23, D24)", () => {
  it("never deletes a login that already has a profile", async () => {
    h.db.col("users").set("alice", { email: "alice@example.com" });
    const res = await signUp(signUpInput);
    expect(res).toEqual({ error: "An account with this email already exists. Please sign in." });
    expect(h.auth.deleteUser).not.toHaveBeenCalled();
    expect(h.dwolla.createDwollaCustomer).not.toHaveBeenCalled();
  });

  it("removes the new login if sign-up fails before the profile is saved", async () => {
    h.dwolla.createDwollaCustomer.mockResolvedValue(undefined);
    const res = await signUp(signUpInput);
    expect(res).toHaveProperty("error");
    expect(h.auth.deleteUser).toHaveBeenCalledWith("alice");
  });

  it("finishes a sign-up whose login exists but whose profile does not", async () => {
    h.dwolla.createDwollaCustomer.mockResolvedValue("https://dwolla/customers/c1");
    const res = await signUp(signUpInput);
    expect(res).toMatchObject({ $id: "alice", dwollaCustomerId: "c1" });
    expect(h.db.col("users").get("alice")).toBeDefined();
  });

  it("points a login without a profile back to sign-up", async () => {
    const res = await signIn({ idToken: "tok" });
    expect((res as { error: string }).error).toMatch(/Go to Sign up/);
  });
});

describe("bank linking (D8, D9, D20)", () => {
  beforeEach(() => {
    h.db.col("users").set("alice", { dwollaCustomerId: "c1", planTier: "free" });
    h.plaid.itemPublicTokenExchange.mockResolvedValue({ data: { access_token: "tok", item_id: "item" } });
    h.plaid.accountsGet.mockResolvedValue({ data: { accounts: [{ account_id: "acc1", name: "Checking" }] } });
    h.plaid.processorTokenCreate.mockResolvedValue({ data: { processor_token: "proc" } });
    h.dwolla.addFundingSource.mockResolvedValue("https://dwolla/fs/1");
  });

  it("requires a session and ignores any user sent by the browser", async () => {
    h.uid = null;
    const res = await exchangePublicToken({ publicToken: "pub", user: { $id: "bob" } } as never);
    expect(res).toEqual({ error: "Please sign in again." });
    expect(h.plaid.itemPublicTokenExchange).not.toHaveBeenCalled();
  });

  it("links the bank to the signed-in user", async () => {
    const res = await exchangePublicToken({ publicToken: "pub" });
    expect(res).toEqual({ publicTokenExchange: "complete" });
    expect(h.db.all("banks")[0][1]).toMatchObject({ userId: "alice", fundingSourceUrl: "https://dwolla/fs/1" });
  });

  it("returns an error and removes the funding source if saving fails", async () => {
    const queryProto = Object.getPrototypeOf(h.db.collection("banks"));
    vi.spyOn(queryProto, "add").mockRejectedValueOnce(new Error("write failed"));
    const res = await exchangePublicToken({ publicToken: "pub" });
    expect(res).toEqual({ error: "We could not link this bank. Please try again." });
    expect(h.dwolla.removeFundingSource).toHaveBeenCalledWith("https://dwolla/fs/1");
  });

  it("enforces the plan's bank limit", async () => {
    h.db.col("banks").set("b1", { userId: "alice" });
    h.db.col("banks").set("b2", { userId: "alice" });
    const res = await exchangePublicToken({ publicToken: "pub" });
    expect((res as { error: string }).error).toMatch(/allows up to 2 connected banks/);
    expect(h.plaid.itemPublicTokenExchange).not.toHaveBeenCalled();
  });
});
