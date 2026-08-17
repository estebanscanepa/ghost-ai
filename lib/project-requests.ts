import {
  JSON_HEADERS,
  requestJson,
  UNEXPECTED_MESSAGE,
  type ApiFailure,
} from "@/lib/api-client";
import type { ProjectResponse } from "@/types/project";

/**
 * The browser half of `app/api/projects`: one function per mutation, each
 * resolving to either the project or a message worth showing in a dialog.
 * Nothing here throws — see `lib/api-client.ts`, which owns the transport.
 */
export type ProjectMutationResult =
  | { ok: true; project: ProjectResponse }
  | ApiFailure;

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
  const result = await requestJson(url, init);

  if (!result.ok) {
    return result;
  }

  if (!isProjectBody(result.payload)) {
    return { ok: false, message: UNEXPECTED_MESSAGE };
  }

  return { ok: true, project: result.payload.project };
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
