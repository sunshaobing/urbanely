import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../miniprogram/", import.meta.url);

function read(relativePath) {
  return fs.readFileSync(new URL(relativePath, root), "utf8");
}

function exists(relativePath) {
  return fs.existsSync(new URL(relativePath, root));
}

function listTextFiles(directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
    if (entry.isDirectory()) return listTextFiles(entryUrl);
    return /\.(?:ts|json|wxml|wxss)$/.test(entry.name) ? [entryUrl] : [];
  });
}

test("the mini program registers the required field pages and local components", () => {
  const app = JSON.parse(read("app.json"));
  const project = JSON.parse(read("project.config.json"));
  const expectedPages = [
    "pages/login/login",
    "pages/tasks/tasks",
    "pages/inspection/inspection",
    "pages/sealing/sealing",
    "pages/reports/reports",
    "pages/profile/profile",
  ];

  assert.deepEqual(app.pages, expectedPages);
  assert.match(project.appid, /^wx[0-9a-f]{16}$/);

  for (const page of app.pages) {
    for (const extension of [".ts", ".json", ".wxml", ".wxss"]) {
      assert.ok(exists(`${page}${extension}`), `missing ${page}${extension}`);
    }

    const pageConfig = JSON.parse(read(`${page}.json`));
    for (const componentPath of Object.values(pageConfig.usingComponents || {})) {
      assert.ok(exists(`${componentPath.slice(1)}.ts`), `missing component ${componentPath}`);
    }
  }
});

test("inspection keeps structure-risk photos only and enforces the 100-photo cap", () => {
  const inspection = read("pages/inspection/inspection.wxml");
  const picker = read("components/photo-picker/index.ts");
  const pickerStyles = read("components/photo-picker/index.wxss");

  assert.match(inspection, /title="结构风险图片"/);
  assert.match(inspection, /max="\{\{100\}\}"/);
  assert.doesNotMatch(inspection, /封堵前图片|封堵后图片|beforePhotos|afterPhotos/);
  assert.match(picker, /max:\s*\{\s*type:\s*Number,\s*value:\s*100\s*\}/);
  assert.match(picker, /selected\.slice\(0, remaining\)/);
  assert.match(picker, /persistTempFiles\(accepted\)/);
  assert.match(pickerStyles, /\.photo-grid\s*\{[\s\S]*?flex-wrap:\s*wrap/);
  assert.match(pickerStyles, /width:\s*calc\(20%\s*-\s*8rpx\)/);
});

test("inspection and sealing capture the required two handwritten signatures", () => {
  const inspection = read("pages/inspection/inspection.wxml");
  const sealing = read("pages/sealing/sealing.wxml");
  const signaturePad = read("components/signature-pad/index.wxml");

  assert.match(inspection, /勘测人员签字确认/);
  assert.match(inspection, /客户代表签字/);
  assert.match(inspection, /signer="\{\{surveyorName\}\} · 勘测人员"/);
  assert.match(inspection, /value="\{\{draft\.surveyorSignature\}\}"/);
  assert.match(sealing, /封堵责任人签字/);
  assert.match(sealing, /客户代表签字/);
  assert.match(sealing, /value="\{\{draft\.responsibleSignature\}\}"/);
  assert.match(signaturePad, /type="2d"/);
  assert.match(signaturePad, /bindtouchstart="touchStart"/);
  assert.match(read("components/signature-pad/index.ts"), /observers:/);
});

test("offline attachments are persisted before entering the local queue", () => {
  const files = read("utils/files.ts");
  const storage = read("utils/storage.ts");

  assert.match(files, /getFileSystemManager\(\)\.saveFile/);
  assert.match(files, /USER_DATA_PATH/);
  assert.match(files, /getAttachmentPaths/);
  assert.match(storage, /clearDraftsAndQueue/);
  assert.match(storage, /removeManagedFiles\(attachments\)/);
});

test("the field client does not hard-code phone credentials or persist passwords", () => {
  const login = read("pages/login/login.ts");
  const storage = read("utils/storage.ts");
  const text = listTextFiles()
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  assert.doesNotMatch(text, /(?<!\d)1[3-9]\d{9}(?!\d)/);
  assert.doesNotMatch(text, /password\s*:\s*["'][^"']+["']/i);
  assert.doesNotMatch(storage, /password/i);
  assert.match(login, /loginWithPassword\(phone, password\)/);
  assert.match(login, /saveAuth\(payload\)/);
  assert.doesNotMatch(login, /onLoad\(\)\s*\{[\s\S]*?reLaunch/);
  assert.doesNotMatch(login, /setTimeout/);
});

test("field detail pages send unauthenticated users back to login", () => {
  for (const page of ["pages/inspection/inspection.ts", "pages/sealing/sealing.ts"]) {
    const source = read(page);
    assert.match(source, /if \(!getSession\(\)\)|const session = getSession\(\);\s*if \(!session\)/);
    assert.match(source, /reLaunch\(\{ url: "\/pages\/login\/login" \}\)/);
  }
});

test("the workbench uses the production Tencent Cloud API and no local task data", () => {
  const env = read("config/env.ts");
  const api = read("utils/api.ts");
  const tasks = read("pages/tasks/tasks.ts");

  assert.match(env, /API_BASE_URL = "https:\/\/sunrgw\.cn"/);
  assert.match(api, /\/api\/auth\/login/);
  assert.match(api, /\/api\/dashboard\/summary/);
  assert.match(api, /\/api\/workorders/);
  assert.match(api, /skipAuthRedirect: true/);
  assert.match(tasks, /getDashboardSummary/);
  assert.match(tasks, /getWorkOrders/);
  assert.match(tasks, /getWorkOrder/);
  assert.doesNotMatch(tasks, /data\/mock/);
  assert.doesNotMatch(tasks, /stats\.(today|pending|risk)|filteredTasks/);
});

test("the workbench follows the requested business visual system", () => {
  const tasks = read("pages/tasks/tasks.wxml");
  const taskLogic = read("pages/tasks/tasks.ts");
  const styles = read("pages/tasks/tasks.wxss");
  const navStyles = read("components/bottom-nav/index.wxss");

  assert.match(taskLogic, /待处理/);
  assert.match(taskLogic, /进行中/);
  assert.match(taskLogic, /已完成/);
  assert.match(tasks, /item\.statusLabel/);
  assert.match(styles, /border-radius:\s*16rpx/);
  assert.match(styles, /box-shadow:\s*0 8rpx 24rpx rgba\(17, 24, 39, 0\.06\)/);
  assert.match(styles, /font-size:\s*36rpx/);
  assert.match(styles, /font-size:\s*28rpx/);
  assert.match(styles, /font-size:\s*24rpx/);
  assert.match(styles, /\.status-pending\s*\{[\s\S]*?background:\s*#fdf1f1/);
  assert.match(styles, /\.status-active\s*\{[\s\S]*?background:\s*#fff5e8/);
  assert.match(styles, /\.status-done\s*\{[\s\S]*?background:\s*#eef7f0/);
  assert.match(navStyles, /background:\s*#17211f/);
  assert.match(navStyles, /\.bottom-nav-item\.active\s*\{[\s\S]*?color:\s*#fff/);
});

test("reports and profile pages use server data instead of static fixtures", () => {
  assert.match(read("pages/reports/reports.ts"), /getWorkOrders\("approved", 1, 50\)/);
  assert.match(read("pages/profile/profile.ts"), /getDashboardSummary/);
  assert.doesNotMatch(read("pages/profile/profile.ts"), /clearQueue|syncNow|technician/);
});
