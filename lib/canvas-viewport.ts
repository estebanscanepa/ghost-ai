/**
 * How long a programmatic viewport change takes, in milliseconds.
 *
 * React Flow jumps the viewport instantly when no `duration` is given, which
 * reads as the graph teleporting rather than the camera moving — after a
 * `fitView` there is nothing on screen to tell you which way it went. 200ms is
 * long enough to see the direction of travel and short enough that holding the
 * zoom shortcut still feels like a zoom rather than a queue of animations.
 *
 * Shared rather than passed around, because the control bar and the keyboard
 * shortcuts are two ways to trigger the same three actions: a button press and
 * its shortcut must not move the canvas at two different speeds.
 */
export const CANVAS_VIEWPORT_DURATION = 200;
