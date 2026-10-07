export type PlanTier = 'free' | 'pro' | 'enterprise';

export interface PlanDefinition {
  name: string;
  tier: PlanTier;
  price: number;
  priceLabel: string;
  features: string[];
  limits: {
    maxConnectedBanks: number;
    maxTransfersPerMonth: number;
    maxTransferAmount: number;
  };
}

export const PLANS: Record<PlanTier, PlanDefinition> = {
  free: {
    name: 'Starter',
    tier: 'free',
    price: 0,
    priceLabel: 'Free',
    features: [
      'Connect up to 2 bank accounts',
      'View transaction history',
      'Up to 5 transfers per month',
      'Max $1,000 per transfer',
      'Basic dashboard',
    ],
    limits: {
      maxConnectedBanks: 2,
      maxTransfersPerMonth: 5,
      maxTransferAmount: 1000,
    },
  },
  pro: {
    name: 'Professional',
    tier: 'pro',
    price: 14.99,
    priceLabel: '$14.99/mo',
    features: [
      'Connect up to 10 bank accounts',
      'Full transaction history & search',
      'Up to 50 transfers per month',
      'Max $10,000 per transfer',
      'Spending analytics & reports',
      'Export data (CSV & JSON)',
      'Priority support',
    ],
    limits: {
      maxConnectedBanks: 10,
      maxTransfersPerMonth: 50,
      maxTransferAmount: 10000,
    },
  },
  enterprise: {
    name: 'Enterprise',
    tier: 'enterprise',
    price: 49.99,
    priceLabel: '$49.99/mo',
    features: [
      'Unlimited bank accounts',
      'Unlimited transfers',
      'Max $50,000 per transfer',
      'Organization & team management',
      'Role-based access control',
      'Audit logs & compliance reports',
      'API access & webhooks',
      'Dedicated support & SLA',
    ],
    limits: {
      maxConnectedBanks: Infinity,
      maxTransfersPerMonth: Infinity,
      maxTransferAmount: 50000,
    },
  },
};

export function getPlanForUser(_userPlanTier?: string): PlanDefinition {
  const tier = (_userPlanTier as PlanTier) || 'free';
  return PLANS[tier] || PLANS.free;
}

export function checkBankLimit(currentCount: number, planTier: PlanTier): { allowed: boolean; message?: string } {
  const plan = PLANS[planTier];
  if (currentCount >= plan.limits.maxConnectedBanks) {
    return {
      allowed: false,
      message: `Your ${plan.name} plan allows up to ${plan.limits.maxConnectedBanks} connected banks. Upgrade to connect more.`,
    };
  }
  return { allowed: true };
}

export function checkTransferLimit(
  amount: number,
  monthlyTransferCount: number,
  planTier: PlanTier
): { allowed: boolean; message?: string } {
  const plan = PLANS[planTier];

  if (amount > plan.limits.maxTransferAmount) {
    return {
      allowed: false,
      message: `Your ${plan.name} plan allows transfers up to $${plan.limits.maxTransferAmount.toLocaleString()}. Upgrade for higher limits.`,
    };
  }

  if (monthlyTransferCount >= plan.limits.maxTransfersPerMonth) {
    return {
      allowed: false,
      message: `You've reached your monthly transfer limit (${plan.limits.maxTransfersPerMonth}). Upgrade for more transfers.`,
    };
  }

  return { allowed: true };
}
