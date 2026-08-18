import type { XYPosition } from "@xyflow/react";

import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_EDGE_OPTIONS,
  NODE_SHAPE_SIZES,
  type CanvasEdge,
  type CanvasNode,
  type NodeColorId,
  type NodeHandleId,
  type NodeShape,
} from "@/types/canvas";

/**
 * The starter template library: pre-built diagrams a user can open a canvas
 * onto instead of starting from an empty room.
 *
 * Static data in the codebase, resolved by id at import time and with no
 * database record of its own — per `architecture-context.md`'s "Starter System
 * Designs". Nothing here is fetched, and nothing here is saved: importing a
 * template writes its nodes and edges into the room's Liveblocks Storage
 * through the same node and edge flow a hand-drawn diagram goes through, which
 * is invariant 5 — user-created content and an imported template are the same
 * shape, so they are built out of the same schema module rather than out of a
 * parallel one.
 */

export interface CanvasTemplate {
  /** Stable identifier, also the namespace every node and edge id is built on. */
  id: string;
  name: string;
  description: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/**
 * A node as it is written below: what it is and where it goes. Its size is not
 * here because a template does not get to choose one — `NODE_SHAPE_SIZES` is the
 * size a shape is created at, and a template node has to land at the same
 * dimensions a dragged one does.
 */
interface TemplateNodeInput {
  /** Unique within the template. `defineTemplate` namespaces it. */
  id: string;
  label: string;
  shape: NodeShape;
  color: NodeColorId;
  /** Top-left corner in flow units, which is what React Flow reads. */
  position: XYPosition;
}

/**
 * An edge as it is written below, by the two local node ids it joins.
 *
 * The sides are part of the data rather than left to React Flow, because they
 * decide the routing: with no handle recorded, `getEdgePosition` falls back to
 * the first handle it finds — the top one for every node — and a left-to-right
 * diagram comes out as a stack of edges looping over their own nodes. They
 * default to `right` → `left` because all three templates below read left to
 * right, so only the edges that break that pattern have to say so.
 */
interface TemplateEdgeInput {
  from: string;
  to: string;
  /** Drawn as a pill on the path. Omitted for edges that need no explanation. */
  label?: string;
  fromSide?: NodeHandleId;
  toSide?: NodeHandleId;
}

interface TemplateInput {
  id: string;
  name: string;
  description: string;
  nodes: TemplateNodeInput[];
  edges: TemplateEdgeInput[];
}

/**
 * Turns the readable form above into real `CanvasNode`s and `CanvasEdge`s.
 *
 * It exists for two reasons beyond brevity. It namespaces every id with the
 * template's own, so two templates can both call a node `gateway` without
 * colliding in a room — and it derives an edge's endpoints from the same
 * namespaced ids, so an edge can never point at a node that is not there.
 * And it is the single place the schema defaults are applied: the shape's
 * size, `CANVAS_NODE_TYPE`, and `DEFAULT_EDGE_OPTIONS` — the stroke, the
 * arrowhead, and the smooth-step type that make a template edge indistinguishable
 * from a dragged one.
 */
function defineTemplate({
  id,
  name,
  description,
  nodes,
  edges,
}: TemplateInput): CanvasTemplate {
  const scopedId = (localId: string) => `${id}-${localId}`;

  return {
    id,
    name,
    description,
    nodes: nodes.map((node) => ({
      id: scopedId(node.id),
      type: CANVAS_NODE_TYPE,
      position: node.position,
      /* Explicit `width` / `height` on the record, exactly as `createCanvasNode`
         writes them: React Flow resolves the wrapper's inline size from these,
         so the shape frame fills a box of the right proportions. */
      ...NODE_SHAPE_SIZES[node.shape],
      data: {
        label: node.label,
        color: node.color,
        shape: node.shape,
      },
    })),
    edges: edges.map(
      ({ from, to, label, fromSide = "right", toSide = "left" }) => ({
        ...DEFAULT_EDGE_OPTIONS,
        /* Restated after the spread, and not redundant: `DefaultEdgeOptions`
           types `type` as a plain `string`, which does not narrow to the literal
           `CanvasEdge` requires. */
        type: CANVAS_EDGE_TYPE,
        id: `${id}-${from}-${to}`,
        source: scopedId(from),
        target: scopedId(to),
        sourceHandle: fromSide,
        targetHandle: toSide,
        /* Omitted rather than set to `undefined` when there is no label: `data`
           is serialized into Liveblocks Storage, which holds JSON, and an
           unlabelled edge is one with no `data` at all — the state a
           freshly dragged edge is in, and the one `EdgeLabel` already handles. */
        ...(label === undefined ? {} : { data: { label } }),
      }),
    ),
  };
}

/**
 * The library, in the order the modal lists it. Three system designs that are
 * each a different *shape* of diagram rather than three variations on one:
 * a fan-out through a gateway, a linear pipeline that branches at a gate, and a
 * publish/subscribe hub. Positions are hand-placed on a left-to-right grid, with
 * the rows of each column centred against each other so the edges come out level.
 */
export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  defineTemplate({
    id: "microservices",
    name: "Microservices platform",
    description:
      "A client behind an API gateway that fans out to independent services, each owning its own database.",
    nodes: [
      {
        id: "client",
        label: "Web client",
        shape: "circle",
        color: "blue",
        position: { x: 0, y: 180 },
      },
      {
        id: "gateway",
        label: "API gateway",
        shape: "hexagon",
        color: "purple",
        position: { x: 200, y: 195 },
      },
      {
        id: "auth",
        label: "Auth service",
        shape: "pill",
        color: "orange",
        position: { x: 480, y: 48 },
      },
      {
        id: "orders",
        label: "Orders service",
        shape: "pill",
        color: "green",
        position: { x: 480, y: 208 },
      },
      {
        id: "payments",
        label: "Payments service",
        shape: "pill",
        color: "teal",
        position: { x: 480, y: 368 },
      },
      {
        id: "orders-db",
        label: "Orders DB",
        shape: "cylinder",
        color: "neutral",
        position: { x: 780, y: 190 },
      },
      {
        id: "payments-db",
        label: "Payments DB",
        shape: "cylinder",
        color: "neutral",
        position: { x: 780, y: 350 },
      },
    ],
    edges: [
      { from: "client", to: "gateway", label: "HTTPS" },
      { from: "gateway", to: "auth", label: "verify token" },
      { from: "gateway", to: "orders" },
      { from: "gateway", to: "payments" },
      { from: "orders", to: "orders-db", label: "read / write" },
      { from: "payments", to: "payments-db", label: "read / write" },
      {
        from: "orders",
        to: "payments",
        label: "charge",
        fromSide: "bottom",
        toSide: "top",
      },
    ],
  }),

  defineTemplate({
    id: "ci-cd-pipeline",
    name: "CI/CD pipeline",
    description:
      "A commit driven through build and test into a quality gate that either promotes the release or rolls it back.",
    nodes: [
      {
        id: "commit",
        label: "Commit",
        shape: "circle",
        color: "blue",
        position: { x: 0, y: 140 },
      },
      {
        id: "build",
        label: "Build image",
        shape: "pill",
        color: "purple",
        position: { x: 200, y: 168 },
      },
      {
        id: "test",
        label: "Test suite",
        shape: "pill",
        color: "teal",
        position: { x: 460, y: 168 },
      },
      {
        id: "gate",
        label: "Quality gate",
        shape: "diamond",
        color: "orange",
        position: { x: 720, y: 130 },
      },
      {
        id: "staging",
        label: "Deploy staging",
        shape: "pill",
        color: "green",
        position: { x: 1010, y: 48 },
      },
      {
        id: "rollback",
        label: "Roll back",
        shape: "pill",
        color: "red",
        position: { x: 1010, y: 288 },
      },
      {
        id: "production",
        label: "Production",
        shape: "hexagon",
        color: "green",
        position: { x: 1290, y: 35 },
      },
      {
        id: "artifacts",
        label: "Artifact registry",
        shape: "cylinder",
        color: "neutral",
        position: { x: 210, y: 380 },
      },
    ],
    edges: [
      { from: "commit", to: "build", label: "push" },
      { from: "build", to: "test" },
      { from: "test", to: "gate" },
      { from: "gate", to: "staging", label: "pass" },
      { from: "gate", to: "rollback", label: "fail" },
      { from: "staging", to: "production", label: "approve" },
      {
        from: "build",
        to: "artifacts",
        label: "publish",
        fromSide: "bottom",
        toSide: "top",
      },
    ],
  }),

  defineTemplate({
    id: "event-driven",
    name: "Event-driven system",
    description:
      "A service emitting domain events onto a bus that independent workers subscribe to, with an append-only event store.",
    nodes: [
      {
        id: "checkout",
        label: "Checkout service",
        shape: "pill",
        color: "blue",
        position: { x: 0, y: 208 },
      },
      {
        id: "order-placed",
        label: "Order placed",
        shape: "circle",
        color: "orange",
        position: { x: 280, y: 180 },
      },
      {
        id: "bus",
        label: "Event bus",
        shape: "hexagon",
        color: "purple",
        position: { x: 500, y: 195 },
      },
      {
        id: "inventory",
        label: "Inventory worker",
        shape: "pill",
        color: "green",
        position: { x: 790, y: 88 },
      },
      {
        id: "email",
        label: "Email worker",
        shape: "pill",
        color: "teal",
        position: { x: 790, y: 208 },
      },
      {
        id: "analytics",
        label: "Analytics worker",
        shape: "pill",
        color: "pink",
        position: { x: 790, y: 328 },
      },
      {
        id: "event-store",
        label: "Event store",
        shape: "cylinder",
        color: "neutral",
        position: { x: 510, y: 420 },
      },
      {
        id: "dead-letter",
        label: "Dead letter queue",
        shape: "cylinder",
        color: "red",
        position: { x: 1080, y: 178 },
      },
    ],
    edges: [
      { from: "checkout", to: "order-placed", label: "emit" },
      { from: "order-placed", to: "bus", label: "publish" },
      { from: "bus", to: "inventory", label: "subscribe" },
      { from: "bus", to: "email" },
      { from: "bus", to: "analytics" },
      {
        from: "bus",
        to: "event-store",
        label: "append",
        fromSide: "bottom",
        toSide: "top",
      },
      { from: "email", to: "dead-letter", label: "retries exhausted" },
    ],
  }),
];
