import type { XYPosition } from "@xyflow/react";

import {
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR_ID,
  type CanvasNode,
  type NodeShape,
  type NodeSize,
} from "@/types/canvas";

/**
 * Creating nodes: the ID rule and the shape a fresh node starts in.
 *
 * Kept out of the components because the canvas is not the only thing that will
 * add nodes — a starter template import and the AI generation write into the
 * same graph, and every node in a room has to be identified the same way.
 */

/**
 * Distinguishes nodes created inside the same millisecond. `Date.now()` alone
 * collides on a fast repeated drop, and a colliding ID does not add a second
 * node — `applyNodeChanges` in `@liveblocks/react-flow` treats an `add` for an
 * existing key as a reconcile, so the earlier node would be silently rewritten.
 */
let creationCounter = 0;

/**
 * Six random bytes as hex — twelve characters, 48 bits. Sized the same way and
 * for the same reason as `ROOM_SUFFIX_BYTES` in `lib/room-id.ts`: at 24 bits two
 * sessions collide with ~50% probability after about 4.8k of them, which is not
 * a number a shared document should be anywhere near. 48 bits moves that point
 * to ~19.7M concurrent sessions.
 *
 * Its own constant rather than a shared one, because the two schemes are
 * independent — retuning what separates two same-named projects should not
 * silently retune what separates two browser tabs.
 */
const SESSION_ID_BYTES = 6;

/**
 * One identifier per client session, minted on first use and reused after that.
 *
 * `crypto.getRandomValues` rather than `crypto.randomUUID`, which would be the
 * shorter call: `randomUUID` is only defined in a **secure context**, so it is
 * `undefined` over plain HTTP — a dev server opened at `http://192.168.x.x:3000`
 * from another device, for instance — and every node creation would throw there.
 * Nothing else in the app requires a secure context today (checked: neither the
 * Liveblocks nor the Clerk browser bundles call `randomUUID`), so reaching for it
 * here would trade a remote collision for a hard failure. This is also the
 * technique `createRoomSuffix` already uses, so the codebase mints random
 * identifiers one way.
 *
 * Lazy rather than module scope so importing this module never runs the CSPRNG —
 * a client component is pre-rendered on the server too, and a session id
 * generated there would be thrown away on hydration.
 */
let sessionId: string | null = null;

function getSessionId(): string {
  if (sessionId === null) {
    const bytes = new Uint8Array(SESSION_ID_BYTES);

    crypto.getRandomValues(bytes);

    sessionId = Array.from(bytes, (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }

  return sessionId;
}

/**
 * `<shape>-<session>-<timestamp>-<counter>`. The shape prefix makes an ID
 * readable while debugging a room's Storage, the session separates one client
 * from every other, the timestamp orders creations, and the counter separates
 * the ones that share a millisecond.
 *
 * The session segment is what makes the ID safe in a shared room, and it is not
 * belt-and-braces. Every node is minted in a browser, so without it two clients
 * collide whenever their timestamps agree to the millisecond *and* their
 * counters agree — which needs only that both tabs have created the same number
 * of nodes since load, the overwhelmingly common case when two people open the
 * same fresh room and each drop their first shape. The consequence is not a
 * duplicate but a silent overwrite, per `applyNodeChanges` above: one person's
 * node quietly replaces the other's in a document they are both watching.
 */
export function createCanvasNodeId(shape: NodeShape): string {
  creationCounter += 1;
  return `${shape}-${getSessionId()}-${Date.now()}-${creationCounter}`;
}

interface CreateCanvasNodeOptions {
  shape: NodeShape;
  /** Canvas coordinates, not screen coordinates. */
  position: XYPosition;
  size: NodeSize;
}

/**
 * A new node: the requested shape at the requested place and size, with an
 * empty label and the default colour. The label is empty rather than a
 * placeholder like `"Rectangle"` because the user is about to type into it, and
 * a default they have to clear first is friction, not a head start.
 */
export function createCanvasNode({
  shape,
  position,
  size,
}: CreateCanvasNodeOptions): CanvasNode {
  return {
    id: createCanvasNodeId(shape),
    type: CANVAS_NODE_TYPE,
    position,
    width: size.width,
    height: size.height,
    data: {
      label: "",
      color: DEFAULT_NODE_COLOR_ID,
      shape,
    },
  };
}
