import { cn, formatAmount } from '@/lib/utils';

// Leading account takes the accent; the rest step down the graphite ramp.
const SHARE_COLORS = ['bg-brand', 'bg-[#3F3F46]', 'bg-[#A1A1AA]', 'bg-[#D4D4D8]'];

const TotalBalanceBox = ({
  accounts = [], totalBanks, totalCurrentBalance
}: TotalBalanceBoxProps) => {
  const ranked = [...accounts].sort((a, b) => b.currentBalance - a.currentBalance);
  const positiveTotal = ranked.reduce((sum, a) => sum + Math.max(a.currentBalance, 0), 0);
  const share = (a: Account) => (positiveTotal > 0 ? Math.max(a.currentBalance, 0) / positiveTotal : 0);
  const color = (i: number) => SHARE_COLORS[Math.min(i, SHARE_COLORS.length - 1)];

  return (
    <section className="card grid gap-8 p-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12">
      <div className="flex flex-col gap-1">
        <h2 className="text-14 text-ink-2">Total current balance</h2>
        <p className="figure text-32 font-medium text-ink">{formatAmount(totalCurrentBalance)}</p>
        <p className="text-13 text-ink-3">
          {totalBanks} {totalBanks === 1 ? 'bank account' : 'bank accounts'}
        </p>
      </div>

      {ranked.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
            {ranked.map((a, i) => (
              <div key={a.id} className={cn('h-full first:rounded-l-full last:rounded-r-full', color(i))} style={{ width: `${share(a) * 100}%` }} />
            ))}
          </div>

          <ul className="flex flex-col gap-2" aria-label="Balance by account">
            {ranked.map((a, i) => (
              <li key={a.id} className="flex items-center gap-2.5 text-14">
                <span className={cn('status-dot', color(i))} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-ink-2">{a.name}</span>
                <span className="figure text-ink">{formatAmount(a.currentBalance)}</span>
                <span className="figure w-12 text-right text-13 text-ink-3 max-sm:hidden">{Math.round(share(a) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default TotalBalanceBox
