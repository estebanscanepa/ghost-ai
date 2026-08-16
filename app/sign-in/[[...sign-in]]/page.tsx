import { SignIn } from "@clerk/nextjs";

import { AuthPanel } from "@/components/auth/auth-panel";

/**
 * Sign-in route. The catch-all segment exists because Clerk renders its
 * multi-step flows (`/sign-in/factor-one`, …) as child paths of this one, so
 * `proxy.ts` keeps the whole subtree public.
 */
export default function SignInPage() {
  return (
    <AuthPanel>
      <SignIn />
    </AuthPanel>
  );
}
