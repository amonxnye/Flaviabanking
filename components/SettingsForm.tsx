'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
  updateUserProfile,
  exportUserData,
  deleteUserAccount,
} from '@/lib/actions/settings.actions';

const profileSchema = z.object({
  firstName: z.string().min(2, 'At least 2 characters').max(50).regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters'),
  lastName: z.string().min(2, 'At least 2 characters').max(50).regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters'),
  address1: z.string().min(5, 'At least 5 characters').max(100),
  city: z.string().min(2).max(50),
  state: z.string().length(2, 'Use 2-letter code').regex(/^[A-Z]{2}$/, 'Must be uppercase'),
  postalCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid postal code'),
});

const SettingsForm = ({ user }: { user: User }) => {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<'profile' | 'data' | 'danger'>('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      address1: user.address1 || '',
      city: user.city || '',
      state: user.state || '',
      postalCode: user.postalCode || '',
    },
  });

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setIsLoading(true);
    setMessage(null);
    try {
      await updateUserProfile(user.userId, data);
      setMessage({ type: 'success', text: 'Profile saved' });
      router.refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Could not save your profile. Try again.' });
    }
    setIsLoading(false);
  };

  const handleExport = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const data = await exportUserData(user.userId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `horizon-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Your data was downloaded' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Could not export your data. Try again.' });
    }
    setIsLoading(false);
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsLoading(true);
    setMessage(null);
    try {
      await deleteUserAccount(user.userId);
      router.push('/sign-in');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Could not delete your account. Try again.' });
      setIsLoading(false);
    }
  };

  const sections = [
    { key: 'profile' as const, label: 'Profile' },
    { key: 'data' as const, label: 'Data and privacy' },
    { key: 'danger' as const, label: 'Delete account' },
  ];

  const sectionTitle = "text-16 font-medium text-ink";
  const sectionText = "text-14 text-ink-2";

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <nav className="flex gap-6 border-b border-line" role="tablist" aria-label="Settings sections">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => { setActiveSection(s.key); setMessage(null); }}
            className={`-mb-px h-10 border-b-2 text-14 transition-colors ${
              activeSection === s.key
                ? 'border-brand font-medium text-ink'
                : 'border-transparent text-ink-3 hover:text-ink'
            }`}
            aria-selected={activeSection === s.key}
            role="tab"
          >
            {s.label}
          </button>
        ))}
      </nav>

      {message && (
        <div
          role="alert"
          className={`notice ${
            message.type === 'success'
              ? 'bg-positive-soft text-positive'
              : 'bg-negative-soft text-negative'
          }`}
        >
          {message.text}
        </div>
      )}

      {activeSection === 'profile' && (
        <section className="card flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-1">
            <h2 className={sectionTitle}>Profile</h2>
            <p className={sectionText}>Your email and SSN cannot be changed here</p>
          </div>

          <div className="flex flex-col gap-1 rounded-lg bg-subtle px-4 py-3">
            <p className="text-12 text-ink-3">Email</p>
            <p className="text-14 text-ink">{user.email}</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onProfileSubmit)} className="flex flex-col gap-5">
              <div className="flex flex-col gap-5 sm:flex-row sm:gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem className="flex-1 flex flex-col gap-2 space-y-0">
                    <FormLabel className="form-label">First name</FormLabel>
                    <FormControl><Input className="input-class" {...field} /></FormControl>
                    <FormMessage className="form-message" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem className="flex-1 flex flex-col gap-2 space-y-0">
                    <FormLabel className="form-label">Last name</FormLabel>
                    <FormControl><Input className="input-class" {...field} /></FormControl>
                    <FormMessage className="form-message" />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="address1" render={({ field }) => (
                  <FormItem className="flex flex-col gap-2 space-y-0">
                    <FormLabel className="form-label">Address</FormLabel>
                    <FormControl><Input className="input-class" {...field} /></FormControl>
                    <FormMessage className="form-message" />
                  </FormItem>
                )} />

              <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem className="flex flex-col gap-2 space-y-0">
                    <FormLabel className="form-label">City</FormLabel>
                    <FormControl><Input className="input-class" {...field} /></FormControl>
                    <FormMessage className="form-message" />
                  </FormItem>
                )} />

              <div className="flex gap-4">
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem className="flex-1 flex flex-col gap-2 space-y-0">
                    <FormLabel className="form-label">State</FormLabel>
                    <FormControl><Input className="input-class" {...field} placeholder="NY" /></FormControl>
                    <FormMessage className="form-message" />
                  </FormItem>
                )} />
                <FormField control={form.control} name="postalCode" render={({ field }) => (
                  <FormItem className="flex-1 flex flex-col gap-2 space-y-0">
                    <FormLabel className="form-label">Postal code</FormLabel>
                    <FormControl><Input className="input-class" {...field} placeholder="10001" /></FormControl>
                    <FormMessage className="form-message" />
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end border-t border-line pt-5">
                <Button type="submit" disabled={isLoading} className="btn-primary">
                  {isLoading ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />Saving…</>
                  ) : 'Save changes'}
                </Button>
              </div>
            </form>
          </Form>
        </section>
      )}

      {activeSection === 'data' && (
        <section className="card flex flex-col divide-y divide-line">
          <div className="flex flex-col gap-3 p-6">
            <h2 className={sectionTitle}>Export your data</h2>
            <p className={sectionText}>
              Download a copy of your personal data, connected bank details and transaction history.
              This is your right under GDPR Article 20 (data portability).
            </p>
            <Button onClick={handleExport} disabled={isLoading} variant="outline" className="btn-secondary h-10 w-fit">
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin" aria-hidden="true" />Exporting…</>
              ) : 'Download my data (JSON)'}
            </Button>
          </div>

          <div className="flex flex-col gap-1 p-6">
            <h2 className={sectionTitle}>Data retention</h2>
            <p className={sectionText}>
              We keep transaction data for 7 years, as financial regulations require.
              Profile data is kept while your account is active. You can ask for full deletion
              at any time under Delete account.
            </p>
          </div>

          <div className="flex flex-col gap-1 p-6">
            <h2 className={sectionTitle}>Third-party services</h2>
            <p className={sectionText}>
              Horizon shares data with Plaid (bank account access) and Dwolla (payment processing)
              to provide its banking features. No data is sold to third parties.
            </p>
          </div>
        </section>
      )}

      {activeSection === 'danger' && (
        <section className="card flex flex-col gap-4 border-negative/30 p-6">
          <div className="flex flex-col gap-1">
            <h2 className={sectionTitle}>Delete account</h2>
            <p className={sectionText}>
              This is permanent and cannot be undone. Your data, connected bank accounts
              and transaction history will be deleted (GDPR Article 17).
            </p>
          </div>

          {!showDeleteConfirm ? (
            <Button
              onClick={() => setShowDeleteConfirm(true)}
              variant="outline"
              className="h-10 w-fit rounded-lg border-negative/40 text-14 font-medium text-negative hover:bg-negative-soft hover:text-negative"
            >
              Delete my account
            </Button>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="delete-confirm" className="form-label">
                  Type DELETE to confirm
                </label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="input-class figure max-w-xs"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleDelete}
                  disabled={deleteConfirmText !== 'DELETE' || isLoading}
                  className="h-10 rounded-lg bg-negative px-4 text-14 font-medium text-white hover:bg-negative/90"
                >
                  {isLoading ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />Deleting…</>
                  ) : 'Permanently delete account'}
                </Button>
                <Button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  variant="outline"
                  className="btn-secondary h-10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default SettingsForm;
