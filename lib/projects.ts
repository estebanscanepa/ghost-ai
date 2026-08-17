import type { NextResponse } from "next/server";

import type { ProjectModel } from "@/app/generated/prisma/models";
import { forbidden, notFound, type ApiErrorBody } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { isRoomId, ROOM_ID_MAX_LENGTH } from "@/lib/room-id";
import type {
  Project,
  ProjectOwnership,
  ProjectResponse,
} from "@/types/project";

/** Applied when a create request omits the name or sends a blank one. */
export const DEFAULT_PROJECT_NAME = "Untitled Project";

/**
 * The column is an unbounded `String`, so this is a boundary guard rather than
 * a schema constraint — it keeps a runaway payload from becoming a row.
 */
export const PROJECT_NAME_MAX_LENGTH = 100;

export type ProjectNameResult =
  | { ok: true; name: string }
  | { ok: false; message: string };

function validateLength(name: string): ProjectNameResult {
  if (name.length > PROJECT_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `"name" must be ${PROJECT_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, name };
}

/**
 * Create accepts a missing name: an absent, null, or blank value becomes
 * `Untitled Project`. A present non-string is still a client bug, not a
 * default.
 */
export function parseCreateProjectName(value: unknown): ProjectNameResult {
  if (value === undefined || value === null) {
    return { ok: true, name: DEFAULT_PROJECT_NAME };
  }

  if (typeof value !== "string") {
    return { ok: false, message: `"name" must be a string.` };
  }

  const name = value.trim();

  if (name.length === 0) {
    return { ok: true, name: DEFAULT_PROJECT_NAME };
  }

  return validateLength(name);
}

/**
 * Rename has no default to fall back on — a rename to nothing is a rejected
 * request, not a reset to `Untitled Project`.
 */
export function parseRenameProjectName(value: unknown): ProjectNameResult {
  if (typeof value !== "string") {
    return { ok: false, message: `"name" is required and must be a string.` };
  }

  const name = value.trim();

  if (name.length === 0) {
    return { ok: false, message: `"name" must not be empty.` };
  }

  return validateLength(name);
}

export type ProjectIdResult =
  | { ok: true; id: string | undefined }
  | { ok: false; message: string };

/**
 * Create accepts a client-supplied ID because the project ID *is* the
 * Liveblocks room ID: the dialog derives it from the name, shows it, and sends
 * it, so the room the canvas joins matches the record. It stays optional — a
 * request without one falls back to the schema's `cuid()`.
 *
 * The value is never trusted as given: it has to look like something
 * `lib/room-id.ts` could have produced, and the primary key rejects a
 * duplicate.
 */
export function parseCreateProjectId(value: unknown): ProjectIdResult {
  if (value === undefined || value === null) {
    return { ok: true, id: undefined };
  }

  if (typeof value !== "string") {
    return { ok: false, message: `"id" must be a string.` };
  }

  if (!isRoomId(value)) {
    return {
      ok: false,
      message: `"id" must be lowercase letters, digits, and single hyphens, ${ROOM_ID_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, id: value };
}

/** The current user's own projects, newest first. */
export function listOwnedProjects(ownerId: string): Promise<ProjectModel[]> {
  return prisma.project.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Projects shared with the current user, newest first. Collaborators are keyed
 * by email, so this takes the caller's verified addresses rather than their
 * user ID. Projects they own are excluded — a project belongs to exactly one
 * of the sidebar's two tabs.
 */
export function listSharedProjects(
  userId: string,
  emails: string[],
): Promise<ProjectModel[]> {
  if (emails.length === 0) {
    return Promise.resolve([]);
  }

  return prisma.project.findMany({
    where: {
      ownerId: { not: userId },
      collaborators: { some: { email: { in: emails } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Invariant 3 in `architecture-context.md`: ownership is enforced at every
 * mutation boundary. Returns the response to send when the caller may not
 * proceed, or `null` when they own the project. A project that exists but
 * belongs to someone else is a `403` — the caller is told the difference
 * between "gone" and "not yours" on purpose.
 */
export async function ensureProjectOwner(
  projectId: string,
  userId: string,
): Promise<NextResponse<ApiErrorBody> | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });

  if (!project) {
    return notFound("Project not found.");
  }

  if (project.ownerId !== userId) {
    return forbidden("Only the project owner can modify this project.");
  }

  return null;
}

/**
 * The record reduced to what the sidebar renders. Ownership is not on the row —
 * it comes from which query returned it — and is a UI affordance only.
 */
export function toSidebarProject(
  project: ProjectModel,
  ownership: ProjectOwnership,
): Project {
  return { id: project.id, name: project.name, ownership };
}

/** `ownerId` is deliberately dropped: the client already knows whose list it is. */
export function serializeProject(project: ProjectModel): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    canvasJsonPath: project.canvasJsonPath,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
