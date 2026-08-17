import type { ProjectCollaboratorModel } from "@/app/generated/prisma/models";
import type { ClerkProfile } from "@/lib/clerk-users";
import {
  COLLABORATOR_EMAIL_MAX_LENGTH,
  isCollaboratorEmail,
  normalizeCollaboratorEmail,
} from "@/lib/collaborator-email";
import { prisma } from "@/lib/prisma";
import type { CollaboratorResponse } from "@/types/collaborator";

export type CollaboratorEmailResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

/**
 * An invite has nothing to fall back on — an absent or malformed address is a
 * rejected request, not a default. The value comes back normalized, which is
 * what gets stored: see `normalizeCollaboratorEmail`.
 */
export function parseCollaboratorEmail(
  value: unknown,
): CollaboratorEmailResult {
  if (typeof value !== "string") {
    return { ok: false, message: `"email" is required and must be a string.` };
  }

  const email = normalizeCollaboratorEmail(value);

  if (email.length === 0) {
    return { ok: false, message: `"email" must not be empty.` };
  }

  if (!isCollaboratorEmail(email)) {
    return {
      ok: false,
      message: `"email" must be a valid email address of ${COLLABORATOR_EMAIL_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, email };
}

/** A project's collaborators, oldest first — the order they were invited in. */
export function listProjectCollaborators(
  projectId: string,
): Promise<ProjectCollaboratorModel[]> {
  return prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * The row plus whatever Clerk knew about the address. `profile` is optional
 * because a missing Clerk account is the expected case, not an error: the name
 * and avatar go `null` and the UI shows the email.
 */
export function serializeCollaborator(
  collaborator: ProjectCollaboratorModel,
  profile?: ClerkProfile,
): CollaboratorResponse {
  return {
    id: collaborator.id,
    email: collaborator.email,
    name: profile?.name ?? null,
    imageUrl: profile?.imageUrl ?? null,
    createdAt: collaborator.createdAt.toISOString(),
  };
}
