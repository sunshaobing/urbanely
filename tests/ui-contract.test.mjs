import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(relativePath) {
  return fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");
}

test("integrated shell and workflow landmarks are present", () => {
  const layout = read("app/src/components/Layout.tsx");
  const dashboard = read("app/src/pages/Dashboard.tsx");
  const css = read("app/src/styles.css");

  assert.match(layout, /CommandPalette/);
  assert.match(layout, /CartoonAvatar/);
  assert.match(layout, /nav-group-label/);
  assert.match(layout, /sidebar-risk/);
  assert.match(dashboard, /flow-panel/);
  assert.match(dashboard, /flow-node/);
  assert.match(read("app/src/pages/Permissions.tsx"), /CartoonAvatar/);

  for (const className of [
    "command-panel",
    "flow-map",
    "workflow-rail",
    "user-chip",
    "nav-group-label",
    "permission-matrix",
    "role-card",
    "switch-row",
    "audit-item",
    "cartoon-avatar",
    "login-shell",
    "login-card",
    "logout-button",
  ]) {
    assert.match(css, new RegExp(`\\.${className}`));
  }
});

test("every primary page uses the shared header and detail flows expose a workflow rail", () => {
  for (const page of ["Dashboard", "Inspections", "Sealing", "ServiceOrders", "Customers", "Reports", "Permissions"]) {
    assert.match(read(`app/src/pages/${page}.tsx`), /PageHeader/);
  }

  assert.match(read("app/src/pages/Inspections.tsx"), /WorkflowRail/);
  assert.match(read("app/src/pages/Sealing.tsx"), /WorkflowRail/);
});

test("the web console no longer exposes the field-mode page", () => {
  const types = read("app/src/types.ts");
  const layout = read("app/src/components/Layout.tsx");
  const commands = read("app/src/components/CommandPalette.tsx");
  const app = read("app/src/App.tsx");

  assert.doesNotMatch(types, /\|\s*"field"/);
  assert.doesNotMatch(layout, /现场模式|key:\s*"field"|Smartphone/);
  assert.doesNotMatch(commands, /现场模式|page:\s*"field"|Smartphone/);
  assert.doesNotMatch(app, /FieldMode|activePage === "field"/);
  assert.equal(
    fs.existsSync(new URL("../app/src/pages/FieldMode.tsx", import.meta.url)),
    false,
  );
});

