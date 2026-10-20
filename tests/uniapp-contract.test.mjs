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
    "pages/signature/index",
    "pages/workbench/index",
    "pages/task-detail/index",
    "pages/reports/index",
    "pages/profile/index",
    "pages/risk-survey/index",
    "pages/service-report/index",
    "pages/password/index",
  ]);
  assert.equal(pages.globalStyle.navigationStyle, "custom");
  assert.equal(pages.pages[1].style.pageOrientation, "landscape");
  assert.equal(pages.pages[1].style.disableScroll, true);
  assert.match(manifest, /"appid"\s*:\s*"wx9469d5e631279f7b"/);
  assert.match(manifest, /"urlCheck"\s*:\s*true/);
  assert.match(manifest, /"versionName"\s*:\s*"3\.0\.5"/);
  assert.match(manifest, /"versionCode"\s*:\s*"305"/);
});

test("survey engineer role is labelled 勘测工程师 in the field client", () => {
  const present = read("src/utils/present.ts");

  assert.match(present, /service_engineer:\s*"勘测工程师"/);
  assert.match(present, /survey_engineer:\s*"勘测工程师"/);
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
    "/api/templates",
    "/review",
    "/checkin",
    "/checkout",
  ]) {
    assert.match(api, new RegExp(endpoint.replaceAll("/", "\\/")));
  }
  assert.match(api, /https:\/\/sunrgw\.cn/);
  assert.match(api, /uni\.uploadFile/);
  assert.match(api, /engineer_id/);
  assert.match(pdf, /\/api\/risk-surveys\/\$\{id\}\/pdf/);
  assert.match(pdf, /\/api\/service-reports\/\$\{id\}\/pdf/);
  assert.match(auth, /access_token/);
  assert.match(auth, /token/);
});

test("workbench and archive render server data instead of local fixtures", () => {
  const workbench = read("src/pages/workbench/index.vue");
  const reports = read("src/pages/reports/index.vue");
  const present = read("src/utils/present.ts");

  assert.match(workbench, /getWorkOrders/);
  assert.match(workbench, /getServiceReports/);
  assert.match(workbench, /ownTasks/);
  assert.match(workbench, /roleMode/);
  assert.match(workbench, /activeGroup/);
  assert.match(workbench, /groupOptions/);
  assert.match(present, /待处理/);
  assert.match(present, /进行中/);
  assert.match(present, /已完成/);
  assert.match(reports, /getRiskSurveys/);
  assert.match(reports, /getServiceReports/);
  assert.match(reports, /openReportPdf/);
  assert.doesNotMatch(workbench, /mockTasks|data\/mock/);
  assert.doesNotMatch(reports, /mockReports|data\/mock/);
});

test("survey and sealing roles have separate navigation and own-task scopes", () => {
  const roles = read("src/utils/roles.ts");
  const tabbar = read("src/components/AppTabBar.vue");
  const workbench = read("src/pages/workbench/index.vue");
  const detail = read("src/pages/task-detail/index.vue");
  const survey = read("src/pages/risk-survey/index.vue");
  const sealing = read("src/pages/service-report/index.vue");
  const reports = read("src/pages/reports/index.vue");

  assert.match(roles, /"sealing_engineer"/);
  assert.match(roles, /"engineer"/);
  assert.match(roles, /export function roleMode/);
  assert.match(roles, /export function ownTasks/);
  assert.match(roles, /export function fieldHome/);
  assert.match(roles, /isCompletedTask/);
  assert.match(roles, /engineer_id/);
  assert.match(roles, /supervisor_id/);
  assert.match(tabbar, /mode === "survey"/);
  assert.match(tabbar, /mode === "sealing"/);
  assert.match(workbench, /未完成/);
  assert.match(workbench, /已完成/);
  assert.match(workbench, /roleView\.value === "survey"/);
  assert.match(workbench, /roleView\.value === "sealing"/);
  assert.match(detail, /visibleStepKeys/);
  assert.match(detail, /surveyApproval/);
  assert.match(detail, /generateReport/);
  assert.match(survey, /canUseSurvey/);
  assert.match(sealing, /canUseSealing/);
  assert.match(reports, /canUseReports/);
});

test("branding and personnel images reuse backend-facing assets and avatar rules", () => {
  const brand = read("src/utils/brand.ts");
  const brandLogo = read("src/components/BrandLogo.vue");
  const avatar = read("src/components/CartoonAvatar.vue");
  const workbench = read("src/pages/workbench/index.vue");
  const profile = read("src/pages/profile/index.vue");
  const login = read("src/pages/login/index.vue");

  assert.match(brand, /getTemplates/);
  assert.match(brand, /logo_url/);
  assert.match(brand, /company_name/);
  assert.match(brandLogo, /brandState\.logo_url/);
  assert.match(brandLogo, /brand-fallback/);
  assert.match(avatar, /hashString/);
  assert.match(avatar, /skins/);
  assert.match(avatar, /shirts/);
  assert.match(workbench, /BrandLogo/);
  assert.match(workbench, /CartoonAvatar/);
  assert.match(workbench, /ensureBrand/);
  assert.match(profile, /CartoonAvatar/);
  assert.match(login, /BrandLogo/);
});

test("login keeps a focused business layout without marketing content", () => {
  const login = read("src/pages/login/index.vue");

  assert.match(login, /ensureBrand/);
  assert.match(login, /class="login-brand-row"/);
  assert.match(login, /现场服务工作台/);
  assert.match(login, /class="login-form card"/);
  assert.equal((login.match(/class="login-input"/g) || []).length, 2);
  assert.equal((login.match(/class="login-submit"/g) || []).length, 1);
  assert.match(login, /class="login-help"/);
  assert.match(login, /showResetHelp/);
  assert.match(login, /login\(identifier\.value\.trim\(\), password\.value\)/);
  assert.match(login, /background:\s*#f2f6f3/);
  assert.match(login, /\.login-submit\s*\{[\s\S]*?background:\s*#103b2d/);
  assert.doesNotMatch(
    login,
    /FIELD OPERATIONS|现场协同|把每一次现场记录|任务与风险统一查看|照片、签字现场留存|报告自动归档/,
  );
  assert.doesNotMatch(login, /hero-(?:points|title|kicker)|login-sheet|form-head/);
});

test("workbench brand title is enlarged for field readability", () => {
  const workbench = read("src/pages/workbench/index.vue");

  assert.match(workbench, /:size="34"/);
  assert.match(workbench, /:name-size="15"/);
  assert.match(workbench, /\.page-title\s*\{[\s\S]*?font-size:\s*42rpx/);
  assert.match(workbench, /class="metric-strip"/);
});

test("the field workflow follows survey approval, dispatch, check-in, sealing and report generation", () => {
  const workflow = read("src/utils/workflow.ts");
  const detail = read("src/pages/task-detail/index.vue");
  const api = read("src/utils/api.ts");

  for (const label of [
    "现场勘测",
    "双签并生成报告",
    "审批勘测报告",
    "进入封堵清单",
    "派单给封堵工程师",
    "封堵接单",
    "现场签到",
    "施工前影像",
    "施工后影像",
    "封堵报告双签",
    "封堵审批",
    "生成报告",
  ]) {
    assert.match(workflow, new RegExp(label));
  }
  assert.match(workflow, /relatedRiskSurvey/);
  assert.match(workflow, /relatedServiceReport/);
  assert.match(workflow, /surveyReportGenerated/);
  assert.match(workflow, /sealingListPayload/);
  assert.match(workflow, /dispatchUpdatePayload/);
  assert.match(workflow, /status: "assigned"/);
  assert.match(detail, /deriveWorkflow/);
  assert.match(detail, /approveSurvey/);
  assert.match(detail, /dispatchSealing/);
  assert.match(detail, /getPersonnel/);
  assert.match(detail, /openDispatchSheet/);
  assert.match(detail, /sealingListPayload/);
  assert.match(detail, /acceptSealing/);
  assert.match(detail, /checkIn/);
  assert.match(detail, /approveSealing/);
  assert.match(detail, /openReportPdf/);
  assert.match(
    detail,
    /visibleSteps\.value\.filter\(\(step\) => step\.done\)\.length/,
  );
  assert.match(api, /reviewWorkOrder/);
  assert.match(api, /checkinServiceReport/);
});

test("field forms reopen existing survey and sealing records by server id", () => {
  const survey = read("src/pages/risk-survey/index.vue");
  const service = read("src/pages/service-report/index.vue");

  assert.match(survey, /getRiskSurvey/);
  assert.match(survey, /surveyId/);
  assert.match(survey, /saveRiskSurvey\(surveyId\.value/);
  assert.match(service, /getServiceReport/);
  assert.match(service, /reportId/);
  assert.match(service, /saveServiceReport\(reportId\.value/);
  assert.match(service, /originalSignatures/);
});

test("the field client follows an MHP-inspired deep-green service hierarchy", () => {
  const app = read("src/App.vue");
  const tabbar = read("src/components/AppTabBar.vue");
  const workbench = read("src/pages/workbench/index.vue");
  const detail = read("src/pages/task-detail/index.vue");
  const reports = read("src/pages/reports/index.vue");
  const profile = read("src/pages/profile/index.vue");
  const survey = read("src/pages/risk-survey/index.vue");
  const service = read("src/pages/service-report/index.vue");
  const header = read("src/components/PageHeader.vue");

  assert.match(app, /--field-dark:\s*#103b2d/);
  assert.match(app, /--field-accent:\s*#176b52/);
  assert.match(app, /--field-accent-soft:\s*#e6f2ec/);
  assert.match(app, /background:\s*#f2f6f3/);
  assert.match(app, /border-radius:\s*16rpx/);
  assert.match(app, /font-size:\s*32rpx/);
  assert.match(app, /font-size:\s*28rpx/);
  assert.match(tabbar, /background:\s*#ffffff/);
  assert.match(tabbar, /color:\s*#115640/);
  assert.match(header, /background:\s*#f8fbf9/);
  assert.doesNotMatch(header, /dark\?:/);
  assert.match(workbench, /class="workbench-header"/);
  assert.match(workbench, /class="sync-row"/);
  assert.match(workbench, /class="task-accent"/);
  assert.match(detail, /<scroll-view[\s\S]*?scroll-x/);
  assert.match(detail, /class="process-track"/);
  assert.match(reports, /class="archive-summary card"/);
  assert.match(profile, /class="metric-grid card"/);
  assert.match(survey, /第 \{\{ step \+ 1 \}\} 步 \/ 共 \{\{ steps\.length \}\} 步/);
  assert.match(service, /第 \{\{ step \+ 1 \}\} 步 \/ 共 \{\{ steps\.length \}\} 步/);
  assert.match(workbench, /reportMatchesTask/);
  assert.match(workbench, /taskDisplayStatus/);
  assert.match(tabbar, /label: "任务"/);
  assert.match(tabbar, /label: "勘测"/);
  assert.match(tabbar, /label: "封堵"/);
  assert.match(workbench, /fieldKind/);
  assert.match(workbench, /勘测任务/);
  assert.match(workbench, /封堵任务/);
});

test("survey dual signing generates the report before approval and sealing dispatch", () => {
  const survey = read("src/pages/risk-survey/index.vue");
  const detail = read("src/pages/task-detail/index.vue");
  const present = read("src/utils/present.ts");

  const submitIndex = survey.indexOf("await submitRiskSurvey(activeSurveyId)");
  const generateIndex = survey.indexOf(
    'prepareReportPdf("risk", activeSurveyId)',
  );
  assert.ok(submitIndex >= 0);
  assert.ok(generateIndex > submitIndex);
  assert.match(survey, /勘测报告已生成/);
  assert.match(survey, /审批通过后将进入封堵清单/);
  assert.match(detail, /ensureSealingList/);
  assert.match(detail, /saveServiceReport\(0, sealingListPayload/);
  assert.match(detail, /选择封堵工程师/);
  assert.match(detail, /role: "sealing_engineer"/);
  assert.match(present, /unassigned:\s*\{\s*label:\s*"待派单"/);
});

test("survey photos use the 100-image cap and a five-column wrapping grid", () => {
  const photoGrid = read("src/components/PhotoGrid.vue");
  const survey = read("src/pages/risk-survey/index.vue");
  const serviceReport = read("src/pages/service-report/index.vue");

  assert.match(photoGrid, /width:\s*calc\(20% - 8rpx\)/);
  assert.match(photoGrid, /gap:\s*10rpx/);
  assert.match(photoGrid, /:max="100"|max:\s*100/);
  assert.match(survey, /<PhotoGrid[\s\S]*:max="100"/);
  assert.match(survey, /结构风险图片/);
  assert.doesNotMatch(survey, /封堵前图片|封堵后图片/);
  assert.match(serviceReport, /封堵前图片/);
  assert.match(serviceReport, /封堵后图片/);
});

test("survey and sealing flows capture both handwritten signatures", () => {
  const signaturePad = read("src/components/SignaturePad.vue");
  const signaturePage = read("src/pages/signature/index.vue");
  const api = read("src/utils/api.ts");
  const themeConfig = read("src/config/index.js");
  const survey = read("src/pages/risk-survey/index.vue");
  const serviceReport = read("src/pages/service-report/index.vue");

  assert.match(signaturePad, /uni\.navigateTo/);
  assert.match(signaturePad, /props\.role/);
  assert.match(signaturePad, /SIGNATURE_COMPLETE_EVENT/);
  assert.match(signaturePad, /<button[\s\S]*?class="signature-trigger"/);
  assert.match(signaturePad, /class="signature-result"/);
  assert.match(signaturePad, /data-signature-state/);
  assert.match(signaturePad, /uploadSignature/);
  assert.doesNotMatch(signaturePad, /signature-card/);
  assert.match(signaturePage, /<canvas/);
  assert.match(signaturePage, /@touchstart/);
  assert.match(signaturePage, /canvasToTempFilePath/);
  assert.match(signaturePage, /nativeCanvas/);
  assert.match(signaturePage, /toDataURL/);
  assert.match(signaturePage, /SIGNATURE_EXPORT_SCALE/);
  assert.match(signaturePage, /签字时间/);
  assert.match(signaturePage, /签字部门/);
  assert.match(signaturePage, /maxlength="10"/);
  assert.match(signaturePage, /onBackPress/);
  assert.match(signaturePage, /class="scene-button cancel-button"/);
  assert.match(signaturePage, /class="scene-button rewrite-button"/);
  assert.match(signaturePage, /class="scene-button complete-button"/);
  assert.match(signaturePage, /lockOrientation\("landscape-primary"\)/);
  assert.match(signaturePage, /setFullscreen\(true\)/);
  assert.match(signaturePage, /getDecorView/);
  assert.match(signaturePage, /setSystemUiVisibility/);
  assert.match(signaturePage, /lockOrientation\("portrait-primary"\)/);
  assert.match(signaturePage, /signature-canvas-host/);
  assert.match(signaturePage, /signature-placeholder/);
  assert.match(signaturePage, /signature-meta/);
  assert.match(signaturePage, /onRenderExportBridge/);
  assert.match(signaturePage, /clearRequest/);
  assert.match(signaturePage, /markInk/);
  assert.match(themeConfig, /employee:\s*\{[\s\S]*?background:\s*"#d3e3fd"/);
  assert.match(themeConfig, /customer:\s*\{[\s\S]*?background:\s*"#f9e4e3"/);
  assert.match(themeConfig, /brand:\s*\{/);
  assert.match(survey, /勘测人员签字确认/);
  assert.match(survey, /客户代表签字/);
  assert.match(survey, /role="employee"/);
  assert.match(survey, /role="customer"/);
  assert.match(survey, /:upload="uploadSignature"/);
  assert.match(survey, /v-model:department="form\.customerSignatureDepartment"/);
  assert.match(survey, /请完成双方手写签字/);
  assert.match(serviceReport, /封堵责任人签字/);
  assert.match(serviceReport, /客户代表签字/);
  assert.match(serviceReport, /role="employee"/);
  assert.match(serviceReport, /role="customer"/);
  assert.match(serviceReport, /:upload="uploadSignature"/);
  assert.match(
    serviceReport,
    /v-model:department="form\.customerSignatureDepartment"/,
  );
  assert.match(serviceReport, /请完成双方手写签字/);
  assert.match(survey, /saveRiskSurvey/);
  assert.match(survey, /submitRiskSurvey/);
  assert.match(serviceReport, /saveServiceReport/);
  assert.match(api, /prepareUploadPath/);
  assert.match(api, /nativeObj\.Bitmap/);
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
  assert.equal(config.libVersion, "2.21.2");
  assert.match(read("scripts/finalize-mp-weixin.mjs"), /libVersion\s*=\s*"2\.21\.2"/);
});
