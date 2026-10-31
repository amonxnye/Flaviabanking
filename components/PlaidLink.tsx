'use client';

import React, { useCallback, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { PlaidLinkOnSuccess, PlaidLinkOptions, usePlaidLink } from 'react-plaid-link'
import { useRouter } from 'next/navigation';
import { createLinkToken, exchangePublicToken } from '@/lib/actions/user.actions';
import { Plus } from 'lucide-react';

const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
  const router = useRouter();

  const [token, setToken] = useState('');

  useEffect(() => {
    const getLinkToken = async () => {
      const data = await createLinkToken(user);

      setToken(data?.linkToken);
    }

    getLinkToken();
  }, [user]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token: string) => {
    await exchangePublicToken({
      publicToken: public_token,
      user,
    })

    router.push('/');
  }, [user, router])
  
  const config: PlaidLinkOptions = {
    token,
    onSuccess
  }

  const { open, ready } = usePlaidLink(config);
  
  return (
    <>
      {variant === 'primary' ? (
        <Button
          onClick={() => open()}
          disabled={!ready}
          className="btn-primary"
        >
          Connect bank
        </Button>
      ): variant === 'ghost' ? (
        <Button onClick={() => open()} variant="ghost" className="sidebar-link w-full justify-start">
          <Plus size={18} strokeWidth={1.5} aria-hidden="true" className="text-ink-3" />
          <span className="max-xl:hidden">Connect bank</span>
        </Button>
      ): (
        <button type="button" onClick={() => open()} className="sidebar-link w-full" aria-label="Connect bank">
          <Plus size={18} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-3" />
          <span className="max-xl:hidden">Connect bank</span>
        </button>
      )}
    </>
  )
}

export default PlaidLink
