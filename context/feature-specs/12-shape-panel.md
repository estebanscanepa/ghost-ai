Add a bottom shape panel so users can drag shapes onto the canvas and create new nodes.

## Implementation

1. Add a floating pill-shaped toolbar at the bottom-center of the canvas.

2. Add draggable icon buttons for these shapes:
   - rectangle
   - diamond
   - circle
   - pill
   - cylinder
   - hexagon

3. When dragging a shape, include the shape name and default size in the drag payload.

   Use sensible default sizes:
   - rectangles should be wider than tall
   - circles should be square
   - diamonds should be slightly larger so labels have room

4. Add `dragover` and `drop` handling to the canvas wrapper.

5. On drop:
   - read the dragged shape payload
   - convert the screen position to canvas coordinates using React Flow
   - create a new node **centred on** that position

   The node is centred rather than placed corner-first: this unit's original
   requirement said "at that position", and React Flow reads a node's
   `position` as its top-left corner, so a node created literally at the
   converted point lands half its footprint down and to the right of the
   cursor. Half the width and height come off each axis — in flow units, since
   `screenToFlowPosition` has already undone the zoom. `addShapeNode` in
   `CollaborativeCanvas` owns that offset so the drag route and the keyboard
   route cannot disagree about it, and `ShapePanel` anchors its drag ghost at
   the preview's centre to match.
   - use an empty label
   - use the default node color
   - use the dragged shape value

6. Generate each node ID using the shape name, a per-client-session
   identifier, timestamp, and a counter.

   The session identifier was not in this unit's original requirement and was
   added later: shape + timestamp + counter alone collides between two clients
   whose timestamps and counters agree, and a colliding ID silently overwrites
   the earlier node rather than adding one. See `lib/canvas-nodes.ts`.

7. Add a basic renderer for the custom canvas node type so new nodes are visible.

   For this unit, render every shape as a simple bordered rectangle with the label centered. Shape-specific visuals will be added later.

## Check When Done

- Shape drag payload includes the correct shape and size data.
- Drop logic creates new canvas nodes with the expected shape data.
- New nodes use the custom canvas node type.
- `npm run build` passes without type errors.
