"use client";

import { Panel } from "@xyflow/react";
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useRef, type DragEvent } from "react";

import { NodeShapeFrame } from "@/components/canvas/node-shape-frame";
import { writeShapeDragPayload } from "@/lib/canvas-drag";
import { NODE_SHAPE_SIZES, type NodeShape } from "@/types/canvas";

interface ShapeOption {
  shape: NodeShape;
  /** The accessible name and the hover title — the shape's own name. */
  label: string;
  icon: LucideIcon;
}

/**
 * The six shapes in `NODE_SHAPES` order, so the panel reads in the same order
 * the schema declares them. Each one names the icon that stands for it; Lucide's
 * `Pill` is the closest stroke outline to a stadium shape.
 */
const SHAPE_OPTIONS: ShapeOption[] = [
  { shape: "rectangle", label: "Rectangle", icon: RectangleHorizontal },
  { shape: "diamond", label: "Diamond", icon: Diamond },
  { shape: "circle", label: "Circle", icon: Circle },
  { shape: "pill", label: "Pill", icon: Pill },
  { shape: "cylinder", label: "Cylinder", icon: Cylinder },
  { shape: "hexagon", label: "Hexagon", icon: Hexagon },
];

/**
 * The shape palette: a floating pill at the bottom-centre of the canvas whose
 * items are dragged onto it to create nodes.
 *
 * Mounted as a React Flow `Panel` rather than positioned by hand, so it floats
 * above the viewport without scrolling or zooming with the graph, and stays
 * inside the canvas rather than in the editor chrome.
 *
 * The items are draggable `div`s rather than `button`s on purpose: WebKit does
 * not start a native drag from a `<button>` even with `draggable`, and this is a
 * macOS-first product. They keep a button's label, focus ring, and tab stop —
 * what they do not have is a keyboard path to creating a node, which is recorded
 * as an open question rather than papered over.
 *
 * Dragging one shows a ghost of the shape itself rather than the browser's
 * snapshot of the icon. That is `setDragImage` over a real, pre-rendered
 * `NodeShapeFrame` at the shape's default size, so the preview is the same
 * component and the same dimensions the drop will produce, and the browser keeps
 * it under the cursor and disposes of it on drop or cancel.
 */
export function ShapePanel() {
  /**
   * The off-screen previews. One ref on the layer plus a `data-shape` lookup
   * rather than six ref callbacks: the callbacks would be new identities on
   * every render, so React would detach and re-attach all six each time.
   */
  const previewLayerRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (shape: NodeShape) => (event: DragEvent) => {
    writeShapeDragPayload(event.dataTransfer, shape);

    const preview = previewLayerRef.current?.querySelector<HTMLElement>(
      `[data-shape="${shape}"]`,
    );
    /* Anchored at the preview's top-left, because that is where the node lands:
       `handleDrop` converts the pointer position and React Flow reads a node's
       `position` as its top-left corner. Centring the ghost would promise a
       placement the drop does not make.

       A browser that declines the custom image falls back to its own snapshot of
       the dragged icon, which is what this replaces — so a failure here costs the
       nicer preview and nothing else. */
    if (preview) event.dataTransfer.setDragImage(preview, 0, 0);
  };

  return (
    <>
      <Panel
        position="bottom-center"
        /* `rounded-full` rather than the `rounded-xl`/`2xl`/`3xl` surface scale:
           `12-shape-panel.md` asks for a pill, which is the shape itself. */
        className="flex items-center gap-1 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-lg backdrop-blur"
        aria-label="Shapes"
      >
        {SHAPE_OPTIONS.map(({ shape, label, icon: Icon }) => (
          <div
            key={shape}
            draggable
            onDragStart={handleDragStart(shape)}
            role="button"
            tabIndex={0}
            aria-label={`Drag to add a ${label.toLowerCase()}`}
            title={label}
            className="flex size-9 cursor-grab items-center justify-center rounded-full text-copy-secondary transition-colors hover:bg-subtle hover:text-copy-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none active:cursor-grabbing"
          >
            <Icon className="h-5 w-5" />
          </div>
        ))}
      </Panel>

      {/* `setDragImage` snapshots a live element, and it does so as the drag
          starts — so the preview has to already be in the document and painted.
          `display: none` and `visibility: hidden` are both ignored by the
          browser, which leaves rendering it off-screen. All six are rendered up
          front rather than one built on demand, for the same reason: an element
          created inside the `dragstart` handler has not been laid out yet.

          `fixed` rather than `absolute` so no ancestor's `overflow` can clip it,
          and outside the `Panel` so its `backdrop-filter` does not become this
          layer's containing block. */}
      <div
        ref={previewLayerRef}
        aria-hidden
        className="pointer-events-none fixed top-0 -left-[9999px]"
      >
        {SHAPE_OPTIONS.map(({ shape }) => (
          <div
            key={shape}
            data-shape={shape}
            /* The size the drop will use, straight from the schema — the same
               record `writeShapeDragPayload` puts in the drag payload. */
            style={NODE_SHAPE_SIZES[shape]}
            /* Translucent, so it reads as a ghost of the node rather than the
               node itself arriving early. */
            className="opacity-70"
          >
            <NodeShapeFrame shape={shape} />
          </div>
        ))}
      </div>
    </>
  );
}
