import type { XYPosition } from "@xyflow/react";

import {
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR_ID,
  type CanvasNode,
  type NodeShape,
  type NodeSize,
} from "@/types/canvas";

/**
 * Creating nodes: the ID rule and the shape a fresh node starts in.
 *
 * Kept out of the components because the canvas is not the only thing that will
 * add nodes — a starter template import and the AI generation write into the
 * same graph, and every node in a room has to be identified the same way.
 */

/**
 * Distinguishes nodes created inside the same millisecond. `Date.now()` alone
 * collides on a fast repeated drop, and a colliding ID does not add a second
 * node — `applyNodeChanges` in `@liveblocks/react-flow` treats an `add` for an
 * existing key as a reconcile, so the earlier node would be silently rewritten.
 */
let creationCounter = 0;

/**
 * `<shape>-<timestamp>-<counter>`. The shape prefix makes an ID readable while
 * debugging a room's Storage, the timestamp orders creations, and the counter
 * separates the ones that share a millisecond.
 *
 * Only ever called in the browser, so two clients could in principle mint the
 * same ID — the timestamp would have to match to the millisecond and the
 * counters would have to agree, which needs both tabs to have created exactly
 * the same number of nodes since load. Left as is for now: the collision is
 * remote, and the fix (a per-session prefix) belongs with the persistence work
 * that has to think about IDs across snapshots anyway.
 */
export function createCanvasNodeId(shape: NodeShape): string {
  creationCounter += 1;
  return `${shape}-${Date.now()}-${creationCounter}`;
}

interface CreateCanvasNodeOptions {
  shape: NodeShape;
  /** Canvas coordinates, not screen coordinates. */
  position: XYPosition;
  size: NodeSize;
}

/**
 * A new node: the requested shape at the requested place and size, with an
 * empty label and the default colour. The label is empty rather than a
 * placeholder like `"Rectangle"` because the user is about to type into it, and
 * a default they have to clear first is friction, not a head start.
 */
export function createCanvasNode({
  shape,
  position,
  size,
}: CreateCanvasNodeOptions): CanvasNode {
  return {
    id: createCanvasNodeId(shape),
    type: CANVAS_NODE_TYPE,
    position,
    width: size.width,
    height: size.height,
    data: {
      label: "",
      color: DEFAULT_NODE_COLOR_ID,
      shape,
    },
  };
}
