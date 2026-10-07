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
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Usage</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Connected Banks */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Connected Banks</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {connectedBanks}
            <span className="text-sm font-normal text-gray-500">
              {' '}/ {bankLimit === Infinity ? 'Unlimited' : bankLimit}
            </span>
          </p>
          {bankLimit !== Infinity && (
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={connectedBanks} aria-valuemin={0} aria-valuemax={bankLimit}>
              <div
                className={`h-full rounded-full transition-all ${bankPercentage >= 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${bankPercentage}%` }}
              />
            </div>
          )}
        </div>

        {/* Transfers This Month */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Transfers This Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            0
            <span className="text-sm font-normal text-gray-500">
              {' '}/ {plan.limits.maxTransfersPerMonth === Infinity ? 'Unlimited' : plan.limits.maxTransfersPerMonth}
            </span>
          </p>
        </div>

        {/* Max Transfer Amount */}
        <div className="border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-600">Max Transfer Amount</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${plan.limits.maxTransferAmount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">per transaction</p>
        </div>
      </div>
    </div>
  );
};

export default UsageDashboard;
