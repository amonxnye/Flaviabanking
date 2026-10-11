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
    <section className="flex w-full flex-col bg-gray-25 p-8">
      <HeaderBox
        title="Assistant"
        subtext="Ask questions about your accounts, wallet and collections."
      />
      <div className="mt-6 max-w-3xl">
        {isAssistantConfigured() ? (
          <AssistantChat />
        ) : (
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            The assistant isn&apos;t set up yet. Set <code>STUDIO_URL</code>,{' '}
            <code>STUDIO_API_KEY</code> and <code>STUDIO_AGENT_ID</code> to turn it on.
          </div>
        )}
      </div>
    </section>
  );
};

export default Assistant;
