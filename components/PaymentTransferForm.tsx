"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { transferFunds } from "@/lib/actions/transfer.actions";

import { BankDropdown } from "./BankDropdown";
import { Button } from "./ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(4, "Transfer note is too short"),
  amount: z.string().min(4, "Amount is too short"),
  senderBank: z.string().min(4, "Please select a valid bank account"),
  sharableId: z.string().min(8, "Please select a valid sharable Id"),
});

const PaymentTransferForm = ({ accounts }: PaymentTransferFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  // One key per transfer attempt: a double click or a retry after a timeout
  // reuses it, so the server never starts the same transfer twice.
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      amount: "",
      senderBank: "",
      sharableId: "",
    },
  });

  const submit = async (data: z.infer<typeof formSchema>) => {
    if (isLoading) return;
    setIsLoading(true);
    setTransferError('');

    try {
      const result = await transferFunds({
        idempotencyKey,
        senderBankId: data.senderBank,
        sharableId: data.sharableId,
        amount: data.amount,
        name: data.name,
        email: data.email,
      });

      if (result.ok) {
        form.reset();
        setIdempotencyKey(crypto.randomUUID());
        router.push("/");
        return;
      }

      setTransferError(result.error);
      // Keep the key only when the outcome is unknown, so a retry is safe.
      if (!result.retryable) setIdempotencyKey(crypto.randomUUID());
    } catch {
      setTransferError('Transfer failed. Please try again.');
    }

    setIsLoading(false);
  };

  const row = "grid gap-3 space-y-0 px-6 py-5 md:grid-cols-[260px_minmax(0,1fr)] md:gap-8";
  const label = "text-14 font-medium text-ink";
  const hint = "text-13 text-ink-3";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="card flex max-w-[880px] flex-col divide-y divide-line">
        <FormField
          control={form.control}
          name="senderBank"
          render={() => (
            <FormItem className={row}>
              <div className="flex flex-col gap-1">
                <FormLabel className={label}>Source bank</FormLabel>
                <FormDescription className={hint}>
                  The linked account the money leaves from
                </FormDescription>
              </div>
              <div className="flex w-full flex-col gap-2">
                <FormControl>
                  <BankDropdown
                    accounts={accounts}
                    setValue={form.setValue}
                    otherStyles="!w-full"
                  />
                </FormControl>
                <FormMessage className="form-message" />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className={row}>
              <div className="flex flex-col gap-1">
                <FormLabel className={label}>Transfer note</FormLabel>
                <FormDescription className={hint}>
                  A short note about what this transfer is for
                </FormDescription>
              </div>
              <div className="flex w-full flex-col gap-2">
                <FormControl>
                  <Textarea
                    placeholder="Invoice 1042, October supplies"
                    className="input-class min-h-[88px] py-2"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="form-message" />
              </div>
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-1 bg-canvas/60 px-6 py-4">
          <h2 className="text-16 font-medium text-ink">
            Recipient
          </h2>
          <p className="text-13 text-ink-2">
            Their email and the shareable ID shown under their card on My banks
          </p>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className={row}>
              <FormLabel className={`${label} md:pt-2.5`}>
                Recipient&apos;s email
              </FormLabel>
              <div className="flex w-full flex-col gap-2">
                <FormControl>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    className="input-class"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="form-message" />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sharableId"
          render={({ field }) => (
            <FormItem className={row}>
              <FormLabel className={`${label} md:pt-2.5`}>
                Recipient&apos;s shareable ID
              </FormLabel>
              <div className="flex w-full flex-col gap-2">
                <FormControl>
                  <Input
                    placeholder="Paste the ID they shared with you"
                    className="input-class figure"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="form-message" />
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className={row}>
              <FormLabel className={`${label} md:pt-2.5`}>
                Amount (USD)
              </FormLabel>
              <div className="flex w-full flex-col gap-2">
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder="250.00"
                    className="input-class figure max-w-[240px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="form-message" />
              </div>
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-end">
          {transferError && (
            <p className="notice flex-1 bg-negative-soft text-negative" role="alert">
              {transferError}
            </p>
          )}
          <Button type="submit" disabled={isLoading} className="btn-primary min-w-[160px]">
            {isLoading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" /> Sending…
              </>
            ) : (
              "Transfer funds"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default PaymentTransferForm;
