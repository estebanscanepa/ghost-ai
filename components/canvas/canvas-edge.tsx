"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { useCallback, useState, type MouseEvent } from "react";

import { EdgeLabel } from "@/components/canvas/edge-label";
import type {
  CanvasEdge as CanvasEdgeType,
  CanvasNode,
} from "@/types/canvas";

/**
 * The renderer registered under `CANVAS_EDGE_TYPE`, and the last of the canvas's
 * custom rendering.
 *
 * It owns four things React Flow's built-in edges do not do the way this canvas
 * needs them done: right-angle routing, a resting dim that keeps a dense diagram
 * readable, a hit area wider than the line it belongs to, and an inline label.
 * The label's own appearance and its editor live in `EdgeLabel`; what stays here
 * is the geometry — the path, the midpoint the label hangs on, and the states
 * that decide how brightly the whole thing is drawn.
 *
 * Colour, stroke width, and the arrowhead are *not* decided here. They arrive on
 * the edge record from `DEFAULT_EDGE_OPTIONS` in `types/canvas.ts`, because they
 * are written into the shared document at creation and a template or the AI has
 * to produce the same ones (invariant 5).
 */

/**
 * The radius `getSmoothStepPath` rounds each corner to. Right angles with a
 * small radius rather than square ones: a hard corner on a 1.5px line reads as a
 * kink, and anything much larger stops being a right angle and becomes the
 * bezier this replaces.
 */
const EDGE_CORNER_RADIUS = 8;

/**
 * The width of the invisible band along the path that takes the pointer, in
 * pixels. The visible line stays 1.5px — this is the whole point of the spec's
 * "easier to hover and click without increasing the visible line thickness".
 *
 * The same 20 React Flow uses for `BaseEdge`'s own interaction path, which is
 * turned off below and replaced by this one: `BaseEdge`'s carries no handlers,
 * and hover, double-click, and the `nopan` opt-out all have to hang off the
 * element that is actually under the pointer.
 */
const EDGE_HIT_WIDTH = 20;

/**
 * How far an edge is dimmed at rest. Edges are secondary to nodes and a diagram
 * has more of them than it has nodes, so at full strength the connections are
 * what the eye lands on first. Bright enough to follow across the canvas, faint
 * enough that pointing at one is a visible change.
 */
const EDGE_REST_OPACITY = 0.55;

export function CanvasEdge({
  id,
  data,
  selected,
  style,
  markerEnd,
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
}: EdgeProps<CanvasEdgeType>) {
  /**
   * Both are local, per-client state and deliberately not on the edge record:
   * two collaborators may point at or type into the same edge at once, and
   * neither should see the other's pointer arrive as a document change. The text
   * is shared; the fact that somebody is looking at it is not.
   */
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);

  const { updateEdgeData } = useReactFlow<CanvasNode, CanvasEdgeType>();

  /**
   * The path and the point to hang the label on, from one call. React Flow
   * returns the midpoint alongside the path it just routed, and that is the only
   * honest source for it: the middle of a right-angled path is not the middle of
   * the straight line between its ends, and recomputing it here would be a
   * second implementation of the routing that could disagree with the first.
   */
  const [path, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: EDGE_CORNER_RADIUS,
  });

  /* Editing counts as active so the edge does not dim out from under an open
     editor when the pointer moves off the line to reach the input. */
  const active = hovered || editing || (selected ?? false);

  /**
   * `updateEdgeData` is the controlled-flow way to change an edge's data: with
   * the graph owned by `useLiveblocksFlow`, React Flow dispatches a `replace`
   * change through `onEdgesChange` rather than mutating anything itself. That is
   * the same door a selection and a deletion go through, so a label reaches
   * Liveblocks Storage by the one path a collaborator's does.
   */
  const handleLabelChange = useCallback(
    (label: string) => {
      updateEdgeData(id, { label });
    },
    [id, updateEdgeData],
  );

  const handleDoubleClick = useCallback(
    (event: MouseEvent<SVGPathElement>) => {
      event.stopPropagation();
      setEditing(true);
    },
    [],
  );

  return (
    <>
      {/* `opacity` rather than `stroke-opacity`, because the arrowhead is a
          marker and a marker takes no part in the stroke's paint — dimming the
          stroke alone would leave a full-strength arrow on a faded line. The
          edge's own `style` is spread first so the stroke, its width, and its
          round cap keep coming from the document.

          `interactionWidth={0}` turns off `BaseEdge`'s own hit path in favour of
          the one below, which is the same width but carries handlers. */}
      <BaseEdge
        path={path}
        markerEnd={markerEnd}
        interactionWidth={0}
        style={{ ...style, opacity: active ? 1 : EDGE_REST_OPACITY }}
      />

      {/* The hit area. Invisible but not absent: `pointer-events: visibleStroke`
          on the edge group targets the stroke *area* whatever the stroke is
          painted with, which is how React Flow's own interaction path works.

          `nopan` is doing two jobs. It keeps a press on the band from panning
          the canvas, and — because `createFilter` in `@xyflow/system` rejects
          any event wrapped in the class — it keeps the double-click that opens
          the editor from also zooming the viewport. The cost is that dragging
          along an edge no longer pans, the same trade React Flow already makes
          for every draggable node. */}
      <path
        d={path}
        className="react-flow__edge-interaction nopan cursor-pointer"
        fill="none"
        strokeWidth={EDGE_HIT_WIDTH}
        strokeOpacity={0}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={handleDoubleClick}
      />

      {/* Portalled out of this SVG into React Flow's label layer, which is HTML
          inside the viewport — so the label can be an input, and it still pans
          and zooms with the canvas. */}
      <EdgeLabelRenderer>
        <EdgeLabel
          label={data?.label ?? ""}
          x={labelX}
          y={labelY}
          active={active}
          editing={editing}
          onLabelChange={handleLabelChange}
          onEditingChange={setEditing}
          onHoverChange={setHovered}
        />
      </EdgeLabelRenderer>
    </>
  );
}
