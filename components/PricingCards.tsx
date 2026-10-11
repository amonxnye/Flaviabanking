'use client';

import { PLANS, PlanTier } from '@/lib/plans';
import { cn } from '@/lib/utils';

const PricingCards = ({ currentPlan }: { currentPlan: string }) => {
  const tiers: PlanTier[] = ['free', 'pro', 'enterprise'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {tiers.map((tier) => {
        const plan = PLANS[tier];
        const isCurrentPlan = currentPlan === tier;

        return (
          <div
            key={tier}
            className={cn(
              'relative rounded-xl border p-6 flex flex-col',
              isCurrentPlan
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-gray-300 transition-colors'
            )}
          >
            {isCurrentPlan && (
              <span className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Current Plan
              </span>
            )}

            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {plan.price === 0 ? 'Free' : `$${plan.price}`}
              {plan.price > 0 && <span className="text-sm font-normal text-gray-500">/month</span>}
            </p>

            <ul className="mt-6 space-y-3 flex-1" role="list">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              disabled={isCurrentPlan}
              className={cn(
                'mt-6 w-full py-2.5 rounded-lg text-sm font-semibold transition-colors',
                isCurrentPlan
                  ? 'bg-gray-100 text-gray-400 cursor-default'
                  : tier === 'pro'
                    ? 'bg-bankGradient text-white hover:opacity-90'
                    : tier === 'enterprise'
                      ? 'bg-gray-900 text-white hover:bg-gray-800'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              )}
              aria-label={isCurrentPlan ? `${plan.name} is your current plan` : `Upgrade to ${plan.name}`}
            >
              {isCurrentPlan ? 'Current Plan' : tier === 'free' ? 'Downgrade' : 'Upgrade'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default PricingCards;
