'use client'

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { sidebarLinks } from "@/constants"
import { cn } from "@/lib/utils"
import { Menu } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Footer from "./Footer"
import Logo from "./Logo"

const MobileNav = ({ user }: MobileNavProps) => {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger className="flex-center size-9 rounded-lg text-ink-2 transition-colors hover:bg-subtle" aria-label="Open menu">
        <Menu size={20} strokeWidth={1.5} aria-hidden="true" />
      </SheetTrigger>
      <SheetContent side="left" className="flex w-[280px] flex-col justify-between border-r border-line bg-surface px-3 py-4">
        <div className="flex flex-col gap-6">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Link href="/" className="flex h-9 items-center px-2.5">
            <Logo />
          </Link>
          <nav className="flex flex-col gap-1">
            {sidebarLinks.map((item) => {
              const isActive = item.route === '/' ? pathname === '/' : pathname === item.route || pathname.startsWith(`${item.route}/`)
              const Icon = item.icon

              return (
                <SheetClose asChild key={item.route}>
                  <Link href={item.route}
                    className={cn('flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-14 text-ink-2 transition-colors hover:bg-subtle hover:text-ink', { 'sidebar-link-active': isActive })}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon size={18} strokeWidth={1.5} aria-hidden="true" className={isActive ? 'text-brand' : 'text-ink-3'} />
                    {item.label}
                  </Link>
                </SheetClose>
              )
            })}
          </nav>
        </div>

        <Footer user={user} type="mobile" />
      </SheetContent>
    </Sheet>
  )
}

export default MobileNav
