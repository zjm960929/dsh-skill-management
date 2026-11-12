# dsh-skill-management

**Skill management for DeepSeek Harness — one panel for every workspace and global filesystem skill.**

[![npm version](https://img.shields.io/npm/v/dsh-skill-management.svg)](https://www.npmjs.com/package/dsh-skill-management)
[![npm downloads](https://img.shields.io/npm/dm/dsh-skill-management.svg)](https://www.npmjs.com/package/dsh-skill-management)
[![license](https://img.shields.io/npm/l/dsh-skill-management.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.15-339933)](https://nodejs.org/)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-0.2.x-4F46E5)](https://github.com/deepseek-ai/deepseek-harness)

English | [中文](README.zh.md)

`dsh-skill-management` adds a **Skill** entry to the DeepSeek Harness left sidebar, directly below **Plugins**, and opens a full management panel in the main area. It manages the same filesystem skill roots DSH discovers: `.dsh/skills` and `.agents/skills`, for the current workspace and globally.

It is for people who install, edit, or debug skills by hand and want a safe UI instead of editing directories and frontmatter directly.

> **Sidebar label:** Skill · **Panel title:** Skill Management · **Scope:** global and workspaces

## Contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Skill format](#skill-format)
- [Skill directories](#skill-directories)
- [How it works](#how-it-works)
- [HTTP API](#http-api)
- [Safety and limitations](#safety-and-limitations)
- [Development](#development)
- [Releasing](#releasing)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Native sidebar entry** — a **Skill** row directly below **Plugins**; the management panel opens in the main area, not in a modal or separate window.
- **Global and per-workspace scopes** — one group for global skills and one for every workspace registered in DSH.
- **Both skill roots per scope** — manages `.dsh/skills` and `.agents/skills`, matching DSH's own filesystem discovery and rank rules.
- **Multiple install sources** — import a local folder or `.md` file, copy from another workspace or global, create from a form, or paste/read a `SKILL.md`. Path fields include **Browse…** for the native folder chooser.
- **Browse destinations** — pick the export folder with **Browse…** instead of typing an absolute path.
- **Portable export** — export one skill, every valid skill in a workspace, or every valid filesystem skill on the machine as a single `.tgz` archive in a folder you choose.
- **Archive import** — pick a `.tgz` produced by the plugin, inspect its skills, choose global or any workspace and its target directory, then import any subset. Already-extracted folders can use the local path tab.
- **Share-friendly archive layout** — `manifest.json` plus `skills/<id>/...`, regular files only; no symlinks or path traversal.
- **Disable without deleting** — disabling renames the instruction file so DSH stops discovering it immediately; enabling restores it with content and resources intact.
- **Validated editing** — edit `SKILL.md` in place; the plugin validates frontmatter, skill name, description and invocation flags before saving.
- **Preview and metadata** — inspect the full document, source, on-disk path, size and update time, and copy the path in one click.
- **Shadowing hints** — duplicate skill names show **Shadowed**, **Overrides global** or **Overridden in N workspaces** using DSH's rank rules.
- **Search and filters** — search by name, description or path; filter by enabled state or by skill directory.
- **Bilingual UI** — follows the active DSH language in real time (Chinese / English).
- **Owner-only writes** — every API request goes through DSH's `connection.admit()` gate and owner check, failing closed.

## Requirements

- **DeepSeek Harness** `0.2.x` (Desktop or Web). The current verification target is `0.2.2-rc.1` on Desktop.
- **Node.js** `22.15+` on the 22.x line, or `24+`.
- **Cordis** `>=4.0.0-rc <5` as a peer dependency, provided by DSH.
- No additional runtime dependencies.

## Installation

### From the DSH Plugins page

Open **Plugins** in DSH, search for `dsh-skill-management`, and install it. Reload or restart DSH when prompted.

### From the CLI

```bash
dsh plugin --profile web add dsh-skill-management
```

Use the profile you actually run, for example `--profile desktop`. The Desktop profile is managed by the official Desktop app, so prefer its **Plugins** page there.

### From a local checkout

```bash
dsh plugin --profile web add C:\path\to\dsh-skill-management
```

For a packaged local build, install the tarball instead:

```bash
pnpm pack
dsh plugin --profile web add ./dsh-skill-management-<version>.tgz
```

A tarball install is a normal package copy, not a symlink. It replaces a same-name npm install until you restore the published package.

## Usage

1. Open **Skill** in the left sidebar, directly below **Plugins**.
2. Choose **Global** or a workspace on the left.
3. Narrow the list with search, the **All / Enabled / Disabled** filter, or a directory chip.
4. Use **Preview**, **Edit**, **Enable / Disable** or **Uninstall** on a skill card.
5. Click **Install skill** to add a new skill.

### Installing a skill

The install dialog is independent of the scope you are currently viewing. Pick the target scope first, then the target directory:

| Source | What it does |
| --- | --- |
| **Local path** | Copies a skill folder containing `SKILL.md`, or a single `.md` file. A leading `~` is expanded. Use **Browse…** to select a folder. |
| **Copy skill** | Copies an existing skill from another workspace or from global. The source is left unchanged. |
| **Create** | Writes a new `SKILL.md` from the name, description, optional `whenToUse`, body and invocation checkboxes. |
| **Paste SKILL.md** | Accepts raw `SKILL.md` content, or reads it from a file, and installs it as a directory bundle. |

The current view is only the default target. You can install into global, the current workspace, or any other workspace from the same dialog.

### Exporting skills

- Use **Export** on a skill card to export that one skill.
- Use **Export** in the header to export a whole workspace or every valid filesystem skill on the machine.
- Pick an absolute destination folder, or use **Browse…** to select it. The plugin writes one `.tgz` archive there and chooses a non-conflicting file name.
- Only parseable skills are exported. Disabled skills are included and are imported as enabled skills.
- Archives are self-contained: `manifest.json` plus `skills/<id>/SKILL.md` and its resources.

### Importing skills

1. Click **Import** in the header.
2. Choose **Skill archive (.tgz)** and select a `.tgz` / `.tar.gz` produced by this plugin.
3. Inspect the skill list, clear or select the skills you want, then choose the target scope and directory.
4. Click **Import**. The selected skills are installed as active skills.

The **Local folder / .md** tab imports an already-extracted skill folder or a single `SKILL.md` file. Use **Browse…** to pick a folder. External `.zip` downloads are not parsed directly; extract them first and use that tab.

Name conflicts and archive duplicate names are rejected before anything is written. A failed import removes any partially created target directories.

### Enable, disable and uninstall

- **Disable** renames the instruction file; nothing is deleted.
  - Directory bundle: `SKILL.md` → `SKILL.md.disabled`
  - Flat skill: `<name>.md` → `<name>.md.disabled`
- **Enable** reverses the rename.
- **Uninstall** permanently deletes the skill directory or flat file, including its resources. The UI always asks for confirmation.

## Skill format

A skill is either a **directory bundle** (`<name>/SKILL.md` plus resources) or a **flat file** (`<name>.md`). Both use YAML frontmatter:

```markdown
---
name: release-notes
description: "Turn a list of commits into user-facing release notes."
whenToUse: "When preparing a GitHub release."
disable-model-invocation: false
user-invocable: true
---

1. Read the commit range.
2. Group changes by user impact.
3. Write concise release notes.
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | Lowercase letters, digits and single hyphens only. DSH keys the skill by this value. |
| `description` | Yes | Non-empty summary shown in the catalog. |
| `whenToUse` | No | Optional routing hint for the model. |
| `disable-model-invocation` | No | `true` prevents model invocation; the skill remains user-invocable with `/`. |
| `user-invocable` | No | `false` prevents `/name` invocation. |

DSH rejects the legacy names `disableModelInvocation`, `modelInvocable` and `userInvocable`; use the canonical hyphenated fields above.

The installer writes a directory bundle named after the frontmatter `name`. If a folder name and the frontmatter `name` differ, DSH still resolves the skill by the frontmatter name.

## Skill directories

| Scope | Directory | DSH source | Rank |
| --- | --- | --- | --- |
| Workspace | `<project>/.dsh/skills` | `project-dsh` | 100 |
| Workspace | `<project>/.agents/skills` | `project-agents` | 200 |
| Global | `~/.dsh/skills` (or `$DSH_HOME/skills`) | `user-dsh` | 400 |
| Global | `~/.agents/skills` (or `$DSH_AGENTS_HOME/skills`) | `user-agents` | 500 |

`<project>` follows DSH: the nearest ancestor of the workspace directory that contains `.git`, otherwise the workspace directory itself.

Lower rank wins when the same skill name appears more than once in a scope. Workspace skills shadow global skills; the panel shows those relationships on the cards.

## How it works

The plugin has a Host half and a browser half:

```text
┌─────────────────────────────┐
│ DSH main panel (React)      │
│ search / install / edit     │
└──────────────┬──────────────┘
               │ owner-only HTTP
┌──────────────▼──────────────┐
│ Host API                    │
│ /skill-management/api/*     │
│ scan / validate / mutate    │
└──────────────┬──────────────┘
               │ Node fs
┌──────────────▼──────────────┐
│ .dsh/skills, .agents/skills │
│ workspace + global roots    │
└─────────────────────────────┘
```

- The Host half registers the HTTP surface on `ctx.webServer` and reads the workspace list from `ctx.workspaceRegistry`.
- `lib/skill-store.js` is pure Node.js; it scans the four roots, parses frontmatter, validates names and invocation flags, and performs install, rename, save, delete, export and import operations.
- `lib/skill-archive.js` implements a dependency-free USTAR + gzip writer and reader; archives use a `manifest.json` plus `skills/<id>/...` layout.
- The browser half registers a `sidebar.panellist` entry with `order: 1` (DSH's **Plugins** row uses `0`, **Automation tasks** uses `10`) and the corresponding `main` panel key.
- There is no build step; `lib/client.js` is the shipped browser bundle.

The panel reads state on demand; it does not keep a second copy of skill content or metadata.

## HTTP API

All routes require an owner connection and answer `401`, `403` or `503` when the DSH admission gate does not pass.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/skill-management/api/state` | Global and per-workspace skills, roots and statistics |
| `GET` | `/skill-management/api/skill?rootId=&relPath=` | Read one raw `SKILL.md` |
| `POST` | `/skill-management/api/install` | Install from `path`, `copy`, `create` or `text` |
| `POST` | `/skill-management/api/uninstall` | Delete a skill directory or flat file |
| `POST` | `/skill-management/api/toggle` | Enable or disable |
| `POST` | `/skill-management/api/save` | Save edited `SKILL.md` after validation |
| `POST` | `/skill-management/api/validate` | Validate frontmatter without writing |
| `POST` | `/skill-management/api/export` | Export a skill, a workspace, or all skills to a `.tgz` |
| `POST` | `/skill-management/api/import/inspect` | Inspect an uploaded archive or host archive path |
| `POST` | `/skill-management/api/import/install` | Install selected skills from an archive into a target root |

The HTTP API is internal to this plugin and may change between minor releases.

## Safety and limitations

### Safety

- Only entries inside the four known roots are read or changed. A request's `relPath` must be a single entry name directly inside its root; `..`, absolute paths and path separators are rejected.
- All API requests pass through `connection.admit()` before any body is read and require `peer.principal.kind === "owner"`.
- Editing refuses a symlinked `SKILL.md`, so a save cannot follow a link outside the skill root.
- Copying or exporting a skill uses only regular files and directories, skips symlinks, `.git` and `node_modules`, and caps files (400), total size (24 MiB) and folder depth (12) per skill.
- Export archives are capped at 32 MiB and 200 skills. Imported archive paths are normalized and rejected if absolute or containing `..`.
- Import preflights every selected name; a conflict or duplicate aborts before writing, and a mid-import failure removes the directories created by that import.
- Uninstall is permanent and always asks for confirmation in the UI.

### Limitations

- The panel manages the four filesystem roots above only. DSH built-in or plugin-registered runtime skills (for example the official `office` skill, or skills injected with `ctx.skills.register()`) are not listed.
- Extra `customSkillDirs` configured for `skill-filesystem` are not shown.
- Symlinked instruction files can be listed and read, but cannot be edited through the panel; copied or exported skills skip symlinks entirely.
- Only parseable skills are exported. Disabled skills are included and are imported as enabled skills; invalid skills are skipped.
- Import accepts the plugin's `.tgz` / `.tar.gz` format only. A downloaded `.zip` must be extracted first and imported through the local folder tab.
- There are no bulk enable/disable/delete actions; export can cover a whole workspace or the machine.
- Enable/disable relies on DSH's filesystem watcher. If a session's skill catalog is still cached, switch sessions or refresh the page.
- The HTTP API is internal and may change between minor releases.
- The plugin does not manage skill dependencies, versions or remote registries.

## Development

### Repository layout

```text
lib/
  index.js          Cordis Host entry and HTTP API
  skill-store.js    scanning, validation, export and import logic
  skill-archive.js  dependency-free tar.gz writer and reader
  client.js         browser bundle: sidebar row and main panel
locale/
  en.json           Plugins-page display metadata
  zh.json
test/
  api.test.mjs
  client-bundle.test.mjs
  export-import.test.mjs
  skill-store.test.mjs
cordis.patch.yml    bundle row inserted into the DSH profile
```

There is no build step. Edit `lib/client.js` directly and reload the browser after changes.

### Checks and tests

```bash
npm run check
npm test
```

`npm run check` runs `node --check` on the four shipped JavaScript files. The tests create isolated temporary directories and never touch real skills.

If `node --test` cannot spawn child processes in a restricted sandbox, run each test file directly:

```bash
node test/skill-store.test.mjs
node test/api.test.mjs
node test/export-import.test.mjs
node test/client-bundle.test.mjs
```

### Local package smoke test

```bash
pnpm pack
dsh plugin --profile <profile> add ./dsh-skill-management-<version>.tgz
```

A tarball install is a copy, not a symlink. It replaces a same-name npm install; restore the published package when the smoke test is done.

## Releasing

Releases are published by `.github/workflows/publish.yml` when a `v*` tag is pushed. The workflow checks that the tag matches `package.json` and publishes with npm provenance using the `NPM_TOKEN` repository secret.

```bash
npm version patch
git push --follow-tags
```

Do not publish manually from a workstation; let the workflow own the release.

## Contributing

Issues and pull requests are welcome. Keep changes focused on one plugin, run the checks above, and update `README.md` and `README.zh.md` together when behavior or UI text changes.

## License

[MIT](LICENSE)
