import { NextResponse } from "next/server";

import { readJsonObject } from "@/lib/api-request";
import {
  conflict,
  invalidRequest,
  notFound,
  unauthorized,
} from "@/lib/api-response";
import { findClerkProfilesByEmail } from "@/lib/clerk-users";
import {
  listProjectCollaborators,
  parseCollaboratorEmail,
  serializeCollaborator,
} from "@/lib/collaborators";
import { prisma } from "@/lib/prisma";
import {
  isForeignKeyViolation,
  isUniqueConstraintViolation,
} from "@/lib/prisma-errors";
import { ensureProjectViewer, getCurrentIdentity } from "@/lib/project-access";
import { ensureProjectOwner } from "@/lib/projects";
import type { CollaboratorResponse } from "@/types/collaborator";

/**
 * List a project's collaborators. Readable by the owner *and* by collaborators:
 * everyone with access can see who else has it, which is what the share dialog
 * shows a collaborator in place of the invite form.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators">,
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return unauthorized();
  }

  const { projectId } = await context.params;
  const viewer = await ensureProjectViewer(projectId, identity);

  if (!viewer.ok) {
    return viewer.response;
  }

  const collaborators = await listProjectCollaborators(projectId);
  const profiles = await findClerkProfilesByEmail(
    collaborators.map((collaborator) => collaborator.email),
  );

  return NextResponse.json<{ collaborators: CollaboratorResponse[] }>({
    collaborators: collaborators.map((collaborator) =>
      serializeCollaborator(collaborator, profiles.get(collaborator.email)),
    ),
  });
}

/** Invite a collaborator by email. Owner only. */
export async function POST(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators">,
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body.ok) {
    return invalidRequest("Request body must be a JSON object.");
  }

  const email = parseCollaboratorEmail(body.value.email);

  if (!email.ok) {
    return invalidRequest(email.message);
  }

  const { projectId } = await context.params;
  const denied = await ensureProjectOwner(projectId, identity.userId);

  if (denied) {
    return denied;
  }

  // The check above proved the caller owns this project, so any of their own
  // verified addresses already has full access. Storing one as a collaborator
  // would put the owner in their own collaborator list and imply the row is
  // what grants them access, which it is not.
  if (identity.emails.includes(email.email)) {
    return invalidRequest(
      "You already have access to this project as its owner.",
    );
  }

  try {
    const collaborator = await prisma.projectCollaborator.create({
      data: { projectId, email: email.email },
    });

    const profiles = await findClerkProfilesByEmail([collaborator.email]);

    return NextResponse.json<{ collaborator: CollaboratorResponse }>(
      {
        collaborator: serializeCollaborator(
          collaborator,
          profiles.get(collaborator.email),
        ),
      },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return conflict("That email is already a collaborator on this project.");
    }

    // The ownership check reads and this writes, so the project can be deleted
    // in the gap — the insert then fails on the foreign key rather than on the
    // row it was aiming at.
    if (isForeignKeyViolation(error)) {
      return notFound("Project not found.");
    }

    throw error;
  }
}
