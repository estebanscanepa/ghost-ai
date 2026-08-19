import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_EDGE_OPTIONS,
  DEFAULT_NODE_COLOR_ID,
  DEFAULT_NODE_SHAPE,
  NODE_COLORS,
  NODE_HANDLE_IDS,
  NODE_SHAPE_SIZES,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type NodeColorId,
  type NodeHandleId,
  type NodeShape,
} from "@/types/canvas";
import type {
  CanvasDocument,
  StoredCanvasEdge,
  StoredCanvasNode,
} from "@/types/canvas-document";

/**
 * Turning the canvas into a snapshot and back again.
 *
 * One module, and both directions live in it on purpose: the two conversions
 * have to be exact inverses. Autosave decides whether to write by comparing the
 * serialization of the live graph to the serialization of what it last stored,
 * and the editor's restore hands autosave the serialization of the document it
 * just wrote into the room as the baseline to compare against. If the round trip
 * were lossy in either direction those two strings would differ forever, and the
 * canvas would save itself in a loop.
 *
 * `parseCanvasDocument` is also the validator for the `PUT` body, so untrusted
 * input and a blob written by an older build go through the same normalization.
 */

/**
 * A ceiling on how much canvas one request may carry. Not a schema constraint —
 * a boundary guard, in the same spirit as `PROJECT_NAME_MAX_LENGTH`: it keeps a
 * runaway payload from becoming a blob. Generous enough that no diagram anyone
 * draws by hand can reach it.
 */
export const CANVAS_DOCUMENT_MAX_ELEMENTS = 5000;

/**
 * The same ceiling measured in bytes on the wire, and it is not redundant with
 * the count above: a stored node carries an `id` and a `label` of no fixed
 * length, so a document of one node can be arbitrarily large and still be one
 * element. This is the limit that can be enforced *before* the body is buffered,
 * which is the only reason it is expressed in bytes — the element cap has to
 * parse the payload to apply it, and parsing is the cost being avoided.
 *
 * 4 MiB against roughly 400 bytes per element at the count limit: a diagram that
 * reaches this is not one anyone drew by hand.
 */
export const CANVAS_DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;

const NODE_SHAPE_IDS = new Set<string>(NODE_SHAPES);
const NODE_COLOR_IDS = new Set<string>(NODE_COLORS.map((color) => color.id));
const HANDLE_IDS = new Set<string>(NODE_HANDLE_IDS);

function isNodeShape(value: unknown): value is NodeShape {
  return typeof value === "string" && NODE_SHAPE_IDS.has(value);
}

function isNodeColorId(value: unknown): value is NodeColorId {
  return typeof value === "string" && NODE_COLOR_IDS.has(value);
}

function isHandleId(value: unknown): value is NodeHandleId {
  return typeof value === "string" && HANDLE_IDS.has(value);
}

/**
 * `null` rather than a fallback, unlike the others: a handle that is not one of
 * the four sides is not a handle, and `null` is already the documented "no side
 * was recorded" value that React Flow resolves for itself.
 */
function toHandleId(value: unknown): NodeHandleId | null {
  return isHandleId(value) ? value : null;
}

/**
 * Coordinates and dimensions have to survive `JSON.stringify`, and `NaN` and
 * `Infinity` do not — both serialize to `null`. Guarding here rather than only
 * on the way in means a graph that somehow holds one is stored as something a
 * reader can draw.
 */
function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Byte order rather than locale order — see `sortById`. */
function compareIds(a: { id: string }, b: { id: string }): number {
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

/**
 * Nodes and edges are stored in a fixed order so that two clients looking at the
 * same graph produce the same bytes.
 *
 * This is not cosmetic. Liveblocks Storage makes no promise about the order it
 * hands back the room's nodes, and autosave compares serializations — so without
 * a canonical order, a reordering that changed nothing about the diagram would
 * read as a change and trigger a write, and two clients would take turns
 * rewriting each other's identical snapshot. `id` is the sort key because it is
 * the one field every node and edge has, is unique, and never changes.
 *
 * `localeCompare` is deliberately not used: it is locale-sensitive, so the same
 * graph would order differently for two users and the comparison would break in
 * exactly the way the sort exists to prevent.
 */
function sortById<T extends { id: string }>(items: T[]): T[] {
  return [...items].sort(compareIds);
}

/**
 * One node as it is stored. The shape is resolved first because it decides the
 * size fallback: a node that reaches here without dimensions is stored at the
 * size its shape is created at, which is what the renderer would have drawn it
 * as anyway.
 */
function toStoredNode(node: CanvasNode): StoredCanvasNode {
  const shape = isNodeShape(node.data.shape)
    ? node.data.shape
    : DEFAULT_NODE_SHAPE;
  const size = NODE_SHAPE_SIZES[shape];

  return {
    id: node.id,
    shape,
    color: isNodeColorId(node.data.color)
      ? node.data.color
      : DEFAULT_NODE_COLOR_ID,
    label: typeof node.data.label === "string" ? node.data.label : "",
    x: toFiniteNumber(node.position?.x, 0),
    y: toFiniteNumber(node.position?.y, 0),
    width: toFiniteNumber(node.width, size.width),
    height: toFiniteNumber(node.height, size.height),
  };
}

function toStoredEdge(edge: CanvasEdge): StoredCanvasEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: toHandleId(edge.sourceHandle),
    targetHandle: toHandleId(edge.targetHandle),
    label: typeof edge.data?.label === "string" ? edge.data.label : "",
  };
}

/**
 * The live graph as a snapshot. Everything React Flow and Liveblocks add for
 * their own purposes is dropped here — see `types/canvas-document.ts`.
 */
export function toCanvasDocument(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): CanvasDocument {
  return {
    nodes: sortById(nodes.map(toStoredNode)),
    edges: sortById(edges.map(toStoredEdge)),
  };
}

/**
 * The document as the bytes that go into Blob, and as the string autosave
 * compares. One function for both so the comparison can never be made against a
 * different encoding than the one that was stored.
 */
export function serializeCanvasDocument(document: CanvasDocument): string {
  return JSON.stringify(document);
}

/** Nodes and edges together, since the limit is on the canvas rather than on either list. */
export function canvasDocumentSize(document: CanvasDocument): number {
  return document.nodes.length + document.edges.length;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * One node from untrusted input, or `null` when there is nothing addressable
 * there. Only `id` is required — everything else falls back, for the same reason
 * `resolveNodeColor` falls back rather than throwing: a node drawn in the wrong
 * colour is a better outcome than a canvas that will not open. A node with no
 * `id` is different in kind, because nothing can reference or update it.
 */
function parseStoredNode(value: unknown): StoredCanvasNode | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const { id } = value;

  if (typeof id !== "string" || id.length === 0) {
    return null;
  }

  const shape = isNodeShape(value.shape) ? value.shape : DEFAULT_NODE_SHAPE;
  const size = NODE_SHAPE_SIZES[shape];

  return {
    id,
    shape,
    color: isNodeColorId(value.color) ? value.color : DEFAULT_NODE_COLOR_ID,
    label: typeof value.label === "string" ? value.label : "",
    x: toFiniteNumber(value.x, 0),
    y: toFiniteNumber(value.y, 0),
    width: toFiniteNumber(value.width, size.width),
    height: toFiniteNumber(value.height, size.height),
  };
}

/**
 * One edge from untrusted input. `source` and `target` are required alongside
 * `id`: an edge is the connection between two nodes, so an edge missing either
 * end is not an incomplete edge but no edge at all.
 */
function parseStoredEdge(value: unknown): StoredCanvasEdge | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const { id, source, target } = value;

  if (
    typeof id !== "string" ||
    id.length === 0 ||
    typeof source !== "string" ||
    typeof target !== "string"
  ) {
    return null;
  }

  return {
    id,
    source,
    target,
    sourceHandle: toHandleId(value.sourceHandle),
    targetHandle: toHandleId(value.targetHandle),
    label: typeof value.label === "string" ? value.label : "",
  };
}

/** Keeps the first entry for an id and drops the rest, so a document cannot describe one node twice. */
function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

/**
 * A canvas document from untrusted input — the `PUT` body, and the JSON read
 * back out of Blob. `null` when the envelope itself is wrong; a malformed *entry*
 * inside a well-formed envelope is dropped rather than failing the whole
 * document, so one bad node cannot cost a user their diagram.
 *
 * Edges are checked against the nodes that survived: an edge whose endpoints are
 * not in the document is one React Flow cannot draw, and leaving it in would put
 * a permanent difference between what is stored and what the canvas holds — which
 * autosave would read as an unsaved change on every single render.
 */
export function parseCanvasDocument(value: unknown): CanvasDocument | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const { nodes, edges } = value;

  if (!Array.isArray(nodes) || !Array.isArray(edges)) {
    return null;
  }

  const parsedNodes = dedupeById(
    nodes.map(parseStoredNode).filter((node): node is StoredCanvasNode => node !== null),
  );

  const nodeIds = new Set(parsedNodes.map((node) => node.id));

  const parsedEdges = dedupeById(
    edges
      .map(parseStoredEdge)
      .filter((edge): edge is StoredCanvasEdge => edge !== null)
      .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)),
  );

  return { nodes: sortById(parsedNodes), edges: sortById(parsedEdges) };
}

/**
 * The stored nodes as nodes the canvas can draw. `type` is reapplied here rather
 * than stored, so a snapshot never pins the name of a renderer.
 */
export function toCanvasNodes(document: CanvasDocument): CanvasNode[] {
  return document.nodes.map((node) => ({
    id: node.id,
    type: CANVAS_NODE_TYPE,
    position: { x: node.x, y: node.y },
    width: node.width,
    height: node.height,
    data: { label: node.label, color: node.color, shape: node.shape },
  }));
}

/**
 * The stored edges as edges the canvas can draw.
 *
 * The type, the stroke, and the arrowhead come from `DEFAULT_EDGE_OPTIONS`
 * rather than from the document, so a snapshot never pins the look of an edge
 * and a restored diagram is redrawn with whatever the schema says an edge is
 * today. Spread explicitly, exactly as `defineTemplate` does it, because React
 * Flow only merges `defaultEdgeOptions` into edges it creates itself through
 * `onConnect` — an edge that arrives as an `add` change gets no defaults, and
 * would reach the canvas typeless and without an arrowhead.
 *
 * `data` is omitted rather than set to `{ label: "" }` for an unlabelled edge,
 * which is the state a freshly dragged edge is in and the one `EdgeLabel`
 * already handles. `toStoredEdge` reads both as `""`, so the round trip is
 * unaffected either way — this is about the record in Storage looking the same
 * whichever door the edge came through.
 */
export function toCanvasEdges(document: CanvasDocument): CanvasEdge[] {
  return document.edges.map((edge) => ({
    ...DEFAULT_EDGE_OPTIONS,
    /* Restated after the spread: `DefaultEdgeOptions` types `type` as a plain
       `string`, which does not narrow to the literal `CanvasEdge` requires. */
    type: CANVAS_EDGE_TYPE,
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    ...(edge.label.length === 0 ? {} : { data: { label: edge.label } }),
  }));
}
