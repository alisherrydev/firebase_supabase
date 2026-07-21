"use client"
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Auth } from '@/lib/firebase.config';
import { 
  createUserWithEmailAndPassword, 
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
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


  // Parse cookie helper
  const getCookie = (cookieName: string) => {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${cookieName}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
  };

  // Set cookie helper
  const setCookie = (cookieName: string, value: string, maxAgeSeconds: number) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${cookieName}=${value}; path=/; max-age=${maxAgeSeconds}; secure; samesite=lax`;
  };

  // Detect in-app browsers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent || navigator.vendor || (window as unknown as { opera?: string }).opera || '';
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
      
      // Call state update asynchronously to avoid react-hooks/set-state-in-effect warning
      setTimeout(() => {
        setInAppBrowser(isDangerousBrowser);
      }, 0);
    }
  }, []);

  // Google Sign-In with Popup Handler
  const handleGoogleSignup = useCallback(async () => {
    console.log("[AUTH DEBUG] Google Sign-In popup initiated.");
    setError(null);
    setAuthStatus('authenticating');
    setLoadingType('google');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(Auth, provider);
      
      console.log("[AUTH DEBUG] Firebase session created successfully via Google Popup:", result.user.email);
      setAuthStatus('authenticated');
      const dest = getCookie('intended_destination') || '/';
      setCookie('intended_destination', '', -1);
      router.push(dest);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AUTH DEBUG] Error in Google Popup Sign-In:', errorMsg);
      setError(`Google Sign-In failed: ${errorMsg}`);
      setAuthStatus('error');
      setLoadingType(null);
    }
  }, [router]);

  // Listen for persistent session changes (Source of Truth)
  useEffect(() => {
    let isMounted = true;
    console.log("[AUTH DEBUG] Signup page mounted.");

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
              <p className="text-gray-700 font-semibold text-center px-4">
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
              className="w-full h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition flex items-center justify-center gap-2 text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
            <button
              onClick={handleGoogleSignup}
              type="button"
              className="w-full h-10 px-4 bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition flex items-center justify-center gap-3 text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={authStatus === 'authenticating'}
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.41 0-6.19-2.78-6.19-6.19s2.78-6.19 6.19-6.19c1.54 0 2.94.57 4.03 1.5l3.05-3.05C18.99 1.91 15.86 1 12.24 1 6.03 1 1 6.03 1 12.24s5.03 11.24 11.24 11.24c6.31 0 11.74-4.5 11.74-11.24 0-.76-.08-1.52-.22-2.24H12.24z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <button
              onClick={handleGithubSignup}
              type="button"
              className="w-full h-10 px-4 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition flex items-center justify-center gap-3 text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={authStatus === 'authenticating'}
            >
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              <span>Continue with GitHub</span>
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


