import { EditorShell } from "@/components/editor/editor-shell";
import { getCurrentIdentity } from "@/lib/project-access";
import {
  listOwnedProjects,
  listSharedProjects,
  toSidebarProject,
} from "@/lib/projects";

/**
 * Frames every screen under `/editor` with the shared chrome: the top navbar
 * and the floating project sidebar. The page below fills the remaining
 * viewport — the canvas area — and never shifts when the sidebar opens.
 *
 * Both project lists are read here rather than in the page: the sidebar lives
 * in this layout, so this is the closest Server Component that can hand it
 * data, and every screen under `/editor` gets the same list without fetching
 * again. Mutations reconcile it with `router.refresh()`.
 */
export default async function EditorLayout({
  children,
}: LayoutProps<"/editor">) {
  // `proxy.ts` already blocks signed-out requests; this keeps the query honest
  // rather than trusting that.
  const identity = await getCurrentIdentity();

  const [owned, shared] = identity
    ? await Promise.all([
        listOwnedProjects(identity.userId),
        listSharedProjects(identity.userId, identity.emails),
      ])
    : [[], []];

  return (
    <EditorShell
      ownedProjects={owned.map((project) => toSidebarProject(project, "owned"))}
      sharedProjects={shared.map((project) =>
        toSidebarProject(project, "shared"),
      )}
    >
      {children}
    </EditorShell>
  );
}
