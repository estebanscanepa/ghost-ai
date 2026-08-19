"use client";

import { useHistory } from "@liveblocks/react/suspense";
import type { OnEdgesChange, OnNodesChange } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

import {
  serializeCanvasDocument,
  toCanvasDocument,
  toCanvasEdges,
  toCanvasNodes,
} from "@/lib/canvas-document";
import { fetchSavedCanvas } from "@/lib/canvas-requests";
import type { CanvasEdge, CanvasNode } from "@/types/canvas";

/**
 * Seeds an empty room from the project's saved canvas.
 *
 * Scoped to one room for the whole of its life. It decides on its first render
 * whether this room needs restoring at all, and never revisits that — so it must
 * be remounted when the room changes rather than handed a new `projectId`.
 * `CanvasRoom` keys the canvas on the room id to guarantee that.
 */

interface UseSavedCanvasOptions {
  projectId: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  onNodesChange: OnNodesChange<CanvasNode>;
  onEdgesChange: OnEdgesChange<CanvasEdge>;
  /** Told once, with a message worth showing, when the saved canvas could not be read. */
  onError: (message: string) => void;
  /** Told once the saved canvas has been written into the room, so the view can be fitted to it. */
  onRestore: () => void;
}

export interface SavedCanvasState {
  /**
   * Whether the room may now be autosaved. False while the saved canvas is being
   * read, and false forever if that read failed — a canvas that could not be
   * loaded must not be overwritten by the empty room it was going to load into.
   */
  isSettled: boolean;
  /** Why the saved canvas could not be read, or `null`. */
  error: string | null;
  /**
   * The serialized document this hook wrote into the room, or `null` when it
   * wrote nothing. Autosave waits for the live graph to serialize to exactly this
   * before it arms, which is how it knows the restore has fully landed and what
   * the stored copy already contains.
   */
  expectedPayload: string | null;
}

type RestorePhase = "loading" | "settled" | "failed";

export function useSavedCanvas({
  projectId,
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onError,
  onRestore,
}: UseSavedCanvasOptions): SavedCanvasState {
  /**
   * Decided on the first render, and that render is the first one after
   * Liveblocks Storage has loaded — the canvas renders under
   * `ClientSideSuspense`, so `nodes` and `edges` are already the room's real
   * contents rather than a placeholder. A room that has anything in it is left
   * alone: people may be drawing in it right now, and the saved copy is by
   * definition older than what they are looking at.
   *
   * A lazy `useState` initializer rather than a `useRef` or an effect because the
   * answer has to be taken from *that* render and then frozen. Read later it
   * would be wrong: the restore itself fills the room, so a second look would
   * report a room that was never empty.
   */
  const [phase, setPhase] = useState<RestorePhase>(() =>
    nodes.length === 0 && edges.length === 0 ? "loading" : "settled",
  );

  const [expectedPayload, setExpectedPayload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * One request per mount. The effect re-runs whenever any of its dependencies
   * changes identity — `onError` and `onRestore` are callbacks the caller may
   * rebuild — and a room is only ever restored once.
   */
  const hasRequested = useRef(false);

  /**
   * The room's history, reached for the same reason `handleImportTemplate` reaches
   * for it: the restore is two writes, and without pausing they are two entries,
   * so the first undo would take back the edges and leave the nodes — a canvas
   * nobody drew. Paused, one press of undo takes the whole restore back.
   */
  const history = useHistory();

  useEffect(() => {
    if (hasRequested.current || phase !== "loading") {
      return;
    }

    hasRequested.current = true;

    void fetchSavedCanvas(projectId).then((result) => {
      if (!result.ok) {
        setPhase("failed");
        setError(result.message);
        onError(result.message);
        return;
      }

      const document = result.canvas;

      // Nothing has ever been saved for this project. The room stays empty and
      // autosave arms on it, so the first thing drawn is the first thing stored.
      if (!document) {
        setPhase("settled");
        return;
      }

      const restoredNodes = toCanvasNodes(document);
      const restoredEdges = toCanvasEdges(document);

      /* `add` changes, which is the door a dropped shape, a template import, and
         a collaborator's node all come through — so a restored node is written
         into Storage exactly as a hand-made one is (invariant 5) and there is no
         second path for Liveblocks to reconcile. Nodes before edges: an edge
         whose endpoints have not arrived yet is an edge nothing can draw.

         `finally`, because a history left paused would silently swallow every
         later change to the room. */
      history.pause();

      try {
        onNodesChange(
          restoredNodes.map((item) => ({ type: "add" as const, item })),
        );
        onEdgesChange(
          restoredEdges.map((item) => ({ type: "add" as const, item })),
        );
      } finally {
        history.resume();
      }

      /* Round-tripped rather than serialized from `document` directly. What
         autosave compares against is the live graph run through
         `toCanvasDocument`, so the baseline has to be produced by the same
         function — otherwise any asymmetry in the conversion would read as an
         unsaved change forever. */
      setExpectedPayload(
        serializeCanvasDocument(
          toCanvasDocument(restoredNodes, restoredEdges),
        ),
      );
      setPhase("settled");
      onRestore();
    });
  }, [
    history,
    onEdgesChange,
    onError,
    onNodesChange,
    onRestore,
    phase,
    projectId,
  ]);

  return { isSettled: phase === "settled", error, expectedPayload };
}
