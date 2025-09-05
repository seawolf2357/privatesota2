import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { guestRegex, isDevelopmentEnvironment } from './lib/constants';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  // Skip auth for demo page
  if (pathname.startsWith('/demo')) {
    return NextResponse.next();
  }

  // TEMPORARY: Skip all auth in development
  if (isDevelopmentEnvironment) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  // Allow guest access - no forced redirect to login
  // if (!token) {
  //   const callbackUrl = encodeURIComponent(request.url);
  //   return NextResponse.redirect(
  //     new URL(`/api/auth/signin?callbackUrl=${callbackUrl}`, request.url),
  //   );
  // }

  const isGuest = guestRegex.test(token?.email ?? '');

  // Remove redirect logic for /login and /register since they no longer exist

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/demo',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
