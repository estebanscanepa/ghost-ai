"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  serializeCanvasDocument,
  toCanvasDocument,
} from "@/lib/canvas-document";
import { saveCanvas } from "@/lib/canvas-requests";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";
import type { CanvasDocument } from "@/types/canvas-document";
import type { CanvasSaveState } from "@/types/canvas-save";

/**
 * Autosave for the collaborative canvas: watches the room's nodes and edges,
 * debounces, and writes the result through
 * `PUT /api/projects/[projectId]/canvas`.
 *
 * Scoped to one room for its whole life, like `useSavedCanvas` — the baseline it
 * compares against belongs to a single project, so it is remounted rather than
 * repointed when the room changes.
 */

/**
 * How long the canvas has to be still before it is written.
 *
 * Sized against dragging, which is the noisiest thing that happens to the graph:
 * a node moved across the canvas produces a change per pointer frame, and a
 * shorter window would put a request behind every pause in the movement. Long
 * enough to collapse a drag, a resize, and a burst of typing in a label into one
 * write; short enough that letting go and looking at the button shows `Saved`.
 */
const AUTOSAVE_DEBOUNCE_MS = 1200;

/** The canvas as both the request body and the string the comparison is made on. */
interface CanvasSnapshot {
  document: CanvasDocument;
  payload: string;
}

interface UseCanvasAutosaveOptions {
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  /**
   * Whether saving is allowed yet — `useSavedCanvas().isSettled`. It stays false
   * while the stored canvas is being read and forever if that read failed, which
   * is what keeps a canvas that could not be loaded from being overwritten.
   */
  isEnabled: boolean;
  /** `useSavedCanvas().expectedPayload` — see `arm` below. */
  expectedPayload: string | null;
  /**
   * Published on every transition. Must be referentially stable: it is a
   * dependency of the debounce, so a callback rebuilt on each render would
   * restart the timer instead of letting it fire.
   */
  onStatusChange: (state: CanvasSaveState) => void;
}

export interface CanvasAutosave {
  /**
   * Writes the canvas now rather than when the debounce is up, and writes it even
   * if it matches what was last stored — which is the point of the button that
   * calls this. A project whose room predates its first save has a graph and no
   * stored copy of it, and nothing in the debounce path would ever notice, because
   * as far as it can tell nothing has changed.
   */
  saveNow: () => void;
}

export function useCanvasAutosave({
  projectId,
  nodes,
  edges,
  isEnabled,
  expectedPayload,
  onStatusChange,
}: UseCanvasAutosaveOptions): CanvasAutosave {
  const snapshot = useMemo<CanvasSnapshot>(() => {
    const document = toCanvasDocument(nodes, edges);

    return { document, payload: serializeCanvasDocument(document) };
  }, [edges, nodes]);

  /**
   * The payload last known to be in Blob, and — while it is `null` — the fact that
   * this hook has not armed yet. Left unchanged by a failed write, so the next
   * change retries the content that did not land rather than skipping it.
   */
  const storedRef = useRef<string | null>(null);

  /** What the timer and the in-flight callback read, so neither works from a stale render. */
  const latestRef = useRef(snapshot);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** One request at a time: a second `PUT` racing the first could land in either order. */
  const isWritingRef = useRef(false);

  /** A change that arrived mid-request, to be written once the request is done. */
  const queuedRef = useRef<CanvasSnapshot | null>(null);

  /** A save asked for by the button before the hook was armed — honoured on arming. */
  const wantsSaveRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /**
   * The one writer. Recursive through a local helper so that a change made while a
   * request was in flight is written straight after it, rather than waiting for
   * the next edit to notice it was skipped.
   */
  const write = useCallback(
    (initial: CanvasSnapshot) => {
      const run = (next: CanvasSnapshot) => {
        isWritingRef.current = true;
        onStatusChange({ status: "saving", message: null });

        void saveCanvas(projectId, next.document).then((result) => {
          isWritingRef.current = false;

          if (!result.ok) {
            onStatusChange({ status: "error", message: result.message });
            return;
          }

          storedRef.current = next.payload;
          onStatusChange({ status: "saved", message: null });

          const queued = queuedRef.current;
          queuedRef.current = null;

          if (queued && queued.payload !== storedRef.current) {
            run(queued);
          }
        });
      };

      run(initial);
    },
    [onStatusChange, projectId],
  );

  /**
   * Every write goes through a timer, including the immediate ones — `delay: 0`
   * rather than a direct call.
   *
   * That is not indirection for its own sake. `write` publishes `saving`, which is
   * a `setState` in the provider, and one of this function's callers is an effect
   * body. Scheduling means the state change always happens in a timer callback,
   * which is where React wants it, and it costs a frame nobody can see.
   */
  const schedule = useCallback(
    (delay: number) => {
      clearTimer();

      timerRef.current = setTimeout(() => {
        timerRef.current = null;

        const latest = latestRef.current;

        if (isWritingRef.current) {
          queuedRef.current = latest;
          return;
        }

        write(latest);
      }, delay);
    },
    [clearTimer, write],
  );

  useEffect(() => {
    latestRef.current = snapshot;

    if (!isEnabled) {
      return;
    }

    /**
     * Arming. The first pass that gets this far records what is already stored
     * instead of storing it, so opening a project is not a write and a roomful of
     * collaborators arriving is not a stampede of identical `PUT`s.
     *
     * `expectedPayload` is the guard that makes this safe. When the saved canvas
     * was restored into the room, the graph has to have caught up with it before
     * this hook can take a baseline — otherwise the pass that lands between "the
     * restore resolved" and "the nodes arrived" would take an empty room as the
     * baseline and then write that empty room over the canvas it just loaded.
     * Waiting for the live graph to serialize to exactly the restored document is
     * what proves the restore has landed. If it somehow never does, autosave
     * simply never arms, which is the safe direction to fail in.
     */
    if (storedRef.current === null) {
      if (expectedPayload !== null && expectedPayload !== snapshot.payload) {
        return;
      }

      storedRef.current = snapshot.payload;

      // A save asked for while the stored canvas was still being read. Now that
      // the room is known to match it, it can be honoured.
      if (wantsSaveRef.current) {
        wantsSaveRef.current = false;
        schedule(0);
      }

      return;
    }

    // Nothing about the diagram changed. Selecting a node, hovering an edge, and
    // a collaborator's cursor all re-render the canvas and none of them are a
    // save — `toCanvasDocument` drops everything that is not the graph, so they
    // all serialize to the payload already stored. The pending timer is left
    // alone rather than restarted: a selection made mid-drag must not push the
    // write further out.
    if (snapshot.payload === storedRef.current) {
      return;
    }

    schedule(AUTOSAVE_DEBOUNCE_MS);
  }, [expectedPayload, isEnabled, schedule, snapshot]);

  /**
   * Unmount only, and deliberately not part of the effect above: a debounce that
   * cancelled itself every time the canvas re-rendered would never fire.
   *
   * A change made in the last `AUTOSAVE_DEBOUNCE_MS` before leaving the workspace
   * is therefore not written to Blob. It is not lost — Liveblocks Storage has it,
   * and the room is what the canvas opens from; the stored snapshot catches up on
   * the next edit.
   */
  useEffect(() => clearTimer, [clearTimer]);

  const saveNow = useCallback(() => {
    if (storedRef.current === null) {
      /* Not armed: the stored canvas is still being read, and writing now could
         put a half-restored graph over it. The request is remembered instead of
         refused, and `saving` is the honest state — a save is pending. */
      wantsSaveRef.current = true;
      onStatusChange({ status: "saving", message: null });
      return;
    }

    schedule(0);
  }, [onStatusChange, schedule]);

  return { saveNow };
}
