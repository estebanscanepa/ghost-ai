import { slugify } from "@/lib/slug";

/**
 * A project's ID and its Liveblocks room ID are the same string. The Create
 * dialog builds it from the project name before the request goes out, previews
 * it, and sends it as the project ID — so the room the canvas joins is always
 * addressable from the project record and vice versa.
 *
 * Shape: `slugified-name-<suffix>`, e.g. `checkout-platform-4f2a91`.
 */

/** Three random bytes rendered as hex — six characters, enough to keep two projects with the same name apart. */
const ROOM_SUFFIX_BYTES = 3;

/** The column is an unbounded `String`; this keeps a 100-character name from producing an unbounded key. */
export const ROOM_ID_MAX_LENGTH = 120;

/** Lowercase alphanumeric segments joined by single hyphens — exactly what `slugify` plus a hex suffix produces. */
const ROOM_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A short unique suffix for a new room. Uses the platform CSPRNG rather than
 * `Math.random` so two clients naming a project the same thing at the same
 * moment do not collide — and if they somehow do, the primary key rejects the
 * second one.
 */
export function createRoomSuffix(): string {
  const bytes = new Uint8Array(ROOM_SUFFIX_BYTES);

  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

/**
 * Builds the room ID a name will produce. Returns `""` when the name has no
 * usable slug — `"!!!"` is not empty but slugifies to nothing, and a bare
 * suffix is not an addressable room.
 */
export function buildRoomId(name: string, suffix: string): string {
  const slug = slugify(name);

  return slug.length > 0 ? `${slug}-${suffix}` : "";
}

/** Whether a value is a room ID this app could have produced. The server's gate on a client-supplied project ID. */
export function isRoomId(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= ROOM_ID_MAX_LENGTH &&
    ROOM_ID_PATTERN.test(value)
  );
}
