"use client";

import { NodeToolbar, Position } from "@xyflow/react";
import type { CSSProperties } from "react";

import { NODE_COLORS, type NodeColorId } from "@/types/canvas";

/**
 * The floating colour toolbar a selected node carries above it.
 *
 * One swatch per `NODE_COLORS` entry, and a click writes that entry's id onto
 * the node — so the pair travels as a pair and there is no way to pick a
 * background without the text colour tuned for it. Which colour a node is drawn
 * in is `NodeShapeFrame`'s business; this component only chooses.
 *
 * Mounted as React Flow's own `NodeToolbar`, which is what makes "slightly above
 * the node without overlapping it" a number rather than a layout problem: the
 * toolbar is portalled out of the node into the renderer and positioned from the
 * node's measured bounds and the live viewport transform, so it tracks a drag, a
 * pan, and a zoom without scaling with them. Positioning this by hand inside the
 * node would have put it inside the node's own transform, where it would grow
 * with the zoom and be clipped by the shapes that inset their content.
 */

/**
 * The swatch names, keyed by palette id so a new `NODE_COLORS` entry fails to
 * compile until it is named. UI copy rather than schema: the ids are what a
 * document stores, and a label is what a person reads.
 */
const COLOR_LABELS: Record<NodeColorId, string> = {
  neutral: "Neutral",
  blue: "Blue",
  purple: "Purple",
  orange: "Orange",
  red: "Red",
  pink: "Pink",
  green: "Green",
  teal: "Teal",
};

/**
 * The gap between the node's top edge and the bottom of the toolbar, in screen
 * pixels — `NodeToolbar` applies it outside the viewport scale, so it is the
 * same gap at every zoom.
 *
 * 16 rather than the library's default 10 because the top edge of a node is not
 * empty: the top connection handle is 9px and straddles that edge, so it reaches
 * 4.5px up at zoom 1 and 9px up at the default maximum zoom of 2. 16 clears it
 * in both cases without floating so far off that the toolbar stops reading as
 * belonging to the node.
 */
const TOOLBAR_OFFSET = 16;

/** The swatch's own text colour, read by the rules in `globals.css`. */
interface SwatchStyle extends CSSProperties {
  "--swatch-accent": string;
}

interface NodeColorToolbarProps {
  /** The node's current pair, by id. Its swatch is the active one. */
  color: NodeColorId;
  /**
   * React Flow's selection state, passed straight through as `isVisible`: the
   * toolbar exists only while the node is selected.
   */
  selected: boolean;
  onColorChange: (color: NodeColorId) => void;
}

export function NodeColorToolbar({
  color,
  selected,
  onColorChange,
}: NodeColorToolbarProps) {
  return (
    <NodeToolbar
      isVisible={selected}
      position={Position.Top}
      offset={TOOLBAR_OFFSET}
      /* `nopan` is load-bearing, not decoration. `NodeToolbar` portals into
         `.react-flow__renderer`, which is the element d3-zoom is attached to, so
         without it a press on a swatch would start a pan under the pointer and
         the click would land on a moving target. `nodrag` is belt and braces —
         the toolbar is outside the node's DOM, so a node drag cannot start here
         anyway — and it keeps the intent legible next to `nopan`.

         `rounded-full` and the same surface treatment as `ShapePanel`: this is
         the second floating pill on the canvas, and the two should read as one
         family. `bg-elevated` rather than `bg-surface` because this one floats
         over a node rather than over the empty canvas. */
      className="nodrag nopan flex items-center gap-1.5 rounded-full border border-surface-border bg-elevated/95 p-1.5 shadow-lg backdrop-blur"
      role="toolbar"
      aria-label="Node color"
    >
      {NODE_COLORS.map((option) => {
        const isActive = option.id === color;
        /* Both halves of the pair are on the swatch: the fill is its background
           and the text colour is the dot inside it. Showing only the fill would
           make eight near-black circles that cannot be told apart — the vivid
           half is what identifies a pair. */
        const style: SwatchStyle = {
          backgroundColor: option.fill,
          "--swatch-accent": option.text,
        };

        return (
          <button
            key={option.id}
            type="button"
            /* Read by the hover and active rules in `globals.css`. An attribute
               rather than a class because the two states are `box-shadow`s built
               from a runtime hex, which Tailwind cannot generate a utility for. */
            data-active={isActive}
            aria-pressed={isActive}
            aria-label={COLOR_LABELS[option.id]}
            title={COLOR_LABELS[option.id]}
            onClick={() => onColorChange(option.id)}
            style={style}
            className="node-color-swatch flex size-5 cursor-pointer items-center justify-center rounded-full focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: option.text }}
            />
          </button>
        );
      })}
    </NodeToolbar>
  );
}
