'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import BankCard from './BankCard';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from './ui/input';
import { createAccount, deleteAccount, updateAccount } from '@/lib/actions/account.actions';

const ACCOUNT_TYPES = ['depository', 'credit', 'loan', 'investment', 'other'] as const;

const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(60),
  holder: z.string().trim().max(80),
  institution: z.string().trim().min(2, 'At least 2 characters').max(80),
  type: z.enum(ACCOUNT_TYPES),
  subtype: z.string().trim().max(40),
  mask: z.string().trim().regex(/^\d{0,4}$/, 'Last 4 digits only'),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, '3-letter code, e.g. UGX'),
  balance: z.coerce.number({ invalid_type_error: 'Enter a number' }).finite(),
});

type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
  name: '',
  holder: '',
  institution: '',
  type: 'depository',
  subtype: '',
  mask: '',
  currency: 'UGX',
  balance: 0,
};

const ManageAccounts = ({ accounts, userName }: { accounts: Account[]; userName: string }) => {
  const router = useRouter();
  const [editing, setEditing] = useState<Account | null>(null);
  const [showForm, setShowForm] = useState(accounts.length === 0);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues });

  const startAdd = () => {
    setEditing(null);
    form.reset(emptyValues);
    setShowForm(true);
    setMessage(null);
  };

  const startEdit = (account: Account) => {
    setEditing(account);
    form.reset({
      name: account.name,
      holder: account.holder,
      institution: account.institution,
      type: (ACCOUNT_TYPES as readonly string[]).includes(account.type) ? (account.type as FormValues['type']) : 'other',
      subtype: account.subtype,
      mask: account.mask,
      currency: account.currency,
      balance: account.currentBalance,
    });
    setShowForm(true);
    setMessage(null);
  };

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    setMessage(null);
    try {
      if (editing) {
        await updateAccount(editing.id, values);
        setMessage({ type: 'success', text: 'Account updated.' });
      } else {
        await createAccount(values);
        setMessage({ type: 'success', text: 'Account added.' });
      }
      setShowForm(false);
      setEditing(null);
      form.reset(emptyValues);
      router.refresh();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Something went wrong.' });
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async (account: Account) => {
    if (!window.confirm(`Remove ${account.name}? Its transfer history stays in your records.`)) return;
    setIsLoading(true);
    setMessage(null);
    try {
      await deleteAccount(account.id);
      setMessage({ type: 'success', text: 'Account removed.' });
      router.refresh();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Something went wrong.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="header-2">Your accounts</h2>
        {!showForm && (
          <Button onClick={startAdd} className="form-btn !w-auto px-4">Add account</Button>
        )}
      </div>

      {message && (
        <div
          role="alert"
          className={`rounded-lg p-3 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
        >
          {message.text}
        </div>
      )}

      {showForm && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-16 font-semibold text-gray-900">{editing ? `Edit ${editing.name}` : 'New account'}</h3>

            <div className="flex gap-4 max-sm:flex-col">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Account name</FormLabel>
                  <FormControl><Input placeholder="e.g. Operating account" className="input-class" {...field} /></FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </FormItem>
              )} />
              <FormField control={form.control} name="institution" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Institution</FormLabel>
                  <FormControl><Input placeholder="e.g. Stanbic Bank" className="input-class" {...field} /></FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="holder" render={({ field }) => (
              <FormItem>
                <FormLabel>Account holder (optional)</FormLabel>
                <FormControl><Input placeholder="Client name — leave empty if this account is yours" className="input-class" {...field} /></FormControl>
                <FormMessage className="text-12 text-red-500" />
              </FormItem>
            )} />

            <div className="flex gap-4 max-sm:flex-col">
              <FormField control={form.control} name="type" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <select className="input-class w-full rounded-lg border border-gray-300 p-2 text-14" {...field}>
                      {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </FormItem>
              )} />
              <FormField control={form.control} name="subtype" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Subtype (optional)</FormLabel>
                  <FormControl><Input placeholder="e.g. current, savings" className="input-class" {...field} /></FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </FormItem>
              )} />
            </div>

            <div className="flex gap-4 max-sm:flex-col">
              <FormField control={form.control} name="mask" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Last 4 digits (optional)</FormLabel>
                  <FormControl><Input placeholder="1234" inputMode="numeric" className="input-class" {...field} /></FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </FormItem>
              )} />
              <FormField control={form.control} name="currency" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Currency</FormLabel>
                  <FormControl><Input placeholder="UGX" maxLength={3} className="input-class uppercase" {...field} /></FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </FormItem>
              )} />
              <FormField control={form.control} name="balance" render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Balance</FormLabel>
                  <FormControl><Input type="number" step="0.01" className="input-class" {...field} /></FormControl>
                  <FormMessage className="text-12 text-red-500" />
                </FormItem>
              )} />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={isLoading} className="form-btn !w-auto px-6">
                {isLoading ? <><Loader2 size={18} className="animate-spin" />&nbsp;Saving...</> : editing ? 'Save changes' : 'Add account'}
              </Button>
              {accounts.length > 0 && (
                <Button type="button" variant="outline" className="border-gray-300" onClick={() => { setShowForm(false); setEditing(null); }}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      )}

      {accounts.length > 0 ? (
        <div className="flex flex-wrap gap-6">
          {accounts.map((account) => (
            <div key={account.id} className="flex flex-col gap-2">
              <BankCard account={account} userName={userName} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-gray-300" onClick={() => startEdit(account)} disabled={isLoading}>
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="border-red-200 text-red-600" onClick={() => onDelete(account)} disabled={isLoading}>
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : !showForm && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
          <h3 className="text-18 font-semibold text-gray-900">No accounts yet</h3>
          <p className="max-w-md text-14 text-gray-600">Add your own accounts and the ones you manage for clients to track balances and record transfers.</p>
        </div>
      )}
    </div>
  );
};

export default ManageAccounts;
