import "server-only";

// Server-only module (not "use server"): these functions move money, so they
// must never be callable from the browser. Callers check the session first.

import { Client } from "dwolla-v2";

const getEnvironment = (): "production" | "sandbox" => {
  const environment = process.env.DWOLLA_ENV as string;

  switch (environment) {
    case "sandbox":
      return "sandbox";
    case "production":
      return "production";
    default:
      throw new Error(
        "Dwolla environment should either be set to `sandbox` or `production`"
      );
  }
};

// Created on first use, so a missing env var fails the Dwolla call that needs
// it instead of crashing every page that imports this module.
let client: Client | null = null;
const dwollaClient = () => {
  if (!client) {
    client = new Client({
      environment: getEnvironment(),
      key: process.env.DWOLLA_KEY as string,
      secret: process.env.DWOLLA_SECRET as string,
    });
  }
  return client;
};

// Create a Dwolla Funding Source using a Plaid Processor Token
export const createFundingSource = async (
  options: CreateFundingSourceOptions
) => {
  try {
    return await dwollaClient()
      .post(`customers/${options.customerId}/funding-sources`, {
        name: options.fundingSourceName,
        plaidToken: options.plaidToken,
      })
      .then((res) => res.headers.get("location"));
  } catch (err) {
    console.error("Creating a Funding Source Failed: ", err);
  }
};

export const createOnDemandAuthorization = async () => {
  try {
    const onDemandAuthorization = await dwollaClient().post(
      "on-demand-authorizations"
    );
    const authLink = onDemandAuthorization.body._links;
    return authLink;
  } catch (err) {
    console.error("Creating an On Demand Authorization Failed: ", err);
  }
};

/** Find a live Dwolla customer by email, so a retried sign-up can reuse it. */
export const findDwollaCustomerByEmail = async (email: string): Promise<string | null> => {
  try {
    const res = await dwollaClient().get("customers", { email, limit: "1" });
    const customer = res.body?._embedded?.customers?.[0];
    if (!customer || customer.status === "deactivated") return null;
    return customer._links?.self?.href ?? null;
  } catch (err) {
    console.error("Looking up a Dwolla Customer Failed: ", err);
    return null;
  }
};

export const createDwollaCustomer = async (
  newCustomer: NewDwollaCustomerParams
) => {
  // A failed sign-up can leave a customer behind; reuse it instead of letting
  // Dwolla reject the email as a duplicate forever.
  const existing = await findDwollaCustomerByEmail(newCustomer.email);
  if (existing) return existing;

  try {
    return await dwollaClient()
      .post("customers", newCustomer)
      .then((res) => res.headers.get("location"));
  } catch (err) {
    console.error("Creating a Dwolla Customer Failed: ", err);
  }
};

/**
 * Start a transfer. Throws on failure (callers must surface it).
 * The idempotency key makes a retried request return the same transfer
 * instead of moving the money twice.
 */
export const createTransfer = async (
  { sourceFundingSourceUrl, destinationFundingSourceUrl, amount }: TransferParams,
  idempotencyKey: string
): Promise<string> => {
  const requestBody = {
    _links: {
      source: {
        href: sourceFundingSourceUrl,
      },
      destination: {
        href: destinationFundingSourceUrl,
      },
    },
    amount: {
      currency: "USD",
      value: amount,
    },
  };
  const res = await dwollaClient().post("transfers", requestBody, {
    "Idempotency-Key": idempotencyKey,
  });
  const location = res.headers.get("location");
  if (!location) throw new Error("Dwolla did not return a transfer reference.");
  return location;
};

/** Authoritative transfer status: pending, processed, failed or cancelled. */
export const getDwollaTransferStatus = async (transferUrl: string): Promise<string> => {
  const res = await dwollaClient().get(transferUrl);
  return String(res.body?.status ?? "");
};

/** Deactivate a customer when its owner deletes their account. Best effort. */
export const deactivateDwollaCustomer = async (customerUrl: string) => {
  try {
    await dwollaClient().post(customerUrl, { status: "deactivated" });
  } catch (err) {
    console.error("Deactivating a Dwolla Customer Failed: ", err);
  }
};

/** Remove a funding source, e.g. when linking a bank fails half way. */
export const removeFundingSource = async (fundingSourceUrl: string) => {
  try {
    await dwollaClient().post(fundingSourceUrl, { removed: true });
  } catch (err) {
    console.error("Removing a Funding Source Failed: ", err);
  }
};

export const addFundingSource = async ({
  dwollaCustomerId,
  processorToken,
  bankName,
}: AddFundingSourceParams) => {
  try {
    // create dwolla auth link
    const dwollaAuthLinks = await createOnDemandAuthorization();

    // add funding source to the dwolla customer & get the funding source url
    const fundingSourceOptions = {
      customerId: dwollaCustomerId,
      fundingSourceName: bankName,
      plaidToken: processorToken,
      _links: dwollaAuthLinks,
    };
    return await createFundingSource(fundingSourceOptions);
  } catch (err) {
    console.error("Transfer fund failed: ", err);
  }
};
