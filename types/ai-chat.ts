/**
 * The chat contract for the AI sidebar.
 *
 * Shared rather than local to the panel because two components need it: the
 * architect panel, which holds the transcript, and `AiChatMessage`, which draws
 * one entry of it. Nothing is persisted and nothing is generated yet — the
 * transcript lives in component state for the length of a session, and the
 * `assistant` role is declared here so the bubble that renders it exists before
 * there is anything to put in it.
 */

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  /** Client-generated, and only ever used as a React key. */
  id: string;
  role: ChatRole;
  content: string;
}
