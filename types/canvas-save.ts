/**
 * The state the editor's Save button renders.
 *
 * Its own module because the two halves of it sit on opposite sides of the route
 * boundary: autosave runs inside the Liveblocks room, which the editor *page*
 * renders, and the button is in the navbar, which the editor *layout* renders.
 * `components/editor/canvas-save-provider.tsx` is the channel between them.
 */
export type CanvasSaveStatus = "idle" | "saving" | "saved" | "error";

export interface CanvasSaveState {
  status: CanvasSaveStatus;
  /**
   * Why the last attempt failed. Only ever set alongside `error` — the other
   * three states have nothing to explain.
   */
  message: string | null;
}

/** Before anything has been saved in this room: the button offers a save and claims nothing. */
export const IDLE_CANVAS_SAVE_STATE: CanvasSaveState = {
  status: "idle",
  message: null,
};
