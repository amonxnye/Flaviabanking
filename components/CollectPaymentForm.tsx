'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

import { Button } from './ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from './ui/form';
import { Input } from './ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from './ui/select';
import { collectFromUser, checkCollectionStatus } from '@/lib/actions/iotec.actions';

const formSchema = z.object({
  phone: z
    .string()
    .regex(/^(\+?256|0)?7\d{8}$/, 'Enter a valid Ugandan mobile number (e.g. 0772123456)'),
  amount: z.coerce
    .number()
    .int('Enter a whole number of shillings')
    .min(500, 'Minimum is 500 UGX')
    .max(5_000_000, 'Maximum is 5,000,000 UGX'),
  channel: z.enum(['Mtn', 'Airtel']),
  note: z.string().max(140).optional(),
});

type Phase = 'idle' | 'submitting' | 'pending' | 'success' | 'failed';

const MAX_POLLS = 20; // ~60s at 3s intervals
const POLL_INTERVAL_MS = 3000;

const CollectPaymentForm = () => {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [statusText, setStatusText] = useState('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { phone: '', amount: undefined as unknown as number, channel: 'Mtn', note: '' },
  });

  const poll = async (transactionId: string) => {
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      try {
        const result = await checkCollectionStatus(transactionId);
        if (result.settled) {
          setPhase('success');
          setStatusText('Payment received and added to your wallet');
          router.refresh();
          return;
        }
        if (result.failed) {
          setPhase('failed');
          setStatusText(result.statusMessage || 'The payment was not completed.');
          return;
        }
      } catch {
        // transient — keep polling
      }
    }
    setStatusText(
      'Still waiting for confirmation. It will appear in your wallet once the payer approves.'
    );
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setPhase('submitting');
    setStatusText('');
    try {
      const res = await collectFromUser({
        phone: data.phone,
        amount: data.amount,
        channel: data.channel,
        note: data.note,
      });
      setPhase('pending');
      setStatusText('Request sent. Ask the customer to approve the prompt on their phone.');
      poll(res.transactionId);
    } catch (error: any) {
      setPhase('failed');
      setStatusText(error?.message || 'Failed to initiate collection.');
    }
  };

  const busy = phase === 'submitting' || phase === 'pending';

  return (
    <div className="card p-6">
      <h2 className="text-16 font-medium text-ink">Collect a payment</h2>
      <p className="mt-1 text-14 text-ink-2">
        Send a mobile-money request. The customer approves it on their phone and the money lands in your wallet.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-5">
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel className="form-label">Customer phone number</FormLabel>
              <FormControl>
                <Input type="tel" placeholder="0772 123456" className="input-class figure" {...field} />
              </FormControl>
              <FormMessage className="form-message" />
            </FormItem>
          )} />

          <div className="flex gap-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="form-label">Amount (UGX)</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" placeholder="10000" className="input-class figure" {...field} />
                </FormControl>
                <FormMessage className="form-message" />
              </FormItem>
            )} />

            <FormField control={form.control} name="channel" render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="form-label">Network</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="input-class">
                      {field.value === 'Mtn' ? 'MTN' : field.value}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="rounded-lg border-line bg-surface">
                    <SelectItem value="Mtn">MTN</SelectItem>
                    <SelectItem value="Airtel">Airtel</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="form-message" />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="note" render={({ field }) => (
            <FormItem>
              <FormLabel className="form-label">Note, optional</FormLabel>
              <FormControl>
                <Input placeholder="Consultation fee" className="input-class" {...field} />
              </FormControl>
              <FormMessage className="form-message" />
            </FormItem>
          )} />

          {statusText && (
            <div
              role="status"
              className={`notice flex items-start gap-2 ${
                phase === 'success'
                  ? 'bg-positive-soft text-positive'
                  : phase === 'failed'
                  ? 'bg-negative-soft text-negative'
                  : 'bg-subtle text-ink-2'
              }`}
            >
              {phase === 'success' && <CheckCircle2 size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />}
              {phase === 'failed' && <XCircle size={18} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden="true" />}
              {busy && <Loader2 size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" />}
              <span>{statusText}</span>
            </div>
          )}

          <Button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? (
              <><Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />{phase === 'pending' ? 'Waiting for approval…' : 'Sending request…'}</>
            ) : (
              'Request payment'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CollectPaymentForm;
