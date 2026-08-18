"use client";

import { useCallback, useState, type KeyboardEvent, type MouseEvent } from "react";

import { cn } from "@/lib/utils";

/**
 * An edge's label — the badge, the hint that offers one, and the editor that
 * replaces both in place.
 *
 * Its own module for the same reason `NodeLabel` is: `CanvasEdge` decides
 * *where* the text goes, which is the midpoint `getSmoothStepPath` returns for
 * the path it drew, and everything about *what* the text looks like and how it
 * is changed lives here.
 *
 * Everything this renders is portalled by `EdgeLabelRenderer`, which is a plain
 * `<div>` inside React Flow's viewport — so a label is HTML rather than SVG and
 * can be an input, and it pans and zooms with the canvas because it is inside
 * the viewport's transform. That container is `pointer-events: none` and
 * `user-select: none`, so anything here that has to be clicked or typed into
 * has to turn both back on for itself.
 */

/**
 * Shown as the hint on an active unlabelled edge, and as the editor's
 * placeholder — the same words in the same place, so opening the editor on an
 * unlabelled edge does not appear to change anything. It is also what sizes the
 * empty editor, which is why the two have to agree.
 */
const EDGE_LABEL_PLACEHOLDER = "Add label";

/**
 * The pill every state wears. One shape and one type ramp for the badge, the
 * hint, and the editor, so the label does not resize or jump as it moves
 * between them — only its border and its text colour change.
 *
 * `rounded-full` and the elevated surface are the same treatment the shape panel
 * and the colour toolbar use: this is the third floating thing on the canvas and
 * the three should read as one family.
 */
const EDGE_LABEL_PILL =
  "rounded-full border px-2 py-0.5 text-xs leading-tight backdrop-blur";

interface EdgeLabelProps {
  /** The edge's stored label. `""` when it has none. */
  label: string;
  /**
   * The path's midpoint in flow coordinates, straight from `getSmoothStepPath`.
   * Not computed here and not computed by the edge either — the midpoint of a
   * right-angled path is a property of the routing, and the function that did
   * the routing is the only thing that knows it.
   */
  x: number;
  y: number;
  /**
   * Whether the edge is hovered, selected, or being edited. An unlabelled edge
   * shows its hint only while this is true; a labelled one is always shown.
   */
  active: boolean;
  editing: boolean;
  /** Called once per edit, with the committed text. */
  onLabelChange: (label: string) => void;
  onEditingChange: (editing: boolean) => void;
  /**
   * The pill sits on top of the edge it belongs to, so the pointer reaching it
   * leaves the edge's own hit area. Without this the hint would disappear from
   * under the pointer on the way to being clicked.
   */
  onHoverChange: (hovered: boolean) => void;
}

export function EdgeLabel({
  label,
  x,
  y,
  active,
  editing,
  onLabelChange,
  onEditingChange,
  onHoverChange,
}: EdgeLabelProps) {
  const handleDoubleClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      /* The pill covers the edge's own double-click target, so it has to open
         the editor itself or double-clicking the label would do nothing. */
      event.stopPropagation();
      onEditingChange(true);
    },
    [onEditingChange],
  );

  const handleDone = useCallback(
    (value: string) => {
      onLabelChange(value);
      onEditingChange(false);
    },
    [onEditingChange, onLabelChange],
  );

  /* Nothing to show: an unlabelled edge nobody is pointing at is just a line.
     Returning null rather than rendering a transparent pill also keeps the
     canvas free of invisible click targets, one per edge. */
  if (!editing && !label && !active) return null;

  return (
    /* `translate(-50%, -50%)` first, then the midpoint: the two transforms
       compose right-to-left, so the pill is moved to the midpoint and then
       pulled back by half its own size, which centres it on the path whatever
       its width. `absolute` against the renderer, which fills the viewport.

       `nodrag` and `nopan` are what keep a click here off the canvas. `nopan`
       is the load-bearing one — `@xyflow/system`'s `createFilter` rejects any
       pan *or double-click zoom* whose target is wrapped in the class, and the
       renderer this is portalled into sits inside the element d3-zoom is bound
       to. Without it, opening the editor would also zoom the viewport. */
    <div
      className="nodrag nopan pointer-events-auto absolute"
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)` }}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      {editing ? (
        <EdgeLabelInput label={label} onDone={handleDone} />
      ) : (
        <div
          className={cn(
            EDGE_LABEL_PILL,
            label
              ? "border-surface-border bg-elevated/95 text-copy-secondary"
              : /* The hint is the same pill worn faintly: a dashed border and
                   the faintest text on the ramp, so it reads as an offer rather
                   than as a label somebody already wrote. */
                "border-dashed border-surface-border bg-elevated/80 text-copy-faint",
          )}
        >
          {label || EDGE_LABEL_PLACEHOLDER}
        </div>
      )}
    </div>
  );
}

interface EdgeLabelInputProps {
  label: string;
  /** Commits the text and closes the editor. */
  onDone: (label: string) => void;
}

/**
 * The editor, mounted only while editing.
 *
 * Mounting is what seeds the draft, which is why this is a separate component:
 * `useState(label)` runs once, on open, so there is no effect keeping a draft in
 * sync with a prop and no window where the two disagree. Unlike a node's label,
 * which goes out on every keystroke, an edge's is committed at the end — the
 * spec asks for it to be saved on blur, `Enter`, or `Escape`, and all three do
 * the same thing here. `Escape` saves rather than cancels because that is what
 * was asked for; there is deliberately no third outcome hiding behind it.
 */
function EdgeLabelInput({ label, onDone }: EdgeLabelInputProps) {
  const [draft, setDraft] = useState(label);

  const focusOnMount = useCallback((input: HTMLInputElement | null) => {
    /* A callback ref rather than an effect, so focus lands in the same commit
       the input is mounted in. Selecting the text makes typing replace it,
       which is the useful reading of a double-click on an existing label. */
    input?.focus();
    input?.select();
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      /* Every key stops here, not just the two that close the editor. React
         Flow's shortcuts are document-level listeners and none of them are
         meant for a field being typed into — `Backspace` is a correction, not
         a request to delete the edge. */
      event.stopPropagation();

      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        onDone(draft);
      }
    },
    [draft, onDone],
  );

  return (
    /* The input grows with its text by sharing one grid cell with a hidden copy
       of that text: the cell is as wide as the widest thing in it, which is the
       copy, and the input stretches to fill it. The alternative — a `ch` width
       from `value.length` — is wrong for every proportional font, and this app's
       type is Geist Sans. The copy falls back to the placeholder so an empty
       editor is the width of the hint it replaced rather than collapsing.

       `select-text` because the renderer this is portalled into sets
       `user-select: none` on everything inside it. */
    <div
      className={cn(
        EDGE_LABEL_PILL,
        "grid select-text items-center border-brand bg-elevated text-copy-primary shadow-lg",
      )}
    >
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 whitespace-pre"
      >
        {draft || EDGE_LABEL_PLACEHOLDER}
      </span>
      <input
        ref={focusOnMount}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => onDone(draft)}
        onKeyDown={handleKeyDown}
        placeholder={EDGE_LABEL_PLACEHOLDER}
        aria-label="Edge label"
        /* `size={1}` is what makes the grid trick work, and it was measured:
           an input's default `size` of 20 gives it a max-content width of about
           150px, and a grid track is at least as wide as the widest thing in
           it — so without this the pill opens 150px wide and does not move
           until the label outgrows that. One character hands the sizing to the
           hidden copy, where it belongs. */
        size={1}
        className="col-start-1 row-start-1 w-full min-w-0 border-none bg-transparent p-0 text-center outline-none placeholder:text-copy-faint"
      />
    </div>
  );
}
