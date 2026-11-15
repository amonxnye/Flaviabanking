import crypto from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "./fake-firestore";

const h = vi.hoisted(() => ({
  db: null as unknown as FakeFirestore,
  verifySessionCookie: vi.fn(),
  getDwollaTransferStatus: vi.fn(),
  createAuditLog: vi.fn(),
  resolveAction: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: () => ({ get: () => ({ value: "cookie" }) }) }));
vi.mock("@/lib/firebase/admin", async () =>
  (await import("./fake-firestore")).fakeAdminModule(() => h.db, () => ({ verifySessionCookie: h.verifySessionCookie }))
);
vi.mock("@/lib/audit", () => ({ createAuditLog: h.createAuditLog }));
vi.mock("@/lib/actions/dwolla.actions", () => ({ getDwollaTransferStatus: h.getDwollaTransferStatus }));
vi.mock("@/lib/actions/user.actions", () => ({ getLoggedInUser: async () => ({ $id: "alice" }) }));
vi.mock("@/lib/agentstudio/client", async (orig) => ({
  ...(await orig<typeof import("@/lib/agentstudio/client")>()),
  isAssistantConfigured: () => true,
  resolveAction: h.resolveAction,
}));

import { getSessionUid } from "@/lib/session";
import { refreshPendingTransfers, syncTransferByUrl } from "@/lib/transfers";
import { isValidDwollaSignature } from "@/lib/webhook-signature";
import { resolveAssistantAction } from "@/lib/actions/assistant.actions";
import { signConversation } from "@/lib/agentstudio/security";
import { StudioError } from "@/lib/agentstudio/client";

beforeEach(() => {
  h.db = new FakeFirestore();
  vi.clearAllMocks();
});

describe("session (D27)", () => {
  it("checks for revoked sessions, so logout ends copied cookies", async () => {
    h.verifySessionCookie.mockResolvedValue({ uid: "alice" });
    await getSessionUid();
    expect(h.verifySessionCookie).toHaveBeenCalledWith("cookie", true);
  });

  it("treats a revoked cookie as signed out", async () => {
    h.verifySessionCookie.mockRejectedValue(Object.assign(new Error("revoked"), { code: "auth/session-cookie-revoked" }));
    expect(await getSessionUid()).toBeNull();
  });
});

describe("transfer status sync (D3)", () => {
  const url = "https://dwolla/transfers/T1";

  it("stores Dwolla's status and writes the audit entry", async () => {
    h.db.col("transactions").set("tx1", { senderId: "alice", status: "pending", dwollaTransferUrl: url });
    h.getDwollaTransferStatus.mockResolvedValue("failed");

    expect(await syncTransferByUrl(url)).toBe("failed");
    expect(h.db.col("transactions").get("tx1")?.status).toBe("failed");
    expect(h.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "transfer.fail", resourceId: "tx1" }));
  });

  it("does not change a finished transfer", async () => {
    h.db.col("transactions").set("tx1", { senderId: "alice", status: "processed", dwollaTransferUrl: url });
    h.getDwollaTransferStatus.mockResolvedValue("pending");
    await syncTransferByUrl(url);
    expect(h.db.col("transactions").get("tx1")?.status).toBe("processed");
  });

  it("re-checks stale pending transfers on page load", async () => {
    h.db.col("transactions").set("tx1", { senderId: "alice", status: "pending", dwollaTransferUrl: url });
    h.getDwollaTransferStatus.mockResolvedValue("processed");
    const old = new Date(Date.now() - 5 * 60_000).toISOString();
    const docs = await refreshPendingTransfers([{ $id: "tx1", $createdAt: old, senderId: "alice", status: "pending", dwollaTransferUrl: url }]);
    expect(docs[0].status).toBe("processed");
    expect(h.createAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "transfer.complete" }));
  });
});

describe("Dwolla webhook signature", () => {
  it("accepts only bodies signed with the secret", () => {
    const body = '{"topic":"transfer_completed"}';
    const sig = crypto.createHmac("sha256", "s3cret").update(body).digest("hex");
    expect(isValidDwollaSignature(body, sig, "s3cret")).toBe(true);
    expect(isValidDwollaSignature(body + " ", sig, "s3cret")).toBe(false);
    expect(isValidDwollaSignature(body, sig, undefined)).toBe(false);
  });
});

describe("assistant action card (D28)", () => {
  const token = () => signConversation("alice", "conv1");

  it("closes the card when the action was already completed", async () => {
    h.resolveAction.mockRejectedValue(new StudioError("done", "conflict"));
    expect(await resolveAssistantAction(token(), "a1", "confirm")).toMatchObject({ ok: false, settled: true });
  });

  it("closes the card when we cannot tell whether it ran", async () => {
    h.resolveAction.mockRejectedValue(new StudioError("slow", "timeout"));
    expect(await resolveAssistantAction(token(), "a1", "confirm")).toMatchObject({ ok: false, settled: true });
  });

  it("lets the customer retry when the assistant was busy", async () => {
    h.resolveAction.mockRejectedValue(new StudioError("busy", "busy"));
    expect(await resolveAssistantAction(token(), "a1", "confirm")).toMatchObject({ ok: false, settled: false });
  });
});
