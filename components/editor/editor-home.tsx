"use client";

import { Plus } from "lucide-react";

import { useProjectDialogActions } from "@/components/editor/project-dialogs";
import { Button } from "@/components/ui/button";

/**
 * Editor home screen: what fills the canvas area before a project is open.
 */
export function EditorHome() {
  const { openCreate } = useProjectDialogActions();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold text-copy-primary">
          Create a project or open an existing one
        </h1>
        <p className="max-w-md text-sm text-copy-muted">
          Start a new architecture workspace, or choose a project from the
          sidebar.
        </p>
      </div>

      <Button size="lg" onClick={openCreate}>
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </div>
  );
}
