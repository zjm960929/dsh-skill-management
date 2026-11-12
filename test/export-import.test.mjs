import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp } from "node:fs/promises";
import { createSkillStore } from "../lib/skill-store.js";
import { createTarGz, readTarGz } from "../lib/skill-archive.js";

function document(name, description, body = "Do the thing.") {
  return `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n${body}\n`;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function writeBundle(root, name, description, body) {
  const directory = join(root, name);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "SKILL.md"), document(name, description, body), "utf8");
  return directory;
}

async function makeHarness(t) {
  const root = await mkdtemp(join(tmpdir(), "dsh-skill-management-export-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dshHome = join(root, "home");
  const agentsHome = join(root, "agents");
  const workspacePath = join(root, "workspace");
  const exportDir = join(root, "exports");
  await mkdir(join(dshHome, "skills"), { recursive: true });
  await mkdir(join(agentsHome, "skills"), { recursive: true });
  await mkdir(workspacePath, { recursive: true });
  await mkdir(exportDir, { recursive: true });
  const store = createSkillStore({
    listWorkspaces: async () => [{ id: "w1", title: "Workspace One", path: workspacePath }],
    dshHome,
    agentsHome,
    home: root
  });
  return { root, dshHome, agentsHome, workspacePath, exportDir, store };
}

test("tar.gz archives round-trip files and reject traversal", () => {
  const archive = createTarGz([
    { path: "manifest.json", data: Buffer.from('{"ok":true}') },
    { path: "skills/one/SKILL.md", data: Buffer.from("# hello\n") }
  ]);
  const entries = readTarGz(archive);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].path, "manifest.json");
  assert.equal(entries[1].data.toString("utf8"), "# hello\n");
  assert.throws(
    () => createTarGz([{ path: "../escape.txt", data: Buffer.from("x") }]),
    (error) => error.code === "invalid-archive"
  );
});

test("exports one skill and imports it into another workspace root", async (t) => {
  const harness = await makeHarness(t);
  const globalRoot = join(harness.dshHome, "skills");
  const sourceDir = await writeBundle(globalRoot, "portable-skill", "Portable");
  await writeFile(join(sourceDir, "notes.txt"), "resource", "utf8");

  const exported = await harness.store.exportSkills({
    destinationDir: harness.exportDir,
    source: { kind: "skill", rootId: "global:dsh", relPath: "portable-skill" }
  });
  assert.equal(exported.skillCount, 1);
  assert.equal(await exists(exported.archivePath), true);
  assert.match(exported.filename, /^portable-skill.*\.tgz$/);

  const inspected = await harness.store.inspectArchive({ archivePath: exported.archivePath });
  assert.equal(inspected.skills.length, 1);
  assert.equal(inspected.skills[0].name, "portable-skill");
  assert.equal(inspected.skills[0].valid, true);
  assert.equal(inspected.skills[0].fileCount, 2);

  const imported = await harness.store.importArchive({
    archivePath: exported.archivePath,
    targetRootId: "ws:w1:dsh",
    selectedPaths: [inspected.skills[0].archivePath]
  });
  assert.equal(imported.imported.length, 1);
  assert.equal(await exists(join(harness.workspacePath, ".dsh", "skills", "portable-skill", "notes.txt")), true);
  const state = await harness.store.getState();
  assert.equal(state.workspaces[0].skills.some((skill) => skill.name === "portable-skill"), true);
});

test("exports all skills in a workspace and all machine skills", async (t) => {
  const harness = await makeHarness(t);
  await writeBundle(join(harness.workspacePath, ".dsh", "skills"), "workspace-one", "One");
  await writeBundle(join(harness.workspacePath, ".dsh", "skills"), "workspace-two", "Two");
  await writeBundle(join(harness.dshHome, "skills"), "global-one", "Global");

  const workspaceExport = await harness.store.exportSkills({
    destinationDir: harness.exportDir,
    source: { kind: "workspace", workspaceId: "w1" }
  });
  assert.equal(workspaceExport.skillCount, 2);
  const workspaceInspect = await harness.store.inspectArchive({ archivePath: workspaceExport.archivePath });
  assert.deepEqual(workspaceInspect.skills.map((skill) => skill.name).sort(), ["workspace-one", "workspace-two"]);

  const allExport = await harness.store.exportSkills({
    destinationDir: harness.exportDir,
    source: { kind: "all" }
  });
  assert.equal(allExport.skillCount, 3);
  const allInspect = await harness.store.inspectArchive({ archivePath: allExport.archivePath });
  assert.deepEqual(allInspect.skills.map((skill) => skill.name).sort(), ["global-one", "workspace-one", "workspace-two"]);
});

test("disabled skills are exported as active skills and base64 inspection works", async (t) => {
  const harness = await makeHarness(t);
  const root = join(harness.dshHome, "skills");
  const dir = await writeBundle(root, "disabled-skill", "Disabled");
  await writeFile(join(root, "disabled-skill", "SKILL.md.disabled"), document("disabled-skill", "Disabled"), "utf8");
  await rm(join(dir, "SKILL.md"));
  const buffer = await readFile(
    (await harness.store.exportSkills({
      destinationDir: harness.exportDir,
      source: { kind: "skill", rootId: "global:dsh", relPath: "disabled-skill" }
    })).archivePath
  );
  const inspected = await harness.store.inspectArchive({ contentBase64: buffer.toString("base64") });
  assert.equal(inspected.skills[0].name, "disabled-skill");
  assert.equal(inspected.skills[0].valid, true);
  const imported = await harness.store.importArchive({
    contentBase64: buffer.toString("base64"),
    targetRootId: "global:agents",
    selectedPaths: [inspected.skills[0].archivePath]
  });
  assert.equal(imported.imported.length, 1);
  assert.equal(await exists(join(harness.agentsHome, "skills", "disabled-skill", "SKILL.md")), true);
});

test("import conflicts are detected before writing", async (t) => {
  const harness = await makeHarness(t);
  const root = join(harness.dshHome, "skills");
  await writeBundle(root, "collision", "One");
  const exported = await harness.store.exportSkills({
    destinationDir: harness.exportDir,
    source: { kind: "skill", rootId: "global:dsh", relPath: "collision" }
  });
  const inspected = await harness.store.inspectArchive({ archivePath: exported.archivePath });
  await assert.rejects(
    () => harness.store.importArchive({
      archivePath: exported.archivePath,
      targetRootId: "global:dsh",
      selectedPaths: [inspected.skills[0].archivePath]
    }),
    (error) => error.code === "name-conflict"
  );
});
