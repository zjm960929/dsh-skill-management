import test from "node:test";
import assert from "node:assert/strict";

function installBrowserGlobals() {
  const registrations = [];
  const dictionaries = [];
  const appended = [];
  const ReactMock = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    Fragment: Symbol("Fragment"),
    useState: (initial) => [typeof initial === "function" ? initial() : initial, () => {}],
    useEffect: () => {},
    useMemo: (factory) => factory(),
    useCallback: (fn) => fn,
    useRef: () => ({ current: null }),
    useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot()
  };
  const documentMock = {
    getElementById: () => null,
    createElement: () => ({ id: "", textContent: "" }),
    head: { appendChild: (node) => appended.push(node) },
    body: {},
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  let loaded;
  globalThis.window = {
    __ModuleLoader__: {
      load: (definition) => { loaded = definition; }
    }
  };
  globalThis.document = documentMock;
  const requireMock = (id) => {
    if (id === "react") return ReactMock;
    if (id === "react-dom") throw new Error("react-dom is not available in this test");
    throw new Error(`unexpected module ${id}`);
  };
  const ctx = {
    effect: (fn) => {
      const dispose = fn();
      return () => { if (typeof dispose === "function") dispose(); };
    },
    locale: {
      register: (ns, dict) => {
        dictionaries.push({ ns, dict });
        return () => {};
      },
      bind: () => (key) => key,
      getSnapshot: () => ({ active: "zh", revision: 1 }),
      subscribe: () => () => {}
    },
    slots: {
      inject: (_name, callback) => callback(),
      register: (options, component) => {
        registrations.push({ options, component });
        return () => {};
      }
    }
  };
  return { loaded: () => loaded, requireMock, ctx, registrations, dictionaries, appended };
}

test("client bundle registers the sidebar row and main panel", async () => {
  const harness = installBrowserGlobals();
  await import("../lib/client.js?case=registrations");
  const definition = harness.loaded();
  assert.ok(definition, "window.__ModuleLoader__.load was called");
  assert.equal(definition.id, "dsh-skill-management");
  const exports = definition.factory(harness.requireMock);
  assert.equal(typeof exports.apply, "function");
  assert.deepEqual(exports.inject, ["slots", "locale"]);
  assert.equal(exports.PANEL_ID, "skill-management");

  exports.apply(harness.ctx);

  assert.equal(harness.dictionaries.length, 1);
  assert.equal(harness.dictionaries[0].ns, "skillManagement");
  assert.equal(harness.dictionaries[0].dict.zh.panel, "技能");
  assert.equal(harness.dictionaries[0].dict.en.panel, "Skill");

  const main = harness.registrations.find((registration) => registration.options.name === "main");
  const sidebar = harness.registrations.find((registration) => registration.options.name === "sidebar.panellist");
  assert.ok(main, "main slot registered");
  assert.equal(main.options.key, "skill-management");
  assert.equal(typeof main.component, "function");
  assert.equal(typeof main.options.inject().useLanguage, "function");
  assert.equal(typeof main.options.inject().pickDirectory, "function");
  assert.ok(sidebar, "sidebar.panellist slot registered");
  assert.equal(sidebar.options.id, "skill-management");
  assert.equal(sidebar.options.order, 1);
  assert.equal(sidebar.options.label(), "panel");
  assert.equal(typeof sidebar.component, "function");
  assert.equal(harness.appended.length, 1, "stylesheet appended once");
  assert.match(harness.appended[0].textContent, /\.skm-actionDanger\{color:/);

  const icon = sidebar.component({ size: 18 });
  assert.equal(typeof icon.type, "function");
  const glyph = icon.type({ size: 18 });
  assert.equal(glyph.type, "svg");
  assert.equal(glyph.props.width, 18);
});

test("install dialog defaults to the viewed scope and falls back from a missing workspace", async () => {
  const harness = installBrowserGlobals();
  await import("../lib/client.js?case=install-scope");
  const exports = harness.loaded().factory(harness.requireMock);
  const globalScope = { kind: "global", id: "global", exists: true };
  const state = { global: globalScope, workspaces: [] };
  const workspace = { kind: "workspace", id: "w1", exists: true };
  const missing = { kind: "workspace", id: "w2", exists: false };
  assert.equal(exports.initialInstallScope(globalScope, state), globalScope);
  assert.equal(exports.initialInstallScope(workspace, state), workspace);
  assert.equal(exports.initialInstallScope(missing, state), globalScope);
});

test("client bundle exposes the page component and install-scope labels", async () => {
  const harness = installBrowserGlobals();
  await import("../lib/client.js?case=exports");
  const exports = harness.loaded().factory(harness.requireMock);
  assert.equal(typeof exports.SkillManagementPage, "function");
  const zh = harness.dictionaries.length === 0
    ? (exports.apply(harness.ctx), harness.dictionaries[0].dict.zh)
    : harness.dictionaries[0].dict.zh;
  for (const key of ["title", "subtitle", "install", "emptyTitle", "errInvalidName", "sourceProjectDsh", "installScope", "installScopeHint", "export", "import", "exportTitle", "importTitle", "importNoSkills", "browse", "browseUnavailable"]) {
    assert.equal(typeof zh[key], "string", `zh dictionary has ${key}`);
  }
});

test("pickDirectory prefers the Electron bridge and rejects when unavailable", async () => {
  const harness = installBrowserGlobals();
  await import("../lib/client.js?case=picker");
  const exports = harness.loaded().factory(harness.requireMock);
  exports.apply(harness.ctx);
  const main = harness.registrations.find((registration) => registration.options.name === "main");
  const pickDirectory = main.options.inject().pickDirectory;
  const previous = globalThis.__DSH_DIRECTORY_PICKER__;
  try {
    globalThis.__DSH_DIRECTORY_PICKER__ = { pick: async () => "C:\\picked-folder" };
    assert.equal(await pickDirectory(), "C:\\picked-folder");
    delete globalThis.__DSH_DIRECTORY_PICKER__;
    harness.ctx.get = (name) => name === "uiWorkspace"
      ? { pickDirectory: async () => "D:\\browse-folder" }
      : undefined;
    assert.equal(await pickDirectory(), "D:\\browse-folder");
    delete harness.ctx.get;
    await assert.rejects(() => pickDirectory(), /directory picker unavailable/);
  } finally {
    if (previous === undefined) delete globalThis.__DSH_DIRECTORY_PICKER__;
    else globalThis.__DSH_DIRECTORY_PICKER__ = previous;
  }
});

test("export and import modals render from scoped state", async () => {
  const harness = installBrowserGlobals();
  await import("../lib/client.js?case=modals");
  const exports = harness.loaded().factory(harness.requireMock);
  const globalRoot = { id: "global:dsh", source: "user-dsh", path: "C:\\global", exists: true, readable: true, skillCount: 0 };
  const wsRoot = { id: "ws:w1:dsh", source: "project-dsh", path: "C:\\ws", exists: true, readable: true, skillCount: 0 };
  const globalScope = { kind: "global", id: "global", title: "Global", skills: [], roots: [globalRoot], stats: { total: 0 } };
  const workspaceScope = { kind: "workspace", id: "w1", title: "W1", path: "C:\\ws", exists: true, skills: [], roots: [wsRoot], stats: { total: 0 } };
  const state = { global: globalScope, workspaces: [workspaceScope], defaultExportDir: "C:\\exports" };
  const t = (key) => key;
  const exportModal = exports.ExportModal({
    scope: globalScope,
    state,
    skill: null,
    t,
    onClose: () => {},
    onExported: () => {},
    pickDirectory: async () => null
  });
  assert.ok(exportModal);
  const importModal = exports.ImportModal({
    scope: workspaceScope,
    state,
    t,
    language: "en",
    onClose: () => {},
    onImported: () => {},
    pickDirectory: async () => null
  });
  assert.ok(importModal);
});
