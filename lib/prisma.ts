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
 * Malformed URLs fall through untouched so `pg` can report the parse failure
 * itself rather than having this mask it.
 */
function assertVerifiedTls(databaseUrl: string): void {
  let url: URL;

  try {
    url = new URL(databaseUrl);
  } catch {
    return;
  }

  if (LOCAL_HOSTS.has(url.hostname)) {
    return;
  }

  const sslMode = url.searchParams.get("sslmode");

  if (sslMode === "verify-full") {
    return;
  }

  throw new Error(
    `DATABASE_URL must set sslmode=verify-full for remote host "${url.hostname}" ` +
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
