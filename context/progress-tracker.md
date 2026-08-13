# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Editor shell — complete. `/editor` exists, mounts the chrome, and owns the sidebar state. The canvas area is still a placeholder.

## Current Goal

- Fill the `/editor` canvas area. The layout hands the page a full-height, `relative`-parented region with the navbar above it and the sidebar overlaying it; React Flow mounts there next.

## Completed

- Next.js boilerplate cleanup: `globals.css` stripped to Tailwind directives, boilerplate SVGs removed from `public/`, `app/page.tsx` reduced to a minimal centered component.
- `context/feature-specs/01-design-system.md` — design system and UI primitive components:
  - `shadcn/ui` installed and configured (`components.json`, style `radix-nova`, `lucide` icon library, `@/` aliases).
  - Primitives added to `components/ui/`: Button, Card, Dialog, Input, Tabs, Textarea, ScrollArea. Unmodified since generation.
  - `lucide-react` installed.
  - `lib/utils.ts` exports `cn()` (clsx + tailwind-merge).
  - Dark theme tokens authored in `app/globals.css` from the `ui-context.md` table, with shadcn's semantic tokens mapped onto them.
  - `dark` class added to `<html>` in `app/layout.tsx` so the `dark:` variants inside the generated components resolve.
  - Verified: all 7 primitives compile and render, `cn()` passes 6 merge/conflict/falsy/array cases, emitted CSS contains no light values and no `prefers-color-scheme` blocks, `next build` and `eslint` clean.
- `context/feature-specs/02-editor.md` — editor chrome:
  - `components/editor/editor-navbar.tsx` — fixed-height (`h-14`) top bar on `bg-surface` with a `border-surface-border` bottom border. Three equal flex sections; the left one holds the sidebar toggle (`PanelLeftClose` when open, `PanelLeftOpen` when closed). Center and right are empty placeholders. Props: `isSidebarOpen`, `onToggleSidebar`.
  - `components/editor/project-sidebar.tsx` — floating overlay panel (`absolute inset-y-3 left-3 w-72`, `rounded-2xl`, `bg-surface/95` + `backdrop-blur`) that slides in via `translate-x` and never pushes canvas content. `Projects` header with close button, `My Projects` / `Shared` tabs (line variant) each showing an empty placeholder, full-width `New Project` button with `Plus` at the bottom. Props: `isOpen`, `onClose`.
  - `components/editor/editor-dialog.tsx` — the dialog pattern: wraps the shadcn `Dialog` with `rounded-3xl` / `bg-elevated` / `border-surface-border` and slots for title, description, body, and footer actions. No concrete dialogs built yet.
  - Verified against a temporary `/editor-preview` route (since removed): open and closed sidebar states render with no console errors, the canvas content does not shift when the sidebar opens, the navbar icon flips with state, and the dialog renders title/description/body/footer over a blurred backdrop. `tsc --noEmit` and `eslint` clean.

- `context/feature-specs/03-auth.md` — Clerk authentication:
  - Installed via the Clerk CLI (`clerk init --app app_3Hpo5AwjP6uZ8ixrACCXxOLaUEh`), linked to the `Ghost AI` application (development instance). `@clerk/nextjs` v7 and `@clerk/ui` v1 added.
  - `app/layout.tsx` — `ClerkProvider` inside `<body>`. Appearance is Clerk's `dark` theme from `@clerk/ui/themes` as the base, with every color variable re-pointed at the project's CSS custom properties (`var(--bg-elevated)`, `var(--accent-primary)`, `var(--text-muted)`, …) plus `fontFamily`, `fontFamilyMono`, and `borderRadius`. No hex values. The `@clerk/ui/themes/shadcn.css` import was dropped from `globals.css` with the shadcn theme.
  - `proxy.ts` — `clerkMiddleware()` with a handler that calls `auth.protect()` on everything that is not a public route. The public list is built from `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, each expanded to cover its catch-all children. Matcher unchanged.
  - `app/page.tsx` — no longer a landing page. Reads `await auth()` and redirects: `userId` → `/editor`, otherwise → `/sign-in`.
  - `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` — render `<SignIn />` / `<SignUp />` inside `AuthPanel`.
  - `components/auth/auth-panel.tsx` — the shared auth shell. A 50/50 split at `lg` and up: the left half sits on `bg-elevated` with a `border-r`, holding the logo mark + wordmark at the top, a `text-3xl` headline and supporting paragraph in the middle, a three-item feature list (brand-tinted icon square, title, one-line description), and the copyright at the bottom. The right half centers the Clerk form on `bg-base`. Below `lg` the left panel is `hidden` and only the form renders. No gradients, no hero, no cards.
  - `components/editor/editor-navbar.tsx` — renders Clerk's `<UserButton />` in the right section. The `actions?: ReactNode` slot added in the previous unit is gone, and `components/auth/auth-controls.tsx` was deleted with it: `/` is a redirect now, so there is no signed-out surface left that needed sign-in/sign-up buttons.
  - Verified: `next build`, `tsc --noEmit`, and `eslint` clean. Signed out, `/`, `/editor`, and an arbitrary unknown path all 307 to `/sign-in?redirect_url=…` while `/sign-in` and `/sign-up` return 200. Screenshots at 1440×900, 1024×820, and 420×860 (form only) match the spec, the Clerk card renders on the project palette with the cyan primary, and the console is clean apart from Clerk's development-keys warning.
  - Type is Geist Sans throughout, confirmed by computed style rather than by eye: `html`, `body`, the panel copy, and Clerk's own card and buttons all resolve to `Geist, "Geist Fallback"`, with 400 and 600 both passing `document.fonts.check()`. Clerk picks it up from the `fontFamily` / `fontFamilyMono` appearance variables.

- `app/editor` — the editor route and its layout:
  - `app/editor/layout.tsx` — Server Component. Renders `EditorShell` around `children`, typed with `LayoutProps<"/editor">`.
  - `components/editor/editor-shell.tsx` — the client half. Owns `isSidebarOpen` (`useState`, closed by default), passes `isSidebarOpen` / `onToggleSidebar` to `EditorNavbar` and `isOpen` / `onClose` to `ProjectSidebar`. Outer `div` is `flex h-dvh flex-col overflow-hidden bg-base`; the navbar is the fixed-height row and `<main>` is `relative min-h-0 flex-1 overflow-hidden` — `relative` so the absolutely positioned sidebar anchors to it, `min-h-0` so the canvas can shrink instead of overflowing the viewport.
  - `app/editor/page.tsx` — placeholder filling the canvas area until React Flow lands.
  - Verified: `next typegen`, `tsc --noEmit`, `eslint .`, and `next build` all clean. `/editor` builds as a static route.

## In Progress

- Nothing.

## Next Up

- The canvas itself — React Flow inside `app/editor/page.tsx`.

## Open Questions

- None outstanding.

## Architecture Decisions

- **Routes are protected by default; the public list comes from the env vars.** `proxy.ts` calls `auth.protect()` on every request that is not sign-in or sign-up, so a new route is private the moment it exists — forgetting a guard fails closed. The public matcher is derived from `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `NEXT_PUBLIC_CLERK_SIGN_UP_URL` rather than hardcoded, so the public surface and Clerk's own redirect targets cannot drift apart. This is coarse gate-keeping only: per-project ownership checks still belong at each mutation boundary.
- **`/` is a router, not a page.** There is no marketing surface at the root — it reads the session and redirects to `/editor` or `/sign-in`. Anything public-facing would need its own route added to the public matcher.
- **Clerk is themed by variable, not by element.** `appearance` uses Clerk's `dark` theme as the base and overrides its `variables` with the project's CSS custom properties. Nothing targets Clerk's `elements` classes, so restyling Clerk means changing a token in `globals.css` and Clerk internals stay upgradeable.

- **The route layout stays a Server Component; the shared state lives one level down.** `isSidebarOpen` is shared between the navbar toggle and the sidebar, so it has to sit above both — but putting `"use client"` on `app/editor/layout.tsx` would drag every future editor screen's chrome onto the client boundary for no reason. `EditorShell` absorbs the client-ness instead, and `children` still arrives from the server untouched.

- **The sidebar overlays, it never reflows.** `ProjectSidebar` is absolutely positioned and stays mounted in both states — closed just translates it off the left edge (plus `inert` so it drops out of the tab order). Any screen that renders it must supply a `relative` container. This keeps the canvas viewport size constant, which matters once React Flow owns that area.
- **Dialogs compose `EditorDialog`, not the shadcn `Dialog` directly.** The overlay, radius, surface, and footer treatment live in one place; concrete dialogs supply only title, description, body, and footer actions.

- **Theming is token-driven, not component-driven.** `components/ui/*` stays exactly as generated; the dark look comes from `app/globals.css` mapping shadcn's semantic tokens (`--background`, `--card`, `--primary`, `--border`, `--input`, `--ring`, …) onto the palette in `context/ui-context.md`. Restyling means changing a token, not editing a foundation component.
- **Dark-only with no light palette.** The dark values live directly on `:root` (plus `color-scheme: dark`); there is no light block and no `prefers-color-scheme` branch, so the system theme cannot leak through. The `dark` class on `<html>` exists only to activate the `dark:` variants baked into the generated components.
- **`bg-base` is an `@utility`, not a `--color-base` theme token.** A `base` entry in Tailwind's color namespace also generates a `text-base` color utility, which shadows the built-in `text-base` font size and silently recolored `CardTitle`. Avoid color token names that collide with built-in utility names (`base`, `sm`, `lg`, …).
- **Radius scale comes from shadcn's `--radius` ladder** (`--radius: 0.625rem`, `xl`/`2xl`/`3xl` at 1.4/1.8/2.2×). The generated components hardcode `rounded-xl`; the `ui-context.md` scale (`rounded-2xl` cards, `rounded-3xl` modals) is applied at the call site via `className`, keeping foundation components untouched.

## Session Notes

- shadcn CLI v4 is preset-driven and prompts interactively. The non-interactive invocation used here: `npx shadcn@latest init --base radix -p nova --no-monorepo -y`. `--base-color` no longer exists.
- The signed-in half of the flow (`/` → `/editor`, the sidebar toggle, the avatar menu) still has not been exercised against a real session — no test account exists, and `/editor` is behind `auth.protect()`, so it cannot be opened in a browser signed out. Everything so far is verified by compiler and build only.
- `LayoutProps<"/editor">` resolves against generated route types, so `tsc --noEmit` fails on a brand-new route until types are regenerated (`next typegen`, or any `next dev` / `next build`). The error looks like a bad type argument — `Type '"/editor"' does not satisfy the constraint '"/"'` — but it just means the typegen output is stale.
- `next lint` is gone in Next 16. Run `npx eslint .` directly.
- Removed the unused `Button` import from `app/page.tsx` — it was the only eslint warning in the repo and blocked a clean lint run.
- `next dev` rewrites the `nextjs-agent-rules` block at the top of `AGENTS.md` on every run (see `node_modules/next/dist/server/lib/generate-agent-files.js`). It only touches its own block above the `END:nextjs-agent-rules` marker; the project instructions below are untouched. Commit the churn rather than reverting it, or set `agentRules: false` in `next.config.ts`.
- `@clerk/ui` pulls a large transitive tree (~344 packages, including web3 wallet adapters for Clerk's Web3 sign-in). The 21 reported vulnerabilities (10 moderate, 11 high) were triaged; none are in first-party code. Current state: **0 moderate, 11 high, all 11 covered by a scoped exception that expires 2026-11-13.**
  - The 10 moderates all cascaded from one root advisory — `uuid` GHSA-w5hq-g745-h8pq, reached via `jayson`. Fixed for real with a scoped `overrides` entry (`jayson` → `uuid: ^11.1.1`). `11.1.1` is deliberate: it is the last release that still ships a CommonJS build, and `jayson` does `require('uuid').v4`. Scoping the override to `jayson` leaves `rpc-websockets` on its declared `uuid@^14.0.0`.
  - The 11 highs all cascade from two `image-size` DoS advisories (GHSA-w3rx-r6r6-pgpr, GHSA-5p2g-fcmc-qvqq). **There is no patched version to upgrade to** — the advisories cover `<=2.0.2` and `2.0.2` is the latest published release, while `metro@0.87.0` (also latest) still requires `^1.0.2`. `@clerk/ui@1.30.1` is already latest and pins its Solana deps exactly, so there is no upgrade path from above either. npm's only offered fix is downgrading `@clerk/ui` to `0.3.24`, a major downgrade.
  - Why the exception is safe: `react-native` is in the tree only because npm auto-installs it as a peer of `@solana-mobile/*`, which reference it exclusively from their `index.native.js` entry points. Next.js resolves `index.js`, so `metro` and `image-size` are React Native *build tooling* that never reaches the bundle — confirmed by grepping `.next/` after a build (no hits). Exploitation would also require parsing attacker-supplied ICNS/JXL/HEIF files, which this app never does.
  - Rejected alternative: `omit=peer` in `.npmrc` zeroes the audit, but it drops 203 packages including `@solana/web3.js`, which Clerk's Web3 sign-in genuinely uses on web. Too broad a hammer for build tooling that never ships.
- Dependency audit is now gated, not just documented. `npm run audit` (`scripts/audit-gate.mjs`) runs `npm audit --omit=dev` and fails on any advisory lacking an unexpired entry in `auditExceptions.allow` in `package.json`. Expired exceptions fail too, so the accepted risk cannot outlive its 2026-11-13 review date. Re-check `image-size` for a patched release at that point.
- Only a development Clerk instance exists. A production instance must be created and its keys configured before deploying.
