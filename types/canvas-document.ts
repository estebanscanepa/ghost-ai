import type { NodeColorId, NodeHandleId, NodeShape } from "@/types/canvas";

/**
 * The canvas as it is *stored*, which is a different shape from the canvas as it
 * is *drawn* — see `types/canvas.ts` for the latter.
 *
 * A React Flow node carries a good deal that is true only of one client at one
 * moment: whether it is selected, whether it is being dragged, the dimensions
 * React Flow measured for it, the `type` string that names its renderer, the
 * `style` and `markerEnd` an edge was created with. None of that belongs in a
 * snapshot. What does belong is the graph itself, and only that — so this shape
 * is flat, holds no React Flow field names, and is the whole of what a saved
 * canvas is.
 *
 * Keeping it separate is what makes the snapshot stable. Autosave decides
 * whether to write by comparing the serialized document to the last one it
 * stored, so a field that changes when nothing about the diagram changed —
 * selecting a node, hovering an edge — would turn every interaction into a
 * write. And it is what lets the renderer's own defaults be reapplied on load
 * rather than frozen into storage: an edge reloaded a year from now is drawn
 * with today's `DEFAULT_EDGE_OPTIONS`, not with the arrowhead size it was
 * created under.
 */

/** One node, reduced to what a diagram is. Position and size are in flow units. */
export interface StoredCanvasNode {
  id: string;
  shape: NodeShape;
  color: NodeColorId;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * One edge. `sourceHandle` / `targetHandle` name which of the four sides the
 * connection left from and arrived at, so a reloaded edge routes the way it was
 * drawn; `null` means the connection was made without one, and React Flow picks
 * a side.
 */
export interface StoredCanvasEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: NodeHandleId | null;
  targetHandle: NodeHandleId | null;
  /** `""` for an unlabelled edge, so the field is never absent. */
  label: string;
}

/** A whole canvas. This is the JSON body of a `canvas/{projectId}.json` blob. */
export interface CanvasDocument {
  nodes: StoredCanvasNode[];
  edges: StoredCanvasEdge[];
}

/**
 * What `GET /api/projects/[projectId]/canvas` answers with. `canvas` is `null`
 * when the project has never been saved — a distinct answer from a canvas that
 * is saved and empty, which the editor needs in order to tell "nothing to
 * restore" from "restore an empty diagram".
 */
export interface CanvasDocumentResponse {
  canvas: CanvasDocument | null;
}
