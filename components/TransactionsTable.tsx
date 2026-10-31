import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { categoryColors } from "@/constants"
import { cn, formatAmount, formatDateTime, getTransactionStatus, removeSpecialCharacters } from "@/lib/utils"

const CategoryBadge = ({ category }: CategoryBadgeProps) => (
  <span className="flex items-center gap-2 whitespace-nowrap text-13 text-ink-2">
    <span className={cn('status-dot', categoryColors[category] || categoryColors.default)} aria-hidden="true" />
    {category}
  </span>
)

const TransactionsTable = ({ transactions, compact = false }: TransactionTableProps & { compact?: boolean }) => {
  return (
    <div className="card overflow-hidden">
      <Table aria-label="Transaction history">
        <TableHeader>
          <TableRow className="border-line hover:bg-transparent">
            <TableHead className="h-10 px-4 text-12 font-normal text-ink-3" scope="col">Transaction</TableHead>
            <TableHead className="h-10 px-4 text-right text-12 font-normal text-ink-3" scope="col">Amount</TableHead>
            <TableHead className="h-10 px-4 text-12 font-normal text-ink-3 max-sm:hidden" scope="col">Status</TableHead>
            <TableHead className="h-10 px-4 text-12 font-normal text-ink-3 max-sm:hidden" scope="col">Date</TableHead>
            <TableHead className={cn('h-10 px-4 text-12 font-normal text-ink-3 max-md:hidden', compact && 'max-2xl:hidden')} scope="col">Channel</TableHead>
            <TableHead className="h-10 px-4 text-12 font-normal text-ink-3 max-md:hidden" scope="col">Category</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(transactions || []).map((t: Transaction) => {
            const status = getTransactionStatus(new Date(t.date))
            const isNegative = t.type === 'debit' || t.amount < 0;
            const amount = formatAmount(Math.abs(t.amount))

            return (
              <TableRow key={t.id} className="h-14 border-line hover:bg-subtle/60">
                <TableCell className="max-w-[240px] px-4">
                  <span className="block truncate text-14 font-medium text-ink">
                    {removeSpecialCharacters(t.name)}
                  </span>
                </TableCell>

                <TableCell className={cn('figure whitespace-nowrap px-4 text-right text-14', isNegative ? 'text-ink' : 'text-positive')}>
                  <span aria-label={`${isNegative ? 'Debit' : 'Credit'} ${amount}`}>
                    {isNegative ? `−${amount}` : `+${amount}`}
                  </span>
                </TableCell>

                <TableCell className="px-4 max-sm:hidden">
                  <CategoryBadge category={status} />
                </TableCell>

                <TableCell className="whitespace-nowrap px-4 text-13 text-ink-2 max-sm:hidden">
                  <time dateTime={new Date(t.date).toISOString()}>
                    {formatDateTime(new Date(t.date)).dateTime}
                  </time>
                </TableCell>

                <TableCell className={cn('whitespace-nowrap px-4 text-13 capitalize text-ink-2 max-md:hidden', compact && 'max-2xl:hidden')}>
                  {t.paymentChannel}
                </TableCell>

                <TableCell className="px-4 max-md:hidden">
                  <CategoryBadge category={t.category} />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export default TransactionsTable
