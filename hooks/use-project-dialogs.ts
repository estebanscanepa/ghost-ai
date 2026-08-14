"use client";

import { useCallback, useMemo, useState } from "react";

import { slugify } from "@/lib/slug";
import type { Project } from "@/types/project";

export type ProjectDialogKind = "create" | "rename" | "delete";

export interface ProjectDialogsController {
  /** Which dialog is open, or `null` when none is. */
  kind: ProjectDialogKind | null;
  /** The project a rename or delete acts on. `null` for create. */
  target: Project | null;
  /** Shared name field for create and rename. */
  name: string;
  /** Live slug preview derived from `name`. */
  slug: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  /**
   * Why the current name is rejected, or `null` when it is fine. Only set once
   * the user has typed something — an untouched empty field is not an error.
   */
  nameError: string | null;
  openCreate: () => void;
  openRename: (project: Project) => void;
  openDelete: (project: Project) => void;
  setName: (name: string) => void;
  close: () => void;
  submit: () => void;
}

/**
 * Owns every project dialog: which one is open, the form field behind it, and
 * the submitting flag its actions are disabled by.
 *
 * Only one dialog can be open at a time, so a single `kind` plus a single name
 * field is the whole state. Closing intentionally leaves `name` and `target`
 * in place — clearing them would blank the dialog mid close animation — and the
 * next open overwrites both.
 *
 * There is no persistence yet: `submit` marks the in-flight state and closes.
 * The mutation call lands inside it once the API exists.
 */
export function useProjectDialogs(): ProjectDialogsController {
  const [kind, setKind] = useState<ProjectDialogKind | null>(null);
  const [target, setTarget] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const slug = useMemo(() => slugify(name), [name]);

  const openCreate = useCallback(() => {
    setTarget(null);
    setName("");
    setKind("create");
  }, []);

  const openRename = useCallback((project: Project) => {
    setTarget(project);
    setName(project.name);
    setKind("rename");
  }, []);

  const openDelete = useCallback((project: Project) => {
    setTarget(project);
    setKind("delete");
  }, []);

  const close = useCallback(() => {
    setKind(null);
  }, []);

  // A name has to survive slugification, not just be non-empty: "!!!" trims to
  // three characters and slugifies to "", which would create a project with no
  // slug. The slug is what the name is validated against.
  const hasUsableName = name.trim().length > 0 && slug.length > 0;

  const nameError =
    kind === "delete" || name.trim().length === 0 || slug.length > 0
      ? null
      : "Include at least one letter or number.";

  const canSubmit = !isSubmitting && (kind === "delete" || hasUsableName);

  const submit = useCallback(() => {
    if (!canSubmit) {
      return;
    }

    setIsSubmitting(true);
    // Nothing to await until the API layer exists — see the doc comment above.
    setIsSubmitting(false);
    close();
  }, [canSubmit, close]);

  return {
    kind,
    target,
    name,
    slug,
    isSubmitting,
    canSubmit,
    nameError,
    openCreate,
    openRename,
    openDelete,
    setName,
    close,
    submit,
  };
}
