import { Prisma } from "@/app/generated/prisma/client";

/**
 * The Prisma error codes the handlers translate into HTTP answers. Each one
 * stands for a race the request lost rather than a server fault: an ownership
 * check reads and the mutation writes, so the row can change in the gap.
 */

/** No record matched the `where` — the row was there a moment ago. */
const MISSING_RECORD = "P2025";

/** A unique constraint rejected the write. */
const UNIQUE_CONSTRAINT = "P2002";

/** A foreign key constraint rejected the write — the parent row is gone. */
const FOREIGN_KEY_CONSTRAINT = "P2003";

function hasCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export function isMissingRecord(error: unknown): boolean {
  return hasCode(error, MISSING_RECORD);
}

export function isUniqueConstraintViolation(error: unknown): boolean {
  return hasCode(error, UNIQUE_CONSTRAINT);
}

export function isForeignKeyViolation(error: unknown): boolean {
  return hasCode(error, FOREIGN_KEY_CONSTRAINT);
}
