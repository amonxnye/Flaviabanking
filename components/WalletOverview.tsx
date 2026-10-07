import { getWallet } from '@/lib/actions/iotec.actions';

const UGX = new Intl.NumberFormat('en-UG', {
  style: 'currency',
  currency: 'UGX',
  maximumFractionDigits: 0,
});

const statusStyles: Record<string, string> = {
  Success: 'bg-green-100 text-green-700',
  Failed: 'bg-red-100 text-red-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const WalletOverview = async () => {
  const wallet = await getWallet();
  const transactions: any[] = wallet?.transactions || [];

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="rounded-xl bg-bank-gradient p-6 text-white">
        <p className="text-14 opacity-90">Wallet balance (confirmed collections)</p>
        <p className="mt-2 text-4xl font-bold">{UGX.format(wallet?.balance || 0)}</p>
        <p className="mt-2 text-12 opacity-80">Feyti Medical Group · UGX wallet</p>
      </div>

      {wallet?.notConfigured && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
          Wallet ledger storage is not configured yet. Set
          <code className="mx-1 rounded bg-amber-100 px-1">APPWRITE_WALLET_TX_COLLECTION_ID</code>
          to persist collection history and balances.
        </div>
      )}

      {/* Recent collections */}
      <div>
        <h2 className="mb-3 text-18 font-semibold text-gray-900">Recent collections</h2>
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-500">
            No collections yet. Request your first payment on the right.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Phone</th>
                  <th scope="col" className="px-4 py-3 font-medium">Amount</th>
                  <th scope="col" className="px-4 py-3 font-medium">Network</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 text-gray-700">{t.phone}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{UGX.format(t.amount)}</td>
                    <td className="px-4 py-3 text-gray-600">{t.channel}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusStyles[t.status] || 'bg-gray-100 text-gray-600'}`}>
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
