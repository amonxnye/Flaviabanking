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
  const [tokenFailed, setTokenFailed] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState('');

  const getLinkToken = useCallback(async () => {
    setTokenFailed(false);
    try {
      const data = await createLinkToken();
      if (data?.linkToken) {
        setToken(data.linkToken);
        return;
      }
    } catch {
      // handled below
    }
    setTokenFailed(true);
  }, []);

  useEffect(() => {
    getLinkToken();
  }, [user, getLinkToken]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token: string) => {
    setLinking(true);
    setError('');
    try {
      const result = await exchangePublicToken({ publicToken: public_token });
      if (result && 'error' in result && result.error) {
        setError(result.error);
        return;
      }
      router.push('/');
    } catch {
      setError('We could not link this bank. Please try again.');
    } finally {
      setLinking(false);
    }
  }, [router])
  
  const config: PlaidLinkOptions = {
    token,
    onSuccess
  }

  const { open, ready } = usePlaidLink(config);
  const disabled = !ready || linking;

  if (tokenFailed) {
    return variant === 'primary' ? (
      <div className="flex flex-col items-center gap-2" role="alert">
        <p className="text-14 text-negative">Bank linking is unavailable right now</p>
        <button type="button" onClick={getLinkToken} className="btn-secondary h-10">Try again</button>
      </div>
    ) : (
      <button type="button" onClick={getLinkToken} className="sidebar-link w-full" role="alert" aria-label="Bank linking is unavailable. Try again">
        <Plus size={18} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-negative" />
        <span className="max-xl:hidden">Linking unavailable, retry</span>
      </button>
    );
  }

  return (
    <>
      {variant === 'primary' ? (
        <Button
          onClick={() => open()}
          disabled={disabled}
          className="btn-primary"
        >
          {linking ? 'Linking bank…' : 'Connect bank'}
        </Button>
      ): variant === 'ghost' ? (
        <Button onClick={() => open()} disabled={disabled} variant="ghost" className="sidebar-link w-full justify-start">
          <Plus size={18} strokeWidth={1.5} aria-hidden="true" className="text-ink-3" />
          <span className="max-xl:hidden">Connect bank</span>
        </Button>
      ): (
        <button type="button" onClick={() => open()} disabled={disabled} className="sidebar-link w-full disabled:opacity-60" aria-label="Connect bank">
          <Plus size={18} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-3" />
          <span className="max-xl:hidden">Connect bank</span>
        </button>
      )}
      {error && (
        <p className="text-13 text-negative" role="alert">{error}</p>
      )}
    </>
  )
}

export default PlaidLink
