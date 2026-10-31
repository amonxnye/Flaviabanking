'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, MessageSquare } from 'lucide-react';

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
    <div className="card flex h-[calc(100vh-14rem)] min-h-[420px] flex-col overflow-hidden">
      <p className="border-b border-line bg-canvas px-5 py-2 text-12 text-ink-3">
        You&apos;re chatting with an AI assistant. It can read your wallet and linked accounts, but
        it can&apos;t move money without your explicit confirmation.
      </p>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4" aria-live="polite">
        {entries.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <MessageSquare size={24} strokeWidth={1.5} className="text-ink-3" aria-hidden="true" />
            <p className="text-14 text-ink-2">Ask about your balance, collections or accounts</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="h-8 rounded-lg border border-line-strong px-3 text-13 text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
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
              <div key={i} className="max-w-[85%] rounded-xl border border-line-strong bg-surface p-4 text-14">
                <p className="font-medium text-ink">Confirm action: <span className="figure text-13">{e.action.tool}</span></p>
                <pre className="figure mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-subtle p-3 text-12 text-ink-2">
                  {JSON.stringify(e.action.input, null, 2)}
                </pre>
                {e.state === 'pending' || e.state === 'working' ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      disabled={e.state === 'working'}
                      onClick={() => decide(e.action.id, 'confirm')}
                      className="btn-primary h-9"
                    >
                      Confirm
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={e.state === 'working'}
                      onClick={() => decide(e.action.id, 'cancel')}
                      className="btn-secondary"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-13 text-ink-2">
                    {e.state === 'confirmed' ? 'Confirmed' : 'Cancelled'}
                  </p>
                )}
              </div>
            );
          }
          const mine = e.kind === 'user';
          return (
            <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <p
                className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-2.5 text-14 ${
                  mine ? 'bg-brand text-white' : 'bg-subtle text-ink'
                }`}
              >
                {e.text}
              </p>
            </div>
          );
        })}

        {busy && (
          <div className="flex items-center gap-2 text-13 text-ink-3" role="status">
            <Loader2 size={16} strokeWidth={1.5} className="animate-spin" aria-hidden="true" /> Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <div role="alert" className="notice mx-5 mb-2 bg-negative-soft text-negative">
          {error}
        </div>
      )}

      <form
        onSubmit={(ev) => {
          ev.preventDefault();
          send(input);
        }}
        className="flex gap-2 border-t border-line p-4"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Message the assistant
        </label>
        <input
          id="assistant-input"
          value={input}
          onChange={(ev) => setInput(ev.target.value)}
          maxLength={4000}
          placeholder="Ask a question"
          className="input-class flex-1"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !input.trim()} className="btn-primary w-10 px-0" aria-label="Send message">
          <Send size={18} strokeWidth={1.5} aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
};

export default AssistantChat;
