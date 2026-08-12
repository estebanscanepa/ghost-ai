/**
 * Canvas placeholder. The layout supplies the chrome; this fills the remaining
 * viewport and is where React Flow will mount in a later chapter.
 */
export default function EditorPage() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-base">
      <p className="text-sm text-copy-muted">
        The canvas will live here.
      </p>
    </div>
  );
}
