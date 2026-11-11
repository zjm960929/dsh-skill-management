import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildSkillContent,
  createSkillStore,
  parseSkillContent
} from "../lib/skill-store.js";

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

async function makeHarness(t, {workspace = true} = {}) {
  const root = await mkdtemp(join(tmpdir(), "dsh-skill-management-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dshHome = join(root, "home");
  const agentsHome = join(root, "agents");
  const workspacePath = join(root, "workspace");
  if (workspace) await mkdir(workspacePath, { recursive: true });
  await mkdir(join(dshHome, "skills"), { recursive: true });
  await mkdir(join(agentsHome, "skills"), { recursive: true });
  const store = createSkillStore({
    listWorkspaces: async () => (workspace ? [{ id: "w1", title: "Workspace One", path: workspacePath }] : []),
    dshHome,
    agentsHome,
    home: root
  });
  return { root, dshHome, agentsHome, workspacePath, store };
}

async function writeBundle(root, name, description, body) {
  const directory = join(root, name);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "SKILL.md"), document(name, description, body), "utf8");
  return directory;
}

test("parseSkillContent accepts canonical frontmatter and invocation flags", () => {
  const parsed = parseSkillContent(`---\nname: my-skill\ndescription: "Handles: things"\nwhenToUse: when needed\ndisable-model-invocation: true\nuser-invocable: false\n---\n\nBody text\n`);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.name, "my-skill");
  assert.equal(parsed.description, "Handles: things");
  assert.equal(parsed.whenToUse, "when needed");
  assert.deepEqual(parsed.invocation, { modelInvocable: false, userInvocable: false });
  assert.equal(parsed.body, "Body text");
});

test("parseSkillContent handles block scalar descriptions", () => {
  const parsed = parseSkillContent(`---\nname: my-skill\ndescription: >-\n  First line\n  second line\n---\n\nBody\n`);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.description, "First line second line");
});

test("parseSkillContent rejects missing and legacy frontmatter", () => {
  const missing = parseSkillContent("# No frontmatter\n");
  assert.equal(missing.valid, false);
  assert.equal(missing.errors[0].code, "missing-frontmatter");

  const legacy = parseSkillContent(`---\nname: my-skill\ndescription: ok\nmodelInvocable: false\n---\n\nBody\n`);
  assert.equal(legacy.valid, false);
  assert.ok(legacy.errors.some((error) => error.code === "legacy-frontmatter"));

  const badName = parseSkillContent(`---\nname: Bad Name\ndescription: ok\n---\n\nBody\n`);
  assert.equal(badName.valid, false);
  assert.ok(badName.errors.some((error) => error.code === "invalid-name"));
});

test("buildSkillContent round-trips through parseSkillContent", () => {
  const raw = buildSkillContent({
    name: "new-skill",
    description: 'Uses "quotes" and a newline\nsecond line',
    whenToUse: "when testing",
    body: "Step 1\nStep 2",
    disableModelInvocation: true,
    userInvocable: false
  });
  const parsed = parseSkillContent(raw);
  assert.equal(parsed.valid, true);
  assert.equal(parsed.name, "new-skill");
  assert.equal(parsed.description, 'Uses "quotes" and a newline\nsecond line');
  assert.equal(parsed.whenToUse, "when testing");
  assert.deepEqual(parsed.invocation, { modelInvocable: false, userInvocable: false });
  assert.equal(parsed.body, "Step 1\nStep 2");
});

test("getState separates global and workspace roots and marks overrides", async (t) => {
  const harness = await makeHarness(t);
  const globalRoot = join(harness.dshHome, "skills");
  const wsRoot = join(harness.workspacePath, ".dsh", "skills");
  await writeBundle(globalRoot, "shared-skill", "Global copy");
  await writeBundle(wsRoot, "shared-skill", "Workspace copy");
  await writeBundle(harness.agentsHome + "/skills", "flat-skill", "Agents copy");

  const state = await harness.store.getState();
  assert.equal(state.global.skills.length, 2);
  assert.equal(state.workspaces.length, 1);
  const workspace = state.workspaces[0];
  assert.equal(workspace.skills.length, 1);
  assert.equal(workspace.exists, true);
  assert.equal(workspace.skills[0].name, "shared-skill");
  assert.equal(workspace.skills[0].overridesGlobal, true);
  const globalSkill = state.global.skills.find((skill) => skill.name === "shared-skill");
  assert.equal(globalSkill.overriddenIn.length, 1);
  assert.equal(globalSkill.overriddenIn[0].id, "w1");
  const agentsSkill = state.global.skills.find((skill) => skill.name === "flat-skill");
  assert.equal(agentsSkill.source, "user-agents");
  assert.equal(agentsSkill.enabled, true);
});

test("workspace roots rank above workspace .agents roots", async (t) => {
  const harness = await makeHarness(t);
  await writeBundle(join(harness.workspacePath, ".dsh", "skills"), "same-name", "dsh copy");
  await writeBundle(join(harness.workspacePath, ".agents", "skills"), "same-name", "agents copy");
  const state = await harness.store.getState();
  const skills = state.workspaces[0].skills;
  assert.equal(skills.length, 2);
  const dshSkill = skills.find((skill) => skill.source === "project-dsh");
  const agentsSkill = skills.find((skill) => skill.source === "project-agents");
  assert.equal(dshSkill.effective, true);
  assert.equal(agentsSkill.effective, false);
  assert.equal(agentsSkill.shadowedBy.rootId, dshSkill.rootId);
});

test("install from path, text and create, plus name conflicts", async (t) => {
  const harness = await makeHarness(t);
  const source = join(harness.root, "source-skill");
  await mkdir(source, { recursive: true });
  await writeFile(join(source, "SKILL.md"), document("source-skill", "From a folder"), "utf8");
  await writeFile(join(source, "notes.txt"), "resource", "utf8");

  const installed = await harness.store.installSkill({
    targetRootId: "global:dsh",
    source: { kind: "path", path: source }
  });
  assert.equal(installed.name, "source-skill");
  assert.equal(await exists(join(harness.dshHome, "skills", "source-skill", "notes.txt")), true);

  await assert.rejects(
    () => harness.store.installSkill({ targetRootId: "global:dsh", source: { kind: "path", path: source } }),
    (error) => error.code === "name-conflict"
  );

  const textInstalled = await harness.store.installSkill({
    targetRootId: "global:agents",
    source: { kind: "text", content: document("text-skill", "From text") }
  });
  assert.equal(textInstalled.name, "text-skill");
  assert.equal(await exists(join(harness.agentsHome, "skills", "text-skill", "SKILL.md")), true);

  const created = await harness.store.installSkill({
    targetRootId: "ws:w1:dsh",
    source: { kind: "create", name: "created-skill", description: "From form", body: "Do work.", whenToUse: "always" }
  });
  assert.equal(created.name, "created-skill");
  const createdRaw = await readFile(join(harness.workspacePath, ".dsh", "skills", "created-skill", "SKILL.md"), "utf8");
  assert.match(createdRaw, /whenToUse: "always"/);
});

test("copy installs a skill into another scope", async (t) => {
  const harness = await makeHarness(t);
  const globalRoot = join(harness.dshHome, "skills");
  await writeBundle(globalRoot, "copy-me", "Copy source");
  const result = await harness.store.installSkill({
    targetRootId: "ws:w1:dsh",
    source: { kind: "copy", fromRootId: "global:dsh", fromRelPath: "copy-me" }
  });
  assert.equal(result.name, "copy-me");
  const state = await harness.store.getState();
  assert.equal(state.workspaces[0].skills.some((skill) => skill.name === "copy-me"), true);
  assert.equal(state.global.skills.some((skill) => skill.name === "copy-me"), true);
});

test("toggle renames instruction files without losing content", async (t) => {
  const harness = await makeHarness(t);
  const root = join(harness.dshHome, "skills");
  await writeBundle(root, "toggle-me", "Toggle");
  const before = await harness.store.getState();
  const entry = before.global.skills.find((skill) => skill.name === "toggle-me");

  const disabled = await harness.store.setEnabled({ rootId: entry.rootId, relPath: entry.relPath, enabled: false });
  assert.equal(await exists(join(root, "toggle-me", "SKILL.md")), false);
  assert.equal(await exists(join(root, "toggle-me", "SKILL.md.disabled")), true);
  assert.equal(disabled.state.global.skills.find((skill) => skill.name === "toggle-me").enabled, false);

  const enabled = await harness.store.setEnabled({ rootId: entry.rootId, relPath: entry.relPath, enabled: true });
  assert.equal(await exists(join(root, "toggle-me", "SKILL.md")), true);
  assert.equal(enabled.state.global.skills.find((skill) => skill.name === "toggle-me").enabled, true);
});

test("flat markdown skills are listed and toggled", async (t) => {
  const harness = await makeHarness(t);
  const agentsRoot = join(harness.agentsHome, "skills");
  await writeFile(join(agentsRoot, "flat.md"), document("flat-skill", "Flat file"), "utf8");
  const state = await harness.store.getState();
  const flat = state.global.skills.find((skill) => skill.name === "flat-skill");
  assert.equal(flat.format, "flat");
  assert.equal(flat.enabled, true);
  await harness.store.setEnabled({ rootId: flat.rootId, relPath: flat.relPath, enabled: false });
  assert.equal(await exists(join(agentsRoot, "flat.md.disabled")), true);
});

test("save validates and updates content, rejecting invalid frontmatter", async (t) => {
  const harness = await makeHarness(t);
  await writeBundle(join(harness.dshHome, "skills"), "edit-me", "Before");
  const state = await harness.store.getState();
  const entry = state.global.skills.find((skill) => skill.name === "edit-me");

  const saved = await harness.store.saveSkill({
    rootId: entry.rootId,
    relPath: entry.relPath,
    content: `---\nname: edit-me\ndescription: "After"\n---\n\nNew body\n`
  });
  assert.equal(saved.entry.description, "After");

  await assert.rejects(
    () => harness.store.saveSkill({ rootId: entry.rootId, relPath: entry.relPath, content: "no frontmatter" }),
    (error) => error.code === "invalid-skill"
  );
  const raw = await readFile(join(harness.dshHome, "skills", "edit-me", "SKILL.md"), "utf8");
  assert.match(raw, /New body/);

  const renamed = await harness.store.saveSkill({
    rootId: entry.rootId,
    relPath: entry.relPath,
    content: `---\nname: edited-name\ndescription: "Renamed"\n---\n\nBody\n`
  });
  assert.equal(renamed.entry.name, "edited-name");
});

test("save rejects a name already used by another skill", async (t) => {
  const harness = await makeHarness(t);
  const root = join(harness.dshHome, "skills");
  await writeBundle(root, "first", "First");
  await writeBundle(root, "second", "Second");
  const state = await harness.store.getState();
  const entry = state.global.skills.find((skill) => skill.name === "second");
  await assert.rejects(
    () => harness.store.saveSkill({
      rootId: entry.rootId,
      relPath: entry.relPath,
      content: `---\nname: first\ndescription: "Collision"\n---\n\nBody\n`
    }),
    (error) => error.code === "name-conflict"
  );
});

test("uninstall removes bundles and flat files", async (t) => {
  const harness = await makeHarness(t);
  const root = join(harness.dshHome, "skills");
  await writeBundle(root, "remove-me", "Remove");
  await writeFile(join(harness.agentsHome, "skills", "flat-remove.md"), document("flat-remove", "Flat"), "utf8");
  const state = await harness.store.getState();
  const bundle = state.global.skills.find((skill) => skill.name === "remove-me");
  const flat = state.global.skills.find((skill) => skill.name === "flat-remove");
  await harness.store.uninstallSkill({ rootId: bundle.rootId, relPath: bundle.relPath });
  await harness.store.uninstallSkill({ rootId: flat.rootId, relPath: flat.relPath });
  assert.equal(await exists(join(root, "remove-me")), false);
  assert.equal(await exists(join(harness.agentsHome, "skills", "flat-remove.md")), false);
});

test("path traversal and unknown roots are refused", async (t) => {
  const harness = await makeHarness(t);
  await writeBundle(join(harness.dshHome, "skills"), "safe", "Safe");
  await assert.rejects(
    () => harness.store.getSkill({ rootId: "global:dsh", relPath: "../outside" }),
    (error) => error.code === "invalid-path"
  );
  await assert.rejects(
    () => harness.store.getSkill({ rootId: "global:nope", relPath: "safe" }),
    (error) => error.code === "unknown-root"
  );
});

test("install into a missing workspace is refused", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "dsh-skill-management-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const missing = join(root, "does-not-exist");
  const store = createSkillStore({
    listWorkspaces: async () => [{ id: "w2", title: "Missing", path: missing }],
    dshHome: join(root, "home"),
    agentsHome: join(root, "agents"),
    home: root
  });
  const state = await store.getState();
  assert.equal(state.workspaces[0].exists, false);
  await assert.rejects(
    () => store.installSkill({
      targetRootId: "ws:w2:dsh",
      source: { kind: "create", name: "nope", description: "Nope" }
    }),
    (error) => error.code === "workspace-missing"
  );
  assert.equal(await exists(missing), false);
});

test("getSkill returns full raw content and structured entry", async (t) => {
  const harness = await makeHarness(t);
  await writeBundle(join(harness.dshHome, "skills"), "read-me", "Read");
  const state = await harness.store.getState();
  const entry = state.global.skills.find((skill) => skill.name === "read-me");
  const loaded = await harness.store.getSkill({ rootId: entry.rootId, relPath: entry.relPath });
  assert.match(loaded.content, /name: read-me/);
  assert.equal(loaded.entry.description, "Read");
  assert.equal(loaded.entry.valid, true);
});
