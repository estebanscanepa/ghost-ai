import type { ProjectStatus } from "@/app/generated/prisma/enums";

/**
 * Ownership decides what the UI may offer: only an owned project exposes
 * rename and delete. Shared projects are read-only from the sidebar's point of
 * view — the real check still belongs at the mutation boundary.
 */
export type ProjectOwnership = "owned" | "shared";

/**
 * A project as the sidebar and dialogs need it. `id` is also the Liveblocks
 * room ID — see `lib/room-id.ts` — so there is no separate slug to carry.
 */
export interface Project {
  id: string;
  name: string;
  ownership: ProjectOwnership;
}

/**
 * A project as `app/api/projects` returns it. Distinct from `Project` above:
 * this is the wire shape, so timestamps are ISO strings rather than `Date`,
 * and `ownerId` never leaves the server. Projects are addressed by `id`, which
 * doubles as the Liveblocks room ID.
 */
export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  canvasJsonPath: string | null;
  createdAt: string;
  updatedAt: string;
}
