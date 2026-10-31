import type { Metadata } from 'next';

import HeaderBox from '@/components/HeaderBox';
import AssistantChat from '@/components/AssistantChat';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { isAssistantConfigured } from '@/lib/agentstudio/client';

export const metadata: Metadata = { title: 'Assistant' };

const Assistant = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return null;

  return (
    <section className="page">
      <HeaderBox
        title="Assistant"
        subtext="Ask about your wallet, collections and linked accounts"
      />
      <div className="max-w-3xl">
        {isAssistantConfigured() ? (
          <AssistantChat />
        ) : (
          <div className="notice bg-caution-soft text-caution">
            The assistant isn&apos;t set up yet. Set <code>STUDIO_URL</code>,{' '}
            <code>STUDIO_API_KEY</code> and <code>STUDIO_AGENT_ID</code> to turn it on.
          </div>
        )}
      </div>
    </section>
  );
};

export default Assistant;
