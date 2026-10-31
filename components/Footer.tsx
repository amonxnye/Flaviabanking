import { logoutAccount } from '@/lib/actions/user.actions'
import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import React from 'react'

const Footer = ({ user, type = 'desktop' }: FooterProps) => {
  const router = useRouter();
  const desktop = type !== 'mobile';

  const handleLogOut = async () => {
    const loggedOut = await logoutAccount();

    if(loggedOut) router.push('/sign-in')
  }

  return (
    <footer className={`flex items-center gap-2.5 border-t border-line pt-4 ${desktop ? 'max-xl:flex-col' : ''}`}>
      <div className="flex-center size-8 shrink-0 rounded-full bg-subtle text-13 font-medium text-ink-2" aria-hidden="true">
        {user?.firstName?.[0]}
      </div>

      <div className={desktop ? 'flex min-w-0 flex-1 flex-col max-xl:hidden' : 'flex min-w-0 flex-1 flex-col'}>
        <p className="truncate text-14 font-medium text-ink">
          {user?.firstName}
        </p>
        <p className="truncate text-12 text-ink-3">
          {user?.email}
        </p>
      </div>

      <button
        className="flex-center size-8 shrink-0 rounded-lg text-ink-3 transition-colors hover:bg-subtle hover:text-ink"
        onClick={handleLogOut}
        aria-label="Log out"
        type="button"
      >
        <LogOut size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </footer>
  )
}

export default Footer
