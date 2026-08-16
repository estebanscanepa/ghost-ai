"use client";

import { DialogError } from "@/components/editor/dialogs/dialog-error";
import { EditorDialog } from "@/components/editor/editor-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FORM_ID = "create-project-form";

interface CreateProjectDialogProps {
  open: boolean;
  name: string;
  /** Live preview of the room ID the name will produce — also the project ID. */
  roomId: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  /** Why the name is rejected, or `null` when it is fine. */
  nameError: string | null;
  /** Why the last create attempt failed, or `null`. */
  submitError: string | null;
  onNameChange: (name: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

/**
 * Names a new project and previews the room ID that name will produce. The body
 * is a `<form id>` and the footer's confirm button carries `form={FORM_ID}`,
 * because `EditorDialog` renders body and footer as siblings — that pairing is
 * what makes Enter submit from inside the input.
 *
 * Presentational: every value and callback comes from `useProjectActions()`.
 */
export function CreateProjectDialog({
  open,
  name,
  roomId,
  isSubmitting,
  canSubmit,
  nameError,
  submitError,
  onNameChange,
  onOpenChange,
  onSubmit,
}: CreateProjectDialogProps) {
  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New project"
      description="Name your project. You can rename it later."
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
            Create project
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
          htmlFor="create-project-name"
          className="text-xs font-medium text-copy-secondary"
        >
          Project name
        </label>
        <Input
          id="create-project-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="Checkout Platform"
          autoComplete="off"
          disabled={isSubmitting}
          aria-invalid={nameError !== null}
          aria-describedby="create-project-room-id"
        />
        {nameError ? (
          <p id="create-project-room-id" className="text-xs text-error">
            {nameError}
          </p>
        ) : (
          <p id="create-project-room-id" className="text-xs text-copy-muted">
            Room ID:{" "}
            <span className="font-mono text-copy-secondary">
              {roomId || "your-project"}
            </span>
          </p>
        )}

        <DialogError message={submitError} />
      </form>
    </EditorDialog>
  );
}
