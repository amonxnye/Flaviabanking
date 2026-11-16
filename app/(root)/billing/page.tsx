import HeaderBox from '@/components/HeaderBox';
import PricingCards from '@/components/PricingCards';
import UsageDashboard from '@/components/UsageDashboard';
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';

const Billing = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return null;

  const accounts = await getAccounts({ userId: loggedIn.$id });
  const currentPlan = loggedIn.planTier || 'free';

  return (
    <section className="page">
      <HeaderBox
        title="Billing and plans"
        subtext="Your plan and what you have used of it"
      />

      <UsageDashboard
        connectedBanks={accounts?.totalBanks || 0}
        currentPlan={currentPlan}
      />

      <div className="flex flex-col gap-4">
        <h2 className="text-20 font-medium text-ink">Available plans</h2>
        <PricingCards currentPlan={currentPlan} />
      </div>
    </section>
  );
};

export default Billing;
