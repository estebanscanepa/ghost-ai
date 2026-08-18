"use client";

import {
  ClientSideSuspense,
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense";
import { ReactFlowProvider } from "@xyflow/react";

import { CanvasErrorBoundary } from "@/components/canvas/canvas-error-boundary";
import { CanvasLoading } from "@/components/canvas/canvas-loading";
import { CollaborativeCanvas } from "@/components/canvas/collaborative-canvas";

interface CanvasRoomProps {
  /** The room to join. It is also the project ID — one identifier for both. */
  roomId: string;
}

/**
 * The client boundary of the workspace: everything below this point is a
 * Liveblocks room, and everything above it — the workspace page, its access
 * check — stays on the server.
 *
 * The providers are mounted here rather than in `EditorShell` so the room is
 * scoped to the route that owns it. A room ID lives in the URL, so navigating
 * between projects should leave the previous room, and mounting the provider in
 * the shared shell would instead keep one provider alive across every project.
 *
 * `authEndpoint` rather than a public key: `POST /api/liveblocks-auth` re-checks
 * project membership against the database and mints a token scoped to this one
 * room, so the browser never holds a credential that opens anything else.
 */
export function CanvasRoom({ roomId }: CanvasRoomProps) {
  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      {/* The boundary wraps `RoomProvider` rather than sitting inside it, which
          is where the Liveblocks docs put it. An error from anywhere below is
          caught either way, but the provider owns the connection — so retrying
          from inside it would remount the canvas against the same failed room,
          while remounting the provider re-runs the auth call and dials again. */}
      <CanvasErrorBoundary>
        <RoomProvider
          id={roomId}
          /* `cursor: null` because a user who has just arrived has not moved a
             pointer over the canvas yet, and a cursor with no position is not
             drawn at all. `isThinking: false` because no generation is in
             flight — see `liveblocks.config.ts` for both. */
          initialPresence={{ cursor: null, isThinking: false }}
        >
          <ClientSideSuspense fallback={<CanvasLoading />}>
            {/* React Flow's own context, needed a level above the canvas so it
                can call `screenToFlowPosition` when a shape is dropped on it.
                Inside the suspense boundary rather than outside: it is the
                canvas that needs it, not the loading state. */}
            <ReactFlowProvider>
              <CollaborativeCanvas />
            </ReactFlowProvider>
          </ClientSideSuspense>
        </RoomProvider>
      </CanvasErrorBoundary>
    </LiveblocksProvider>
  );
}
