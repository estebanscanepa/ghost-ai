import {
  NODE_SHAPES,
  NODE_SHAPE_SIZES,
  type NodeShape,
  type NodeSize,
} from "@/types/canvas";

/**
 * The drag-and-drop contract between the shape panel and the canvas.
 *
 * A custom MIME type rather than `text/plain`: the canvas must be able to tell
 * one of its own shapes from a file, a URL, or a selection dragged in from
 * another app, and `dataTransfer.types` is the only thing readable during
 * `dragover` — the data itself is withheld by the browser until the drop. So the
 * type is what decides whether the canvas accepts the drag at all, and the
 * payload is only read once it lands.
 */
export const SHAPE_DRAG_MIME_TYPE = "application/x-ghost-ai-shape";

/**
 * What a dragged shape carries: which shape it is, and how big it should be.
 * The size travels with the drag rather than being looked up on drop so the
 * panel stays the authority on what it offered.
 */
export interface ShapeDragPayload extends NodeSize {
  shape: NodeShape;
}

const SHAPE_SET: ReadonlySet<string> = new Set<string>(NODE_SHAPES);

function isNodeShape(value: unknown): value is NodeShape {
  return typeof value === "string" && SHAPE_SET.has(value);
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Writes a shape onto a drag event, at the size that shape is created with. */
export function writeShapeDragPayload(
  dataTransfer: DataTransfer,
  shape: NodeShape,
): void {
  const { width, height } = NODE_SHAPE_SIZES[shape];
  const payload: ShapeDragPayload = { shape, width, height };

  dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload));
  dataTransfer.effectAllowed = "copy";
}

/**
 * Reads a dropped shape back, or `null` if this drag is not one of ours.
 *
 * A `DataTransfer` is external input — anything on the machine can put a string
 * under any type — so the payload is validated rather than cast, per the
 * boundary rule in `code-standards.md`. A malformed drop is ignored, not
 * repaired: guessing a shape or a size would put a node the user did not ask
 * for into a document their collaborators are watching.
 */
export function readShapeDragPayload(
  dataTransfer: DataTransfer,
): ShapeDragPayload | null {
  const raw = dataTransfer.getData(SHAPE_DRAG_MIME_TYPE);
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null) return null;

  const { shape, width, height } = parsed as Record<string, unknown>;
  if (!isNodeShape(shape)) return null;
  if (!isPositiveNumber(width) || !isPositiveNumber(height)) return null;

  return { shape, width, height };
}
