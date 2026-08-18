import { CloudAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CanvasErrorProps {
  /** Remounts the room so the connection is attempted again. */
  onRetry: () => void;
}

/**
 * What fills the canvas area when the Liveblocks room cannot be joined — an
 * unreachable service, a rejected token, a dropped connection Liveblocks could
 * not recover from.
 *
 * It says nothing about *why*: the auth endpoint answers `403` identically for
 * a room that does not exist and one the caller may not open, so this component
 * has nothing to distinguish either. Access that is already known to be refused
 * never reaches here — the workspace page renders `AccessDenied` server-side
 * before the room mounts at all.
 */
export function CanvasError({ onRetry }: CanvasErrorProps) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-base px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl border border-surface-border bg-surface text-copy-faint">
        <CloudAlert className="h-8 w-8" />
      </span>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold text-copy-primary">
          The canvas could not connect
        </h1>
        <p className="max-w-sm text-sm text-copy-muted">
          Realtime collaboration is unavailable right now. Your existing work is
          safe.
        </p>
      </div>

      <Button variant="outline" size="lg" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
