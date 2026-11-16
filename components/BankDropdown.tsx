"use client";

import { Landmark } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from "@/components/ui/select";
import { formUrlQuery, formatAmount } from "@/lib/utils";

export const BankDropdown = ({
  accounts = [],
  setValue,
  otherStyles,
}: BankDropdownProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selected, setSelected] = useState(accounts[0]);

  const handleBankChange = (id: string) => {
    const account = accounts.find((account) => account.appwriteItemId === id);
    if (!account) return;

    setSelected(account);
    const newUrl = formUrlQuery({
      params: searchParams.toString(),
      key: "id",
      value: id,
    });
    router.push(newUrl, { scroll: false });

    if (setValue) {
      setValue("senderBank", id);
    }
  };

  return (
    <Select
      defaultValue={selected?.id}
      onValueChange={(value) => handleBankChange(value)}
    >
      <SelectTrigger
        className={`flex h-10 w-full gap-2.5 rounded-lg border-input bg-surface text-14 text-ink focus:ring-brand md:w-[300px] ${otherStyles}`}
      >
        <Landmark size={18} strokeWidth={1.5} className="shrink-0 text-ink-3" aria-hidden="true" />
        <p className="line-clamp-1 w-full text-left">{selected?.name}</p>
      </SelectTrigger>
      <SelectContent
        className={`w-full rounded-lg border-line bg-surface md:w-[300px] ${otherStyles}`}
        align="end"
      >
        <SelectGroup>
          <SelectLabel className="py-2 text-12 font-normal text-ink-3">
            Choose an account
          </SelectLabel>
          {accounts.map((account: Account) => (
            <SelectItem
              key={account.id}
              value={account.appwriteItemId}
              className="cursor-pointer rounded-md py-2"
            >
              <div className="flex flex-col">
                <p className="text-14 font-medium text-ink">{account.name}</p>
                <p className="figure text-13 text-ink-2">
                  {formatAmount(account.currentBalance)}
                </p>
              </div>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
};
