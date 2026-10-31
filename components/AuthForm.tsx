'use client';

import Link from 'next/link'
import React, { useState } from 'react'

import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form } from "@/components/ui/form"
import CustomInput from './CustomInput';
import { authFormSchema } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/actions/user.actions';
import PlaidLink from './PlaidLink';
import Logo from './Logo';
import { getFirebaseAuth } from '@/lib/firebase/client';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';

// Firebase Auth error codes → messages a customer can act on.
const friendlyAuthError = (error: unknown): string => {
  const code = (error as { code?: string })?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-email':
      return 'Invalid email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/operation-not-allowed':
    case 'auth/configuration-not-found':
      return 'Email/password sign-in is not enabled for this app yet.';
    default:
      return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
  }
};

const AuthForm = ({ type }: { type: string }) => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const formSchema = authFormSchema(type);

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
      resolver: zodResolver(formSchema),
      defaultValues: {
        email: "",
        password: ''
      },
    })
   
    // 2. Define a submit handler.
    // Auth happens in the browser with Firebase; the ID token is then exchanged
    // for an httpOnly session cookie by a server action. Once the cookie is set
    // the browser-side Firebase session is no longer needed, so we sign it out.
    const onSubmit = async (data: z.infer<typeof formSchema>) => {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const auth = getFirebaseAuth();

        if(type === 'sign-up') {
          const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          const idToken = await credential.user.getIdToken();

          const userData = {
            firstName: data.firstName!,
            lastName: data.lastName!,
            address1: data.address1!,
            city: data.city!,
            state: data.state!,
            postalCode: data.postalCode!,
            dateOfBirth: data.dateOfBirth!,
            ssn: data.ssn!,
            email: data.email,
            idToken,
          }

          const newUser = await signUp(userData);
          await signOut(auth);

          if (newUser?.error) {
            setErrorMessage(newUser.error);
            return;
          }

          setUser(newUser);
        }

        if(type === 'sign-in') {
          const credential = await signInWithEmailAndPassword(auth, data.email, data.password);
          const idToken = await credential.user.getIdToken();

          const response = await signIn({ idToken });
          await signOut(auth);

          if (response?.error) {
            setErrorMessage(response.error);
            return;
          }

          if(response) router.push('/')
        }
      } catch (error) {
        setErrorMessage(friendlyAuthError(error));
      } finally {
        setIsLoading(false);
      }
    }

  const title = user ? 'Link a bank' : type === 'sign-in' ? 'Sign in' : 'Create your account';
  const subtitle = user
    ? 'Connect your first bank to see balances and send transfers'
    : type === 'sign-in'
      ? 'Use the email and password for your Horizon account'
      : 'We use these details to verify you for bank transfers';

  return (
    <section className="auth-form">
      <header className="flex flex-col gap-8">
        <Link href="/" className="w-fit" aria-label="Horizon home">
          <Logo />
        </Link>

        <div className="flex flex-col gap-1">
          <h1 className="text-24 font-medium text-ink">{title}</h1>
          <p className="text-14 text-ink-2">{subtitle}</p>
        </div>
      </header>
      {user ? (
        <div className="flex flex-col gap-4">
          <PlaidLink user={user} variant="primary" />
        </div>
      ): (
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
              {type === 'sign-up' && (
                <>
                  <div className="flex gap-4">
                    <CustomInput control={form.control} name='firstName' label="First name" placeholder='Amara' />
                    <CustomInput control={form.control} name='lastName' label="Last name" placeholder='Nakato' />
                  </div>
                  <CustomInput control={form.control} name='address1' label="Address" placeholder='Street and number' />
                  <CustomInput control={form.control} name='city' label="City" placeholder='New York' />
                  <div className="flex gap-4">
                    <CustomInput control={form.control} name='state' label="State" placeholder='NY' />
                    <CustomInput control={form.control} name='postalCode' label="Postal code" placeholder='11101' />
                  </div>
                  <div className="flex gap-4">
                    <CustomInput control={form.control} name='dateOfBirth' label="Date of birth" placeholder='YYYY-MM-DD' />
                    <CustomInput control={form.control} name='ssn' label="SSN, last 4 digits" placeholder='1234' />
                  </div>
                </>
              )}

              <CustomInput control={form.control} name='email' label="Email" placeholder='name@company.com' />

              <CustomInput control={form.control} name='password' label="Password" placeholder={type === 'sign-in' ? 'Your password' : 'At least 8 characters'} />

              {errorMessage && (
                <div className="notice bg-negative-soft text-negative" role="alert">
                  {errorMessage}
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="btn-primary mt-1 w-full">
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" aria-hidden="true" />
                    {type === 'sign-in' ? 'Signing in…' : 'Creating account…'}
                  </>
                ) : type === 'sign-in'
                  ? 'Sign in' : 'Create account'}
              </Button>
            </form>
          </Form>

          <footer className="flex justify-center gap-1 text-14">
            <p className="text-ink-2">
              {type === 'sign-in'
              ? "No account yet?"
              : "Already have an account?"}
            </p>
            <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className="form-link">
              {type === 'sign-in' ? 'Create one' : 'Sign in'}
            </Link>
          </footer>
        </>
      )}
    </section>
  )
}

export default AuthForm
