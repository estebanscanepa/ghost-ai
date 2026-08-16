"use client";

import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectDialogsProvider } from "@/components/editor/project-dialogs";
import { ProjectSidebar } from "@/components/editor/project-sidebar";
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
 * The `<main>` is `relative` on purpose: `ProjectSidebar` positions itself
 * absolutely against it so opening the panel overlays the canvas instead of
 * reflowing it.
 *
 * `ProjectDialogsProvider` wraps everything because both the sidebar (in the
 * layout) and the `New Project` button (in the page) open the same dialogs.
 */
export function EditorShell({
  children,
  ownedProjects,
  sharedProjects,
}: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ProjectDialogsProvider>
      <div className="flex h-dvh flex-col overflow-hidden bg-base">
        <EditorNavbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
        />

        <main className="relative min-h-0 flex-1 overflow-hidden">
          {/* Mobile-only scrim: tapping outside the panel closes it. On wider
              screens the sidebar overlays the canvas without blocking it. */}
          <button
            type="button"
            inert={!isSidebarOpen}
            aria-label="Close project sidebar"
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              "absolute inset-0 z-20 bg-background/70 backdrop-blur-[2px] transition-opacity duration-200 md:hidden",
              isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          />

          <ProjectSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            ownedProjects={ownedProjects}
            sharedProjects={sharedProjects}
          />
          {children}
        </main>
      </div>
    </ProjectDialogsProvider>
  );
}
