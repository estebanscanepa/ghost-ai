"use client";

import { EditorDialog } from "@/components/editor/editor-dialog";
import { Button } from "@/components/ui/button";

interface DeleteProjectDialogProps {
  open: boolean;
  projectName: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

/**
 * Destructive confirmation only — no name field to retype, no other input.
 */
export function DeleteProjectDialog({
  open,
  projectName,
  isSubmitting,
  canSubmit,
  onOpenChange,
  onConfirm,
}: DeleteProjectDialogProps) {
  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete project"
      description={`“${projectName}” and its canvas will be permanently deleted. This cannot be undone.`}
      footer={
        <>
          <Button
            variant="outline"
            size="lg"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="lg"
            onClick={onConfirm}
            disabled={!canSubmit}
          >
            Delete project
          </Button>
        </>
      }
    />
  );
}
