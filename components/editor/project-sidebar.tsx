"use client";

import { FolderOpen, Plus, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="text-copy-faint">{icon}</span>
      <p className="text-sm font-medium text-copy-secondary">{title}</p>
      <p className="text-xs text-copy-muted">{description}</p>
    </div>
  );
}

/**
 * Floating project sidebar. It is absolutely positioned, so it overlays the
 * editor canvas instead of pushing it — the parent must be `relative`. Closed
 * state slides the panel off the left edge rather than unmounting it.
 */
export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={cn(
        "absolute inset-y-3 left-3 z-30 flex w-72 flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface/95 backdrop-blur transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%+1rem)]"
      )}
    >
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Close project sidebar"
        >
          <X className="h-4 w-4 text-copy-muted" />
        </Button>
      </div>

      <Tabs defaultValue="my-projects" className="min-h-0 flex-1 gap-0">
        <TabsList variant="line" className="w-full gap-2 px-4 py-2">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>

        <TabsContent value="my-projects" className="min-h-0 overflow-y-auto">
          <EmptyState
            icon={<FolderOpen className="h-8 w-8" />}
            title="No projects yet"
            description="Projects you create will show up here."
          />
        </TabsContent>

        <TabsContent value="shared" className="min-h-0 overflow-y-auto">
          <EmptyState
            icon={<Users className="h-8 w-8" />}
            title="Nothing shared with you"
            description="Projects shared by collaborators will show up here."
          />
        </TabsContent>
      </Tabs>

      <div className="border-t border-surface-border p-3">
        <Button className="w-full" size="lg">
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  );
}
