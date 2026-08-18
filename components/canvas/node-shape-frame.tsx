import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import {
  DEFAULT_NODE_COLOR_ID,
  resolveNodeColor,
  type NodeColorId,
  type NodeShape,
} from "@/types/canvas";

/**
 * How the six `NODE_SHAPES` are drawn, in one place.
 *
 * Split the way `ui-context.md` splits them: the three shapes a border-radius
 * can express are CSS, and the three it cannot are inline SVG. That is not a
 * stylistic preference — a rounded box is a box, and a rhombus, a hexagon, and a
 * cylinder are outlines. Doing all six in SVG would put the simple cases behind
 * a path string; doing all six in CSS would mean `clip-path`, which clips the
 * border away with the corners it removes.
 *
 * The frame is a layer *behind* the label rather than a box the label sits
 * inside, because the label's usable area is a property of the geometry: a
 * rhombus offers its inner half, a hexagon loses its ends, a cylinder loses its
 * cap. Each shape therefore declares both its outline and where text may go.
 *
 * Node colour is drawn here, and only here. `data.color` names a `NODE_COLORS`
 * entry, and the entry's two halves land in the two places that need them: the
 * fill on whichever arm draws the outline, and the text colour on the label box,
 * which the label and its editor inherit. So a pair cannot come apart — there is
 * no way to set a background without the text colour that was tuned for it.
 *
 * Those two are inline styles rather than utilities because the palette is
 * serialized hex (see `NODE_COLORS`), not tokens: there is no `var(--…)` for
 * Tailwind to hang a class on. `transition-colors` still applies, so a colour
 * change animates rather than snapping.
 */

/** A shape a border-radius can express. */
interface CssGeometry {
  kind: "css";
  /** The radius that turns the node's box into the shape. */
  frameClassName: string;
  /** Where the label may sit inside it. */
  labelClassName: string;
}

/** A shape a border-radius cannot express. */
interface SvgGeometry {
  kind: "svg";
  /**
   * The closed outline, authored in the 100×100 box the node's measured size is
   * stretched onto (see `preserveAspectRatio` below).
   */
  path: string;
  /** A stroked-only detail on top of the outline — the cylinder's cap seam. */
  seamPath?: string;
  labelClassName: string;
}

type ShapeGeometry = CssGeometry | SvgGeometry;

/**
 * Keyed by `NodeShape`, so adding a shape to the schema fails to compile until
 * it is given a geometry here — the same reason `NODE_SHAPE_SIZES` is a
 * `Record` rather than a partial lookup with a fallback.
 *
 * The SVG paths are written against a 100×100 box: `0` and `100` are the box's
 * edges and every other number is a percentage of it, so one path serves a node
 * at any size. The cylinder's `12` is the cap ellipse's vertical radius, which
 * puts the cap in the top 24% of the node and the base in the bottom 24%.
 */
const SHAPE_GEOMETRY: Record<NodeShape, ShapeGeometry> = {
  rectangle: {
    kind: "css",
    frameClassName: "rounded-xl",
    labelClassName: "inset-0 px-3 py-2",
  },
  diamond: {
    kind: "svg",
    path: "M50,0 L100,50 L50,100 L0,50 Z",
    /* The largest rectangle inscribed in a rhombus is half its width by half
       its height, centred — which is a 25% inset on all four sides. */
    labelClassName: "inset-[25%]",
  },
  circle: {
    kind: "css",
    /* A full radius on a square box is a circle, and `NODE_SHAPE_SIZES` keeps
       `circle` at 120×120 so this cannot come out as an ellipse. */
    frameClassName: "rounded-full",
    labelClassName: "inset-[14%]",
  },
  pill: {
    kind: "css",
    frameClassName: "rounded-full",
    /* Wider side padding than the rectangle: the ends of a stadium curve away
       from the text, so square insets would let a label touch the edge. */
    labelClassName: "inset-0 px-5 py-2",
  },
  cylinder: {
    kind: "svg",
    path: "M0,12 A50,12 0 0 1 100,12 L100,88 A50,12 0 0 1 0,88 Z",
    /* The front edge of the top cap. Stroked but not filled, so it reads as the
       rim of the cylinder rather than a line across a flat shape. */
    seamPath: "M0,12 A50,12 0 0 0 100,12",
    /* Below the seam and clear of the base curve, so the label sits on the body
       rather than across either cap. */
    labelClassName: "inset-x-[8%] top-[28%] bottom-[16%]",
  },
  hexagon: {
    kind: "svg",
    path: "M15,0 L85,0 L100,50 L85,100 L15,100 L0,50 Z",
    /* Clear of the two points, which start at 15%. */
    labelClassName: "inset-x-[18%] inset-y-[8%]",
  },
};

/**
 * In CSS pixels, not box units — `vectorEffect="non-scaling-stroke"` takes the
 * stroke out of the viewBox's stretch. Slightly heavier than the 1px border on
 * the CSS shapes because a diagonal antialiased edge reads lighter than a
 * pixel-aligned horizontal one, so the two look like the same weight.
 */
const OUTLINE_STROKE_WIDTH = 1.5;

interface NodeShapeFrameProps {
  shape: NodeShape;
  /**
   * Which `NODE_COLORS` pair the node is drawn in. Optional, and defaulted to
   * the same entry `createCanvasNode` gives a fresh node — so the shape panel's
   * drag previews come out in the colour the drop will actually produce without
   * having to know which one that is.
   */
  color?: NodeColorId;
  /**
   * React Flow's selection state. The border brightens with it, which is the
   * only visual difference selection makes — geometry and fill do not move.
   */
  selected?: boolean;
  /**
   * What goes in the label area. Rendered straight into the box rather than
   * wrapped here, because the label is no longer only text: `NodeLabel` overlays
   * an editor on it and has to size that overlay against the label's own box.
   * The frame supplies the room; the caller decides what fills it and how.
   *
   * Empty on the shape panel's drag previews, which draw the outline alone.
   */
  children?: ReactNode;
}

/**
 * Draws a node's shape and slots its label into whatever room that shape
 * leaves.
 *
 * Fills the box it is given, so its proportions come from the node record's
 * `width` / `height` (React Flow applies those as inline styles on the wrapper)
 * and it has no dimensions of its own to keep in sync with
 * `NODE_SHAPE_SIZES`. That is also what lets the shape panel reuse it as a drag
 * preview: the same component in a box of the same default size is, by
 * construction, what the drop will produce.
 */
export function NodeShapeFrame({
  shape,
  color = DEFAULT_NODE_COLOR_ID,
  selected = false,
  children,
}: NodeShapeFrameProps) {
  const geometry = SHAPE_GEOMETRY[shape];
  const { fill, text } = resolveNodeColor(color);
  const outlineClassName = selected
    ? "stroke-brand"
    : "stroke-surface-border-subtle";

  return (
    <div className="relative h-full w-full">
      {geometry.kind === "css" ? (
        <div
          className={cn(
            "absolute inset-0 border transition-colors",
            geometry.frameClassName,
            selected ? "border-brand" : "border-surface-border-subtle",
          )}
          style={{ backgroundColor: fill }}
        />
      ) : (
        <svg
          /* `h-full w-full` is load-bearing and not redundant with `inset-0`: an
             `<svg>` with a `viewBox` is a replaced element with an intrinsic
             aspect ratio, and `width: auto` on one of those resolves from the
             ratio rather than from the insets. Without an explicit size a
             200×140 diamond renders its outline 200×200 and hangs out of the
             node. Measured in a browser, not assumed.

             `overflow-visible` so the outline's stroke, which straddles the
             edges of the viewBox, is not clipped in half. */
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          /* The outline is authored square and stretched to whatever the node
             measures, so it scales with the node in both axes and no path has to
             be recomputed. `non-scaling-stroke` on each path exempts the stroke
             from that stretch — without it a diamond at 200×140 would have
             visibly heavier horizontal edges than vertical ones. */
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={geometry.path}
            fill={fill}
            className={cn("transition-colors", outlineClassName)}
            strokeWidth={OUTLINE_STROKE_WIDTH}
            vectorEffect="non-scaling-stroke"
          />
          {geometry.seamPath ? (
            <path
              d={geometry.seamPath}
              fill="none"
              className={cn("transition-colors", outlineClassName)}
              strokeWidth={OUTLINE_STROKE_WIDTH}
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
      )}

      {/* The pair's text colour is set on the label *box* rather than on the text
          itself, so everything the label renders inherits it — the span, the
          editor's textarea, and the caret in it. `NodeLabel` sets no colour of
          its own for exactly this reason. */}
      <div
        className={cn(
          "absolute flex items-center justify-center overflow-hidden text-center text-sm leading-tight transition-colors",
          geometry.labelClassName,
        )}
        style={{ color: text }}
      >
        {children}
      </div>
    </div>
  );
}
