import { cn, formatAmount } from '@/lib/utils'
import Link from 'next/link'
import React from 'react'
import Copy from './Copy'
import { LogoMark } from './Logo'

type CardFaceProps = {
  name: string;
  subtype: string;
  balance: number;
  holder: string;
  mask: string;
  className?: string;
};

// The bank card, built in code: deep ink surface, a chip, the balance and the mask.
export const CardFace = ({ name, subtype, balance, holder, mask, className }: CardFaceProps) => (
  <div
    className={cn(
      'relative flex aspect-[1.586/1] w-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(160deg,#0E3570_0%,#0A2650_100%)] p-5 text-white shadow-float',
      className
    )}
  >
    <LogoMark className="pointer-events-none absolute -bottom-16 -right-12 size-48 opacity-[0.06] [&_*]:fill-white" />

    <div className="relative flex items-start justify-between gap-3">
      <p className="truncate text-14 font-medium text-white/90">{name}</p>
      <p className="shrink-0 text-12 text-white/60 first-letter:uppercase">{subtype}</p>
    </div>

    <div className="relative flex flex-col gap-3">
      <div className="h-7 w-9 rounded-md border border-black/10 bg-[linear-gradient(135deg,#E6D6AE_0%,#BFA672_100%)]" aria-hidden="true" />
      <p className="figure text-24 font-medium">{formatAmount(balance)}</p>
    </div>

    <div className="relative flex items-end justify-between gap-3 text-12">
      <p className="truncate text-white/70">{holder}</p>
      <p className="figure shrink-0 text-white/80">•••• {mask}</p>
    </div>
  </div>
)

const BankCard = ({ account, userName, showBalance = true }: CreditCardProps) => {
  return (
    <div className="flex w-full max-w-[340px] flex-col gap-3">
      <Link
        href={`/transaction-history/?id=${account.appwriteItemId}`}
        className="rounded-2xl transition-transform active:scale-[0.99]"
        aria-label={`${account.name}, view transactions`}
      >
        <CardFace
          name={account.name}
          subtype={account.subtype}
          balance={account.currentBalance}
          holder={userName}
          mask={account?.mask}
        />
      </Link>

      {showBalance && <Copy title={account?.shareableId} />}
    </div>
  )
}

export default BankCard
