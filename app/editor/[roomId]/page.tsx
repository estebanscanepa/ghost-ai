import { redirect } from "next/navigation";

import { AccessDenied } from "@/components/editor/access-denied";
import { CanvasPlaceholder } from "@/components/editor/canvas-placeholder";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";

/**
 * A project workspace. Access is resolved on the server before anything
 * renders: signed-out callers go to sign-in, and a room that does not exist or
 * does not belong to the caller gets `AccessDenied` rather than the canvas.
 *
 * The segment is the room ID, which is also the project ID — one identifier
 * addresses both the record and the Liveblocks room.
 *
 * The canvas itself is still a placeholder; React Flow and the room mount here.
 */
export default async function ProjectWorkspacePage(
  props: PageProps<"/editor/[roomId]">,
) {
  const { roomId } = await props.params;
  const identity = await getCurrentIdentity();

  // `proxy.ts` already redirects signed-out requests. Repeating it here keeps
  // the page correct on its own rather than depending on the matcher.
  if (!identity) {
    redirect("/sign-in");
  }

  const access = await checkProjectAccess(roomId, identity);

  if (!access) {
    return <AccessDenied />;
  }

  return <CanvasPlaceholder />;
}
