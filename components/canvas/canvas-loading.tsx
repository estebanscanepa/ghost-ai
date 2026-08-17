import { LoaderCircle } from "lucide-react";

/**
 * What fills the canvas area while the Liveblocks room connects and Storage
 * loads. It sits on the same background at the same size as the canvas it is
 * standing in for, so the shell around it does not shift when the real surface
 * arrives.
 */
export function CanvasLoading() {
  return (
    <div className="flex h-full w-full items-center justify-center gap-2 bg-base text-copy-muted">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      <p className="text-sm">Connecting to the canvas…</p>
    </div>
  );
}
