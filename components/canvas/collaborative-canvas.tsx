"use client";

import { useLiveblocksFlow } from "@liveblocks/react-flow";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import { useCallback, type DragEvent } from "react";

import { CanvasNode } from "@/components/canvas/canvas-node";
import { ShapePanel } from "@/components/canvas/shape-panel";
import {
  readShapeDragPayload,
  SHAPE_DRAG_MIME_TYPE,
} from "@/lib/canvas-drag";
import { createCanvasNode } from "@/lib/canvas-nodes";
import {
  CANVAS_NODE_TYPE,
  type CanvasEdge,
  type CanvasNode as CanvasNodeType,
} from "@/types/canvas";

import "@xyflow/react/dist/style.css";

/**
 * The graph a room starts with: nothing. Hoisted to module scope so the
 * seed is one stable value rather than a new array on every render.
 */
const INITIAL_NODES: CanvasNodeType[] = [];
const INITIAL_EDGES: CanvasEdge[] = [];

/**
 * Module scope because React Flow warns — and rebuilds its internal node
 * lookups — when this object changes identity between renders.
 */
const NODE_TYPES: NodeTypes = {
  [CANVAS_NODE_TYPE]: CanvasNode,
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
    useLiveblocksFlow<CanvasNodeType, CanvasEdge>({
      suspense: true,
      nodes: { initial: INITIAL_NODES },
      edges: { initial: INITIAL_EDGES },
    });

  const { screenToFlowPosition } = useReactFlow<CanvasNodeType, CanvasEdge>();

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
   * The node is created through `onNodesChange` rather than by writing to
   * Storage directly: an `add` change is the controlled-flow way to introduce a
   * node, so a drag-created node, a collaborator's node, and a node the AI
   * writes all reach Storage down the same path.
   */
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

      onNodesChange([
        {
          type: "add",
          item: createCanvasNode({ shape, position, size: { width, height } }),
        },
      ]);
    },
    [onNodesChange, screenToFlowPosition],
  );

  return (
    <div
      className="h-full w-full bg-base"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow<CanvasNodeType, CanvasEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
        {/* Bottom-left: the AI sidebar is open by default and overlays the
            opposite corner, which is where React Flow would otherwise put it. */}
        <MiniMap position="bottom-left" />
        <ShapePanel />
      </ReactFlow>
    </div>
  );
}
