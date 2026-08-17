"use client";

import type { NodeProps } from "@xyflow/react";

import type { CanvasNode as CanvasNodeType } from "@/types/canvas";

/**
 * The renderer registered under `CANVAS_NODE_TYPE` — deliberately the plainest
 * thing that makes a dropped node visible.
 *
 * Every shape draws as the same bordered rectangle for now, and `data.shape` and
 * `data.color` are carried but not yet drawn: the six shape geometries (three of
 * them inline SVG) and the eight-colour palette from `ui-context.md` are the
 * next unit, and `12-shape-panel.md` scopes them out of this one. What matters
 * here is that a node created by a drag appears where it was dropped, at the
 * size the panel offered, with its label centred.
 *
 * The box fills the node, whose width and height come from the node record
 * itself — React Flow applies those as inline styles on the wrapper — so the
 * shape's proportions are decided by `NODE_SHAPE_SIZES`, not by this component.
 *
 * No connection handles yet, so nothing can be wired up: `ui-context.md`
 * specifies hover-revealed handles on all four sides and those arrive with the
 * shape renderers.
 */
export function CanvasNode({ data }: NodeProps<CanvasNodeType>) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-xl border border-surface-border-subtle bg-surface px-3 py-2 text-center text-sm text-copy-primary">
      {data.label}
    </div>
  );
}
