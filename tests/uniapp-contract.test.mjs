import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const root = new URL("../uniapp/", import.meta.url);

function read(relativePath) {
  return fs.readFileSync(new URL(relativePath, root), "utf8");
}

test("uni-app registers the redesigned field pages and production AppID", () => {
  const pages = JSON.parse(read("src/pages.json"));
  const manifest = read("src/manifest.json");
  const paths = pages.pages.map((page) => page.path);

  assert.deepEqual(paths, [
    "pages/login/index",
    "pages/workbench/index",
    "pages/task-detail/index",
    "pages/reports/index",
    "pages/profile/index",
    "pages/risk-survey/index",
    "pages/service-report/index",
    "pages/password/index",
  ]);
  assert.equal(pages.globalStyle.navigationStyle, "custom");
  assert.match(manifest, /"appid"\s*:\s*"wx9469d5e631279f7b"/);
  assert.match(manifest, /"urlCheck"\s*:\s*true/);
});

test("uni-app uses production APIs for tasks, records, uploads and signatures", () => {
  const api = read("src/utils/api.ts");
  const auth = read("src/utils/auth.ts");
  const pdf = read("src/utils/pdf.ts");

  for (const endpoint of [
    "/api/auth/login",
    "/api/dashboard/summary",
    "/api/workorders",
    "/api/risk-surveys",
    "/api/service-reports",
    "/api/drafts",
    "/api/quick-phrases",
    "/api/auth/change-password",
  ]) {
    assert.match(api, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
  assert.match(api, /https:\/\/sunrgw\.cn/);
  assert.match(api, /uni\.uploadFile/);
  assert.match(pdf, /\/api\/risk-surveys\/\$\{id\}\/pdf/);
  assert.match(pdf, /\/api\/service-reports\/\$\{id\}\/pdf/);
  assert.match(auth, /access_token/);
  assert.match(auth, /token/);
});

test("workbench and archive render server data instead of local fixtures", () => {
  const workbench = read("src/pages/workbench/index.vue");
  const reports = read("src/pages/reports/index.vue");
  const present = read("src/utils/present.ts");

  assert.match(workbench, /getDashboardSummary/);
  assert.match(workbench, /getWorkOrders/);
  assert.match(workbench, /activeStatus/);
  assert.match(workbench, /statusOptions/);
  assert.match(present, /待处理/);
  assert.match(present, /进行中/);
  assert.match(present, /已完成/);
  assert.match(reports, /getRiskSurveys/);
  assert.match(reports, /getServiceReports/);
  assert.match(reports, /openReportPdf/);
  assert.doesNotMatch(workbench, /mockTasks|data\/mock/);
  assert.doesNotMatch(reports, /mockReports|data\/mock/);
});

test("the redesign keeps a green-led mobile business system", () => {
  const app = read("src/App.vue");
  const tabbar = read("src/components/AppTabBar.vue");
  const workbench = read("src/pages/workbench/index.vue");

  assert.match(app, /--field-dark:\s*#10352a/);
  assert.match(app, /--field-accent:\s*#1d7659/);
  assert.match(app, /background:\s*#eef4ef/);
  assert.match(app, /border-radius:\s*16rpx/);
  assert.match(app, /box-shadow:\s*0 8rpx 24rpx/);
  assert.match(app, /font-size:\s*36rpx/);
  assert.match(app, /font-size:\s*28rpx/);
  assert.match(app, /font-size:\s*24rpx/);
  assert.match(tabbar, /background:\s*#10352a/);
  assert.match(tabbar, /color:\s*#ffffff/);
  assert.match(workbench, /background:\s*#10352a/);
});

test("survey photos use the 100-image cap and a five-column wrapping grid", () => {
  const photoGrid = read("src/components/PhotoGrid.vue");
  const survey = read("src/pages/risk-survey/index.vue");
  const serviceReport = read("src/pages/service-report/index.vue");

  assert.match(photoGrid, /width:\s*calc\(20% - 9\.6rpx\)/);
  assert.match(photoGrid, /:max="100"|max:\s*100/);
  assert.match(survey, /<PhotoGrid[\s\S]*:max="100"/);
  assert.match(survey, /结构风险图片/);
  assert.doesNotMatch(survey, /封堵前图片|封堵后图片/);
  assert.match(serviceReport, /封堵前图片/);
  assert.match(serviceReport, /封堵后图片/);
});

test("survey and sealing flows capture both handwritten signatures", () => {
  const signaturePad = read("src/components/SignaturePad.vue");
  const survey = read("src/pages/risk-survey/index.vue");
  const serviceReport = read("src/pages/service-report/index.vue");

  assert.match(signaturePad, /<canvas/);
  assert.match(signaturePad, /@touchstart/);
  assert.match(signaturePad, /canvasToTempFilePath/);
  assert.match(survey, /勘测人员签字确认/);
  assert.match(survey, /客户代表签字/);
  assert.match(serviceReport, /封堵责任人签字/);
  assert.match(serviceReport, /客户代表签字/);
  assert.match(survey, /saveRiskSurvey/);
  assert.match(survey, /submitRiskSurvey/);
  assert.match(serviceReport, /saveServiceReport/);
  assert.match(serviceReport, /signServiceReport/);
  assert.match(serviceReport, /submitServiceReport/);
});

test("mobile credentials are not embedded in the uni-app source", () => {
  const login = read("src/pages/login/index.vue");
  const api = read("src/utils/api.ts");
  const source = `${login}\n${api}`;

  assert.doesNotMatch(source, /1[3-9]\d{9}/);
  assert.doesNotMatch(source, /password\s*:\s*["'][^"']+["']/);
});

test("root WeChat project points at the uni-app build output", () => {
  const config = JSON.parse(
    fs.readFileSync(new URL("../project.config.json", import.meta.url), "utf8"),
  );

  assert.equal(config.miniprogramRoot, "uniapp/dist/build/mp-weixin/");
  assert.equal(config.appid, "wx9469d5e631279f7b");
});
