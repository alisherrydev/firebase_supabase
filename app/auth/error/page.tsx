"use client"
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function AuthErrorPage() {
  const router = useRouter();
  const [errorDesc, setErrorDesc] = useState<string>('An unknown authentication error occurred.');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const err = searchParams.get('error');
      if (err) {
        if (err === 'invalid_state') {
          setErrorDesc('Security state mismatch. Please clear your cache and try again.');
        } else if (err === 'token_exchange_failed') {
          setErrorDesc('Failed to exchange authorization code with GitHub. Please check your credentials.');
        } else if (err === 'missing_token') {
          setErrorDesc('No credentials were found in the callback hash.');
        } else if (err === 'server_error') {
          setErrorDesc('A server error occurred during authentication exchange.');
        } else {
          setErrorDesc(decodeURIComponent(err));
        }
      }
    }
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border border-red-100 flex flex-col items-center text-center">
        <div className="bg-red-50 text-red-500 p-3 rounded-full mb-4">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Error</h1>
        <p className="text-sm text-gray-600 mb-6">{errorDesc}</p>
        
        <div className="flex gap-4 w-full">
          <button
            onClick={() => router.replace('/signup')}
            className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded transition font-medium text-center"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
