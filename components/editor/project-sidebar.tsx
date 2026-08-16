"use client";

import { FolderOpen, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import Link from "next/link";

import { useProjectDialogActions } from "@/components/editor/project-dialogs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  /** Projects the user owns. Fetched server-side; both lists arrive as props. */
  ownedProjects: Project[];
  /** Projects shared with the user by a collaborator invite. */
  sharedProjects: Project[];
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

/**
 * Placeholder for a tab whose list is empty. Centred in the tab's full height,
 * so the panel does not collapse when a user has no projects in one of them.
 */
function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
      <span className="text-copy-faint">{icon}</span>
      <p className="text-sm font-medium text-copy-secondary">{title}</p>
      <p className="text-xs text-copy-muted">{description}</p>
    </div>
  );
}

interface ProjectListItemProps {
  project: Project;
  onOpen: () => void;
  onRename: (project: Project) => void;
  onDelete: (project: Project) => void;
}

/**
 * A single project row. Rename and delete are rendered only for owned
 * projects — a collaborator sees the project, not the actions on it.
 */
function ProjectListItem({
  project,
  onOpen,
  onRename,
  onDelete,
}: ProjectListItemProps) {
  const isOwned = project.ownership === "owned";

  return (
    <li className="flex items-center gap-1 rounded-xl px-2 py-2 transition-colors hover:bg-subtle">
      {/* Name only. The ID is a URL detail — it surfaces in the Create Project
          dialog's room ID preview, not in the list. */}
      <Link
        href={`/editor/${project.id}`}
        onClick={onOpen}
        className="min-w-0 flex-1 truncate text-sm text-copy-primary"
      >
        {project.name}
      </Link>

      {isOwned ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onRename(project)}
            aria-label={`Rename ${project.name}`}
          >
            <Pencil className="h-3.5 w-3.5 text-copy-muted" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(project)}
            aria-label={`Delete ${project.name}`}
          >
            <Trash2 className="h-3.5 w-3.5 text-copy-muted" />
          </Button>
        </div>
      ) : null}
    </li>
  );
}

/**
 * Floating project sidebar. It is absolutely positioned, so it overlays the
 * editor canvas instead of pushing it — the parent must be `relative`. Closed
 * state slides the panel off the left edge rather than unmounting it.
 */
export function ProjectSidebar({
  isOpen,
  onClose,
  ownedProjects,
  sharedProjects,
}: ProjectSidebarProps) {
  const { openCreate, openRename, openDelete } = useProjectDialogActions();

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
          {ownedProjects.length > 0 ? (
            <ul className="flex flex-col gap-0.5 p-2">
              {ownedProjects.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  onOpen={onClose}
                  onRename={openRename}
                  onDelete={openDelete}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<FolderOpen className="h-8 w-8" />}
              title="No projects yet"
              description="Projects you create will show up here."
            />
          )}
        </TabsContent>

        <TabsContent value="shared" className="min-h-0 overflow-y-auto">
          {sharedProjects.length > 0 ? (
            <ul className="flex flex-col gap-0.5 p-2">
              {sharedProjects.map((project) => (
                <ProjectListItem
                  key={project.id}
                  project={project}
                  onOpen={onClose}
                  onRename={openRename}
                  onDelete={openDelete}
                />
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="Nothing shared with you"
              description="Projects shared by collaborators will show up here."
            />
          )}
        </TabsContent>
      </Tabs>

      <div className="border-t border-surface-border p-3">
        <Button className="w-full" size="lg" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </div>
    </aside>
  );
}
