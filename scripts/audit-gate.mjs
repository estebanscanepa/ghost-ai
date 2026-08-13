#!/usr/bin/env node
// Production dependency audit gate.
//
// Runs `npm audit --omit=dev` and fails on any advisory that is not covered by
// an unexpired entry in the `auditExceptions.allow` list in package.json.
// Expired exceptions fail too, so an accepted risk cannot outlive its review date.

import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";

const ROOT = new URL("../", import.meta.url);

/** `npm audit` exits non-zero when it finds anything, so read stdout either way. */
async function runAudit() {
  try {
    const { stdout } = await promisify(execFile)(
      "npm",
      ["audit", "--omit=dev", "--json"],
      { cwd: ROOT, maxBuffer: 32 * 1024 * 1024 },
    );
    return JSON.parse(stdout);
  } catch (error) {
    if (error.stdout) return JSON.parse(error.stdout);
    throw error;
  }
}

/** Collapse npm's nested `via` chains down to the root advisories they cascade from. */
function collectAdvisories(report) {
  const found = new Map();
  for (const vuln of Object.values(report.vulnerabilities ?? {})) {
    for (const via of vuln.via) {
      if (typeof via !== "object") continue;
      const id = via.url?.split("/").pop() ?? String(via.source);
      if (!found.has(id)) {
        found.set(id, { id, package: via.name, severity: via.severity, title: via.title });
      }
    }
  }
  return [...found.values()];
}

const pkg = JSON.parse(await readFile(new URL("package.json", ROOT), "utf8"));
const allow = pkg.auditExceptions?.allow ?? [];
const today = new Date().toISOString().slice(0, 10);

const advisories = collectAdvisories(await runAudit());
const failures = [];

for (const advisory of advisories) {
  const exception = allow.find((entry) => entry.advisory === advisory.id);
  if (!exception) {
    failures.push(`${advisory.severity.toUpperCase()} ${advisory.id} (${advisory.package}) — ${advisory.title}\n    No approved exception. Remediate it, or add a scoped entry to auditExceptions.allow.`);
  } else if (exception.expires < today) {
    failures.push(`${advisory.severity.toUpperCase()} ${advisory.id} (${advisory.package}) — ${advisory.title}\n    Exception expired on ${exception.expires}. Re-check for a patched version and renew or remove it.`);
  }
}

// An exception that no longer matches anything is stale config — report it, but don't fail on it.
const unused = allow.filter((entry) => !advisories.some((a) => a.id === entry.advisory));
for (const entry of unused) {
  console.log(`note: exception ${entry.advisory} (${entry.package}) no longer matches any advisory — safe to remove.`);
}

if (failures.length > 0) {
  console.error(`\nProduction audit gate failed (${failures.length} unapproved or expired):\n`);
  for (const failure of failures) console.error(`  ${failure}\n`);
  process.exit(1);
}

console.log(
  `Production audit gate passed: ${advisories.length} advisory/advisories, all covered by unexpired exceptions.`,
);
