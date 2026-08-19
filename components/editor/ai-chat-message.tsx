import type { ChatMessage } from "@/types/ai-chat";

/**
 * One entry in the transcript.
 *
 * The two roles are told apart by side *and* by palette, so a glance at the
 * column is enough: the user sits right in the brand's dim fill behind a
 * half-strength brand border, the assistant sits left on the elevated surface
 * in the AI text colour. That is the same division the rest of the editor makes
 * — cyan is the product, indigo is the model.
 *
 * `whitespace-pre-wrap` because `Shift + Enter` is a newline in the composer, so
 * a message can carry line breaks the bubble has to keep, and `break-words` so a
 * pasted URL cannot widen the sidebar.
 */
export function AiChatMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <li className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl border-2 border-brand/50 bg-accent-dim px-3 py-2 text-sm break-words whitespace-pre-wrap text-copy-primary"
            : "max-w-[85%] rounded-2xl border border-surface-border bg-elevated px-3 py-2 text-sm break-words whitespace-pre-wrap text-ai-text"
        }
      >
        {message.content}
      </div>
    </li>
  );
}
