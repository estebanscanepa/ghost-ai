"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import { cn } from "@/lib/utils";

/**
 * A node's label, and the editor that replaces it in place.
 *
 * Lives in the label area `NodeShapeFrame` leaves for it, which is why this is
 * its own module rather than part of the frame: the frame decides *where* text
 * may go for a given geometry, and that answer is the same whether the text is
 * being read or typed. What changes between those two states — a caret, a
 * placeholder, a textarea that must not drag the canvas — is all here.
 *
 * The label is controlled from the node record, so every keystroke goes out
 * through the same node-change flow a drag or a resize does, and a collaborator
 * sees the text as it is typed rather than when the editor closes.
 */

/**
 * Shown in the label's place while it is empty, and as the textarea's
 * placeholder while it is being edited — the same words in the same position,
 * so opening the editor on a blank node does not appear to change anything.
 */
const NODE_LABEL_PLACEHOLDER = "Add label";

interface NodeLabelProps {
  label: string;
  /** Whether the editor is open. Owned by the node, not by this component. */
  editing: boolean;
  /** Called on every keystroke. */
  onLabelChange: (label: string) => void;
  /** Opens on double-click, closes on blur or `Escape`. */
  onEditingChange: (editing: boolean) => void;
}

export function NodeLabel({
  label,
  editing,
  onLabelChange,
  onEditingChange,
}: NodeLabelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * A callback ref rather than an effect, so focus lands in the same commit the
   * textarea is mounted in — an effect would leave a frame where the editor is
   * open and the caret is still on the canvas. Selecting the existing text is
   * the useful default for a double-click: the gesture means "this label", and
   * typing then replaces it rather than appending to it.
   */
  const focusOnMount = useCallback((textarea: HTMLTextAreaElement | null) => {
    textareaRef.current = textarea;
    if (!textarea) return;

    textarea.focus();
    textarea.select();
  }, []);

  /**
   * A textarea has a fixed row count, and the label it is standing in for is
   * centred and wraps — so the box is measured back to its own content on every
   * change and stays the height of the text inside it. That is what keeps
   * opening the editor from moving the words: the visible label and the caret
   * occupy the same centred lines. `max-h-full` clamps it to the label area, at
   * which point the textarea scrolls, exactly as a too-long label is clipped.
   *
   * A layout effect rather than an effect because this runs before paint; the
   * effect version flashes a one-row textarea for a frame.
   */
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [editing, label]);

  const handleDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      /* React Flow zooms the viewport on double-click. This one is addressed to
         the label, so it stops here rather than reaching the pane. */
      event.stopPropagation();
      onEditingChange(true);
    },
    [onEditingChange],
  );

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      onLabelChange(event.target.value);
    },
    [onLabelChange],
  );

  const handleBlur = useCallback(() => {
    onEditingChange(false);
  }, [onEditingChange]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      /* Every key stops here, not just `Escape`. React Flow's shortcuts are
         document-level listeners, and while a label is being typed into, none
         of them are meant for the canvas — `Backspace` is a correction, not a
         delete, and `Escape` closes this editor rather than clearing the
         selection. React dispatches from the root container, so stopping the
         synthetic event stops the native one before `document` sees it. */
      event.stopPropagation();

      if (event.key === "Escape") {
        event.preventDefault();
        onEditingChange(false);
      }
    },
    [onEditingChange],
  );

  return (
    /* Fills the label area rather than hugging the text, so the whole centre of
       the node is the double-click target — a short label on a large node would
       otherwise leave most of it dead. Deliberately *not* `nodrag`: pressing
       here and moving still drags the node, which is how a node is picked up by
       its middle.

       `relative` makes this the editor's positioning context rather than the
       label box `NodeShapeFrame` renders around it. The difference is real and
       was measured: two of the six geometries hold their label off the edge with
       padding (`px-3` on the rectangle, `px-5` on the pill), and an absolute
       inset resolves against the *padding* box — so an editor anchored one level
       up came out 24px and 40px wider than the label it was standing in for, and
       put text over a pill's curved end. Anchored here it is the label's own box,
       to the pixel. */
    <div
      className="relative flex h-full w-full items-center justify-center"
      onDoubleClick={handleDoubleClick}
    >
      {/* Hidden rather than unmounted while editing, so the label area keeps the
          height it had and the node does not reflow around the editor. */}
      <span className={cn("w-full break-words", editing && "invisible")}>
        {label || (
          <span className="text-copy-muted">{NODE_LABEL_PLACEHOLDER}</span>
        )}
      </span>

      {editing ? (
        /* The centring flex is what puts a one-line textarea on the same line
           the label was on; without it the caret starts at the top of the box
           and the words move on the way into edit mode. */
        <div className="absolute inset-0 flex items-center justify-center">
          <textarea
            ref={focusOnMount}
            value={label}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={NODE_LABEL_PLACEHOLDER}
            aria-label="Node label"
            /* `nodrag` lets the pointer select text instead of picking the node
               up; `nopan` keeps the same gesture from panning the canvas. Both
               are React Flow's own opt-out class names.

               `text-inherit` rather than a token: the node's colour pair puts its
               text colour on the label box (`NodeShapeFrame`), and a browser
               gives a textarea a colour of its own, so this is what makes the
               caret and the typed characters match the label they replace. The
               placeholder stays `--text-muted` — the same grey the read state's
               placeholder uses, so opening the editor on a blank node changes
               nothing. */
            className="nodrag nopan max-h-full w-full resize-none border-none bg-transparent p-0 text-center text-sm leading-tight text-inherit outline-none placeholder:text-copy-muted"
          />
        </div>
      ) : null}
    </div>
  );
}
