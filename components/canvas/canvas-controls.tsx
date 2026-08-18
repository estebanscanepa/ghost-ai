"use client";

import { Panel, useReactFlow } from "@xyflow/react";
import { Maximize, Redo2, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback } from "react";

import { CANVAS_VIEWPORT_DURATION } from "@/lib/canvas-viewport";

interface CanvasControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  /** False when the history is at its oldest entry — dims and disables undo. */
  canUndo: boolean;
  /** False when nothing has been undone, or a new change cleared the redo stack. */
  canRedo: boolean;
}

/** The shared button treatment: a round 36px target inside the pill. */
const CONTROL_BUTTON_CLASS =
  "flex size-9 cursor-pointer items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default disabled:text-copy-faint disabled:hover:bg-transparent";

/**
 * The canvas control bar: zoom on the left of the divider, history on the right.
 *
 * A React Flow `Panel` for the same reason the shape panel is one — it floats
 * over the viewport without panning or scaling with the graph, and stays inside
 * the canvas rather than in the editor chrome. It takes the bottom-left corner
 * the minimap used to hold; the minimap was removed rather than moved, because
 * the AI sidebar overlays the only other free corner.
 *
 * Zoom goes through the React Flow instance rather than through a viewport of
 * this component's own: React Flow owns the transform, clamps it to `minZoom` /
 * `maxZoom`, and animates between the two values. History goes through
 * Liveblocks, which is the only place a change to the graph exists — the same
 * `onNodesChange` / `onEdgesChange` writes the rest of the canvas makes are what
 * it is stepping back through, so undo is undoing Storage rather than a local
 * copy of it.
 */
export function CanvasControls({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: CanvasControlsProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleZoomIn = useCallback(() => {
    void zoomIn({ duration: CANVAS_VIEWPORT_DURATION });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    void zoomOut({ duration: CANVAS_VIEWPORT_DURATION });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    void fitView({ duration: CANVAS_VIEWPORT_DURATION });
  }, [fitView]);

  return (
    <Panel
      position="bottom-left"
      /* `rounded-full` and the same surface as `ShapePanel`: the two sit on the
         same edge of the canvas and should read as one family of floating pills.
         See `12-shape-panel.md` for why the radius scale does not apply here. */
      className="flex items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-lg backdrop-blur"
      role="toolbar"
      aria-label="Canvas controls"
    >
      <button
        type="button"
        onClick={handleZoomOut}
        aria-label="Zoom out"
        title="Zoom out"
        className={CONTROL_BUTTON_CLASS}
      >
        <ZoomOut className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={handleFitView}
        aria-label="Fit view"
        title="Fit view"
        className={CONTROL_BUTTON_CLASS}
      >
        <Maximize className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={handleZoomIn}
        aria-label="Zoom in"
        title="Zoom in"
        className={CONTROL_BUTTON_CLASS}
      >
        <ZoomIn className="h-5 w-5" />
      </button>

      {/* The two groups do unrelated things — one moves the camera, the other
          changes the document — so the divider is what stops "zoom out" and
          "undo" reading as five interchangeable buttons. `aria-hidden` because
          the grouping is decoration to a screen reader, which already has the
          toolbar's label and each button's. */}
      <span aria-hidden className="mx-1 h-5 w-px bg-surface-border" />

      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo"
        className={CONTROL_BUTTON_CLASS}
      >
        <Undo2 className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo"
        className={CONTROL_BUTTON_CLASS}
      >
        <Redo2 className="h-5 w-5" />
      </button>
    </Panel>
  );
}
