"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  useCanRedo,
  useCanUndo,
  useHistory,
  useRedo,
  useUndo,
} from "@liveblocks/react/suspense";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  ConnectionMode,
  ReactFlow,
  useReactFlow,
  type EdgeTypes,
  type IsValidConnection,
  type NodeTypes,
  type XYPosition,
} from "@xyflow/react";
import { useCallback, useRef, type DragEvent } from "react";

import { CanvasControls } from "@/components/canvas/canvas-controls";
import { CanvasEdge } from "@/components/canvas/canvas-edge";
import { CanvasNode } from "@/components/canvas/canvas-node";
import { ShapePanel } from "@/components/canvas/shape-panel";
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal";
import { useStarterTemplates } from "@/components/editor/starter-templates-provider";
import type { CanvasTemplate } from "@/components/editor/starter-templates";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { readShapeDragPayload, SHAPE_DRAG_MIME_TYPE } from "@/lib/canvas-drag";
import { createCanvasNode } from "@/lib/canvas-nodes";
import { CANVAS_VIEWPORT_DURATION } from "@/lib/canvas-viewport";
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_EDGE_OPTIONS,
  NODE_SHAPE_SIZES,
  type CanvasEdge as CanvasEdgeType,
  type CanvasNode as CanvasNodeType,
  type NodeShape,
  type NodeSize,
} from "@/types/canvas";

import "@xyflow/react/dist/style.css";

/**
 * The graph a room starts with: nothing. Hoisted to module scope so the
 * seed is one stable value rather than a new array on every render.
 */
const INITIAL_NODES: CanvasNodeType[] = [];
const INITIAL_EDGES: CanvasEdgeType[] = [];

/**
 * Module scope because React Flow warns — and rebuilds its internal node
 * lookups — when this object changes identity between renders.
 */
const NODE_TYPES: NodeTypes = {
  [CANVAS_NODE_TYPE]: CanvasNode,
};

const EDGE_TYPES: EdgeTypes = {
  [CANVAS_EDGE_TYPE]: CanvasEdge,
};

/**
 * The React Flow surface, backed by Liveblocks Storage.
 *
 * `useLiveblocksFlow` owns the nodes, the edges, and the change handlers — this
 * component holds no graph state of its own, so a change made here and a change
 * made by a collaborator take the same path into Storage and there is no local
 * copy to reconcile. Nothing is persisted to the database or Blob yet; Storage
 * is the whole of it.
 *
 * Suspense is on, so `nodes` and `edges` are always arrays: the `isLoading`
 * branch is handled by the `ClientSideSuspense` fallback in `CanvasRoom`, and a
 * failed connection by the error boundary above it.
 *
 * Requires a `ReactFlowProvider` above it (mounted in `CanvasRoom`), because
 * `screenToFlowPosition` is what turns a drop into canvas coordinates.
 */
export function CollaborativeCanvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, onDelete } =
    useLiveblocksFlow<CanvasNodeType, CanvasEdgeType>({
      suspense: true,
      nodes: { initial: INITIAL_NODES },
      edges: { initial: INITIAL_EDGES },
    });

  const reactFlow = useReactFlow<CanvasNodeType, CanvasEdgeType>();
  const { screenToFlowPosition } = reactFlow;

  /**
   * The canvas wrapper, measured to find the middle of the viewport when a shape
   * is created from the keyboard. A ref rather than React Flow's store `width` /
   * `height`, so the midpoint is in client coordinates and can go through
   * `screenToFlowPosition` — the same conversion the drop path uses.
   */
  const paneRef = useRef<HTMLDivElement>(null);

  /**
   * Undo and redo are the room's, not this component's. Every change to the
   * graph is already a write to Liveblocks Storage through `onNodesChange` /
   * `onEdgesChange`, so the room's history is the only record of what happened
   * — there is no local copy of the graph to keep a second stack for. `canUndo`
   * and `canRedo` are live: a collaborator's change clears this user's redo
   * stack, and the button dims when it does.
   */
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  /**
   * The same room history the two buttons above drive, reached directly so a
   * template import can be grouped into a single entry — see
   * `handleImportTemplate`.
   */
  const history = useHistory();

  /**
   * Opened from the navbar, which is in the editor layout and cannot reach this
   * component; the modal is mounted here because importing is a write to the
   * graph, and the graph lives in this component's `useLiveblocksFlow`.
   */
  const starterTemplates = useStarterTemplates();

  /* The keyboard path to the same three actions the control bar exposes. Bound
     here rather than inside `CanvasControls` because it listens on `window`,
     which is the canvas's business rather than the toolbar's. */
  useKeyboardShortcuts({ reactFlow, onUndo: undo, onRedo: redo });

  /**
   * A drop target has to opt in on every `dragover`, so this fires continuously
   * while a shape is held over the canvas. Only shapes from the panel are
   * accepted — the payload itself is unreadable at this point, but its MIME type
   * is, which is enough to leave a dragged file or a text selection alone.
   */
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes(SHAPE_DRAG_MIME_TYPE)) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  /**
   * The one way a node is added from the panel, whichever affordance asked for
   * it. The node goes out through `onNodesChange` rather than by writing to
   * Storage directly: an `add` change is the controlled-flow way to introduce a
   * node, so a drag-created node, a keyboard-created node, a collaborator's
   * node, and a node the AI writes all reach Storage down the same path.
   */
  const addShapeNode = useCallback(
    (shape: NodeShape, position: XYPosition, size: NodeSize) => {
      onNodesChange([
        { type: "add", item: createCanvasNode({ shape, position, size }) },
      ]);
    },
    [onNodesChange],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const payload = readShapeDragPayload(event.dataTransfer);
      if (!payload) return;

      event.preventDefault();

      const { shape, width, height } = payload;
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addShapeNode(shape, position, { width, height });
    },
    [addShapeNode, screenToFlowPosition],
  );

  /**
   * The keyboard equivalent of a drop, for the panel items — which carry
   * `role="button"` and a tab stop but, until now, no way to be activated.
   *
   * A keystroke has no pointer position, so the drop's `event.clientX/Y` has to
   * be replaced by something. The centre of the pane is the least surprising
   * choice and the one `progress-tracker.md` already named: it is where the user
   * is looking, and it is reachable at any zoom or pan. It goes through the same
   * `screenToFlowPosition` the drop uses rather than arithmetic on the viewport
   * transform, so both routes convert screen space to flow space one way.
   *
   * Half the footprint comes off each axis because React Flow reads `position`
   * as a node's top-left corner — without it the node would be centred on its
   * own corner and sit down and to the right of where it was asked for.
   */
  const handleCreateShape = useCallback(
    (shape: NodeShape) => {
      const pane = paneRef.current;
      if (!pane) return;

      const bounds = pane.getBoundingClientRect();
      const size = NODE_SHAPE_SIZES[shape];
      const centre = screenToFlowPosition({
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });

      addShapeNode(
        shape,
        { x: centre.x - size.width / 2, y: centre.y - size.height / 2 },
        size,
      );
    },
    [addShapeNode, screenToFlowPosition],
  );

  /**
   * A node may not connect to itself. Every handle is a `source` under
   * `ConnectionMode.Loose`, which is what lets a connection be drawn between any
   * two sides — and also what would otherwise let one be dropped back onto the
   * node it started from, where it draws as a degenerate path between two points
   * a few pixels apart and reads as a rendering fault rather than an edge.
   *
   * Canvas level rather than per handle: it is a property of the graph, so the
   * AI generation and a template import are answerable to it too.
   */
  const isValidConnection = useCallback<IsValidConnection<CanvasEdgeType>>(
    (connection) => connection.source !== connection.target,
    [],
  );

  /**
   * Replaces the whole canvas with a starter template.
   *
   * Two things about the route it takes are load-bearing. The clear goes through
   * `onDelete` and not through a `remove` change on `onNodesChange`, because
   * `@liveblocks/react-flow`'s change appliers **ignore `remove` entirely** —
   * `applyNodeChanges` and `applyEdgeChanges` both have `case "remove": break`.
   * `onDelete` is the room's only deletion door, and it is the same one React
   * Flow calls for a `Backspace`. And the template's own nodes and edges arrive as
   * `add` changes, which is the door a dropped shape already uses — so an
   * imported node is written into Storage exactly as a hand-made one is
   * (invariant 5) and there is no second path for Liveblocks to reconcile.
   *
   * The clear comes first and covers *everything* in the room, not just what this
   * template is about to overwrite: a template replaces the current canvas rather
   * than landing on top of it. Edges before nodes, which is the order `onDelete`
   * itself applies — an edge whose endpoints have already gone is an edge nothing
   * can draw.
   *
   * The three writes are wrapped in a paused history so that one press of undo
   * takes the import back whole. Without the pause they are three separate
   * mutations and therefore three history entries, and the first undo would strip
   * the template's edges and leave its nodes — a state the user never asked for.
   * `finally`, because a history left paused would silently swallow every later
   * change to the room.
   */
  const handleImportTemplate = useCallback(
    (template: CanvasTemplate) => {
      history.pause();

      try {
        onDelete({ nodes, edges });
        onNodesChange(
          template.nodes.map((item) => ({ type: "add" as const, item })),
        );
        onEdgesChange(
          template.edges.map((item) => ({ type: "add" as const, item })),
        );
      } finally {
        history.resume();
      }

      /* Not deferred, and it does not need to be: `fitView` sets a queued flag
         rather than reading the bounds now, and the flag is only cleared once a
         `setNodes` or a node measurement reports every node initialized. So the
         fit waits for the template to land and be measured on its own. */
      void reactFlow.fitView({ duration: CANVAS_VIEWPORT_DURATION });
    },
    [edges, history, nodes, onDelete, onEdgesChange, onNodesChange, reactFlow],
  );

  return (
    <div
      ref={paneRef}
      className="h-full w-full bg-base"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow<CanvasNodeType, CanvasEdgeType>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        /* What a new edge is created with — the `canvasEdge` type, the light
           stroke, and the arrowhead. React Flow merges this into the connection
           before `onConnect` sees it, so every one of those is written onto the
           edge record and into Liveblocks Storage rather than being reapplied by
           whatever happens to be rendering. See `DEFAULT_EDGE_OPTIONS`. */
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        /* The line dragged out of a handle takes the same right-angle routing
           the edge it becomes will have, so the connection does not change shape
           the moment it is dropped. */
        connectionLineType={ConnectionLineType.SmoothStep}
        onDelete={onDelete}
        /* Either end of a connection may be either kind of handle. A system
           diagram is drawn by dragging between the two nodes that talk to each
           other, not by hunting for which side owns the source handle. */
        connectionMode={ConnectionMode.Loose}
        fitView
        /* React Flow ships light defaults; `dark` switches its own palette,
           which `globals.css` then re-points at the project tokens. */
        colorMode="dark"
        className="canvas-surface"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <ShapePanel onCreateShape={handleCreateShape} />
        {/* After `ShapePanel` so it layers above it: both are absolutely
            positioned panels with no z-index of their own, so document order is
            what decides which one wins where they meet on a narrow viewport. */}
        <CanvasControls
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </ReactFlow>

      {/* Outside `ReactFlow`, unlike the two panels above: this is a dialog, not
          a canvas overlay, and it portals itself to the document body anyway. */}
      <StarterTemplatesModal
        open={starterTemplates.isOpen}
        onOpenChange={(open) => {
          if (!open) {
            starterTemplates.close();
          }
        }}
        onImport={handleImportTemplate}
      />
    </div>
  );
}
