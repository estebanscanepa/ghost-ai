import { NextResponse } from "next/server";

/**
 * Every failing API response carries the same envelope: a machine-readable
 * `code` for the client to branch on and a `message` for the developer reading
 * the network tab. Success shapes stay route-specific.
 */
export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "invalid_request"
  | "upstream_error";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json<ApiErrorBody>({ error: { code, message } }, { status });
}

export function unauthorized(
  message = "Authentication is required.",
): NextResponse<ApiErrorBody> {
  return apiError(401, "unauthorized", message);
}

export function forbidden(
  message = "You do not have access to this resource.",
): NextResponse<ApiErrorBody> {
  return apiError(403, "forbidden", message);
}

export function notFound(
  message = "The requested resource does not exist.",
): NextResponse<ApiErrorBody> {
  return apiError(404, "not_found", message);
}

export function conflict(message: string): NextResponse<ApiErrorBody> {
  return apiError(409, "conflict", message);
}

export function invalidRequest(message: string): NextResponse<ApiErrorBody> {
  return apiError(400, "invalid_request", message);
}

/**
 * A service this request depends on answered, and the answer was unusable — the
 * canvas blob a project points at cannot be understood, for instance. Separate
 * from a `500`, which is this app faulting, and from a `404`, which would tell
 * the caller nothing is there when something is: the client needs to know the
 * difference, because "nothing saved" and "the save could not be read" call for
 * opposite behaviour.
 */
export function upstreamError(message: string): NextResponse<ApiErrorBody> {
  return apiError(502, "upstream_error", message);
}
