"use client";

import { useSearchParams, useRouter } from "next/navigation";

import { cn, formUrlQuery } from "@/lib/utils";

export const BankTabItem = ({ account, appwriteItemId }: BankTabItemProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
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
      className={cn(
        "-mb-px flex h-10 items-center border-b-2 border-transparent text-14 text-ink-3 transition-colors hover:text-ink",
        { "border-brand font-medium text-ink": isActive }
      )}
    >
      <span className="line-clamp-1">{account.name}</span>
    </div>
  );
};
