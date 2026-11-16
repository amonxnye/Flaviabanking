import { CardFace } from "@/components/BankCard";
import TotalBalanceBox from "@/components/TotalBalanceBox";

// A static preview of the product: the balance across linked banks and one card.
const previewAccounts = [
  { id: "p1", name: "Chase Business Checking", currentBalance: 18452.36 },
  { id: "p2", name: "Bank of America Savings", currentBalance: 6210.5 },
  { id: "p3", name: "Wells Fargo Credit", currentBalance: 1284.12 },
] as Account[];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="flex min-h-screen w-full justify-between bg-surface font-sans">
      <div className="flex w-full justify-center px-6 lg:w-1/2 lg:shrink-0">
        {children}
      </div>
      <div className="auth-asset" aria-hidden="true">
        <div className="relative w-[640px] shrink-0">
          <div className="pointer-events-none [&_.card]:shadow-float">
            <TotalBalanceBox
              accounts={previewAccounts}
              totalBanks={3}
              totalCurrentBalance={25946.98}
            />
          </div>
          <CardFace
            name="Chase Business Checking"
            subtype="checking"
            balance={18452.36}
            holder="Amara Nakato"
            mask="4821"
            className="-mt-6 ml-10 max-w-[320px]"
          />
        </div>
      </div>
    </main>
  );
}
