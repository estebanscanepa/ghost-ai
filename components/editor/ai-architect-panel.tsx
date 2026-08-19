"use client";

import { Bot } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AiChatComposer } from "@/components/editor/ai-chat-composer";
import { AiChatMessage } from "@/components/editor/ai-chat-message";
import type { ChatMessage } from "@/types/ai-chat";

/**
 * The three prompts offered on an empty transcript. Concrete systems rather than
 * "ask me anything": the panel designs architectures, and naming three is what
 * says so without a paragraph explaining it.
 */
const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
] as const;

interface ChatEmptyStateProps {
  /** Sends the picked prompt as the first message. */
  onPickPrompt: (prompt: string) => void;
}

/**
 * What the tab shows before anything has been said. The same shape as the
 * project sidebar's empty state — faint icon, a line of copy — with the starter
 * chips underneath, which are the only part of it that is interactive.
 *
 * A chip *sends* its prompt rather than dropping it into the composer: it is
 * offered as a starting point, and one click is what makes it one. The composer
 * below is where a prompt of the user's own is written.
 */
function ChatEmptyState({ onPickPrompt }: ChatEmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
      <span className="text-copy-faint">
        <Bot className="h-8 w-8" />
      </span>

      <p className="text-xs text-copy-muted">
        Describe a system and Ghost AI will draft it on the canvas. Start with
        one of these:
      </p>

      <ul className="flex flex-wrap justify-center gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button
              type="button"
              onClick={() => onPickPrompt(prompt)}
              /* Soft pills: the subtle surface carrying the AI text colour, and
                 an accent tint on hover, so a chip reads as the model's
                 suggestion rather than as a form control. */
              className="cursor-pointer rounded-full bg-subtle px-3 py-1.5 text-xs text-ai-text transition-colors hover:bg-ai/15 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The AI Architect tab: the transcript, and the composer under it.
 *
 * The transcript is component state and nothing else — no request, no room, no
 * persistence, which is what `20-ai-sidebar-shell.md` scopes this unit to. So
 * sending appends the user's message and stops there; the assistant's bubble is
 * built (`AiChatMessage` handles both roles) and waits for the unit that
 * generates a reply. Nothing is invented in the meantime.
 */
export function AiArchitectPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  /** The scroll container, so a new message does not land below the fold. */
  const transcriptRef = useRef<HTMLDivElement>(null);

  const sendMessage = useCallback((content: string) => {
    const text = content.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: text },
    ]);
  }, []);

  /* Pinned to the bottom after every append. `scrollTop = scrollHeight` on the
     container rather than `scrollIntoView` on a sentinel, so it cannot scroll an
     ancestor — the sidebar floats over a canvas that must not move. */
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (!transcript) return;

    transcript.scrollTop = transcript.scrollHeight;
  }, [messages]);

  return (
    <>
      <div ref={transcriptRef} className="min-h-0 flex-1 overflow-y-auto p-3">
        {messages.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {messages.map((message) => (
              <AiChatMessage key={message.id} message={message} />
            ))}
          </ul>
        ) : (
          <ChatEmptyState onPickPrompt={sendMessage} />
        )}
      </div>

      <AiChatComposer onSend={sendMessage} />
    </>
  );
}
