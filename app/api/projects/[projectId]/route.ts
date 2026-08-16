import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { Prisma } from "@/app/generated/prisma/client";
import { readJsonObject } from "@/lib/api-request";
import { invalidRequest, notFound, unauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import {
  ensureProjectOwner,
  parseRenameProjectName,
  serializeProject,
} from "@/lib/projects";
import type { ProjectResponse } from "@/types/project";

/** Prisma's "no record matched" — here, the project vanished mid-request. */
const MISSING_RECORD = "P2025";

/**
 * `ensureProjectOwner` reads and the mutation writes, so a project deleted in
 * the gap between them would otherwise surface as an unhandled 500. Both
 * mutations scope their `where` to `ownerId` as well, which makes the write
 * itself atomic — the ownership check can no longer go stale between the two
 * statements — and leaves this to translate the resulting `P2025` into the
 * `404` the caller would have gotten a moment earlier.
 */
function isMissingRecord(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === MISSING_RECORD
  );
}

/** Rename a project. Owner only. */
export async function PATCH(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]">,
) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body.ok) {
    return invalidRequest("Request body must be a JSON object.");
  }

  const name = parseRenameProjectName(body.value.name);

  if (!name.ok) {
    return invalidRequest(name.message);
  }

  const { projectId } = await context.params;
  const denied = await ensureProjectOwner(projectId, userId);

  if (denied) {
    return denied;
  }

  try {
    const project = await prisma.project.update({
      where: { id: projectId, ownerId: userId },
      data: { name: name.name },
    });

    return NextResponse.json<{ project: ProjectResponse }>({
      project: serializeProject(project),
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return notFound("Project not found.");
    }

    throw error;
  }
}

/** Delete a project. Owner only. Collaborators cascade away with it. */
export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]">,
) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  const { projectId } = await context.params;
  const denied = await ensureProjectOwner(projectId, userId);

  if (denied) {
    return denied;
  }

  try {
    const project = await prisma.project.delete({
      where: { id: projectId, ownerId: userId },
    });

    return NextResponse.json<{ project: ProjectResponse }>({
      project: serializeProject(project),
    });
  } catch (error) {
    if (isMissingRecord(error)) {
      return notFound("Project not found.");
    }

    throw error;
  }
}
