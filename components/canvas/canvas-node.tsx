"use client";

import {
  Handle,
  NodeResizer,
  Position,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react";
import { useCallback, useState } from "react";

import { NodeColorToolbar } from "@/components/canvas/node-color-toolbar";
import { NodeLabel } from "@/components/canvas/node-label";
import { NodeShapeFrame } from "@/components/canvas/node-shape-frame";
import {
  NODE_MIN_SIZE,
  type CanvasEdge,
  type CanvasNode as CanvasNodeType,
  type NodeColorId,
  type NodeHandleId,
} from "@/types/canvas";

/**
 * The renderer registered under `CANVAS_NODE_TYPE`.
 *
 * There is one node type and six shapes, so this component stays a dispatch:
 * it reads `data.shape` and `data.color` and hands them to `NodeShapeFrame`,
 * which owns every geometry and every colour, and hands `data.label` to
 * `NodeLabel`, which owns reading and editing text. Nothing here knows a diamond
 * from a cylinder or a caret from a placeholder — what it owns is the node's
 * three mutable properties, size, label, and colour, and the route each of them
 * takes back into the document.
 *
 * The frame fills the node, whose width and height come from the node record —
 * React Flow applies those as inline styles on the wrapper — so proportions are
 * decided by `NODE_SHAPE_SIZES` at creation and by the resizer after that, and
 * this component has no dimensions of its own.
 */

/**
 * One connection point per side, in `ui-context.md`'s order of "all four sides
 * of a node". Every shape gets the same four: React Flow places a handle at the
 * midpoint of the node's bounding box edge, which for a diamond or a hexagon is
 * the vertex the outline actually reaches, so the same four positions land on
 * the geometry rather than beside it.
 *
 * All four are declared `source`. The canvas runs in `ConnectionMode.Loose`, so
 * a handle is an endpoint rather than a direction — either end of a connection
 * may be either handle, and a diagram is drawn by dragging between the two
 * nodes that talk to each other instead of hunting for which side owns the
 * source. Declaring both a source and a target per side would double the
 * handles for no behaviour.
 *
 * The ids are the side names, so an edge records which side it left and which
 * it arrived at — the edge renderer will want that, and it costs nothing now.
 * They come from `NODE_HANDLE_IDS` in the schema rather than being spelled out
 * here alone, because a starter template's edges name the same four sides: the
 * `satisfies` is what makes a rename in one place fail to compile in the other.
 */
const CONNECTION_HANDLES = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const satisfies readonly { id: NodeHandleId; position: Position }[];
export function CanvasNode({
  id,
  data,
  selected,
  isConnectable,
}: NodeProps<CanvasNodeType>) {
  /**
   * Which node is being edited is local, per-client state and deliberately not
   * in the node record: two collaborators may have their own label open at the
   * same time, and neither should see the other's caret arrive as a document
   * change. The text itself is shared; the fact that someone is typing is not.
   */
  const [editing, setEditing] = useState(false);

  const { updateNodeData } = useReactFlow<CanvasNodeType, CanvasEdge>();

  /**
   * `updateNodeData` is the controlled-flow way to change a node's data: with
   * the graph owned by `useLiveblocksFlow`, React Flow does not mutate anything
   * itself — it dispatches a `replace` change through `onNodesChange`, which is
   * the same door a dropped node's `add` and a resize's `dimensions` go
   * through. So a keystroke reaches Storage by the one path, and there is no
   * second way for a label to change that Liveblocks would have to reconcile.
   */
  const handleLabelChange = useCallback(
    (label: string) => {
      updateNodeData(id, { label });
    },
    [id, updateNodeData],
  );

  /**
   * The same road as a keystroke, for the same reason: a colour is node data, so
   * it goes out as a `replace` change through `onNodesChange` and lands in
   * Liveblocks Storage. Nothing is sent to a server — the canvas document is
   * Storage, and a collaborator sees the new colour as the click lands.
   */
  const handleColorChange = useCallback(
    (color: NodeColorId) => {
      updateNodeData(id, { color });
    },
    [id, updateNodeData],
  );

  return (
    <>
      {/* The shape first, then the controls, so both sets of controls paint over
          it rather than under its fill. Positioned siblings with no `z-index`
          stack in document order, and the frame is positioned. */}
      <NodeShapeFrame shape={data.shape} color={data.color} selected={selected}>
        <NodeLabel
          label={data.label}
          editing={editing}
          onLabelChange={handleLabelChange}
          onEditingChange={setEditing}
        />
      </NodeShapeFrame>

      {/* Rendered here but painted elsewhere: `NodeToolbar` portals itself out of
          the node into the renderer, so its place in this list decides nothing
          about stacking. It sits next to the frame because it is the third of the
          node's mutable properties, alongside size and label below. */}
      <NodeColorToolbar
        color={data.color}
        selected={selected ?? false}
        onColorChange={handleColorChange}
      />

      {/* Resize controls only while the node is selected. `NodeResizer` puts its
          four grab handles on the *corners* (`XY_RESIZER_HANDLE_POSITIONS`) and
          a 1px line down each edge, so it does not compete with the connection
          handles below, which sit at the edge midpoints — the two sets never
          occupy the same point.

          The resizer emits `dimensions` changes carrying `setAttributes`, which
          is what writes `width` / `height` onto the node record, so a resize
          syncs exactly as a move does. Its controls carry React Flow's own
          `nodrag`, so dragging a handle resizes rather than moving the node. */}
      <NodeResizer
        isVisible={selected}
        minWidth={NODE_MIN_SIZE.width}
        minHeight={NODE_MIN_SIZE.height}
        /* A circle is drawn as a full border-radius on its box, so a box that
           stops being square stops being a circle and becomes an ellipse. The
           shape is called `circle` in the schema and `NODE_SHAPE_SIZES` keeps it
           at 120×120 for this reason; locking the ratio is what keeps that true
           through a resize rather than only at creation. */
        keepAspectRatio={data.shape === "circle"}
      />

      {/* Last, so a connection handle wins the hit test at the one point where
          it overlaps a resize line — the midpoint of an edge. The handles are
          always mounted and revealed by CSS on hover or selection (see the
          React Flow block in `globals.css`), not mounted conditionally: React
          Flow reads handle geometry out of the DOM to decide what a dragged
          connection can reach, so a node whose handles only exist while it is
          hovered would be a node nothing could be dropped onto.

          `Handle` ships with `nodrag` and `nopan` of its own, so starting a
          connection never drags the node or pans the canvas. */}
      {CONNECTION_HANDLES.map(({ id: handleId, position }) => (
        <Handle
          key={handleId}
          id={handleId}
          type="source"
          position={position}
          isConnectable={isConnectable}
        />
      ))}
    </>
  );
}
