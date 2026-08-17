import {
  JSON_HEADERS,
  requestJson,
  UNEXPECTED_MESSAGE,
  type ApiFailure,
} from "@/lib/api-client";
import type { CollaboratorResponse } from "@/types/collaborator";

/**
 * The browser half of `app/api/projects/[projectId]/collaborators`: read the
 * list, invite, remove. Like `lib/project-requests.ts`, nothing throws — every
 * failure resolves to a message the share dialog renders.
 */
export type CollaboratorListResult =
  | { ok: true; collaborators: CollaboratorResponse[] }
  | ApiFailure;

export type CollaboratorMutationResult =
  | { ok: true; collaborator: CollaboratorResponse }
  | ApiFailure;

/**
 * `id` and `email` are the two fields the dialog acts on — removal addresses a
 * row by ID, and the email is the label whenever Clerk had no profile. The
 * nullable enrichment is display-only, so a mismatch there would show up on
 * screen rather than break a call.
 */
function isCollaborator(value: unknown): value is CollaboratorResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { id, email } = value as { id?: unknown; email?: unknown };

  return typeof id === "string" && typeof email === "string";
}

function isCollaboratorListBody(
  value: unknown,
): value is { collaborators: CollaboratorResponse[] } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { collaborators } = value as { collaborators?: unknown };

  return Array.isArray(collaborators) && collaborators.every(isCollaborator);
}

function isCollaboratorBody(
  value: unknown,
): value is { collaborator: CollaboratorResponse } {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return isCollaborator((value as { collaborator?: unknown }).collaborator);
}

function collaboratorsUrl(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/collaborators`;
}

async function requestCollaborator(
  url: string,
  init: RequestInit,
): Promise<CollaboratorMutationResult> {
  const result = await requestJson(url, init);

  if (!result.ok) {
    return result;
  }

  if (!isCollaboratorBody(result.payload)) {
    return { ok: false, message: UNEXPECTED_MESSAGE };
  }

  return { ok: true, collaborator: result.payload.collaborator };
}

/** Everyone with access to the project can read this — owners and collaborators alike. */
export async function fetchCollaborators(
  projectId: string,
): Promise<CollaboratorListResult> {
  const result = await requestJson(collaboratorsUrl(projectId));

  if (!result.ok) {
    return result;
  }

  if (!isCollaboratorListBody(result.payload)) {
    return { ok: false, message: UNEXPECTED_MESSAGE };
  }

  return { ok: true, collaborators: result.payload.collaborators };
}

/** Owner only. The server re-checks — this is the request, not the gate. */
export function inviteCollaborator(
  projectId: string,
  email: string,
): Promise<CollaboratorMutationResult> {
  return requestCollaborator(collaboratorsUrl(projectId), {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email }),
  });
}

/** Owner only. The server re-checks — this is the request, not the gate. */
export function removeCollaborator(
  projectId: string,
  collaboratorId: string,
): Promise<CollaboratorMutationResult> {
  return requestCollaborator(
    `${collaboratorsUrl(projectId)}/${encodeURIComponent(collaboratorId)}`,
    { method: "DELETE" },
  );
}
