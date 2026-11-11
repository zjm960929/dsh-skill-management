/**
 * dsh-skill-management — host-side skill store.
 *
 * Pure Node.js module (no DSH imports) that scans, validates and mutates the
 * filesystem skill roots DSH's own skill provider reads:
 *
 *   <project>/.dsh/skills        project-dsh   rank 100
 *   <project>/.agents/skills     project-agents rank 200
 *   <dshHome>/skills             user-dsh      rank 400
 *   <agentsHome>/skills          user-agents   rank 500
 *
 * A skill is either a directory bundle (`<name>/SKILL.md`) or a flat
 * Markdown file (`<name>.md`). Disabling a skill renames the instruction
 * file to `SKILL.md.disabled` / `<name>.md.disabled`, so DSH stops
 * discovering it without destroying any content. No file outside a known
 * root is ever read, renamed or deleted by a mutation.
 */
import { copyFile, lstat, mkdir, readFile, readdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export const SKILL_NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SKILL_FILE = "SKILL.md";
export const DISABLED_FILE = "SKILL.md.disabled";

const MAX_SKILL_BYTES = 2 * 1024 * 1024;
const MAX_COPY_BYTES = 24 * 1024 * 1024;
const MAX_COPY_FILES = 400;
const MAX_COPY_DEPTH = 12;
const IGNORED_COPY_NAMES = new Set([".git", "node_modules", ".DS_Store", "Thumbs.db"]);

/** Error carrying a stable machine code and optional validation details. */
export class SkillError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = "SkillError";
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function badRequest(code, message, details) {
  return new SkillError(code, message, details);
}

/** Expand a leading `~` using the supplied home directory. */
export function expandHomePath(path, home) {
  if (typeof path !== "string") return "";
  const value = path.trim();
  if (value === "~") return home;
  if (value.startsWith("~/") || value.startsWith("~\\")) return join(home, value.slice(2));
  return value;
}

/** Return whether a string follows DSH's public kebab-case skill-name grammar. */
export function isSkillName(name) {
  return typeof name === "string" && SKILL_NAME_RE.test(name);
}

/** Trim a raw YAML scalar and drop a trailing ` # comment` outside quotes. */
function stripYamlComment(value) {
  let quote = null;
  for (let i = 0; i < value.length; i += 1) {
    const ch = value[i];
    if (quote !== null) {
      if (ch === quote) {
        if (quote === "'" && value[i + 1] === "'") {
          i += 1;
          continue;
        }
        if (quote === '"' && value[i - 1] === "\\") continue;
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "#" && (i === 0 || /\s/.test(value[i - 1]))) return value.slice(0, i).trimEnd();
  }
  return value.trimEnd();
}

/** Parse the small YAML subset used by SKILL.md frontmatter. */
function parseYamlSubset(source) {
  const data = Object.create(null);
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
    if (/^\s/.test(line)) continue; // nested map / sequence body, not a top-level key
    const match = /^([^:#][^:]*):(.*)$/.exec(line);
    if (match === null) continue;
    const key = match[1].trim();
    const rest = match[2].trim();
    if (rest === "" ) {
      // A block scalar with no style marker is not a value we consume; leave
      // the following indented lines to the next top-level key.
      data[key] = "";
      continue;
    }
    if (/^[|>][+-]?$/.test(rest)) {
      const style = rest[0];
      const collected = [];
      let indent = null;
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        const inner = lines[j];
        if (inner.trim() === "") {
          collected.push("");
          continue;
        }
        const leading = /^ */.exec(inner)[0].length;
        if (leading === 0) break;
        if (indent === null) indent = leading;
        collected.push(inner.slice(Math.min(indent, leading)));
      }
      while (collected.length > 0 && collected[collected.length - 1] === "") collected.pop();
      data[key] = style === "|"
        ? collected.join("\n")
        : collected.reduce((acc, part) => {
            if (part === "") return `${acc}\n`;
            if (acc !== "" && !acc.endsWith("\n")) return `${acc} ${part}`;
            return acc + part;
          }, "");
      i = j - 1;
      continue;
    }
    data[key] = parseYamlScalar(rest);
  }
  return data;
}

function parseYamlScalar(raw) {
  const value = stripYamlComment(raw.trim());
  if (value === "") return "";
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\\\", "\\");
    }
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  const lower = value.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  if (lower === "null" || value === "~") return null;
  return value;
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1") return true;
  if (value === 0 || value === "0") return false;
  if (typeof value === "string") {
    switch (value.toLowerCase()) {
      case "true":
      case "yes":
      case "on":
        return true;
      case "false":
      case "no":
      case "off":
        return false;
      default:
        return undefined;
    }
  }
  return undefined;
}

/**
 * Parse a SKILL.md document, mirroring DSH's filesystem provider validation.
 * Missing or malformed frontmatter yields `valid: false` plus structured
 * errors; it never throws for ordinary input.
 */
export function parseSkillContent(raw) {
  const errors = [];
  const text = String(raw ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = text.split("\n");
  let data = Object.create(null);
  let body = "";
  let hasFrontmatter = false;
  if (lines[0]?.trim() === "---") {
    let closing = -1;
    for (let i = 1; i < lines.length; i += 1) {
      if (lines[i].trim() === "---") {
        closing = i;
        break;
      }
    }
    if (closing !== -1) {
      hasFrontmatter = true;
      data = parseYamlSubset(lines.slice(1, closing).join("\n"));
      body = lines.slice(closing + 1).join("\n");
    }
  }
  if (!hasFrontmatter) {
    errors.push({
      code: "missing-frontmatter",
      message: "SKILL.md must begin with a YAML frontmatter block delimited by ---."
    });
  }
  for (const legacy of ["disableModelInvocation", "modelInvocable", "userInvocable"]) {
    if (Object.hasOwn(data, legacy)) {
      errors.push({
        code: "legacy-frontmatter",
        message: `frontmatter field "${legacy}" is unsupported; use "disable-model-invocation" or "user-invocable".`
      });
    }
  }
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const description = typeof data.description === "string" ? data.description.trim() : "";
  const whenToUse = typeof data.whenToUse === "string" ? data.whenToUse.trim() : "";
  if (name === "") {
    errors.push({ code: "missing-name", message: "frontmatter requires a non-empty name." });
  } else if (!isSkillName(name)) {
    errors.push({
      code: "invalid-name",
      message: `skill name "${name}" must use lowercase letters, digits and single hyphens.`
    });
  }
  if (description === "") {
    errors.push({ code: "missing-description", message: "frontmatter requires a non-empty description." });
  }
  const invocation = { modelInvocable: true, userInvocable: true };
  if (Object.hasOwn(data, "disable-model-invocation")) {
    const flag = toBoolean(data["disable-model-invocation"]);
    if (flag === undefined) {
      errors.push({
        code: "invalid-invocation",
        message: 'frontmatter field "disable-model-invocation" must be a boolean.'
      });
    } else {
      invocation.modelInvocable = !flag;
    }
  }
  if (Object.hasOwn(data, "user-invocable")) {
    const flag = toBoolean(data["user-invocable"]);
    if (flag === undefined) {
      errors.push({
        code: "invalid-invocation",
        message: 'frontmatter field "user-invocable" must be a boolean.'
      });
    } else {
      invocation.userInvocable = flag;
    }
  }
  return {
    hasFrontmatter,
    valid: errors.length === 0,
    errors,
    name,
    description,
    whenToUse,
    invocation,
    body: body.trim(),
    data
  };
}

/** Build a new SKILL.md document from structured fields. */
export function buildSkillContent({
  name,
  description,
  body = "",
  whenToUse = "",
  disableModelInvocation = false,
  userInvocable = true
} = {}) {
  if (!isSkillName(name)) {
    throw badRequest("invalid-name", "skill name must use lowercase letters, digits and single hyphens.");
  }
  if (typeof description !== "string" || description.trim() === "") {
    throw badRequest("missing-description", "description is required.");
  }
  const lines = ["---", `name: ${name}`, `description: ${JSON.stringify(description.trim())}`];
  if (typeof whenToUse === "string" && whenToUse.trim() !== "") {
    lines.push(`whenToUse: ${JSON.stringify(whenToUse.trim())}`);
  }
  if (disableModelInvocation === true) lines.push("disable-model-invocation: true");
  if (userInvocable === false) lines.push("user-invocable: false");
  lines.push("---", "", String(body ?? "").trim(), "");
  return lines.join("\n");
}

function errorCode(error, code) {
  return error && typeof error === "object" && error.code === code;
}

async function statOrNull(path) {
  try {
    return await stat(path);
  } catch (error) {
    if (errorCode(error, "ENOENT") || errorCode(error, "ENOTDIR")) return null;
    throw error;
  }
}

async function lstatOrNull(path) {
  try {
    return await lstat(path);
  } catch (error) {
    if (errorCode(error, "ENOENT") || errorCode(error, "ENOTDIR")) return null;
    throw error;
  }
}

async function readTextLimited(path) {
  const info = await stat(path);
  if (!info.isFile()) throw badRequest("not-a-file", "the skill instruction path is not a regular file.");
  if (info.size > MAX_SKILL_BYTES) {
    throw new SkillError("too-large", `skill file is ${info.size} bytes; the limit is ${MAX_SKILL_BYTES} bytes.`);
  }
  return await readFile(path, "utf8");
}

async function findProjectRoot(start) {
  let current = resolve(start);
  for (let depth = 0; depth < 128; depth += 1) {
    if (await statOrNull(join(current, ".git")) !== null) return current;
    const parent = dirname(current);
    if (parent === current) return resolve(start);
    current = parent;
  }
  return resolve(start);
}

function skillFallbackName(relPath, format) {
  if (format === "bundle") return relPath;
  return relPath.replace(/\.md\.disabled$/, "").replace(/\.md$/, "");
}

async function readEntry({ root, relPath, filePath, enabled, format, dirPath }) {
  let raw;
  let info;
  try {
    info = await stat(filePath);
    raw = info.size > MAX_SKILL_BYTES ? "" : await readFile(filePath, "utf8");
  } catch (error) {
    return {
      rootId: root.id,
      relPath,
      name: skillFallbackName(relPath, format),
      description: "",
      whenToUse: "",
      invocation: { modelInvocable: true, userInvocable: true },
      enabled,
      valid: false,
      errors: [{ code: "read-failed", message: String(error?.message ?? error) }],
      format,
      filePath,
      dirPath: dirPath ?? null,
      size: 0,
      updatedAt: null,
      source: root.source,
      rank: root.rank
    };
  }
  const parsed = info.size > MAX_SKILL_BYTES
    ? {
        valid: false,
        errors: [{ code: "too-large", message: `skill file exceeds ${MAX_SKILL_BYTES} bytes.` }],
        name: "",
        description: "",
        whenToUse: "",
        invocation: { modelInvocable: true, userInvocable: true }
      }
    : parseSkillContent(raw);
  const fallback = skillFallbackName(relPath, format);
  return {
    rootId: root.id,
    relPath,
    name: parsed.name || fallback,
    description: parsed.description || "",
    whenToUse: parsed.whenToUse || "",
    invocation: parsed.invocation,
    enabled,
    valid: parsed.valid,
    errors: parsed.errors,
    format,
    filePath,
    dirPath: dirPath ?? null,
    size: info.size,
    updatedAt: info.mtimeMs,
    source: root.source,
    rank: root.rank
  };
}

async function scanRoot(root) {
  let info;
  try {
    info = await stat(root.path);
  } catch (error) {
    if (errorCode(error, "ENOENT") || errorCode(error, "ENOTDIR")) {
      return { exists: false, readable: true, error: null, skills: [] };
    }
    return { exists: true, readable: false, error: String(error?.message ?? error), skills: [] };
  }
  if (!info.isDirectory()) {
    return { exists: true, readable: false, error: "skill root is not a directory", skills: [] };
  }
  let entries;
  try {
    entries = await readdir(root.path, { withFileTypes: true });
  } catch (error) {
    return { exists: true, readable: false, error: String(error?.message ?? error), skills: [] };
  }
  const skills = [];
  for (const dirent of entries) {
    if (root.source === "user-dsh" && dirent.name === ".system") continue;
    const full = join(root.path, dirent.name);
    let entryInfo;
    try {
      entryInfo = await stat(full);
    } catch {
      continue;
    }
    if (entryInfo.isDirectory()) {
      const active = await statOrNull(join(full, SKILL_FILE));
      const disabled = await statOrNull(join(full, DISABLED_FILE));
      let filePath = null;
      let enabled = false;
      if (active?.isFile() === true) {
        filePath = join(full, SKILL_FILE);
        enabled = true;
      } else if (disabled?.isFile() === true) {
        filePath = join(full, DISABLED_FILE);
        enabled = false;
      }
      if (filePath === null) continue;
      skills.push(await readEntry({
        root,
        relPath: dirent.name,
        filePath,
        enabled,
        format: "bundle",
        dirPath: full
      }));
    } else if (entryInfo.isFile()) {
      let enabled;
      if (dirent.name.endsWith(".md.disabled")) enabled = false;
      else if (dirent.name.endsWith(".md")) enabled = true;
      else continue;
      skills.push(await readEntry({
        root,
        relPath: dirent.name,
        filePath: full,
        enabled,
        format: "flat"
      }));
      const last = skills[skills.length - 1];
      // A root may contain ordinary Markdown files (README.md and so on).
      // DSH ignores those as skills; keep them out of the manager too, while
      // still surfacing a file that is clearly trying to be a skill but has
      // malformed frontmatter fields.
      if (!last.valid && last.errors.some((error) => error.code === "missing-frontmatter")) {
        skills.pop();
      }
    }
  }
  skills.sort((left, right) => left.name.localeCompare(right.name) || left.relPath.localeCompare(right.relPath));
  return { exists: true, readable: true, error: null, skills };
}

function makeRoot({ id, source, rank, path, scopeKind, scopeId }) {
  return { id, source, rank, path, scopeKind, scopeId };
}

function statsFor(skills) {
  let enabled = 0;
  let disabled = 0;
  let invalid = 0;
  let effective = 0;
  for (const skill of skills) {
    if (skill.valid && skill.enabled) enabled += 1;
    else if (!skill.valid) invalid += 1;
    else disabled += 1;
    if (skill.effective) effective += 1;
  }
  return { total: skills.length, enabled, disabled, invalid, effective };
}

/** Build a store bound to one DSH home pair and one workspace provider. */
export function createSkillStore(options) {
  const listWorkspaces = options.listWorkspaces;
  const home = options.home ?? homedir();
  const dshHome = resolve(expandHomePath(options.dshHome, home));
  const agentsHome = resolve(expandHomePath(options.agentsHome, home));
  let queue = Promise.resolve();

  function serialize(operation) {
    const run = queue.then(operation, operation);
    queue = run.then(() => undefined, () => undefined);
    return run;
  }

  async function buildModel() {
    const workspaces = await listWorkspaces();
    const globalScope = {
      kind: "global",
      id: "global",
      title: "Global",
      path: null,
      projectRoot: null,
      roots: [
        makeRoot({ id: "global:dsh", source: "user-dsh", rank: 400, path: join(dshHome, "skills"), scopeKind: "global", scopeId: "global" }),
        makeRoot({ id: "global:agents", source: "user-agents", rank: 500, path: join(agentsHome, "skills"), scopeKind: "global", scopeId: "global" })
      ]
    };
    const workspaceScopes = [];
    for (const workspace of workspaces) {
      const id = String(workspace.id);
      const path = resolve(workspace.path);
      const projectRoot = await findProjectRoot(path);
      const workspaceInfo = await statOrNull(path);
      workspaceScopes.push({
        kind: "workspace",
        id,
        title: workspace.title || basename(path) || id,
        path,
        projectRoot,
        exists: workspaceInfo?.isDirectory() === true,
        roots: [
          makeRoot({ id: `ws:${id}:dsh`, source: "project-dsh", rank: 100, path: join(projectRoot, ".dsh", "skills"), scopeKind: "workspace", scopeId: id }),
          makeRoot({ id: `ws:${id}:agents`, source: "project-agents", rank: 200, path: join(projectRoot, ".agents", "skills"), scopeKind: "workspace", scopeId: id })
        ]
      });
    }
    const rootById = new Map();
    for (const scope of [globalScope, ...workspaceScopes]) {
      for (const root of scope.roots) rootById.set(root.id, root);
    }
    return { global: globalScope, workspaces: workspaceScopes, rootById };
  }

  async function decorateScope(scope) {
    const roots = [];
    const skills = [];
    for (const root of scope.roots) {
      const scanned = await scanRoot(root);
      roots.push({
        id: root.id,
        source: root.source,
        rank: root.rank,
        path: root.path,
        exists: scanned.exists,
        readable: scanned.readable,
        error: scanned.error,
        skillCount: scanned.skills.length
      });
      for (const skill of scanned.skills) skills.push(skill);
    }
    skills.sort((left, right) => left.name.localeCompare(right.name) || left.relPath.localeCompare(right.relPath));
    const winners = new Map();
    for (const skill of skills) {
      if (!skill.enabled || !skill.valid) continue;
      const winner = winners.get(skill.name);
      if (winner === undefined || skill.rank < winner.rank) winners.set(skill.name, skill);
    }
    for (const skill of skills) {
      const winner = winners.get(skill.name);
      skill.effective = skill.enabled && skill.valid && winner === skill;
      if (skill.enabled && skill.valid && winner !== skill && winner !== undefined) {
        skill.shadowedBy = { rootId: winner.rootId, relPath: winner.relPath, source: winner.source };
      }
    }
    const byRoot = new Map();
    for (const skill of skills) {
      if (!byRoot.has(skill.rootId)) byRoot.set(skill.rootId, []);
      byRoot.get(skill.rootId).push(skill);
    }
    for (const root of roots) root.skills = byRoot.get(root.id) ?? [];
    return {
      kind: scope.kind,
      id: scope.id,
      title: scope.title,
      path: scope.path,
      projectRoot: scope.projectRoot,
      exists: scope.exists !== false,
      roots,
      skills,
      stats: statsFor(skills)
    };
  }

  async function getState() {
    const model = await buildModel();
    const global = await decorateScope(model.global);
    const workspaces = await Promise.all(model.workspaces.map((scope) => decorateScope(scope)));
    const globalNames = new Set(global.skills.filter((skill) => skill.enabled && skill.valid).map((skill) => skill.name));
    for (const workspace of workspaces) {
      for (const skill of workspace.skills) {
        if (skill.enabled && skill.valid && globalNames.has(skill.name)) skill.overridesGlobal = true;
      }
    }
    const overridden = new Map();
    for (const workspace of workspaces) {
      for (const skill of workspace.skills) {
        if (!skill.enabled || !skill.valid) continue;
        if (!globalNames.has(skill.name)) continue;
        if (!overridden.has(skill.name)) overridden.set(skill.name, []);
        overridden.get(skill.name).push({ id: workspace.id, title: workspace.title });
      }
    }
    for (const skill of global.skills) {
      const list = overridden.get(skill.name);
      if (list !== undefined) skill.overriddenIn = list;
    }
    return {
      generatedAt: Date.now(),
      global,
      workspaces,
      totals: {
        global: global.stats,
        workspaces: workspaces.reduce((acc, scope) => {
          acc.total += scope.stats.total;
          acc.enabled += scope.stats.enabled;
          acc.disabled += scope.stats.disabled;
          acc.invalid += scope.stats.invalid;
          return acc;
        }, { total: 0, enabled: 0, disabled: 0, invalid: 0 })
      }
    };
  }

  function assertRelPath(relPath) {
    if (typeof relPath !== "string" || relPath.length === 0) {
      throw badRequest("invalid-path", "relPath is required.");
    }
    if (relPath === "." || relPath === ".." || relPath !== basename(relPath) || relPath.includes("/") || relPath.includes("\\") || relPath.includes("\0")) {
      throw badRequest("invalid-path", "relPath must name one entry directly inside its skill root.");
    }
    return relPath;
  }

  async function resolveTarget(model, rootId, relPath) {
    const root = model.rootById.get(rootId);
    if (root === undefined) throw badRequest("unknown-root", "the selected skill root is not available.");
    assertRelPath(relPath);
    const scanned = await scanRoot(root);
    const entry = scanned.skills.find((skill) => skill.relPath === relPath);
    if (entry === undefined) throw new SkillError("not-found", "the skill no longer exists in this root.");
    return { root, entry };
  }

  async function getSkill({ rootId, relPath }) {
    const model = await buildModel();
    const { entry } = await resolveTarget(model, rootId, relPath);
    const content = await readTextLimited(entry.filePath);
    return { entry, content };
  }

  async function validate({ content }) {
    const parsed = parseSkillContent(content);
    return { valid: parsed.valid, errors: parsed.errors, name: parsed.name, description: parsed.description };
  }

  async function prepareSource(source, model) {
    if (source === null || typeof source !== "object") {
      throw badRequest("invalid-source", "an install source is required.");
    }
    switch (source.kind) {
      case "path": {
        if (typeof source.path !== "string" || source.path.trim() === "") {
          throw badRequest("invalid-path", "an absolute skill path is required.");
        }
        const abs = resolve(expandHomePath(source.path, home));
        const info = await statOrNull(abs);
        if (info === null) throw new SkillError("not-found", "the selected path does not exist.");
        if (info.isDirectory()) {
          const file = join(abs, SKILL_FILE);
          const fileInfo = await statOrNull(file);
          if (fileInfo?.isFile() !== true) {
            throw badRequest("missing-skill-file", "the selected folder has no SKILL.md.");
          }
          const raw = await readTextLimited(file);
          const parsed = parseSkillContent(raw);
          if (!parsed.valid) throw new SkillError("invalid-skill", "SKILL.md is invalid.", parsed.errors);
          return { name: parsed.name, description: parsed.description, format: "bundle", dirPath: abs, raw };
        }
        if (!info.isFile() || !abs.toLowerCase().endsWith(".md")) {
          throw badRequest("invalid-source", "the selected path must be a skill folder or a .md file.");
        }
        const raw = await readTextLimited(abs);
        const parsed = parseSkillContent(raw);
        if (!parsed.valid) throw new SkillError("invalid-skill", "SKILL.md is invalid.", parsed.errors);
        return { name: parsed.name, description: parsed.description, format: "flat", raw };
      }
      case "copy": {
        const fromRootId = typeof source.fromRootId === "string" ? source.fromRootId : "";
        const fromRelPath = typeof source.fromRelPath === "string" ? source.fromRelPath : "";
        const { entry } = await resolveTarget(model, fromRootId, fromRelPath);
        if (!entry.valid) throw new SkillError("invalid-skill", "the source skill is invalid and cannot be copied.", entry.errors);
        return {
          name: entry.name,
          description: entry.description,
          format: entry.format,
          dirPath: entry.dirPath ?? undefined,
          filePath: entry.format === "flat" ? entry.filePath : undefined,
          raw: await readTextLimited(entry.filePath)
        };
      }
      case "text": {
        if (typeof source.content !== "string") throw badRequest("invalid-source", "SKILL.md content is required.");
        const parsed = parseSkillContent(source.content);
        if (!parsed.valid) throw new SkillError("invalid-skill", "SKILL.md is invalid.", parsed.errors);
        return { name: parsed.name, description: parsed.description, format: "bundle", raw: source.content };
      }
      case "create": {
        if (!isSkillName(source.name)) {
          throw badRequest("invalid-name", "skill name must use lowercase letters, digits and single hyphens.");
        }
        const content = buildSkillContent({
          name: source.name,
          description: source.description,
          body: source.body,
          whenToUse: source.whenToUse,
          disableModelInvocation: source.disableModelInvocation === true,
          userInvocable: source.userInvocable !== false
        });
        const parsed = parseSkillContent(content);
        if (!parsed.valid) throw new SkillError("invalid-skill", "the new skill is invalid.", parsed.errors);
        return { name: parsed.name, description: parsed.description, format: "bundle", raw: content };
      }
      default:
        throw badRequest("invalid-source", "unknown install source kind.");
    }
  }

  async function copyTree(sourcePath, targetPath) {
    const pending = [{ source: sourcePath, target: targetPath, depth: 0 }];
    let files = 0;
    let bytes = 0;
    while (pending.length > 0) {
      const current = pending.pop();
      await mkdir(current.target, { recursive: true });
      const entries = await readdir(current.source, { withFileTypes: true });
      for (const dirent of entries) {
        if (IGNORED_COPY_NAMES.has(dirent.name)) continue;
        const sourceEntry = join(current.source, dirent.name);
        const targetEntry = join(current.target, dirent.name);
        const info = await lstat(sourceEntry);
        if (info.isSymbolicLink()) continue;
        if (info.isDirectory()) {
          if (current.depth >= MAX_COPY_DEPTH) {
            throw badRequest("too-deep", "the skill folder is nested too deeply to copy.");
          }
          pending.push({ source: sourceEntry, target: targetEntry, depth: current.depth + 1 });
          continue;
        }
        if (!info.isFile()) continue;
        files += 1;
        bytes += info.size;
        if (files > MAX_COPY_FILES) throw badRequest("too-many-files", `the skill has more than ${MAX_COPY_FILES} files.`);
        if (bytes > MAX_COPY_BYTES) throw badRequest("too-large", `the skill is larger than ${MAX_COPY_BYTES} bytes.`);
        await copyFile(sourceEntry, targetEntry);
      }
    }
  }

  async function installSkill({ targetRootId, source }) {
    return serialize(async () => {
      const model = await buildModel();
      const root = model.rootById.get(targetRootId);
      if (root === undefined) throw badRequest("unknown-root", "the selected skill root is not available.");
      if (root.scopeKind === "workspace") {
        const scope = model.workspaces.find((workspace) => workspace.id === root.scopeId);
        if (scope?.exists === false) {
          throw new SkillError("workspace-missing", "the workspace directory does not exist; install was not attempted.");
        }
      }
      const prepared = await prepareSource(source, model);
      await mkdir(root.path, { recursive: true });
      const scanned = await scanRoot(root);
      const existing = scanned.skills.find((skill) => skill.name === prepared.name);
      if (existing !== undefined) {
        throw new SkillError(
          "name-conflict",
          `a skill named "${prepared.name}" already exists in this root${existing.enabled ? "" : " (disabled)"}.`,
          { enabled: existing.enabled, relPath: existing.relPath }
        );
      }
      if (prepared.format === "bundle") {
        const targetDir = join(root.path, prepared.name);
        const existingTarget = await statOrNull(targetDir);
        if (existingTarget !== null) {
          throw new SkillError("target-exists", `the folder "${prepared.name}" already exists in this root.`);
        }
        try {
          if (prepared.dirPath !== undefined) {
            await copyTree(prepared.dirPath, targetDir);
            const active = join(targetDir, SKILL_FILE);
            const disabled = join(targetDir, DISABLED_FILE);
            if (await statOrNull(active) === null && await statOrNull(disabled) !== null) {
              await rename(disabled, active);
            }
            const activeInfo = await statOrNull(active);
            if (activeInfo?.isFile() !== true) {
              throw new SkillError("invalid-skill", "the copied skill has no regular SKILL.md; symlinked instruction files are not copied.");
            }
            const copied = await readTextLimited(active);
            const parsed = parseSkillContent(copied);
            if (!parsed.valid || parsed.name !== prepared.name) {
              throw new SkillError("invalid-skill", "the copied SKILL.md is invalid or its name changed.", parsed.errors);
            }
          } else {
            await mkdir(targetDir, { recursive: true });
            await writeFile(join(targetDir, SKILL_FILE), prepared.raw, "utf8");
          }
        } catch (error) {
          await rm(targetDir, { recursive: true, force: true }).catch(() => {});
          throw error;
        }
      } else {
        const targetFile = join(root.path, `${prepared.name}.md`);
        const existingTarget = await statOrNull(targetFile);
        if (existingTarget !== null) {
          throw new SkillError("target-exists", `the file "${prepared.name}.md" already exists in this root.`);
        }
        const raw = prepared.filePath !== undefined
          ? await readTextLimited(prepared.filePath)
          : prepared.raw;
        const parsed = parseSkillContent(raw);
        if (!parsed.valid) throw new SkillError("invalid-skill", "SKILL.md is invalid.", parsed.errors);
        await writeFile(targetFile, raw, "utf8");
      }
      const state = await getState();
      return {
        state,
        name: prepared.name,
        format: prepared.format,
        targetRootId: root.id,
        scopeKind: root.scopeKind,
        scopeId: root.scopeId
      };
    });
  }

  async function uninstallSkill({ rootId, relPath }) {
    return serialize(async () => {
      const model = await buildModel();
      const { entry } = await resolveTarget(model, rootId, relPath);
      if (entry.format === "bundle") {
        const info = await lstat(entry.dirPath);
        if (info.isSymbolicLink()) await unlink(entry.dirPath);
        else await rm(entry.dirPath, { recursive: true, force: true });
      } else {
        await unlink(entry.filePath);
      }
      return { state: await getState(), name: entry.name };
    });
  }

  async function setEnabled({ rootId, relPath, enabled }) {
    return serialize(async () => {
      const model = await buildModel();
      const { entry } = await resolveTarget(model, rootId, relPath);
      const want = enabled === true;
      if (entry.enabled === want) return { state: await getState(), entry };
      const currentFile = entry.filePath;
      let nextFile;
      if (want) {
        if (!currentFile.endsWith(".disabled")) throw badRequest("invalid-state", "the skill is not in a disabled state.");
        nextFile = currentFile.slice(0, -".disabled".length);
      } else {
        nextFile = `${currentFile}.disabled`;
      }
      if (await statOrNull(nextFile) !== null) {
        throw new SkillError("target-exists", "the target instruction file already exists; remove the duplicate first.");
      }
      await rename(currentFile, nextFile);
      const state = await getState();
      const updated = state.global.skills.concat(...state.workspaces.map((scope) => scope.skills))
        .find((skill) => skill.rootId === rootId && skill.relPath === relPath);
      return { state, entry: updated ?? null };
    });
  }

  async function saveSkill({ rootId, relPath, content }) {
    return serialize(async () => {
      if (typeof content !== "string") throw badRequest("invalid-content", "SKILL.md content is required.");
      if (Buffer.byteLength(content, "utf8") > MAX_SKILL_BYTES) {
        throw new SkillError("too-large", `SKILL.md is larger than ${MAX_SKILL_BYTES} bytes.`);
      }
      const parsed = parseSkillContent(content);
      if (!parsed.valid) throw new SkillError("invalid-skill", "SKILL.md is invalid.", parsed.errors);
      const model = await buildModel();
      const { root, entry } = await resolveTarget(model, rootId, relPath);
      const fileInfo = await lstat(entry.filePath);
      if (fileInfo.isSymbolicLink()) {
        throw badRequest("symlink-not-supported", "refusing to edit a symlinked skill instruction file.");
      }
      const scanned = await scanRoot(root);
      const conflict = scanned.skills.find((skill) => skill.relPath !== relPath && skill.name === parsed.name);
      if (conflict !== undefined) {
        throw new SkillError("name-conflict", `another skill in this root already uses the name "${parsed.name}".`);
      }
      const temporary = join(dirname(entry.filePath), `.${basename(entry.filePath)}.${randomBytes(6).toString("hex")}.tmp`);
      try {
        await writeFile(temporary, content, "utf8");
        await rename(temporary, entry.filePath);
      } catch (error) {
        await rm(temporary, { force: true }).catch(() => {});
        throw error;
      }
      const state = await getState();
      const updated = state.global.skills.concat(...state.workspaces.map((scope) => scope.skills))
        .find((skill) => skill.rootId === rootId && skill.relPath === relPath);
      return { state, entry: updated ?? null };
    });
  }

  return {
    dshHome,
    agentsHome,
    getState,
    getSkill,
    validate,
    installSkill,
    uninstallSkill,
    setEnabled,
    saveSkill
  };
}
