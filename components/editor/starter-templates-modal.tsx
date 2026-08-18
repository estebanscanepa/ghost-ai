"use client";

import { EditorDialog } from "@/components/editor/editor-dialog";
import { StarterTemplatePreview } from "@/components/editor/starter-template-preview";
import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates";
import { Button } from "@/components/ui/button";

interface StarterTemplatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Called with the picked template. The modal closes itself immediately after,
   * so the caller only has to load it — there is no confirmation step and no
   * pending state to report back.
   */
  onImport: (template: CanvasTemplate) => void;
}

interface TemplateCardProps {
  template: CanvasTemplate;
  onImport: (template: CanvasTemplate) => void;
}

/**
 * One template: its diagram, its name, what it is for, and the button that
 * loads it. A column, so the button sits on the card's baseline whatever the
 * description's length — `mt-auto` on the footer is what keeps a row of cards
 * from putting their buttons at three different heights.
 */
function TemplateCard({ template, onImport }: TemplateCardProps) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface p-3 transition-colors hover:border-surface-border-subtle">
      <StarterTemplatePreview template={template} />

      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium text-copy-primary">
          {template.name}
        </h3>
        <p className="text-xs leading-relaxed text-copy-muted">
          {template.description}
        </p>
      </div>

      <div className="mt-auto flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onImport(template)}
          /* The name is in the label rather than only in the card, because a
             screen reader reaching the button out of context would otherwise hear
             three buttons called "Import". */
          aria-label={`Import ${template.name}`}
        >
          Import
        </Button>
      </div>
    </li>
  );
}

/**
 * The starter template picker.
 *
 * Presentational, and it knows nothing about the canvas: it lists
 * `CANVAS_TEMPLATES`, hands the one that was picked to `onImport`, and closes.
 * Which room it lands in, and what happens to what is already there, belongs to
 * the canvas that owns the graph state — see `CollaborativeCanvas`.
 *
 * The grid is inside a scroll container with a viewport-relative cap rather than
 * growing the dialog, so adding a fourth template scrolls instead of pushing the
 * footer off a short screen. `-mx-1 px-1` bleeds the container past the grid so a
 * card's focus ring is not clipped by the scroll edge.
 */
export function StarterTemplatesModal({
  open,
  onOpenChange,
  onImport,
}: StarterTemplatesModalProps) {
  const handleImport = (template: CanvasTemplate) => {
    onImport(template);
    onOpenChange(false);
  };

  return (
    <EditorDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Start from a template"
      description="Import a pre-built system design. This replaces everything currently on the canvas."
      /* Wider than the shell's `sm:max-w-sm` default, which fits a single input
         but not a two-column grid of diagrams. */
      className="sm:max-w-2xl"
      footer={
        <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      }
    >
      <div className="-mx-1 max-h-[55vh] overflow-y-auto px-1">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {CANVAS_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onImport={handleImport}
            />
          ))}
        </ul>
      </div>
    </EditorDialog>
  );
}
