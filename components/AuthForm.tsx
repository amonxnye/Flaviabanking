'use client';

import Image from 'next/image'
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
            email: data.email,
            idToken,
          }

          const newUser = await signUp(userData);
          await signOut(auth);

          if (newUser?.error) {
            setErrorMessage(newUser.error);
            return;
          }

          if (newUser) router.push('/')
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

  return (
    <section className="auth-form">
      <header className='flex flex-col gap-5 md:gap-8'>
          <Link href="/" className="cursor-pointer flex items-center gap-1">
            <Image 
              src="/icons/logo.svg"
              width={34}
              height={34}
              alt="Horizon logo"
            />
            <h1 className="text-26 font-ibm-plex-serif font-bold text-black-1">Horizon</h1>
          </Link>

          <div className="flex flex-col gap-1 md:gap-3">
            <h1 className="text-24 lg:text-36 font-semibold text-gray-900">
              {type === 'sign-in' ? 'Sign In' : 'Sign Up'}
              <p className="text-16 font-normal text-gray-600">
                Please enter your details
              </p>  
            </h1>
          </div>
      </header>
      <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {type === 'sign-up' && (
                <>
                  <div className="flex gap-4">
                    <CustomInput control={form.control} name='firstName' label="First Name" placeholder='Enter your first name' />
                    <CustomInput control={form.control} name='lastName' label="Last Name" placeholder='Enter your first name' />
                  </div>
                  <CustomInput control={form.control} name='address1' label="Address" placeholder='Enter your specific address' />
                  <CustomInput control={form.control} name='city' label="City" placeholder='Enter your city' />
                  <div className="flex gap-4">
                    <CustomInput control={form.control} name='state' label="State" placeholder='Example: NY' />
                    <CustomInput control={form.control} name='postalCode' label="Postal Code" placeholder='Example: 11101' />
                  </div>
                  <CustomInput control={form.control} name='dateOfBirth' label="Date of Birth" placeholder='YYYY-MM-DD' />
                </>
              )}

              <CustomInput control={form.control} name='email' label="Email" placeholder='Enter your email' />

              <CustomInput control={form.control} name='password' label="Password" placeholder='Enter your password' />

              {errorMessage && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600" role="alert">
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <Button type="submit" disabled={isLoading} className="form-btn">
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" /> &nbsp;
                      Loading...
                    </>
                  ) : type === 'sign-in' 
                    ? 'Sign In' : 'Sign Up'}
                </Button>
              </div>
            </form>
          </Form>

          <footer className="flex justify-center gap-1">
            <p className="text-14 font-normal text-gray-600">
              {type === 'sign-in'
              ? "Don't have an account?"
              : "Already have an account?"}
            </p>
            <Link href={type === 'sign-in' ? '/sign-up' : '/sign-in'} className="form-link">
              {type === 'sign-in' ? 'Sign up' : 'Sign in'}
            </Link>
          </footer>
      </>
    </section>
  )
}

export default AuthForm
