"use client"
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Auth, googleAuthProvider, githubAuthProvider } from '@/lib/firebase.config';
import { createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, updateProfile } from 'firebase/auth';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Loading states
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const checkRedirectResult = async () => {
      console.log("[AUTH DEBUG] checkRedirectResult mounted.");
      // We must handle loading state for returning users from redirect
      // Even though we can't show a specific provider loading state easily, 
      // we can at least log and handle the result.
      try {
        const result = await getRedirectResult(Auth);
        if (result && result.user) {
          console.log("[AUTH DEBUG] Redirect result received successfully: ", result.user.email);
          router.push('/');
        } else {
          console.log("[AUTH DEBUG] No redirect result found.");
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[AUTH DEBUG] Error with redirect signup:', errorMsg);
        setError(`Authentication failed: ${errorMsg}`);
      }
    };
    checkRedirectResult();
  }, [router]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[AUTH DEBUG] Email signup button tapped.");
    setError(null);
    setIsEmailLoading(true);
    try {
      console.log("[AUTH DEBUG] Calling Firebase createUserWithEmailAndPassword...");
      const userCredential = await createUserWithEmailAndPassword(Auth, email, password);
      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      console.log("[AUTH DEBUG] User signed up successfully", userCredential.user.email);
      router.push('/');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AUTH DEBUG] Error signing up:', errorMsg);
      setError(errorMsg);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    console.log("[AUTH DEBUG] Google button tapped.");
    setError(null);
    setIsGoogleLoading(true);
    try {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      console.log(`[AUTH DEBUG] Window width: ${typeof window !== 'undefined' ? window.innerWidth : 'unknown'}, using ${isMobile ? 'redirect' : 'popup'}.`);
      
      if (isMobile) {
        console.log("[AUTH DEBUG] Calling Firebase signInWithRedirect (Google)...");
        // We do not set loading to false here because the page will navigate away.
        await signInWithRedirect(Auth, googleAuthProvider);
      } else {
        console.log("[AUTH DEBUG] Calling Firebase signInWithPopup (Google)...");
        const result = await signInWithPopup(Auth, googleAuthProvider);
        console.log("[AUTH DEBUG] Google popup signup success", result.user.email);
        router.push('/');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AUTH DEBUG] Error caught during Google signup:', errorMsg);
      setError(`Google Sign-In failed: ${errorMsg}`);
      setIsGoogleLoading(false);
    }
  };

  const handleGithubSignup = async () => {
    console.log("[AUTH DEBUG] GitHub button tapped.");
    setError(null);
    setIsGithubLoading(true);
    try {
      const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
      console.log(`[AUTH DEBUG] Window width: ${typeof window !== 'undefined' ? window.innerWidth : 'unknown'}, using ${isMobile ? 'redirect' : 'popup'}.`);
      
      if (isMobile) {
        console.log("[AUTH DEBUG] Calling Firebase signInWithRedirect (GitHub)...");
        // We do not set loading to false here because the page will navigate away.
        await signInWithRedirect(Auth, githubAuthProvider);
      } else {
        console.log("[AUTH DEBUG] Calling Firebase signInWithPopup (GitHub)...");
        const result = await signInWithPopup(Auth, githubAuthProvider);
        console.log("[AUTH DEBUG] GitHub popup signup success", result.user.email);
        router.push('/');
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AUTH DEBUG] Error caught during GitHub signup:', errorMsg);
      setError(`GitHub Sign-In failed: ${errorMsg}`);
      setIsGithubLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl text-black font-bold mb-6 text-center">Sign Up</h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm border border-red-200">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleEmailSignup}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              className="w-full text-black px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isEmailLoading || isGoogleLoading || isGithubLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full text-black px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isEmailLoading || isGoogleLoading || isGithubLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full text-black px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={isEmailLoading || isGoogleLoading || isGithubLoading}
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isEmailLoading || isGoogleLoading || isGithubLoading}
          >
            {isEmailLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing up...
              </>
            ) : (
              'Sign Up with Email'
            )}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-4">
          <div className="h-px bg-gray-300 w-full"></div>
          <span className="text-gray-500 text-sm">OR</span>
          <div className="h-px bg-gray-300 w-full"></div>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={handleGoogleSignup}
            type="button"
            className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isEmailLoading || isGoogleLoading || isGithubLoading}
          >
            {isGoogleLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              'Sign up with Google'
            )}
          </button>
          <button
            onClick={handleGithubSignup}
            type="button"
            className="w-full py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isEmailLoading || isGoogleLoading || isGithubLoading}
          >
            {isGithubLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Connecting...
              </>
            ) : (
              'Sign up with GitHub'
            )}
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
  );
}

