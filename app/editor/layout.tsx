import { EditorShell } from "@/components/editor/editor-shell";

/**
 * Frames every screen under `/editor` with the shared chrome: the top navbar
 * and the floating project sidebar. The page below fills the remaining
 * viewport — the canvas area — and never shifts when the sidebar opens.
 */
export default function EditorLayout({ children }: LayoutProps<"/editor">) {
  return <EditorShell>{children}</EditorShell>;
}
