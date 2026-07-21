"use client"
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Auth } from '@/lib/firebase.config';
import { GithubAuthProvider, signInWithCredential } from 'firebase/auth';

type AuthStatus = 'initializing' | 'authenticating' | 'authenticated' | 'error';

export default function GithubCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [error, setError] = useState<string | null>(null);

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  useEffect(() => {
    let isMounted = true;
    console.log("[AUTH DEBUG] Client-side GitHub Callback page mounted.");

    const processGithubToken = async () => {
      // 1. Extract token from hash
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get('token');

      if (!token) {
        console.error("[AUTH DEBUG] No token found in hash.");
        if (isMounted) {
          setError("GitHub callback did not provide a token.");
          setStatus('error');
          router.replace('/auth/error?error=missing_token');
        }
        return;
      }

      if (isMounted) setStatus('authenticating');

      try {
        console.log("[AUTH DEBUG] Exchanging GitHub access token with Firebase...");
        const credential = GithubAuthProvider.credential(token);
        const result = await signInWithCredential(Auth, credential);
        
        console.log("[AUTH DEBUG] Firebase session verified successfully:", result.user.email);
        
        if (isMounted) {
          setStatus('authenticated');
          const dest = getCookie('intended_destination') || '/';
          // Clean up cookie
          document.cookie = "intended_destination=; path=/; max-age=-1";
          router.replace(dest);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[AUTH DEBUG] Error signing in with GitHub credential:', errorMsg);
        if (isMounted) {
          setError(errorMsg);
          setStatus('error');
          router.replace(`/auth/error?error=${encodeURIComponent(errorMsg)}`);
        }
      }
    };

    processGithubToken();

    return () => {
      isMounted = false;
    };
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md flex flex-col items-center">
        {status === 'error' ? (
          <>
            <div className="text-red-500 font-bold mb-4">Authentication Failed</div>
            <p className="text-sm text-gray-600 text-center mb-6">{error}</p>
            <button
              onClick={() => router.replace('/signup')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Return to Signup
            </button>
          </>
        ) : (
          <>
            <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600 font-medium">
              {status === 'initializing' ? 'Initializing callback...' : 'Creating application session...'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
