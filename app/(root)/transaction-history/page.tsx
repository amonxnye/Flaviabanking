import HeaderBox from '@/components/HeaderBox'
import { Pagination } from '@/components/Pagination';
import TransactionsTable from '@/components/TransactionsTable';
import { getAccount, getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { formatAmount } from '@/lib/utils';

const TransactionHistory = async ({ searchParams: { id, page }}:SearchParamProps) => {
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return null;

  const accounts = await getAccounts({
    userId: loggedIn.$id
  })

  if(!accounts) return null;
  
  const accountsData = accounts?.data;
  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId;

  const account = await getAccount({ appwriteItemId })


const rowsPerPage = 10;
const totalPages = Math.ceil((account?.transactions?.length || 0) / rowsPerPage);

const indexOfLastTransaction = currentPage * rowsPerPage;
const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;

const currentTransactions = (account?.transactions || []).slice(
  indexOfFirstTransaction, indexOfLastTransaction
)
  return (
    <div className="page">
      <HeaderBox 
        title="Transaction history"
        subtext="Every transaction on one linked account"
      />

      <div className="flex flex-col gap-4">
        <div className="card flex flex-col justify-between gap-4 p-6 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <h2 className="text-16 font-medium text-ink">{account?.data.name}</h2>
            <p className="text-13 text-ink-2">
              {account?.data.officialName}
            </p>
            <p className="figure text-13 text-ink-3">
              •••• {account?.data.mask}
            </p>
          </div>
          
          <div className="flex flex-col gap-1 sm:items-end">
            <p className="text-13 text-ink-2">Current balance</p>
            <p className="figure text-24 font-medium text-ink">{formatAmount(account?.data.currentBalance)}</p>
          </div>
        </div>

        <TransactionsTable 
          transactions={currentTransactions}
        />
        {totalPages > 1 && (
          <Pagination totalPages={totalPages} page={currentPage} />
        )}
      </div>
    </div>
  )
}

export default TransactionHistory