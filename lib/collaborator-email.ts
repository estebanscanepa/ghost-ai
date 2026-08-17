/**
 * The collaborator address rules. Deliberately free of any server-only import,
 * so the API boundary and the share dialog validate against one definition
 * rather than two that can drift — the same split `lib/room-id.ts` has.
 */

/** RFC 5321's ceiling on a full address. A boundary guard: the column is unbounded. */
export const COLLABORATOR_EMAIL_MAX_LENGTH = 254;

/**
 * Deliberately shallow. Whether an address reaches a real inbox is not
 * something a pattern can settle, so this only rejects the shapes that are
 * plainly not addresses — no `@`, no dotted domain, embedded whitespace — and
 * leaves the rest to delivery.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Collaborator rows are matched against the caller's Clerk addresses with a
 * plain SQL comparison, which is case-sensitive, so both sides are lowercased:
 * here on the way in, and in `getCurrentIdentity()` on the way out. Without
 * this, an invite to `Ada@Example.com` would never match the account that owns
 * it.
 */
export function normalizeCollaboratorEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isCollaboratorEmail(value: string): boolean {
  return (
    value.length <= COLLABORATOR_EMAIL_MAX_LENGTH && EMAIL_SHAPE.test(value)
  );
}
