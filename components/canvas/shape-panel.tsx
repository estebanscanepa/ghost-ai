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
import type { DragEvent } from "react";

import { writeShapeDragPayload } from "@/lib/canvas-drag";
import type { NodeShape } from "@/types/canvas";

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
 */
export function ShapePanel() {
  const handleDragStart = (shape: NodeShape) => (event: DragEvent) => {
    writeShapeDragPayload(event.dataTransfer, shape);
  };

  return (
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
  );
}
