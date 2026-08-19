"use client";

import { useParams } from "next/navigation";
import { useMemo, useState, type CSSProperties } from "react";

import { AiSidebar } from "@/components/editor/ai-sidebar";
import { CanvasSaveProvider } from "@/components/editor/canvas-save-provider";
import { ShareProjectDialog } from "@/components/editor/dialogs/share-project-dialog";
import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogsProvider } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
import { StarterTemplatesProvider } from "@/components/editor/starter-templates-provider";
import { useShareDialog } from "@/hooks/use-share-dialog";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

interface EditorShellProps {
  children: React.ReactNode;
  /** Fetched in the route layout — the sidebar never fetches for itself. */
  ownedProjects: Project[];
  sharedProjects: Project[];
}

/**
 * Client half of the editor layout. It exists because `isSidebarOpen` is shared
 * between the navbar toggle and the sidebar itself, so the state has to live
 * above both — but the route layout should stay a Server Component.
 *
 * The `<main>` is `relative` on purpose: both sidebars position themselves
 * absolutely against it, so opening either overlays the canvas instead of
 * reflowing it.
 *
 * `ProjectDialogsProvider` wraps everything because both the sidebar (in the
 * layout) and the `New Project` button (in the page) open the same dialogs.
 * `StarterTemplatesProvider` wraps it for the mirror-image reason: the navbar
 * button that opens the template picker is here, and the modal that answers it is
 * mounted by the canvas in `{children}`, inside the Liveblocks room it writes to.
 * `CanvasSaveProvider` crosses the same boundary in both directions at once — the
 * canvas reports what autosave is doing and the navbar's Save button asks for a
 * save — and so has to wrap the navbar and `{children}` together.
 */
export function EditorShell({
  children,
  ownedProjects,
  sharedProjects,
}: EditorShellProps) {
  const params = useParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Open by default, unlike the project sidebar: the AI panel is part of what
  // the workspace *is*, so a project opens onto the full three-column shell
  // rather than hiding a third of it behind a toggle.
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true);

  const activeRoomId = typeof params.roomId === "string" ? params.roomId : null;

  /**
   * The open project, resolved from the lists the layout already fetched
   * rather than from a second query. A project the caller can open is in one
   * of the two lists by definition, so a miss means the route is the editor
   * home or the room was denied — in both cases there is no title to show.
   */
  const activeProject = useMemo(() => {
    if (!activeRoomId) {
      return null;
    }

    return (
      ownedProjects.find((project) => project.id === activeRoomId) ??
      sharedProjects.find((project) => project.id === activeRoomId) ??
      null
    );
  }, [activeRoomId, ownedProjects, sharedProjects]);

  /**
   * The share dialog is owned here rather than published through
   * `ProjectDialogsProvider`: the navbar is its only entry point, and it acts on
   * the open project instead of on a row the user picked, so there is nothing
   * for a second caller to pass.
   */
  const share = useShareDialog(activeProject);

  return (
    <ProjectDialogsProvider>
      <StarterTemplatesProvider>
        <CanvasSaveProvider projectId={activeProject?.id ?? null}>
          <div className="flex h-dvh flex-col overflow-hidden bg-base">
            <EditorNavbar
              isSidebarOpen={isSidebarOpen}
              onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
              project={activeProject}
              onOpenShare={share.open}
              isAiSidebarOpen={isAiSidebarOpen}
              onToggleAiSidebar={() => setIsAiSidebarOpen((open) => !open)}
            />

            <main
              className="relative min-h-0 flex-1 overflow-hidden"
              /* How much of the canvas's right edge the AI sidebar is covering:
                 its `w-80` plus its own `right-3`. The canvas's presence group
                 sits in that corner and offsets itself by this, so the sidebar —
                 which is open by default — does not cover it.

                 A custom property rather than a prop or a context, because the
                 only reader is inside the Liveblocks room, which this layout
                 renders as opaque `children`. It is the same boundary
                 `StarterTemplatesProvider` exists to cross, and a value that is
                 only ever read by CSS crosses it by inheriting. */
              style={
                {
                  "--canvas-right-inset": isAiSidebarOpen ? "20.75rem" : "0rem",
                } as CSSProperties
              }
            >
              {/* Mobile-only scrim: tapping outside the panel closes it. On wider
                screens the sidebar overlays the canvas without blocking it. */}
              <button
                type="button"
                inert={!isSidebarOpen}
                aria-label="Close project sidebar"
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "absolute inset-0 z-20 bg-background/70 backdrop-blur-[2px] transition-opacity duration-200 md:hidden",
                  isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
                )}
              />

              <ProjectSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                ownedProjects={ownedProjects}
                sharedProjects={sharedProjects}
                activeProjectId={activeRoomId}
              />
              {children}

              {/* Only mounted with a project open: there is nothing for the
                assistant to act on from the editor home. */}
              {activeProject ? (
                <AiSidebar
                  isOpen={isAiSidebarOpen}
                  onClose={() => setIsAiSidebarOpen(false)}
                />
              ) : null}
            </main>

            {/* Mounted only with a project open, for the same reason as the navbar's
              share button: there is nothing to share from the editor home. */}
            {activeProject ? (
              <ShareProjectDialog
                open={share.isOpen}
                projectName={activeProject.name}
                canManage={activeProject.ownership === "owned"}
                collaborators={share.collaborators}
                isLoading={share.isLoading}
                loadError={share.loadError}
                email={share.email}
                canInvite={share.canInvite}
                isInviting={share.isInviting}
                inviteError={share.inviteError}
                removingId={share.removingId}
                removeError={share.removeError}
                isLinkCopied={share.isLinkCopied}
                copyError={share.copyError}
                onEmailChange={share.setEmail}
                onOpenChange={(open) => {
                  if (!open) {
                    share.close();
                  }
                }}
                onInvite={share.invite}
                onRemove={share.remove}
                onCopyLink={share.copyLink}
              />
            ) : null}
          </div>
        </CanvasSaveProvider>
      </StarterTemplatesProvider>
    </ProjectDialogsProvider>
  );
}
