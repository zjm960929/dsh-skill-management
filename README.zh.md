# dsh-skill-management

**DeepSeek Harness 的技能管理插件——一个面板管理每个工作区与全局的文件系统技能。**

[![npm version](https://img.shields.io/npm/v/dsh-skill-management.svg)](https://www.npmjs.com/package/dsh-skill-management)
[![npm downloads](https://img.shields.io/npm/dm/dsh-skill-management.svg)](https://www.npmjs.com/package/dsh-skill-management)
[![license](https://img.shields.io/npm/l/dsh-skill-management.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.15-339933)](https://nodejs.org/)
[![DeepSeek Harness](https://img.shields.io/badge/DeepSeek%20Harness-0.2.x-4F46E5)](https://github.com/deepseek-ai/deepseek-harness)

[English](README.md) | 中文

`dsh-skill-management` 在 DeepSeek Harness 左侧栏「插件」正下方新增 **「技能」** 入口，点击后在主区域打开完整管理面板。它管理的是 DSH 自己发现的文件系统技能目录：当前工作区与全局的 `.dsh/skills` 和 `.agents/skills`。

它适合需要手动安装、编辑或排查技能的人：不用再直接改目录和 frontmatter，而是用一个带校验和确认的管理界面。

> **侧栏标签：** 技能 · **面板标题：** 技能管理 · **作用域：** 全局与各工作区

## 目录

- [功能](#功能)
- [环境要求](#环境要求)
- [安装](#安装)
- [使用](#使用)
- [技能格式](#技能格式)
- [技能目录](#技能目录)
- [工作原理](#工作原理)
- [HTTP API](#http-api)
- [安全与限制](#安全与限制)
- [开发](#开发)
- [发布](#发布)
- [贡献](#贡献)
- [许可证](#许可证)

## 功能

- **原生侧栏入口**——在「插件」正下方新增 **「技能」** 行；管理面板显示在主区域，不是弹窗或独立窗口。
- **全局与工作区作用域**——全局技能一组，DSH 中已注册的每个工作区各一组。
- **每个作用域两个目录**——同时管理 `.dsh/skills` 与 `.agents/skills`，与 DSH 官方 filesystem provider 的发现规则和优先级一致。
- **多种安装来源**——从本地文件夹或 `.md` 文件导入、从其他工作区/全局复制、表单新建，或粘贴/读取 `SKILL.md`。
- **停用但不删除**——停用通过重命名指令文件实现，DSH 会立即停止发现；重新启用即可恢复，内容和资源保持不变。
- **带校验的编辑**——直接编辑 `SKILL.md`；保存前按 DSH 规则校验 frontmatter、技能名称、描述和调用策略。
- **预览与元数据**——查看全文、来源、磁盘路径、大小和更新时间，并一键复制路径。
- **覆盖关系提示**——同名技能会按 DSH 的 rank 规则显示 **被覆盖**、**覆盖全局** 或 **被 N 个工作区覆盖**。
- **搜索与筛选**——按名称、描述或路径搜索；按启用状态或技能目录筛选。
- **中英双语界面**——跟随 DSH 当前界面语言实时切换。
- **仅 owner 可写**——所有 API 请求都经过 DSH 的 `connection.admit()` 和 owner 校验，失败即关闭。

## 环境要求

- **DeepSeek Harness** `0.2.x`（Desktop 或 Web）。当前验证目标为 Desktop `0.2.2-rc.1`。
- **Node.js** 22.x 系列的 `22.15+`，或 `24+`。
- **Cordis** `>=4.0.0-rc <5`（peer dependency，由 DSH 提供）。
- 没有其他运行时依赖。

## 安装

### 通过 DSH 的 Plugins 页面

在 DSH 中打开 **Plugins**，搜索 `dsh-skill-management` 并安装。按提示刷新或重启 DSH。

### 通过 CLI

```bash
dsh plugin --profile web add dsh-skill-management
```

把 `--profile` 换成你实际使用的 profile，例如 `--profile desktop`。Desktop profile 由官方 Desktop 应用管理，优先使用应用内的 **Plugins** 页面。

### 通过本地仓库

```bash
dsh plugin --profile web add C:\path\to\dsh-skill-management
```

如果是打包后的本地构建，安装 tarball：

```bash
pnpm pack
dsh plugin --profile web add ./dsh-skill-management-<version>.tgz
```

tarball 安装是普通包副本，不是符号链接。它会替换同名的 npm 安装，测试完需要恢复 npm 正式版。

## 使用

1. 在左侧栏「插件」正下方点击 **「技能」**。
2. 在左侧选择 **全局** 或某个工作区。
3. 用搜索、**全部 / 已启用 / 已停用** 筛选或技能目录 chip 缩小列表。
4. 在技能卡片上使用 **预览**、**编辑**、**启用/停用** 或 **卸载**。
5. 点击 **安装技能** 添加新技能。

### 安装技能

安装弹窗不受当前浏览作用域限制。先选目标作用域，再选目标目录：

| 来源 | 作用 |
| --- | --- |
| **本地路径** | 复制包含 `SKILL.md` 的技能文件夹，或单个 `.md` 文件；支持 `~` 展开。 |
| **复制技能** | 从其他工作区或全局复制现有技能，源技能保持不变。 |
| **新建** | 用名称、描述、可选 `whenToUse`、正文和调用策略复选框生成新的 `SKILL.md`。 |
| **粘贴 SKILL.md** | 接受原始 `SKILL.md` 内容，或从文件读取，然后按目录包安装。 |

当前浏览位置只是默认目标；你可以在同一个弹窗里安装到全局、当前工作区或任意其他工作区。

### 启用、停用与卸载

- **停用**只重命名指令文件，不删除内容：
  - 目录包：`SKILL.md` → `SKILL.md.disabled`
  - 扁平技能：`<name>.md` → `<name>.md.disabled`
- **启用**执行反向重命名。
- **卸载**会永久删除技能目录或扁平文件，包括其资源文件。界面始终要求确认。

## 技能格式

技能可以是 **目录包**（`<name>/SKILL.md` 加资源文件），也可以是 **扁平文件**（`<name>.md`）。两者都使用 YAML frontmatter：

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

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `name` | 是 | 只能包含小写字母、数字和单个连字符。DSH 按这个值识别技能。 |
| `description` | 是 | 非空描述，显示在技能目录中。 |
| `whenToUse` | 否 | 可选的模型路由提示。 |
| `disable-model-invocation` | 否 | 为 `true` 时禁止模型调用，但仍允许用户通过 `/` 调用。 |
| `user-invocable` | 否 | 为 `false` 时禁止 `/name` 调用。 |

DSH 会拒绝旧字段名 `disableModelInvocation`、`modelInvocable` 和 `userInvocable`；请使用上面的连字符字段。

安装器会按 frontmatter 的 `name` 创建目录包。如果文件夹名与 frontmatter 的 `name` 不同，DSH 仍然按 frontmatter 的 `name` 解析技能。

## 技能目录

| 作用域 | 目录 | DSH source | Rank |
| --- | --- | --- | --- |
| 工作区 | `<project>/.dsh/skills` | `project-dsh` | 100 |
| 工作区 | `<project>/.agents/skills` | `project-agents` | 200 |
| 全局 | `~/.dsh/skills`（或 `$DSH_HOME/skills`） | `user-dsh` | 400 |
| 全局 | `~/.agents/skills`（或 `$DSH_AGENTS_HOME/skills`） | `user-agents` | 500 |

`<project>` 的解析方式与 DSH 一致：从工作区目录向上寻找包含 `.git` 的最近祖先，找不到则使用工作区目录本身。

同一作用域内出现同名技能时，rank 越小越优先。工作区技能会覆盖同名全局技能；面板会在卡片上显示这些关系。

## 工作原理

插件分为 Host 端和浏览器端：

```text
┌─────────────────────────────┐
│ DSH 主面板（React）          │
│ 搜索 / 安装 / 编辑           │
└──────────────┬──────────────┘
               │ owner-only HTTP
┌──────────────▼──────────────┐
│ Host API                    │
│ /skill-management/api/*     │
│ 扫描 / 校验 / 变更           │
└──────────────┬──────────────┘
               │ Node fs
┌──────────────▼──────────────┐
│ .dsh/skills, .agents/skills │
│ 工作区 + 全局根目录          │
└─────────────────────────────┘
```

- Host 端在 `ctx.webServer` 上注册 HTTP 接口，并从 `ctx.workspaceRegistry` 读取工作区列表。
- `lib/skill-store.js` 是纯 Node.js 实现：扫描四个根目录、解析 frontmatter、校验名称和调用策略，并执行安装、重命名、保存和删除。
- 浏览器端注册 `sidebar.panellist` 条目，`order: 1`（DSH 的 **Plugins** 行是 `0`，**Automation tasks** 行是 `10`），以及对应的 `main` 面板 key。
- 没有构建步骤；`lib/client.js` 就是随包发布的浏览器 bundle。

面板按需读取状态，不会另外保存一份技能内容或元数据。

## HTTP API

所有路由都要求 owner 连接；DSH admission gate 不通过时返回 `401`、`403` 或 `503`。

| Method | Path | 作用 |
| --- | --- | --- |
| `GET` | `/skill-management/api/state` | 全局与各工作区的技能、根目录和统计 |
| `GET` | `/skill-management/api/skill?rootId=&relPath=` | 读取单个原始 `SKILL.md` |
| `POST` | `/skill-management/api/install` | 从 `path`、`copy`、`create` 或 `text` 安装 |
| `POST` | `/skill-management/api/uninstall` | 删除技能目录或扁平文件 |
| `POST` | `/skill-management/api/toggle` | 启用或停用 |
| `POST` | `/skill-management/api/save` | 校验后保存编辑过的 `SKILL.md` |
| `POST` | `/skill-management/api/validate` | 只校验 frontmatter，不写入 |

HTTP API 是插件内部接口，可能在次版本之间变化。

## 安全与限制

### 安全

- 只读取和修改上面四个已知根目录内的条目。请求的 `relPath` 必须是根目录下的单个条目名；拒绝 `..`、绝对路径和路径分隔符。
- 所有 API 请求都会在读取请求体之前经过 `connection.admit()`，并要求 `peer.principal.kind === "owner"`。
- 编辑时会拒绝符号链接形式的 `SKILL.md`，避免保存操作跟随链接写到技能根目录之外。
- 复制技能时只复制普通文件和目录，跳过符号链接、`.git` 和 `node_modules`，并限制文件数（400）、总大小（24 MiB）和目录深度（12）。
- 卸载是永久操作，界面始终要求确认。

### 限制

- 面板只管理上面四个文件系统根目录。DSH 内置或由插件运行时注册的技能（例如官方 `office` 技能，或用 `ctx.skills.register()` 注入的技能）不会列出。
- `skill-filesystem` 额外配置的 `customSkillDirs` 不会显示。
- 符号链接形式的指令文件可以被列出和读取，但不能通过面板编辑；复制技能时会完全跳过符号链接。
- 没有批量操作，技能只能逐张卡片管理。
- 启用/停用依赖 DSH 的文件系统 watcher。如果某个会话的技能目录缓存尚未刷新，请切换会话或刷新页面。
- HTTP API 是内部接口，可能在次版本之间变化。
- 插件不管理技能依赖、版本或远程 registry。

## 开发

### 仓库结构

```text
lib/
  index.js          Cordis Host 入口和 HTTP API
  skill-store.js    扫描、校验与变更逻辑
  client.js         浏览器 bundle：侧栏行和主面板
locale/
  en.json           Plugins 页面显示元数据
  zh.json
test/
  api.test.mjs
  client-bundle.test.mjs
  skill-store.test.mjs
cordis.patch.yml    插入 DSH profile 的 bundle 行
```

没有构建步骤。直接修改 `lib/client.js`，刷新浏览器即可。

### 检查与测试

```bash
npm run check
npm test
```

`npm run check` 对三个发布用的 JavaScript 文件执行 `node --check`。测试使用隔离的临时目录，不会接触真实技能。

如果 `node --test` 在受限沙箱里无法 spawn 子进程，可以直接逐个运行测试文件：

```bash
node test/skill-store.test.mjs
node test/api.test.mjs
node test/client-bundle.test.mjs
```

### 本地打包冒烟测试

```bash
pnpm pack
dsh plugin --profile <profile> add ./dsh-skill-management-<version>.tgz
```

tarball 安装是副本，不是符号链接。它会替换同名的 npm 安装；冒烟测试结束后请恢复 npm 正式版。

## 发布

推送 `v*` 标签时，`.github/workflows/publish.yml` 会发布新版本。工作流会先校验标签与 `package.json` 版本一致，再使用仓库 Secret `NPM_TOKEN` 以 npm provenance 发布。

```bash
npm version patch
git push --follow-tags
```

不要在本地手动发布；让工作流负责正式发布。

## 贡献

欢迎提交 Issue 和 Pull Request。请保持一次改动聚焦一个插件，运行上面的检查；当行为或界面文案变化时，同步更新 `README.md` 和 `README.zh.md`。

## 许可证

[MIT](LICENSE)
