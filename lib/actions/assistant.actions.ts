"use server";

import { getLoggedInUser } from "./user.actions";
import { createAuditLog } from "../audit";
import {
  createConversation,
  postMessage,
  resolveAction,
  isAssistantConfigured,
  StudioError,
  type PendingAction,
} from "../agentstudio/client";
import { signConversation, openConversation } from "../agentstudio/security";

const MAX_MESSAGE_LENGTH = 4000;

export interface AssistantTurn {
  reply: string;
  pendingActions: PendingAction[];
}

async function requireUser() {
  const user = await getLoggedInUser();
  if (!user) throw new Error("Please sign in to use the assistant.");
  if (!isAssistantConfigured()) throw new Error("The assistant isn't set up yet.");
  return user as { $id: string };
}

/** Start a conversation for the signed-in customer. Returns an opaque token. */
export const startAssistantConversation = async (): Promise<string> => {
  const user = await requireUser();
  // external_user_id comes from the session — never from the client.
  const conversationId = await createConversation(user.$id);
  return signConversation(user.$id, conversationId);
};

export const sendAssistantMessage = async (
  token: string,
  message: string
): Promise<AssistantTurn> => {
  const user = await requireUser();

  const conversationId = openConversation(user.$id, token);
  if (!conversationId) throw new Error("This conversation has expired. Please start a new one.");

  const text = (message || "").trim();
  if (!text) throw new Error("Type a message first.");
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Messages can be up to ${MAX_MESSAGE_LENGTH} characters.`);
  }

  const result = await postMessage(conversationId, text);
  return { reply: result.reply, pendingActions: result.pending_actions };
};

/**
 * ok: done. settled: the card must not offer the choice again, because the
 * action already finished (conflict) or may have run (timeout). Otherwise the
 * customer may try again. Returned, not thrown: Next.js hides thrown messages
 * in production.
 */
export type ResolveActionResult = { ok: true } | { ok: false; error: string; settled: boolean };

/** Confirm or cancel an action — only ever on an explicit customer choice. */
export const resolveAssistantAction = async (
  token: string,
  actionId: string,
  decision: "confirm" | "cancel"
): Promise<ResolveActionResult> => {
  const user = await requireUser();

  const conversationId = openConversation(user.$id, token);
  if (!conversationId) throw new Error("This conversation has expired. Please start a new one.");
  if (!/^[\w-]+$/.test(actionId)) throw new Error("Invalid action.");
  if (decision !== "confirm" && decision !== "cancel") throw new Error("Invalid decision.");

  try {
    await resolveAction(conversationId, actionId, decision);
  } catch (error) {
    if (error instanceof StudioError) {
      if (error.code === "conflict") return { ok: false, error: error.message, settled: true };
      if (error.code === "timeout") {
        return {
          ok: false,
          error: "We could not confirm whether this ran. Ask the assistant for the latest status before trying again.",
          settled: true,
        };
      }
      return { ok: false, error: error.message, settled: false };
    }
    throw error;
  }

  await createAuditLog({
    userId: user.$id,
    action: decision === "confirm" ? "assistant.action_confirm" : "assistant.action_cancel",
    resourceType: "assistant_action",
    resourceId: actionId,
  });

  return { ok: true };
};
