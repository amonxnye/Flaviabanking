import "server-only";

/**
 * AgentStudio API client (server-side only).
 *
 * Required environment variables:
 *   STUDIO_URL        - base URL, e.g. https://agentstudio--ridelinkx.us-east4.hosted.app
 *   STUDIO_API_KEY    - secret key (Bearer). Never expose to the browser.
 *   STUDIO_AGENT_ID   - the agent customers chat with
 * Per-tool signing secrets (used by the tool endpoints, see signature.ts):
 *   STUDIO_SECRET_<TOOL_NAME_UPPERCASE>
 */

export interface PendingAction {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  status: string;
  createdAt?: string;
}

export interface StudioReply {
  reply: string;
  pending_actions: PendingAction[];
}

export function isAssistantConfigured(): boolean {
  return Boolean(
    process.env.STUDIO_URL && process.env.STUDIO_API_KEY && process.env.STUDIO_AGENT_ID
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function studioFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const base = requireEnv("STUDIO_URL").replace(/\/$/, "");
  const key = requireEnv("STUDIO_API_KEY");

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
    // Tool calls can take up to 8 rounds x 15s; give the assistant room.
    signal: AbortSignal.timeout(110_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`AgentStudio ${init.method || "GET"} ${path} -> ${res.status}: ${detail.slice(0, 200)}`);
    if (res.status === 429) {
      throw new Error("The assistant is busy right now. Please try again in a minute.");
    }
    if (res.status === 409) {
      throw new Error("That action was already completed or cancelled.");
    }
    throw new Error("The assistant is unavailable right now. Please try again shortly.");
  }

  return (await res.json()) as T;
}

/** Start a conversation for one authenticated customer. */
export async function createConversation(externalUserId: string): Promise<string> {
  const agentId = requireEnv("STUDIO_AGENT_ID");
  const data = await studioFetch<{ id: string }>(`/v1/agents/${encodeURIComponent(agentId)}/conversations`, {
    method: "POST",
    body: JSON.stringify({ external_user_id: externalUserId }),
  });
  if (!data?.id) throw new Error("The assistant is unavailable right now. Please try again shortly.");
  return data.id;
}

export async function postMessage(conversationId: string, message: string): Promise<StudioReply> {
  const data = await studioFetch<Partial<StudioReply>>(
    `/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: "POST", body: JSON.stringify({ message }) }
  );
  return { reply: data.reply ?? "", pending_actions: data.pending_actions ?? [] };
}

export async function resolveAction(
  conversationId: string,
  actionId: string,
  decision: "confirm" | "cancel"
): Promise<Record<string, unknown>> {
  return studioFetch<Record<string, unknown>>(
    `/v1/conversations/${encodeURIComponent(conversationId)}/actions/${encodeURIComponent(actionId)}/${decision}`,
    { method: "POST" }
  );
}
