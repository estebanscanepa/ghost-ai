# UI Context

## Theme

Dark only. No light mode. The visual language is a dark technical workspace — near-black backgrounds, layered surfaces, and vivid accent colors for interactive elements.

All colors are defined as CSS custom properties in `globals.css` and mapped to Tailwind tokens via `@theme inline`. Components must use these tokens — no hardcoded hex values or raw Tailwind color classes like `zinc-*`.

| Role             | CSS Variable           | Hex / Value               |
| ---------------- | ---------------------- | ------------------------- |
| Page background  | `--bg-base`            | `#080809`                 |
| Surface          | `--bg-surface`         | `#111114`                 |
| Elevated surface | `--bg-elevated`        | `#18181c`                 |
| Subtle surface   | `--bg-subtle`          | `#1e1e23`                 |
| Default border   | `--border-default`     | `#2a2a30`                 |
| Subtle border    | `--border-subtle`      | `#3a3a42`                 |
| Primary text     | `--text-primary`       | `#f0f0f4`                 |
| Secondary text   | `--text-secondary`     | `#c0c0cc`                 |
| Muted text       | `--text-muted`         | `#808090`                 |
| Faint text       | `--text-faint`         | `#505060`                 |
| Brand accent     | `--accent-primary`     | `#00c8d4` (cyan)          |
| Brand dim        | `--accent-primary-dim` | `rgba(0, 200, 212, 0.12)` |
| AI accent        | `--accent-ai`          | `#6457f9` (indigo-purple) |
| AI text          | `--accent-ai-text`     | `#8b82ff`                 |
| Error            | `--state-error`        | `#ff4d4f`                 |
| Success          | `--state-success`      | `#34d399`                 |
| Warning          | `--state-warning`      | `#fbbf24`                 |

Tailwind utility names map to these variables. Use `bg-base`, `bg-surface`, `text-copy-primary`, `text-copy-muted`, `border-surface-border`, `text-brand`, `bg-accent-dim`, etc.

## Typography

| Role      | Font       | CSS Variable        |
| --------- | ---------- | ------------------- |
| UI text   | Geist Sans | `--font-geist-sans` |
| Code/mono | Geist Mono | `--font-geist-mono` |

Both fonts are loaded via `next/font/google` and applied as CSS variables on the `<html>` element. The base `body` uses Geist Sans with `antialiased`.

## Border Radius

Radius increases with surface depth — smaller for inner elements, larger for outer containers.

| Context           | Class         |
| ----------------- | ------------- |
| Inline / small UI | `rounded-xl`  |
| Cards / panels    | `rounded-2xl` |
| Modal / overlay   | `rounded-3xl` |

## Canvas

### Node Color Palette

8 defined color pairs. Each pair specifies a dark node fill and a vivid contrasting text color tuned for readability on the dark canvas. Defined in `types/canvas.ts` as `NODE_COLORS`.

| Node fill | Text color | Character              |
| --------- | ---------- | ---------------------- |
| `#1F1F1F` | `#EDEDED`  | Neutral dark (default) |
| `#10233D` | `#52A8FF`  | Blue                   |
| `#2E1938` | `#BF7AF0`  | Purple                 |
| `#331B00` | `#FF990A`  | Orange                 |
| `#3C1618` | `#FF6166`  | Red                    |
| `#3A1726` | `#F75F8F`  | Pink                   |
| `#0F2E18` | `#62C073`  | Green                  |
| `#062822` | `#0AC7B4`  | Teal                   |

Default node color: `#1F1F1F` with `#EDEDED` text.

A node stores the palette entry's `id`, not the two hex values, and the pair is
resolved when the node is drawn (`resolveNodeColor`). Background and text color
always change together — there is no way to set one without the other.

### Node Color Toolbar

A floating pill above the selected node, mounted as a React Flow `NodeToolbar`
16px above the node's top edge so it clears the top connection handle. One
circular swatch per color pair, 20px, showing the pair's fill as its background
and its text color as a dot inside it — the vivid half is what tells two dark
fills apart.

- Active swatch: a ring in its own text color, held off the swatch by 2px of the
  toolbar's surface.
- Hover: a tight glow in the swatch's text color — 5px blur, no spread.
- Toolbar surface: `bg-elevated/95`, `rounded-full`, `border-surface-border`,
  `backdrop-blur` — the same pill treatment as the shape panel, one step more
  elevated because it floats over a node rather than over the canvas.

The swatch hover and active states are rules in `globals.css` rather than
utilities: both are box-shadows built from the pair's hex, which arrives on the
element as `--swatch-accent`.

### Edge Style

Smooth-step path with an arrow marker — right-angle routing with corners rounded
to 8px. Stroke is `#f0f0f4` (`--text-primary`'s value) at 1.5px with round caps,
and the arrowhead is filled in the same colour. Thin on purpose: edges are
visually secondary to nodes.

The stroke, the width, the cap, and the marker are written onto the edge record
at creation (`DEFAULT_EDGE_OPTIONS` in `types/canvas.ts`) rather than applied by
the renderer, because a marker's colour has to be a literal — it becomes part of
the `<marker>` id React Flow references as `url(#…)`, where a `var(--…)` would
close the bracket early.

Edges rest at 0.55 opacity and go to full strength when hovered, selected, or
being labelled, over the canvas's usual 120ms. Opacity rather than stroke
opacity, so the arrowhead dims with the line it caps. An invisible 20px band
along the path takes the pointer, so an edge is easy to hit while staying 1.5px
wide.

### Edge Labels

Inline, on the path. Rendered through React Flow's `EdgeLabelRenderer` and
positioned on the midpoint `getSmoothStepPath` returns for the path it routed,
so the label follows the routing rather than a straight line between the ends.

Three states, all the same pill so the label does not resize as it moves between
them — `rounded-full`, `bg-elevated`, `text-xs`, `backdrop-blur`, the same family
as the shape panel and the colour toolbar:

- **Saved** — solid `border-surface-border`, `text-copy-secondary`.
- **Hint** — an unlabelled edge that is hovered or selected shows `Add label` in
  `text-copy-faint` behind a dashed border. An unlabelled edge at rest shows
  nothing.
- **Editing** — opened by double-clicking the edge or the label. A `border-brand`
  pill holding an input that grows with its text, saved on blur, `Enter`, or
  `Escape`.

### Node Shapes

6 supported shapes, defined in `types/canvas.ts` as `NODE_SHAPES`. Complex shapes (diamond, hexagon, cylinder) are rendered as inline SVGs rather than CSS borders.

- `rectangle` — default general-purpose node
- `diamond` — decision / gateway
- `circle` — event / endpoint
- `pill` — service / process
- `cylinder` — database / storage
- `hexagon` — external system / boundary

### Connection Handles

Small white circular handles, hidden by default, revealed on node hover. Appear at all four sides of a node.

### Canvas Controls

A floating pill at the bottom-left of the canvas, mounted as a React Flow
`Panel` — the same surface treatment as the shape panel (`rounded-full`,
`bg-surface/95`, `border-surface-border`, `backdrop-blur`, `shadow-lg`), because
the two sit on the same edge and read as one family.

Five 36px round buttons in two groups, separated by a 1px `bg-surface-border`
divider 20px tall:

- **Zoom** — zoom out, fit view, zoom in. Driven by the React Flow instance, so
  the transform stays clamped to `minZoom` / `maxZoom`.
- **History** — undo, redo. Driven by Liveblocks room history.

Icons are `h-5 w-5` Lucide strokes in `text-copy-secondary`, going to
`text-copy-primary` on `bg-subtle` on hover. A disabled history button drops to
`text-copy-faint` and loses its hover surface.

Every viewport move — button or shortcut — animates over
`CANVAS_VIEWPORT_DURATION` (200ms, `lib/canvas-viewport.ts`), so a button press
and its keyboard equivalent never move the canvas at two different speeds.

There is no minimap. The bottom-left corner it held is now the control bar, and
the opposite corner is overlaid by the AI sidebar.

### Keyboard Shortcuts

Bound to `window` by `hooks/use-keyboard-shortcuts.ts`, so a shortcut works
regardless of whether the React Flow pane holds focus. Skipped entirely while the
event target is an `input`, `textarea`, `select`, or a `contenteditable` element
— the node and edge label editors own their own keystrokes.

| Shortcut               | Action   |
| ---------------------- | -------- |
| `+` / `=`              | Zoom in  |
| `-`                    | Zoom out |
| `Cmd/Ctrl + Z`         | Undo     |
| `Cmd/Ctrl + Shift + Z` | Redo     |
| `Cmd/Ctrl + Y`         | Redo     |

`Cmd/Ctrl + -` is left to the browser as page zoom.

The shape panel's items are the one keyboard surface bound locally rather than on
`window`: they carry `role="button"`, so `Enter` and `Space` activate the focused
item and add that shape at the centre of the pane. `Space` is `preventDefault`ed
so it does not scroll the editor, and a held key is ignored — a native button does
not repeat, and every node is a write to a document collaborators are watching.

### Canvas Background

React Flow `<Background>` component. Canvas sits on the base background color.

## Starter Templates

### Entry Point

A `Templates` button in the editor navbar, `variant="outline" size="sm"` with a
Lucide `LayoutTemplate` icon — the same treatment as `Share` beside it, because
the two are peer project actions. It sits ahead of `Share` in the order the two
are reached for, and like `Share` it is only rendered with a project open.

### Import Modal

An `EditorDialog` at `sm:max-w-2xl`, wider than the shell's `sm:max-w-sm`
default because the body is a two-column grid of diagrams rather than a single
input. The grid is `grid-cols-1 sm:grid-cols-2` inside a scroll container capped
at `max-h-[55vh]`, so a fourth template scrolls instead of pushing the footer off
a short screen. Footer holds `Cancel` alone — picking a template is the confirm.

### Template Card

A `rounded-2xl` card on `bg-surface` with `border-surface-border`, going to
`border-surface-border-subtle` on hover. Top to bottom: the diagram preview, the
template name (`text-sm font-medium text-copy-primary`), its description
(`text-xs text-copy-muted`), and a right-aligned `Import` button held to the
card's baseline by `mt-auto`, so a row of cards puts its buttons at one height.

### Diagram Preview

A 2:1 box on `bg-base` — the darkest surface, so the thumbnail reads as a window
onto the canvas rather than as part of the card. Fitted to a nominal 288×144
viewport with 10px of padding, scaled uniformly, capped at 1:1, and centred; every
coordinate is emitted as a percentage of that nominal frame, so the thumbnail
scales with the card.

Nodes are drawn with `NodeShapeFrame`, the same component the canvas draws them
with, so a preview cannot show a shape or a colour the import will not produce.
Labels are omitted — at a fifth of canvas scale the shape and the colour are what
carry the diagram. Edges are straight 1px `text-faint` lines between node centres
rather than the canvas's smooth-step routing, whose corners are a few pixels apart
at this scale.

The box is outlined with `ring-1 ring-surface-border` and **not** a `border`,
which is the one place in the app that departs from the border token, and it was
measured rather than preferred: percentages resolve against the content box while
`aspect-[2/1]` constrains the border box, so a 1px border leaves a 286×142 content
box inside a 288×144 frame — not 2:1 — and the two axes come out scaled by 0.993
and 0.986. A ring is a box-shadow, takes no part in layout, and takes that to zero.

## Component Library

shadcn/ui on top of Tailwind. No custom design system. Components live in `components/ui/`. Use the `shadcn` CLI to add new components rather than writing them from scratch.

## Layout Patterns

- Editor workspace: full-viewport layout — floating sidebar overlay on the left, center canvas, slide-over AI sidebar on the right.
- Sidebars: floating overlay with dark semi-transparent background and subtle border.
- Modals and dialogs: centered overlay, `rounded-3xl`, dark background with backdrop blur.
- Navbar: top bar with dark background and bottom border.

## Icons

Lucide React. Stroke-based icons only — no filled variants. Icon sizes: `h-4 w-4` for inline, `h-5 w-5` for buttons, `h-8 w-8` for feature icons in empty states.
