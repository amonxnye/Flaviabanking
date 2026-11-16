import HeaderBox from '@/components/HeaderBox'
import PaymentTransferForm from '@/components/PaymentTransferForm'
import { getAccounts } from '@/lib/actions/bank.actions';
import { getLoggedInUser } from '@/lib/actions/user.actions';

const Transfer = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return null;

  const accounts = await getAccounts({
    userId: loggedIn.$id
  })

  if(!accounts) return null;
  
  const accountsData = accounts?.data;

  return (
    <section className="page">
      <HeaderBox 
        title="Transfer funds"
        subtext="Send an ACH transfer from one of your linked banks to another Horizon user"
      />

      <PaymentTransferForm accounts={accountsData} />
    </section>
  )
}

export default Transfer