/**
 * Reading the JSON body of a request. Nothing here trusts the payload beyond
 * its shape — field-level validation belongs to the module that owns the
 * domain, so this only guarantees the caller is looking at a plain object.
 */
export type JsonObjectResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; reason: "malformed" | "too_large" };

export interface ReadJsonObjectOptions {
  /**
   * Reject once the body passes this many bytes, without buffering the rest of
   * it. Opt-in: a route that omits it reads whatever is sent, which is the right
   * default for the bodies that carry a name or an email and are bounded by
   * their own field validation anyway.
   */
  maxBytes?: number;
}

/**
 * Reads the body as text, refusing anything over `maxBytes`.
 *
 * The declared `Content-Length` is only ever a reason to reject early — never a
 * reason to trust the body, since it is absent under chunked encoding and can
 * simply be wrong — so the running total is what actually enforces the limit,
 * and it is checked per chunk so an oversized body is abandoned partway rather
 * than assembled and then measured.
 *
 * The count is of *bytes*, deliberately, not of the decoded string: bytes are
 * what was allocated, and a multi-byte character would otherwise let a body
 * several times the limit through.
 */
async function readLimitedText(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));

  if (Number.isFinite(declared) && declared > maxBytes) {
    return null;
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    total += value.byteLength;

    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }

    // Streaming, so a multi-byte character split across two chunks is held back
    // rather than decoded as two replacement characters.
    text += decoder.decode(value, { stream: true });
  }

  return text + decoder.decode();
}

/**
 * An absent or whitespace-only body is treated as `{}` rather than an error:
 * `POST /api/projects` with no body is a valid "create with the defaults".
 * Malformed JSON, or JSON that is not an object (`null`, an array, a bare
 * string), is rejected so callers never have to re-narrow the value.
 *
 * `reason` separates a body that is wrong from a body that is merely too big:
 * they are both a `400`, but they are not the same thing to say back, and a
 * caller that does not care can keep testing `ok` alone.
 */
export async function readJsonObject(
  request: Request,
  options: ReadJsonObjectOptions = {},
): Promise<JsonObjectResult> {
  const { maxBytes } = options;

  const raw =
    maxBytes === undefined
      ? await request.text()
      : await readLimitedText(request, maxBytes);

  if (raw === null) {
    return { ok: false, reason: "too_large" };
  }

  if (raw.trim().length === 0) {
    return { ok: true, value: {} };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, reason: "malformed" };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: "malformed" };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}
