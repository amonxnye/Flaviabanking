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
          setStatusText('Payment received and added to your wallet.');
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
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-18 font-semibold text-gray-900">Collect a payment</h2>
      <p className="mt-1 text-14 text-gray-600">
        Send a mobile-money request. The customer approves it on their phone and the funds land in your wallet.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-14 font-medium text-gray-700">Customer phone number</FormLabel>
              <FormControl>
                <Input placeholder="0772123456" className="input-class" {...field} />
              </FormControl>
              <FormMessage className="text-12 text-red-500" />
            </FormItem>
          )} />

          <div className="flex gap-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="text-14 font-medium text-gray-700">Amount (UGX)</FormLabel>
                <FormControl>
                  <Input type="number" inputMode="numeric" placeholder="10000" className="input-class" {...field} />
                </FormControl>
                <FormMessage className="text-12 text-red-500" />
              </FormItem>
            )} />

            <FormField control={form.control} name="channel" render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel className="text-14 font-medium text-gray-700">Network</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="input-class bg-white">
                      {field.value}
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-white">
                    <SelectItem value="Mtn">MTN</SelectItem>
                    <SelectItem value="Airtel">Airtel</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="text-12 text-red-500" />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="note" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-14 font-medium text-gray-700">Note (optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Consultation fee" className="input-class" {...field} />
              </FormControl>
              <FormMessage className="text-12 text-red-500" />
            </FormItem>
          )} />

          {statusText && (
            <div
              role="status"
              className={`flex items-start gap-2 rounded-lg p-3 text-sm ${
                phase === 'success'
                  ? 'bg-green-50 text-green-700'
                  : phase === 'failed'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-blue-50 text-blue-700'
              }`}
            >
              {phase === 'success' && <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
              {phase === 'failed' && <XCircle size={18} className="mt-0.5 shrink-0" />}
              {busy && <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin" />}
              <span>{statusText}</span>
            </div>
          )}

          <Button type="submit" disabled={busy} className="form-btn w-full">
            {busy ? (
              <><Loader2 size={20} className="animate-spin" />&nbsp;{phase === 'pending' ? 'Waiting for approval...' : 'Sending request...'}</>
            ) : (
              'Request Payment'
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CollectPaymentForm;
