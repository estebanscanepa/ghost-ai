import {
  MarkerType,
  type DefaultEdgeOptions,
  type Edge,
  type Node,
} from "@xyflow/react";

/**
 * The canvas graph schema, shared by everything that reads or writes it:
 * the React Flow surface, the Liveblocks Storage the nodes and edges sync
 * through, the starter templates, and the AI generation that writes into a
 * room. Per invariant 5 in `architecture-context.md`, user-created content and
 * imported templates must follow the same shape — this module is that shape.
 */

/**
 * The one node type on the canvas. Every node is a `canvasNode`; the visual
 * difference between a database and a decision is `data.shape`, not a separate
 * React Flow type. One type means one renderer and one migration surface.
 */
export const CANVAS_NODE_TYPE = "canvasNode";

/** The one edge type, for the same reason. */
export const CANVAS_EDGE_TYPE = "canvasEdge";

/**
 * The six supported node shapes — see `ui-context.md`. The list is the
 * authority on what a shape may be; the renderer that draws them lands later.
 */
export const NODE_SHAPES = [
  "rectangle", // default general-purpose node
  "diamond", // decision / gateway
  "circle", // event / endpoint
  "pill", // service / process
  "cylinder", // database / storage
  "hexagon", // external system / boundary
] as const;

export type NodeShape = (typeof NODE_SHAPES)[number];

export const DEFAULT_NODE_SHAPE: NodeShape = "rectangle";

/**
 * The four sides a connection may leave from or arrive at, which are also the
 * ids the node's handles are registered under (`CONNECTION_HANDLES` in
 * `canvas-node.tsx`).
 *
 * Schema rather than a constant belonging to the renderer, for the same reason
 * as `NODE_SHAPE_SIZES` and `DEFAULT_EDGE_OPTIONS`: an edge *records* which side
 * it used, in `sourceHandle` / `targetHandle`, so the names are graph data. A
 * starter template writes edges, and it has to name the same four sides a
 * dragged connection does (invariant 5).
 */
export const NODE_HANDLE_IDS = ["top", "right", "bottom", "left"] as const;

export type NodeHandleId = (typeof NODE_HANDLE_IDS)[number];

/** The footprint a node occupies on the canvas, in flow units. */
export interface NodeSize {
  width: number;
  height: number;
}

/**
 * The size a shape is created at. Part of the schema rather than the shape
 * panel because a node's dimensions are graph data — the AI generation and the
 * starter templates create nodes too, and they must land at the same sizes a
 * hand-dragged node does (invariant 5).
 *
 * The proportions carry meaning: rectangles are wider than tall because they
 * hold a phrase, circles are square because a squashed circle reads as an
 * ellipse, and diamonds are the largest because a rhombus wastes its corners —
 * a label only has the inner half of the box to sit in.
 */
export const NODE_SHAPE_SIZES: Record<NodeShape, NodeSize> = {
  rectangle: { width: 180, height: 80 },
  diamond: { width: 200, height: 140 },
  circle: { width: 120, height: 120 },
  pill: { width: 180, height: 64 },
  cylinder: { width: 160, height: 100 },
  hexagon: { width: 180, height: 90 },
};

/**
 * The floor a node may be resized to, in flow units. One size for every shape
 * rather than a fraction of each shape's default, so the limit is a property of
 * "a node has to stay legible and grabbable" and not of which shape it happens
 * to be — a diamond shrunk to a quarter of its default is as unusable as a
 * rectangle shrunk to a quarter of its own.
 *
 * Schema rather than component state for the same reason as `NODE_SHAPE_SIZES`:
 * dimensions are graph data, and a node resized by the AI or arriving in a
 * template must respect the same floor a hand-dragged handle does.
 */
export const NODE_MIN_SIZE: NodeSize = { width: 80, height: 48 };

/**
 * The eight node colours from `ui-context.md`. Each entry pairs a dark fill
 * with a vivid text colour already tuned to read against the near-black
 * canvas — the two always travel together, which is why a node stores the
 * palette entry's `id` rather than a raw colour. A stored id also means the
 * palette can be retuned without rewriting every node in every room.
 *
 * Hex literals rather than CSS tokens for the same reason as `CURSOR_COLORS`
 * in `lib/liveblocks.ts`: these values are serialized into the canvas
 * document, where `var(--…)` has nothing to resolve against.
 */
export const NODE_COLORS = [
  { id: "neutral", fill: "#1F1F1F", text: "#EDEDED" },
  { id: "blue", fill: "#10233D", text: "#52A8FF" },
  { id: "purple", fill: "#2E1938", text: "#BF7AF0" },
  { id: "orange", fill: "#331B00", text: "#FF990A" },
  { id: "red", fill: "#3C1618", text: "#FF6166" },
  { id: "pink", fill: "#3A1726", text: "#F75F8F" },
  { id: "green", fill: "#0F2E18", text: "#62C073" },
  { id: "teal", fill: "#062822", text: "#0AC7B4" },
] as const;

export type NodeColor = (typeof NODE_COLORS)[number];

export type NodeColorId = NodeColor["id"];

/**
 * The palette by id. A `Map` rather than a `Record` on purpose: the lookup key
 * is typed `string`, so `resolveNodeColor` below can be handed an id that came
 * out of a shared document and get `undefined` back instead of a lie.
 */
const NODE_COLORS_BY_ID = new Map<string, NodeColor>(
  NODE_COLORS.map((color) => [color.id, color]),
);

/**
 * The pair a node is created with — the neutral dark entry, per `ui-context.md`.
 * Derived from the palette rather than restated, so the default and the entry it
 * names cannot drift apart.
 */
export const DEFAULT_NODE_COLOR: NodeColor = NODE_COLORS[0];

export const DEFAULT_NODE_COLOR_ID: NodeColorId = DEFAULT_NODE_COLOR.id;

/**
 * A node's stored `color` resolved to the pair it names.
 *
 * Falls back to the default rather than throwing. The id is typed, but it
 * arrives from Liveblocks Storage — a document another client wrote, possibly
 * against a palette this build does not have — and a node drawn in the wrong
 * colour is a better failure than a canvas that does not draw at all.
 */
export function resolveNodeColor(id: NodeColorId): NodeColor {
  return NODE_COLORS_BY_ID.get(id) ?? DEFAULT_NODE_COLOR;
}

/**
 * What a node carries. A `type` alias rather than an `interface` despite the
 * project's usual preference: React Flow constrains node data to
 * `Record<string, unknown>`, and an interface has no implicit index signature,
 * so `Node<CanvasNodeData>` would not typecheck.
 */
export type CanvasNodeData = {
  /** The text drawn inside the node. */
  label: string;
  /** A `NODE_COLORS` entry, by id. */
  color: NodeColorId;
  /** How the node is drawn. */
  shape: NodeShape;
};

/**
 * What an edge carries. One field, and it is optional for a reason rather than
 * for convenience: an edge is made by dragging between two handles, which
 * produces no text, so a brand-new edge has no `data` at all. Every reader
 * therefore has to treat a missing `data`, a missing `label`, and `""` as the
 * same thing — "no label yet" — which `EdgeLabel` does in one place.
 */
export type CanvasEdgeData = {
  /** The text drawn on the edge, as a pill at the path's midpoint. */
  label?: string;
};

/**
 * The colour an edge and its arrowhead are drawn in.
 *
 * A hex literal rather than a token, for the same reason `NODE_COLORS` are hex
 * and then one more: an SVG marker's colour is part of the `<marker>` id React
 * Flow generates (`getMarkerId` joins the marker's own properties), and that id
 * is referenced as `url(#…)` — so a `var(--text-primary)` in it closes the
 * `url(` on its own first bracket and the arrowhead loses its reference.
 *
 * `ui-context.md` puts the edge at `#f8fafc`; this is `--text-primary`'s value,
 * which `globals.css` already chose for the same job and is indistinguishable
 * from it at this stroke width. Keeping the line and the marker on one constant
 * is what makes an arrowhead the same colour as the line it caps.
 */
export const CANVAS_EDGE_STROKE = "#f0f0f4";

/** Thin, per `ui-context.md`: edges are visually secondary to nodes. */
const CANVAS_EDGE_STROKE_WIDTH = 1.5;

/**
 * The arrowhead's box, in pixels. Larger than React Flow's 12.5 default because
 * the stroke it caps is thinner than the default too — an arrowhead sized for a
 * 1.5px line has to carry the direction almost on its own.
 */
const CANVAS_EDGE_MARKER_SIZE = 16;

/**
 * What a new edge is created with.
 *
 * Graph schema rather than a component constant, and in this module rather than
 * beside the canvas, because of invariant 5 in `architecture-context.md`: a
 * template import and the AI generation write edges too, and an edge that
 * arrives without these draws as React Flow's built-in bezier with no arrow.
 * One declaration means all three routes produce the same edge.
 *
 * React Flow merges this into the connection *before* `onConnect` runs, so
 * `type`, `style`, and `markerEnd` are all written into Liveblocks Storage on
 * the edge record. That is deliberate and is why this waited for the renderer:
 * writing `type: "canvasEdge"` into a document is only safe once something is
 * registered to draw it.
 *
 * The stroke lives here rather than in the `--xy-edge-stroke-default` seam in
 * `globals.css` so that it and `markerEnd.color` cannot drift — the marker has
 * to be a literal (see `CANVAS_EDGE_STROKE`), and a line whose arrowhead is a
 * different white is worse than a hex in the schema. The CSS variable stays as
 * the fallback for any edge that reaches the canvas without a style of its own.
 */
export const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = {
  type: CANVAS_EDGE_TYPE,
  style: {
    stroke: CANVAS_EDGE_STROKE,
    strokeWidth: CANVAS_EDGE_STROKE_WIDTH,
    /* Rounded ends. The far end is capped by the arrowhead, so what this is
       actually for is the start of the path and the outside of every corner
       the right-angle routing turns. */
    strokeLinecap: "round",
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: CANVAS_EDGE_MARKER_SIZE,
    height: CANVAS_EDGE_MARKER_SIZE,
    color: CANVAS_EDGE_STROKE,
  },
};

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>;

export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>;
