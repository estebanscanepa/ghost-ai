/**
 * A collaborator as `app/api/projects/[projectId]/collaborators` returns it.
 *
 * `email` is the stored identity — it is the value that grants access, and the
 * only field the database holds. `name` and `imageUrl` are enrichment read from
 * Clerk at request time and are `null` whenever no Clerk user owns the address,
 * so a row always has an email to fall back to.
 *
 * `projectId` is deliberately absent for the same reason `ownerId` is absent
 * from `ProjectResponse`: the client already knows which project it asked about.
 */
export interface CollaboratorResponse {
  id: string;
  email: string;
  name: string | null;
  imageUrl: string | null;
  createdAt: string;
}
