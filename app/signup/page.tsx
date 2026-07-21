"use client"
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { Auth } from '@/lib/firebase.config';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';

type AuthStatus = 
  | 'initializing' 
  | 'authenticating' 
  | 'authenticated' 
  | 'unauthenticated' 
  | 'profile-missing' 
  | 'error';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // State machine
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
  const [loadingType, setLoadingType] = useState<'email' | 'google' | 'github' | null>(null);
  const [inAppBrowser, setInAppBrowser] = useState(false);

  const router = useRouter();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Parse cookie helper
  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // Set cookie helper
  const setCookie = (name: string, value: string, maxAgeSeconds: number) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=${value}; path=/; max-age=${maxAgeSeconds}; secure; samesite=lax`;
  };

  // Detect in-app browsers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isDangerousBrowser = (
        ua.indexOf('FBAN') > -1 ||
        ua.indexOf('FBAV') > -1 ||
        ua.indexOf('Instagram') > -1 ||
        ua.indexOf('Threads') > -1 ||
        ua.indexOf('Twitter') > -1 ||
        ua.indexOf('Line') > -1 ||
        ua.indexOf('Snapchat') > -1 ||
        ua.indexOf('MicroMessenger') > -1
      );
      setInAppBrowser(isDangerousBrowser);
    }
  }, []);

  // Listen for persistent session changes (Source of Truth)
  useEffect(() => {
    let isMounted = true;
    console.log("[AUTH DEBUG] Signup page mounted. Status:", authStatus);

    const unsubscribe = onAuthStateChanged(Auth, (user) => {
      if (user) {
        console.log("[AUTH DEBUG] onAuthStateChanged: Authenticated as", user.email);
        if (isMounted) {
          setAuthStatus('authenticated');
          const dest = getCookie('intended_destination') || '/';
          setCookie('intended_destination', '', -1);
          router.push(dest);
        }
      } else {
        console.log("[AUTH DEBUG] onAuthStateChanged: Unauthenticated");
        if (isMounted) {
          setAuthStatus(prev => prev === 'initializing' ? 'unauthenticated' : prev);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [router]);

  // Dynamic initialization for Google Identity Services
  const initGis = () => {
    if (typeof window !== 'undefined' && window.google && googleButtonRef.current) {
      if (!clientId) {
        console.error("[AUTH DEBUG] NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing.");
        return;
      }

      console.log("[AUTH DEBUG] Initializing Google Identity Services...");
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      // Compute element width dynamically to prevent rendering overflows
      const elementWidth = googleButtonRef.current.clientWidth || 384;
      console.log("[AUTH DEBUG] Rendering Google button with width:", elementWidth);
      
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        { theme: 'outline', size: 'large', width: elementWidth }
      );

      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log("[AUTH DEBUG] Google One Tap prompt was not displayed or skipped.");
        }
      });
    }
  };

  // Re-run Google button rendering on status changes or when script is already in window
  useEffect(() => {
    if (authStatus === 'unauthenticated' || authStatus === 'error') {
      // Delay initialization slightly to ensure ref layout is computed
      const timer = setTimeout(() => {
        initGis();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [authStatus]);

  // Google Identity Services Response Handler
  const handleGoogleCredentialResponse = async (response: any) => {
    console.log("[AUTH DEBUG] Google Identity Services response received.");
    
    if (!response.credential) {
      console.error("[AUTH DEBUG] Google GIS response missing credential.");
      setError("Google authentication failed to return a credential.");
      setAuthStatus('error');
      return;
    }

    setAuthStatus('authenticating');
    setLoadingType('google');
    setError(null);

    try {
      console.log("[AUTH DEBUG] Exchanging Google ID Token for Firebase Session...");
      const googleCredential = GoogleAuthProvider.credential(response.credential);
      const result = await signInWithCredential(Auth, googleCredential);
      
      console.log("[AUTH DEBUG] Firebase session created successfully via GIS:", result.user.email);
      setAuthStatus('authenticated');
      const dest = getCookie('intended_destination') || '/';
      setCookie('intended_destination', '', -1);
      router.push(dest);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AUTH DEBUG] Error exchanging Google credential in Firebase:', errorMsg);
      setError(`Google Sign-In failed: ${errorMsg}`);
      setAuthStatus('error');
      setLoadingType(null);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[AUTH DEBUG] Email signup button tapped.");
    setError(null);
    setAuthStatus('authenticating');
    setLoadingType('email');
    try {
      console.log("[AUTH DEBUG] Calling Firebase createUserWithEmailAndPassword...");
      const userCredential = await createUserWithEmailAndPassword(Auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      
      console.log("[AUTH DEBUG] User signed up successfully", userCredential.user.email);
      setAuthStatus('authenticated');
      router.push('/');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AUTH DEBUG] Error signing up:', errorMsg);
      setError(errorMsg);
      setAuthStatus('error');
      setLoadingType(null);
    }
  };

  const handleGithubSignup = async () => {
    console.log("[AUTH DEBUG] Starting Custom GitHub Flow.");
    setError(null);
    setAuthStatus('authenticating');
    setLoadingType('github');

    const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!githubClientId) {
      setError("GitHub Client ID is not configured in NEXT_PUBLIC_GITHUB_CLIENT_ID.");
      setAuthStatus('error');
      setLoadingType(null);
      return;
    }

    try {
      const array = new Uint8Array(16);
      window.crypto.getRandomValues(array);
      const state = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

      setCookie('github_oauth_state', state, 300);
      setCookie('intended_destination', window.location.pathname, 300);

      const redirectUri = `${window.location.origin}/api/auth/github/callback`;
      const githubUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=read:user`;

      console.log("[AUTH DEBUG] Redirecting to GitHub OAuth...");
      window.location.href = githubUrl;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AUTH DEBUG] Error during GitHub redirect initialization:', errorMsg);
      setError(`GitHub Sign-In redirect failed: ${errorMsg}`);
      setAuthStatus('error');
      setLoadingType(null);
    }
  };

  if (authStatus === 'initializing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-gray-600 font-medium">Verifying authentication...</p>
      </div>
    );
  }

  return (
    <>
      <Script 
        src="https://accounts.google.com/gsi/client" 
        strategy="afterInteractive"
        onLoad={initGis}
      />
      
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        {inAppBrowser && (
          <div className="w-full max-w-md bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg mb-4 text-sm font-medium">
            For secure sign-in, open this page in Safari or Chrome.
          </div>
        )}

        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md relative overflow-hidden">
          {/* Authenticating Loading Overlay */}
          {authStatus === 'authenticating' && (
            <div className="absolute inset-0 bg-white/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
              <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-700 font-semibold">
                {loadingType === 'email' && 'Creating your account...'}
                {loadingType === 'google' && 'Connecting with Google...'}
                {loadingType === 'github' && 'Connecting to GitHub...'}
                {!loadingType && 'Authenticating...'}
              </p>
            </div>
          )}

          <h1 className="text-2xl text-black font-bold mb-6 text-center">Sign Up</h1>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm border border-red-200 text-center">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleEmailSignup}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                className="w-full text-black px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={authStatus === 'authenticating'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full text-black px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={authStatus === 'authenticating'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                className="w-full text-black px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={authStatus === 'authenticating'}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={authStatus === 'authenticating'}
            >
              Sign Up with Email
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center space-x-4">
            <div className="h-px bg-gray-300 w-full"></div>
            <span className="text-gray-500 text-sm">OR</span>
            <div className="h-px bg-gray-300 w-full"></div>
          </div>

          <div className="mt-6 space-y-3 flex flex-col items-center">
            {/* Google Identity Services Button Container */}
            {clientId ? (
              <div 
                ref={googleButtonRef} 
                className="w-full flex justify-center mb-1" 
                style={{ minHeight: '40px' }}
              >
                {/* Google Button renders here */}
              </div>
            ) : (
              <div className="w-full p-3 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200 text-center mb-2">
                NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing. Google Auth disabled.
              </div>
            )}

            <button
              onClick={handleGithubSignup}
              type="button"
              className="w-full py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={authStatus === 'authenticating'}
            >
              Continue with GitHub
            </button>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link href="/login" className="text-blue-600 hover:underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

declare global {
  interface Window {
    google?: any;
  }
}
