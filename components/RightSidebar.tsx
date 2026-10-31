import { Plus } from 'lucide-react'
import Link from 'next/link'
import React from 'react'
import BankCard from './BankCard'
import { countTransactionCategories } from '@/lib/utils'
import Category from './Category'

const RightSidebar = ({ user, transactions, banks }: RightSidebarProps) => {
  const categories: CategoryCount[] = countTransactionCategories(transactions);

  return (
    <aside className="right-sidebar">
      <section className="flex items-center gap-3">
        <div className="flex-center size-12 shrink-0 rounded-full bg-subtle text-16 font-medium text-ink-2" aria-hidden="true">
          {user?.firstName?.[0]}
        </div>
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-16 font-medium text-ink">
            {user.firstName} {user.lastName}
          </h2>
          <p className="truncate text-13 text-ink-3">
            {user.email}
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="header-2">My banks</h2>
          <Link href="/" className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-13 text-ink-2 transition-colors hover:bg-subtle hover:text-ink">
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
            Add bank
          </Link>
        </div>

        {banks?.length > 0 && (
          <div className="relative pb-4">
            {banks[1] && (
              <div className="absolute inset-x-0 bottom-0 origin-bottom scale-[0.92] brightness-[0.8]" aria-hidden="true">
                <BankCard 
                  key={banks[1].$id}
                  account={banks[1]}
                  userName={`${user.firstName} ${user.lastName}`}
                  showBalance={false}
                />
              </div>
            )}
            <div className="relative">
              <BankCard 
                key={banks[0].$id}
                account={banks[0]}
                userName={`${user.firstName} ${user.lastName}`}
                showBalance={false}
              />
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="header-2">Top categories</h2>

        <ul className="flex flex-col gap-4">
          {categories.map((category) => (
            <Category key={category.name} category={category} />
          ))}
        </ul>
      </section>
    </aside>
  )
}

export default RightSidebar
