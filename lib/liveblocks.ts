import { Liveblocks } from "@liveblocks/node";

/**
 * The Liveblocks server SDK, and the cursor palette that goes out with every
 * session token.
 *
 * Nothing here decides who may join a room — `app/api/liveblocks-auth/route.ts`
 * resolves that through `lib/project-access.ts` before it ever asks for a
 * token. This module only owns the connection to Liveblocks and the colour a
 * user is presented in.
 */

/**
 * Cursor colours, one per collaborator.
 *
 * Vivid rather than tonal: a cursor has to read against the near-black canvas
 * *and* against a node it happens to be sitting on, so these are the text
 * colours from the canvas node palette in `ui-context.md` — already tuned for
 * exactly that background. Hex literals rather than CSS tokens because the
 * value is serialized into a token and rendered as an SVG fill by Liveblocks,
 * where a `var(--…)` reference has nothing to resolve against.
 *
 * Eight entries, matching the node palette. The count only sets how many
 * distinct colours exist before two collaborators can share one; it is not a
 * limit on room size.
 */
export const CURSOR_COLORS = [
  "#52A8FF", // blue
  "#BF7AF0", // purple
  "#FF990A", // orange
  "#FF6166", // red
  "#F75F8F", // pink
  "#62C073", // green
  "#0AC7B4", // teal
  "#EDEDED", // neutral
] as const;

/**
 * The cursor colour for a user ID.
 *
 * Deterministic on purpose: the colour is derived rather than stored, so the
 * same person is the same colour in every room, on every device, and across
 * reconnects — with no column to keep in sync and no allocation to coordinate
 * between clients.
 *
 * The hash is FNV-1a over the UTF-16 code units, kept unsigned by `>>> 0`.
 * There is nothing cryptographic about this and there does not need to be:
 * mapping a user ID to one of eight colours has no secret to protect. A plain
 * character sum would have done the job less evenly.
 */
export function getUserColor(userId: string): string {
  let hash = 2166136261;

  for (let index = 0; index < userId.length; index += 1) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }

  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

function createLiveblocksClient(): Liveblocks {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is not set");
  }

  return new Liveblocks({ secret });
}

const globalForLiveblocks = globalThis as unknown as {
  liveblocks?: Liveblocks;
};

/**
 * The cached client.
 *
 * Cached rather than constructed per request so a room join does not build a
 * new SDK instance each time, and cached on `globalThis` outside production so
 * a hot reload reuses the one already there — the same shape as `lib/prisma.ts`.
 *
 * It is built on first call rather than at module load, which is the one place
 * this deviates from `lib/prisma.ts`: `next build` imports every route module
 * to collect page data, so a module-level throw would turn a missing secret
 * into a failed build instead of a failed request. The secret is only needed
 * when someone actually joins a room.
 */
let cachedClient: Liveblocks | undefined = globalForLiveblocks.liveblocks;

export function getLiveblocksClient(): Liveblocks {
  if (!cachedClient) {
    cachedClient = createLiveblocksClient();

    if (process.env.NODE_ENV !== "production") {
      globalForLiveblocks.liveblocks = cachedClient;
    }
  }

  return cachedClient;
}
