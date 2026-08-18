"use client";

import { createContext, useContext, useMemo, useState } from "react";

/** Whether the starter template picker is open, and the two ways to change that. */
interface StarterTemplatesController {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const StarterTemplatesContext =
  createContext<StarterTemplatesController | null>(null);

/**
 * Reads the shared open state of the starter template picker.
 *
 * Context for the same reason as `useProjectDialogActions`: the two halves of
 * this feature sit on opposite sides of the route boundary. The button is in the
 * navbar, which the editor *layout* renders, and the modal is mounted by the
 * canvas, which the editor *page* renders — so there is no prop that reaches from
 * one to the other.
 *
 * The modal belongs to the canvas rather than to the shell on purpose: importing
 * a template is a write to the room's graph, and the graph is owned by
 * `useLiveblocksFlow` inside `CollaborativeCanvas`. Keeping the modal there means
 * the picked template goes straight into the existing node and edge flow instead
 * of being relayed back down through a registered callback.
 */
export function useStarterTemplates(): StarterTemplatesController {
  const controller = useContext(StarterTemplatesContext);

  if (!controller) {
    throw new Error(
      "useStarterTemplates must be used inside <StarterTemplatesProvider>",
    );
  }

  return controller;
}

interface StarterTemplatesProviderProps {
  children: React.ReactNode;
}

/**
 * Holds the picker's open state for the whole editor. It renders no dialog of its
 * own — unlike `ProjectDialogsProvider` — because the modal has to be inside the
 * Liveblocks room to write into it, and the room is scoped to the workspace
 * route rather than to this shell.
 */
export function StarterTemplatesProvider({
  children,
}: StarterTemplatesProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const controller = useMemo<StarterTemplatesController>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen],
  );

  return (
    <StarterTemplatesContext value={controller}>
      {children}
    </StarterTemplatesContext>
  );
}
