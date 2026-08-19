import {
  JSON_HEADERS,
  requestJson,
  UNEXPECTED_MESSAGE,
  type ApiFailure,
} from "@/lib/api-client";
import { parseCanvasDocument } from "@/lib/canvas-document";
import type { CanvasDocument } from "@/types/canvas-document";

/**
 * The browser half of `app/api/projects/[projectId]/canvas`: read the saved
 * canvas, write the canvas. Like the other `lib/*-requests.ts` modules, nothing
 * here throws — a failure resolves to a message, which the save indicator shows.
 */

export type SavedCanvasResult =
  | { ok: true; canvas: CanvasDocument | null }
  | ApiFailure;

export type SaveCanvasResult = { ok: true } | ApiFailure;

function canvasUrl(projectId: string): string {
  return `/api/projects/${encodeURIComponent(projectId)}/canvas`;
}

/**
 * The saved canvas, normalized by the same parser the route applies to an
 * incoming one — the response is untrusted input like any other, and running it
 * through `parseCanvasDocument` means the editor only ever holds a document this
 * build can draw.
 *
 * A missing or explicitly `null` `canvas` is the success answer "nothing saved",
 * not a malformed response: it is what the route sends for a project that has
 * never been saved.
 */
export async function fetchSavedCanvas(
  projectId: string,
): Promise<SavedCanvasResult> {
  const result = await requestJson(canvasUrl(projectId));

  if (!result.ok) {
    return result;
  }

  if (typeof result.payload !== "object" || result.payload === null) {
    return { ok: false, message: UNEXPECTED_MESSAGE };
  }

  const { canvas } = result.payload as { canvas?: unknown };

  if (canvas === null || canvas === undefined) {
    return { ok: true, canvas: null };
  }

  const document = parseCanvasDocument(canvas);

  return document
    ? { ok: true, canvas: document }
    : { ok: false, message: UNEXPECTED_MESSAGE };
}

/**
 * Stores the canvas. The response carries the updated project record, which
 * nothing on this path needs — the caller only has to know whether the write
 * landed — so it is deliberately not narrowed or returned.
 */
export async function saveCanvas(
  projectId: string,
  canvas: CanvasDocument,
): Promise<SaveCanvasResult> {
  const result = await requestJson(canvasUrl(projectId), {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify({ canvas }),
  });

  return result.ok ? { ok: true } : result;
}
