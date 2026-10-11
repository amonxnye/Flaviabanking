import HeaderBox from '@/components/HeaderBox'
import ManageAccounts from '@/components/ManageAccounts';
import { getAccounts } from '@/lib/actions/account.actions';
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
          title="My Accounts"
          subtext="Add and manage the accounts you hold at your financial institutions."
        />

        <ManageAccounts accounts={accounts?.data || []} userName={loggedIn?.firstName} />
      </div>
    </section>
  )
}

export default MyBanks
