"use client";

import { useState } from "react";

import { EditorNavbar } from "@/components/editor/editor-navbar";
import { ProjectSidebar } from "@/components/editor/project-sidebar";

interface EditorShellProps {
  children: React.ReactNode;
}

/**
 * Client half of the editor layout. It exists because `isSidebarOpen` is shared
 * between the navbar toggle and the sidebar itself, so the state has to live
 * above both — but the route layout should stay a Server Component.
 *
 * The `<main>` is `relative` on purpose: `ProjectSidebar` positions itself
 * absolutely against it so opening the panel overlays the canvas instead of
 * reflowing it.
 */
export function EditorShell({ children }: EditorShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-base">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((open) => !open)}
      />

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <ProjectSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        {children}
      </main>
    </div>
  );
}
