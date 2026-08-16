import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

import { unauthorized } from "@/lib/api-response";

/**
 * The only routes reachable while signed out. Derived from the Clerk env vars
 * so the public surface and the redirect targets can never drift apart — each
 * one also covers its catch-all children (`/sign-in/factor-one`, …).
 */
const isPublicRoute = createRouteMatcher(
  [
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  ]
    .filter((route): route is string => Boolean(route))
    .flatMap((route) => [route, `${route}(.*)`]),
);

/**
 * `auth.protect()` answers an unauthenticated non-page request with a 404, so
 * the API surface is gated separately: same fail-closed default, but the
 * status a JSON client expects.
 */
const isApiRoute = createRouteMatcher(["/api(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (isPublicRoute(request)) {
    return;
  }

  if (isApiRoute(request)) {
    const { userId } = await auth();

    return userId ? undefined : unauthorized();
  }

  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
