import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { readJsonObject } from "@/lib/api-request";
import { invalidRequest, unauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import {
  ensureProjectOwner,
  parseRenameProjectName,
  serializeProject,
} from "@/lib/projects";
import type { ProjectResponse } from "@/types/project";

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

  const project = await prisma.project.update({
    where: { id: projectId },
    data: { name: name.name },
  });

  return NextResponse.json<{ project: ProjectResponse }>({
    project: serializeProject(project),
  });
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

  const project = await prisma.project.delete({ where: { id: projectId } });

  return NextResponse.json<{ project: ProjectResponse }>({
    project: serializeProject(project),
  });
}
