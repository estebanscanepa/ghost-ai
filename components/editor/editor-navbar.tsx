"use client";

import { UserButton } from "@clerk/nextjs";
import {
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Share2,
  Sparkles,
} from "lucide-react";

import { CanvasSaveButton } from "@/components/editor/canvas-save-button";
import { useStarterTemplates } from "@/components/editor/starter-templates-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  /**
   * The project whose workspace is open, or `null` on the editor home. It is
   * what the title and the project-scoped actions render from — there is
   * nothing to share or to design against without one.
   */
  project: Project | null;
  /** Opens the share dialog for the project above. */
  onOpenShare: () => void;
  isAiSidebarOpen: boolean;
  onToggleAiSidebar: () => void;
}

/**
 * Top chrome for every editor screen. Fixed height so the canvas below it can
 * claim the remaining viewport. The centre names the open project; the right
 * section holds either the project actions or Clerk's account menu, depending on
 * which of the two screens this is rendering for.
 */
export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
  project,
  onOpenShare,
  isAiSidebarOpen,
  onToggleAiSidebar,
}: EditorNavbarProps) {
  const ToggleIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  /**
   * Read from context rather than taken as a prop, unlike `onOpenShare` beside
   * it: the modal this opens is mounted by the canvas, inside the Liveblocks
   * room, so the state has to cross the layout/page boundary. Same reason the
   * project dialogs are reached that way — see `useStarterTemplates`.
   */
  const starterTemplates = useStarterTemplates();

  return (
    <header className="z-50 flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-3">
      <div className="flex flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={
            isSidebarOpen ? "Hide project sidebar" : "Show project sidebar"
          }
        >
          <ToggleIcon className="h-5 w-5 text-copy-secondary" />
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center px-2">
        {project ? (
          <h1 className="truncate text-sm font-medium text-copy-primary">
            {project.name}
          </h1>
        ) : null}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {project ? (
          <>
            {/* Ahead of both dialogs: what the editor has stored is read before
                a template is imported or the project is shared. It carries the
                autosave status as well as triggering a save — see
                `CanvasSaveButton`. */}
            <CanvasSaveButton />

            {/* Ahead of Share, in the order the two are reached for: a template
                is imported while a diagram is being started, and it is shared
                once there is something on the canvas to share. */}
            <Button
              variant="outline"
              size="sm"
              onClick={starterTemplates.open}
              aria-expanded={starterTemplates.isOpen}
            >
              <LayoutTemplate className="h-4 w-4" />
              Templates
            </Button>

            {/* Rendered for collaborators too: they get the dialog read-only,
                which is where they can see who else has access. */}
            <Button variant="outline" size="sm" onClick={onOpenShare}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleAiSidebar}
              aria-pressed={isAiSidebarOpen}
              aria-label={
                isAiSidebarOpen ? "Hide AI sidebar" : "Show AI sidebar"
              }
            >
              <Sparkles
                className={cn(
                  "h-5 w-5",
                  isAiSidebarOpen ? "text-ai-text" : "text-copy-secondary",
                )}
              />
            </Button>
          </>
        ) : (
          /* Editor home only. In a workspace the account menu is the canvas's
             presence group instead — it ends in a `UserButton` of its own, as
             the current user's face among the collaborators in the room (see
             `components/canvas/presence-avatars.tsx`), so a second one here
             would be the same menu twice in the same corner.

             `project` is null on the access-denied screen too, which is the
             behaviour we want: that route mounts no canvas, so it has no
             presence group, and this stays the only way out to the account
             menu. */
          <UserButton />
        )}
      </div>
    </header>
  );
}
