import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/app/generated/prisma/client";

/** Hosts where a TLS-less Postgres is a normal development setup. */
const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "[::1]",
  "host.docker.internal",
]);

function decodeOrRaw(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * The host `pg` will actually dial, or `null` when the connection never leaves
 * the machine and so has nothing to verify a certificate against.
 *
 * This deliberately mirrors `pg-connection-string`'s own resolution order
 * rather than reading the URL authority, because the two disagree. That parser
 * spreads the query string into its config *before* looking at the authority
 * and then only fills in the host `if (!config.host)` — so a `?host=` param
 * wins and the authority is discarded. Trusting `url.hostname` would let
 * `postgres://…@localhost/db?host=db.example.com` read as local while the
 * socket opens to a remote server.
 *
 * Three shapes resolve to `null`: the `socket:` protocol, which returns early
 * in that parser with no hostname at all; an empty authority; and any host that
 * resolves to a filesystem path, which covers both a bare
 * `?host=/var/run/postgresql` and the percent-encoded `%2Fvar%2Frun` authority
 * form. All three are Unix domain sockets, where TLS does not apply.
 */
function resolveHost(url: URL): string | null {
  if (url.protocol === "socket:") {
    return null;
  }

  const override = url.searchParams.get("host");
  const host = override ?? decodeOrRaw(url.hostname);

  if (host.length === 0 || host.startsWith("/")) {
    return null;
  }

  return host;
}

/**
 * Refuses to build a client against a remote database that is not pinned to
 * `sslmode=verify-full`.
 *
 * `pg` currently treats `prefer`, `require`, and `verify-ca` as aliases for
 * `verify-full` and emits a one-shot process warning saying so. That warning is
 * easy to miss — Node attributes it to whichever component happened to trigger
 * the pool's first query — and it is a real deadline: in pg v9 those modes take
 * on libpq semantics, where the certificate chain and hostname go unverified
 * and the connection becomes MITM-able. Failing at startup turns a buried
 * warning into an explicit, fixable error while the fix is still a one-word
 * edit to `.env`.
 *
 * Strings `new URL()` rejects fall through untouched. `pg` parses those against
 * a `postgres://base` fallback, which yields either the unresolvable host
 * `base` or a literal it treats as a socket path — never a real remote server —
 * so they fail loudly at dial time with their own error, and reporting an
 * `sslmode` problem here would only misdirect.
 */
function assertVerifiedTls(databaseUrl: string): void {
  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    return;
  }

  const host = resolveHost(url);

  if (host === null || LOCAL_HOSTS.has(host)) {
    return;
  }

  const sslMode = url.searchParams.get("sslmode");

  if (sslMode === "verify-full") {
    return;
  }

  throw new Error(
    `DATABASE_URL must set sslmode=verify-full for remote host "${host}" ` +
      `(found ${sslMode ? `sslmode=${sslMode}` : "no sslmode"}). ` +
      "Prisma Console hands out connection strings ending in `?sslmode=require`; " +
      "swap that for `?sslmode=verify-full`. See .env.example.",
  );
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  if (databaseUrl.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: databaseUrl });
  }

  assertVerifiedTls(databaseUrl);

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
