import { describe, expect, it } from "vitest";
import { canChangeTransferStatus, displayStatus, toTransferStatus } from "@/lib/transfer-status";

describe("transfer status state machine (D3)", () => {
  it("lets pending move to any terminal state", () => {
    expect(canChangeTransferStatus("pending", "processed")).toBe(true);
    expect(canChangeTransferStatus("pending", "failed")).toBe(true);
    expect(canChangeTransferStatus("pending", "cancelled")).toBe(true);
  });

  it("never changes a terminal state", () => {
    expect(canChangeTransferStatus("processed", "failed")).toBe(false);
    expect(canChangeTransferStatus("failed", "processed")).toBe(false);
    expect(canChangeTransferStatus("cancelled", "pending")).toBe(false);
  });

  it("rejects unknown status strings", () => {
    expect(toTransferStatus("reclaimed")).toBeNull();
    expect(toTransferStatus("processed")).toBe("processed");
  });

  it("shows a failed transfer as Failed even when it is old", () => {
    expect(displayStatus({ transferStatus: "failed", date: "2020-01-01" })).toBe("Failed");
  });

  it("uses Plaid's pending flag for bank transactions, not the date", () => {
    expect(displayStatus({ pending: true, date: "2020-01-01" })).toBe("Processing");
    expect(displayStatus({ pending: false, date: new Date().toISOString() })).toBe("Success");
  });
});
