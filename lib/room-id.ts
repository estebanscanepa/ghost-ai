import { slugify } from "@/lib/slug";

/**
 * A project's ID and its Liveblocks room ID are the same string. The Create
 * dialog builds it from the project name before the request goes out, previews
 * it, and sends it as the project ID — so the room the canvas joins is always
 * addressable from the project record and vice versa.
 *
 * Shape: `slugified-name-<suffix>`, e.g. `checkout-platform-4f2a91c83d5e`.
 */

/**
 * Six random bytes rendered as hex — twelve characters, 48 bits.
 *
 * Sized against the birthday bound, because the suffix only has to separate
 * projects that slugify to the *same* name: at 24 bits, two such projects
 * collide with probability ~50% after about 4.8k of them and ~1-in-a-million
 * after only ~6k, which puts a `409` on the routine path. A `409` is recoverable
 * but not automatic — the create dialog rolls a fresh suffix and shows the
 * error, and the user has to submit again — so the right fix is to make the
 * collision unreachable rather than to paper over it with a retry. 48 bits moves
 * the 50% point to ~19.7M same-named projects.
 */
const ROOM_SUFFIX_BYTES = 6;

/** The column is an unbounded `String`; this keeps a 100-character name from producing an unbounded key. */
export const ROOM_ID_MAX_LENGTH = 120;

/** Lowercase alphanumeric segments joined by single hyphens — exactly what `slugify` plus a hex suffix produces. */
const ROOM_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A short unique suffix for a new room. Uses the platform CSPRNG rather than
 * `Math.random` so two clients naming a project the same thing at the same
 * moment do not collide — and if they somehow do, the primary key rejects the
 * second one. Widening this is safe: `isRoomId` checks shape and a maximum
 * length, never the suffix's length, so IDs already issued at six characters
 * stay valid and need no migration.
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
 *
 * The slug is capped at whatever `ROOM_ID_MAX_LENGTH` leaves once the hyphen
 * and suffix are reserved, so this can never hand the server an ID its own
 * `isRoomId` gate would reject. The cap is not redundant with the 100-character
 * name limit: `slugify` normalizes NFKD first, and that expands — a name of 100
 * `Ⅷ` characters is within the name limit and slugifies to 400 characters. Once
 * truncated, any trailing hyphen has to come off too, or the join would produce
 * the `--` that `ROOM_ID_PATTERN` forbids.
 */
export function buildRoomId(name: string, suffix: string): string {
  const slug = slugify(name);

  if (slug.length === 0) {
    return "";
  }

  const available = ROOM_ID_MAX_LENGTH - suffix.length - 1;
  const capped = slug.slice(0, Math.max(available, 0)).replace(/-+$/, "");

  return capped.length > 0 ? `${capped}-${suffix}` : "";
}

/** Whether a value is a room ID this app could have produced. The server's gate on a client-supplied project ID. */
export function isRoomId(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= ROOM_ID_MAX_LENGTH &&
    ROOM_ID_PATTERN.test(value)
  );
}
