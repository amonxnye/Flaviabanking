#!/usr/bin/env node
/**
 * One-time AgentStudio setup for this app.
 *
 * Registers the three read-only tools this app exposes under
 * /api/agentstudio/tools/<name>, creates the agent, and prints the
 * environment variables and `firebase apphosting:secrets:set` commands.
 *
 * Usage:
 *   STUDIO_API_KEY=sk_... APP_URL=https://your-domain node scripts/agentstudio-setup.mjs
 *
 * Options:
 *   --recreate   delete and re-register a tool that already exists (its old
 *                signing secret cannot be shown again, so this is the only way
 *                to get a new one)
 *
 * Nothing is written to disk. Signing secrets are printed once — copy them
 * straight into your secret manager.
 * Docs: https://agentstudio--ridelinkx.us-east4.hosted.app/docs.md
 */

const STUDIO = (process.env.STUDIO_URL || "https://agentstudio--ridelinkx.us-east4.hosted.app").replace(/\/$/, "");
const SK = process.env.STUDIO_API_KEY;
const APP_URL = (process.env.APP_URL || "").replace(/\/$/, "");
const RECREATE = process.argv.includes("--recreate");

if (!SK || !SK.startsWith("sk_")) fail("Set STUDIO_API_KEY to your sk_... key (never commit it).");
if (!/^https:\/\/[^/]+$/.test(APP_URL)) fail("Set APP_URL to the public https origin of this app, e.g. https://flaviafintech--silkevents-ug.us-east4.hosted.app");

// Mirrors app/api/agentstudio/tools/[tool]/route.ts. Keep the two in sync.
const TOOLS = [
  {
    name: "get_wallet_balance",
    description:
      "Get the customer's mobile-money wallet balance in UGX. The balance counts only confirmed (Success) collections. Use for questions like 'what is my wallet balance'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_recent_collections",
    description:
      "List the customer's most recent mobile-money collections (payments received into the wallet) with amount, payer phone (masked), network, status and date. Use for 'recent payments', 'did X pay', 'pending collections'.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 10, description: "How many to return (1-10, default 5)" },
        status: { type: "string", enum: ["Success", "Pending", "Failed"], description: "Only collections with this status" },
      },
    },
  },
  {
    name: "get_linked_accounts",
    description:
      "List the financial-institution accounts the customer manages: their own and their clients'. Returns name, holder ('own' or the client's name), institution, type, last 4 digits, current balance and currency. Use for balance and account questions. This app only records data; it cannot move money.",
    input_schema: { type: "object", properties: {} },
  },
];

const AGENT = {
  name: "Horizon assistant",
  instructions:
    "You are the assistant inside Horizon, an accounting and account-management app used by individuals and businesses to track the accounts they hold at financial institutions, for themselves and for their clients, and to collect mobile-money payments into a wallet. Answer only from the tools. Amounts are in the currency each tool returns (UGX for the wallet). Be brief and polite. You cannot move money or change any account; if asked to, explain that Horizon only records data and point them to the Accounts or Record Transfer pages. If you cannot help, suggest contacting support.",
};

async function studio(method, path, body) {
  const res = await fetch(STUDIO + path, {
    method,
    headers: { Authorization: `Bearer ${SK}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const me = await studio("GET", "/v1/me");
console.log(`Organisation: ${me.name || me.id || JSON.stringify(me)}`);

const existing = await studio("GET", "/v1/tools");
const existingList = Array.isArray(existing) ? existing : existing.tools || existing.data || [];
const byName = new Map(existingList.map((t) => [t.name, t]));

const toolIds = [];
const secrets = [];

for (const tool of TOOLS) {
  const url = `${APP_URL}/api/agentstudio/tools/${tool.name}`;
  const found = byName.get(tool.name);

  if (found && !RECREATE) {
    console.log(`Tool ${tool.name}: already registered (${found.id}); keeping it. Its signing secret cannot be re-shown — run with --recreate to get a new one.`);
    toolIds.push(found.id);
    continue;
  }
  if (found && RECREATE) {
    await studio("DELETE", `/v1/tools/${found.id}`);
    console.log(`Tool ${tool.name}: deleted old registration ${found.id}`);
  }

  const created = await studio("POST", "/v1/tools", { ...tool, kind: "read", url });
  console.log(`Tool ${tool.name}: registered as ${created.id} -> ${url}`);
  toolIds.push(created.id);
  secrets.push([`STUDIO_SECRET_${tool.name.toUpperCase()}`, created.signing_secret]);
}

const agents = await studio("GET", "/v1/agents");
const agentList = Array.isArray(agents) ? agents : agents.agents || agents.data || [];
let agent = agentList.find((a) => a.name === AGENT.name);
if (agent) {
  agent = await studio("PATCH", `/v1/agents/${agent.id}`, { instructions: AGENT.instructions, tool_ids: toolIds });
  console.log(`Agent: updated ${agent.id}`);
} else {
  agent = await studio("POST", "/v1/agents", { ...AGENT, tool_ids: toolIds });
  console.log(`Agent: created ${agent.id}`);
}

console.log("\n=== Environment for the app (do not commit the secrets) ===");
console.log(`STUDIO_URL=${STUDIO}`);
console.log(`STUDIO_AGENT_ID=${agent.id}`);
console.log(`STUDIO_API_KEY=<your sk_ key>`);
for (const [name, value] of secrets) console.log(`${name}=${value}`);
if (secrets.length < TOOLS.length) {
  console.log("(secrets for tools that already existed are not shown; they were printed when first registered)");
}

console.log("\n=== Firebase App Hosting ===");
console.log("firebase apphosting:secrets:set STUDIO_API_KEY");
for (const [name] of secrets) console.log(`firebase apphosting:secrets:set ${name}`);
console.log("Then uncomment the AgentStudio block in apphosting.yaml, set STUDIO_AGENT_ID there, and redeploy.");
console.log("Test the agent in the console Playground before switching it on.");
