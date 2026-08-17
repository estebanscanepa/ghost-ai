import type { ApiErrorBody, ApiErrorCode } from "@/lib/api-response";

/**
 * The browser side of the HTTP boundary, shared by every request module under
 * `lib/*-requests.ts`. Nothing here throws: a failed request is a state the UI
 * renders, not an exception it has to catch, so both a dead network and a
 * rejected request resolve to a message.
 */

export const UNREACHABLE_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

export const UNEXPECTED_MESSAGE = "Something went wrong. Please try again.";

export const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * A failed request. `code` is present only when the failure arrived in the
 * API's error envelope — a network error or an unparseable response has a
 * message but nothing to branch on.
 */
export interface ApiFailure {
  ok: false;
  message: string;
  code?: ApiErrorCode;
}

export type JsonRequestResult = { ok: true; payload: unknown } | ApiFailure;

/** The API's error envelope, verified rather than assumed — untrusted input like any other. */
export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { error } = value as { error?: unknown };

  if (typeof error !== "object" || error === null) {
    return false;
  }

  const { code, message } = error as { code?: unknown; message?: unknown };

  return typeof code === "string" && typeof message === "string";
}

/**
 * One request, resolved to either the parsed body or a message. The success
 * payload stays `unknown`: narrowing it is the calling module's job, since only
 * it knows which fields it acts on.
 */
export async function requestJson(
  url: string,
  init?: RequestInit,
): Promise<JsonRequestResult> {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    return { ok: false, message: UNREACHABLE_MESSAGE };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    return isApiErrorBody(payload)
      ? {
          ok: false,
          message: payload.error.message,
          code: payload.error.code,
        }
      : { ok: false, message: UNEXPECTED_MESSAGE };
  }

  return { ok: true, payload };
}
