# Architecture Context

## Stack

| Layer            | Technology              | Role                                                           |
| ---------------- | ----------------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 + TypeScript | Full-stack app with server/client boundaries                   |
| UI               | Tailwind + shadcn/ui    | Component composition and styling                              |
| Auth             | Clerk                   | User identity and route protection                             |
| Database         | Prisma + PostgreSQL     | Relational metadata: projects, collaborators, specs, task runs |
| Canvas           | Liveblocks + React Flow | Real-time collaborative canvas, presence, and cursors          |
| Background tasks | Trigger.dev             | Durable AI generation workflows                                |
| Artifact storage | Vercel Blob             | Canvas snapshots and generated Markdown specs                  |

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence.
- `trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: Prisma client, access control helpers, and utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `prisma` — Database schema and generated client output.
- `data` — Legacy local directory. Not used for new artifacts.

## Storage Model

- **Database**: metadata, ownership, relationships, and task run records.
- **Vercel Blob**: generated artifacts — canvas snapshots at `canvas/{projectId}.json` and specs at `specs/{projectId}/{specId}.md`.
- Project records, spec records, and task run records belong in PostgreSQL.
- Canvas content and Markdown output are stored in and retrieved from Vercel Blob.
- The blob URL is stored in the database (`canvasJsonPath`, `filePath`) as the reference to the artifact.
- Canvas blobs are written with `access: "private"` and one fixed pathname per project, so a save replaces the previous snapshot rather than accumulating copies, and the stored URL is a reference rather than a credential. A project's canvas is readable only through `GET /api/projects/[projectId]/canvas`, which checks membership first.
- A saved canvas is a snapshot of the graph, not of the canvas UI. Selection, drag state, measured dimensions, and the renderer's own edge defaults are not stored; the schema defaults in `types/canvas.ts` are reapplied on load, so a restored diagram is drawn by the current build rather than by the one that saved it.

## Auth and Collaboration Model

- Every project has a single owner (Clerk user ID).
- Projects can include additional collaborators.
- Collaborators are keyed by email, so collaborator access is resolved through the caller's verified Clerk email addresses, not their user ID.
- Only authenticated users can access protected routes.
- Reading a project is open to the owner and its collaborators; renaming and deleting are owner-only.
- Saving the canvas is open to the owner and its collaborators, unlike the project's other mutations. A collaborator editing the shared canvas is the point of a shared room, so a save they cannot make is a save nobody makes for them — their work would exist in Liveblocks Storage and nowhere else. Ownership still governs the project record itself.
- A project's ID is also its Liveblocks room ID. It is derived from the project name plus a short random suffix at creation time and never generated separately, so a project record always addresses its room.
- Liveblocks room tokens are issued only after verifying project membership.

## Presence Model

- Room Presence is `{ cursor: { x, y } | null; thinking: boolean }`, declared once in `liveblocks.config.ts` and shared by every reader and writer.
- Cursor positions are broadcast in canvas coordinates, not screen coordinates, so two participants at different pans and zooms resolve the same point in the diagram.
- A user's display name, avatar, and colour are not presence: they are UserMeta, set from the verified Clerk profile when the session token is issued, so a client cannot claim another identity.
- Colour is derived from the user ID rather than stored or allocated, so the same person is the same colour in every room and across reconnects.
- The current user is resolved from the active Clerk session and excluded from the collaborator list by user ID — which also excludes their own other sessions, since each connection is a separate presence entry.
- Presence UI belongs to the room view. It is rendered inside the Liveblocks room, never in the shared editor chrome, which also renders on the editor home where there is no room. The account menu is not presence, but it does follow the same split: the navbar renders `UserButton` only when no project is open, and the presence group's own `UserButton` is the account menu everywhere else, so exactly one is on screen at a time.

## Canvas Persistence

- Liveblocks Storage is the live canvas; the Blob snapshot is its durable copy. Storage is authoritative while a room is connected.
- The editor autosaves: the room's nodes and edges are watched, debounced, and written through `PUT /api/projects/[projectId]/canvas`. Saves are skipped when the graph is unchanged, so opening a project and a roomful of collaborators arriving are not writes.
- A stored canvas is loaded into a room only when the room is empty. A room that already has nodes or edges is never seeded, because the live document is newer than the snapshot by definition and overwriting it would discard active collaboration.
- A snapshot that cannot be read holds autosave back rather than falling through to an empty canvas, so a diagram is never replaced by the empty room a failed load was going to fill.
- Save state is surfaced in the editor navbar's Save button. Autosave runs inside the room and the button is in the shared chrome, so the two are connected through `CanvasSaveProvider` rather than through props.

## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active Liveblocks room when a user imports one.
- Import can occur on canvas creation or from within the editor at any time.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Generation Model

### Design Generation

- Input: user prompt, project context, and current canvas state.
- Execution: durable background task via Trigger.dev.
- Output: structured node and edge updates written into the shared Liveblocks room.

### Spec Generation

- Input: current canvas graph and project context.
- Execution: durable background task via Trigger.dev.
- Output: Markdown technical spec saved to the filesystem and linked to the project in the database.

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.
