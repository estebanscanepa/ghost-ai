"use client";

import { SendHorizontal } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AiChatComposerProps {
  /** Called with the trimmed draft. The composer clears itself after. */
  onSend: (content: string) => void;
}

/**
 * The input half of the architect tab: a textarea that grows with its content
 * and the send button beside it.
 *
 * The draft is this component's own state, not the panel's. The panel owns the
 * transcript and never needs to know what is half-typed, and keeping the two
 * apart means a keystroke re-renders the composer rather than every message
 * above it.
 *
 * Growth is `field-sizing-content`, which the `Textarea` primitive already
 * ships, bounded here to the 72px–160px the spec asks for. It is one CSS
 * property rather than a ref measuring `scrollHeight` on every change; where a
 * browser does not support it the box stays at its minimum and scrolls, which is
 * the same thing a plain textarea does.
 */
export function AiChatComposer({ onSend }: AiChatComposerProps) {
  const [draft, setDraft] = useState("");

  const canSend = draft.trim().length > 0;

  const submit = () => {
    if (!canSend) return;

    onSend(draft);
    setDraft("");
  };

  /**
   * `Enter` sends, `Shift + Enter` is a newline. The guard is the whole of it:
   * anything that is not a bare `Enter` falls through to the textarea's own
   * handling, so `Shift + Enter` inserts a break without this knowing how.
   */
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    submit();
  };

  return (
    <div className="border-t border-surface-border p-3">
      <div className="flex items-end gap-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe the system you want to design…"
          aria-label="Message Ghost AI"
          /* One step up from the panel's `bg-base/95` so the field reads as a
             surface on it rather than a hole in it. `dark:bg-surface` too,
             because the primitive's own `dark:bg-input/30` would otherwise win
             the variant. */
          className="max-h-40 min-h-[72px] resize-none overflow-y-auto rounded-xl border-surface-border bg-surface text-sm text-copy-primary placeholder:text-copy-faint dark:bg-surface"
        />

        <Button
          type="button"
          size="icon"
          onClick={submit}
          disabled={!canSend}
          aria-label="Send message"
          /* The AI accent, which is what "accent" means in this panel — see the
             tab styling in `ai-sidebar.tsx`. `text-copy-primary` rather than a
             raw `text-white`: it is the palette's near-white and the token
             `code-standards.md` asks for. */
          className="bg-ai text-copy-primary hover:bg-ai/90"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>

      <p className="mt-2 text-[11px] text-copy-faint">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}
