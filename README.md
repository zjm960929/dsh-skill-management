# dsh-skill-management — Skill Management for DeepSeek Harness

**Display name:** 技能管理 (Skill Management)  
**npm package:** `dsh-skill-management`

A left-sidebar skill manager for DeepSeek Harness. It brings every filesystem skill installed in each workspace and globally into one panel, where you can browse, import, edit, enable/disable and uninstall them, with clear source, shadowing and validity information.

English | [中文](README.zh.md)

## Features

- **Left-sidebar entry**: adds a “技能管理” row to the DSH sidebar and opens a full management panel in the main area.
- **Per scope**: one group for global skills and one for each registered workspace, following the workspace titles DSH already knows.
- **Two skill directories per scope**: manages both `.dsh/skills` and `.agents/skills`, matching DSH's own filesystem provider discovery rules.
- **Install paths**:
  - the install scope is independent of the current view: **Install skill** lets you choose global or any workspace;
  - import a local folder or a single `.md` file (a leading `~` is expanded);
  - copy a skill from another workspace or from global;
  - create a skill from a form;
  - paste a `SKILL.md` or read one from a file.
- **Disable without deleting**: disabling renames `SKILL.md` to `SKILL.md.disabled` (or `<name>.md` to `<name>.md.disabled`), so DSH stops discovering it immediately. Re-enabling restores it; content and resources are untouched.
- **Inline editing**: edit `SKILL.md` directly and validate frontmatter, name, description and invocation policy against DSH's rules before saving.
- **Preview and locate**: read the full document, source, on-disk path and update time, and copy the path in one click.
- **Shadowing hints**: duplicate names are marked “Shadowed” / “Overrides global” using DSH's rank rules, so a skill that does not win is never a mystery.
- **Bilingual UI**: follows the active DSH language live (Chinese / English).
- **Owner-only API**: every mutation goes through DSH's `connection.admit()` and owner check, failing closed.

## Skill directories

| Scope | Directory | DSH source | Rank |
| --- | --- | --- | --- |
| Workspace | `<project>/.dsh/skills` | `project-dsh` | 100 |
| Workspace | `<project>/.agents/skills` | `project-agents` | 200 |
| Global | `~/.dsh/skills` (or `$DSH_HOME/skills`) | `user-dsh` | 400 |
| Global | `~/.agents/skills` (or `$DSH_AGENTS_HOME/skills`) | `user-agents` | 500 |

`<project>` follows DSH: the nearest ancestor of the workspace directory that contains `.git`, otherwise the workspace directory itself.

A skill is either:

- a **directory bundle**: `<root>/<name>/SKILL.md` plus any resources;
- a **flat file**: `<root>/<name>.md`.

## Installation

### Through Plugins

In DSH, open **Plugins**, search for `dsh-skill-management` (once published), or use the absolute path of this repository as the install source. Reload or restart when prompted.

### Through the CLI

```powershell
dsh plugin --profile web add npm:dsh-skill-management
# or a local development checkout
dsh plugin --profile web add C:\path\to\dsh-skill-management
```

The Desktop profile is managed by the official Desktop app; prefer its **Plugins** page there.

## Usage

1. Click **技能管理** in the left sidebar.
2. Pick **Global** or a workspace on the left.
3. Narrow the list with search, enabled-state filters or a directory chip.
4. Use **Preview / Edit / Enable or Disable / Uninstall** on a skill card, or click **Install skill**.
5. Choose the **install scope** (global or any workspace), then the target directory (`.dsh/skills` or `.agents/skills`) and a source. The scope is not limited by the current view; after installation the panel switches to the target scope and shows the new skill.

Uninstall deletes the whole skill directory or flat file from disk and always asks for confirmation. Use **Disable** when you only want to turn a skill off temporarily.

## Safety and boundaries

- Only entries inside the four known roots above are read or changed. A request's `relPath` must be a single entry name directly inside its root; `..`, absolute paths and path separators are rejected.
- Every HTTP mutation completes `connection.admit()` before the body is read and requires `peer.principal.kind === "owner"`. Without the connection service the API answers 503 instead of falling open.
- Copying a skill copies only regular files and directories, skips symlinks, `.git` and `node_modules`, and caps files (400), total size (24 MiB) and folder depth (12).
- DSH built-in or plugin-registered runtime skills (for example the official `office` skill, or skills injected with `ctx.skills.register()`) have no manageable filesystem entry and are not listed. The panel manages the four filesystem roots above only.
- Extra `customSkillDirs` configured for `skill-filesystem` are not shown; the panel covers only the four standard workspace and global roots.
- Enable/disable works through file renames, so DSH's filesystem watcher sees the change. If a session's skill catalog is still cached, switch sessions or refresh the page.
- Duplicate names in one root are shown with shadowing hints, but edit/uninstall always target the exact row you clicked.

## HTTP API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/skill-management/api/state` | Global and per-workspace skills plus directory state |
| GET | `/skill-management/api/skill?rootId=&relPath=` | Read one raw `SKILL.md` |
| POST | `/skill-management/api/install` | Install (`path` / `copy` / `create` / `text`) |
| POST | `/skill-management/api/uninstall` | Uninstall |
| POST | `/skill-management/api/toggle` | Enable / disable |
| POST | `/skill-management/api/save` | Save edited `SKILL.md` |
| POST | `/skill-management/api/validate` | Validate frontmatter only |

## Development

```
lib/index.js         Cordis host plugin entry + HTTP API
lib/skill-store.js   Pure Node skill scan / validation / mutation logic
lib/client.js        Web client bundle (sidebar row + main panel)
locale/*.json        Plugins-page display metadata
test/                Temporary-directory unit tests
```

Checks:

```powershell
node --check lib/index.js
node --check lib/skill-store.js
node --check lib/client.js
node test/skill-store.test.mjs
```

## Compatibility

- DeepSeek Harness `0.2.x` (Desktop / Web).
- Node.js `22.15+` or `24+`.
- Cordis `>=4.0.0-rc <5`.

## License

MIT
