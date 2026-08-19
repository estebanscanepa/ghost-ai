"use client";

import { Bot, X } from "lucide-react";

import { AiArchitectPanel } from "@/components/editor/ai-architect-panel";
import { AiSpecsPanel } from "@/components/editor/ai-specs-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The active tab's treatment, applied to both triggers.
 *
 * "Accent" in this panel means the *AI* accent, not the shadcn `accent` token —
 * that one is mapped to `--bg-subtle` in `globals.css`, which is the tab list's
 * own background, so `bg-accent` with `text-accent` as literally named would
 * paint the active tab in the colour it sits on and in the colour it is painted.
 * `--accent-ai` at 15% carries the fill and `--accent-ai-text` the label, which
 * is the pair `ui-context.md` documents for AI surfaces and the one the Sparkles
 * toggle in the navbar already uses.
 *
 * Each override is repeated under `dark:` because the primitive states its own
 * active colours there, and this app runs with `dark` on `<html>` always.
 */
const TAB_TRIGGER_CLASS =
  "text-copy-muted hover:text-copy-secondary data-active:bg-ai/15 data-active:text-ai-text dark:text-copy-muted dark:hover:text-copy-secondary dark:data-active:border-transparent dark:data-active:bg-ai/15 dark:data-active:text-ai-text";

/**
 * Right-hand slide-over holding the AI workspace: a chat that will draft systems
 * onto the canvas, and the specs generated from it.
 *
 * Placement and open/close are unchanged from the placeholder this replaces, and
 * deliberately so — absolutely positioned so it overlays the canvas instead of
 * reflowing it, translated off the right edge when closed rather than unmounted
 * so the canvas viewport never changes size, and `inert` while closed so nothing
 * inside it can be tabbed into. The state stays the parent's: `EditorShell` owns
 * it because the navbar's toggle and this panel both act on it.
 *
 * The surface moved from `bg-surface/95` to `bg-base/95`, which is the canvas's
 * own colour, so the message bubbles and the spec card read as raised on it.
 * `shadow-lg` is what separates the panel from the canvas now that the two share
 * a background — the same treatment the canvas's floating pills carry.
 *
 * The body is structure only. No request, no room, no generation: the transcript
 * is local state and `Generate Spec` has nothing behind it yet.
 */
export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      inert={!isOpen}
      aria-label="AI workspace"
      className={cn(
        "absolute inset-y-3 right-3 z-30 flex w-80 flex-col overflow-hidden rounded-2xl border border-surface-border bg-base/95 shadow-lg backdrop-blur transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]",
      )}
    >
      <div className="flex items-start justify-between gap-2 border-b border-surface-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* The AI accent as a tinted tile rather than a bare stroke, so the
              panel names its owner the way the navbar's toggle does. */}
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-ai/15 text-ai-text">
            <Bot className="h-4 w-4" />
          </span>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-copy-primary">
              AI Workspace
            </h2>
            <p className="truncate text-xs text-copy-muted">
              Collaborate with Ghost AI
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI sidebar"
        >
          <X className="h-4 w-4 text-copy-muted" />
        </Button>
      </div>

      {/* `min-h-0` on the root and on both contents is what makes the transcript
          the only thing that scrolls: without it a flex child refuses to shrink
          below its content and the composer is pushed off the bottom. Same
          arrangement as the project sidebar's tabs. */}
      <Tabs defaultValue="architect" className="min-h-0 flex-1 gap-0">
        {/* Wrapped rather than given margins: `w-full` on the list plus insets of
            its own would overflow the panel by the insets. */}
        <div className="px-3 pt-3">
          <TabsList className="h-9 w-full bg-subtle">
            <TabsTrigger value="architect" className={TAB_TRIGGER_CLASS}>
              AI Architect
            </TabsTrigger>
            <TabsTrigger value="specs" className={TAB_TRIGGER_CLASS}>
              Specs
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="architect" className="flex min-h-0 flex-col">
          <AiArchitectPanel />
        </TabsContent>

        <TabsContent value="specs" className="min-h-0 overflow-y-auto">
          <AiSpecsPanel />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
