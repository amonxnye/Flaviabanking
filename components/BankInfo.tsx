"use client";

import { Landmark } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";

import { cn, formUrlQuery, formatAmount } from "@/lib/utils";

const BankInfo = ({ account, appwriteItemId, type }: BankInfoProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isActive = appwriteItemId === account?.appwriteItemId;

  const handleBankChange = () => {
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: "id",
      value: account?.appwriteItemId,
    });
    router.push(newUrl, { scroll: false });
  };

  return (
    <div
      onClick={handleBankChange}
      className={cn("flex items-center gap-3 rounded-xl border border-line bg-surface p-4", {
        "cursor-pointer transition-colors hover:bg-subtle": type === "card",
        "border-brand": type === "card" && isActive,
      })}
    >
      <div className="flex-center size-9 shrink-0 rounded-lg bg-subtle text-ink-2">
        <Landmark size={18} strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="truncate text-14 font-medium text-ink">{account.name}</h2>
        {type === "full" && (
          <p className="text-13 text-ink-3 first-letter:uppercase">{account.subtype}</p>
        )}
      </div>
      <p className="figure text-14 text-ink">{formatAmount(account.currentBalance)}</p>
    </div>
  );
};

export default BankInfo;
