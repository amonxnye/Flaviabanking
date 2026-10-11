'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, Bot } from 'lucide-react';

import { Button } from './ui/button';
import {
  startAssistantConversation,
  sendAssistantMessage,
  resolveAssistantAction,
} from '@/lib/actions/assistant.actions';

interface PendingAction {
  id: string;
  tool: string;
  input: Record<string, unknown>;
}

type Entry =
  | { kind: 'user' | 'assistant' | 'system'; text: string }
  | { kind: 'action'; action: PendingAction; state: 'pending' | 'confirmed' | 'cancelled' | 'working' };

const SUGGESTIONS = [
  "What's my wallet balance?",
  'Show my last 5 collections',
  'What do my linked bank accounts look like?',
];

const AssistantChat = () => {
  const [token, setToken] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries, busy]);

  const ensureConversation = async () => {
    if (token) return token;
    const t = await startAssistantConversation();
    setToken(t);
    return t;
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;

    setError('');
    setBusy(true);
    setInput('');
    setEntries((prev) => [...prev, { kind: 'user', text: message }]);

    try {
      const t = await ensureConversation();
      const turn = await sendAssistantMessage(t, message);
      setEntries((prev) => [
        ...prev,
        ...(turn.reply ? [{ kind: 'assistant' as const, text: turn.reply }] : []),
        ...turn.pendingActions
          .filter((a) => a.status === 'pending')
          .map((a) => ({
            kind: 'action' as const,
            action: { id: a.id, tool: a.tool, input: a.input },
            state: 'pending' as const,
          })),
      ]);
    } catch (e: any) {
      setError(e?.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (actionId: string, decision: 'confirm' | 'cancel') => {
    if (!token) return;
    setError('');
    setEntries((prev) =>
      prev.map((e) => (e.kind === 'action' && e.action.id === actionId ? { ...e, state: 'working' } : e))
    );
    try {
      await resolveAssistantAction(token, actionId, decision);
      setEntries((prev) =>
        prev.map((e) =>
          e.kind === 'action' && e.action.id === actionId
            ? { ...e, state: decision === 'confirm' ? 'confirmed' : 'cancelled' }
            : e
        )
      );
    } catch (e: any) {
      setError(e?.message || 'Could not complete that action.');
      setEntries((prev) =>
        prev.map((en) => (en.kind === 'action' && en.action.id === actionId ? { ...en, state: 'pending' } : en))
      );
    }
  };

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col rounded-xl border border-gray-200 bg-white">
      <p className="border-b border-gray-100 bg-gray-50 px-5 py-2 text-12 text-gray-600">
        You&apos;re chatting with an AI assistant. It can read your wallet and linked accounts, but
        it can&apos;t move money without your explicit confirmation.
      </p>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4" aria-live="polite">
        {entries.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Bot size={32} className="text-gray-400" aria-hidden="true" />
            <p className="text-14 text-gray-600">Ask about your balance, collections or accounts.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-gray-300 px-3 py-1.5 text-13 text-gray-700 hover:bg-gray-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.map((e, i) => {
          if (e.kind === 'action') {
            return (
              <div key={i} className="max-w-[85%] rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="font-semibold text-amber-900">Confirm action: {e.action.tool}</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded bg-white p-2 text-xs text-gray-700">
                  {JSON.stringify(e.action.input, null, 2)}
                </pre>
                {e.state === 'pending' || e.state === 'working' ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      disabled={e.state === 'working'}
                      onClick={() => decide(e.action.id, 'confirm')}
                      className="bg-bank-gradient text-white"
                    >
                      Confirm
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={e.state === 'working'}
                      onClick={() => decide(e.action.id, 'cancel')}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-gray-700">
                    {e.state === 'confirmed' ? 'Confirmed.' : 'Cancelled.'}
                  </p>
                )}
              </div>
            );
          }
          const mine = e.kind === 'user';
          return (
            <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-14 ${
                  mine ? 'bg-bank-gradient text-white' : 'bg-gray-100 text-gray-800'
                }`}
              >
                {e.text}
              </p>
            </div>
          );
        })}

        {busy && (
          <div className="flex items-center gap-2 text-13 text-gray-500" role="status">
            <Loader2 size={16} className="animate-spin" /> Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div role="alert" className="mx-5 mb-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-gray-100 p-4"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Message the assistant
        </label>
        <input
          id="assistant-input"
          value={input}
          onChange={(ev) => setInput(ev.target.value)}
          maxLength={4000}
          placeholder="Ask a question…"
          className="input-class flex-1 rounded-lg border border-gray-300 px-3 py-2 text-14"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !input.trim()} className="bg-bank-gradient text-white" aria-label="Send message">
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
};

export default AssistantChat;
