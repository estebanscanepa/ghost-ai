import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { notFound, unauthorized } from "@/lib/api-response";
import { serializeCollaborator } from "@/lib/collaborators";
import { prisma } from "@/lib/prisma";
import { isMissingRecord } from "@/lib/prisma-errors";
import { ensureProjectOwner } from "@/lib/projects";
import type { CollaboratorResponse } from "@/types/collaborator";

/**
 * Remove a collaborator from a project. Owner only.
 *
 * `auth()` is enough here — unlike the list handler, nothing on this path needs
 * the caller's email addresses, because removal is decided by project ownership
 * alone.
 */
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators/[collaboratorId]">,
) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  const { projectId, collaboratorId } = await context.params;
  const denied = await ensureProjectOwner(projectId, userId);

  if (denied) {
    return denied;
  }

  try {
    // Scoped to `projectId` as well as the ID: owning one project must not let
    // the caller delete a collaborator row belonging to another.
    const collaborator = await prisma.projectCollaborator.delete({
      where: { id: collaboratorId, projectId },
    });

    // No Clerk lookup: the caller is removing this row, not rendering it.
    return NextResponse.json<{ collaborator: CollaboratorResponse }>({
      collaborator: serializeCollaborator(collaborator),
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return notFound("Collaborator not found.");
    }

    throw error;
  }
}
