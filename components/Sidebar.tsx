'use client'

import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Footer from './Footer'
import Logo from './Logo'
import PlaidLink from './PlaidLink'

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname();

  return (
    <section className="sidebar" role="navigation" aria-label="Main navigation">
      <div className="flex flex-col gap-6">
        <Link href="/" className="flex h-9 items-center px-2.5 max-xl:justify-center" aria-label="Horizon - Go to dashboard">
          <Logo className="[&>span:last-child]:max-xl:hidden" />
        </Link>

        <nav className="flex flex-col gap-1">
          {sidebarLinks.map((item) => {
            const isActive = item.route === '/' ? pathname === '/' : pathname === item.route || pathname.startsWith(`${item.route}/`)
            const Icon = item.icon

            return (
              <Link href={item.route} key={item.label}
                className={cn('sidebar-link', { 'sidebar-link-active': isActive })}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
              >
                <Icon size={18} strokeWidth={1.5} aria-hidden="true" className={cn('shrink-0', isActive ? 'text-brand' : 'text-ink-3')} />
                <span className="max-xl:hidden">{item.label}</span>
              </Link>
            )
          })}

          <PlaidLink user={user} />
        </nav>
      </div>

      <Footer user={user} />
    </section>
  )
}

export default Sidebar
