'use client';

import CountUp from 'react-countup';

const currencySymbol = (currency: string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value ?? `${currency} `;

const AnimatedCounter = ({ amount, currency = 'USD' }: { amount: number; currency?: string }) => {
  return (
    <div className="w-full">
      <CountUp 
        decimals={2}
        decimal="."
        separator=","
        prefix={currencySymbol(currency)}
        end={amount} 
      />
    </div>
  )
}

export default AnimatedCounter
