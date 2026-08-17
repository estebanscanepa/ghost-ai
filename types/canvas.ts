import type { Edge, Node } from "@xyflow/react";

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

export const DEFAULT_NODE_COLOR_ID: NodeColorId = "neutral";

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
 * Edges carry no data of their own yet. `Record<string, never>` means "no
 * members yet" rather than "any object", matching the convention the unused
 * slots in `liveblocks.config.ts` follow.
 */
export type CanvasEdgeData = Record<string, never>;

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>;

export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>;
