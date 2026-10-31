'use client';

import { PLANS, PlanTier } from '@/lib/plans';

interface UsageDashboardProps {
  connectedBanks: number;
  currentPlan: string;
}

const UsageDashboard = ({ connectedBanks, currentPlan }: UsageDashboardProps) => {
  const plan = PLANS[(currentPlan as PlanTier) || 'free'] || PLANS.free;
  const bankLimit = plan.limits.maxConnectedBanks;
  const bankPercentage = bankLimit === Infinity ? 0 : Math.min((connectedBanks / bankLimit) * 100, 100);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-20 font-medium text-ink">Current usage</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card flex flex-col gap-1 p-5">
          <p className="text-13 text-ink-2">Connected banks</p>
          <p className="figure text-24 font-medium text-ink">
            {connectedBanks}
            <span className="font-sans text-14 font-normal text-ink-3">
              {' '}of {bankLimit === Infinity ? 'unlimited' : bankLimit}
            </span>
          </p>
          {bankLimit !== Infinity && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-subtle" role="progressbar" aria-label="Connected banks" aria-valuenow={connectedBanks} aria-valuemin={0} aria-valuemax={bankLimit}>
              <div
                className={`h-full rounded-full ${bankPercentage >= 90 ? 'bg-negative' : 'bg-brand'}`}
                style={{ width: `${bankPercentage}%` }}
              />
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-1 p-5">
          <p className="text-13 text-ink-2">Transfers this month</p>
          <p className="figure text-24 font-medium text-ink">
            0
            <span className="font-sans text-14 font-normal text-ink-3">
              {' '}of {plan.limits.maxTransfersPerMonth === Infinity ? 'unlimited' : plan.limits.maxTransfersPerMonth}
            </span>
          </p>
        </div>

        <div className="card flex flex-col gap-1 p-5">
          <p className="text-13 text-ink-2">Largest transfer</p>
          <p className="figure text-24 font-medium text-ink">
            ${plan.limits.maxTransferAmount.toLocaleString('en-US')}
          </p>
          <p className="text-13 text-ink-3">per transaction</p>
        </div>
      </div>
    </section>
  );
};

export default UsageDashboard;
