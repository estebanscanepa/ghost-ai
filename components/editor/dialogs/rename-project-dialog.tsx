"use client";

import { EditorDialog } from "@/components/editor/editor-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FORM_ID = "rename-project-form";

interface RenameProjectDialogProps {
  open: boolean;
  /** Prefilled, editable name. */
  name: string;
  /** The project's current name, shown in the description. */
  projectName: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  /** Why the name is rejected, or `null` when it is fine. */
  nameError: string | null;
  onNameChange: (name: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

/**
 * Renames an existing project. The input opens prefilled and focused so the
 * common case is type-and-Enter; the description keeps the current name visible
 * once the field has been edited away from it.
 *
 * Uses the same `<form id>` / `form={FORM_ID}` pairing as the create dialog to
 * submit on Enter across `EditorDialog`'s body/footer split.
 */
export function RenameProjectDialog({
  open,
  name,
  projectName,
  isSubmitting,
  canSubmit,
  nameError,
  onNameChange,
  onOpenChange,
  onSubmit,
}: RenameProjectDialogProps) {
  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Rename project"
      description={`Currently named “${projectName}”.`}
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
          <Button type="submit" form={FORM_ID} size="lg" disabled={!canSubmit}>
            Save name
          </Button>
        </>
      }
    >
      <form
        id={FORM_ID}
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label
          htmlFor="rename-project-name"
          className="text-xs font-medium text-copy-secondary"
        >
          Project name
        </label>
        <Input
          id="rename-project-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          autoComplete="off"
          disabled={isSubmitting}
          aria-invalid={nameError !== null}
          aria-describedby={nameError ? "rename-project-error" : undefined}
          autoFocus
        />
        {nameError ? (
          <p id="rename-project-error" className="text-xs text-error">
            {nameError}
          </p>
        ) : null}
      </form>
    </EditorDialog>
  );
}
