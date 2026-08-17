import { auth, currentUser } from "@clerk/nextjs/server";
import type { NextResponse } from "next/server";

import type { ProjectModel } from "@/app/generated/prisma/models";
import { forbidden, notFound, type ApiErrorBody } from "@/lib/api-response";
import { normalizeCollaboratorEmail } from "@/lib/collaborator-email";
import { prisma } from "@/lib/prisma";
import type { ProjectOwnership } from "@/types/project";

/**
 * Who is asking.
 *
 * `userId` is the Clerk user ID a project's `ownerId` is compared against.
 * `ProjectCollaborator` is keyed by email instead, so the caller's addresses
 * are what collaborator access resolves through: `email` is the account's
 * primary address, `emails` every verified one.
 *
 * Only verified addresses appear in either — an unverified address is an
 * unproven claim, and honouring it would turn "add an email to your account"
 * into "join someone else's project". `email` is `null` when the primary
 * address has not been verified.
 *
 * Both are lowercased, because the collaborator comparison is a case-sensitive
 * SQL one and invites are stored lowercased. See `normalizeCollaboratorEmail`.
 */
export interface CurrentIdentity {
  userId: string;
  email: string | null;
  emails: string[];
}

/** A project the caller may open, and the reason they may. */
export interface ProjectAccess {
  project: ProjectModel;
  ownership: ProjectOwnership;
}

/**
 * The current Clerk identity, or `null` when the request is unauthenticated.
 *
 * Both reads come from the same session: `auth()` for the user ID and
 * `currentUser()` for the addresses. A session whose user record cannot be
 * loaded still yields an identity — it simply has no email, so it can own
 * projects but not reach one as a collaborator.
 */
export async function getCurrentIdentity(): Promise<CurrentIdentity | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await currentUser();

  if (!user) {
    return { userId, email: null, emails: [] };
  }

  const verified = user.emailAddresses.filter(
    (address) => address.verification?.status === "verified",
  );

  const primary = verified.find(
    (address) => address.id === user.primaryEmailAddressId,
  );

  return {
    userId,
    email: primary
      ? normalizeCollaboratorEmail(primary.emailAddress)
      : null,
    emails: verified.map((address) =>
      normalizeCollaboratorEmail(address.emailAddress),
    ),
  };
}

/**
 * The project behind a workspace URL, or `null` when the caller may not open
 * it. A project that does not exist and one that belongs to a stranger are the
 * same answer here: the route renders `AccessDenied` for both rather than
 * telling an outsider which project IDs are real.
 *
 * Read access is owner-or-collaborator per the auth model. Mutations stay
 * owner-only and check separately, at the API boundary.
 *
 * The collaborator half matches every verified address, not only the primary:
 * an invite sent to a secondary address is still an invite to this person, and
 * matching on the primary alone would let the sidebar's `Shared` tab list a
 * project the workspace then refuses to open.
 */
export async function checkProjectAccess(
  roomId: string,
  identity: CurrentIdentity,
): Promise<ProjectAccess | null> {
  const project = await prisma.project.findUnique({ where: { id: roomId } });

  if (!project) {
    return null;
  }

  if (project.ownerId === identity.userId) {
    return { project, ownership: "owned" };
  }

  if (identity.emails.length === 0) {
    return null;
  }

  const collaborator = await prisma.projectCollaborator.findFirst({
    where: { projectId: roomId, email: { in: identity.emails } },
    select: { id: true },
  });

  return collaborator ? { project, ownership: "shared" } : null;
}

export type ProjectViewerResult =
  | { ok: true; access: ProjectAccess }
  | { ok: false; response: NextResponse<ApiErrorBody> };

/**
 * The API-side counterpart to `checkProjectAccess`: the same
 * owner-or-collaborator rule, but it answers with the response to send.
 *
 * A handler distinguishes "gone" from "not yours" where the workspace route
 * deliberately does not — `403` and `404` are separate answers throughout
 * `app/api`, and the sidebar only ever links projects the caller can already
 * see. The extra existence query runs only once access has been refused, so the
 * common path is still one project read plus one collaborator read.
 */
export async function ensureProjectViewer(
  projectId: string,
  identity: CurrentIdentity,
): Promise<ProjectViewerResult> {
  const access = await checkProjectAccess(projectId, identity);

  if (access) {
    return { ok: true, access };
  }

  const exists = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });

  return {
    ok: false,
    response: exists
      ? forbidden("You do not have access to this project.")
      : notFound("Project not found."),
  };
}
