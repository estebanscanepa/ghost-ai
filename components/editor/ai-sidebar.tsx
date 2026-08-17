import { Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Right-hand slide-over that will hold the AI chat. It mirrors
 * `ProjectSidebar`: absolutely positioned so it overlays the canvas instead of
 * reflowing it, and translated off the right edge when closed rather than
 * unmounted, so the canvas viewport never changes size.
 *
 * The body is a placeholder — no chat, no generation, no transport yet.
 */
export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      inert={!isOpen}
      aria-label="AI assistant"
      className={cn(
        "absolute inset-y-3 right-3 z-30 flex w-80 flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface/95 backdrop-blur transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]",
      )}
    >
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-copy-primary">
          <Sparkles className="h-4 w-4 text-ai-text" />
          AI Assistant
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close AI sidebar"
        >
          <X className="h-4 w-4 text-copy-muted" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
        <span className="text-copy-faint">
          <Sparkles className="h-8 w-8" />
        </span>
        <p className="text-sm font-medium text-copy-secondary">
          Design assistant
        </p>
        <p className="text-xs text-copy-muted">
          Generating designs from a prompt lands here.
        </p>
      </div>
    </aside>
  );
}
