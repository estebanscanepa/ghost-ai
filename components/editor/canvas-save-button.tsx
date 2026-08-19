"use client";

import { Check, LoaderCircle, Save, TriangleAlert } from "lucide-react";

import { useCanvasSave } from "@/components/editor/canvas-save-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CanvasSaveStatus } from "@/types/canvas-save";

/**
 * The Save button, and the canvas's save status — one control rather than two,
 * because with autosave running there is nothing to say about saving that is not
 * also the state of the button.
 *
 * `variant="outline" size="sm"`, the same treatment as `Templates` and `Share`
 * beside it, since the three are peer project actions. It leads the group: what
 * the editor has and has not stored is read before the two dialogs are reached
 * for.
 *
 * Pressing it is still worth something with autosave on. It writes the canvas
 * whether or not the debounce thought anything had changed, which is the only way
 * a room that predates its project's first save gets stored — see `saveNow`.
 */

const SAVE_LABELS: Record<CanvasSaveStatus, string> = {
  idle: "Save",
  saving: "Saving",
  saved: "Saved",
  error: "Save failed",
};

const SAVE_ICONS: Record<CanvasSaveStatus, typeof Save> = {
  idle: Save,
  saving: LoaderCircle,
  saved: Check,
  error: TriangleAlert,
};

export function CanvasSaveButton() {
  const { status, message, requestSave } = useCanvasSave();

  const Icon = SAVE_ICONS[status];
  const isSaving = status === "saving";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={requestSave}
      disabled={isSaving}
      /* The failure itself, not just that there was one. `title` rather than a
         line of copy in the navbar: the message is a sentence, the navbar has
         room for a word, and a save that failed is retried by pressing the
         button that is already there. */
      title={message ?? undefined}
    >
      <Icon
        className={cn(
          "h-4 w-4",
          isSaving && "animate-spin",
          status === "saved" && "text-success",
          status === "error" && "text-error",
        )}
      />
      {/* The label is what changes, so it is what is announced. `polite` because
          a save is not an interruption. */}
      <span aria-live="polite">{SAVE_LABELS[status]}</span>
    </Button>
  );
}
