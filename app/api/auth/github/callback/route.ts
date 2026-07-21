import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  // read cookies
  const cookieState = request.cookies.get('github_oauth_state')?.value;
  const stateIsValid = Boolean(state && cookieState && state === cookieState);
  
  console.log("GitHub callback started");
  console.log("Code received:", Boolean(code));
  console.log("State received:", Boolean(state));
  console.log("State valid:", stateIsValid);
  
  if (!stateIsValid || !code) {
    console.error("[AUTH DEBUG] State mismatch or missing authorization code.");
    return NextResponse.redirect(new URL('/auth/error?error=invalid_state', request.url));
  }
  
  try {
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    
    const data = await tokenResponse.json();
    const sessionCreated = Boolean(data.access_token);
    
    console.log("Session created:", sessionCreated);
    
    if (!data.access_token) {
      console.error("[AUTH DEBUG] GitHub OAuth failed to exchange authorization code.");
      return NextResponse.redirect(new URL('/auth/error?error=token_exchange_failed', request.url));
    }
    
    // Redirect to the client-side callback page, placing the token in the hash.
    // The hash is secure because it is never sent to the server in subsequent page requests.
    const callbackUrl = new URL('/auth/github/callback', request.url);
    callbackUrl.hash = `token=${data.access_token}`;
    
    const response = NextResponse.redirect(callbackUrl);
    // Clean up state cookie
    response.cookies.set('github_oauth_state', '', { maxAge: -1, path: '/' });
    
    return response;
  } catch (error) {
    console.error("[AUTH DEBUG] Error exchanging code:", error);
    return NextResponse.redirect(new URL('/auth/error?error=server_error', request.url));
  }
}
