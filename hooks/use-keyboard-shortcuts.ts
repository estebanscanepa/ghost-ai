"use client";

import type { ReactFlowInstance } from "@xyflow/react";
import { useEffect } from "react";

import { CANVAS_VIEWPORT_DURATION } from "@/lib/canvas-viewport";

/**
 * The part of the React Flow instance this hook actually uses.
 *
 * Narrowed at the boundary rather than taking the whole instance as-is: the
 * shortcuts only move the camera, and neither `zoomIn` nor `zoomOut` mentions
 * the node or edge type parameters, so the hook stays free of the canvas schema
 * and any instance is assignable to it.
 */
type CanvasZoomControls = Pick<ReactFlowInstance, "zoomIn" | "zoomOut">;

interface KeyboardShortcutsOptions {
  reactFlow: CanvasZoomControls;
  /** Called for `Cmd/Ctrl + Z`. */
  onUndo: () => void;
  /** Called for `Cmd/Ctrl + Shift + Z` and `Cmd/Ctrl + Y`. */
  onRedo: () => void;
}

/** Form controls that own their own keystrokes. */
const EDITABLE_TAG_NAMES = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/**
 * Whether the keystroke belongs to something being typed into.
 *
 * The canvas has three text surfaces already — a node's label editor, an edge's
 * label editor, and the share dialog's invite field — and every one of them
 * would break under these shortcuts: `-` would zoom the canvas out instead of
 * typing a hyphen, and `Cmd + Z` would undo a collaborator's node instead of the
 * character just typed. `isContentEditable` covers the rich-text surfaces the AI
 * sidebar may bring, which are not tags at all.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (EDITABLE_TAG_NAMES.has(target.tagName)) return true;

  return target.isContentEditable;
}

/**
 * The canvas keyboard shortcuts: zoom, undo, redo.
 *
 * Bound to `window` rather than to the React Flow pane, because a shortcut is
 * expected to work while the pointer is over the sidebar or the navbar — the
 * pane only receives keystrokes while it holds focus, which it loses the moment
 * anything else on the page is clicked.
 *
 * The handlers are the same ones the control bar's buttons call. Nothing is
 * duplicated here: this hook is a second way to reach those actions, not a
 * second implementation of them.
 */
export function useKeyboardShortcuts({
  reactFlow,
  onUndo,
  onRedo,
}: KeyboardShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      /* Cmd on macOS, Ctrl elsewhere. Accepting either rather than sniffing the
         platform: a Ctrl-based shortcut on a Mac collides with nothing here. */
      if (event.metaKey || event.ctrlKey) {
        /* `Shift + Z` produces `Z`, so the key has to be folded before it is
           compared — otherwise redo would never match. */
        const key = event.key.toLowerCase();

        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) onRedo();
          else onUndo();
          return;
        }

        if (key === "y") {
          event.preventDefault();
          onRedo();
        }

        /* Every other modified keystroke is the browser's — `Cmd + R`, and
           `Cmd + -`, which is page zoom and deliberately not canvas zoom. */
        return;
      }

      /* `+` and `=` are the same physical key; which one arrives depends on
         whether Shift is held, so both are accepted and neither requires it. */
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        void reactFlow.zoomIn({ duration: CANVAS_VIEWPORT_DURATION });
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        void reactFlow.zoomOut({ duration: CANVAS_VIEWPORT_DURATION });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reactFlow, onUndo, onRedo]);
}
