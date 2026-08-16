/**
 * Turns a project name into a URL-safe slug. It is the readable half of a room
 * ID — see `lib/room-id.ts`, which appends the unique suffix and owns the
 * format the server validates.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
