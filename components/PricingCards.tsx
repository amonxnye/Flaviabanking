'use client';

import { Check } from 'lucide-react';

import { PLANS, PlanTier } from '@/lib/plans';
import { cn } from '@/lib/utils';

const PricingCards = ({ currentPlan }: { currentPlan: string }) => {
  const tiers: PlanTier[] = ['free', 'pro', 'enterprise'];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {tiers.map((tier) => {
        const plan = PLANS[tier];
        const isCurrentPlan = currentPlan === tier;

        return (
          <div
            key={tier}
            className={cn(
              'card flex flex-col p-6',
              isCurrentPlan && 'border-brand ring-1 ring-brand'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-16 font-medium text-ink">{plan.name}</h3>
              {isCurrentPlan && <span className="text-13 text-brand">Current plan</span>}
            </div>
            <p className="mt-3 flex items-baseline gap-1">
              <span className={cn('text-32 font-medium text-ink', plan.price > 0 && 'figure')}>
                {plan.price === 0 ? 'Free' : `$${plan.price}`}
              </span>
              {plan.price > 0 && <span className="text-13 text-ink-3">per month</span>}
            </p>

            <ul className="mt-6 flex flex-1 flex-col gap-3" role="list">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-14 text-ink-2">
                  <Check size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              disabled={isCurrentPlan}
              className={cn(
                'mt-6 w-full',
                isCurrentPlan
                  ? 'h-10 cursor-default rounded-lg border border-line text-14 font-medium text-ink-3'
                  : tier === 'pro'
                    ? 'btn-primary'
                    : 'btn-secondary h-10'
              )}
              aria-label={isCurrentPlan ? `${plan.name} is your current plan` : `Upgrade to ${plan.name}`}
            >
              {isCurrentPlan ? 'Current plan' : tier === 'free' ? 'Downgrade' : 'Upgrade'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default PricingCards;
