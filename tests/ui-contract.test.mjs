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
  assert.match(layout, /nav-group-label/);
  assert.match(layout, /sidebar-risk/);
  assert.match(dashboard, /flow-panel/);
  assert.match(dashboard, /flow-node/);

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
  ]) {
    assert.match(css, new RegExp(`\\.${className}`));
  }
});

test("every primary page uses the shared header and detail flows expose a workflow rail", () => {
  for (const page of ["Dashboard", "Inspections", "Sealing", "ServiceOrders", "Customers", "Reports", "Permissions", "FieldMode"]) {
    assert.match(read(`app/src/pages/${page}.tsx`), /PageHeader/);
  }

  assert.match(read("app/src/pages/Inspections.tsx"), /WorkflowRail/);
  assert.match(read("app/src/pages/Sealing.tsx"), /WorkflowRail/);
});

