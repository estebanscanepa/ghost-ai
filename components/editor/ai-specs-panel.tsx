import { Download, FileText, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The card the tab is built around until generation exists. A plausible spec
 * rather than lorem: the list has to show what a real entry will look like, and
 * the line above it says outright that this one is a placeholder so nobody goes
 * looking for the file.
 */
const DEMO_SPEC = {
  title: "Realtime collaboration",
  snippet:
    "Rooms, presence, and the storage model the canvas syncs through — the boundaries a second client has to agree with.",
} as const;

/**
 * The Specs tab: the action that will generate a spec, and the list of specs it
 * will produce.
 *
 * Nothing here reaches a route or a background task — `20-ai-sidebar-shell.md`
 * is the sidebar's structure, and generation is a later unit. `Generate Spec` is
 * therefore rendered as the spec asks and left without a handler, deliberately
 * unlike the card's download action, which the spec asks to be `disabled`
 * because a placeholder has no file behind it.
 */
export function AiSpecsPanel() {
  return (
    <div className="flex flex-col gap-3 p-3">
      <Button
        type="button"
        size="lg"
        /* The AI accent, matching the send button and the active tab, with the
           palette's near-white on it rather than a raw `text-white`. */
        className="w-full bg-ai text-copy-primary hover:bg-ai/90"
      >
        <Sparkles className="h-4 w-4" />
        Generate Spec
      </Button>

      <p className="text-[11px] text-copy-faint">
        Generated specs land here. The card below is a placeholder.
      </p>

      <ul className="flex flex-col gap-2">
        <li className="flex items-start gap-3 rounded-2xl border border-surface-border bg-elevated p-3">
          <span className="mt-0.5 shrink-0 text-ai-text">
            <FileText className="h-4 w-4" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-copy-primary">
              {DEMO_SPEC.title}
            </p>
            <p className="text-xs text-copy-muted">{DEMO_SPEC.snippet}</p>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            disabled
            aria-label={`Download ${DEMO_SPEC.title}`}
            title="Available once a spec has been generated"
          >
            <Download className="h-4 w-4 text-copy-muted" />
          </Button>
        </li>
      </ul>
    </div>
  );
}
