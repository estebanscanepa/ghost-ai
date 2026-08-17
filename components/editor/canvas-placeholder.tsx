/**
 * The centre of the workspace until React Flow and the Liveblocks room mount
 * here. It claims the full canvas area on the base background so the shell
 * around it — navbar, project sidebar, AI sidebar — can be judged at its real
 * size.
 */
export function CanvasPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-base px-6 text-center">
      <p className="max-w-md text-sm text-copy-muted">
        The collaborative canvas mounts here.
      </p>
    </div>
  );
}
