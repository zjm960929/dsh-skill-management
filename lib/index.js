/**
 * dsh-skill-management — host half.
 *
 * Registers an owner-only HTTP surface under `/skill-management/api` that the
 * browser panel uses to list and manage workspace and global filesystem
 * skills, plus the Cordis plugin entry that feeds it the workspace registry.
 */
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createSkillStore, expandHomePath, SkillError } from "./skill-store.js";

export const name = "dsh-skill-management";
export const inject = ["webServer", "workspaceRegistry", "connection"];

const API_PREFIX = "/skill-management/api";
const MAX_BODY_BYTES = 64 * 1024 * 1024;
const STATUS_BY_CODE = {
  "bad-request": 400,
  "invalid-path": 400,
  "invalid-source": 400,
  "invalid-content": 400,
  "invalid-skill": 400,
  "invalid-name": 400,
  "invalid-state": 400,
  "invalid-destination": 400,
  "invalid-archive": 400,
  "unsupported-archive": 400,
  "archive-empty": 400,
  "archive-path-too-long": 400,
  "archive-value-too-large": 400,
  "no-skills": 400,
  "symlink-not-supported": 400,
  "missing-description": 400,
  "missing-skill-file": 400,
  "too-deep": 400,
  "unknown-root": 400,
  "not-found": 404,
  "name-conflict": 409,
  "target-exists": 409,
  "archive-too-large": 413,
  "too-many-files": 413,
  "too-many-skills": 413,
  "too-large": 413,
  "workspace-missing": 409,
  "workspace-unavailable": 503,
  "auth-unavailable": 503
};

function resolveBaseHome(envName, directoryName) {
  const raw = process.env[envName];
  const fallback = join(homedir(), directoryName);
  const value = raw !== undefined && raw.trim() !== "" ? raw.trim() : fallback;
  return resolve(expandHomePath(value, homedir()));
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  });
  res.end(body);
}

function sendError(res, error) {
  const code = error instanceof SkillError ? error.code : (typeof error?.code === "string" ? error.code : "internal");
  const status = STATUS_BY_CODE[code] ?? 500;
  const payload = { ok: false, code, error: String(error?.message ?? error) };
  if (error?.details !== undefined) payload.details = error.details;
  sendJson(res, status, payload);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw new SkillError("too-large", `request body exceeds ${MAX_BODY_BYTES} bytes.`);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonBody(req) {
  const raw = await readBody(req);
  if (raw.trim() === "") return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SkillError("bad-request", "request body is not valid JSON.");
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SkillError("bad-request", "request body must be a JSON object.");
  }
  return parsed;
}

/**
 * Validate a request against DSH's own connection admission gate. Mutating a
 * user's skill files is an owner-only operation, so anything without an owner
 * peer fails closed before the body is read.
 */
function authenticate(ctx, req) {
  const connection = ctx.get?.("connection") ?? ctx.connection;
  if (connection === undefined || connection === null || typeof connection.admit !== "function") {
    return { ok: false, status: 503, code: "auth-unavailable", error: "DSH authentication service is unavailable." };
  }
  try {
    const admission = connection.admit(req);
    if (admission === null || typeof admission !== "object") {
      return { ok: false, status: 401, code: "unauthorized", error: "a valid DSH session is required." };
    }
    if ("rejection" in admission) {
      const status = typeof admission.rejection === "number" ? admission.rejection : 401;
      return {
        ok: false,
        status,
        code: status === 403 ? "forbidden" : "unauthorized",
        error: status === 403 ? "the request did not pass the DSH trust check." : "a valid DSH session is required."
      };
    }
    const peer = admission.peer;
    if (peer === null || typeof peer !== "object") {
      return { ok: false, status: 401, code: "unauthorized", error: "a valid DSH peer is required." };
    }
    if (peer.principal?.kind !== "owner") {
      return { ok: false, status: 403, code: "forbidden", error: "skill management is owner-only." };
    }
    return { ok: true, peer };
  } catch (error) {
    return { ok: false, status: 403, code: "forbidden", error: String(error?.message ?? error) };
  }
}

function workspaceProvider(ctx) {
  const registry = ctx.get?.("workspaceRegistry") ?? ctx.workspaceRegistry;
  if (registry === undefined || registry === null || typeof registry.list !== "function") {
    throw new SkillError("workspace-unavailable", "the workspace registry is unavailable.");
  }
  return registry.list().map((entity) => ({
    id: String(entity.id),
    title: entity.title || entity.id,
    path: entity.path
  }));
}

/** Register the skill-management HTTP API on the supplied plugin context. */
export function apply(ctx) {
  const store = createSkillStore({
    listWorkspaces: async () => workspaceProvider(ctx),
    dshHome: resolveBaseHome("DSH_HOME", ".dsh"),
    agentsHome: resolveBaseHome("DSH_AGENTS_HOME", ".agents"),
    home: homedir()
  });

  const handler = async (req, res) => {
    const auth = authenticate(ctx, req);
    if (!auth.ok) {
      sendJson(res, auth.status, { ok: false, code: auth.code, error: auth.error });
      return;
    }
    let url;
    try {
      url = new URL(req.url ?? "/", "http://localhost");
    } catch {
      sendJson(res, 400, { ok: false, code: "bad-request", error: "invalid request URL." });
      return;
    }
    const path = url.pathname.startsWith(API_PREFIX)
      ? url.pathname.slice(API_PREFIX.length) || "/"
      : "/";
    try {
      if (req.method === "GET" && path === "/state") {
        sendJson(res, 200, { ok: true, result: await store.getState() });
        return;
      }
      if (req.method === "GET" && path === "/skill") {
        const rootId = url.searchParams.get("rootId") ?? "";
        const relPath = url.searchParams.get("relPath") ?? "";
        sendJson(res, 200, { ok: true, result: await store.getSkill({ rootId, relPath }) });
        return;
      }
      if (req.method === "POST") {
        const body = await readJsonBody(req);
        let result;
        if (path === "/install") {
          result = await store.installSkill({ targetRootId: body.targetRootId, source: body.source });
        } else if (path === "/uninstall") {
          result = await store.uninstallSkill({ rootId: body.rootId, relPath: body.relPath });
        } else if (path === "/toggle") {
          result = await store.setEnabled({ rootId: body.rootId, relPath: body.relPath, enabled: body.enabled });
        } else if (path === "/save") {
          result = await store.saveSkill({ rootId: body.rootId, relPath: body.relPath, content: body.content });
        } else if (path === "/validate") {
          result = await store.validate({ content: body.content });
        } else if (path === "/export") {
          result = await store.exportSkills({ destinationDir: body.destinationDir, source: body.source });
        } else if (path === "/import/inspect") {
          result = await store.inspectArchive({ contentBase64: body.contentBase64, archivePath: body.archivePath });
        } else if (path === "/import/install") {
          result = await store.importArchive({
            contentBase64: body.contentBase64,
            archivePath: body.archivePath,
            targetRootId: body.targetRootId,
            selectedPaths: body.selectedPaths
          });
        } else {
          sendJson(res, 404, { ok: false, code: "not-found", error: "unknown skill-management endpoint." });
          return;
        }
        sendJson(res, 200, { ok: true, result });
        return;
      }
      if (req.method === "GET") {
        sendJson(res, 404, { ok: false, code: "not-found", error: "unknown skill-management endpoint." });
        return;
      }
      sendJson(res, 405, { ok: false, code: "method-not-allowed", error: "method not allowed." });
    } catch (error) {
      if (!(error instanceof SkillError)) ctx.logger?.warn?.(`skill-management: ${error?.stack ?? error}`);
      sendError(res, error);
    }
  };

  ctx.effect(() => ctx.webServer.register({
    kind: "prefix",
    path: API_PREFIX,
    handler
  }), "skill-management: http api");

  return store;
}
