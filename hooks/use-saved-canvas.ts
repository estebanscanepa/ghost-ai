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
 * whether this room needs restoring at all, and only ever narrows that answer
 * afterwards — a room found to be non-empty when the response lands is left
 * alone, but a room that was non-empty to begin with is never revisited. So it
 * must be remounted when the room changes rather than handed a new `projectId`.
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
   * Whether this hook is still mounted, so a response that arrives after the
   * canvas has gone is dropped rather than acted on. Opening another project
   * unmounts the canvas — `CanvasRoom` keys it on the room id — and the request
   * for the room being left is still in flight when it does.
   *
   * Only the *unmount* may clear this, which is why it is its own effect with an
   * empty dependency list rather than a flag scoped to the request effect below.
   * That effect deliberately survives its own re-runs: `hasRequested` means the
   * second run starts no new request, so a flag cleared by its cleanup would
   * strand the first run's response with nothing left to receive it and leave the
   * room in `loading` forever — autosave never arming. React Strict Mode mounts,
   * cleans up, and mounts again in development, so that is not a hypothetical.
   * Set on the way in as well as cleared on the way out, for that same remount.
   */
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * The room's live graph, for the second look taken when the response lands.
   * `phase` answers "was this room empty?" on the first render and is frozen
   * there, but the write happens a network round trip later, and the room is
   * shared — a dropped shape, a template import, or a collaborator's node can
   * arrive in between. Written from an effect rather than during render, the same
   * way `useCanvasAutosave` keeps its own `latestRef`.
   */
  const graphRef = useRef({ nodes, edges });

  useEffect(() => {
    graphRef.current = { nodes, edges };
  }, [edges, nodes]);

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
      /* Ahead of everything, the failure branch included. Past this point the
         callback writes into the room through `onNodesChange` / `onEdgesChange`,
         fits the viewport through `onRestore`, and reports through `onError` —
         and `onError` is the one that does real damage late, because it reaches
         `CanvasSaveProvider`, which lives in `EditorShell` and outlives the
         canvas. A failed load for the project just closed would otherwise
         surface as an error on the Save button of the project just opened. */
      if (!isMounted.current) {
        return;
      }

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

      /* The emptiness check, made again against the room as it is now rather than
         as it was when the request went out. Restoring on top of what arrived
         would merge a saved canvas that is older by definition into work somebody
         is in the middle of — and it would also strand autosave: it arms only
         once the live graph serializes to exactly `expectedPayload`, which a
         graph carrying both the restore and the new content never does, so the
         room would never be saved again for the rest of the session.

         Settled rather than failed, and with no `expectedPayload`: nothing was
         written, so there is nothing for autosave to wait to see, and the room as
         it stands is exactly what it should take as its baseline. `onRestore` is
         not called either — no graph landed, so there is nothing to fit to. */
      const live = graphRef.current;

      if (live.nodes.length > 0 || live.edges.length > 0) {
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
