import { SignUp } from "@clerk/nextjs";

import { AuthPanel } from "@/components/auth/auth-panel";

/**
 * Sign-up route. Mirrors the sign-in page: the catch-all segment covers Clerk's
 * verification steps, and `AuthPanel` supplies the shared split-screen shell.
 */
export default function SignUpPage() {
  return (
    <AuthPanel>
      <SignUp />
    </AuthPanel>
  );
}
