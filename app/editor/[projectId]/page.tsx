import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { getCurrentUserEmails } from "@/lib/current-user";
import { findAccessibleProject } from "@/lib/projects";

/**
 * A project workspace. The canvas is not built yet, so this is the destination
 * creating or opening a project navigates to: it proves the project exists and
 * that the caller may see it, and holds the space React Flow and the Liveblocks
 * room will fill.
 *
 * The segment is the project ID, which is also the Liveblocks room ID.
 */
export default async function ProjectWorkspacePage(
  props: PageProps<"/editor/[projectId]">,
) {
  const { projectId } = await props.params;
  const { userId } = await auth();

  if (!userId) {
    notFound();
  }

  const emails = await getCurrentUserEmails();
  const accessible = await findAccessibleProject(projectId, userId, emails);

  // A project someone else owns is indistinguishable from one that does not
  // exist here: this is a read, and the sidebar only lists what the user can
  // already see.
  if (!accessible) {
    notFound();
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold text-copy-primary">
        {accessible.project.name}
      </h1>
      <p className="text-xs text-copy-muted">
        Room ID:{" "}
        <span className="font-mono text-copy-secondary">
          {accessible.project.id}
        </span>
      </p>
      <p className="max-w-md text-sm text-copy-muted">
        The collaborative canvas mounts here.
      </p>
    </div>
  );
}
