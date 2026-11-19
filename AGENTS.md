# Development Procedure & Workflow Guidelines (AGENTS.md)

This repository contains a cross-platform minimalistic desktop application template powered by **Tauri 3 (alpha)**, **Bun.js**, **SolidJS 2**, **TypeScript 7**, and **Cargo (Rust 2024 Edition)**.

> [!IMPORTANT]
> **The stack tracks the newest published version of everything, prereleases included** — the
> policy and much of the tooling come from ZER0 (`C:\Users\Z\Downloads\PROJECTS\Handy_V2`), the
> production app built on the same stack. Since 0.28.0 that means the **Tauri 3 alpha**
> (`tauri =3.0.0-alpha.6`, plugins from `plugins-workspace@v3`), stable **Solid 2.0.x**, the
> **TypeScript 7.1 dev** build and **Vite 8.4 beta**. Read [§ The routine](#-the-routine-keeping-every-dependency-newest)
> and [§ Tauri 3](#-tauri-3-alpha--the-family-moves-as-one-set) before touching a manifest.

---

## ⚡ Primary Standard: Bun, Testing Command & Golden Rule

> [!CRITICAL]
> **1. Package Manager Standard**:
> NEVER use `npm`, `npx`, `yarn`, or `pnpm`. **ALWAYS use `bun`** for dependency management, script execution, and tooling.
>
> **2. Ultimate Testing Command**:
> The **ONLY** primary command to launch, test, and develop this application is:
>
> ```bash
> bun run tauri dev
> ```
>
> **3. Golden Rule — `rtk` Command Prefix**:
> Always prefix commands with `rtk`. If RTK has a dedicated filter, use it; otherwise it passes the command through unchanged. RTK is always safe.
>
> - This applies to **every** command, including chains: `rtk git add . && rtk git commit -m "msg" && rtk git push`.
> - `rtk bun ...` is NOT used — `rtk` is not needed in front of `bun` when running the sanctioned Bun scripts (see the command table below).
>
> | ❌ Wrong                                       | ✅ Correct                                                              |
> | :--------------------------------------------- | :---------------------------------------------------------------------- |
> | `git add . && git commit -m "msg" && git push` | `rtk git add . && rtk git commit -m "msg" && rtk git push`              |
> | `git status`                                   | `rtk git status`                                                        |
> | `bun run typecheck`                            | `bun run typecheck` (Bun scripts run directly, no `rtk` wrapper needed) |

---

## 📚 Documentation-First Standard

> [!CRITICAL]
> **The upstream documentation for every layer of this stack is vendored on disk.
> Read it before answering an architecture question — do not answer from memory
> and do not reach for a web search first.**
>
> ```bash
> bun run docs:sync                  # clone/refresh every mirror (gitignored, ~200 MB)
> bun run docs:check                 # branch, commit, freshness per mirror
> bun run docs:find "capabilities"   # search all mirrors at once
> ```
>
> | Layer                   | Local mirror                           | Pinned branch |
> | :---------------------- | :------------------------------------- | :------------ |
> | Tauri guides (concepts) | `.docs/tauri-docs/src/content/docs/`   | `v2`          |
> | **Tauri 3 core (API)**  | `.docs/tauri-v3/.changes/` + `crates/` | `v3`          |
> | **Tauri 3 plugins**     | `.docs/tauri-plugins-v3/plugins/`      | `v3`          |
> | SolidJS 2               | `.docs/solid-docs/src/routes/`         | `v2-rebuild`  |
> | Bun                     | `.docs/bun-docs/content/docs/`         | `main`        |
> | TypeScript              | `.docs/typescript-website/packages/`   | `v2`          |
> | TypeScript 7 changes    | `.docs/typescript-go/CHANGES.md`       | `main`        |
>
> **The branch pins are load-bearing.** `solid-docs@main` documents SolidJS 1.x —
> a different runtime with `createResource`, `onMount`, `<Suspense>` and
> `<ErrorBoundary>`, none of which exist in this codebase. Tauri 1 docs describe
> an allowlist security model we do not use. TypeScript 5 tutorials assume
> defaults TypeScript 7 changed.
>
> **Tauri is split across three mirrors on purpose.** The guides are still read from
> `tauri-docs@v2` — its `v3` branch is `v2` plus two "v3 docs (alpha)" commits and ~77
> commits behind — so concepts (capabilities, CSP, updater, bundling) come from there, but
> **every API signature must be checked against `tauri-v3`**. Its `.changes/` directory holds
> one changeset per breaking change (`runtime-selection.md`, `wry-runtime-rename.md`,
> `remove-macos-private-api.md`, …) and, with no v3 migration guide published, it _is_ the
> migration guide. Plugin changes live in `tauri-plugins-v3` (e.g. the autostart
> `autolaunch()` → `autostart()` rename, the updater's removed `Update.available`).
>
> **Cite the file you read** when a change is doc-driven, e.g. "per
> `.docs/solid-docs/src/routes/(2)concepts/(4)boundaries.mdx`, a loading boundary
> belongs around the smallest coherent region".
>
> Never edit anything under `.docs/` — it is a read-only checkout and the next
> sync hard-resets it. Adding a significant dependency means adding its docs to
> the manifest in `scripts/sync-docs.ts`.
>
> Full reading map: [`DOCUMENTATION.md`](DOCUMENTATION.md). TypeScript 7 specifics
> and this repo's compliance audit: [`TYPESCRIPT-7.md`](TYPESCRIPT-7.md).

---

## 🔁 The routine: keeping every dependency newest

Ported from ZER0 in 0.28.0. **The gate is not the routine.** The gate (`bun run validate`,
the git hook) proves the tree is healthy; the routine is what you run _before_ the gate to
move the tree to the newest of everything:

```bash
bun run update        # 1. rtk → latest, EVERY dep to its newest PRERELEASE, validated, then `arch`
bun run validate      # 2. the full gate (11 steps) on what step 1 left behind
rtk git commit        # 3. a dependency bump is its own commit, with its own message
bun run routine       # = steps 1 + 2 as one command
bun run update --dry-run   # report what would move, write nothing
```

- **Step 1 always goes to prerelease, for every dependency.** `--prerelease` is baked into
  `bun run update`; there is no way to run the routine and get a stable-only update. For part
  of this stack the newest is _only ever_ a prerelease (the Tauri 3 alpha, the TypeScript 7
  dev build, Vite betas, Prettier 4 alphas), so "newest stable" would silently hold them back.
  A bare `bun run update-deps` still runs stable mode — type the flag yourself if you call it
  directly.
- **Step 1 is manual and deliberately not in the hook.** It reaches two registries, rewrites
  both lockfiles, and runs its own validation: `tsc -b` → `vite build` → `cargo check` in
  **both** the debug and release profiles. There is no flag to skip that — a lockfile that
  resolves is not a lockfile that builds.
- **Holds are printed with their reasons, never silent.** `scripts/update-deps.ts` refuses to
  move: the `=`-pinned Tauri family and `@tauri-apps/cli` (`CARGO_VERSION_LOCKED`,
  `NPM_VERSION_LOCKED`); every other `@tauri-apps/*` package past the backend's major
  (`NPM_MAJOR_LOCKED_PREFIXES`); `windows`, `windows-core` and `webview2-com` past the
  generation Tauri links (`CARGO_MAJOR_LOCKED`); `libc` onto its 1.0 alphas
  (`CARGO_STABLE_ONLY`); Solid off its 2.x major (`NPM_LINE_PINNED`). A cargo resolution
  conflict holds the culprit crate back and retries instead of failing the run.
- **The run ends with two audits:** transitive crates newer on crates.io but pinned by
  something in the graph, and **GitHub Actions** whose repository published a newer major than
  `.github/workflows/` pins (report only — an Action major can rename inputs, and nothing in the
  run executes a workflow, so that bump is a reviewed edit).
- **`bun run update:rtk`** reinstalls the `rtk` proxy at the newest tag (`--check` only resolves
  it). It runs first in the routine because a stale proxy makes every later step's output the
  wrong shape. It replaces a machine-wide binary — expected, but know that it does.

---

## 🧱 Tauri 3 (alpha) — the family moves as one set

The backend runs on the **Tauri 3 alpha**, exactly as ZER0 does. Three rules, each learned the
hard way there (see `docs/FORKS.md` and `CHANGELOG.md` in ZER0 for the incidents):

1. **The family is pinned with `=` and moves as a set.** A prerelease requirement like
   `3.0.0-alpha.4` reads as `>=3.0.0-alpha.4, <3.0.0`, so a bare `cargo update` unifies the
   family forward by itself, and a family split across alphas resolves and then fails to
   compile (or `tauri-build` rejects `tauri.conf.json`) with an error naming none of the crates.
   `src-tauri/Cargo.toml` therefore declares `tauri-runtime`, `tauri-utils`, `tauri-macros`,
   `tauri-plugin` and `tauri-codegen` **purely to carry an `=`** — removing one splits the family
   again. `@tauri-apps/cli` is the same release as `tauri` (it validates the config before cargo
   runs). To move: bump every `=` in one edit, then the CLI, then `bun run tauri dev`.
2. **Plugins come from `tauri-apps/plugins-workspace`, branch `v3`** (git dependencies;
   `Cargo.lock` pins the commit; `bun run update` moves it). The JS halves are the
   `3.0.0-alpha.x` npm packages.
3. **Bindings come from the `tauri-specta` Tauri 3 fork.** Upstream publishes for Tauri 2 only;
   `[patch.crates-io]` swaps in `NairoDorian/tauri-specta-v3` (upstream rc.29 + the Tauri 3
   adaptation). Its working copy is `C:\Users\Z\Downloads\PROJECTS\tauri-specta-v3`: change the
   fork **there**, push it, then `cargo update -p tauri-specta` here. Never edit a copy under
   `target/` or `~/.cargo/git/checkouts` — Cargo.lock pins a commit SHA, so an unpushed edit does
   not exist.

What Tauri 3 changed in _this_ codebase (all in 0.28.0): the runtime is selected explicitly —
`tauri::Builder::default().runtime(tauri_runtime_wry::Wry::default())`, or the build fails with
`RuntimeNotConfigured`; `tauri::Wry` is gone, so the specta builder is typed on
`tauri::DynRuntime`; WebView2 is reached by `downcast_ref::<tauri_runtime_wry::Webview>()`;
the autostart extension is `app.autostart()`; the updater's `Update.available` is gone (a
non-null `check()` is the answer); the Linux tray uses **ksni** (no `libayatana-appindicator`
system package); the MSRV is 1.95. Specta rc.28 now emits **phase-split types** for structs with
serde defaults — `AppSettings_Serialize` (what a command returns, every field present) and
`AppSettings_Deserialize` (what a command accepts, defaulted fields optional) — and every command
takes an optional trailing `InvokeOptions`.

---

## 📋 Standard Operating Procedure (SOP)

Follow this 7-step process when developing, modifying, or testing this repository:

### Step 1: Environment Verification

Verify that Bun and Cargo/Rust toolchains are installed:

```bash
bun --version
cargo --version
```

> [!TIP]
> Move to the bleeding edge: `bun upgrade --canary` bumps Bun to the latest
> canary channel build (used to validate new TypeScript/JS runtime features).

### Step 2: Dependency Installation & Automated @latest Upgrades

Install project dependencies using Bun:

```bash
bun install
```

To bring every dependency to its newest version (prereleases included), validated — see [§ The routine](#-the-routine-keeping-every-dependency-newest):

```bash
bun run update            # rtk → update-deps --prerelease → arch
bun run update --dry-run  # report only
```

### Step 3: Development & Primary Testing

Run the app in live development mode using the ultimate test command:

```bash
bun run tauri dev
```

- **Left-Click Tray Icon**: Toggles GUI window show/hide.
- **Right-Click Tray Icon**: Opens context menu with **Open / Hide GUI**, **Check for Updates...**, and **Quit**.
- **Close Button (X)**: Minimizes to taskbar tray when enabled in preferences (default OFF — closing quits).

### Step 4: Version Sync Before Committing

Before any commit, synchronize the single global application version (`APP_VERSION` in `scripts/version.ts`) across all mirrors:

```bash
bun run before-commit
```

- `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json` are auto-synced mirrors — NEVER hardcode or edit the version there; only `scripts/version.ts` (or `bun run before-commit --bump <major|minor|patch>`) may change it.
- Use `bun run before-commit --check` for read-only validation (exit 1 on drift) in CI or pre-commit hooks. CI runs this on every push/PR.

### Step 5: Cleaning Build Target Artifacts (Optional)

To purge `src-tauri/target/` build directories completely:

```bash
bun run clean
```

### Step 6: Architecture Maintenance

Whenever files are added, modified, or removed, run the architecture map generator:

```bash
bun run arch
```

- Ensures [`ARCHITECTURE.md`](ARCHITECTURE.md) contains the up-to-date directory tree and file inventory table without code dumps.

### Step 7: Production Build Validation

Validate production compilation and native bundle generation:

```bash
bun run build
```

---

## 📦 Release Procedure (Version Bump → Commit → Push) — EXACT ORDER

Follow these steps **in this order** whenever a version bump / release is requested. Do NOT skip or reorder them.

### 1. Bump the Version (single command, propagates everywhere)

```bash
bun run before-commit --bump <major|minor|patch>
```

- Updates `scripts/version.ts` (the **only** place the version is defined) and auto-syncs the mirrors: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and stamps the new version into the root crate's own `[[package]]` block of `src-tauri/Cargo.lock` (no other entry is touched).
- NEVER hand-edit the version in any mirror file — the script owns them.

#### Choosing `major`, `minor`, or `patch` (SemVer semantics)

| Bump    | Example          | Use when                                                                                                       | Result                               |
| :------ | :--------------- | :------------------------------------------------------------------------------------------------------------- | :----------------------------------- |
| `patch` | `0.9.0 → 0.9.1`  | Backward-compatible **bug fixes**, corrections, and polish — no new behavior. The safest and most common bump. | patch digit `+1`                     |
| `minor` | `0.9.0 → 0.10.0` | New **backward-compatible features** or additions (new toggles, IPC commands, views).                          | minor `+1`, patch → `0`              |
| `major` | `0.9.0 → 1.0.0`  | **Breaking changes** — incompatible config/behavior/IPC changes, removals, renames, new runtime requirements.  | major `+1`, minor → `0`, patch → `0` |

> [!NOTE]
> SemVer nuance: while below `1.0.0` (0.x), _anything_ may be considered breaking. The template convention: **patch = fixes, minor = features, major = deliberate breaking overhaul**. When the user does not specify, ask which level they want.

### 2. Update `CHANGELOG.md` (top of file)

Add the new release entry with the exact version and today's date:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### <Round / Release Title>

#### ⚛️ <Category>

- **Change**: Description.
```

- The `## [X.Y.Z]` header **must** match the bumped version — `before-commit --check` warns when it's missing. Each version may appear **exactly once** in the file (Keep a Changelog rule).
- Do this BEFORE regenerating the architecture map, so metrics include the edit.

### 3. Update Other Docs ONLY if Version-Dependent

`README.md`, `AUTO-UPDATE.md`, and `AGENTS.md` usually need no changes for a patch bump. Only edit them when their content actually references version-dependent facts (e.g. tech-stack tables, new scripts, changed workflow steps). Do not churn docs for the sake of it.

### 4. Regenerate the Architecture Map

```bash
bun run arch
```

- `ARCHITECTURE.md` embeds per-file metrics (sizes, lines, tokens) — the changelog edit and any new files change these, so regeneration MUST happen after steps 1–3.

### 5. Validate Everything (order: check, lint, then typecheck)

```bash
bun run before-commit --check   # all mirrors at X.Y.Z — exit 1 on drift
bun run lint                    # oxlint src test scripts
bun run typecheck               # bun x tsc -b
```

- If `--check` fails, run `bun run before-commit` (plain sync) or re-run `--bump` and fix the drift before committing.

### 6. Commit (repository message style)

```bash
rtk git add <files>
rtk git commit -m "feat(vX.Y.Z): <short summary> — <key changes, comma separated>"
```

- Style precedent: `feat(v0.8.0): deep audit round 5 — single-instance guard, ToggleSwitch extraction, ...`
- Only commit when explicitly asked. Inspect `rtk git status` / `rtk git diff` first; never stage secrets or build artifacts (they are gitignored).

### 7. Push

```bash
rtk git push origin main
```

- If the commit was already pushed and you must amend it (`rtk git commit --amend`), push with `--force-with-lease` (never bare `--force`).

> [!IMPORTANT]
> **Why this order**: bump first (mirrors must match the new version before anything else reads them), then changelog (so `--check` can verify the header), then `arch` (so metrics include the changelog), then validate, commit, push. Reversing any two steps breaks the invariants the scripts enforce.

---

### `bun run before-commit` Reference — Every Mode, Explained

| Command                                                  | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Writes?                            |
| :------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------- |
| `bun run before-commit`                                  | **Sync mode (default).** Reads `APP_VERSION` from `scripts/version.ts` and propagates it into `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`; stamps the root crate's block in `src-tauri/Cargo.lock`. Prints a per-mirror report (`✅ in sync` / `🔧 fixed`).                                                                                                                                                                                                                  | Yes                                |
| `bun run before-commit --check`                          | **Validation mode.** Compares every mirror against `APP_VERSION` **without writing**; exits `1` on any drift. Safe for CI and pre-commit hooks.                                                                                                                                                                                                                                                                                                                                                          | No                                 |
| `bun run before-commit --full` (or `bun run validate`)   | **Full Pro Pre-Commit Suite.** Runs all 11 quality gates sequentially, cheapest-first: version mirror check, formatting (`prettier --check` + `cargo fmt --check`), TS typecheck (`tsc -b`), code lint (oxlint), Bun unit tests, production Vite build, `cargo check`, `cargo check --release` (the only profile that compiles the WebView2 hardening), `cargo clippy -D warnings`, `cargo test`, and Architecture map refresh — the same set CI enforces. Exits 0 on 100% pass with a timing breakdown. | Yes (`arch`)                       |
| `bun run before-commit --routine` (or `bun run routine`) | **The routine.** `bun run update` (rtk, every dependency to its newest version with `--prerelease`, validated in both cargo profiles, `arch`), then the full 11-gate suite on the result. Manual by design — never in the hook.                                                                                                                                                                                                                                                                          | Yes (manifests, lockfiles, `arch`) |
| `bun run before-commit --bump patch`                     | Increments the patch digit in `scripts/version.ts` (`0.11.0 → 0.11.1`), then runs the sync.                                                                                                                                                                                                                                                                                                                                                                                                              | Yes (incl. `version.ts`)           |
| `bun run before-commit --bump minor`                     | Increments the minor digit and zeroes patch (`0.11.0 → 0.12.0`), then runs the sync.                                                                                                                                                                                                                                                                                                                                                                                                                     | Yes (incl. `version.ts`)           |
| `bun run before-commit --bump major`                     | Increments the major digit and zeroes minor + patch (`0.11.0 → 1.0.0`), then runs the sync.                                                                                                                                                                                                                                                                                                                                                                                                              | Yes (incl. `version.ts`)           |
| `bun run before-commit --set <version>`                  | Sets an exact custom SemVer string (e.g. `1.0.0-rc.1`) and propagates it to all mirrors.                                                                                                                                                                                                                                                                                                                                                                                                                 | Yes (incl. `version.ts`)           |
| `bun run before-commit --stage`                          | Automatically stages updated mirror files with `git add`.                                                                                                                                                                                                                                                                                                                                                                                                                                                | Git index                          |
| `bun run before-commit --install-hook`                   | Installs `.git/hooks/pre-commit` (runs `--check` + `format:check` + `lint` + `typecheck` + `test` before every commit). The hook is a **copy** of the template in the script: after editing the template, run `--uninstall-hook` then `--install-hook` again.                                                                                                                                                                                                                                            | Yes (hook file)                    |
| `bun run before-commit --uninstall-hook`                 | Removes the `.git/hooks/pre-commit` hook cleanly.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Yes (removes hook)                 |
| `bun run before-commit --help`                           | Prints the usage summary and exits `0`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | No                                 |

**Behavioral details:**

- **Changelog advisory**: after any bump, if `CHANGELOG.md` has no `## [<new version>]` header yet, the script prints a non-blocking `⚠️` reminder.
- **A sync touches one block of `Cargo.lock`, nothing else.** Until 0.28.0 the refresh was `cargo generate-lockfile`, which re-resolved _every_ dependency (the 0.27.0 bump rewrote roughly a hundred crate entries) — and with the plugins now git dependencies on `plugins-workspace@v3`, it would also have moved the plugin commit inside a "version bump". The root crate's `[[package]]` block (the one sourceless block carrying the crate's name) is now rewritten textually, the technique ZER0's `scripts/app-meta.ts` uses. Moving dependencies is `bun run update`'s job. `generate-lockfile` remains only as the fallback when no lockfile exists.
- **Exit codes**: `0` = all mirrors in sync / success; `1` = drift (`--check`), invalid usage, missing mirror files, or non-git repo (`--install-hook`).
- **Rejected combinations**: `--bump` without a part, unknown bump part, `--set` with invalid semver, and combining `--check` with `--bump`/`--set`.

---

## 🔧 Common Tasks — Quick Reference

| Task                                                   | Command(s)                                                                                         |
| :----------------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| Live development                                       | `bun run tauri dev`                                                                                |
| Live development, fastest link path                    | `bun run dev:fast` (`--check` to report the detected configuration only)                           |
| Add a runtime dependency                               | `bun add <package>`                                                                                |
| Add a dev dependency                                   | `bun add -d <package>`                                                                             |
| **Upgrade everything to newest (the routine, step 1)** | `bun run update` (rtk → `update-deps --prerelease` → `arch`; `--dry-run` to preview)               |
| Routine + full gate in one command                     | `bun run routine`                                                                                  |
| Upgrade direct deps, stable tags only                  | `bun run update-deps` (`--dry-run` to preview)                                                     |
| Upgrade with pre-releases                              | `bun run update-deps --prerelease` (what `bun run update` runs; strictly-newer targets only)       |
| Update the RTK CLI to the latest tag                   | `bun run update:rtk` (queries the `rtk-ai/rtk` GitHub tags API for the newest tag)                 |
| Bump version (then sync mirrors)                       | `bun run before-commit --bump <major\|minor\|patch>`                                               |
| Set exact custom version                               | `bun run before-commit --set <semver>`                                                             |
| Check version drift (read-only)                        | `bun run before-commit --check`                                                                    |
| Full pre-commit test suite                             | `bun run validate` (or `bun run before-commit --full`)                                             |
| Auto-stage synced mirrors                              | `bun run before-commit --stage`                                                                    |
| Install pre-commit git hook                            | `bun run before-commit --install-hook`                                                             |
| Uninstall pre-commit git hook                          | `bun run before-commit --uninstall-hook`                                                           |
| Format codebase (Prettier + cargo fmt)                 | `bun run format`                                                                                   |
| Check formatting without modifying files               | `bun run format:check`                                                                             |
| Format frontend only (Prettier)                        | `bun run format:frontend`                                                                          |
| Format backend only (cargo fmt)                        | `bun run format:backend`                                                                           |
| Lint codebase (oxlint, TS7-compatible)                 | `bun run lint`                                                                                     |
| Auto-fix lint issues                                   | `bun run lint:fix`                                                                                 |
| Run frontend unit tests                                | `bun run test` (never a bare `bun test` — the script selects Solid's client build, see TESTING.md) |
| Run Rust unit tests                                    | `cargo test --manifest-path src-tauri/Cargo.toml`                                                  |
| Run full pre-commit gate suite                         | `bun run validate` (or `bun run before-commit --full`)                                             |
| Type-check the whole workspace                         | `bun run typecheck`                                                                                |
| Rebrand & rename project starter kit                   | `bun run rename-project --name "App Name" --identifier "com.id"`                                   |
| Regenerate `ARCHITECTURE.md`                           | `bun run arch`                                                                                     |
| Clone / refresh the doc mirrors                        | `bun run docs:sync` (add `--only <id>` for one source)                                             |
| Check doc mirror freshness                             | `bun run docs:check`                                                                               |
| Search all doc mirrors                                 | `bun run docs:find "<query>"`                                                                      |
| Regenerate all app icons                               | `bun run create-icons`                                                                             |
| Purge Rust build artifacts                             | `bun run clean`                                                                                    |
| Production build                                       | `bun run build`                                                                                    |
| Commit / push                                          | `rtk git add <files>` → `rtk git commit -m "feat(vX.Y.Z): ..."` → `rtk git push origin main`       |

---

## 💡 Best Practices & Coding Standards

1. **Package Management Rules**:
   - To add packages: `bun add <package>` (or `bun add -d <package>` for devDependencies).
   - To execute scripts: `bun run <script-name>`.
   - Never generate or commit `package-lock.json`, `yarn.lock`, or `pnpm-lock.yaml`. Commit `bun.lock`.
   - Project Bun configuration lives in `bunfig.toml` at the repo root: `env = false` (top-level, not under `[env]`) disables automatic `.env` file loading because the Tauri backend manages env vars via `tauri.conf.json` build scripts; `linker = "isolated"` activates Bun 1.4's global virtual store (shared cache, up to 7x faster warm installs); `peer = true` enables peer dependency auto-install. The `[env]` table is for defining env variable values, NOT for config toggles — Bun 1.4's strict TOML parser rejects unknown keys.

2. **System Tray & Window Lifecycle Patterns**:
   - **Single-Instance Guard**: `tauri-plugin-single-instance` is registered first in the builder; launching the app a second time focuses the existing window instead of spawning a duplicate tray icon.
   - **The second launch is an IPC channel, not just a guard.** The plugin hands the running process the blocked copy's `argv`; `run()` re-parses it through `cli::parse` and dispatches via `handle_instance_request`. That is what makes `app.exe --toggle` work from a shortcut or a script. Never write `|app, _args, _cwd|` — throwing the arguments away is what the previous version did, and it made `--autostart` a dead flag for a whole release.
   - **Quitting has one implementation, `request_quit()`.** The ordering is load-bearing: set `is_quitting` **first**, or `CloseRequested` merely hides the window and leaves a headless process behind; then detach the OS keyboard hook; then close. Any new quit trigger calls that function rather than repeating the sequence.
   - **Graceful Win32 Teardown**: Set `is_quitting = true` in `AppState` and call `window.close()` on the main window. This allows WebView2 to unregister window classes (`Chrome_WidgetWin_0`) cleanly through the Win32 message loop without throwing log errors.
   - **IPC State Syncing**: Use `get_minimize_to_tray` and `set_minimize_to_tray` IPC commands for preferences (persisted on disk to `$APP_DATA_DIR/<identifier>/settings.json`), and `get_autostart` / `set_autostart` for the OS launch entry. The webview never calls `@tauri-apps/plugin-autostart` — the JS package is not even installed — because the Rust side owns that write (`src-tauri/src/autostart.rs`).
   - **No hardcoded version strings**: never write an app version into `src/` or `src-tauri/src/` — read `__APP_VERSION__` (Vite define) or `AppHandle::package_info()`.

3. **Rust Backend Conventions (`src-tauri/src/lib.rs`)**:
   - **IPC error contract**: preference-writing commands return `Result<(), String>` with descriptive messages; the frontend implements optimistic UI updates that roll back on `Err`.
   - **Disk-first persistence**: `set_minimize_to_tray` writes the new value to disk **before** mutating memory — a failed write leaves memory, disk, and UI consistent.
   - **Poison-safe locking**: never call `Mutex::lock().unwrap()` — use the `lock_guard()` helper which recovers from `PoisonError`.
   - **Single source of truth**: product name/tooltip/version come from `AppHandle::package_info()`; settings paths come from `app_config_dir()`; never reconstruct either by string matching.
   - **Descriptive `expect`/error messages**: icon bootstrapping fails gracefully with a setup error instead of a cryptic panic.

4. **Documentation-Driven Changes**:
   - Before changing anything framework-shaped — a lifecycle primitive, a boundary, a capability, a `tsconfig` flag — read the pinned local mirror (`bun run docs:find`), not memory.
   - Prefer the primitive the current major version prescribes: `onSettled` returning a cleanup (not `onMount`/`onCleanup`), two-argument `createEffect`, async `createMemo` (not `createResource`), `<Loading>`/`<Errored>` (not `<Suspense>`/`<ErrorBoundary>`).
   - Scope `<Loading>` to the smallest region its fallback should replace; keep navigation and controls outside it so they stay usable during a load.
   - Load persisted state with `createMemo(async …)` plus writable derived signals (`createSignal(fn)`), never by `.then()`-ing an IPC result into a pile of signals — the gap between mount and resolution is a window where a user's click lands on a placeholder value and is then silently overwritten.
   - Keep memo computes side-effect free. DOM writes, IPC writes, subscriptions and storage go in `createEffect`'s apply phase.
   - Never touch `localStorage` directly — use `readStored` / `writeStored` / `removeStored` from `src/lib/storage.ts`, which degrade a disabled or full store to "not persisted" instead of throwing into the render tree.
   - Give every `createEffect` apply phase and every `onSettled` callback a **block body**, unless it genuinely returns a cleanup function. Solid calls the return value as cleanup, so a concise arrow that happens to return a string or a number halts the reactive system on the effect's next run (`REACTIVITY_HALTED`).
   - Run frontend tests with `bun run test`, never a bare `bun test`: the script passes `--conditions browser` because `solid-js` resolves to its **SSR build** by default in Bun, where effects never run.
   - Grant Tauri permissions explicitly rather than relying on a plugin's `:default` set, so an upstream widening of that set cannot silently broaden this app's surface. Better still, keep the capability out of the webview entirely when a Rust command can own it — autostart needs no webview permission at all now.
   - Anything whose effect depends on the **path of the running executable** — OS autostart being the canonical case — must be guarded by `cfg!(debug_assertions)`, because a development binary lives in `target/debug` and would otherwise overwrite the installed app's registration.
   - Resolve every app-written path through `portable::config_dir()` / `portable::log_dir()`, never `app.path().app_config_dir()` directly, or portable mode silently writes half its state to the OS directories. Remember the engine writes too — `webview_runtime.rs` redirects WebView2's own storage, and that is Windows-only by documented limitation.
   - **Anything that must run before the first window exists goes in `run()` above the builder, or in `main.rs`** — in this order: `panic_log::install()`, `portable::init()`, `webview_runtime::init()`. Environment variables the webview reads (`WEBVIEW2_USER_DATA_FOLDER`, `WEBKIT_DISABLE_DMABUF_RENDERER`) have no effect once a window has been created, and `setup()` is already too late.
   - **Changing the _meaning_ of a settings field is a migration, not an edit.** `settings_repair.rs` only sees wrong _types_; a renamed key, a changed unit, or a violated invariant deserializes cleanly and means the wrong thing. Add a step to `settings_migrate.rs`, bump `CURRENT_SETTINGS_VERSION` in the same commit, and give it a test with a real legacy document. Migration runs on the raw `Value` **before** repair — after the repair merge, the old shape is already gone.
   - **A GUI app never exits over a command-line argument.** Desktop shells inject their own (`-psn_0_…` from Finder, a path from a file association). Unknown arguments are collected into `CliArgs::unknown` and logged; anything else turns "user double-clicked the icon" into "app failed to start".
   - Adding, renaming or removing an IPC command means running `bun run tauri dev` once so `src/bindings.ts` regenerates; `test/bindings.test.ts` fails the commit otherwise.
   - **`webview2-com`, `windows-core` and `windows` must track whatever `tauri-runtime-wry`/`wry` link** (currently 0.39 / 0.62 / 0.62), because `tauri_runtime_wry::Webview::controller()` returns _their_ types. Since 0.28.0 the keyboard hook shares that `windows` generation instead of pinning its own (it used 0.58 beside Tauri's 0.61 — two copies of the largest crate in the graph); `update-deps` holds all three on Tauri's line. A skew is a compile error in the **release** profile only — `bun run validate`, `update-deps` and CI (Windows) now all run `cargo check --release`.
   - **A test that installs a process-global hook must serialize itself.** `cargo test` is multi-threaded; two tests swapping the panic hook concurrently produced a panic _inside_ a panic hook, which aborts the whole binary with `STATUS_STACK_BUFFER_OVERRUN` and blames an unrelated line. See `panic_log.rs`'s `describe_panic`.

5. **SolidJS 2 / TypeScript Frontend Conventions (`src`)**:
   - **Component separation** (Round 14 layout): `App.tsx` is the shell (tabs, header, footer, status). `PreferencesTab.tsx` owns preference state + handlers. `AboutTab.tsx` is presentational and exports shared types. `ToggleSwitch.tsx` and `UpdateChecker.tsx` are reusable primitives.
   - **Concurrency guards are plain variables, not signals**: an in-flight IPC or network operation (an update check, a download) is tracked in a component-scope `let` — and, when every instance must share it, a module-level flag such as `installInFlight` in `UpdateChecker.tsx` — never in a signal. A guard read on every call must not subscribe anything, and the listener that reads it (the tray `"check-for-updates"` handler) is registered once in `onSettled` and must keep seeing the current value.
   - **`UpdateChecker` dual-variant rule**: exactly one instance may auto-check and exactly one may listen, but they are **not the same instance** — the card (Preferences tab) passes `autoCheckOnMount={checkUpdatesOnLaunch} listenForEvents={() => false}` and unmounts with its tab; the footer, mounted for the whole session, passes `autoCheckOnMount={() => false} listenForEvents={() => true}` and so owns the tray event. Both props are read once, untracked, in `onSettled` (CRUSH.md pattern 3).
   - **Optimistic rollback**: toggles update state immediately, then revert on IPC/plugin failure (see `PreferencesTab.tsx`).
   - **Never `import React`** — SolidJS 2's JSX transform handles element creation via `jsxImportSource: "@solidjs/web"`. Use `import type { Component }` / named type imports with `verbatimModuleSyntax`-safe patterns.
   - **Catch clauses**: use `error: unknown` + `instanceof Error` narrowing — never `any`.
   - **Never test an event target with `instanceof HTMLInputElement`** — use `isTextEntryTarget` from `src/lib/keyboard.ts`. `instanceof` compares against _this_ window's constructors, so an element from an `<iframe>` or another document fails the check while being a real text field; and the DOM constructors do not exist in a bare Bun test process, which makes any such rule untestable.
   - **Anything that must not happen in a dev build is gated on `import.meta.env.PROD`**, not on a runtime setting — the webview hardening in `src/lib/hardening.ts` is the example. A runtime flag is one forgotten toggle away from shipping a build where `F5` still wipes the user's state.

6. **Accessibility Contract (ARIA)**:
   - **Tabs**: `role="tablist"` / `role="tab"` / `role="tabpanel"` with `aria-selected`, `aria-controls`, `aria-labelledby`, roving `tabIndex`, and arrow + Home/End keyboard navigation.
   - **Switches**: `role="switch"` + `aria-checked`, `tabIndex={0}`, Space/Enter activation, and a visually-hidden native checkbox for form semantics.
   - **Live regions**: `aria-live="polite"` on the footer status and update status regions; `role="progressbar"` with `aria-valuemin/max/now` on download progress.

7. **UI Theme & Aesthetic Standards**:
   - **Background**: 100% AMOLED Deep Black (`#000000`) — also painted inline in `index.html` to avoid white flash.
   - **Glassmorphism**: Translucent frosted cards (`backdrop-filter: blur(20px)`), `rgba(255, 255, 255, 0.08)` borders, and neon cyan (`#00f2fe`) accent glows.
   - **Typography**: Clean, sans-serif typography (`Inter`).

8. **Documentation Rules**:
   - Maintain [`README.md`](README.md), [`DOCUMENTATION.md`](DOCUMENTATION.md), [`TYPESCRIPT-7.md`](TYPESCRIPT-7.md), [`BUILD.md`](BUILD.md), [`TESTING.md`](TESTING.md), [`CONTRIBUTING.md`](CONTRIBUTING.md), [`SECURITY.md`](SECURITY.md), [`CRUSH.md`](CRUSH.md), [`CHANGELOG.md`](CHANGELOG.md), [`AUTO-UPDATE.md`](AUTO-UPDATE.md), [`LICENSE`](LICENSE), [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md), [`ARCHITECTURE.md`](ARCHITECTURE.md), and [`AGENTS.md`](AGENTS.md).
   - When a dependency layer is added or a major version is bumped, update the mirror manifest in [`scripts/sync-docs.ts`](scripts/sync-docs.ts) and the reading map in [`DOCUMENTATION.md`](DOCUMENTATION.md) in the same change.
   - Keep inline code comments detailed and informative — every non-obvious function gets a doc comment explaining _why_, not just _what_.
   - After any file add/remove/rename, regenerate the architecture map (`bun run arch`).
   - Each changelog version header may appear exactly once; keep the exact `## [X.Y.Z] - YYYY-MM-DD` format.
