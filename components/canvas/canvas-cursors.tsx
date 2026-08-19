"use client";

import { useStore } from "@xyflow/react";

import { useCollaboratorCursors } from "@/hooks/use-collaborators";

/**
 * The pointer glyph, filled in the collaborator's presence colour and outlined
 * in the darkest surface so it stays visible when it crosses a node painted in
 * a similar hue. `aria-hidden` because a remote pointer is not content — the
 * name badge beside it is the only part worth reading, and a screen reader user
 * cannot follow a moving cursor anyway.
 */
function CursorPointer({ color }: { color: string }) {
  return (
    <svg
      aria-hidden
      width="20"
      height="30"
      viewBox="0 0 24 36"
      fill="none"
      className="block"
    >
      <path
        d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
        fill={color}
        stroke="var(--bg-base)"
      />
    </svg>
  );
}

/**
 * Every other participant's pointer, drawn over the canvas.
 *
 * Positions travel through Liveblocks presence in *canvas* coordinates — that
 * is what `CollaborativeCanvas` writes with `screenToFlowPosition` — so they
 * survive the fact that two people are looking at the room through different
 * pans and zooms. This layer converts back on the way out, by hand, from the
 * viewport transform React Flow keeps in its store: `x * zoom + translate`. The
 * alternative is to render inside the transformed viewport, which would scale
 * the pointer and the badge with the graph and make a cursor unreadable at low
 * zoom; a cursor should be the same size whatever the canvas is doing.
 *
 * `useStore` works here even though this sits outside `<ReactFlow>`, because
 * `ReactFlowProvider` is mounted a level above in `CanvasRoom`.
 *
 * The current user is never here: `useCollaboratorCursors` subtracts them, and
 * this component never reads its own presence.
 */
export function CanvasCursors() {
  const cursors = useCollaboratorCursors();

  /* One subscription to the transform tuple rather than three, and it is a
     stable reference in the store until the viewport actually moves. */
  const [translateX, translateY, zoom] = useStore((state) => state.transform);

  return (
    /* `pointer-events-none` throughout: a remote pointer must not take a click,
       a hover, or a drag away from the canvas underneath it. */
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
    >
      {cursors.map(({ connectionId, name, color, cursor }) => (
        <div
          key={connectionId}
          /* 100ms linear, matching the rate Liveblocks throttles presence
             updates at, so the pointer glides between the positions that
             actually arrive instead of stepping between them. */
          className="absolute top-0 left-0 transition-transform duration-100 ease-linear"
          style={{
            transform: `translate3d(${cursor.x * zoom + translateX}px, ${
              cursor.y * zoom + translateY
            }px, 0)`,
          }}
        >
          <CursorPointer color={color} />

          {/* Attached to the pointer rather than centred on it: offset down and
              right so it hangs off the glyph's tail and never covers the tip,
              which is the part that says where the person is pointing. */}
          <span
            className="absolute top-5 left-4 max-w-40 truncate rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
            style={{ backgroundColor: color, color: "var(--bg-base)" }}
          >
            {name}
          </span>
        </div>
      ))}
    </div>
  );
}
