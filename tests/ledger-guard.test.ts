import { describe, expect, it } from "vitest";
import { canChangeLedgerStatus } from "@/lib/iotec/client";

describe("wallet ledger guard (D14)", () => {
  it("lets in-flight rows move", () => {
    expect(canChangeLedgerStatus("Pending", "Success")).toBe(true);
    expect(canChangeLedgerStatus("Indeterminate", "Failed")).toBe(true);
    expect(canChangeLedgerStatus("Sent", "Processing")).toBe(true);
  });

  it("never changes a settled row", () => {
    expect(canChangeLedgerStatus("Success", "Pending")).toBe(false);
    expect(canChangeLedgerStatus("Success", "Failed")).toBe(false);
    expect(canChangeLedgerStatus("Failed", "Success")).toBe(false);
    expect(canChangeLedgerStatus("Cancelled", "Success")).toBe(false);
  });

  it("ignores no-op writes", () => {
    expect(canChangeLedgerStatus("Pending", "Pending")).toBe(false);
  });
});
