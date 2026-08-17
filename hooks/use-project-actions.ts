"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import {
  createProject,
  deleteProject,
  renameProject,
  type ProjectMutationResult,
} from "@/lib/project-requests";
import { buildRoomId, createRoomSuffix } from "@/lib/room-id";
import { slugify } from "@/lib/slug";
import type { Project } from "@/types/project";

export type ProjectDialogKind = "create" | "rename" | "delete";

export interface ProjectActionsController {
  /** Which dialog is open, or `null` when none is. */
  kind: ProjectDialogKind | null;
  /** The project a rename or delete acts on. `null` for create. */
  target: Project | null;
  /** Shared name field for create and rename. */
  name: string;
  /** Live preview of the room ID the current name will produce. Also the project ID. */
  roomId: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  /**
   * Why the current name is rejected, or `null` when it is fine. Only set once
   * the user has typed something — an untouched empty field is not an error.
   */
  nameError: string | null;
  /** Why the last submit failed, or `null`. Cleared when a dialog opens or a new submit starts. */
  submitError: string | null;
  openCreate: () => void;
  openRename: (project: Project) => void;
  openDelete: (project: Project) => void;
  setName: (name: string) => void;
  close: () => void;
  submit: () => void;
}

/**
 * Owns every project dialog and the mutation behind it: which dialog is open,
 * the form field, the in-flight flag, and the call to `app/api/projects`.
 *
 * Only one dialog can be open at a time, so a single `kind` plus a single name
 * field is the whole state. Closing intentionally leaves `name` and `target` in
 * place — clearing them would blank the dialog mid close animation — and the
 * next open overwrites both.
 *
 * A successful mutation closes the dialog and then reconciles the server: the
 * project lists are rendered by a Server Component, so `router.refresh()` is
 * what makes the sidebar agree with the database. A failed one keeps the dialog
 * open with `submitError` set, so the user can correct and retry.
 */
export function useProjectActions(): ProjectActionsController {
  const router = useRouter();
  const params = useParams();

  const [kind, setKind] = useState<ProjectDialogKind | null>(null);
  const [target, setTarget] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** The workspace currently open, if the route is one. Deleting it has to redirect rather than refresh. */
  const activeProjectId =
    typeof params.roomId === "string" ? params.roomId : null;

  const roomId = useMemo(() => buildRoomId(name, suffix), [name, suffix]);

  const openCreate = useCallback(() => {
    setTarget(null);
    setName("");
    // Fixed for the life of the dialog: the ID the user is shown has to be the
    // ID that gets created.
    setSuffix(createRoomSuffix());
    setSubmitError(null);
    setKind("create");
  }, []);

  const openRename = useCallback((project: Project) => {
    setTarget(project);
    setName(project.name);
    setSubmitError(null);
    setKind("rename");
  }, []);

  const openDelete = useCallback((project: Project) => {
    setTarget(project);
    setSubmitError(null);
    setKind("delete");
  }, []);

  const close = useCallback(() => {
    setKind(null);
  }, []);

  // A name has to survive slugification, not just be non-empty: "!!!" trims to
  // three characters and slugifies to "", which would leave the project with no
  // room ID. The slug is what the name is validated against.
  const hasUsableName = name.trim().length > 0 && slugify(name).length > 0;

  const nameError =
    kind === "delete" || name.trim().length === 0 || hasUsableName
      ? null
      : "Include at least one letter or number.";

  const canSubmit = !isSubmitting && (kind === "delete" || hasUsableName);

  const submit = useCallback(() => {
    if (!canSubmit || kind === null) {
      return;
    }

    // Snapshot what this submission acts on: the dialog can close before the
    // request settles.
    const submittedName = name.trim();
    const submittedTarget = target;

    let request: Promise<ProjectMutationResult>;

    if (kind === "create") {
      request = createProject({ id: roomId, name: submittedName });
    } else if (!submittedTarget) {
      return;
    } else if (kind === "rename") {
      request = renameProject(submittedTarget.id, submittedName);
    } else {
      request = deleteProject(submittedTarget.id);
    }

    setIsSubmitting(true);
    setSubmitError(null);

    void request.then((result) => {
      setIsSubmitting(false);

      if (!result.ok) {
        setSubmitError(result.message);

        // The client picks the room ID, so a taken one is only retryable with a
        // different suffix. Rolling it here means the preview shows the ID the
        // next attempt will actually use.
        if (kind === "create" && result.code === "conflict") {
          setSuffix(createRoomSuffix());
        }

        return;
      }

      close();

      if (kind === "create") {
        router.push(`/editor/${result.project.id}`);
      } else if (
        kind === "delete" &&
        submittedTarget?.id === activeProjectId
      ) {
        // The open workspace no longer exists — leave it rather than render a
        // dead route.
        router.replace("/editor");
      }

      // The lists come from a Server Component, so this is what makes the
      // sidebar agree with the database again.
      router.refresh();
    });
  }, [activeProjectId, canSubmit, close, kind, name, roomId, router, target]);

  return {
    kind,
    target,
    name,
    roomId,
    isSubmitting,
    canSubmit,
    nameError,
    submitError,
    openCreate,
    openRename,
    openDelete,
    setName,
    close,
    submit,
  };
}
