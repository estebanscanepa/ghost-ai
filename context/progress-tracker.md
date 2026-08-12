# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Foundation — design system and UI primitives complete.

## Current Goal

- Pick the next feature unit. The design system is in place and ready to compose against.

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

## In Progress

- Nothing.

## Next Up

- Add the next planned feature unit here.

## Open Questions

- None outstanding.

## Architecture Decisions

- **Theming is token-driven, not component-driven.** `components/ui/*` stays exactly as generated; the dark look comes from `app/globals.css` mapping shadcn's semantic tokens (`--background`, `--card`, `--primary`, `--border`, `--input`, `--ring`, …) onto the palette in `context/ui-context.md`. Restyling means changing a token, not editing a foundation component.
- **Dark-only with no light palette.** The dark values live directly on `:root` (plus `color-scheme: dark`); there is no light block and no `prefers-color-scheme` branch, so the system theme cannot leak through. The `dark` class on `<html>` exists only to activate the `dark:` variants baked into the generated components.
- **`bg-base` is an `@utility`, not a `--color-base` theme token.** A `base` entry in Tailwind's color namespace also generates a `text-base` color utility, which shadows the built-in `text-base` font size and silently recolored `CardTitle`. Avoid color token names that collide with built-in utility names (`base`, `sm`, `lg`, …).
- **Radius scale comes from shadcn's `--radius` ladder** (`--radius: 0.625rem`, `xl`/`2xl`/`3xl` at 1.4/1.8/2.2×). The generated components hardcode `rounded-xl`; the `ui-context.md` scale (`rounded-2xl` cards, `rounded-3xl` modals) is applied at the call site via `className`, keeping foundation components untouched.

## Session Notes

- shadcn CLI v4 is preset-driven and prompts interactively. The non-interactive invocation used here: `npx shadcn@latest init --base radix -p nova --no-monorepo -y`. `--base-color` no longer exists.
- `app/layout.tsx` still carries the `create-next-app` metadata (`title: "Create Next App"`). Left alone as out of scope for this unit — worth fixing whenever the app shell is next touched.
