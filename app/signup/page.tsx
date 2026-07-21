"use client"
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Auth, googleAuthProvider, githubAuthProvider } from '@/lib/firebase.config';
import { createUserWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, updateProfile, updatePassword, User } from 'firebase/auth';
import { useEffect } from 'react';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const [oauthUser, setOauthUser] = useState<User | null>(null);
  const [oauthPassword, setOauthPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(Auth);
        if (result && result.user) {
          console.log("Redirect signup success", result.user);
          setOauthUser(result.user);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error with redirect signup:', errorMsg);
        setError(errorMsg);
      }
    };
    checkRedirectResult();
  }, []);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(Auth, email, password);
      // Update profile with name
      await updateProfile(userCredential.user, {
        displayName: name
      });
      console.log("User signed up successfully", userCredential.user);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error signing up:', errorMsg);
      setError(errorMsg);
    }
  };

  const handleGoogleSignup = async () => {
    setError(null);
    try {
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        await signInWithRedirect(Auth, googleAuthProvider);
      } else {
        const result = await signInWithPopup(Auth, googleAuthProvider);
        console.log("Google signup success", result.user);
        setOauthUser(result.user);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error with Google signup:', errorMsg);
      setError(errorMsg);
    }
  };

  const handleGithubSignup = async () => {
    setError(null);
    try {
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        await signInWithRedirect(Auth, githubAuthProvider);
      } else {
        const result = await signInWithPopup(Auth, githubAuthProvider);
        console.log("Github signup success", result.user);
        setOauthUser(result.user);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error with Github signup:', errorMsg);
      setError(errorMsg);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthUser) return;
    setError(null);
    try {
      await updatePassword(oauthUser, oauthPassword);
      setPasswordSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2000);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error setting password:', errorMsg);
      setError(errorMsg);
    }
  };

  if (oauthUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold mb-6 text-center">Set a Password</h1>
          <p className="text-sm text-gray-600 mb-4 text-center">
            You signed up successfully! Please set a password for your account.
          </p>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-green-50 text-green-600 p-3 rounded mb-4 text-sm">
              Password set successfully! Redirecting to home...
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSetPassword}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input
                type="password"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter a secure password"
                value={oauthPassword}
                onChange={(e) => setOauthPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              disabled={passwordSuccess}
            >
              Set Password
            </button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => router.push('/')} className="text-sm text-gray-500 hover:underline">
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl text-black font-bold mb-6 text-center">Sign Up</h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleEmailSignup}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Sign Up with Email
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
            className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition flex items-center justify-center gap-2"
          >
            Sign up with Google
          </button>
          <button
            onClick={handleGithubSignup}
            type="button"
            className="w-full py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition flex items-center justify-center gap-2"
          >
            Sign up with GitHub
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
