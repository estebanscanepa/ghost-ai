import { readJsonObject } from "@/lib/api-request";
import { forbidden, invalidRequest, unauthorized } from "@/lib/api-response";
import { getLiveblocksClient, getUserColor } from "@/lib/liveblocks";
import { checkProjectAccess, getCurrentIdentity } from "@/lib/project-access";
import { isRoomId } from "@/lib/room-id";

/**
 * Issue a Liveblocks session token for one room.
 *
 * The room ID is the project ID, so the question "may this user join this room"
 * is exactly the question `checkProjectAccess` already answers for the workspace
 * route — owner or collaborator, resolved against the database on every request.
 * A token is only ever minted after that answer comes back positive, per the
 * auth model in `architecture-context.md`.
 *
 * This is an access-token endpoint rather than an ID-token one: permissions are
 * carried by the token itself instead of being mirrored into Liveblocks' own
 * per-room ACLs. Membership already lives in `ProjectCollaborator` and is keyed
 * by email, so mirroring it would mean keeping a second copy in sync on every
 * invite and removal. Deriving the grant per request instead means a removed
 * collaborator stops being issued tokens immediately.
 */
export async function POST(request: Request) {
  const identity = await getCurrentIdentity();

  if (!identity) {
    return unauthorized();
  }

  const body = await readJsonObject(request);

  if (!body.ok) {
    return invalidRequest("Request body must be a JSON object.");
  }

  const room = body.value.room;

  if (typeof room !== "string" || !isRoomId(room)) {
    return invalidRequest("A valid room is required.");
  }

  const access = await checkProjectAccess(room, identity);

  // A room that does not exist and one that belongs to a stranger are the same
  // `403` here, matching what `/editor/[roomId]` renders: telling an outsider
  // which room IDs are real is the one thing this endpoint must not do, and
  // unlike the project API there is no legitimate caller who needs to tell the
  // two cases apart.
  if (!access) {
    return forbidden("You do not have access to this project.");
  }

  const liveblocks = getLiveblocksClient();

  // Idempotent, so it stands in for tracking whether the room was ever created:
  // a project record is the source of truth and the room is created lazily, the
  // first time someone opens the canvas. `defaultAccesses: []` keeps the room
  // private — nothing may join it except a session this endpoint authorized.
  await liveblocks.getOrCreateRoom(room, { defaultAccesses: [] });

  const session = liveblocks.prepareSession(identity.userId, {
    userInfo: {
      // Clerk's name, the account's address, and finally a generic label: a
      // cursor with no label above it reads as a rendering bug, so there is
      // always something to show.
      name: identity.profile?.name ?? identity.email ?? "Anonymous",
      avatar: identity.profile?.imageUrl ?? "",
      color: getUserColor(identity.userId),
    },
  });

  // Scoped to this one room, not a wildcard: the token is minted per join and
  // the access check above only proved access to this project.
  session.allow(room, ["*:write"]);

  // `authorize()` already returns a serialized JSON body and the status to send
  // it with — including when Liveblocks itself refuses — so it is passed
  // through rather than re-wrapped in this app's error envelope.
  const { status, body: token } = await session.authorize();

  return new Response(token, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
