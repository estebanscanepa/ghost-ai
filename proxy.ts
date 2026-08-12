import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

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

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
