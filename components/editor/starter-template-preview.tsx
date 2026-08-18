import { NodeShapeFrame } from "@/components/canvas/node-shape-frame";
import { NODE_SHAPE_SIZES, type CanvasNode } from "@/types/canvas";

import type { CanvasTemplate } from "@/components/editor/starter-templates";

/**
 * A thumbnail of a template's diagram, for the cards in the import modal.
 *
 * Deliberately not a React Flow instance. Everything a thumbnail needs is a
 * projection from flow coordinates into a fixed box and the two things that draw
 * a graph — a line per edge and a shape per node — and mounting a real canvas
 * per card would mean three more stores, three more pan/zoom controllers, and
 * three more resize observers behind a dialog nobody has interacted with yet.
 *
 * What it does reuse is `NodeShapeFrame`, the component the canvas itself draws
 * nodes with. So a preview cannot show a shape or a colour the import will not
 * produce: the six geometries and the palette stay in one place, and this module
 * only decides where each node goes and how big it is.
 */

/**
 * The nominal viewport the projection is computed in, in pixels. The rendered
 * box is `w-full` at this aspect ratio and every coordinate is emitted as a
 * percentage of these two numbers, so the thumbnail scales with the card while
 * the arithmetic stays in one fixed frame. Uniform scaling depends on the
 * container holding the ratio, which is what `PREVIEW_ASPECT_CLASS` is for.
 */
const PREVIEW_WIDTH = 288;
const PREVIEW_HEIGHT = 144;
const PREVIEW_ASPECT_CLASS = "aspect-[2/1]";

/** Breathing room inside the box, so a node's outline never touches the border. */
const PREVIEW_PADDING = 10;

/** Thin, and thinner than the canvas's own 1.5px: these are 0.2× scale edges. */
const PREVIEW_EDGE_STROKE_WIDTH = 1;

/**
 * How the template's flow coordinates map into the nominal viewport: a uniform
 * scale plus a translation that centres the diagram.
 */
interface PreviewProjection {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/**
 * A node's footprint. `width` / `height` are what `defineTemplate` wrote onto
 * the record, and the fallback is the same table it wrote them from — so a node
 * that somehow arrives without dimensions is drawn at its shape's default rather
 * than collapsing to nothing.
 */
function nodeSize(node: CanvasNode) {
  const shapeSize = NODE_SHAPE_SIZES[node.data.shape];

  return {
    width: node.width ?? shapeSize.width,
    height: node.height ?? shapeSize.height,
  };
}

/**
 * Fits a template's nodes into the nominal viewport.
 *
 * The bounds are the union of every node's box, not just its position — a
 * diagram whose rightmost node is 180px wide extends 180px past that node's `x`,
 * and fitting to the positions alone would push it through the right edge.
 *
 * The scale is capped at 1, so a small template is centred at its true size
 * instead of being blown up until a two-node diagram fills the card and reads as
 * a different, larger design than the one the import produces.
 */
function projectTemplate(nodes: CanvasNode[]): PreviewProjection {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const { width, height } = nodeSize(node);

    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  const boundsWidth = maxX - minX;
  const boundsHeight = maxY - minY;
  const innerWidth = PREVIEW_WIDTH - PREVIEW_PADDING * 2;
  const innerHeight = PREVIEW_HEIGHT - PREVIEW_PADDING * 2;

  /* A single node makes one of the two spans zero, and a division by zero is
     `Infinity` here rather than `NaN` — which `Math.min` then discards in favour
     of the other axis or of the cap. */
  const scale = Math.min(
    innerWidth / boundsWidth,
    innerHeight / boundsHeight,
    1,
  );

  return {
    scale,
    offsetX:
      PREVIEW_PADDING + (innerWidth - boundsWidth * scale) / 2 - minX * scale,
    offsetY:
      PREVIEW_PADDING + (innerHeight - boundsHeight * scale) / 2 - minY * scale,
  };
}

/** A point in the nominal viewport. */
interface PreviewPoint {
  x: number;
  y: number;
}

/** Where each node's centre lands, keyed by node id — the endpoints of the edge lines. */
function projectNodeCentres(
  nodes: CanvasNode[],
  projection: PreviewProjection,
): Map<string, PreviewPoint> {
  const { scale, offsetX, offsetY } = projection;

  return new Map(
    nodes.map((node) => {
      const { width, height } = nodeSize(node);

      return [
        node.id,
        {
          x: offsetX + (node.position.x + width / 2) * scale,
          y: offsetY + (node.position.y + height / 2) * scale,
        },
      ];
    }),
  );
}

/** A nominal-viewport length as a percentage of the box, for CSS. */
function percentOfWidth(value: number): string {
  return `${(value / PREVIEW_WIDTH) * 100}%`;
}

function percentOfHeight(value: number): string {
  return `${(value / PREVIEW_HEIGHT) * 100}%`;
}

interface StarterTemplatePreviewProps {
  template: CanvasTemplate;
}

export function StarterTemplatePreview({
  template,
}: StarterTemplatePreviewProps) {
  const { nodes, edges } = template;

  /* Every template in the library has nodes, so this is a guard rather than a
     case: with none, the bounds would be an empty interval and there is nothing
     to draw anyway. */
  if (nodes.length === 0) {
    return null;
  }

  const projection = projectTemplate(nodes);
  const centres = projectNodeCentres(nodes, projection);

  return (
    <div
      /* `ring-1` rather than the project's usual `border`, and this was measured
         rather than preferred. Every coordinate below is a percentage, and a
         percentage resolves against the *content* box — while `aspect-[2/1]`
         constrains the *border* box, because Tailwind's preflight sets
         `border-box` sizing. A 1px border therefore leaves a 286×142 content box
         inside a 288×144 frame, which is not 2:1: x and y come out scaled by
         0.993 and 0.986, the nodes stop being uniformly scaled, and the edge
         lines — whose `viewBox` is stretched by the same two factors — drift up
         to 1px off the node centres they are supposed to join. A ring is a
         box-shadow, takes no part in layout, and takes all of that to zero. */
      className={`relative w-full overflow-hidden rounded-xl bg-base ring-1 ring-surface-border ${PREVIEW_ASPECT_CLASS}`}
      aria-hidden
    >
      {/* Edges first, so a line runs under the nodes it joins rather than across
          their fill — the same order the canvas paints in. Straight lines between
          centres, not the smooth-step routing of the real edge: at this scale the
          corners of a right-angled path are a few pixels apart and read as
          noise, and what the thumbnail is for is which node talks to which. */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
        /* The box holds a fixed aspect ratio, so `none` is already uniform — it
           is here so the viewBox tracks the box exactly rather than being letter-
           boxed inside it, which would break alignment with the nodes below,
           whose percentages resolve against the box itself. */
        preserveAspectRatio="none"
      >
        {edges.map((edge) => {
          const source = centres.get(edge.source);
          const target = centres.get(edge.target);

          if (!source || !target) {
            return null;
          }

          return (
            <line
              key={edge.id}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              className="stroke-copy-faint"
              strokeWidth={PREVIEW_EDGE_STROKE_WIDTH}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const { width, height } = nodeSize(node);
        const { scale, offsetX, offsetY } = projection;

        return (
          <div
            key={node.id}
            className="absolute"
            /* Percentages rather than pixels: they resolve against the box, which
               is `w-full` at a fixed ratio, so the whole thumbnail scales with
               the card and both axes scale by the same factor. */
            style={{
              left: percentOfWidth(offsetX + node.position.x * scale),
              top: percentOfHeight(offsetY + node.position.y * scale),
              width: percentOfWidth(width * scale),
              height: percentOfHeight(height * scale),
            }}
          >
            {/* No label. The frame fills whatever box it is given, and at a fifth
                of canvas scale a node's text would be a smudge — the shape and
                the colour are what carry the diagram here. Same call the shape
                panel makes for its drag ghosts. */}
            <NodeShapeFrame shape={node.data.shape} color={node.data.color} />
          </div>
        );
      })}
    </div>
  );
}
