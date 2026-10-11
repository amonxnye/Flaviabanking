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
    <section className="billing">
      <div className="mx-auto max-w-5xl w-full p-6">
        <HeaderBox
          title="Billing & Plans"
          subtext="Manage your subscription and view usage."
        />

        <div className="mt-8 space-y-10">
          <UsageDashboard
            connectedBanks={accounts?.totalBanks || 0}
            currentPlan={currentPlan}
          />

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Plans</h2>
            <PricingCards currentPlan={currentPlan} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Billing;
