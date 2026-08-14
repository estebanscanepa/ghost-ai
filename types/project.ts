/**
 * Ownership decides what the UI may offer: only an owned project exposes
 * rename and delete. Shared projects are read-only from the sidebar's point of
 * view — the real check still belongs at the mutation boundary.
 */
export type ProjectOwnership = "owned" | "shared";

export interface Project {
  id: string;
  name: string;
  slug: string;
  ownership: ProjectOwnership;
}
