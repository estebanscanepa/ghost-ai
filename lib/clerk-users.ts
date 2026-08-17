import { clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/backend";

/**
 * Reading display data out of Clerk for addresses this app stores itself.
 *
 * `ProjectCollaborator` is keyed by email and there is no local user table, so
 * a name and an avatar only exist if Clerk has an account for the address. That
 * makes this enrichment, never authorization: nothing here decides who may see
 * or do anything.
 */

/** What Clerk knows about one address, as far as the UI needs it. */
export interface ClerkProfile {
  name: string | null;
  imageUrl: string | null;
}

/** Clerk's `emailAddress` filter accepts at most 100 addresses per call. */
const EMAIL_FILTER_LIMIT = 100;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

/** `fullName` is `null` when neither name field is set, so the username is the next best label. */
function toProfile(user: User): ClerkProfile {
  return {
    name: user.fullName ?? user.username ?? null,
    imageUrl: user.imageUrl.length > 0 ? user.imageUrl : null,
  };
}

/**
 * Display data for the given addresses, keyed by lowercased address. An address
 * with no Clerk account is simply absent from the map — the caller renders the
 * email on its own.
 *
 * Returned users are matched back through *their own* verified addresses rather
 * than by position in the request, so Clerk's filter semantics cannot produce a
 * wrong pairing, and an unverified address on someone else's account can never
 * lend them a name here.
 */
export async function findClerkProfilesByEmail(
  emails: string[],
): Promise<Map<string, ClerkProfile>> {
  const profiles = new Map<string, ClerkProfile>();

  if (emails.length === 0) {
    return profiles;
  }

  const wanted = new Set(emails);

  try {
    const client = await clerkClient();

    for (const batch of chunk(emails, EMAIL_FILTER_LIMIT)) {
      const { data } = await client.users.getUserList({
        emailAddress: batch,
        limit: EMAIL_FILTER_LIMIT,
      });

      for (const user of data) {
        const profile = toProfile(user);

        for (const address of user.emailAddresses) {
          if (address.verification?.status !== "verified") {
            continue;
          }

          const email = address.emailAddress.toLowerCase();

          if (wanted.has(email)) {
            profiles.set(email, profile);
          }
        }
      }
    }
  } catch (error) {
    // Enrichment is decoration, so a Clerk outage must not take the
    // collaborator list down with it: whatever was resolved before the failure
    // is kept and every remaining address falls back to being shown as an
    // address.
    console.error("Failed to enrich collaborators from Clerk", error);
  }

  return profiles;
}
