import { EditorHome } from "@/components/editor/editor-home";

/**
 * Editor home. The layout supplies the chrome; this fills the remaining
 * viewport until a project is open and React Flow mounts here instead.
 */
export default function EditorPage() {
  return <EditorHome />;
}
