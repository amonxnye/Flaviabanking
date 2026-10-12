'use client'

import { sidebarLinks } from '@/constants'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Footer from './Footer'

const Sidebar = ({ user }: SiderbarProps) => {
  const pathname = usePathname();

  return (
    <section className="sidebar" role="navigation" aria-label="Main navigation">
      <nav className="flex flex-col gap-4">
        <Link href="/" className="mb-12 cursor-pointer flex items-center gap-2" aria-label="Horizon - Go to dashboard">
          <Image
            src="/icons/logo.svg"
            width={34}
            height={34}
            alt="Horizon logo"
            className="size-[24px] max-xl:size-14"
          />
          <h1 className="sidebar-logo">Horizon</h1>
        </Link>

        {sidebarLinks.map((item) => {
          const isActive = pathname === item.route || pathname.startsWith(`${item.route}/`)

          return (
            <Link href={item.route} key={item.label}
              className={cn('sidebar-link', { 'bg-bank-gradient': isActive })}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <div className="relative size-6">
                <Image
                  src={item.imgURL}
                  alt=""
                  fill
                  aria-hidden="true"
                  className={cn({
                    'brightness-[3] invert-0': isActive
                  })}
                />
              </div>
              <p className={cn("sidebar-label", { "!text-white": isActive })}>
                {item.label}
              </p>
            </Link>
          )
        })}

        <Link href="/my-banks" className="add-account-link" aria-label="Add account">
          <Image
            src="/icons/connect-bank.svg"
            alt=""
            width={24}
            height={24}
            aria-hidden="true"
          />
          <p className="text-[16px] font-semibold text-black-2">Add account</p>
        </Link>
      </nav>

      <Footer user={user} />
    </section>
  )
}

export default Sidebar