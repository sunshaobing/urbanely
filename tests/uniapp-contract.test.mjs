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
    "pages/checkin/index",
    "pages/reports/index",
    "pages/profile/index",
    "pages/risk-survey/index",
    "pages/service-report/index",
    "pages/password/index",
    "pages/agreement/index",
  ]);
  assert.equal(pages.globalStyle.navigationStyle, "custom");
  assert.equal(pages.pages[1].style.pageOrientation, "landscape");
  assert.equal(pages.pages[1].style.disableScroll, true);
  assert.match(manifest, /"appid"\s*:\s*"wx9469d5e631279f7b"/);
  assert.match(manifest, /"urlCheck"\s*:\s*true/);
  assert.match(manifest, /"versionName"\s*:\s*"3\.2\.7"/);
  assert.match(manifest, /"versionCode"\s*:\s*"327"/);
  assert.match(manifest, /"appid"\s*:\s*"__UNI__[A-F0-9]+"/);
  assert.match(manifest, /"packagename"\s*:\s*"cn\.sunrgw\.pco"/);
  assert.match(manifest, /"NSLocationWhenInUseUsageDescription"/);
  assert.match(manifest, /"NSCameraUsageDescription"/);
  assert.match(manifest, /"NSPhotoLibraryUsageDescription"/);
  assert.match(
    manifest,
    /"appstore"\s*:\s*"src\/static\/icons\/app-1024\.png"/,
  );
  assert.match(manifest, /"idfa"\s*:\s*false/);
  assert.match(manifest, /android\.permission\.ACCESS_FINE_LOCATION/);
  assert.match(manifest, /android\.permission\.CAMERA/);
  assert.match(manifest, /"Geolocation"/);
  for (const icon of [72, 96, 144, 192]) {
    assert.ok(
      fs.existsSync(
        new URL(`src/static/icons/app-${icon}.png`, root),
      ),
    );
  }
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
  assert.match(pdf, /export function absoluteReportUrl/);
  assert.match(pdf, /url: absoluteReportUrl\(url\)/);
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
  assert.match(login, /background:\s*#f3f6f4/);
  assert.match(login, /\.login-submit\s*\{[\s\S]*?background:\s*#103b2d/);
  assert.doesNotMatch(
    login,
    /FIELD OPERATIONS|现场协同|把每一次现场记录|任务与风险统一查看|照片、签字现场留存|报告自动归档/,
  );
  assert.doesNotMatch(login, /hero-(?:points|title|kicker)|login-sheet|form-head/);
});

test("workbench follows the approved task-first hierarchy", () => {
  const workbench = read("src/pages/workbench/index.vue");

  assert.match(workbench, /:size="36"/);
  assert.match(workbench, /:name-size="16"/);
  assert.match(workbench, /今天还有 \$\{openCount\.value\} 个任务/);
  assert.match(workbench, /class="task-action"/);
  assert.match(workbench, /task-card--featured/);
  assert.match(workbench, /class="task-feature-label"/);
  assert.match(workbench, /\.page-title\s*\{[\s\S]*?font-size:\s*max\(20px,\s*38rpx\)/);
  assert.match(workbench, /\.task-action\s*\{[\s\S]*?background:\s*#145a3a/);
  assert.doesNotMatch(workbench, /class="metric-strip"/);
});

test("workbench status tabs and task cards use uniform, uncrowded spacing", () => {
  const workbench = read("src/pages/workbench/index.vue");

  assert.match(
    workbench,
    /\.status-tabs\s*\{[\s\S]*?grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/,
  );
  assert.match(
    workbench,
    /\.task-list,[\s\S]*?gap:\s*18rpx;[\s\S]*?margin-top:\s*20rpx;/,
  );
  assert.match(workbench, /\.status-tab\s*\{[\s\S]*?min-height:\s*48px/);
  assert.match(workbench, /\.task-customer\s*\{[\s\S]*?font-size:\s*max\(16px,\s*30rpx\)/);
  assert.match(workbench, /#ifdef APP-PLUS[\s\S]*?\.workbench-header/);
});

test("profile quick metrics stay in one row and wrap only when very narrow", () => {
  const profile = read("src/pages/profile/index.vue");

  assert.match(profile, /class="metric-grid card"/);
  assert.match(
    profile,
    /\.metric-card\s*\{[\s\S]*?width:\s*25%;[\s\S]*?min-height:\s*112rpx;[\s\S]*?border-right:\s*1rpx solid #e5ece7;/,
  );
  assert.match(
    profile,
    /@media\s*\(max-width:\s*300px\)[\s\S]*?\.metric-card\s*\{[\s\S]*?width:\s*50%;/,
  );
  for (const label of ["本月任务", "风险勘测", "封堵记录", "到期复检"]) {
    assert.match(profile, new RegExp(label));
  }
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
    "现场签出",
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
  assert.match(detail, /openCheckin/);
  assert.match(detail, /checkout/);
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

  assert.match(app, /--field-dark:\s*#113b2d/);
  assert.match(app, /--field-accent:\s*#17654b/);
  assert.match(app, /--field-accent-soft:\s*#e7f1eb/);
  assert.match(app, /background:\s*#f3f6f4/);
  assert.match(app, /border-radius:\s*24rpx\s*!important/);
  assert.match(app, /button[\s\S]*?border-radius:\s*999px\s*!important/);
  assert.match(app, /font-size:\s*max\(15px,\s*30rpx\)/);
  assert.match(app, /font-size:\s*max\(13\.5px,\s*28rpx\)/);
  assert.match(
    app,
    /font-family:\s*"PingFang SC",\s*"Microsoft YaHei",\s*"Noto Sans CJK SC"/,
  );
  assert.match(tabbar, /background:\s*#ffffff/);
  assert.match(tabbar, /color:\s*#115640/);
  assert.match(header, /background:\s*#ffffff/);
  assert.doesNotMatch(header, /dark\?:/);
  assert.match(workbench, /class="workbench-header"/);
  assert.match(workbench, /class="sync-row"/);
  assert.match(workbench, /class="task-action"/);
  assert.match(detail, /<scroll-view[\s\S]*?scroll-x/);
  assert.match(detail, /class="process-track"/);
  assert.match(reports, /class="archive-summary card"/);
  assert.match(profile, /class="metric-grid card"/);
  assert.match(survey, /第 \{\{ step \+ 1 \}\} 步 \/ 共 \{\{ steps\.length \}\} 步/);
  assert.match(service, /第 \{\{ step \+ 1 \}\} 步 \/ 共 \{\{ steps\.length \}\} 步/);
  assert.match(survey, /"现场信息",[\s\S]*?"检查范围",[\s\S]*?"风险点",[\s\S]*?"现场照片",[\s\S]*?"治理方案",[\s\S]*?"签字提交"/);
  assert.match(service, /"服务信息",[\s\S]*?"材料与部位",[\s\S]*?"封堵前照片",[\s\S]*?"封堵后照片",[\s\S]*?"服务记录",[\s\S]*?"双方签字",[\s\S]*?"签出确认"/);
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

test("both field roles check in from the dedicated page with high-accuracy GPS", () => {
  const location = read("src/utils/location.ts");
  const api = read("src/utils/api.ts");
  const detail = read("src/pages/task-detail/index.vue");
  const checkin = read("src/pages/checkin/index.vue");
  const workflow = read("src/utils/workflow.ts");

  assert.match(location, /highAccuracy:\s*true/);
  assert.match(location, /isHighAccuracy:\s*attempt\.highAccuracy/);
  assert.match(location, /highAccuracyExpireTime/);
  assert.match(location, /MAX_ACCURACY_METERS/);
  assert.match(location, /定位精度不足/);
  assert.doesNotMatch(detail, /service_address \|\| "现场签到"/);
  assert.match(checkin, /\? "sealing" : "surveyor"/);
  assert.match(checkin, /const role = isSealing\.value/);
  assert.match(checkin, /checkinWorkOrder/);
  assert.match(detail, /pages\/checkin\/index/);
  assert.match(api, /\/api\/workorders\/\$\{orderId\}\/checkin/);
  assert.match(api, /latitude: coordinates\?\.latitude/);
  assert.match(workflow, /surveyCheckin/);
  assert.match(workflow, /到达签到/);
});

test("sealing signatures use the backend service role", () => {
  const service = read("src/pages/service-report/index.vue");

  assert.match(service, /role: "service"/);
  assert.doesNotMatch(service, /role: "responsible"/);
  assert.match(service, /signServiceReport/);
});

test("sealing checkout requires a camera photo and precise location before submission", () => {
  const service = read("src/pages/service-report/index.vue");
  const checkoutIndex = service.indexOf("await checkoutServiceReport(");
  const submitIndex = service.indexOf("await submitServiceReport(activeReportId)");

  assert.match(service, /checkoutServiceReport/);
  assert.match(service, /getPreciseLocation/);
  assert.match(service, /sourceType:\s*\["camera"\]/);
  assert.match(service, /签出拍照确认/);
  assert.match(service, /请拍摄签出确认照片/);
  assert.match(service, /checkoutPhotoUrl/);
  assert.ok(checkoutIndex >= 0);
  assert.ok(submitIndex > checkoutIndex);
});

test("survey and sealing payloads retain every report field exposed by the forms", () => {
  const survey = read("src/pages/risk-survey/index.vue");
  const service = read("src/pages/service-report/index.vue");

  for (const field of [
    "survey_range",
    "structure_conditions",
    "pest_evidence",
    "comprehensive_plan",
    "disinfection_plan",
    "environment_suggestions",
    "prevention_measures",
    "review_date",
    "risk_level",
    "conclusion",
    "items",
    "photos",
    "signatures",
  ]) {
    assert.match(survey, new RegExp(field));
  }

  for (const field of [
    "customer_name",
    "address",
    "contact",
    "contact_phone",
    "service_project",
    "task_tag",
    "service_date",
    "start_time",
    "end_time",
    "service_person",
    "content",
    "follow_up",
    "risk_follow",
    "customer_comment",
    "materials",
    "photos",
    "risk_photos",
  ]) {
    assert.match(service, new RegExp(field));
  }
  assert.match(service, /material\.target/);
  assert.match(service, /material\.area_size/);
  assert.match(service, /包含服务信息、封堵部位、材料与用量、封堵前照片、封堵后照片、服务记录、客户意见、双方签字、到场签到、签出时间和签出照片/);
});

test("login requires agreement to the service and privacy policies", () => {
  const login = read("src/pages/login/index.vue");
  const agreement = read("src/pages/agreement/index.vue");
  const pages = JSON.parse(read("src/pages.json"));

  assert.match(login, /const agreed = ref\(false\)/);
  assert.match(login, /agreed\.value/);
  assert.match(login, /openAgreement\('service'\)/);
  assert.match(login, /openAgreement\('privacy'\)/);
  assert.match(login, /《用户服务协议》/);
  assert.match(login, /《隐私政策》/);
  assert.match(login, /agreement-check/);
  assert.match(agreement, /用户服务协议/);
  assert.match(agreement, /隐私政策/);
  assert.match(agreement, /位置权限/);
  assert.match(agreement, /相机与相册权限/);
  assert.ok(
    pages.pages.some((page) => page.path === "pages/agreement/index"),
  );
});

test("official WeChat privacy authorization precedes data collection", () => {
  const login = read("src/pages/login/index.vue");
  const privacy = read("src/utils/privacy.ts");
  const location = read("src/utils/location.ts");
  const photoGrid = read("src/components/PhotoGrid.vue");
  const agreement = read("src/pages/agreement/index.vue");
  const profile = read("src/pages/profile/index.vue");

  assert.match(privacy, /requirePrivacyAuthorize/);
  assert.match(login, /ensurePrivacyAuthorized/);
  assert.match(location, /ensurePrivacyAuthorized/);
  assert.match(photoGrid, /ensurePrivacyAuthorized/);
  assert.match(agreement, /运营者：上海申汰实业有限公司/);
  assert.match(agreement, /授权与同意/);
  assert.match(profile, /openAgreement\('service'\)/);
  assert.match(profile, /openAgreement\('privacy'\)/);
});

test("app login restores the saved session and requests a long-lived token", () => {
  const login = read("src/pages/login/index.vue");
  const api = read("src/utils/api.ts");

  assert.match(login, /getSession\(\)\?\.token/);
  assert.match(
    login,
    /reLaunch\(\{\s*url:\s*"\/pages\/workbench\/index"\s*\}\)/,
  );
  assert.match(api, /client:\s*"app"/);
});

test("two-step form actions remain centered and uncrowded", () => {
  for (const page of ["risk-survey", "service-report"]) {
    const source = read(`src/pages/${page}/index.vue`);
    assert.match(
      source,
      /\.bottom-secondary\s*\{[\s\S]*?display:\s*flex;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;/,
    );
    assert.match(source, /class="bottom-secondary-stack"/);
    assert.match(source, /class="btn-primary bottom-primary"/);
  }
});

test("survey and sealing drafts save locally on every change and sync automatically", () => {
  const survey = read("src/pages/risk-survey/index.vue");
  const service = read("src/pages/service-report/index.vue");

  for (const source of [survey, service]) {
    assert.match(source, /watch\(form, scheduleAutoSave, \{ deep: true, flush: "sync" \}\)/);
    assert.match(source, /writeLocalDraft\(draftKey\(\), draftData\(\)\)/);
    assert.match(source, /setTimeout\([\s\S]*?persistDraft\("auto"\)[\s\S]*?800\)/);
    assert.match(source, /await persistDraft\("auto"\)/);
    assert.match(source, /title: "保存成功"/);
    assert.match(source, /class="auto-save-row"/);
  }
  assert.match(survey, /title: "勘测提交成功"/);
  assert.match(service, /title: "封堵提交成功"/);
});

test("mobile controls use a soft rounded business surface", () => {
  const app = read("src/App.vue");
  const header = read("src/components/PageHeader.vue");
  const tabbar = read("src/components/AppTabBar.vue");
  const workbench = read("src/pages/workbench/index.vue");
  const service = read("src/pages/service-report/index.vue");
  const reports = read("src/pages/reports/index.vue");

  assert.match(app, /button\s*\{[\s\S]*?border-radius:\s*999px\s*!important/);
  assert.match(app, /\.card\s*\{[\s\S]*?border-radius:\s*24rpx\s*!important/);
  assert.match(app, /\.field-input,[\s\S]*?border-radius:\s*16rpx\s*!important/);
  assert.match(header, /border-radius:\s*0 0 24rpx 24rpx/);
  assert.match(header, /\.header-back\s*\{[\s\S]*?border-radius:\s*999px/);
  assert.match(tabbar, /\.app-tab-icon\s*\{[\s\S]*?border-radius:\s*999px/);
  assert.match(workbench, /\.status-tab\s*\{[\s\S]*?border-radius:\s*999px/);
  assert.match(workbench, /\.task-action\s*\{[\s\S]*?border-radius:\s*999px/);
  assert.match(service, /\.picker-value,[\s\S]*?border-radius:\s*999px/);
  assert.match(reports, /\.archive-tabs,[\s\S]*?border-radius:\s*999px/);
});

test("mobile redesign keeps a centered layout with readable tap targets", () => {
  const app = read("src/App.vue");
  const header = read("src/components/PageHeader.vue");
  const tabbar = read("src/components/AppTabBar.vue");
  const checkin = read("src/pages/checkin/index.vue");

  assert.match(app, /\.page-content\s*\{[\s\S]*?max-width:\s*820rpx;[\s\S]*?margin:\s*0 auto/);
  assert.match(app, /\.btn-primary,[\s\S]*?min-height:\s*48px/);
  assert.match(app, /font-size:\s*max\(13\.5px,\s*28rpx\)/);
  assert.match(header, /\.header-copy\s*\{[\s\S]*?text-align:\s*center/);
  assert.match(header, /\.header-back\s*\{[\s\S]*?width:\s*48px;[\s\S]*?height:\s*48px/);
  assert.match(tabbar, /font-size:\s*max\(12px,\s*20rpx\)/);
  assert.match(checkin, /class="checkin-panel card"/);
  assert.match(checkin, /class="btn-primary checkin-button"/);
  assert.match(checkin, /\.checkin-button\s*\{[\s\S]*?min-height:\s*52px/);
  assert.match(checkin, /用于确认本次服务到达现场/);
});

test("picked photos persist and upload before temporary files expire", () => {
  const grid = read("src/components/PhotoGrid.vue");
  const files = read("src/utils/files.ts");
  const api = read("src/utils/api.ts");
  const survey = read("src/pages/risk-survey/index.vue");
  const service = read("src/pages/service-report/index.vue");

  assert.match(grid, /persistLocalFile/);
  assert.match(grid, /props\.upload/);
  assert.match(grid, /emit\("update:photos", \[\.\.\.next\]\)/);
  assert.match(survey, /<PhotoGrid[\s\S]*?:upload="uploadPhoto"/);
  assert.match(service, /<PhotoGrid[\s\S]*?:upload="uploadPhoto"/);
  assert.match(files, /copyFileSync/);
  assert.match(files, /uni\.saveFile/);
  assert.match(api, /persistLocalFile\(filePath\)/);
  assert.match(api, /UploadTransportError/);
  assert.match(api, /const candidates: string\[\] = \[\]/);
  assert.match(api, /candidates\.push\(filePath\)/);
  assert.match(api, /candidates\.push\(uploadPath\)/);
  assert.match(api, /图片文件未上传成功/);
  assert.match(grid, /title: "照片上传失败"/);
  assert.match(grid, /title: permissionDenied \? "需要相机或相册权限" : "无法选择照片"/);
  assert.match(grid, /uni\.openSetting/);
});

test("survey submission reopens an existing record instead of creating a duplicate", () => {
  const survey = read("src/pages/risk-survey/index.vue");

  assert.match(survey, /getRiskSurveys/);
  assert.match(survey, /normalizeRiskSurveys/);
  assert.match(survey, /item\.code === task\.value\?\.report_no/);
  assert.match(survey, /surveyId\.value = existing\.id/);
  assert.match(survey, /surveyId\.value = activeSurveyId/);
  assert.match(survey, /surveyStatus\.value = "submitted"/);
});

test("workbench moves submitted surveys into the completed group", () => {
  const workbench = read("src/pages/workbench/index.vue");

  assert.match(workbench, /getRiskSurveys/);
  assert.match(workbench, /normalizeRiskSurveys/);
  assert.match(workbench, /relatedRiskSurvey/);
  assert.match(workbench, /function taskIsCompleted/);
  assert.match(workbench, /"submitted", "reviewed", "approved", "completed"/);
  assert.match(workbench, /const isSealingTask =[\s\S]*task\.service_type\?\.includes\("封堵"\)/);
  assert.match(workbench, /if \(isSealingTask\) \{[\s\S]*report\?\.status/);
  assert.match(workbench, /taskIsCompleted\(task\)/);
});

test("workbench auto-refreshes newly dispatched tasks", () => {
  const workbench = read("src/pages/workbench/index.vue");

  assert.match(workbench, /startAutoRefresh/);
  assert.match(workbench, /setInterval/);
  assert.match(workbench, /30_000/);
  assert.match(workbench, /onHide\(stopAutoRefresh\)/);
  assert.match(workbench, /onUnload\(stopAutoRefresh\)/);
});

test("sealing approval is driven by the service report, not work-order review", () => {
  const detail = read("src/pages/task-detail/index.vue");

  assert.doesNotMatch(detail, /reviewWorkOrder/);
  assert.match(
    detail,
    /async function approveSealing\(\)[\s\S]*saveServiceReport\([\s\S]*status: "approved"/,
  );
});

test("location check-in declares WeChat privacy permission and retries", () => {
  const manifest = read("src/manifest.json");
  const location = read("src/utils/location.ts");
  const privacy = read("src/utils/privacy.ts");

  assert.match(manifest, /requiredPrivateInfos/);
  assert.match(manifest, /getLocation/);
  assert.match(manifest, /scope\.userLocation/);
  assert.match(manifest, /用于到达客户门店后的现场考勤打卡/);
  assert.match(privacy, /requirePrivacyAuthorize/);
  assert.match(location, /ensurePrivacyAuthorized/);
  assert.match(location, /LOCATION_ATTEMPTS/);
  assert.match(location, /type: "wgs84"/);
  assert.match(location, /highAccuracyExpireTime:\s*attempt\.highAccuracy\s*\?\s*15000/);
  assert.match(location, /uni\.authorize/);
  assert.match(
    read("src/pages/agreement/index.vue"),
    /用于核验是否到达任务指定的客户门店并生成现场考勤签到记录/,
  );
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
