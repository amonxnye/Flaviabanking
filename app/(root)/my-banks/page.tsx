import BankCard from '@/components/BankCard';
import HeaderBox from '@/components/HeaderBox'
import PlaidLink from '@/components/PlaidLink';
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { Landmark } from 'lucide-react';

const MyBanks = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return null;

  const accounts = await getAccounts({
    userId: loggedIn.$id
  })

  return (
    <section className="page">
        <HeaderBox 
          title="My banks"
          subtext="Every account you linked, with the shareable ID others use to pay you"
        />

        <div className="flex flex-col gap-4">
          <h2 className="header-2">
            Your cards
          </h2>
          {accounts?.data?.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,340px))] gap-6">
              {accounts.data.map((a: Account) => (
                <BankCard
                  key={a.id}
                  account={a}
                  userName={loggedIn?.firstName}
                />
              ))}
            </div>
          ) : (
            <div className="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
              <Landmark size={24} strokeWidth={1.5} className="text-ink-3" aria-hidden="true" />
              <h3 className="text-16 font-medium text-ink">No bank accounts yet</h3>
              <p className="max-w-md text-14 text-ink-2">
                Connect your first bank to see balances here and send transfers.
              </p>
              <PlaidLink user={loggedIn} variant="primary" />
            </div>
          )}
        </div>
    </section>
  )
}

export default MyBanks