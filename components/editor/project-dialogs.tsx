"use client";

import { createContext, useContext } from "react";

import { CreateProjectDialog } from "@/components/editor/dialogs/create-project-dialog";
import { DeleteProjectDialog } from "@/components/editor/dialogs/delete-project-dialog";
import { RenameProjectDialog } from "@/components/editor/dialogs/rename-project-dialog";
import {
  useProjectDialogs,
  type ProjectDialogsController,
} from "@/hooks/use-project-dialogs";

const ProjectDialogsContext = createContext<ProjectDialogsController | null>(
  null
);

/**
 * Opens the project dialogs from anywhere inside the editor. The context exists
 * because the two entry points sit on opposite sides of the route boundary —
 * the sidebar lives in the layout, the `New Project` button lives in the page.
 */
export function useProjectDialogActions(): ProjectDialogsController {
  const controller = useContext(ProjectDialogsContext);

  if (!controller) {
    throw new Error(
      "useProjectDialogActions must be used inside <ProjectDialogsProvider>"
    );
  }

  return controller;
}

interface ProjectDialogsProviderProps {
  children: React.ReactNode;
}

/**
 * Holds the one `useProjectDialogs()` controller for the editor and renders all
 * three dialogs beside `children`, so they mount once no matter how many places
 * can open them.
 *
 * Each dialog's `onOpenChange` only acts on `false`: opening is always driven by
 * an explicit `openCreate` / `openRename` / `openDelete` call, so the callback
 * exists to catch Escape, the overlay, and the close button.
 */
export function ProjectDialogsProvider({
  children,
}: ProjectDialogsProviderProps) {
  const dialogs = useProjectDialogs();
  const targetName = dialogs.target?.name ?? "";

  return (
    <ProjectDialogsContext value={dialogs}>
      {children}

      <CreateProjectDialog
        open={dialogs.kind === "create"}
        name={dialogs.name}
        slug={dialogs.slug}
        isSubmitting={dialogs.isSubmitting}
        canSubmit={dialogs.canSubmit}
        nameError={dialogs.nameError}
        onNameChange={dialogs.setName}
        onOpenChange={(open) => {
          if (!open) {
            dialogs.close();
          }
        }}
        onSubmit={dialogs.submit}
      />

      <RenameProjectDialog
        open={dialogs.kind === "rename"}
        name={dialogs.name}
        projectName={targetName}
        isSubmitting={dialogs.isSubmitting}
        canSubmit={dialogs.canSubmit}
        nameError={dialogs.nameError}
        onNameChange={dialogs.setName}
        onOpenChange={(open) => {
          if (!open) {
            dialogs.close();
          }
        }}
        onSubmit={dialogs.submit}
      />

      <DeleteProjectDialog
        open={dialogs.kind === "delete"}
        projectName={targetName}
        isSubmitting={dialogs.isSubmitting}
        canSubmit={dialogs.canSubmit}
        onOpenChange={(open) => {
          if (!open) {
            dialogs.close();
          }
        }}
        onConfirm={dialogs.submit}
      />
    </ProjectDialogsContext>
  );
}
