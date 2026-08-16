import type { ApiErrorBody, ApiErrorCode } from "@/lib/api-response";
import type { ProjectResponse } from "@/types/project";

/**
 * The browser half of `app/api/projects`: one function per mutation, each
 * resolving to either the project or a message worth showing in a dialog.
 * Nothing here throws — a failed mutation is a state the UI renders, not an
 * exception it has to catch.
 *
 * `code` is present only when the failure came back in the API's envelope; a
 * network error or an unparseable response has a message but no code.
 */
export type ProjectMutationResult =
  | { ok: true; project: ProjectResponse }
  | { ok: false; message: string; code?: ApiErrorCode };

const UNREACHABLE_MESSAGE =
  "Could not reach the server. Check your connection and try again.";

const UNEXPECTED_MESSAGE = "Something went wrong. Please try again.";

const JSON_HEADERS = { "Content-Type": "application/json" };

/** The API's error envelope, verified rather than assumed — this is untrusted input like any other. */
function isApiErrorBody(value: unknown): value is ApiErrorBody {
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
 * Only `id` is narrowed: it is the one field the caller acts on (navigation).
 * The rest of `ProjectResponse` is display data that a mismatch would surface
 * immediately.
 */
function isProjectBody(value: unknown): value is { project: ProjectResponse } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { project } = value as { project?: unknown };

  if (typeof project !== "object" || project === null) {
    return false;
  }

  return typeof (project as { id?: unknown }).id === "string";
}

async function requestProject(
  url: string,
  init: RequestInit,
): Promise<ProjectMutationResult> {
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

  if (!isProjectBody(payload)) {
    return { ok: false, message: UNEXPECTED_MESSAGE };
  }

  return { ok: true, project: payload.project };
}

/** `id` is the room ID the dialog previewed — the server validates its shape and rejects a duplicate. */
export function createProject(input: {
  id: string;
  name: string;
}): Promise<ProjectMutationResult> {
  return requestProject("/api/projects", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  });
}

export function renameProject(
  projectId: string,
  name: string,
): Promise<ProjectMutationResult> {
  return requestProject(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ name }),
  });
}

export function deleteProject(
  projectId: string,
): Promise<ProjectMutationResult> {
  return requestProject(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}
