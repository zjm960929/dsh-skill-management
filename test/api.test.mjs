import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { apply } from "../lib/index.js";

function makeRequest(method, url, body) {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body), "utf8")];
  return {
    method,
    url,
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk;
    }
  };
}

function makeResponse() {
  return {
    status: 0,
    headers: null,
    text: "",
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(text) {
      this.text = text;
    },
    json() {
      return JSON.parse(this.text);
    }
  };
}

async function setup(t, {owner = true} = {}) {
  const root = await mkdtemp(join(tmpdir(), "dsh-skill-management-api-"));
  const dshHome = join(root, "home");
  const agentsHome = join(root, "agents");
  const workspacePath = join(root, "workspace");
  await mkdir(join(dshHome, "skills"), { recursive: true });
  await mkdir(join(agentsHome, "skills"), { recursive: true });
  await mkdir(workspacePath, { recursive: true });
  const previousDshHome = process.env.DSH_HOME;
  const previousAgentsHome = process.env.DSH_AGENTS_HOME;
  process.env.DSH_HOME = dshHome;
  process.env.DSH_AGENTS_HOME = agentsHome;
  t.after(async () => {
    if (previousDshHome === undefined) delete process.env.DSH_HOME;
    else process.env.DSH_HOME = previousDshHome;
    if (previousAgentsHome === undefined) delete process.env.DSH_AGENTS_HOME;
    else process.env.DSH_AGENTS_HOME = previousAgentsHome;
    await rm(root, { recursive: true, force: true });
  });

  let registration = null;
  const connection = {
    admit: () => (owner
      ? { peer: { principal: { kind: "owner" } } }
      : { rejection: 403 })
  };
  const registry = {
    list: () => [{ id: "w1", title: "Workspace One", path: workspacePath }]
  };
  const ctx = {
    get(name) {
      if (name === "connection") return connection;
      if (name === "workspaceRegistry") return registry;
      return undefined;
    },
    webServer: {
      register(options) {
        registration = options;
        return () => {};
      }
    },
    effect(fn) {
      const dispose = fn();
      return () => { if (typeof dispose === "function") dispose(); };
    },
    logger: { warn: () => {} }
  };
  apply(ctx);
  assert.ok(registration, "web server route registered");
  assert.equal(registration.path, "/skill-management/api");
  assert.equal(registration.kind, "prefix");

  async function call(method, path, body, rawBody) {
    const request = makeRequest(method, `/skill-management/api${path}`, body);
    if (rawBody !== undefined) {
      request[Symbol.asyncIterator] = async function* () {
        yield Buffer.from(rawBody, "utf8");
      };
    }
    const response = makeResponse();
    await registration.handler(request, response);
    return response;
  }

  return { root, dshHome, agentsHome, workspacePath, call };
}

test("GET /state returns global and workspace scopes for an owner", async (t) => {
  const harness = await setup(t);
  const response = await harness.call("GET", "/state");
  assert.equal(response.status, 200);
  const payload = response.json();
  assert.equal(payload.ok, true);
  assert.equal(payload.result.workspaces.length, 1);
  assert.equal(payload.result.workspaces[0].id, "w1");
  assert.equal(payload.result.global.roots.length, 2);
  assert.equal(typeof payload.result.defaultExportDir, "string");
});

test("POST /install, /toggle, /save and /uninstall drive the store", async (t) => {
  const harness = await setup(t);
  const install = await harness.call("POST", "/install", {
    targetRootId: "global:dsh",
    source: { kind: "create", name: "api-skill", description: "Created through the API" }
  });
  assert.equal(install.status, 200);
  const installed = install.json();
  assert.equal(installed.ok, true);
  assert.equal(installed.result.name, "api-skill");
  assert.equal(installed.result.targetRootId, "global:dsh");
  assert.equal(installed.result.scopeKind, "global");
  assert.equal(installed.result.scopeId, "global");
  assert.equal(installed.result.state.global.skills.some((skill) => skill.name === "api-skill"), true);

  const entry = installed.result.state.global.skills.find((skill) => skill.name === "api-skill");

  const save = await harness.call("POST", "/save", {
    rootId: entry.rootId,
    relPath: entry.relPath,
    content: "---\nname: api-skill\ndescription: \"Updated\"\n---\n\nUpdated body\n"
  });
  assert.equal(save.status, 200);
  assert.match(await readFile(join(harness.dshHome, "skills", "api-skill", "SKILL.md"), "utf8"), /Updated body/);

  const toggle = await harness.call("POST", "/toggle", {
    rootId: entry.rootId,
    relPath: entry.relPath,
    enabled: false
  });
  assert.equal(toggle.status, 200);
  assert.equal(toggle.json().result.entry.enabled, false);

  const uninstall = await harness.call("POST", "/uninstall", { rootId: entry.rootId, relPath: entry.relPath });
  assert.equal(uninstall.status, 200);
  assert.equal(uninstall.json().result.state.global.skills.some((skill) => skill.name === "api-skill"), false);
});

test("invalid skill content answers 400 with structured details", async (t) => {
  const harness = await setup(t);
  const response = await harness.call("POST", "/install", {
    targetRootId: "global:dsh",
    source: { kind: "text", content: "no frontmatter here" }
  });
  assert.equal(response.status, 400);
  const payload = response.json();
  assert.equal(payload.ok, false);
  assert.equal(payload.code, "invalid-skill");
  assert.ok(Array.isArray(payload.details));
  assert.equal(payload.details[0].code, "missing-frontmatter");
});

test("non-owner peers are refused before any body is read", async (t) => {
  const harness = await setup(t, { owner: false });
  const response = await harness.call("POST", "/install", {
    targetRootId: "global:dsh",
    source: { kind: "create", name: "blocked", description: "blocked" }
  });
  assert.equal(response.status, 403);
  assert.equal(response.json().ok, false);
});

test("unknown endpoint answers 404 and bad JSON answers 400", async (t) => {
  const harness = await setup(t);
  const notFound = await harness.call("GET", "/nope");
  assert.equal(notFound.status, 404);

  const malformed = await harness.call("POST", "/install", undefined, "{not json");
  assert.equal(malformed.status, 400);
  assert.equal(malformed.json().code, "bad-request");
});

test("exports a skill archive and imports it into a workspace through the API", async (t) => {
  const harness = await setup(t);
  const created = await harness.call("POST", "/install", {
    targetRootId: "global:dsh",
    source: { kind: "create", name: "portable-api", description: "Portable API skill" }
  });
  assert.equal(created.status, 200);

  const exportDir = join(harness.root, "api-exports");
  await mkdir(exportDir, { recursive: true });
  const exported = await harness.call("POST", "/export", {
    destinationDir: exportDir,
    source: { kind: "skill", rootId: "global:dsh", relPath: "portable-api" }
  });
  assert.equal(exported.status, 200);
  const exportResult = exported.json().result;
  assert.equal(exportResult.skillCount, 1);
  const archive = await readFile(exportResult.archivePath);

  const inspected = await harness.call("POST", "/import/inspect", {
    contentBase64: archive.toString("base64")
  });
  assert.equal(inspected.status, 200);
  const inspectResult = inspected.json().result;
  assert.equal(inspectResult.skills.length, 1);
  assert.equal(inspectResult.skills[0].name, "portable-api");

  const imported = await harness.call("POST", "/import/install", {
    contentBase64: archive.toString("base64"),
    targetRootId: "ws:w1:dsh",
    selectedPaths: [inspectResult.skills[0].archivePath]
  });
  assert.equal(imported.status, 200);
  const importedResult = imported.json().result;
  assert.equal(importedResult.imported.length, 1);
  assert.equal(importedResult.state.workspaces[0].skills.some((skill) => skill.name === "portable-api"), true);
});

test("rejects an unsupported archive on import inspection", async (t) => {
  const harness = await setup(t);
  const inspected = await harness.call("POST", "/import/inspect", {
    contentBase64: Buffer.from("not a gzip archive").toString("base64")
  });
  assert.equal(inspected.status, 400);
  assert.equal(inspected.json().code, "unsupported-archive");
});
