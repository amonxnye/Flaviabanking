'use client';

import React, { useCallback, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { PlaidLinkOnSuccess, PlaidLinkOptions, usePlaidLink } from 'react-plaid-link'
import { useRouter } from 'next/navigation';
import { createLinkToken, exchangePublicToken } from '@/lib/actions/user.actions';
import Image from 'next/image';

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
    return (
      <div className="flex flex-col gap-2" role="alert">
        <p className="text-14 text-red-600">Bank linking is unavailable right now.</p>
        <Button onClick={getLinkToken} variant="outline">Try again</Button>
      </div>
    );
  }

  return (
    <>
      {variant === 'primary' ? (
        <Button
          onClick={() => open()}
          disabled={disabled}
          className="plaidlink-primary"
        >
          {linking ? 'Linking bank...' : 'Connect bank'}
        </Button>
      ): variant === 'ghost' ? (
        <Button onClick={() => open()} disabled={disabled} variant="ghost" className="plaidlink-ghost">
          <Image 
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className='hidden text-[16px] font-semibold text-black-2 xl:block'>Connect bank</p>
        </Button>
      ): (
        <Button onClick={() => open()} disabled={disabled} className="plaidlink-default">
          <Image 
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className='text-[16px] font-semibold text-black-2'>Connect bank</p>
        </Button>
      )}
      {error && (
        <p className="text-14 text-red-600" role="alert">{error}</p>
      )}
    </>
  )
}

export default PlaidLink