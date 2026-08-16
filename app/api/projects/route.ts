import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { Prisma } from "@/app/generated/prisma/client";
import { readJsonObject } from "@/lib/api-request";
import { conflict, invalidRequest, unauthorized } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import {
  listOwnedProjects,
  parseCreateProjectId,
  parseCreateProjectName,
  serializeProject,
} from "@/lib/projects";
import type { ProjectResponse } from "@/types/project";

/** Prisma's unique constraint violation — here, a project ID that is already taken. */
const UNIQUE_CONSTRAINT = "P2002";

/** List the projects owned by the current user, newest first. */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  const projects = await listOwnedProjects(userId);

  return NextResponse.json<{ projects: ProjectResponse[] }>({
    projects: projects.map(serializeProject),
  });
}

/** Create a project owned by the current user. */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body.ok) {
    return invalidRequest("Request body must be a JSON object.");
  }

  const name = parseCreateProjectName(body.value.name);

  if (!name.ok) {
    return invalidRequest(name.message);
  }

  const id = parseCreateProjectId(body.value.id);

  if (!id.ok) {
    return invalidRequest(id.message);
  }

  try {
    const project = await prisma.project.create({
      data: {
        ownerId: userId,
        name: name.name,
        ...(id.id === undefined ? {} : { id: id.id }),
      },
    });

    return NextResponse.json<{ project: ProjectResponse }>(
      { project: serializeProject(project) },
      { status: 201 },
    );
  } catch (error) {
    // The client picks the ID, so a collision is a client-fixable condition
    // (retry with a fresh suffix) rather than a server fault.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT
    ) {
      return conflict("That project ID is already taken.");
    }

    throw error;
  }
}
