"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { Auth } from "@/lib/firebase.config";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(Auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm w-full">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="bg-blue-600 text-white p-2 rounded-lg group-hover:bg-blue-700 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900">Car Deals</span>
            </Link>
          </div>

          {/* Menu Section */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/" 
              className={`text-sm font-medium transition ${isActive('/') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
            >
              Home
            </Link>
            <Link 
              href="/gallery" 
              className={`text-sm font-medium transition ${isActive('/gallery') ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
            >
              Gallery
            </Link>
          </div>

          {/* Profile Section */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-4">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-sm font-semibold text-gray-900">{user.displayName || 'User'}</span>
                  <span className="text-xs text-gray-500">{user.email}</span>
                </div>
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <button
                  onClick={() => signOut(Auth)}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link 
                  href="/login" 
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition"
                >
                  Log in
                </Link>
                <Link 
                  href="/signup" 
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
