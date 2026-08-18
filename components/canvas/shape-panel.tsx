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
import { useRef, type DragEvent, type KeyboardEvent } from "react";

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
 * macOS-first product. They keep everything else a button has — an accessible
 * name, a focus ring, a tab stop, and activation by `Enter` or `Space`, which
 * `role="button"` promises and which a `div` has to implement itself.
 *
 * Dragging one shows a ghost of the shape itself rather than the browser's
 * snapshot of the icon. That is `setDragImage` over a real, pre-rendered
 * `NodeShapeFrame` at the shape's default size, so the preview is the same
 * component and the same dimensions the drop will produce, and the browser keeps
 * it under the cursor and disposes of it on drop or cancel.
 */
interface ShapePanelProps {
  /**
   * Adds a node of this shape to the canvas. The panel does not create nodes
   * itself: the graph belongs to `CollaborativeCanvas`, which owns the one path
   * a node reaches Liveblocks Storage by, and this is the keyboard half of the
   * same affordance the drag half already goes through.
   */
  onCreateShape: (shape: NodeShape) => void;
}

export function ShapePanel({ onCreateShape }: ShapePanelProps) {
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

  /**
   * What `role="button"` on a `div` obliges us to write by hand. A native button
   * activates on `Enter` and on `Space`, and a screen reader announces these
   * items as buttons either way — so without this they are a promise the panel
   * does not keep, and a keyboard or touch user cannot create a node at all.
   *
   * `preventDefault` is what stops `Space` from scrolling the editor instead of
   * adding a shape. Repeats are ignored because a native button does not fire
   * while `Space` is held, and here that difference is not cosmetic: every node
   * is a write to a shared document, so a held key would spray nodes into the
   * room for every collaborator to watch.
   *
   * Nothing here touches the drag path — `dragstart` is a separate event, and an
   * item stays draggable exactly as before.
   */
  const handleKeyDown =
    (shape: NodeShape) => (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.repeat) return;

      event.preventDefault();
      onCreateShape(shape);
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
            onKeyDown={handleKeyDown(shape)}
            role="button"
            tabIndex={0}
            /* Not "drag to add" any more: the item is reachable by keyboard, and
               naming only the affordance a keyboard user cannot use is worse than
               naming neither. */
            aria-label={`Add a ${label.toLowerCase()}`}
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
