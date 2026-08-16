import { currentUser } from "@clerk/nextjs/server";

/**
 * Every verified email address on the current session's account.
 *
 * `ProjectCollaborator` is keyed by email, so collaborator access has to be
 * resolved through addresses rather than the Clerk user ID. Only verified ones
 * count: an unverified address is a claim, and honouring it would let anyone
 * type a collaborator's email into their own account to reach the project.
 */
export async function getCurrentUserEmails(): Promise<string[]> {
  const user = await currentUser();

  if (!user) {
    return [];
  }

  return user.emailAddresses
    .filter((email) => email.verification?.status === "verified")
    .map((email) => email.emailAddress);
}
