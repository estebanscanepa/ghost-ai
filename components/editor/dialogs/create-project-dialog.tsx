"use client";

import { EditorDialog } from "@/components/editor/editor-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FORM_ID = "create-project-form";

interface CreateProjectDialogProps {
  open: boolean;
  name: string;
  /** Live preview of the slug the name will produce. */
  slug: string;
  isSubmitting: boolean;
  canSubmit: boolean;
  /** Why the name is rejected, or `null` when it is fine. */
  nameError: string | null;
  onNameChange: (name: string) => void;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
}

export function CreateProjectDialog({
  open,
  name,
  slug,
  isSubmitting,
  canSubmit,
  nameError,
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
          aria-describedby="create-project-slug"
        />
        {nameError ? (
          <p id="create-project-slug" className="text-xs text-error">
            {nameError}
          </p>
        ) : (
          <p id="create-project-slug" className="text-xs text-copy-muted">
            Slug:{" "}
            <span className="font-mono text-copy-secondary">
              {slug || "your-project"}
            </span>
          </p>
        )}
      </form>
    </EditorDialog>
  );
}
