import { getWallet } from '@/lib/actions/iotec.actions';

const UGX = new Intl.NumberFormat('en-UG', {
  style: 'currency',
  currency: 'UGX',
  maximumFractionDigits: 0,
});

const statusDot: Record<string, string> = {
  Success: 'bg-positive',
  Pending: 'bg-caution',
  Failed: 'bg-negative',
  Cancelled: 'bg-negative',
};

const WalletOverview = async () => {
  const wallet = await getWallet();
  const transactions: any[] = wallet?.transactions || [];

  return (
    <div className="flex flex-col gap-8">
      <div className="card flex flex-col gap-1 p-6">
        <p className="text-14 text-ink-2">Wallet balance</p>
        <p className="figure text-32 font-medium text-ink">{UGX.format(wallet?.balance || 0)}</p>
        <p className="text-13 text-ink-3">Confirmed collections · Feyti Medical Group</p>
      </div>

      {wallet?.notConfigured && (
        <p className="notice bg-caution-soft text-caution">
          Collection history is not being saved yet. Wallet storage needs to be set up on the server.
        </p>
      )}

      <div className="flex flex-col gap-4">
        <h2 className="header-2">Recent collections</h2>
        {transactions.length === 0 ? (
          <div className="card px-6 py-10 text-center text-14 text-ink-2">
            No collections yet. Request your first payment with the form on this page.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-left text-14">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="h-10 px-4 text-12 font-normal text-ink-3">Phone</th>
                  <th scope="col" className="h-10 px-4 text-right text-12 font-normal text-ink-3">Amount</th>
                  <th scope="col" className="h-10 px-4 text-12 font-normal text-ink-3">Network</th>
                  <th scope="col" className="h-10 px-4 text-12 font-normal text-ink-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="h-12 border-b border-line last:border-0">
                    <td className="figure px-4 text-13 text-ink-2">{t.phone}</td>
                    <td className="figure px-4 text-right text-ink">{UGX.format(t.amount)}</td>
                    <td className="px-4 text-13 text-ink-2">{t.channel}</td>
                    <td className="px-4">
                      <span className="flex items-center gap-2 text-13 text-ink-2">
                        <span className={`status-dot ${statusDot[t.status] || 'bg-ink-3'}`} aria-hidden="true" />
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletOverview;
