"use client";

import { UserButton } from "@clerk/nextjs";

import { useCollaborators, type Collaborator } from "@/hooks/use-collaborators";
import { cn } from "@/lib/utils";

/** How many collaborators are drawn before the rest collapse into a `+N` chip. */
const MAX_VISIBLE_COLLABORATORS = 5;

/**
 * One size for every face in the group, collaborators and the current user
 * alike. It is handed to Clerk through `appearance.elements` rather than
 * guessed at, so the account button cannot end up a few pixels off the avatars
 * it sits beside.
 */
const AVATAR_SIZE_CLASS = "size-8";

/**
 * Two letters from a display name: the initials of the first and last word, or
 * the first two characters when there is only one word — which is the case for
 * the account whose `name` fell back to an email address in
 * `POST /api/liveblocks-auth`.
 */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

/**
 * One collaborator's face. Display-only by design: no button, no tab stop, no
 * click target — the group reports who is here and nothing else.
 *
 * Clerk serves avatars from its own CDN and generates one for an account with
 * no upload, so a plain `<img>` rather than `next/image`, for the same reason
 * the share dialog uses one: allow-listing a third-party host and paying an
 * optimizer round trip for a 32px image buys nothing.
 *
 * The initials fallback is painted in the collaborator's presence colour, which
 * is the colour their cursor is drawn in — so the face in the corner and the
 * pointer on the canvas identify the same person twice.
 */
function CollaboratorAvatar({ collaborator }: { collaborator: Collaborator }) {
  const { avatar, color, name } = collaborator;

  return (
    /* `relative` so the negative margin that overlaps the stack still paints
       each face above the one before it, and `ring-2 ring-surface` — the pill's
       own surface — is what separates two overlapping faces and keeps a dark
       avatar readable against the canvas behind it. */
    <li className="relative" title={name}>
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatar}
          alt=""
          width={32}
          height={32}
          referrerPolicy="no-referrer"
          className={cn(
            AVATAR_SIZE_CLASS,
            "rounded-full object-cover ring-2 ring-surface",
          )}
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            AVATAR_SIZE_CLASS,
            "flex items-center justify-center rounded-full text-[11px] font-semibold ring-2 ring-surface",
          )}
          /* The presence colour arrives as a hex literal in the session token,
             so it cannot be a token class. The text on top is the darkest
             surface, because every presence colour is a vivid one. */
          style={{ backgroundColor: color, color: "var(--bg-base)" }}
        >
          {getInitials(name)}
        </span>
      )}

      {/* The name a screen reader gets. `title` alone is a hover affordance,
          and the image is decorative — the identity is the text. */}
      <span className="sr-only">{name}</span>
    </li>
  );
}

/**
 * Who is in this room, in the canvas's top-right corner.
 *
 * Mounted by the canvas rather than by the navbar, and that is not a layout
 * preference: presence only exists inside the Liveblocks room, which the
 * workspace *page* opens, while the navbar belongs to the editor *layout* and
 * renders on the editor home too. So this is the only place the room's own
 * participant list can be read, and putting it here is also what keeps it out
 * of the editor home.
 *
 * The current user is Clerk's `UserButton`, which is what puts their own face at
 * the end of the group rather than a sixth avatar read out of the presence list
 * — `useCollaborators` has already removed them from it. In a workspace this is
 * also the *only* account menu: the navbar renders its own `UserButton` on the
 * editor home alone, so that managing a profile and signing out are reached
 * from here once a project is open.
 *
 * `right` is offset by `--canvas-right-inset`, which `EditorShell` sets to the
 * width the AI sidebar is covering — otherwise the sidebar, which is open by
 * default, would sit on top of this corner. It transitions over the same 200ms
 * the sidebar slides in.
 */
export function PresenceAvatars() {
  const collaborators = useCollaborators();

  const visible = collaborators.slice(0, MAX_VISIBLE_COLLABORATORS);
  const overflow = collaborators.length - visible.length;
  const hasCollaborators = collaborators.length > 0;

  return (
    <div
      /* The same floating pill as the shape panel and the control bar — this is
         a third overlay on the same canvas and reads as one family with them. */
      className="absolute top-3 right-[calc(0.75rem+var(--canvas-right-inset,0rem))] z-30 flex items-center gap-2 rounded-full border border-surface-border bg-surface/95 p-1.5 shadow-lg backdrop-blur transition-[right] duration-200 ease-out"
    >
      {hasCollaborators ? (
        <ul
          aria-label="Collaborators in this project"
          className="flex items-center -space-x-2"
        >
          {visible.map((collaborator) => (
            <CollaboratorAvatar
              key={collaborator.connectionId}
              collaborator={collaborator}
            />
          ))}

          {overflow > 0 ? (
            <li
              className={cn(
                AVATAR_SIZE_CLASS,
                "relative flex items-center justify-center rounded-full bg-subtle text-[11px] font-semibold text-copy-secondary ring-2 ring-surface",
              )}
            >
              +{overflow}
              <span className="sr-only">{overflow} more collaborators</span>
            </li>
          ) : null}
        </ul>
      ) : null}

      {/* Only with someone to divide from. Alone in the room the group is the
          account button and nothing else. `aria-hidden` for the same reason the
          control bar's divider is: the grouping is decoration. */}
      {hasCollaborators ? (
        <span aria-hidden className="h-5 w-px bg-surface-border" />
      ) : null}

      <UserButton
        appearance={{ elements: { userButtonAvatarBox: AVATAR_SIZE_CLASS } }}
      />
    </div>
  );
}
