// Liveblocks types for the collaborative canvas.
// https://liveblocks.io/docs/api-reference/liveblocks-react#Typing-your-data
//
// Everything declared here is global: `useMyPresence`, `useOthers`, `useSelf`,
// and the server-side session token all resolve against this one interface, so
// the shape a room broadcasts and the shape `POST /api/liveblocks-auth` issues
// cannot drift apart.
declare global {
  interface Liveblocks {
    // Each user's Presence, for useMyPresence, useOthers, etc.
    Presence: {
      // Canvas-space cursor coordinates, `null` when the pointer has left the
      // canvas — the cursor is then not rendered at all, rather than parked at
      // the last position it was seen.
      cursor: { x: number; y: number } | null;

      // Whether this user has an AI generation in flight, so collaborators can
      // see the canvas is about to change under them.
      thinking: boolean;
    };

    // The Storage tree for the room, for useMutation, useStorage, etc.
    // `Record<string, never>` rather than `{}` throughout: it means "no members
    // yet" instead of "any non-nullish value", and it is what
    // `@typescript-eslint/no-empty-object-type` accepts.
    Storage: Record<string, never>;

    // Custom user info set when authenticating with a secret key.
    // Written by `app/api/liveblocks-auth/route.ts`.
    UserMeta: {
      // The Clerk user ID.
      id: string;
      info: {
        // Clerk's display name, or the account's email address when Clerk has
        // no name set — never null, so the UI always has something to render.
        name: string;
        // Clerk's avatar URL. Clerk generates one for accounts with no upload,
        // so this is only empty when Clerk itself had nothing.
        avatar: string;
        // The cursor color derived from the user ID. Same user, same color, in
        // every room and every session. See `lib/liveblocks.ts`.
        color: string;
      };
    };

    // Custom events, for useBroadcastEvent, useEventListener
    RoomEvent: Record<string, never>;

    // Custom metadata set on threads, for useThreads, useCreateThread, etc.
    ThreadMetadata: Record<string, never>;

    // Custom room info set with resolveRoomsInfo, for useRoomInfo
    RoomInfo: Record<string, never>;
  }
}

export {};
