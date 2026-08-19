"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import {
  IDLE_CANVAS_SAVE_STATE,
  type CanvasSaveState,
} from "@/types/canvas-save";

/**
 * The channel between the canvas's autosave and the navbar's Save button.
 *
 * Context for the same reason as `useStarterTemplates`: the two halves are on
 * opposite sides of the route boundary. Autosave has to run inside the Liveblocks
 * room, which the editor *page* renders, because the graph it watches is owned by
 * `useLiveblocksFlow` there — and the button is in the navbar, which the editor
 * *layout* renders. No prop reaches from one to the other.
 *
 * It carries traffic both ways: the canvas reports what autosave is doing, and the
 * button asks for a save. The asking side is a registered callback rather than a
 * flag the canvas watches, because a save has to happen *now* and reading a flag
 * would put a render in the middle of it.
 */
export interface CanvasSaveController extends CanvasSaveState {
  /**
   * Published by the canvas on every autosave transition. Referentially stable for
   * the life of the provider — autosave depends on it, and a callback that changed
   * identity on each status change would restart its debounce every time it
   * announced something.
   */
  report: (state: CanvasSaveState) => void;
  /**
   * Hands the shell a way to save on demand, or `null` on the way out. Writes a
   * ref rather than state, so the canvas can call it from an effect.
   */
  registerSave: (save: (() => void) | null) => void;
  /** The Save button's click. Does nothing when no canvas is mounted to answer it. */
  requestSave: () => void;
}

const CanvasSaveContext = createContext<CanvasSaveController | null>(null);

/** Reads the shared save state. Available to the navbar and to the canvas alike. */
export function useCanvasSave(): CanvasSaveController {
  const controller = useContext(CanvasSaveContext);

  if (!controller) {
    throw new Error("useCanvasSave must be used inside <CanvasSaveProvider>");
  }

  return controller;
}

interface CanvasSaveProviderProps {
  children: React.ReactNode;
  /**
   * The open project, or `null` on the editor home. The state is reset when it
   * changes — a save status belongs to one canvas.
   */
  projectId: string | null;
}

export function CanvasSaveProvider({
  children,
  projectId,
}: CanvasSaveProviderProps) {
  const [state, setState] = useState<CanvasSaveState>(IDLE_CANVAS_SAVE_STATE);

  const saveRef = useRef<(() => void) | null>(null);

  const report = useCallback((next: CanvasSaveState) => {
    setState(next);
  }, []);

  const registerSave = useCallback((save: (() => void) | null) => {
    saveRef.current = save;
  }, []);

  const requestSave = useCallback(() => {
    saveRef.current?.();
  }, []);

  /**
   * Nothing here may outlive the project it belongs to. This provider sits in
   * `EditorShell`, which stays mounted across `/editor` navigations, so without
   * this the next project would open showing the previous one's `Saved`.
   *
   * The reset-on-prop-change pattern rather than an effect, for the reasons
   * `useShareDialog` spells out: it runs during the render that first sees the new
   * project, so no frame is painted in which the button and the canvas disagree —
   * and `setState` in an effect body is an error under
   * `react-hooks/set-state-in-effect` anyway.
   *
   * `saveRef` is deliberately left alone: it is cleared and re-registered by the
   * canvas's own mount and unmount, which is the only thing that knows whether
   * there is a canvas to save.
   */
  const [trackedProjectId, setTrackedProjectId] = useState(projectId);

  if (trackedProjectId !== projectId) {
    setTrackedProjectId(projectId);
    setState(IDLE_CANVAS_SAVE_STATE);
  }

  const controller = useMemo<CanvasSaveController>(
    () => ({ ...state, report, registerSave, requestSave }),
    [registerSave, report, requestSave, state],
  );

  return (
    <CanvasSaveContext value={controller}>{children}</CanvasSaveContext>
  );
}
