import HeaderBox from '@/components/HeaderBox';
import CollectPaymentForm from '@/components/CollectPaymentForm';
import WalletOverview from '@/components/WalletOverview';
import { getLoggedInUser } from '@/lib/actions/user.actions';

const Wallet = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return null;

  return (
    <section className="page">
      <HeaderBox
        title="Wallet"
        subtext="Collect mobile-money payments from customers into your ioTec wallet"
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <WalletOverview />
        <CollectPaymentForm />
      </div>
    </section>
  );
};

export default Wallet;
