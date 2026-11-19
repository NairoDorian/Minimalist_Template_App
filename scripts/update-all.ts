// scripts/update-all.ts
//
// Brings the toolchain and every dependency to its newest version, proves the
// result still builds, and refreshes the architecture map:
//
//   bun run update              rtk + npm + Cargo, newest that resolves (prereleases included)
//   bun run update --dry-run    report what would move, write nothing
//
// Ported from ZER0 (`Handy_V2/scripts/update-all.ts`) in 0.28.0. ZER0's last
// step regenerates a full-repository repomix pack; this template already
// builds its AI-facing map with repomix's library API (`bun run arch` →
// ARCHITECTURE.md), so that is the step here instead.
//
// Run it before each release and whenever something has been pinned for a
// while. It is not part of the pre-commit hook: it reaches the network, it
// rewrites four files (two manifests, two lockfiles), and a dependency bump is
// a change that deserves its own commit with its own message.
//
// **`--prerelease` is always passed to the dependency updater.** Newest-first
// is the point of running this at all: a prerelease that is newer than the
// stable tag is exactly the version this project wants to be testing, because
// a problem found here is found before the stable release rather than after —
// and for part of this stack (the Tauri 3 alpha, the TypeScript 7 dev build)
// the newest is only ever a prerelease. The updater still refuses anything its
// own validation rejects (`tsc -b` → `vite build` → `cargo check`, debug and
// release), so "newest" cannot mean "broken", and its holds (the `=`-pinned
// Tauri family, the COM-instance ceilings, the Solid major) are printed with
// their reasons.
//
// Order: rtk first, then the dependencies, then the map. rtk is the proxy this
// project's commands are routed through, so a stale one makes every later
// step's output the wrong shape; the map is regenerated last so its metrics
// describe the tree the update actually produced.

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const TAG = '[update]';
const dryRun = process.argv.includes('--dry-run');

interface Step {
  label: string;
  argv: string[];
  /**
   * Skipped entirely in a dry run. Two reasons a step qualifies: it installs a
   * binary, or it writes a generated file rather than reporting on one.
   */
  skipsOnDryRun?: boolean;
}

const STEPS: Step[] = [
  {
    label: 'rtk → latest release',
    argv: ['run', 'update:rtk'],
    skipsOnDryRun: true,
  },
  {
    label: 'npm + Cargo → newest (prerelease allowed), validated',
    argv: ['run', 'update-deps', '--prerelease', ...(dryRun ? ['--dry-run'] : [])],
  },
  {
    label: 'architecture map',
    argv: ['run', 'arch'],
    skipsOnDryRun: true,
  },
];

console.log(
  dryRun
    ? `${TAG} dry run — no manifests, lockfiles or generated files are written`
    : `${TAG} updating rtk and every dependency to the newest versions`
);

for (const step of STEPS) {
  if (dryRun && step.skipsOnDryRun) {
    console.log(`${TAG} ${step.label} — skipped in a dry run`);
    continue;
  }
  const started = Date.now();
  console.log(`${TAG} ${step.label} …`);
  const result = spawnSync('bun', step.argv, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.status !== 0) {
    console.error(`${TAG} ${step.label} FAILED after ${Date.now() - started} ms`);
    process.exit(1);
  }
  console.log(`${TAG} ${step.label} ok (${Date.now() - started} ms)`);
}

console.log(
  `${TAG} done. Review the lockfile diff (rtk git diff --stat), then run \`bun run validate\`.`
);
