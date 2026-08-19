import { get, put } from "@vercel/blob";

import {
  parseCanvasDocument,
  serializeCanvasDocument,
} from "@/lib/canvas-document";
import type { CanvasDocument } from "@/types/canvas-document";

/**
 * The Vercel Blob side of canvas persistence. Server only — it reads
 * `BLOB_READ_WRITE_TOKEN` from the environment, which never reaches the browser.
 *
 * Per the storage model in `architecture-context.md`, this layer holds the canvas
 * JSON and Prisma holds only the URL that points at it. Nothing here touches the
 * database and nothing here knows about auth: the route above it settles who may
 * read or write which project first.
 */

/**
 * One blob per project at a fixed pathname, so a project's snapshot has one
 * address for its whole life and the previous save is replaced rather than
 * accumulated. `addRandomSuffix` would give every save its own URL and leave the
 * store filling up with superseded copies that nothing points at.
 */
function canvasBlobPath(projectId: string): string {
  return `canvas/${projectId}.json`;
}

/**
 * `private`, so the URL is not a credential.
 *
 * A public blob is readable by anyone who has its URL, and these URLs are
 * predictable — the pathname is the project ID, which is also the room ID and is
 * derived from the project's name. A private blob is served only against the
 * store token, which lives on the server, so the only way to read a project's
 * canvas is through `GET /api/projects/[projectId]/canvas`, which checks
 * membership first. That is also why the URL can be stored in the database in
 * plain sight: on its own it opens nothing.
 */
const CANVAS_BLOB_ACCESS = "private" as const;

/**
 * The floor Vercel Blob allows, and the reason the read below opts out of the
 * cache entirely. The default is a month, which for a blob that is overwritten
 * every few seconds would mean serving a snapshot from before the last dozen
 * saves.
 */
const CANVAS_BLOB_CACHE_MAX_AGE = 60;

/** Writes the snapshot and returns the URL to store on the project record. */
export async function writeCanvasBlob(
  projectId: string,
  document: CanvasDocument,
): Promise<string> {
  const result = await put(
    canvasBlobPath(projectId),
    serializeCanvasDocument(document),
    {
      access: CANVAS_BLOB_ACCESS,
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
      cacheControlMaxAge: CANVAS_BLOB_CACHE_MAX_AGE,
    },
  );

  return result.url;
}

/**
 * A read of a stored canvas.
 *
 * `document: null` means the reference is dangling — the row names a blob the
 * store does not have, which is the state a project is in if its blob was
 * deleted out from under it. That is reported as "nothing saved" rather than as a
 * failure, because there is genuinely nothing to restore and a room should not be
 * held hostage by it.
 *
 * `ok: false` is the different case: the blob is there and could not be
 * understood. The editor has to be able to tell the two apart — it holds autosave
 * back on a failed read, so that a canvas it could not load is never overwritten
 * by the empty room it was going to load into.
 */
export type CanvasBlobRead =
  | { ok: true; document: CanvasDocument | null }
  | { ok: false };

/**
 * Reads a stored canvas back. Throws only if the store itself is unreachable,
 * which the route lets surface as a `500` — that is a fault, not an answer.
 *
 * `useCache: false` reads from origin rather than the CDN. The blob is
 * overwritten in place on every save, and a cached copy would otherwise be
 * served for up to `CANVAS_BLOB_CACHE_MAX_AGE` after it changed. This read
 * happens once per empty room, so paying origin latency for it is free.
 */
export async function readCanvasBlob(url: string): Promise<CanvasBlobRead> {
  const result = await get(url, {
    access: CANVAS_BLOB_ACCESS,
    useCache: false,
  });

  if (!result || result.statusCode !== 200) {
    return { ok: true, document: null };
  }

  const raw = await new Response(result.stream).text();

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false };
  }

  const document = parseCanvasDocument(parsed);

  return document ? { ok: true, document } : { ok: false };
}
