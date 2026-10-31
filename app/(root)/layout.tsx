import ErrorBoundary from '@/components/ErrorBoundary';
import Logo from '@/components/Logo';
import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Link from 'next/link';
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedIn = await getLoggedInUser();

  if(!loggedIn) redirect('/sign-in')

  return (
    <main className="flex h-screen w-full bg-canvas font-sans">
      <Sidebar user={loggedIn} />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="root-layout">
          <Link href="/" aria-label="Horizon - Go to dashboard"><Logo /></Link>
          <MobileNav user={loggedIn} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>
    </main>
  );
}
