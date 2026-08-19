import { NextResponse } from "next/server";

import { readJsonObject } from "@/lib/api-request";
import {
  invalidRequest,
  notFound,
  unauthorized,
  upstreamError,
} from "@/lib/api-response";
import { readCanvasBlob, writeCanvasBlob } from "@/lib/canvas-blob";
import {
  CANVAS_DOCUMENT_MAX_ELEMENTS,
  canvasDocumentSize,
  parseCanvasDocument,
} from "@/lib/canvas-document";
import { prisma } from "@/lib/prisma";
import { isMissingRecord } from "@/lib/prisma-errors";
import { ensureProjectViewer, getCurrentIdentity } from "@/lib/project-access";
import { serializeProject } from "@/lib/projects";
import type { CanvasDocumentResponse } from "@/types/canvas-document";
import type { ProjectResponse } from "@/types/project";

/*
 * Canvas persistence: Prisma holds the reference, Vercel Blob holds the JSON.
 * Invariant 2 in `architecture-context.md` — the row never carries the document.
 *
 * Both handlers are membership-scoped rather than owner-only, which is the one
 * place this app's mutations depart from "owner only". A collaborator edits the
 * canvas by definition — that is what a shared room is — so a save they cannot
 * make is a save nobody makes on their behalf, and their work would live in
 * Liveblocks Storage and nowhere else. Renaming and deleting a project stay
 * owner-only; the graph inside it belongs to everyone who can draw on it.
 */

/**
 * The project's saved canvas, or `null` when it has never been saved.
 *
 * Readable by the owner and by collaborators, on the same rule as the
 * collaborator list: anyone who can open the room can read what the room is
 * seeded from.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]/canvas">,
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

  const { canvasJsonPath } = viewer.access.project;

  if (!canvasJsonPath) {
    return NextResponse.json<CanvasDocumentResponse>({ canvas: null });
  }

  const read = await readCanvasBlob(canvasJsonPath);

  // A blob that is present but unreadable is a `502`, not an empty canvas. The
  // editor holds autosave back on this answer rather than restoring nothing and
  // then saving that over the copy it could not read.
  if (!read.ok) {
    return upstreamError("The saved canvas could not be read.");
  }

  return NextResponse.json<CanvasDocumentResponse>({ canvas: read.document });
}

/**
 * Stores the canvas: the JSON goes to Blob, the URL it lands at goes on the
 * project row. Owner or collaborator — see the note above.
 *
 * The body is parsed and normalized before anything else runs, so what reaches
 * the store is a document this build's canvas can draw rather than whatever was
 * posted. The blob is written before the row is updated, which leaves one
 * observable gap: a project deleted in between has an orphan blob and a `404`
 * here. Deleting the project is what makes the blob unreachable in the first
 * place, so nothing points at it and nothing reads it.
 */
export async function PUT(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]/canvas">,
) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body.ok) {
    return invalidRequest("Request body must be a JSON object.");
  }

  const document = parseCanvasDocument(body.value.canvas);

  if (!document) {
    return invalidRequest(
      `"canvas" must be an object with "nodes" and "edges" arrays.`,
    );
  }

  if (canvasDocumentSize(document) > CANVAS_DOCUMENT_MAX_ELEMENTS) {
    return invalidRequest(
      `A canvas may hold at most ${CANVAS_DOCUMENT_MAX_ELEMENTS} nodes and edges.`,
    );
  }

  const { projectId } = await context.params;
  const viewer = await ensureProjectViewer(projectId, identity);

  if (!viewer.ok) {
    return viewer.response;
  }

  const url = await writeCanvasBlob(projectId, document);

  try {
    const project = await prisma.project.update({
      where: { id: projectId },
      data: { canvasJsonPath: url },
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
