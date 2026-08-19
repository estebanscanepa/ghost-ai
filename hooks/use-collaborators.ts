"use client";

import { useUser } from "@clerk/nextjs";
import { useOthersMapped } from "@liveblocks/react/suspense";
import { useMemo } from "react";

/**
 * Who else is in the room — the one place the current user is subtracted from
 * the room's presence list.
 *
 * `useOthers` already excludes this connection, so the Clerk filter is not
 * about the current tab: it is about the *same person* in a second tab or a
 * second window, which Liveblocks reports as another user because it is another
 * connection. The identity that decides is the Clerk user ID, which is the ID
 * `POST /api/liveblocks-auth` opened the session with — so `other.id` and
 * `useUser().user.id` are the same value space and can be compared directly.
 *
 * `useOthersMapped` rather than `useOthers`: it compares each mapped entry
 * shallowly, so the avatar group does not re-render every time a collaborator
 * moves their pointer, and the cursor layer re-renders only when a cursor
 * actually moves.
 */

/** One collaborator, as the avatar group needs them. */
export interface Collaborator {
  /** Liveblocks' per-connection key — the React key, since one user may hold two. */
  connectionId: number;
  /** The Clerk user ID, which is what excludes this user's own other sessions. */
  userId: string;
  name: string;
  /** Clerk's avatar URL, or `""` when Clerk itself had nothing. */
  avatar: string;
  /** The presence colour from `getUserColor` — the same one their cursor uses. */
  color: string;
}

/** One collaborator's pointer. Only present while they are over the canvas. */
export interface CollaboratorCursor {
  connectionId: number;
  name: string;
  color: string;
  /** Canvas-space coordinates. Never `null` — a cursor without one is dropped. */
  cursor: { x: number; y: number };
}

/**
 * Until Clerk resolves the session, `user` is `null` and nothing is filtered.
 * That window is safe: the only entries it can let through are this user's
 * *other* connections, and the current one is already excluded by `useOthers`.
 */
function useCurrentUserId(): string | null {
  const { user } = useUser();

  return user?.id ?? null;
}

export function useCollaborators(): Collaborator[] {
  const currentUserId = useCurrentUserId();

  const others = useOthersMapped((other) => ({
    id: other.id,
    info: other.info,
  }));

  return useMemo(
    () =>
      others
        .filter(([, other]) => other.id !== currentUserId)
        .map(([connectionId, other]) => ({
          connectionId,
          userId: other.id,
          name: other.info.name,
          avatar: other.info.avatar,
          color: other.info.color,
        })),
    [currentUserId, others],
  );
}

export function useCollaboratorCursors(): CollaboratorCursor[] {
  const currentUserId = useCurrentUserId();

  const others = useOthersMapped((other) => ({
    id: other.id,
    name: other.info.name,
    color: other.info.color,
    cursor: other.presence.cursor,
  }));

  return useMemo(
    () =>
      others
        .filter(([, other]) => other.id !== currentUserId)
        /* `flatMap` rather than `filter` then `map`, so the `cursor: null` case
           is narrowed away in the same pass that drops it — a collaborator whose
           pointer has left the canvas has no position to draw at. */
        .flatMap(([connectionId, other]) =>
          other.cursor
            ? [
                {
                  connectionId,
                  name: other.name,
                  color: other.color,
                  cursor: other.cursor,
                },
              ]
            : [],
        ),
    [currentUserId, others],
  );
}
