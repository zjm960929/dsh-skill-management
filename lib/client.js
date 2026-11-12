window.__ModuleLoader__.load({
  id: "dsh-skill-management",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const { useState, useEffect, useMemo, useCallback, useRef, useSyncExternalStore } = React;
    const h = React.createElement;
    let ReactDOM = null;
    try { ReactDOM = require("react-dom"); } catch { /* portal falls back to inline rendering */ }

    const NS = "skillManagement";
    const API = "/skill-management/api";
    const PANEL_ID = "skill-management";
    const MAX_IMPORT_BYTES = 32 * 1024 * 1024;

    /* ------------------------------------------------------------------ */
    /* Dictionaries                                                        */
    /* ------------------------------------------------------------------ */

    const zh = {
      panel: "技能",
      title: "技能管理",
      subtitle: "管理每个工作区与全局安装的技能",
      refresh: "刷新",
      refreshTitle: "重新扫描技能目录",
      install: "安装技能",
      installTitle: "安装技能",
      close: "关闭",
      cancel: "取消",
      save: "保存",
      saving: "保存中…",
      loading: "正在读取技能…",
      loadFailed: "加载失败",
      retry: "重试",
      search: "搜索技能",
      searchPlaceholder: "搜索名称或描述…",
      filterAll: "全部",
      filterEnabled: "已启用",
      filterDisabled: "已停用",
      scopeGlobal: "全局",
      scopeWorkspaces: "工作区",
      scopeGlobalHint: "对当前设备上的所有工作区生效",
      scopeWorkspaceHint: "仅对「{name}」生效",
      noWorkspace: "还没有注册工作区",
      countSkills: "{n} 个技能",
      countRoots: "{n} 个目录",
      rootAll: "全部目录",
      rootMissing: "目录未创建",
      rootUnreadable: "目录不可读",
      workspaceMissing: "工作区目录不存在",
      emptyTitle: "还没有安装技能",
      emptyHint: "从本地文件夹导入、复制其他作用域的技能，或新建一个技能。",
      emptyBuiltinNote: "这里只列出文件系统技能；由插件内置或运行时注册的技能（如 office）不在此列。",
      emptyFilterTitle: "没有匹配的技能",
      emptyFilterHint: "试试清空搜索或切换筛选条件。",
      badgeEnabled: "已启用",
      badgeDisabled: "已停用",
      badgeInvalid: "无效",
      badgeShadowed: "被覆盖",
      badgeOverrides: "覆盖全局",
      badgeOverriddenIn: "被 {n} 个工作区覆盖",
      invModelOff: "禁止模型调用",
      invUserOff: "禁止用户调用",
      actionPreview: "预览",
      actionEdit: "编辑",
      actionEnable: "启用",
      actionDisable: "停用",
      actionUninstall: "卸载",
      metaUpdated: "更新于 {time}",
      statsLine: "{enabled} 启用 · {disabled} 停用 · {invalid} 无效",
      installTarget: "安装到",
      installTargetHint: "该作用域有两个技能目录，默认写入 .dsh/skills。",
      installScope: "安装范围",
      installScopeHint: "可选择全局或任意工作区，与当前浏览的位置无关。",
      browse: "浏览…",
      browseUnavailable: "当前环境没有可用的文件夹选择器，请手动输入路径。",
      export: "导出",
      import: "导入",
      exportTitle: "导出技能",
      exportSkillMode: "当前技能",
      exportWorkspaceMode: "整个工作区",
      exportAllMode: "本机全部技能",
      exportWorkspaceLabel: "选择工作区",
      exportDestination: "导出目录",
      exportDestinationHint: "技能会打包为 .tgz 文件写入该绝对路径目录；支持 ~ 开头，也可点击“浏览”选择文件夹。",
      exportDestinationPlaceholder: "C:\\Users\\me\\Downloads",
      exportAction: "导出",
      exporting: "导出中…",
      exportSuccess: "已导出 {n} 个技能到 {path}",
      exportSkillHint: "将该技能及其资源打包为一个 .tgz 文件。",
      exportWorkspaceHint: "将选中工作区的所有有效技能打包为一个 .tgz 文件。",
      exportAllHint: "将全局与所有工作区的有效技能打包为一个 .tgz 文件。",
      exportNoSkills: "该范围没有可导出的有效技能。",
      actionExport: "导出",
      importTitle: "导入技能",
      importTabArchive: "技能包（.tgz）",
      importTabPath: "本地文件夹 / .md",
      importArchiveLabel: "选择技能包",
      importArchiveHint: "支持本插件导出的 .tgz / .tar.gz。外部 .zip 请先解压，或使用“本地文件夹”。",
      importChooseFile: "选择文件",
      importReading: "正在读取技能包…",
      importNoSkills: "技能包中没有可导入的有效技能。",
      importFound: "找到 {n} 个技能",
      importSelectAll: "全选",
      importClearAll: "清空",
      importSelected: "已选 {n} 个",
      importAction: "导入",
      importing: "导入中…",
      importSuccess: "已导入 {n} 个技能",
      importPathLabel: "技能文件夹或 SKILL.md 的绝对路径",
      importPathHint: "适合已经解压的外部技能；支持 ~ 开头，也可点击“浏览”选择文件夹。",
      importArchiveTooLarge: "技能包超过 32 MiB，无法导入。",
      errArchiveInvalid: "无法读取技能包，请确认是本插件导出的 .tgz。",
      errArchiveUnsupported: "只支持 .tgz / .tar.gz 技能包。",
      errArchiveTooLarge: "技能包超过 32 MiB 限制。",
      errNoSkills: "没有可导入的有效技能。",
      errInvalidDestination: "导出目录不合法。",
      errTooManySkills: "技能包中的技能数量超过限制。",
      tabPath: "本地路径",
      tabCopy: "复制技能",
      tabCreate: "新建技能",
      tabText: "粘贴 SKILL.md",
      pathLabel: "技能文件夹或 SKILL.md 的绝对路径",
      pathPlaceholder: "C:\\Users\\me\\skills\\my-skill",
      pathHint: "文件夹必须包含 SKILL.md；也支持单个 .md 文件，并支持 ~ 开头。可点击“浏览”选择文件夹。",
      copyLabel: "选择来源技能",
      copyHint: "将内容复制到当前作用域，原技能保持不变。",
      copyEmpty: "没有可复制的技能",
      createName: "名称",
      createNamePlaceholder: "my-skill",
      createDesc: "描述",
      createDescPlaceholder: "一句话说明这个技能解决什么问题",
      createWhen: "何时使用（可选）",
      createWhenPlaceholder: "例如：处理 Word 文档时",
      createBody: "指令内容（可选）",
      createBodyPlaceholder: "写给模型的步骤和约束…",
      createModelOff: "禁止模型自动调用（仅允许用户 / 调用）",
      createUserOn: "允许用户通过 / 命令调用",
      textLabel: "SKILL.md 内容",
      textPlaceholder: "---\nname: my-skill\ndescription: ...\n---\n\n...",
      textLoadFile: "从文件读取",
      installAction: "安装",
      installing: "安装中…",
      installSuccess: "已安装「{name}」",
      previewTitle: "技能详情",
      contentEmpty: "（没有正文内容）",
      copyPath: "复制路径",
      pathCopied: "已复制路径",
      editTitle: "编辑技能",
      editHint: "直接编辑 SKILL.md。保存前会校验 frontmatter 与技能名称。",
      saveSuccess: "已保存「{name}」",
      saveInvalid: "保存失败，请检查 frontmatter",
      confirmUninstallTitle: "卸载技能",
      confirmUninstallBody: "将从磁盘删除「{name}」及其所有资源文件。",
      confirmUninstallHint: "此操作不可撤销。若只是暂时不用，可以改为「停用」。",
      confirmUninstallAction: "卸载",
      uninstallSuccess: "已卸载「{name}」",
      enabledSuccess: "已启用「{name}」",
      disabledSuccess: "已停用「{name}」",
      errorTitle: "操作失败",
      detailsTitle: "详细信息",
      errMissingFrontmatter: "SKILL.md 必须以 --- 包裹的 YAML frontmatter 开头。",
      errLegacyFrontmatter: "使用了不受支持的旧字段，请改用 disable-model-invocation / user-invocable。",
      errMissingName: "frontmatter 缺少 name。",
      errInvalidName: "技能名称只能包含小写字母、数字和单个连字符。",
      errMissingDescription: "frontmatter 缺少 description。",
      errInvalidInvocation: "调用策略字段必须是布尔值。",
      errNameConflict: "该目录中已存在同名技能。",
      errTargetExists: "目标文件或文件夹已存在。",
      errNotFound: "技能已不存在，请刷新。",
      errInvalidPath: "路径不合法。",
      errUnknownRoot: "技能目录不可用，请刷新。",
      errInvalidSkill: "SKILL.md 校验失败。",
      errTooLarge: "文件过大。",
      errWorkspaceUnavailable: "工作区服务不可用。",
      errMissingSkillFile: "所选文件夹中没有 SKILL.md。",
      errWorkspaceMissing: "工作区目录不存在，已取消安装。",
      errSymlinkNotSupported: "该技能的 SKILL.md 是符号链接，出于安全考虑不能直接编辑。",
      errGeneric: "操作失败，请重试。",
      sourceProjectDsh: "工作区 · .dsh/skills",
      sourceProjectAgents: "工作区 · .agents/skills",
      sourceUserDsh: "全局 · .dsh/skills",
      sourceUserAgents: "全局 · .agents/skills",
      sourceArchive: "技能包"
    };

    const en = {
      panel: "Skill",
      title: "Skill Management",
      subtitle: "Manage skills installed in each workspace and globally",
      refresh: "Refresh",
      refreshTitle: "Rescan skill directories",
      install: "Install skill",
      installTitle: "Install skill",
      close: "Close",
      cancel: "Cancel",
      save: "Save",
      saving: "Saving…",
      loading: "Reading skills…",
      loadFailed: "Failed to load",
      retry: "Retry",
      search: "Search skills",
      searchPlaceholder: "Search name or description…",
      filterAll: "All",
      filterEnabled: "Enabled",
      filterDisabled: "Disabled",
      scopeGlobal: "Global",
      scopeWorkspaces: "Workspaces",
      scopeGlobalHint: "Applies to every workspace on this device",
      scopeWorkspaceHint: "Applies only to “{name}”",
      noWorkspace: "No workspace registered yet",
      countSkills: "{n} skills",
      countRoots: "{n} directories",
      rootAll: "All directories",
      rootMissing: "Directory not created",
      rootUnreadable: "Directory unreadable",
      workspaceMissing: "Workspace directory is missing",
      emptyTitle: "No skill installed yet",
      emptyHint: "Import a local folder, copy a skill from another scope, or create a new one.",
      emptyBuiltinNote: "Only filesystem skills are listed here; plugin-bundled or runtime-registered skills (such as office) are not shown.",
      emptyFilterTitle: "No matching skill",
      emptyFilterHint: "Clear the search or switch the filter.",
      badgeEnabled: "Enabled",
      badgeDisabled: "Disabled",
      badgeInvalid: "Invalid",
      badgeShadowed: "Shadowed",
      badgeOverrides: "Overrides global",
      badgeOverriddenIn: "Overridden in {n} workspaces",
      invModelOff: "Model invocation off",
      invUserOff: "User invocation off",
      actionPreview: "Preview",
      actionEdit: "Edit",
      actionEnable: "Enable",
      actionDisable: "Disable",
      actionUninstall: "Uninstall",
      metaUpdated: "Updated {time}",
      statsLine: "{enabled} enabled · {disabled} disabled · {invalid} invalid",
      installTarget: "Install into",
      installTargetHint: "This scope has two skill directories; .dsh/skills is the default.",
      installScope: "Install scope",
      installScopeHint: "Choose global or any workspace; independent of the current view.",
      browse: "Browse…",
      browseUnavailable: "No directory picker is available in this environment; enter the path manually.",
      export: "Export",
      import: "Import",
      exportTitle: "Export skills",
      exportSkillMode: "This skill",
      exportWorkspaceMode: "One workspace",
      exportAllMode: "All skills on this machine",
      exportWorkspaceLabel: "Workspace",
      exportDestination: "Destination folder",
      exportDestinationHint: "The skills are written to this absolute folder as a .tgz archive. A leading ~ is expanded; click Browse to pick a folder.",
      exportDestinationPlaceholder: "C:\\Users\\me\\Downloads",
      exportAction: "Export",
      exporting: "Exporting…",
      exportSuccess: "Exported {n} skills to {path}",
      exportSkillHint: "Packs this skill and its resources into one .tgz archive.",
      exportWorkspaceHint: "Packs every valid skill in the selected workspace into one .tgz archive.",
      exportAllHint: "Packs every valid skill in global and all workspaces into one .tgz archive.",
      exportNoSkills: "There are no valid skills to export.",
      actionExport: "Export",
      importTitle: "Import skills",
      importTabArchive: "Skill archive (.tgz)",
      importTabPath: "Local folder / .md",
      importArchiveLabel: "Skill archive",
      importArchiveHint: "Supports .tgz / .tar.gz created by this plugin. For a downloaded .zip, extract it and use the local folder tab.",
      importChooseFile: "Choose file",
      importReading: "Reading archive…",
      importNoSkills: "The archive has no valid skill.",
      importFound: "Found {n} skills",
      importSelectAll: "Select all",
      importClearAll: "Clear",
      importSelected: "Selected {n}",
      importAction: "Import",
      importing: "Importing…",
      importSuccess: "Imported {n} skills",
      importPathLabel: "Absolute path to a skill folder or SKILL.md",
      importPathHint: "Use this for an already-extracted external skill; a leading ~ is expanded. Click Browse to pick a folder.",
      importArchiveTooLarge: "The archive is larger than 32 MiB.",
      errArchiveInvalid: "The archive could not be read. Use a .tgz exported by this plugin.",
      errArchiveUnsupported: "Only .tgz / .tar.gz archives are supported.",
      errArchiveTooLarge: "The archive exceeds the 32 MiB limit.",
      errNoSkills: "No importable skills were found.",
      errInvalidDestination: "The destination folder is invalid.",
      errTooManySkills: "The archive contains too many skills.",
      tabPath: "Local path",
      tabCopy: "Copy skill",
      tabCreate: "Create",
      tabText: "Paste SKILL.md",
      pathLabel: "Absolute path to a skill folder or SKILL.md",
      pathPlaceholder: "C:\\Users\\me\\skills\\my-skill",
      pathHint: "The folder must contain SKILL.md; a single .md file and a leading ~ also work. Click Browse to pick a folder.",
      copyLabel: "Source skill",
      copyHint: "Copies the content into the current scope; the source stays unchanged.",
      copyEmpty: "No skill available to copy",
      createName: "Name",
      createNamePlaceholder: "my-skill",
      createDesc: "Description",
      createDescPlaceholder: "One sentence describing what this skill solves",
      createWhen: "When to use (optional)",
      createWhenPlaceholder: "e.g. when working with Word documents",
      createBody: "Instructions (optional)",
      createBodyPlaceholder: "Steps and constraints for the model…",
      createModelOff: "Disallow model invocation (user / only)",
      createUserOn: "Allow users to invoke it with /",
      textLabel: "SKILL.md content",
      textPlaceholder: "---\nname: my-skill\ndescription: ...\n---\n\n...",
      textLoadFile: "Read from file",
      installAction: "Install",
      installing: "Installing…",
      installSuccess: "Installed “{name}”",
      previewTitle: "Skill details",
      contentEmpty: "(no instruction body)",
      copyPath: "Copy path",
      pathCopied: "Path copied",
      editTitle: "Edit skill",
      editHint: "Edit SKILL.md directly. Frontmatter and the skill name are validated on save.",
      saveSuccess: "Saved “{name}”",
      saveInvalid: "Save failed; check the frontmatter",
      confirmUninstallTitle: "Uninstall skill",
      confirmUninstallBody: "This removes “{name}” and all its resource files from disk.",
      confirmUninstallHint: "This cannot be undone. Use Disable instead if you only want to turn it off.",
      confirmUninstallAction: "Uninstall",
      uninstallSuccess: "Uninstalled “{name}”",
      enabledSuccess: "Enabled “{name}”",
      disabledSuccess: "Disabled “{name}”",
      errorTitle: "Operation failed",
      detailsTitle: "Details",
      errMissingFrontmatter: "SKILL.md must begin with a YAML frontmatter block delimited by ---.",
      errLegacyFrontmatter: "An unsupported legacy field is present; use disable-model-invocation / user-invocable.",
      errMissingName: "The frontmatter has no name.",
      errInvalidName: "A skill name may contain only lowercase letters, digits and single hyphens.",
      errMissingDescription: "The frontmatter has no description.",
      errInvalidInvocation: "Invocation fields must be booleans.",
      errNameConflict: "A skill with this name already exists in the directory.",
      errTargetExists: "The target file or folder already exists.",
      errNotFound: "The skill no longer exists; refresh the list.",
      errInvalidPath: "The path is invalid.",
      errUnknownRoot: "The skill directory is unavailable; refresh the list.",
      errInvalidSkill: "SKILL.md failed validation.",
      errTooLarge: "The file is too large.",
      errWorkspaceUnavailable: "The workspace service is unavailable.",
      errMissingSkillFile: "The selected folder has no SKILL.md.",
      errWorkspaceMissing: "The workspace directory is missing; install was cancelled.",
      errSymlinkNotSupported: "This SKILL.md is a symbolic link, so it cannot be edited safely.",
      errGeneric: "The operation failed; please retry.",
      sourceProjectDsh: "Workspace · .dsh/skills",
      sourceProjectAgents: "Workspace · .agents/skills",
      sourceUserDsh: "Global · .dsh/skills",
      sourceUserAgents: "Global · .agents/skills",
      sourceArchive: "Archive"
    };

    const ERROR_KEY = {
      "missing-frontmatter": "errMissingFrontmatter",
      "legacy-frontmatter": "errLegacyFrontmatter",
      "missing-name": "errMissingName",
      "invalid-name": "errInvalidName",
      "missing-description": "errMissingDescription",
      "invalid-invocation": "errInvalidInvocation",
      "name-conflict": "errNameConflict",
      "target-exists": "errTargetExists",
      "not-found": "errNotFound",
      "invalid-path": "errInvalidPath",
      "unknown-root": "errUnknownRoot",
      "invalid-skill": "errInvalidSkill",
      "too-large": "errTooLarge",
      "workspace-unavailable": "errWorkspaceUnavailable",
      "workspace-missing": "errWorkspaceMissing",
      "symlink-not-supported": "errSymlinkNotSupported",
      "invalid-archive": "errArchiveInvalid",
      "unsupported-archive": "errArchiveUnsupported",
      "archive-empty": "errArchiveInvalid",
      "archive-too-large": "errArchiveTooLarge",
      "too-many-skills": "errTooManySkills",
      "no-skills": "errNoSkills",
      "invalid-destination": "errInvalidDestination",
      "archive-path-too-long": "errArchiveInvalid",
      "archive-value-too-large": "errArchiveInvalid",
      "missing-skill-file": "errMissingSkillFile"
    };

    function makeT(language) {
      const dict = language === "zh" ? zh : en;
      return (key, vars) => {
        let value = Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : (en[key] ?? key);
        if (vars !== undefined && vars !== null) {
          value = value.replace(/\{(\w+)\}/g, (match, name) => (
            Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match
          ));
        }
        return value;
      };
    }

    function errorText(t, error) {
      const key = ERROR_KEY[error?.code];
      if (key !== undefined) return t(key);
      return error?.message || t("errGeneric");
    }

    function detailTexts(t, error) {
      if (!Array.isArray(error?.details)) return [];
      return error.details.map((detail) => {
        const key = ERROR_KEY[detail?.code];
        return key !== undefined ? t(key) : String(detail?.message ?? detail);
      });
    }

    function sourceLabel(t, source) {
      switch (source) {
        case "project-dsh": return t("sourceProjectDsh");
        case "project-agents": return t("sourceProjectAgents");
        case "user-dsh": return t("sourceUserDsh");
        case "user-agents": return t("sourceUserAgents");
        case "archive": return t("sourceArchive");
        default: return String(source ?? "");
      }
    }

    /**
     * Pick the install dialog's initial target scope. The currently viewed
     * scope is the convenience default, but a missing workspace falls back
     * to global so the dialog never opens on an impossible target.
     */
    function initialInstallScope(scope, state) {
      if (scope?.kind === "global") return scope;
      if (scope?.kind === "workspace" && scope.exists !== false) return scope;
      return state.global;
    }

    /** Read a browser File into base64 without exceeding the call stack. */
    async function fileToBase64(file) {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
      }
      return btoa(binary);
    }

    /* ------------------------------------------------------------------ */
    /* API helpers                                                         */
    /* ------------------------------------------------------------------ */

    async function request(path, options = {}) {
      let url = API + path;
      if (options.query !== undefined) {
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(options.query)) {
          if (value !== undefined && value !== null) params.set(key, String(value));
        }
        const text = params.toString();
        if (text !== "") url += `?${text}`;
      }
      const init = { method: options.method ?? "GET", credentials: "same-origin", headers: {} };
      if (options.body !== undefined) {
        init.headers["content-type"] = "application/json";
        init.body = JSON.stringify(options.body);
      }
      const response = await fetch(url, init);
      let payload = null;
      try { payload = await response.json(); } catch { /* non-JSON error */ }
      if (!response.ok || payload === null || payload.ok !== true) {
        const error = new Error(payload?.error || `HTTP ${response.status}`);
        error.code = payload?.code || `http-${response.status}`;
        if (payload?.details !== undefined) error.details = payload.details;
        throw error;
      }
      return payload.result;
    }

    function formatTime(t, timestamp, language) {
      if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return "—";
      try {
        return new Date(timestamp).toLocaleString(language === "zh" ? "zh-CN" : "en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      } catch {
        return new Date(timestamp).toISOString();
      }
    }

    function formatBytes(value) {
      if (typeof value !== "number" || !Number.isFinite(value)) return "—";
      if (value < 1024) return `${value} B`;
      if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
      return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    }

    /* ------------------------------------------------------------------ */
    /* Styles                                                              */
    /* ------------------------------------------------------------------ */

    const STYLE_ID = "dsh-skill-management-styles";
    const CSS = `
.skm-root{position:relative;display:flex;flex-direction:column;height:100%;min-height:0;overflow:hidden;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111);font-size:13px;line-height:20px;box-sizing:border-box}
.skm-root *,.skm-overlay *{box-sizing:border-box}
.skm-top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 22px;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);flex:none;flex-wrap:wrap}
.skm-brand{display:flex;align-items:center;gap:12px;min-width:0}
.skm-brandIcon{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-state-business-tertiary,#eef2ff);color:var(--dsw-alias-state-business-primary,#4f46e5);flex:none}
.skm-title{font-size:17px;line-height:24px;font-weight:600;margin:0}
.skm-subtitle{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#6b7280);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skm-actions{display:flex;gap:8px;align-items:center;flex:none;flex-wrap:wrap;justify-content:flex-end}
.skm-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:30px;padding:4px 12px;border:1px solid var(--dsw-alias-border-l2,#d9dee5);border-radius:8px;background:transparent;color:var(--dsw-alias-label-primary,#111);font:inherit;font-size:12px;line-height:18px;cursor:pointer;white-space:nowrap;transition:background .12s,border-color .12s,color .12s}
.skm-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}
.skm-btn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4f46e5);outline-offset:1px}
.skm-btn:disabled{opacity:.45;cursor:not-allowed}
.skm-btnPrimary{background:var(--dsw-alias-state-business-primary,#4f46e5);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}
.skm-btnPrimary:hover:not(:disabled){background:var(--dsw-alias-state-business-primary,#4f46e5);filter:brightness(1.08)}
.skm-btnDanger{color:var(--dsw-alias-state-error-primary,#dc2626);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#dc2626) 42%,transparent)}
.skm-btnDanger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#dc2626) 9%,transparent)}
.skm-btnGhost{border-color:transparent}
.skm-iconBtn{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary,#555);cursor:pointer;flex:none}
.skm-iconBtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#111)}
.skm-iconBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4f46e5);outline-offset:1px}
.skm-body{display:flex;flex:1 1 auto;min-height:0}
.skm-side{width:250px;flex:none;border-right:1px solid var(--dsw-alias-border-l2,#e5e7eb);padding:10px;overflow:auto;display:flex;flex-direction:column;gap:2px;background:var(--dsw-alias-bg-layer-1,#fff)}
.skm-sideItem{display:flex;align-items:center;gap:9px;width:100%;padding:8px 10px;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--dsw-alias-label-secondary,#4b5563);font:inherit;font-size:12.5px;line-height:18px;text-align:left;cursor:pointer;transition:background .12s,color .12s}
.skm-sideItem:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#111)}
.skm-sideItem:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4f46e5);outline-offset:1px}
.skm-sideItemActive{background:var(--dsw-alias-state-business-tertiary,#eef2ff);color:var(--dsw-alias-state-business-primary,#4338ca);font-weight:600}
.skm-sideItemActive:hover{background:var(--dsw-alias-state-business-tertiary,#eef2ff);color:var(--dsw-alias-state-business-primary,#4338ca)}
.skm-sideItemBody{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:1px}
.skm-sideItemTitle{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skm-sideItemMeta{font-size:10.5px;line-height:15px;color:var(--dsw-alias-label-tertiary,#8b95a5);font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.skm-sideCount{font-size:10.5px;line-height:16px;padding:0 7px;border-radius:999px;background:var(--dsw-alias-markdown-tag,#f1f3f5);color:var(--dsw-alias-label-tertiary,#6b7280);flex:none;font-variant-numeric:tabular-nums}
.skm-sideSection{font-size:10px;line-height:16px;letter-spacing:.06em;text-transform:uppercase;color:var(--dsw-alias-label-tertiary,#8b95a5);padding:14px 10px 5px;font-weight:600}
.skm-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;min-height:0;padding:16px 20px 0;gap:11px}
.skm-mainHead{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;flex-wrap:wrap}
.skm-mainHeadText{min-width:0;display:flex;flex-direction:column;gap:2px}
.skm-h2{font-size:15.5px;line-height:22px;font-weight:600;margin:0;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.skm-scopePath{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8b95a5);word-break:break-all;max-width:760px}
.skm-stats{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8b95a5);font-variant-numeric:tabular-nums}
.skm-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.skm-search{position:relative;flex:1 1 220px;min-width:170px}
.skm-search input{width:100%;height:32px;padding:5px 10px 5px 31px;border:1px solid var(--dsw-alias-border-l2,#d9dee5);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#111);font:inherit;font-size:12px;line-height:20px;outline:none;transition:border-color .12s,box-shadow .12s}
.skm-search input::placeholder{color:var(--dsw-alias-label-tertiary,#9aa3b2)}
.skm-search input:focus{border-color:var(--dsw-alias-state-business-primary,#4f46e5);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4f46e5) 16%,transparent)}
.skm-searchIcon{position:absolute;left:9px;top:8px;color:var(--dsw-alias-label-tertiary,#9aa3b2);pointer-events:none;display:flex}
.skm-seg{display:inline-flex;background:var(--dsw-alias-bg-layer-2,#f3f4f6);border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:9px;padding:2px;gap:2px;flex:none}
.skm-segBtn{border:0;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font:inherit;font-size:11.5px;line-height:18px;padding:3px 10px;border-radius:7px;cursor:pointer;white-space:nowrap}
.skm-segBtn:hover{color:var(--dsw-alias-label-primary,#111)}
.skm-segBtn:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4f46e5);outline-offset:0}
.skm-segBtnActive{background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.skm-chips{display:flex;gap:6px;flex-wrap:wrap}
.skm-chip{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:999px;background:transparent;color:var(--dsw-alias-label-tertiary,#6b7280);font:inherit;font-size:10.5px;line-height:18px;cursor:pointer;white-space:nowrap}
.skm-chip:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-secondary,#374151)}
.skm-chipActive{border-color:transparent;background:var(--dsw-alias-state-business-tertiary,#eef2ff);color:var(--dsw-alias-state-business-primary,#4338ca);font-weight:600}
.skm-chipCount{font-variant-numeric:tabular-nums;opacity:.75}
.skm-scroll{flex:1 1 auto;min-height:0;overflow:auto;padding:2px 2px 22px;display:flex;flex-direction:column;gap:8px;scrollbar-gutter:stable}
.skm-card{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:12px;background:var(--dsw-alias-bg-layer-2,#fff);transition:border-color .12s,box-shadow .12s,background .12s}
.skm-card:hover{border-color:var(--dsw-alias-border-l1,#c7ced8);box-shadow:0 2px 10px rgba(0,0,0,.045)}
.skm-cardDisabled{background:var(--dsw-alias-bg-layer-2,#fafafa);opacity:.78}
.skm-cardInvalid{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#dc2626) 34%,var(--dsw-alias-border-l2,#e5e7eb))}
.skm-cardIcon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-state-business-tertiary,#eef2ff);color:var(--dsw-alias-state-business-primary,#4f46e5);flex:none;margin-top:1px}
.skm-cardDisabled .skm-cardIcon{background:var(--dsw-alias-markdown-tag,#f1f3f5);color:var(--dsw-alias-label-tertiary,#8b95a5)}
.skm-cardInvalid .skm-cardIcon{background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#dc2626) 10%,transparent);color:var(--dsw-alias-state-error-primary,#dc2626)}
.skm-cardBody{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px}
.skm-cardTop{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0}
.skm-cardName{font-size:13.5px;line-height:20px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.skm-badge{display:inline-flex;align-items:center;font-size:10px;line-height:17px;padding:0 6px;border-radius:999px;white-space:nowrap;font-weight:500;flex:none}
.skm-badgeOn{color:#047857;background:rgba(16,185,129,.13)}
.skm-badgeOff{color:var(--dsw-alias-label-tertiary,#6b7280);background:var(--dsw-alias-markdown-tag,#f1f3f5)}
.skm-badgeWarn{color:#b45309;background:rgba(245,158,11,.14)}
.skm-badgeError{color:var(--dsw-alias-state-error-primary,#dc2626);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#dc2626) 10%,transparent)}
.skm-badgeAccent{color:var(--dsw-alias-state-business-primary,#4338ca);background:var(--dsw-alias-state-business-tertiary,#eef2ff)}
.skm-desc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#4b5563);margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;white-space:pre-wrap;word-break:break-word}
.skm-descInvalid{color:var(--dsw-alias-state-error-primary,#dc2626)}
.skm-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8b95a5);min-width:0}
.skm-metaPath{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:420px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace}
.skm-cardActions{display:flex;gap:3px;flex-wrap:wrap;justify-content:flex-end;flex:none;max-width:300px;margin-top:2px}
.skm-action{display:inline-flex;align-items:center;gap:4px;padding:3px 7px;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font:inherit;font-size:11px;line-height:17px;cursor:pointer;white-space:nowrap}
.skm-action:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));color:var(--dsw-alias-label-primary,#111)}
.skm-action:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#4f46e5);outline-offset:1px}
.skm-action:disabled{opacity:.45;cursor:not-allowed}
.skm-actionDanger{color:var(--dsw-alias-state-error-primary,#dc2626)}
.skm-actionDanger:hover:not(:disabled){background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#dc2626) 9%,transparent);color:var(--dsw-alias-state-error-primary,#dc2626)}
.skm-exportSkill{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:10px;background:var(--dsw-alias-bg-layer-2,#f8fafc)}
.skm-exportSkillName{font-size:13.5px;line-height:20px;font-weight:600}
.skm-exportSkillDesc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#4b5563);word-break:break-word}
.skm-fileRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.skm-fileRow .skm-input{min-width:0}
.skm-fileRow .skm-btn{flex:none}
.skm-fileName{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.skm-importList{display:flex;flex-direction:column;gap:3px;border:1px solid var(--dsw-alias-border-l2,#e5e7eb);border-radius:10px;padding:6px;max-height:300px;overflow:auto;background:var(--dsw-alias-bg-layer-2,#fafafa)}
.skm-importHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:2px 4px 4px;flex-wrap:wrap}
.skm-importHeadActions{display:inline-flex;align-items:center;gap:2px;flex:none}
.skm-importItem{display:flex;align-items:flex-start;gap:8px;padding:7px 8px;border-radius:7px;cursor:pointer;min-width:0}
.skm-importItem:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05))}
.skm-importItem input{margin:2px 0 0;accent-color:var(--dsw-alias-state-business-primary,#4f46e5);flex:none}
.skm-importItemInvalid{opacity:.65;cursor:not-allowed}
.skm-importItemBody{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto}
.skm-importName{display:flex;align-items:center;gap:5px;flex-wrap:wrap;font-size:12.5px;line-height:18px;font-weight:600;color:var(--dsw-alias-label-primary,#111);word-break:break-word}
.skm-importDesc{font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary,#4b5563);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.skm-importMeta{font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8b95a5);word-break:break-word}
.skm-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center;padding:54px 20px;border:1px dashed var(--dsw-alias-border-l2,#d9dee5);border-radius:14px;color:var(--dsw-alias-label-tertiary,#8b95a5);background:var(--dsw-alias-bg-layer-2,#fafafa);margin:2px 0 18px}
.skm-emptyIcon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-state-business-tertiary,#eef2ff);color:var(--dsw-alias-state-business-primary,#4f46e5);margin-bottom:2px}
.skm-emptyTitle{font-size:14px;line-height:20px;font-weight:600;color:var(--dsw-alias-label-secondary,#374151)}
.skm-emptyHint{font-size:12px;line-height:18px;max-width:420px}
.skm-empty .skm-btn{margin-top:6px}
.skm-loading{display:flex;align-items:center;justify-content:center;gap:10px;flex:1 1 auto;color:var(--dsw-alias-label-tertiary,#6b7280);font-size:12px}
.skm-spinner{width:16px;height:16px;border:2px solid color-mix(in srgb,var(--dsw-alias-state-business-primary,#4f46e5) 20%,transparent);border-top-color:var(--dsw-alias-state-business-primary,#4f46e5);border-radius:50%;animation:skmSpin .75s linear infinite;flex:none}
.skm-overlay{position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,.46);display:flex;align-items:center;justify-content:center;padding:24px;backdrop-filter:blur(2px)}
.skm-modal{max-width:calc(100vw - 32px);max-height:calc(100vh - 48px);display:flex;flex-direction:column;background:var(--dsw-alias-bg-layer-1,#fff);border:1px solid var(--dsw-alias-border-l2,#d9dee5);border-radius:14px;box-shadow:0 24px 64px rgba(0,0,0,.28);overflow:hidden;animation:skmPop .15s ease-out}
.skm-modalHead{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 18px;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);flex:none}
.skm-modalTitle{font-size:14px;line-height:20px;font-weight:600;margin:0}
.skm-modalBody{padding:16px 18px;overflow:auto;min-height:0;display:flex;flex-direction:column;gap:13px}
.skm-modalFoot{display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:11px 18px;border-top:1px solid var(--dsw-alias-border-l2,#e5e7eb);flex:none;flex-wrap:wrap}
.skm-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.skm-label{font-size:12px;line-height:17px;font-weight:500;color:var(--dsw-alias-label-secondary,#374151)}
.skm-input,.skm-textarea,.skm-select{width:100%;padding:6px 9px;border:1px solid var(--dsw-alias-border-l2,#d9dee5);border-radius:8px;background:var(--dsw-alias-bg-layer-2,#fff);color:var(--dsw-alias-label-primary,#111);font:inherit;font-size:12px;line-height:20px;outline:none;transition:border-color .12s,box-shadow .12s}
.skm-input,.skm-select{height:32px}
.skm-textarea{min-height:112px;resize:vertical;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11.5px;line-height:18px}
.skm-input:focus,.skm-textarea:focus,.skm-select:focus{border-color:var(--dsw-alias-state-business-primary,#4f46e5);box-shadow:0 0 0 2px color-mix(in srgb,var(--dsw-alias-state-business-primary,#4f46e5) 16%,transparent)}
.skm-hint{font-size:10.5px;line-height:16px;color:var(--dsw-alias-label-tertiary,#8b95a5)}
.skm-tabs{display:flex;gap:2px;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);flex-wrap:wrap}
.skm-tab{padding:5px 10px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font:inherit;font-size:12px;line-height:18px;cursor:pointer;margin-bottom:-1px}
.skm-tab:hover{color:var(--dsw-alias-label-primary,#111)}
.skm-tabActive{border-bottom-color:var(--dsw-alias-state-business-primary,#4f46e5);color:var(--dsw-alias-state-business-primary,#4338ca);font-weight:600}
.skm-check{display:flex;align-items:flex-start;gap:8px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary,#374151);cursor:pointer}
.skm-check input{margin:3px 0 0;accent-color:var(--dsw-alias-state-business-primary,#4f46e5)}
.skm-errorBox{padding:9px 11px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-error-primary,#dc2626) 30%,transparent);border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#dc2626) 7%,transparent);color:var(--dsw-alias-state-error-primary,#b91c1c);font-size:12px;line-height:18px;display:flex;flex-direction:column;gap:4px}
.skm-errorList{margin:0;padding-left:18px;font-size:11px;line-height:17px}
.skm-previewMeta{display:grid;grid-template-columns:auto minmax(0,1fr);gap:5px 12px;font-size:11.5px;line-height:17px;color:var(--dsw-alias-label-secondary,#4b5563)}
.skm-previewKey{color:var(--dsw-alias-label-tertiary,#8b95a5);white-space:nowrap}
.skm-previewValue{word-break:break-word;min-width:0}
.skm-code{margin:0;padding:12px;border-radius:9px;border:1px solid var(--dsw-alias-border-l2,#e5e7eb);background:var(--dsw-alias-bg-layer-2,#f8fafc);color:var(--dsw-alias-label-primary,#111);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11.5px;line-height:18px;white-space:pre-wrap;word-break:break-word;max-height:46vh;overflow:auto}
.skm-toast{position:fixed;right:22px;bottom:22px;z-index:100001;display:flex;align-items:flex-start;gap:9px;max-width:min(420px,calc(100vw - 44px));padding:10px 13px;border-radius:10px;border:1px solid var(--dsw-alias-border-l2,#d9dee5);background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#111);box-shadow:0 10px 32px rgba(0,0,0,.18);font-size:12px;line-height:18px;animation:skmPop .15s ease-out}
.skm-toastSuccess .skm-toastIcon{color:#059669}
.skm-toastError .skm-toastIcon{color:var(--dsw-alias-state-error-primary,#dc2626)}
.skm-toastIcon{flex:none;margin-top:1px}
.skm-toastBody{min-width:0;word-break:break-word}
.skm-notice{display:flex;align-items:flex-start;gap:7px;padding:8px 11px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#f59e0b) 9%,transparent);border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary,#f59e0b) 26%,transparent);color:var(--dsw-alias-state-warn-label,#92400e);font-size:11.5px;line-height:17px}
@media (max-width: 860px){
  .skm-body{flex-direction:column}
  .skm-side{width:auto;flex:none;flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l2,#e5e7eb);padding:8px}
  .skm-sideSection{display:none}
  .skm-sideItem{width:auto;flex:none;white-space:nowrap}
  .skm-sideItemMeta{display:none}
  .skm-main{padding:13px 13px 0}
  .skm-top{padding:13px 14px}
  .skm-subtitle{display:none}
  .skm-cardActions{max-width:none;justify-content:flex-start}
  .skm-card{flex-wrap:wrap}
  .skm-cardBody{flex-basis:calc(100% - 46px)}
}
@keyframes skmSpin{to{transform:rotate(360deg)}}
@keyframes skmPop{from{opacity:0;transform:translateY(6px) scale(.985)}to{opacity:1;transform:none}}
`;

    function ensureStyles() {
      if (typeof document === "undefined") return undefined;
      let style = document.getElementById(STYLE_ID);
      if (style !== null) return style;
      style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
      return style;
    }

    /* ------------------------------------------------------------------ */
    /* Icons                                                               */
    /* ------------------------------------------------------------------ */

    function svg(size, children, extra) {
      return h("svg", {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.7,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        ...extra
      }, children);
    }

    function SkillGlyph({ size = 16 }) {
      return svg(size, [
        h("path", { key: "cap", d: "M2.5 9.2 12 4.6l9.5 4.6L12 13.8 2.5 9.2Z" }),
        h("path", { key: "base", d: "M6.3 11.3v4.4c0 1.6 2.6 2.9 5.7 2.9s5.7-1.3 5.7-2.9v-4.4" }),
        h("path", { key: "cord", d: "M21.5 9.2v5.6" }),
        h("circle", { key: "bead", cx: 21.5, cy: 16.3, r: 1.1 })
      ]);
    }

    function GlobeIcon({ size = 16 }) {
      return svg(size, [
        h("circle", { key: "c", cx: 12, cy: 12, r: 9 }),
        h("path", { key: "a", d: "M3 12h18" }),
        h("path", { key: "b", d: "M12 3c2.7 3.2 2.7 14.8 0 18M12 3c-2.7 3.2-2.7 14.8 0 18" })
      ]);
    }

    function FolderIcon({ size = 16 }) {
      return svg(size, [h("path", { key: "p", d: "M3 7.2A2.2 2.2 0 0 1 5.2 5h4.2l2 2.1h7.4A2.2 2.2 0 0 1 21 9.3v7.5A2.2 2.2 0 0 1 18.8 19H5.2A2.2 2.2 0 0 1 3 16.8V7.2Z" })]);
    }

    function SearchIcon({ size = 14 }) {
      return svg(size, [
        h("circle", { key: "c", cx: 11, cy: 11, r: 6.2 }),
        h("path", { key: "l", d: "m16 16 4.2 4.2" })
      ]);
    }

    function CloseIcon({ size = 14 }) {
      return svg(size, [h("path", { key: "p", d: "M6 6l12 12M18 6 6 18" })]);
    }

    function PlusIcon({ size = 14 }) {
      return svg(size, [h("path", { key: "p", d: "M12 5v14M5 12h14" })]);
    }

    function RefreshIcon({ size = 14 }) {
      return svg(size, [
        h("path", { key: "a", d: "M20 11.5a8 8 0 1 0-2.2 5.6" }),
        h("path", { key: "b", d: "M20 4.5v7h-7" })
      ]);
    }

    function EyeIcon({ size = 13 }) {
      return svg(size, [
        h("path", { key: "a", d: "M2.5 12S6 6.3 12 6.3 21.5 12 21.5 12 18 17.7 12 17.7 2.5 12 2.5 12Z" }),
        h("circle", { key: "c", cx: 12, cy: 12, r: 2.6 })
      ]);
    }

    function PencilIcon({ size = 13 }) {
      return svg(size, [
        h("path", { key: "a", d: "M4 20l4.2-.9L20 7.3 16.7 4 4.9 15.8 4 20Z" }),
        h("path", { key: "b", d: "m14.8 5.9 3.3 3.3" })
      ]);
    }

    function PowerIcon({ size = 13 }) {
      return svg(size, [
        h("path", { key: "a", d: "M12 3.5v8.2" }),
        h("path", { key: "b", d: "M6.4 7a8 8 0 1 0 11.2 0" })
      ]);
    }

    function TrashIcon({ size = 13 }) {
      return svg(size, [
        h("path", { key: "a", d: "M4 7h16" }),
        h("path", { key: "b", d: "M9 7V4.2h6V7" }),
        h("path", { key: "c", d: "M6.3 7 7.3 20h9.4L17.7 7" })
      ]);
    }

    function CopyIcon({ size = 13 }) {
      return svg(size, [
        h("rect", { key: "a", x: 9, y: 9, width: 10.5, height: 10.5, rx: 2 }),
        h("path", { key: "b", d: "M15 6.2V5.4A1.9 1.9 0 0 0 13.1 3.5H5.4A1.9 1.9 0 0 0 3.5 5.4v7.7A1.9 1.9 0 0 0 5.4 15h.8" })
      ]);
    }

    function DownloadIcon({ size = 14 }) {
      return svg(size, [
        h("path", { key: "a", d: "M12 3v12" }),
        h("path", { key: "b", d: "m7 10 5 5 5-5" }),
        h("path", { key: "c", d: "M5 21h14" })
      ]);
    }

    function UploadIcon({ size = 14 }) {
      return svg(size, [
        h("path", { key: "a", d: "M12 21V9" }),
        h("path", { key: "b", d: "m7 14 5-5 5 5" }),
        h("path", { key: "c", d: "M5 3h14" })
      ]);
    }

    function CheckIcon({ size = 14 }) {
      return svg(size, [h("path", { key: "p", d: "m4.5 12.2 5 5L20 6.5" })]);
    }

    function WarningIcon({ size = 14 }) {
      return svg(size, [
        h("path", { key: "a", d: "M12 3.5 21.2 20H2.8L12 3.5Z" }),
        h("path", { key: "b", d: "M12 9.3v4.6" }),
        h("path", { key: "c", d: "M12 17.1h.01" })
      ]);
    }

    /* ------------------------------------------------------------------ */
    /* Small primitives                                                    */
    /* ------------------------------------------------------------------ */

    function Portal({ children }) {
      if (typeof document !== "undefined" && ReactDOM && typeof ReactDOM.createPortal === "function") {
        return ReactDOM.createPortal(children, document.body);
      }
      return children;
    }

    function Spinner({ size = 16 }) {
      return h("span", { className: "skm-spinner", style: { width: size, height: size }, "aria-hidden": "true" });
    }

    function Modal({ title, onClose, children, footer, width = 560, danger = false }) {
      useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key === "Escape") onClose();
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
      }, [onClose]);
      return h(Portal, null,
        h("div", {
          className: "skm-overlay",
          onMouseDown: (event) => { if (event.target === event.currentTarget) onClose(); }
        },
          h("div", {
            className: "skm-modal" + (danger ? " skm-modalDanger" : ""),
            role: "dialog",
            "aria-modal": "true",
            "aria-label": title,
            style: { width }
          },
            h("div", { className: "skm-modalHead" },
              h("h2", { className: "skm-modalTitle" }, title),
              h("button", { type: "button", className: "skm-iconBtn", onClick: onClose, "aria-label": "Close" }, h(CloseIcon, null))
            ),
            h("div", { className: "skm-modalBody" }, children),
            footer === undefined || footer === null ? null : h("div", { className: "skm-modalFoot" }, footer)
          )
        )
      );
    }

    function ErrorBox({ t, error }) {
      const details = detailTexts(t, error);
      return h("div", { className: "skm-errorBox" },
        h("div", null, errorText(t, error)),
        details.length === 0 ? null : h("ul", { className: "skm-errorList" },
          details.map((detail, index) => h("li", { key: index }, detail))
        )
      );
    }

    function Toast({ toast }) {
      if (toast === null) return null;
      return h(Portal, null,
        h("div", { className: "skm-toast " + (toast.kind === "error" ? "skm-toastError" : "skm-toastSuccess"), role: "status" },
          h("span", { className: "skm-toastIcon" }, toast.kind === "error" ? h(WarningIcon, { size: 15 }) : h(CheckIcon, { size: 15 })),
          h("span", { className: "skm-toastBody" }, toast.text)
        )
      );
    }

    /* ------------------------------------------------------------------ */
    /* Skill row                                                           */
    /* ------------------------------------------------------------------ */

    function SkillCard({ skill, t, language, busy, onPreview, onEdit, onToggle, onUninstall, onExport }) {
      const isBusy = busy !== null && busy !== undefined && busy === `${skill.rootId}::${skill.relPath}`;
      const badges = [];
      if (!skill.valid) {
        badges.push(h("span", { key: "invalid", className: "skm-badge skm-badgeError" }, t("badgeInvalid")));
      } else if (skill.enabled) {
        badges.push(h("span", { key: "enabled", className: "skm-badge skm-badgeOn" }, t("badgeEnabled")));
      } else {
        badges.push(h("span", { key: "disabled", className: "skm-badge skm-badgeOff" }, t("badgeDisabled")));
      }
      if (skill.valid && skill.enabled && skill.shadowedBy !== undefined) {
        badges.push(h("span", { key: "shadowed", className: "skm-badge skm-badgeWarn" }, t("badgeShadowed")));
      }
      if (skill.overridesGlobal === true) {
        badges.push(h("span", { key: "overrides", className: "skm-badge skm-badgeAccent" }, t("badgeOverrides")));
      }
      if (Array.isArray(skill.overriddenIn) && skill.overriddenIn.length > 0) {
        badges.push(h("span", { key: "overridden", className: "skm-badge skm-badgeWarn" }, t("badgeOverriddenIn", { n: skill.overriddenIn.length })));
      }
      if (!skill.invocation.modelInvocable) {
        badges.push(h("span", { key: "model-off", className: "skm-badge skm-badgeOff" }, t("invModelOff")));
      }
      if (!skill.invocation.userInvocable) {
        badges.push(h("span", { key: "user-off", className: "skm-badge skm-badgeOff" }, t("invUserOff")));
      }
      const description = skill.valid
        ? skill.description
        : detailTexts(t, { details: skill.errors })[0] || errorText(t, { code: skill.errors?.[0]?.code });
      return h("article", {
        className: "skm-card" + (skill.enabled ? "" : " skm-cardDisabled") + (skill.valid ? "" : " skm-cardInvalid"),
        "data-skill-name": skill.name,
        "data-skill-root": skill.rootId
      },
        h("div", { className: "skm-cardIcon" }, h(skill.valid ? SkillGlyph : WarningIcon, { size: 17 })),
        h("div", { className: "skm-cardBody" },
          h("div", { className: "skm-cardTop" },
            h("span", { className: "skm-cardName", title: skill.name }, skill.name),
            badges
          ),
          h("p", { className: "skm-desc" + (skill.valid ? "" : " skm-descInvalid") }, description || t("badgeInvalid")),
          h("div", { className: "skm-meta" },
            h("span", null, sourceLabel(t, skill.source)),
            h("span", { className: "skm-metaPath", title: skill.filePath }, skill.relPath),
            skill.updatedAt === null || skill.updatedAt === undefined ? null : h("span", null, t("metaUpdated", { time: formatTime(t, skill.updatedAt, language) })),
            skill.size === undefined ? null : h("span", null, formatBytes(skill.size))
          )
        ),
        h("div", { className: "skm-cardActions" },
          h("button", { type: "button", className: "skm-action", onClick: () => onPreview(skill), disabled: isBusy }, h(EyeIcon), t("actionPreview")),
          h("button", { type: "button", className: "skm-action", onClick: () => onEdit(skill), disabled: isBusy }, h(PencilIcon), t("actionEdit")),
          h("button", {
            type: "button",
            className: "skm-action",
            onClick: () => onToggle(skill),
            disabled: isBusy
          }, isBusy ? h(Spinner, { size: 12 }) : h(PowerIcon), skill.enabled ? t("actionDisable") : t("actionEnable")),
          h("button", {
            type: "button",
            className: "skm-action",
            onClick: () => onExport(skill),
            disabled: isBusy || !skill.valid
          }, h(DownloadIcon), t("actionExport")),
          h("button", {
            type: "button",
            className: "skm-action skm-actionDanger",
            onClick: () => onUninstall(skill),
            disabled: isBusy
          }, h(TrashIcon), t("actionUninstall"))
        )
      );
    }

    /* ------------------------------------------------------------------ */
    /* Install modal                                                       */
    /* ------------------------------------------------------------------ */

    function InstallModal({ scope, state, t, language, onClose, onInstalled, pickDirectory }) {
      // Default to the scope the user is viewing, but let the dialog choose any
      // scope. A missing workspace falls back to global so the dialog stays
      // usable instead of opening on an impossible target.
      const initialScope = initialInstallScope(scope, state);
      const initialRoots = initialScope.roots ?? [];
      const [targetScopeId, setTargetScopeId] = useState(initialScope.kind === "global" ? "global" : initialScope.id);
      const [targetRootId, setTargetRootId] = useState(initialRoots[0]?.id ?? "");
      const [tab, setTab] = useState("path");
      const [path, setPath] = useState("");
      const [from, setFrom] = useState("");
      const [name, setName] = useState("");
      const [description, setDescription] = useState("");
      const [whenToUse, setWhenToUse] = useState("");
      const [body, setBody] = useState("");
      const [disableModel, setDisableModel] = useState(false);
      const [userInvocable, setUserInvocable] = useState(true);
      const [text, setText] = useState("");
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(null);
      const [picking, setPicking] = useState(false);
      const fileRef = useRef(null);

      const allScopes = useMemo(() => [state.global, ...(state.workspaces ?? [])], [state]);
      const targetScope = useMemo(() => {
        if (targetScopeId === "global") return state.global;
        return state.workspaces.find((workspace) => workspace.id === targetScopeId) ?? state.global;
      }, [state, targetScopeId]);
      const roots = targetScope.roots ?? [];
      const targetRoot = roots.find((root) => root.id === targetRootId) ?? roots[0];
      const targetScopeValue = targetScope.kind === "global" ? "global" : targetScope.id;
      const workspaceMissing = targetScope.kind === "workspace" && targetScope.exists === false;

      async function browsePath() {
        if (picking) return;
        setPicking(true);
        setError(null);
        try {
          if (typeof pickDirectory !== "function") throw new Error("directory picker unavailable");
          const picked = await pickDirectory();
          if (typeof picked === "string" && picked.trim() !== "") setPath(picked);
        } catch {
          setError({ message: t("browseUnavailable") });
        } finally {
          setPicking(false);
        }
      }

      const copyOptions = useMemo(() => {
        const groups = [];
        for (const sourceScope of allScopes) {
          const items = (sourceScope.skills ?? []).filter((skill) => skill.valid && skill.rootId !== targetRoot?.id);
          if (items.length === 0) continue;
          groups.push({
            id: sourceScope.kind === "global" ? "global" : `ws:${sourceScope.id}`,
            title: sourceScope.kind === "global" ? t("scopeGlobal") : sourceScope.title,
            items
          });
        }
        return groups;
      }, [allScopes, targetRoot, t]);

      function selectScope(value) {
        setTargetScopeId(value);
        const nextScope = value === "global"
          ? state.global
          : state.workspaces.find((workspace) => workspace.id === value) ?? state.global;
        setTargetRootId(nextScope.roots?.[0]?.id ?? "");
        setFrom("");
        setError(null);
      }

      async function submit() {
        if (busy) return;
        if (targetRoot === undefined) { setError({ message: t("installTarget") }); return; }
        let source;
        if (tab === "path") {
          if (path.trim() === "") { setError({ message: t("pathLabel") }); return; }
          source = { kind: "path", path: path.trim() };
        } else if (tab === "copy") {
          const index = from.lastIndexOf("|");
          if (index === -1) { setError({ message: t("copyLabel") }); return; }
          source = { kind: "copy", fromRootId: from.slice(0, index), fromRelPath: from.slice(index + 1) };
        } else if (tab === "create") {
          if (name.trim() === "" || description.trim() === "") { setError({ message: t("createDesc") }); return; }
          source = {
            kind: "create",
            name: name.trim(),
            description: description.trim(),
            whenToUse: whenToUse.trim(),
            body,
            disableModelInvocation: disableModel,
            userInvocable
          };
        } else {
          if (text.trim() === "") { setError({ message: t("textLabel") }); return; }
          source = { kind: "text", content: text };
        }
        setBusy(true);
        setError(null);
        try {
          const result = await request("/install", {
            method: "POST",
            body: { targetRootId: targetRoot.id, source }
          });
          onInstalled(result);
        } catch (caught) {
          setError(caught);
        } finally {
          setBusy(false);
        }
      }

      async function readFileIntoText(event) {
        const file = event.target?.files?.[0];
        if (file === undefined) return;
        try {
          setText(await file.text());
          setTab("text");
        } catch (caught) {
          setError(caught);
        }
      }

      const disabled = busy || picking || workspaceMissing || targetRoot === undefined;

      return h(Modal, {
        title: t("installTitle"),
        onClose,
        width: 620,
        footer: [
          h("button", { key: "cancel", type: "button", className: "skm-btn", onClick: onClose, disabled: busy }, t("cancel")),
          h("button", { key: "go", type: "button", className: "skm-btn skm-btnPrimary", onClick: submit, disabled }, busy ? h(Spinner, { size: 13 }) : h(PlusIcon), busy ? t("installing") : t("installAction"))
        ]
      },
        workspaceMissing ? h("div", { className: "skm-notice" }, h(WarningIcon), t("workspaceMissing")) : null,
        h("div", { className: "skm-field" },
          h("label", { className: "skm-label", htmlFor: "skm-target-scope" }, t("installScope")),
          h("select", {
            id: "skm-target-scope",
            className: "skm-select",
            value: targetScopeValue,
            onChange: (event) => selectScope(event.target.value)
          },
            h("option", { value: "global" }, t("scopeGlobal")),
            (state.workspaces ?? []).map((workspace) => (
              h("option", {
                key: workspace.id,
                value: workspace.id,
                disabled: workspace.exists === false
              }, workspace.exists === false ? `${workspace.title} — ${t("workspaceMissing")}` : workspace.title)
            ))
          ),
          h("span", { className: "skm-hint" }, t("installScopeHint"))
        ),
        h("div", { className: "skm-field" },
          h("label", { className: "skm-label", htmlFor: "skm-target-root" }, t("installTarget")),
          h("select", {
            id: "skm-target-root",
            className: "skm-select",
            value: targetRoot?.id ?? "",
            onChange: (event) => setTargetRootId(event.target.value)
          }, roots.map((root) => h("option", { key: root.id, value: root.id }, `${sourceLabel(t, root.source)} — ${root.path}`))),
          h("span", { className: "skm-hint" }, t("installTargetHint"))
        ),
        h("div", { className: "skm-tabs" },
          [["path", t("tabPath")], ["copy", t("tabCopy")], ["create", t("tabCreate")], ["text", t("tabText")]].map(([id, label]) => (
            h("button", {
              key: id,
              type: "button",
              className: "skm-tab" + (tab === id ? " skm-tabActive" : ""),
              onClick: () => { setTab(id); setError(null); }
            }, label)
          ))
        ),
        tab === "path" ? h("div", { className: "skm-field" },
          h("label", { className: "skm-label", htmlFor: "skm-path" }, t("pathLabel")),
          h("div", { className: "skm-fileRow" },
            h("input", {
              id: "skm-path",
              className: "skm-input",
              style: { flex: "1 1 260px" },
              value: path,
              placeholder: t("pathPlaceholder"),
              onChange: (event) => setPath(event.target.value),
              onKeyDown: (event) => { if (event.key === "Enter") submit(); }
            }),
            h("button", {
              type: "button",
              className: "skm-btn",
              onClick: browsePath,
              disabled: busy || picking
            }, h(FolderIcon), t("browse"))
          ),
          h("span", { className: "skm-hint" }, t("pathHint"))
        ) : null,
        tab === "copy" ? h("div", { className: "skm-field" },
          h("label", { className: "skm-label", htmlFor: "skm-copy" }, t("copyLabel")),
          copyOptions.length === 0
            ? h("div", { className: "skm-hint" }, t("copyEmpty"))
            : h("select", {
                id: "skm-copy",
                className: "skm-select",
                value: from,
                onChange: (event) => setFrom(event.target.value)
              },
                h("option", { value: "" }, "—"),
                copyOptions.map((group) => h("optgroup", { key: group.id, label: group.title },
                  group.items.map((skill) => h("option", {
                    key: `${skill.rootId}|${skill.relPath}`,
                    value: `${skill.rootId}|${skill.relPath}`
                  }, `${skill.name}${skill.enabled ? "" : ` (${t("badgeDisabled")})`}`))
                ))
              ),
          h("span", { className: "skm-hint" }, t("copyHint"))
        ) : null,
        tab === "create" ? h(React.Fragment, null,
          h("div", { className: "skm-field" },
            h("label", { className: "skm-label", htmlFor: "skm-name" }, t("createName")),
            h("input", {
              id: "skm-name",
              className: "skm-input",
              value: name,
              placeholder: t("createNamePlaceholder"),
              onChange: (event) => setName(event.target.value)
            })
          ),
          h("div", { className: "skm-field" },
            h("label", { className: "skm-label", htmlFor: "skm-desc" }, t("createDesc")),
            h("input", {
              id: "skm-desc",
              className: "skm-input",
              value: description,
              placeholder: t("createDescPlaceholder"),
              onChange: (event) => setDescription(event.target.value)
            })
          ),
          h("div", { className: "skm-field" },
            h("label", { className: "skm-label", htmlFor: "skm-when" }, t("createWhen")),
            h("input", {
              id: "skm-when",
              className: "skm-input",
              value: whenToUse,
              placeholder: t("createWhenPlaceholder"),
              onChange: (event) => setWhenToUse(event.target.value)
            })
          ),
          h("div", { className: "skm-field" },
            h("label", { className: "skm-label", htmlFor: "skm-body" }, t("createBody")),
            h("textarea", {
              id: "skm-body",
              className: "skm-textarea",
              value: body,
              placeholder: t("createBodyPlaceholder"),
              onChange: (event) => setBody(event.target.value)
            })
          ),
          h("label", { className: "skm-check" },
            h("input", { type: "checkbox", checked: disableModel, onChange: (event) => setDisableModel(event.target.checked) }),
            h("span", null, t("createModelOff"))
          ),
          h("label", { className: "skm-check" },
            h("input", { type: "checkbox", checked: userInvocable, onChange: (event) => setUserInvocable(event.target.checked) }),
            h("span", null, t("createUserOn"))
          )
        ) : null,
        tab === "text" ? h("div", { className: "skm-field" },
          h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } },
            h("label", { className: "skm-label", htmlFor: "skm-text" }, t("textLabel")),
            h("button", { type: "button", className: "skm-btn skm-btnGhost", onClick: () => fileRef.current?.click() }, h(CopyIcon), t("textLoadFile"))
          ),
          h("input", { ref: fileRef, type: "file", accept: ".md,text/markdown,text/plain", style: { display: "none" }, onChange: readFileIntoText }),
          h("textarea", {
            id: "skm-text",
            className: "skm-textarea",
            style: { minHeight: 210 },
            value: text,
            placeholder: t("textPlaceholder"),
            onChange: (event) => setText(event.target.value)
          })
        ) : null,
        error === null ? null : h(ErrorBox, { t, error })
      );
    }

    /* ------------------------------------------------------------------ */
    /* Preview modal                                                       */
    /* ------------------------------------------------------------------ */

    function ExportModal({ scope, state, skill, t, onClose, onExported, pickDirectory }) {
      const skillOnly = skill !== null && skill !== undefined;
      const [mode, setMode] = useState(skillOnly ? "skill" : (scope.kind === "workspace" ? "workspace" : "all"));
      const [workspaceId, setWorkspaceId] = useState(
        scope.kind === "workspace" ? scope.id : (state.workspaces[0]?.id ?? "")
      );
      const [destination, setDestination] = useState(state.defaultExportDir ?? "");
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(null);
      const [picking, setPicking] = useState(false);

      async function browseDestination() {
        if (picking) return;
        setPicking(true);
        setError(null);
        try {
          if (typeof pickDirectory !== "function") throw new Error("directory picker unavailable");
          const picked = await pickDirectory();
          if (typeof picked === "string" && picked.trim() !== "") setDestination(picked);
        } catch {
          setError({ message: t("browseUnavailable") });
        } finally {
          setPicking(false);
        }
      }

      const workspace = state.workspaces.find((item) => item.id === workspaceId) ?? state.workspaces[0];
      const workspaceCount = (workspace?.skills ?? []).filter((item) => item.valid).length;
      const allCount = [state.global, ...(state.workspaces ?? [])].reduce(
        (total, item) => total + (item.skills ?? []).filter((entry) => entry.valid).length,
        0
      );
      const count = skillOnly ? 1 : (mode === "workspace" ? workspaceCount : allCount);
      const canExport = count > 0
        && destination.trim() !== ""
        && !busy
        && !picking
        && (mode !== "workspace" || workspace !== undefined);

      async function submit() {
        if (!canExport) return;
        setBusy(true);
        setError(null);
        try {
          let source;
          if (skillOnly) source = { kind: "skill", rootId: skill.rootId, relPath: skill.relPath };
          else if (mode === "workspace") source = { kind: "workspace", workspaceId: workspace.id };
          else source = { kind: "all" };
          const result = await request("/export", {
            method: "POST",
            body: { destinationDir: destination.trim(), source }
          });
          onExported(result);
        } catch (caught) {
          setError(caught);
        } finally {
          setBusy(false);
        }
      }

      return h(Modal, {
        title: t("exportTitle"),
        onClose,
        width: 580,
        footer: [
          h("button", { key: "cancel", type: "button", className: "skm-btn", onClick: onClose, disabled: busy }, t("cancel")),
          h("button", { key: "go", type: "button", className: "skm-btn skm-btnPrimary", onClick: submit, disabled: !canExport },
            busy ? h(Spinner, { size: 13 }) : h(DownloadIcon),
            busy ? t("exporting") : t("exportAction")
          )
        ]
      },
        skillOnly ? h("div", { className: "skm-exportSkill" },
          h("div", { className: "skm-exportSkillName" }, skill.name),
          h("div", { className: "skm-exportSkillDesc" }, skill.description || t("contentEmpty")),
          h("div", { className: "skm-hint" }, t("exportSkillHint"))
        ) : h(React.Fragment, null,
          h("div", { className: "skm-field" },
            h("span", { className: "skm-label" }, t("exportTitle")),
            h("label", { className: "skm-check" },
              h("input", {
                type: "radio",
                name: "skm-export-mode",
                checked: mode === "workspace",
                onChange: () => setMode("workspace")
              }),
              h("span", null, t("exportWorkspaceMode"))
            ),
            h("label", { className: "skm-check" },
              h("input", {
                type: "radio",
                name: "skm-export-mode",
                checked: mode === "all",
                onChange: () => setMode("all")
              }),
              h("span", null, t("exportAllMode"))
            )
          ),
          mode === "workspace" ? h("div", { className: "skm-field" },
            h("label", { className: "skm-label", htmlFor: "skm-export-workspace" }, t("exportWorkspaceLabel")),
            h("select", {
              id: "skm-export-workspace",
              className: "skm-select",
              value: workspace?.id ?? "",
              onChange: (event) => setWorkspaceId(event.target.value)
            }, state.workspaces.map((item) => h("option", { key: item.id, value: item.id }, item.title)))
          ) : null,
          h("div", { className: "skm-hint" }, mode === "workspace" ? t("exportWorkspaceHint") : t("exportAllHint"))
        ),
        h("div", { className: "skm-field" },
          h("label", { className: "skm-label", htmlFor: "skm-export-destination" }, t("exportDestination")),
          h("div", { className: "skm-fileRow" },
            h("input", {
              id: "skm-export-destination",
              className: "skm-input",
              style: { flex: "1 1 260px" },
              value: destination,
              placeholder: t("exportDestinationPlaceholder"),
              onChange: (event) => setDestination(event.target.value),
              onKeyDown: (event) => { if (event.key === "Enter") submit(); }
            }),
            h("button", {
              type: "button",
              className: "skm-btn",
              onClick: browseDestination,
              disabled: busy || picking
            }, h(FolderIcon), t("browse"))
          ),
          h("span", { className: "skm-hint" }, t("exportDestinationHint"))
        ),
        count === 0 ? h("div", { className: "skm-notice" }, h(WarningIcon), t("exportNoSkills")) : null,
        count > 0 ? h("div", { className: "skm-hint" }, t("countSkills", { n: count })) : null,
        error === null ? null : h(ErrorBox, { t, error })
      );
    }

    function ImportModal({ scope, state, t, language, onClose, onImported, pickDirectory }) {
      const initialScope = initialInstallScope(scope, state);
      const initialRoots = initialScope.roots ?? [];
      const [targetScopeId, setTargetScopeId] = useState(initialScope.kind === "global" ? "global" : initialScope.id);
      const [targetRootId, setTargetRootId] = useState(initialRoots[0]?.id ?? "");
      const [tab, setTab] = useState("archive");
      const [archiveBase64, setArchiveBase64] = useState("");
      const [archiveName, setArchiveName] = useState("");
      const [archiveBytes, setArchiveBytes] = useState(0);
      const [inspectResult, setInspectResult] = useState(null);
      const [selected, setSelected] = useState(() => new Set());
      const [path, setPath] = useState("");
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState(null);
      const [picking, setPicking] = useState(false);
      const fileRef = useRef(null);

      const targetScope = useMemo(() => {
        if (targetScopeId === "global") return state.global;
        return state.workspaces.find((workspace) => workspace.id === targetScopeId) ?? state.global;
      }, [state, targetScopeId]);
      const roots = targetScope.roots ?? [];
      const targetRoot = roots.find((root) => root.id === targetRootId) ?? roots[0];
      const targetScopeValue = targetScope.kind === "global" ? "global" : targetScope.id;
      const workspaceMissing = targetScope.kind === "workspace" && targetScope.exists === false;
      const validSkills = (inspectResult?.skills ?? []).filter((skill) => skill.valid);
      const disabled = busy
        || picking
        || workspaceMissing
        || targetRoot === undefined
        || (tab === "archive" ? (archiveBase64 === "" || selected.size === 0) : path.trim() === "");

      async function browsePath() {
        if (picking) return;
        setPicking(true);
        setError(null);
        try {
          if (typeof pickDirectory !== "function") throw new Error("directory picker unavailable");
          const picked = await pickDirectory();
          if (typeof picked === "string" && picked.trim() !== "") setPath(picked);
        } catch {
          setError({ message: t("browseUnavailable") });
        } finally {
          setPicking(false);
        }
      }

      function selectScope(value) {
        setTargetScopeId(value);
        const nextScope = value === "global"
          ? state.global
          : state.workspaces.find((workspace) => workspace.id === value) ?? state.global;
        setTargetRootId(nextScope.roots?.[0]?.id ?? "");
        setError(null);
      }

      function toggleSelected(archivePath) {
        setSelected((current) => {
          const next = new Set(current);
          if (next.has(archivePath)) next.delete(archivePath);
          else next.add(archivePath);
          return next;
        });
      }

      function selectAll() {
        setSelected(new Set(validSkills.map((skill) => skill.archivePath)));
      }

      function clearAll() {
        setSelected(new Set());
      }

      async function onFileChange(event) {
        const file = event.target?.files?.[0];
        if (file === undefined) return;
        setInspectResult(null);
        setSelected(new Set());
        setArchiveBase64("");
        setArchiveName("");
        setArchiveBytes(0);
        setError(null);
        if (file.size > MAX_IMPORT_BYTES) {
          setError({ code: "archive-too-large", message: t("importArchiveTooLarge") });
          return;
        }
        setBusy(true);
        try {
          const base64 = await fileToBase64(file);
          const result = await request("/import/inspect", {
            method: "POST",
            body: { contentBase64: base64 }
          });
          setArchiveBase64(base64);
          setArchiveName(file.name);
          setArchiveBytes(file.size);
          setInspectResult(result);
          setSelected(new Set(result.skills.filter((skill) => skill.valid).map((skill) => skill.archivePath)));
        } catch (caught) {
          setError(caught);
        } finally {
          setBusy(false);
        }
      }

      async function submit() {
        if (disabled) return;
        setBusy(true);
        setError(null);
        try {
          let result;
          if (tab === "archive") {
            result = await request("/import/install", {
              method: "POST",
              body: {
                contentBase64: archiveBase64,
                targetRootId: targetRoot.id,
                selectedPaths: [...selected]
              }
            });
          } else {
            result = await request("/install", {
              method: "POST",
              body: { targetRootId: targetRoot.id, source: { kind: "path", path: path.trim() } }
            });
          }
          onImported(result);
        } catch (caught) {
          setError(caught);
        } finally {
          setBusy(false);
        }
      }

      return h(Modal, {
        title: t("importTitle"),
        onClose,
        width: 660,
        footer: [
          h("button", { key: "cancel", type: "button", className: "skm-btn", onClick: onClose, disabled: busy }, t("cancel")),
          h("button", { key: "go", type: "button", className: "skm-btn skm-btnPrimary", onClick: submit, disabled },
            busy ? h(Spinner, { size: 13 }) : h(UploadIcon),
            busy ? t("importing") : t("importAction")
          )
        ]
      },
        workspaceMissing ? h("div", { className: "skm-notice" }, h(WarningIcon), t("workspaceMissing")) : null,
        h("div", { className: "skm-field" },
          h("label", { className: "skm-label", htmlFor: "skm-import-scope" }, t("installScope")),
          h("select", {
            id: "skm-import-scope",
            className: "skm-select",
            value: targetScopeValue,
            onChange: (event) => selectScope(event.target.value)
          },
            h("option", { value: "global" }, t("scopeGlobal")),
            (state.workspaces ?? []).map((workspace) => (
              h("option", {
                key: workspace.id,
                value: workspace.id,
                disabled: workspace.exists === false
              }, workspace.exists === false ? `${workspace.title} — ${t("workspaceMissing")}` : workspace.title)
            ))
          ),
          h("span", { className: "skm-hint" }, t("installScopeHint"))
        ),
        h("div", { className: "skm-field" },
          h("label", { className: "skm-label", htmlFor: "skm-import-root" }, t("installTarget")),
          h("select", {
            id: "skm-import-root",
            className: "skm-select",
            value: targetRoot?.id ?? "",
            onChange: (event) => setTargetRootId(event.target.value)
          }, roots.map((root) => h("option", { key: root.id, value: root.id }, `${sourceLabel(t, root.source)} — ${root.path}`))),
          h("span", { className: "skm-hint" }, t("installTargetHint"))
        ),
        h("div", { className: "skm-tabs" },
          [["archive", t("importTabArchive")], ["path", t("importTabPath")]].map(([id, label]) => (
            h("button", {
              key: id,
              type: "button",
              className: "skm-tab" + (tab === id ? " skm-tabActive" : ""),
              onClick: () => { setTab(id); setError(null); }
            }, label)
          ))
        ),
        tab === "archive" ? h(React.Fragment, null,
          h("div", { className: "skm-field" },
            h("label", { className: "skm-label" }, t("importArchiveLabel")),
            h("div", { className: "skm-fileRow" },
              h("button", { type: "button", className: "skm-btn", onClick: () => fileRef.current?.click(), disabled: busy },
                h(UploadIcon), t("importChooseFile")
              ),
              h("span", { className: "skm-hint skm-fileName" }, archiveName === "" ? t("importArchiveHint") : `${archiveName} · ${formatBytes(archiveBytes)}`),
              h("input", {
                ref: fileRef,
                type: "file",
                accept: ".tgz,.tar.gz,application/gzip,application/x-gzip",
                style: { display: "none" },
                onChange: onFileChange
              })
            ),
            h("span", { className: "skm-hint" }, t("importArchiveHint"))
          ),
          busy && archiveBase64 === "" ? h("div", { className: "skm-loading", style: { minHeight: 60 } }, h(Spinner, null), t("importReading")) : null,
          inspectResult !== null ? h("div", { className: "skm-importList" },
            h("div", { className: "skm-importHead" },
              h("span", { className: "skm-label" }, t("importFound", { n: inspectResult.skills.length })),
              h("span", { className: "skm-importHeadActions" },
                h("button", { type: "button", className: "skm-action", onClick: selectAll, disabled: validSkills.length === 0 }, t("importSelectAll")),
                h("button", { type: "button", className: "skm-action", onClick: clearAll, disabled: selected.size === 0 }, t("importClearAll"))
              )
            ),
            inspectResult.skills.map((skill) => (
              h("label", {
                key: skill.archivePath,
                className: "skm-importItem" + (skill.valid ? "" : " skm-importItemInvalid")
              },
                h("input", {
                  type: "checkbox",
                  checked: selected.has(skill.archivePath),
                  disabled: !skill.valid,
                  onChange: () => toggleSelected(skill.archivePath)
                }),
                h("span", { className: "skm-importItemBody" },
                  h("span", { className: "skm-importName" },
                    skill.name,
                    skill.valid ? null : h("span", { className: "skm-badge skm-badgeError" }, t("badgeInvalid")),
                    skill.enabled === false ? h("span", { className: "skm-badge skm-badgeOff" }, t("badgeDisabled")) : null
                  ),
                  h("span", { className: "skm-importDesc" }, skill.description || "—"),
                  h("span", { className: "skm-importMeta" },
                    `${skill.scopeTitle || sourceLabel(t, skill.source)} · ${skill.format} · ${skill.fileCount} files · ${formatBytes(skill.bytes)}`
                  )
                )
              )
            )),
            h("div", { className: "skm-hint" }, t("importSelected", { n: selected.size })),
            validSkills.length === 0 ? h("div", { className: "skm-notice" }, h(WarningIcon), t("importNoSkills")) : null
          ) : null
        ) : h("div", { className: "skm-field" },
          h("label", { className: "skm-label", htmlFor: "skm-import-path" }, t("importPathLabel")),
          h("div", { className: "skm-fileRow" },
            h("input", {
              id: "skm-import-path",
              className: "skm-input",
              style: { flex: "1 1 260px" },
              value: path,
              placeholder: t("pathPlaceholder"),
              onChange: (event) => setPath(event.target.value),
              onKeyDown: (event) => { if (event.key === "Enter") submit(); }
            }),
            h("button", {
              type: "button",
              className: "skm-btn",
              onClick: browsePath,
              disabled: busy || picking
            }, h(FolderIcon), t("browse"))
          ),
          h("span", { className: "skm-hint" }, t("importPathHint"))
        ),
        error === null ? null : h(ErrorBox, { t, error })
      );
    }

    function PreviewModal({ skill, t, language, onClose }) {
      const [content, setContent] = useState(null);
      const [error, setError] = useState(null);
      const [copied, setCopied] = useState(false);

      useEffect(() => {
        let alive = true;
        request("/skill", { query: { rootId: skill.rootId, relPath: skill.relPath } })
          .then((result) => { if (alive) setContent(result.content); })
          .catch((caught) => { if (alive) setError(caught); });
        return () => { alive = false; };
      }, [skill.rootId, skill.relPath]);

      async function copyPath() {
        try {
          await navigator.clipboard.writeText(skill.filePath);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch { /* clipboard may be unavailable */ }
      }

      return h(Modal, {
        title: t("previewTitle"),
        onClose,
        width: 720,
        footer: [
          h("button", { key: "copy", type: "button", className: "skm-btn", onClick: copyPath }, h(CopyIcon), copied ? t("pathCopied") : t("copyPath")),
          h("button", { key: "close", type: "button", className: "skm-btn skm-btnPrimary", onClick: onClose }, t("close"))
        ]
      },
        h("div", { className: "skm-previewMeta" },
          h("span", { className: "skm-previewKey" }, "name"),
          h("span", { className: "skm-previewValue" }, skill.name),
          h("span", { className: "skm-previewKey" }, "description"),
          h("span", { className: "skm-previewValue" }, skill.description || "—"),
          h("span", { className: "skm-previewKey" }, "source"),
          h("span", { className: "skm-previewValue" }, sourceLabel(t, skill.source)),
          h("span", { className: "skm-previewKey" }, "path"),
          h("span", { className: "skm-previewValue", style: { fontFamily: "ui-monospace,Consolas,monospace", fontSize: 11 } }, skill.filePath),
          h("span", { className: "skm-previewKey" }, "updated"),
          h("span", { className: "skm-previewValue" }, formatTime(t, skill.updatedAt, language))
        ),
        error === null ? null : h(ErrorBox, { t, error }),
        content === null && error === null
          ? h("div", { className: "skm-loading", style: { minHeight: 120 } }, h(Spinner, null), t("loading"))
          : null,
        content === null ? null : h("pre", { className: "skm-code" }, content.trim() === "" ? t("contentEmpty") : content)
      );
    }

    /* ------------------------------------------------------------------ */
    /* Edit modal                                                          */
    /* ------------------------------------------------------------------ */

    function EditModal({ skill, t, onClose, onSaved }) {
      const [content, setContent] = useState(null);
      const [loadError, setLoadError] = useState(null);
      const [error, setError] = useState(null);
      const [busy, setBusy] = useState(false);

      useEffect(() => {
        let alive = true;
        request("/skill", { query: { rootId: skill.rootId, relPath: skill.relPath } })
          .then((result) => { if (alive) setContent(result.content); })
          .catch((caught) => { if (alive) setLoadError(caught); });
        return () => { alive = false; };
      }, [skill.rootId, skill.relPath]);

      async function save() {
        if (busy || content === null) return;
        setBusy(true);
        setError(null);
        try {
          const result = await request("/save", {
            method: "POST",
            body: { rootId: skill.rootId, relPath: skill.relPath, content }
          });
          onSaved(result);
        } catch (caught) {
          setError(caught);
        } finally {
          setBusy(false);
        }
      }

      return h(Modal, {
        title: t("editTitle") + " · " + skill.name,
        onClose,
        width: 760,
        footer: [
          h("button", { key: "cancel", type: "button", className: "skm-btn", onClick: onClose, disabled: busy }, t("cancel")),
          h("button", { key: "save", type: "button", className: "skm-btn skm-btnPrimary", onClick: save, disabled: busy || content === null }, busy ? h(Spinner, { size: 13 }) : h(CheckIcon), busy ? t("saving") : t("save"))
        ]
      },
        h("span", { className: "skm-hint" }, t("editHint")),
        loadError === null ? null : h(ErrorBox, { t, error: loadError }),
        error === null ? null : h(ErrorBox, { t, error }),
        content === null && loadError === null
          ? h("div", { className: "skm-loading", style: { minHeight: 160 } }, h(Spinner, null), t("loading"))
          : null,
        content === null ? null : h("textarea", {
          className: "skm-textarea",
          style: { minHeight: 360 },
          value: content,
          spellCheck: false,
          onChange: (event) => setContent(event.target.value)
        })
      );
    }

    /* ------------------------------------------------------------------ */
    /* Uninstall confirmation                                              */
    /* ------------------------------------------------------------------ */

    function UninstallModal({ skill, t, onClose, onConfirm, busy, error }) {
      return h(Modal, {
        title: t("confirmUninstallTitle"),
        onClose,
        width: 460,
        danger: true,
        footer: [
          h("button", { key: "cancel", type: "button", className: "skm-btn", onClick: onClose, disabled: busy }, t("cancel")),
          h("button", { key: "go", type: "button", className: "skm-btn skm-btnDanger", onClick: onConfirm, disabled: busy }, busy ? h(Spinner, { size: 13 }) : h(TrashIcon), busy ? t("saving") : t("confirmUninstallAction"))
        ]
      },
        h("div", { className: "skm-notice" }, h(WarningIcon), t("confirmUninstallHint")),
        h("div", null, t("confirmUninstallBody", { name: skill.name })),
        h("div", { className: "skm-hint", style: { fontFamily: "ui-monospace,Consolas,monospace", wordBreak: "break-all" } }, skill.filePath),
        error === null ? null : h(ErrorBox, { t, error })
      );
    }

    /* ------------------------------------------------------------------ */
    /* Page                                                                */
    /* ------------------------------------------------------------------ */

    function SkillManagementPage(props) {
      const language = props.useLanguage();
      const t = useMemo(() => makeT(language), [language]);
      const pickDirectory = props.pickDirectory;
      const [state, setState] = useState(null);
      const [loading, setLoading] = useState(true);
      const [loadError, setLoadError] = useState(null);
      const [selected, setSelected] = useState("global");
      const [query, setQuery] = useState("");
      const [filter, setFilter] = useState("all");
      const [rootFilter, setRootFilter] = useState("all");
      const [busy, setBusy] = useState(null);
      const [toast, setToast] = useState(null);
      const [modal, setModal] = useState(null);
      const [uninstallBusy, setUninstallBusy] = useState(false);
      const [uninstallError, setUninstallError] = useState(null);

      const load = useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
          setState(await request("/state"));
        } catch (caught) {
          setLoadError(caught);
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => { load(); }, [load]);

      useEffect(() => {
        if (state === null) return;
        if (selected !== "global" && !state.workspaces.some((workspace) => workspace.id === selected)) {
          setSelected("global");
        }
      }, [state, selected]);

      useEffect(() => {
        if (toast === null) return;
        const timer = setTimeout(() => setToast(null), toast.kind === "error" ? 6500 : 3200);
        return () => clearTimeout(timer);
      }, [toast]);

      const showToast = useCallback((kind, text) => setToast({ kind, text }), []);

      const scope = useMemo(() => {
        if (state === null) return null;
        if (selected === "global") return state.global;
        return state.workspaces.find((workspace) => workspace.id === selected) ?? state.global;
      }, [state, selected]);

      const normalizedQuery = query.trim().toLocaleLowerCase();
      const visibleSkills = useMemo(() => {
        if (scope === null) return [];
        return scope.skills.filter((skill) => {
          if (filter === "enabled" && !(skill.enabled && skill.valid)) return false;
          if (filter === "disabled" && (skill.enabled && skill.valid)) return false;
          if (rootFilter !== "all" && skill.rootId !== rootFilter) return false;
          if (normalizedQuery === "") return true;
          return skill.name.toLocaleLowerCase().includes(normalizedQuery)
            || (skill.description ?? "").toLocaleLowerCase().includes(normalizedQuery)
            || skill.relPath.toLocaleLowerCase().includes(normalizedQuery);
        });
      }, [scope, filter, rootFilter, normalizedQuery]);

      const applyState = (nextState) => {
        if (nextState !== undefined && nextState !== null) setState(nextState);
      };

      async function toggleSkill(skill) {
        const key = `${skill.rootId}::${skill.relPath}`;
        setBusy(key);
        try {
          const result = await request("/toggle", {
            method: "POST",
            body: { rootId: skill.rootId, relPath: skill.relPath, enabled: !skill.enabled }
          });
          applyState(result.state);
          const updated = result.entry ?? skill;
          showToast("success", t(updated.enabled ? "enabledSuccess" : "disabledSuccess", { name: skill.name }));
        } catch (caught) {
          showToast("error", errorText(t, caught));
        } finally {
          setBusy(null);
        }
      }

      function openUninstall(skill) {
        setUninstallError(null);
        setUninstallBusy(false);
        setModal({ kind: "uninstall", skill });
      }

      async function confirmUninstall() {
        if (modal?.kind !== "uninstall") return;
        setUninstallBusy(true);
        setUninstallError(null);
        try {
          const result = await request("/uninstall", {
            method: "POST",
            body: { rootId: modal.skill.rootId, relPath: modal.skill.relPath }
          });
          applyState(result.state);
          showToast("success", t("uninstallSuccess", { name: modal.skill.name }));
          setModal(null);
        } catch (caught) {
          setUninstallError(caught);
        } finally {
          setUninstallBusy(false);
        }
      }

      function onInstalled(result) {
        applyState(result.state);
        if (result.scopeKind === "global") setSelected("global");
        else if (typeof result.scopeId === "string" && result.scopeId !== "") setSelected(result.scopeId);
        if (typeof result.targetRootId === "string" && result.targetRootId !== "") setRootFilter(result.targetRootId);
        showToast("success", t("installSuccess", { name: result.name }));
        setModal(null);
      }

      function onSaved(result) {
        applyState(result.state);
        showToast("success", t("saveSuccess", { name: result.entry?.name ?? modal?.skill?.name ?? "" }));
        setModal(null);
      }

      function onExported(result) {
        setModal(null);
        showToast("success", t("exportSuccess", { n: result.skillCount, path: result.archivePath }));
      }

      function onImported(result) {
        applyState(result.state);
        if (result.scopeKind === "global") setSelected("global");
        else if (typeof result.scopeId === "string" && result.scopeId !== "") setSelected(result.scopeId);
        if (typeof result.targetRootId === "string" && result.targetRootId !== "") setRootFilter(result.targetRootId);
        if (Array.isArray(result.imported)) {
          showToast("success", t("importSuccess", { n: result.imported.length }));
        } else {
          showToast("success", t("installSuccess", { name: result.name }));
        }
        setModal(null);
      }

      if (loading && state === null) {
        return h("div", { className: "skm-root" },
          h("div", { className: "skm-loading" }, h(Spinner, { size: 18 }), t("loading"))
        );
      }

      if (loadError !== null && state === null) {
        return h("div", { className: "skm-root" },
          h("div", { className: "skm-loading", style: { flexDirection: "column", gap: 12 } },
            h("div", { className: "skm-errorBox", style: { maxWidth: 520 } }, errorText(t, loadError)),
            h("button", { type: "button", className: "skm-btn skm-btnPrimary", onClick: load }, t("retry"))
          )
        );
      }

      const currentScope = scope ?? state.global;
      const counts = currentScope.stats ?? { total: 0, enabled: 0, disabled: 0, invalid: 0 };
      const workspaceMissing = currentScope.kind === "workspace" && currentScope.exists === false;

      return h("div", { className: "skm-root" },
        h("header", { className: "skm-top" },
          h("div", { className: "skm-brand" },
            h("div", { className: "skm-brandIcon" }, h(SkillGlyph, { size: 21 })),
            h("div", { style: { minWidth: 0 } },
              h("h1", { className: "skm-title" }, t("title")),
              h("p", { className: "skm-subtitle" }, t("subtitle"))
            )
          ),
          h("div", { className: "skm-actions" },
            h("button", { type: "button", className: "skm-btn", onClick: load, disabled: loading, title: t("refreshTitle") },
              loading ? h(Spinner, { size: 13 }) : h(RefreshIcon), t("refresh")
            ),
            h("button", {
              type: "button",
              className: "skm-btn",
              onClick: () => setModal({ kind: "import" }),
              title: t("importTitle")
            }, h(UploadIcon), t("import")),
            h("button", {
              type: "button",
              className: "skm-btn",
              onClick: () => setModal({ kind: "export", skill: null }),
              title: t("exportTitle")
            }, h(DownloadIcon), t("export")),
            h("button", {
              type: "button",
              className: "skm-btn skm-btnPrimary",
              onClick: () => setModal({ kind: "install" })
            }, h(PlusIcon), t("install"))
          )
        ),
        h("div", { className: "skm-body" },
          h("nav", { className: "skm-side", "aria-label": t("title") },
            h("button", {
              type: "button",
              className: "skm-sideItem" + (selected === "global" ? " skm-sideItemActive" : ""),
              onClick: () => { setSelected("global"); setRootFilter("all"); }
            },
              h(GlobeIcon, { size: 16 }),
              h("span", { className: "skm-sideItemBody" },
                h("span", { className: "skm-sideItemTitle" }, t("scopeGlobal")),
                h("span", { className: "skm-sideItemMeta" }, t("scopeGlobalHint"))
              ),
              h("span", { className: "skm-sideCount" }, String(state.global.stats.total))
            ),
            h("div", { className: "skm-sideSection" }, t("scopeWorkspaces")),
            state.workspaces.length === 0
              ? h("div", { className: "skm-hint", style: { padding: "4px 10px" } }, t("noWorkspace"))
              : state.workspaces.map((workspace) => (
                  h("button", {
                    key: workspace.id,
                    type: "button",
                    className: "skm-sideItem" + (selected === workspace.id ? " skm-sideItemActive" : ""),
                    onClick: () => { setSelected(workspace.id); setRootFilter("all"); },
                    title: workspace.path
                  },
                    h(FolderIcon, { size: 16 }),
                    h("span", { className: "skm-sideItemBody" },
                      h("span", { className: "skm-sideItemTitle" }, workspace.title),
                      h("span", { className: "skm-sideItemMeta" }, workspace.exists === false ? t("workspaceMissing") : workspace.path)
                    ),
                    h("span", { className: "skm-sideCount" }, String(workspace.stats.total))
                  )
                ))
          ),
          h("main", { className: "skm-main" },
            h("div", { className: "skm-mainHead" },
              h("div", { className: "skm-mainHeadText" },
                h("h2", { className: "skm-h2" },
                  currentScope.kind === "global" ? h(GlobeIcon, { size: 16 }) : h(FolderIcon, { size: 16 }),
                  currentScope.kind === "global" ? t("scopeGlobal") : currentScope.title,
                  h("span", { className: "skm-stats" }, t("statsLine", {
                    enabled: counts.enabled,
                    disabled: counts.disabled,
                    invalid: counts.invalid
                  }))
                ),
                h("div", { className: "skm-scopePath" },
                  currentScope.kind === "global"
                    ? t("scopeGlobalHint")
                    : `${currentScope.path ?? ""}${currentScope.projectRoot !== null && currentScope.projectRoot !== currentScope.path ? `  ·  ${currentScope.projectRoot}` : ""}`
                )
              )
            ),
            workspaceMissing ? h("div", { className: "skm-notice" }, h(WarningIcon), t("workspaceMissing")) : null,
            loadError !== null ? h("div", { className: "skm-notice" }, h(WarningIcon), errorText(t, loadError)) : null,
            h("div", { className: "skm-toolbar" },
              h("div", { className: "skm-search" },
                h("span", { className: "skm-searchIcon" }, h(SearchIcon)),
                h("input", {
                  type: "search",
                  value: query,
                  placeholder: t("searchPlaceholder"),
                  "aria-label": t("search"),
                  onChange: (event) => setQuery(event.target.value)
                })
              ),
              h("div", { className: "skm-seg", role: "group" },
                [["all", t("filterAll")], ["enabled", t("filterEnabled")], ["disabled", t("filterDisabled")]].map(([id, label]) => (
                  h("button", {
                    key: id,
                    type: "button",
                    className: "skm-segBtn" + (filter === id ? " skm-segBtnActive" : ""),
                    onClick: () => setFilter(id)
                  }, label)
                ))
              )
            ),
            h("div", { className: "skm-chips" },
              h("button", {
                type: "button",
                className: "skm-chip" + (rootFilter === "all" ? " skm-chipActive" : ""),
                onClick: () => setRootFilter("all")
              }, t("rootAll"), h("span", { className: "skm-chipCount" }, String(counts.total))),
              currentScope.roots.map((root) => (
                h("button", {
                  key: root.id,
                  type: "button",
                  className: "skm-chip" + (rootFilter === root.id ? " skm-chipActive" : ""),
                  onClick: () => setRootFilter(root.id),
                  title: root.path
                },
                  sourceLabel(t, root.source),
                  h("span", { className: "skm-chipCount" }, String(root.skillCount)),
                  root.exists === false ? h("span", { title: t("rootMissing") }, "·") : null,
                  root.readable === false ? h("span", { title: t("rootUnreadable") }, "!") : null
                )
              ))
            ),
            h("div", { className: "skm-scroll" },
              visibleSkills.length === 0
                ? (currentScope.skills.length === 0
                    ? h("div", { className: "skm-empty" },
                        h("div", { className: "skm-emptyIcon" }, h(SkillGlyph, { size: 24 })),
                        h("div", { className: "skm-emptyTitle" }, t("emptyTitle")),
                        h("div", { className: "skm-emptyHint" }, t("emptyHint")),
                        h("div", { className: "skm-emptyHint", style: { fontSize: 11 } }, t("emptyBuiltinNote")),
                        h("button", {
                          type: "button",
                          className: "skm-btn skm-btnPrimary",
                          onClick: () => setModal({ kind: "install" })
                        }, h(PlusIcon), t("install"))
                      )
                    : h("div", { className: "skm-empty" },
                        h("div", { className: "skm-emptyTitle" }, t("emptyFilterTitle")),
                        h("div", { className: "skm-emptyHint" }, t("emptyFilterHint"))
                      ))
                : visibleSkills.map((skill) => h(SkillCard, {
                    key: `${skill.rootId}::${skill.relPath}`,
                    skill,
                    t,
                    language,
                    busy,
                    onPreview: (item) => setModal({ kind: "preview", skill: item }),
                    onEdit: (item) => setModal({ kind: "edit", skill: item }),
                    onToggle: toggleSkill,
                    onUninstall: openUninstall,
                    onExport: (item) => setModal({ kind: "export", skill: item })
                  }))
            )
          )
        ),
        modal?.kind === "install" ? h(InstallModal, {
          scope: currentScope,
          state,
          t,
          language,
          onClose: () => setModal(null),
          onInstalled,
          pickDirectory
        }) : null,
        modal?.kind === "export" ? h(ExportModal, {
          scope: currentScope,
          state,
          skill: modal.skill ?? null,
          t,
          onClose: () => setModal(null),
          onExported,
          pickDirectory
        }) : null,
        modal?.kind === "import" ? h(ImportModal, {
          scope: currentScope,
          state,
          t,
          language,
          onClose: () => setModal(null),
          onImported,
          pickDirectory
        }) : null,
        modal?.kind === "preview" ? h(PreviewModal, {
          skill: modal.skill,
          t,
          language,
          onClose: () => setModal(null)
        }) : null,
        modal?.kind === "edit" ? h(EditModal, {
          skill: modal.skill,
          t,
          onClose: () => setModal(null),
          onSaved
        }) : null,
        modal?.kind === "uninstall" ? h(UninstallModal, {
          skill: modal.skill,
          t,
          onClose: () => { if (!uninstallBusy) setModal(null); },
          onConfirm: confirmUninstall,
          busy: uninstallBusy,
          error: uninstallError
        }) : null,
        h(Toast, { toast })
      );
    }

    /* ------------------------------------------------------------------ */
    /* Plugin body                                                         */
    /* ------------------------------------------------------------------ */

    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "skill-management: dictionaries");
      const t = ctx.locale.bind(NS);
      ensureStyles();

      const subscribeLocale = (listener) => {
        const off = ctx.locale.subscribe(listener);
        return () => {
          try { if (typeof off === "function") off(); } catch { /* ignore */ }
        };
      };
      const getLocale = () => {
        const active = ctx.locale.getSnapshot?.().active;
        return typeof active === "string" && active.toLowerCase().startsWith("zh") ? "zh" : "en";
      };
      const useLanguage = () => useSyncExternalStore(subscribeLocale, getLocale, () => "en");
      const pickDirectory = async () => {
        const native = globalThis.__DSH_DIRECTORY_PICKER__;
        if (native !== undefined && native !== null && typeof native.pick === "function") {
          return await native.pick();
        }
        const workspace = ctx.get?.("uiWorkspace") ?? ctx.uiWorkspace;
        if (workspace !== undefined && workspace !== null && typeof workspace.pickDirectory === "function") {
          return await workspace.pickDirectory();
        }
        throw new Error("directory picker unavailable");
      };

      ctx.slots.inject("main", () => ctx.slots.register({
        name: "main",
        key: PANEL_ID,
        locale: NS,
        inject: () => ({ useLanguage, pickDirectory })
      }, SkillManagementPage));

      ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
        name: "sidebar.panellist",
        id: PANEL_ID,
        // The built-in Plugins row uses order 0; keep this entry directly below it.
        order: 1,
        label: () => t("panel"),
        locale: NS
      }, function SkillManagementPanelIcon({ size }) {
        return h(SkillGlyph, { size: size ?? 18 });
      }));
    }

    exports.apply = apply;
    exports.inject = ["slots", "locale"];
    exports.NS = NS;
    exports.PANEL_ID = PANEL_ID;
    exports.SkillManagementPage = SkillManagementPage;
    exports.initialInstallScope = initialInstallScope;
    exports.ExportModal = ExportModal;
    exports.ImportModal = ImportModal;
    return module.exports;
  }
});
