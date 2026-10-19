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

test("web operations pages consume the live backend snapshot", () => {
  const api = read("app/src/api.ts");
  const live = read("app/src/liveData.tsx");
  const layout = read("app/src/components/Layout.tsx");

  for (const endpoint of [
    "/api/dashboard/summary",
    "/api/workorders",
    "/api/risk-surveys",
    "/api/service-reports",
    "/api/customers",
    "/api/sites",
    "/api/templates",
  ]) {
    assert.match(api, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
  assert.match(live, /LIVE_REFRESH_MS/);
  assert.match(live, /setInterval/);
  assert.match(live, /visibilitychange/);
  assert.match(live, /window\.addEventListener\("focus"/);
  assert.match(live, /Promise\.allSettled/);
  assert.match(layout, /useLiveData/);
  assert.match(layout, /RefreshCw/);

  for (const page of [
    "Dashboard",
    "Customers",
    "Inspections",
    "Sealing",
    "Reports",
    "ServiceOrders",
  ]) {
    assert.match(read(`app/src/pages/${page}.tsx`), /useLiveData/);
  }
  assert.match(read("app/src/pages/Inspections.tsx"), /updateRiskSurvey/);
  assert.match(read("app/src/pages/Sealing.tsx"), /updateServiceReport/);
  assert.match(read("app/src/pages/Reports.tsx"), /openBackendPdf/);
  assert.equal(
    fs.existsSync(new URL("../app/src/data.ts", import.meta.url)),
    false,
  );
});

test("customer and site CRUD use production forms instead of placeholders", () => {
  const customers = read("app/src/pages/Customers.tsx");
  const editor = read("app/src/components/CustomerEditor.tsx");
  const api = read("app/src/api.ts");
  const mapper = read("app/src/backendMappers.ts");
  const css = read("app/src/styles.css");

  assert.doesNotMatch(customers, /待接入生产表单/);
  assert.match(customers, /CustomerEditor/);
  assert.match(customers, /DeleteCustomerDialog/);
  assert.match(customers, /hasWorkOrders/);

  for (const fn of [
    "createCustomer",
    "updateCustomer",
    "deleteCustomer",
    "createSite",
    "updateSite",
    "deleteSite",
  ]) {
    assert.match(api, new RegExp(`export function ${fn}`));
    assert.match(editor, new RegExp(fn));
  }

  assert.match(editor, /客户名称/);
  assert.match(editor, /默认门店/);
  assert.match(editor, /合作状态/);
  assert.match(mapper, /contact: customer\?\.contact/);
  assert.match(css, /\.customer-editor-modal/);
  assert.match(css, /\.button\.danger/);
  assert.match(css, /\.site-profile-tools/);
});

test("admin can dispatch a customer to a survey engineer", () => {
  const customers = read("app/src/pages/Customers.tsx");
  const dispatch = read("app/src/components/DispatchSurveyDialog.tsx");
  const api = read("app/src/api.ts");

  assert.match(customers, /DispatchSurveyDialog/);
  assert.match(customers, /onDispatch/);
  assert.match(dispatch, /listPersonnel/);
  assert.match(dispatch, /createWorkOrder/);
  assert.match(dispatch, /engineer_id: engineer\.id/);
  assert.match(dispatch, /service_engineer/);
  assert.match(dispatch, /确认派单/);
  assert.match(api, /export function createWorkOrder/);
});

