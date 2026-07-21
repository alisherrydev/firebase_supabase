import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Explicitly allow OAuth callbacks and error routes without any redirects
  if (
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/auth/github/callback') ||
    pathname.startsWith('/api/auth/callback') ||
    pathname.startsWith('/api/auth/github/callback') ||
    pathname.startsWith('/auth/error')
  ) {
    console.log(`[AUTH DEBUG] Middleware allowing path: ${pathname}`);
    return NextResponse.next();
  }

  // Placeholder for other routes
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Apply middleware to all routes except static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
