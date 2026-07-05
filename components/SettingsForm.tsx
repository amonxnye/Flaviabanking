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
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      router.refresh();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile.' });
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
      setMessage({ type: 'success', text: 'Data exported successfully.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to export data.' });
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
      setMessage({ type: 'error', text: error.message || 'Failed to delete account.' });
      setIsLoading(false);
    }
  };

  const sections = [
    { key: 'profile' as const, label: 'Profile' },
    { key: 'data' as const, label: 'Data & Privacy' },
    { key: 'danger' as const, label: 'Danger Zone' },
  ];

  return (
    <div className="mt-8">
      {/* Section tabs */}
      <nav className="flex gap-2 mb-8 border-b border-gray-200" aria-label="Settings sections">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => { setActiveSection(s.key); setMessage(null); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSection === s.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            aria-selected={activeSection === s.key}
            role="tab"
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Feedback message */}
      {message && (
        <div
          role="alert"
          className={`p-4 rounded-lg mb-6 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Edit Profile</h2>
          <p className="text-sm text-gray-600 mb-6">Update your personal information. Email and SSN cannot be changed.</p>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-700">Email:</span> {user.email}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onProfileSubmit)} className="space-y-5">
              <div className="flex gap-4">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>First Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Last Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="address1" render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="city" render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex gap-4">
                <FormField control={form.control} name="state" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>State</FormLabel>
                    <FormControl><Input {...field} placeholder="NY" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="postalCode" render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl><Input {...field} placeholder="12345" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Button type="submit" disabled={isLoading} className="form-btn mt-4">
                {isLoading ? (
                  <><Loader2 size={20} className="animate-spin" />&nbsp;Saving...</>
                ) : 'Save Changes'}
              </Button>
            </form>
          </Form>
        </div>
      )}

      {/* Data & Privacy Section */}
      {activeSection === 'data' && (
        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Export Your Data</h2>
            <p className="text-sm text-gray-600 mb-4">
              Download a copy of all your personal data, connected bank info, and transaction history.
              This is your right under GDPR Article 20 (data portability).
            </p>
            <Button onClick={handleExport} disabled={isLoading} variant="outline" className="border-gray-300">
              {isLoading ? (
                <><Loader2 size={16} className="animate-spin" />&nbsp;Exporting...</>
              ) : 'Download My Data (JSON)'}
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Data Retention</h2>
            <p className="text-sm text-gray-600">
              We retain your transaction data for 7 years as required by financial regulations.
              Personal profile data is kept as long as your account is active. You can request
              full deletion at any time from the Danger Zone section.
            </p>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Third-Party Services</h2>
            <p className="text-sm text-gray-600">
              Horizon shares data with Plaid (bank account access) and Dwolla (payment processing)
              to provide core banking features. No data is sold to third parties.
            </p>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {activeSection === 'danger' && (
        <div>
          <div className="border border-red-200 rounded-lg p-6 bg-red-50">
            <h2 className="text-lg font-semibold text-red-900 mb-1">Delete Account</h2>
            <p className="text-sm text-red-700 mb-4">
              This action is permanent and cannot be undone. All your data, connected bank accounts,
              and transaction history will be permanently deleted (GDPR Article 17).
            </p>

            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                Delete My Account
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label htmlFor="delete-confirm" className="block text-sm font-medium text-red-800 mb-1">
                    Type DELETE to confirm
                  </label>
                  <Input
                    id="delete-confirm"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="max-w-xs border-red-300"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleDelete}
                    disabled={deleteConfirmText !== 'DELETE' || isLoading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isLoading ? (
                      <><Loader2 size={16} className="animate-spin" />&nbsp;Deleting...</>
                    ) : 'Permanently Delete Account'}
                  </Button>
                  <Button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsForm;
