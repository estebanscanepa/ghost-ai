"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchCollaborators,
  inviteCollaborator,
  removeCollaborator,
} from "@/lib/collaborator-requests";
import {
  isCollaboratorEmail,
  normalizeCollaboratorEmail,
} from "@/lib/collaborator-email";
import type { CollaboratorResponse } from "@/types/collaborator";
import type { Project } from "@/types/project";

/** How long `Copied!` stays up after the link is copied. */
const COPY_FEEDBACK_MS = 2000;

const COPY_FAILED_MESSAGE = "Could not copy the link. Copy it from the address bar.";

export interface ShareDialogController {
  isOpen: boolean;
  /** Empty until the list has loaded — it is fetched each time the dialog opens. */
  collaborators: CollaboratorResponse[];
  isLoading: boolean;
  /** Why the list could not be read, or `null`. */
  loadError: string | null;
  /** The invite field. Owner only; a collaborator never sees the form. */
  email: string;
  canInvite: boolean;
  isInviting: boolean;
  inviteError: string | null;
  /** The collaborator whose removal is in flight, or `null`. */
  removingId: string | null;
  removeError: string | null;
  isLinkCopied: boolean;
  copyError: string | null;
  open: () => void;
  close: () => void;
  setEmail: (email: string) => void;
  invite: () => void;
  remove: (collaboratorId: string) => void;
  copyLink: () => void;
}

/**
 * Owns the share dialog: whether it is open, the collaborator list, the invite
 * field, and the three requests behind them.
 *
 * The list is fetched when the dialog opens rather than rendered by the server,
 * because it is dialog-local data that only matters once someone asks for it —
 * the initial page load still fetches nothing on the client. The fetch hangs off
 * `open()` rather than an effect: opening is a user event, not state that needs
 * synchronizing to an external system.
 *
 * Mutations patch the local list instead of calling `router.refresh()`: nothing
 * the server rendered for *this* user changes when they invite someone. The
 * invitee's own `Shared` tab is server-rendered on their next request.
 */
export function useShareDialog(project: Project | null): ShareDialogController {
  const projectId = project?.id ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<CollaboratorResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Identifies the dialog session that in-flight requests belong to. `open()`
   * and `close()` both bump it, so any response arriving after the dialog was
   * closed, reopened, or pointed at another project is discarded rather than
   * written into a session it does not belong to. Every request that writes back
   * into this state checks it — the load, the invite, and the removal alike.
   */
  const sessionId = useRef(0);

  useEffect(
    () => () => {
      if (copyTimer.current) {
        clearTimeout(copyTimer.current);
      }
    },
    [],
  );

  /**
   * Nothing here may outlive the project it belongs to. The hook is called in
   * `EditorShell`, which stays mounted across `/editor` navigations, and the
   * dialog only unmounts when there is no active project at all — so without
   * this, a dialog opened for one room would come back over the next one: still
   * `isOpen`, titled with the new project's name, and listing the previous
   * project's collaborators, because `open()` is the only path that loads data.
   *
   * This is the reset-on-prop-change pattern rather than an effect, for two
   * reasons. It runs during the render that first sees the new project, so there
   * is no painted frame in which the dialog and its contents disagree — an
   * effect fires after that frame, which is the bug, briefly. And calling
   * `setState` in an effect body is an error under
   * `react-hooks/set-state-in-effect`, so an effect could not be written here at
   * all.
   *
   * `sessionId` is deliberately not bumped here, because it is a ref and this
   * runs during render. It does not need to be: a request still in flight for
   * the old project resolves into a closed dialog that renders none of it, and
   * the next `open()` bumps the session before refetching, which discards it.
   */
  const [trackedProjectId, setTrackedProjectId] = useState(projectId);

  if (trackedProjectId !== projectId) {
    setTrackedProjectId(projectId);
    setIsOpen(false);
    setIsLoading(false);
    setCollaborators([]);
    setLoadError(null);
    setEmail("");
    setIsInviting(false);
    setInviteError(null);
    setRemovingId(null);
    setRemoveError(null);
    setIsLinkCopied(false);
    setCopyError(null);
  }

  const open = useCallback(() => {
    if (!projectId) {
      return;
    }

    // Every field resets, including the list: the dialog can be reopened
    // against a different project, and showing the previous one's collaborators
    // while the fetch is in flight would be worse than showing none. The two
    // in-flight flags reset too, because a request discarded as stale never
    // reaches the callback that would have cleared them.
    setCollaborators([]);
    setEmail("");
    setLoadError(null);
    setIsInviting(false);
    setInviteError(null);
    setRemovingId(null);
    setRemoveError(null);
    setIsLinkCopied(false);
    setCopyError(null);
    setIsLoading(true);
    setIsOpen(true);

    const requested = ++sessionId.current;

    void fetchCollaborators(projectId).then((result) => {
      if (requested !== sessionId.current) {
        return;
      }

      setIsLoading(false);

      if (result.ok) {
        setCollaborators(result.collaborators);
      } else {
        setLoadError(result.message);
      }
    });
  }, [projectId]);

  const close = useCallback(() => {
    sessionId.current += 1;
    setIsLoading(false);
    setIsOpen(false);
  }, []);

  // Validated against the same rule the API applies, so the obvious mistakes
  // are caught before a round trip. The server still re-validates — this is a
  // UX guard, not the authority.
  const canInvite =
    !isInviting && isCollaboratorEmail(normalizeCollaboratorEmail(email));

  const invite = useCallback(() => {
    if (!projectId || !canInvite) {
      return;
    }

    const submitted = normalizeCollaboratorEmail(email);
    const requested = sessionId.current;

    setIsInviting(true);
    setInviteError(null);

    void inviteCollaborator(projectId, submitted).then((result) => {
      // The append below writes into whichever list is current, so without this
      // an invite still in flight when the room changes would land the new
      // collaborator in the *next* project's list. The invite itself already
      // succeeded against the right project server-side; only this local echo of
      // it is dropped.
      if (requested !== sessionId.current) {
        return;
      }

      setIsInviting(false);

      if (!result.ok) {
        setInviteError(result.message);
        return;
      }

      // Appended rather than refetched: the API orders collaborators oldest
      // first, so the newest belongs at the end.
      setCollaborators((current) => [...current, result.collaborator]);
      setEmail("");
    });
  }, [canInvite, email, projectId]);

  const remove = useCallback(
    (collaboratorId: string) => {
      if (!projectId || removingId !== null) {
        return;
      }

      const requested = sessionId.current;

      setRemovingId(collaboratorId);
      setRemoveError(null);

      void removeCollaborator(projectId, collaboratorId).then((result) => {
        // Same reasoning as `invite`: the removal stands server-side, but its
        // error message and its edit to the list belong to the session that
        // asked for it.
        if (requested !== sessionId.current) {
          return;
        }

        setRemovingId(null);

        if (!result.ok) {
          setRemoveError(result.message);
          return;
        }

        setCollaborators((current) =>
          current.filter((collaborator) => collaborator.id !== collaboratorId),
        );
      });
    },
    [projectId, removingId],
  );

  const copyLink = useCallback(() => {
    if (!projectId) {
      return;
    }

    setCopyError(null);

    const url = `${window.location.origin}/editor/${projectId}`;

    void navigator.clipboard.writeText(url).then(
      () => {
        setIsLinkCopied(true);

        if (copyTimer.current) {
          clearTimeout(copyTimer.current);
        }

        copyTimer.current = setTimeout(
          () => setIsLinkCopied(false),
          COPY_FEEDBACK_MS,
        );
      },
      () => {
        // The Clipboard API rejects without a user gesture, over plain HTTP, or
        // when permission is denied. Saying so beats a button that appears to do
        // nothing.
        setCopyError(COPY_FAILED_MESSAGE);
      },
    );
  }, [projectId]);

  return {
    isOpen,
    collaborators,
    isLoading,
    loadError,
    email,
    canInvite,
    isInviting,
    inviteError,
    removingId,
    removeError,
    isLinkCopied,
    copyError,
    open,
    close,
    setEmail,
    invite,
    remove,
    copyLink,
  };
}
