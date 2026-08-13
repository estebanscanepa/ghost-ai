"use client";

import { UserButton } from "@clerk/nextjs";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

/**
 * Top chrome for every editor screen. Fixed height so the canvas below it can
 * claim the remaining viewport. The center section is an intentionally empty
 * placeholder for later chapters; the right section holds Clerk's account menu.
 */
export function EditorNavbar({
  isSidebarOpen,
  onToggleSidebar,
}: EditorNavbarProps) {
  const ToggleIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen;

  return (
    <header className="z-50 flex h-14 shrink-0 items-center border-b border-surface-border bg-surface px-3">
      <div className="flex flex-1 items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Hide project sidebar" : "Show project sidebar"}
        >
          <ToggleIcon className="h-5 w-5 text-copy-secondary" />
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center" />

      <div className="flex flex-1 items-center justify-end gap-2">
        <UserButton />
      </div>
    </header>
  );
}
