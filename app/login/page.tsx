"use client"
import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Auth, googleAuthProvider } from '@/lib/firebase.config';
import { signInWithEmailAndPassword, GoogleAuthProvider } from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(Auth, email, password);
      console.log("User signed in successfully", userCredential.user);
      router.push('/');
    } catch (err: any) {
      console.error('Error signing in:', err.message);
      setError('Invalid email or password. Please try again.');
    }
  };
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl text-black font-bold mb-6 text-center">Login</h1>

        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded mb-4 text-sm border border-red-100 text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full text-black px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            Sign In
          </button>
        </form>
        <div className="mt-4 text-center text-sm space-y-2 flex flex-col">
          <Link href="/signup" className="text-blue-600 hover:underline">
            Don't have an account? Sign up
          </Link>
          <Link href="/" className="text-gray-500 hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
