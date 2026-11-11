# dsh-skill-management — 技能管理 for DeepSeek Harness

**显示名 / Display name:** 技能管理（Skill Management）  
**npm 包名 / npm package:** `dsh-skill-management`

DeepSeek Harness 的左侧栏技能管理器。它把每个工作区和全局安装的文件系统技能集中到一个面板里，可以浏览、导入、编辑、启用/停用和卸载，并清楚显示技能来源、覆盖关系与无效项。

English | [中文](README.zh.md)

## 功能

- **左侧栏入口**：在 DSH 左侧栏新增「技能管理」按钮，点击在主区域打开管理面板，而不是弹窗。
- **按作用域浏览**：全局一组；每个已注册工作区一组。面板自动读取 DSH 工作区列表，并跟随工作区标题。
- **两种技能目录**：每个作用域同时管理 `.dsh/skills` 与 `.agents/skills`，与 DSH 官方 filesystem provider 的发现规则一致。
- **安装方式**：
  - 安装范围独立于当前浏览位置：点击“安装技能”后可选择全局或任意工作区；
  - 从本地文件夹或单个 `.md` 文件导入（支持 `~` 展开）；
  - 从其他工作区 / 全局复制；
  - 表单新建技能；
  - 直接粘贴或从文件读取 `SKILL.md`。
- **启停而不删除**：停用会把 `SKILL.md` 重命名为 `SKILL.md.disabled`（扁平技能为 `<name>.md.disabled`），DSH 立即不再发现它；再次启用即可恢复。内容与资源文件保持不变。
- **就地编辑**：直接编辑 `SKILL.md`，保存前按 DSH 规则校验 frontmatter、名称、描述和调用策略。
- **预览与定位**：查看全文、来源、磁盘路径和更新时间，一键复制路径。
- **覆盖关系提示**：同名技能按 DSH 的 rank 规则标记“被覆盖”/“覆盖全局”，避免误判为什么某个技能没有生效。
- **中英双语**：跟随 DSH 当前界面语言实时切换。
- **Owner-only API**：所有写操作都经过 DSH 官方 `connection.admit()` 与 owner 校验，失败即关闭。

## 技能目录

| 作用域 | 目录 | DSH source | rank |
| --- | --- | --- | --- |
| 工作区 | `<project>/.dsh/skills` | `project-dsh` | 100 |
| 工作区 | `<project>/.agents/skills` | `project-agents` | 200 |
| 全局 | `~/.dsh/skills`（或 `$DSH_HOME/skills`） | `user-dsh` | 400 |
| 全局 | `~/.agents/skills`（或 `$DSH_AGENTS_HOME/skills`） | `user-agents` | 500 |

`<project>` 的解析方式与 DSH 一致：从工作区目录向上寻找包含 `.git` 的最近祖先，找不到则使用工作区目录本身。

一个技能可以是：

- **目录包**：`<root>/<name>/SKILL.md`（可带任意资源文件）；
- **扁平文件**：`<root>/<name>.md`。

## 安装

### 通过 Plugins 页面

在 DSH 的 **Plugins** 中搜索 `dsh-skill-management`（发布到 npm 后），或使用本仓库的绝对路径作为安装来源。安装完成后按提示刷新或重启。

### 通过 CLI

```powershell
dsh plugin add dsh-skill-management
# 或本地开发目录
dsh plugin add C:\path\to\dsh-skill-management
```

需要装到指定 profile 时再加 `--profile <名称>`，例如 `dsh plugin --profile web add dsh-skill-management`。

Desktop profile 由官方 Desktop 应用管理，请优先使用应用内的 **Plugins** 页面。

## 使用

1. 点击左侧栏的「技能管理」。
2. 在左侧选择「全局」或某个工作区。
3. 使用搜索、启用状态筛选或目录筛选缩小列表。
4. 在技能卡片上执行 **预览 / 编辑 / 启用或停用 / 卸载**，或点击右上角 **安装技能**。
5. 安装时先选择 **安装范围**（全局或任意工作区），再选择目标目录（`.dsh/skills` 或 `.agents/skills`）和来源。安装范围不受当前浏览位置限制；安装完成后会自动切换到目标范围并显示新技能。

卸载会从磁盘删除整个技能目录或扁平文件，并始终要求确认。若只是暂时不用，请使用 **停用**。

## 安全与边界

- 只读取和修改上表中四个已知根目录内的条目；API 的 `relPath` 必须是根目录下的单个条目名，拒绝 `..`、绝对路径和路径分隔符。
- 所有 HTTP 写操作在读取请求体之前完成 `connection.admit()` 校验，且要求 `peer.principal.kind === "owner"`。没有连接服务时返回 503，失败关闭。
- 复制技能时只复制普通文件与目录，跳过符号链接、`.git`、`node_modules`，并限制文件数（400）、总量（24 MiB）和目录深度（12）。
- 不处理 DSH 内置或插件运行时注册的技能（例如官方 `office` 技能、插件通过 `ctx.skills.register()` 注入的技能）；这些技能没有可管理的文件系统条目。面板只管理上面四个文件系统根目录。
- 如果 `skill-filesystem` 配置了额外的 `customSkillDirs`，这些自定义目录不会出现在面板中；面板只覆盖工作区与全局四个标准根目录。
- 启用/停用依赖文件重命名，因此 DSH 的 filesystem watcher 会感知变化；如果当前会话的技能目录缓存尚未刷新，可切换会话或刷新页面。
- 同一根目录内的同名技能会显示覆盖提示，但删除/编辑只针对被点击的那一项。

## HTTP API

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/skill-management/api/state` | 全局 + 全部工作区的技能与目录状态 |
| GET | `/skill-management/api/skill?rootId=&relPath=` | 读取单个技能的原始 `SKILL.md` |
| POST | `/skill-management/api/install` | 安装（`path` / `copy` / `create` / `text`） |
| POST | `/skill-management/api/uninstall` | 卸载 |
| POST | `/skill-management/api/toggle` | 启用 / 停用 |
| POST | `/skill-management/api/save` | 保存编辑后的 `SKILL.md` |
| POST | `/skill-management/api/validate` | 仅校验 frontmatter |

## 开发

```
lib/index.js         Cordis host 插件入口 + HTTP API
lib/skill-store.js   纯 Node 技能扫描 / 校验 / 变更逻辑
lib/client.js        Web 客户端 bundle（侧边栏 + 主面板）
locale/*.json        Plugins 页面显示元数据
test/                基于临时目录的单元测试
```

本地检查：

```powershell
node --check lib/index.js
node --check lib/skill-store.js
node --check lib/client.js
node test/skill-store.test.mjs
```

## 兼容性

- DeepSeek Harness `0.2.x`（Desktop / Web）。
- Node.js `22.15+` 或 `24+`。
- Cordis `>=4.0.0-rc <5`。

## License

MIT
