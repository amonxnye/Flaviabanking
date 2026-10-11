import HeaderBox from '@/components/HeaderBox'
import PaymentTransferForm from '@/components/PaymentTransferForm'
import { getAccounts } from '@/lib/actions/account.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import React from 'react'

const Transfer = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return null;

  const accounts = await getAccounts({
    userId: loggedIn.$id
  })

  if(!accounts) return null;
  
  const accountsData = accounts?.data;

  return (
    <section className="payment-transfer">
      <HeaderBox 
        title="Payment Transfer"
        subtext="Record a transfer between two of your accounts."
      />

      <section className="size-full pt-5">
        <PaymentTransferForm accounts={accountsData} />
      </section>
    </section>
  )
}

export default Transfer