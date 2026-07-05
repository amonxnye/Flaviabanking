import BankCard from '@/components/BankCard';
import HeaderBox from '@/components/HeaderBox'
import PlaidLink from '@/components/PlaidLink';
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import React from 'react'

const MyBanks = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return null;

  const accounts = await getAccounts({
    userId: loggedIn.$id
  })

  return (
    <section className='flex'>
      <div className="my-banks">
        <HeaderBox 
          title="My Bank Accounts"
          subtext="Effortlessly manage your banking activites."
        />

        <div className="space-y-4">
          <h2 className="header-2">
            Your cards
          </h2>
          {accounts?.data?.length > 0 ? (
            <div className="flex flex-wrap gap-6">
              {accounts.data.map((a: Account) => (
                <BankCard
                  key={a.id}
                  account={a}
                  userName={loggedIn?.firstName}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-16 px-6 text-center">
              <h3 className="text-18 font-semibold text-gray-900">No bank accounts yet</h3>
              <p className="max-w-md text-14 text-gray-600">
                Connect your first bank account to start tracking balances and sending transfers securely.
              </p>
              <PlaidLink user={loggedIn} variant="primary" />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default MyBanks