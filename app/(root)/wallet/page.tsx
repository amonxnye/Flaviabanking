import HeaderBox from '@/components/HeaderBox';
import CollectPaymentForm from '@/components/CollectPaymentForm';
import WalletOverview from '@/components/WalletOverview';
import { getLoggedInUser } from '@/lib/actions/user.actions';

const Wallet = async () => {
  const loggedIn = await getLoggedInUser();
  if (!loggedIn) return null;

  return (
    <section className="no-scrollbar flex w-full flex-col overflow-y-scroll bg-gray-25 p-8 xl:max-h-screen xl:overflow-y-scroll">
      <HeaderBox
        title="Wallet"
        subtext="Collect mobile-money payments from customers into your ioTec wallet."
      />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <WalletOverview />
        <CollectPaymentForm />
      </div>
    </section>
  );
};

export default Wallet;
