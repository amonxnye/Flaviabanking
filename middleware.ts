import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/sign-in', '/sign-up', '/api/sentry', '/api/iotec', '/api/agentstudio'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('__session');
  const isAuthenticated = !!sessionCookie?.value;

  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // X-XSS-Protection is deprecated; OWASP recommends disabling it to avoid
  // legacy-browser vulnerabilities. CSP is the modern XSS control.
  response.headers.set('X-XSS-Protection', '0');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  // Lock down powerful browser features we never use.
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.sentry.io",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  // Note: a cookie alone does not prove a valid session, so the auth pages
  // themselves (not this middleware) redirect users who are really signed in.
  // Redirecting here on a stale cookie caused a / <-> /sign-in redirect loop.

  // Protect all non-public routes
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
  if (!isAuthenticated && !isPublicRoute && !pathname.startsWith('/_next') && !pathname.startsWith('/icons') && !pathname.startsWith('/favicon')) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/).*)'],
};
