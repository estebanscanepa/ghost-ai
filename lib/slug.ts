/**
 * Turns a project name into a URL-safe slug. Used for the live preview in the
 * Create Project dialog; the server will need to run the same transform (plus
 * uniqueness) once projects are persisted.
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
