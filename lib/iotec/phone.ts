import type { IotecChannel } from "./client";

/**
 * Normalize a Ugandan phone number to MSISDN form: 2567XXXXXXXX.
 * Accepts 0772123456, +256772123456, 256772123456, 772123456.
 * Returns null if it is not a valid Ugandan mobile number.
 */
export function normalizeUgandanMsisdn(input: string): string | null {
  const digits = (input || "").replace(/\D/g, "");

  let local: string;
  if (digits.startsWith("256") && digits.length === 12) {
    local = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 10) {
    local = digits.slice(1);
  } else if (digits.length === 9) {
    local = digits;
  } else {
    return null;
  }

  // Ugandan mobile subscriber numbers are 9 digits starting with 7.
  if (local.length !== 9 || !local.startsWith("7")) {
    return null;
  }

  return `256${local}`;
}

/**
 * Best-effort network detection from the MSISDN prefix. The user can still
 * override in the UI. MTN UG: 077/078/076/039; Airtel UG: 070/074/075.
 */
export function detectChannel(msisdn: string): IotecChannel | null {
  const local = msisdn.startsWith("256") ? msisdn.slice(3) : msisdn;
  const prefix = local.slice(0, 2); // e.g. "77"

  const mtn = ["77", "78", "76", "39"];
  const airtel = ["70", "74", "75"];

  if (mtn.includes(prefix)) return "Mtn";
  if (airtel.includes(prefix)) return "Airtel";
  return null;
}
