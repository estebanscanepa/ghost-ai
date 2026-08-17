import { Lock } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * What the workspace route renders when the caller may not open the room —
 * whether the project belongs to someone else or does not exist at all. The
 * two are deliberately indistinguishable: a "no such project" message would
 * tell an outsider which project IDs are real.
 *
 * Fills the canvas area, so the navbar and project sidebar stay usable and the
 * way out is one click.
 */
export function AccessDenied() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-base px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl border border-surface-border bg-surface text-copy-faint">
        <Lock className="h-8 w-8" />
      </span>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold text-copy-primary">
          You do not have access to this project
        </h1>
        <p className="max-w-sm text-sm text-copy-muted">
          It may have been deleted, or you may not have been invited to it.
        </p>
      </div>

      <Button asChild variant="outline" size="lg">
        <Link href="/editor">Back to projects</Link>
      </Button>
    </div>
  );
}
