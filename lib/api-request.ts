/**
 * Reading the JSON body of a request. Nothing here trusts the payload beyond
 * its shape — field-level validation belongs to the module that owns the
 * domain, so this only guarantees the caller is looking at a plain object.
 */
export type JsonObjectResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false };

/**
 * An absent or whitespace-only body is treated as `{}` rather than an error:
 * `POST /api/projects` with no body is a valid "create with the defaults".
 * Malformed JSON, or JSON that is not an object (`null`, an array, a bare
 * string), is rejected so callers never have to re-narrow the value.
 */
export async function readJsonObject(request: Request): Promise<JsonObjectResult> {
  const raw = await request.text();

  if (raw.trim().length === 0) {
    return { ok: true, value: {} };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}
