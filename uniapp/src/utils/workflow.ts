import { nowTime, today } from "./present";
import type {
  RiskSurvey,
  ServiceReport,
  WorkOrder,
} from "./types";

export type WorkflowStageKey =
  | "survey"
  | "surveySign"
  | "surveyApproval"
  | "sealingList"
  | "dispatch"
  | "accept"
  | "checkin"
  | "beforePhotos"
  | "afterPhotos"
  | "sealSign"
  | "sealApproval"
  | "generateReport";

export interface WorkflowStep {
  key: WorkflowStageKey;
  label: string;
  hint: string;
  done: boolean;
}

const approvedStatuses = new Set(["approved", "reviewed", "accepted", "completed"]);
const acceptedStatuses = new Set([
  "accepted",
  "checked_in",
  "in_progress",
  "submitted",
  "approved",
  "completed",
]);

function signaturesComplete(signatures: Array<unknown> | undefined) {
  return (signatures?.length ?? 0) >= 2;
}

function reportCheckedIn(report: ServiceReport | null) {
  if (!report) return false;
  return Boolean(
    report.checkin_at ||
      report.checked_in_at ||
      report.checkin_location ||
      ["checked_in", "in_progress", "submitted", "approved", "completed"].includes(
        report.status,
      ),
  );
}

export function relatedRiskSurvey(task: WorkOrder, surveys: RiskSurvey[]) {
  if (task.risk_survey_id) {
    const direct = surveys.find((survey) => survey.id === task.risk_survey_id);
    if (direct) return direct;
  }
  const exact = surveys
    .filter((survey) => survey.code === task.report_no)
    .sort((left, right) => right.id - left.id);
  if (exact.length) return exact[0];
  const customerMatches = task.customer_id
    ? surveys.filter((survey) => survey.customer_id === task.customer_id)
    : [];
  return customerMatches.length === 1 ? customerMatches[0] : null;
}

export function relatedServiceReport(
  task: WorkOrder,
  reports: ServiceReport[],
) {
  if (task.service_report_id) {
    const direct = reports.find((report) => report.id === task.service_report_id);
    if (direct) return direct;
  }
  const exact = reports
    .filter(
      (report) =>
        report.work_order_id === task.id ||
        report.work_order_no === task.report_no ||
        report.content?.includes(task.report_no) ||
        report.task_tag?.includes(task.report_no),
    )
    .sort((left, right) => right.id - left.id);
  if (exact.length) return exact[0];
  const customerMatches = task.customer_id
    ? reports.filter((report) => report.customer_id === task.customer_id)
    : [];
  return customerMatches.length === 1 ? customerMatches[0] : null;
}

export function deriveWorkflow(
  task: WorkOrder,
  survey: RiskSurvey | null,
  report: ServiceReport | null,
): { steps: WorkflowStep[]; currentIndex: number } {
  const surveyDone = Boolean(survey);
  const surveySigned = signaturesComplete(survey?.signatures);
  const surveyReportGenerated = Boolean(
    survey &&
      surveySigned &&
      (survey.pdf_url ||
        ["submitted", "reviewed", "approved", "completed"].includes(
          survey.status,
        )),
  );
  const surveyApproved = Boolean(
    survey && ["approved", "reviewed"].includes(survey.status),
  );
  const sealingListed = Boolean(report);
  const dispatched = Boolean(report);
  const assigned = Boolean(
    report?.service_person &&
      [
        "assigned",
        "accepted",
        "checked_in",
        "in_progress",
        "submitted",
        "approved",
        "completed",
      ].includes(report.status),
  );
  const accepted = Boolean(report && acceptedStatuses.has(report.status));
  const checkedIn = reportCheckedIn(report);
  const beforeDone = Boolean(report?.risk_photos?.length);
  const afterDone = Boolean(report?.photos?.length);
  const sealSigned = signaturesComplete(report?.signatures);
  const sealApproved = Boolean(
    report &&
      (approvedStatuses.has(report.status) ||
        task.status === "approved" ||
        task.status === "completed"),
  );
  const reportGenerated = Boolean(
    report?.pdf_url || report?.status === "completed",
  );

  const steps: WorkflowStep[] = [
    {
      key: "survey",
      label: "现场勘测",
      hint: surveyDone ? "勘测记录已建立" : "填写现场信息与风险点",
      done: surveyDone,
    },
    {
      key: "surveySign",
      label: "双签并生成报告",
      hint: surveyReportGenerated
        ? "双方签字完成，完整报告已生成"
        : "完成双方手写签字后自动生成报告",
      done: surveyReportGenerated,
    },
    {
      key: "surveyApproval",
      label: "审批勘测报告",
      hint: surveyApproved ? "勘测报告审批通过" : "等待管理员审批",
      done: surveyApproved,
    },
    {
      key: "sealingList",
      label: "进入封堵清单",
      hint: sealingListed
        ? "封堵任务已进入待派单清单"
        : "勘测审批通过后自动进入封堵清单",
      done: sealingListed,
    },
    {
      key: "dispatch",
      label: "派单给封堵工程师",
      hint: assigned
        ? `已派给 ${report?.service_person}`
        : dispatched
          ? "请管理员选择封堵工程师"
          : "进入封堵清单后选择工程师",
      done: assigned,
    },
    {
      key: "accept",
      label: "封堵接单",
      hint: accepted ? "封堵责任人已接单" : "等待封堵责任人接单",
      done: accepted,
    },
    {
      key: "checkin",
      label: "现场签到",
      hint: checkedIn ? "已记录到场时间与位置" : "到达现场后完成签到",
      done: checkedIn,
    },
    {
      key: "beforePhotos",
      label: "施工前影像",
      hint: beforeDone
        ? `${report?.risk_photos?.length ?? 0} 张施工前图片`
        : "拍摄封堵前孔洞全貌",
      done: beforeDone,
    },
    {
      key: "afterPhotos",
      label: "施工后影像",
      hint: afterDone
        ? `${report?.photos?.length ?? 0} 张施工后图片`
        : "拍摄封堵完成和边缘细节",
      done: afterDone,
    },
    {
      key: "sealSign",
      label: "封堵报告双签",
      hint: sealSigned ? "责任人与客户代表已签" : "完成封堵责任人与客户签字",
      done: sealSigned,
    },
    {
      key: "sealApproval",
      label: "封堵审批",
      hint: sealApproved ? "封堵报告已审批" : "提交封堵报告审批",
      done: sealApproved,
    },
    {
      key: "generateReport",
      label: "生成报告",
      hint: reportGenerated ? "报告文件已生成" : "审批后生成并归档 PDF",
      done: reportGenerated,
    },
  ];

  const currentIndex = steps.findIndex((step) => !step.done);
  return {
    steps,
    currentIndex: currentIndex === -1 ? steps.length - 1 : currentIndex,
  };
}

export function sealingListPayload(task: WorkOrder) {
  return {
    customer_id: task.customer_id || 0,
    customer_name: task.customer_name,
    address: task.service_address,
    contact: task.contact,
    contact_phone: task.contact_phone,
    service_project: task.service_type || "结构漏洞封堵",
    task_tag: `封堵待派单 ${task.report_no}`,
    service_date: task.service_date || today(),
    start_time: nowTime(),
    end_time: "",
    service_person: "",
    content: `来源作业单 ${task.report_no}`,
    follow_up: "",
    risk_follow: "",
    customer_comment: "",
    status: "pending",
    materials: task.materials.map((material) => ({
      name: material.material_name,
      qty: material.qty,
      unit: material.unit,
      usage_method: "",
      target: "鼠洞封堵",
      area_size: "",
      region: "",
      sort_order: 0,
    })),
    photos: [],
    risk_photos: [],
  };
}

export function dispatchPayload(task: WorkOrder, engineerName: string) {
  return {
    ...sealingListPayload(task),
    task_tag: `封堵派单 ${task.report_no}`,
    service_person: engineerName,
    status: "assigned",
  };
}

export function dispatchUpdatePayload(
  report: ServiceReport,
  engineerName: string,
) {
  return serviceReportUpdatePayload(report, {
    task_tag: `封堵派单 ${report.task_tag?.replace(/^封堵待派单\s*/, "") || ""}`.trim(),
    service_person: engineerName,
    status: "assigned",
  });
}

export function riskSurveyUpdatePayload(
  survey: RiskSurvey,
  overrides: Record<string, unknown> = {},
) {
  return {
    code: survey.code || "",
    customer_id: survey.customer_id || 0,
    site_id: survey.site_id ?? null,
    employee_id: survey.employee_id ?? null,
    survey_date: survey.survey_date || "",
    survey_time: survey.survey_time || "",
    contact_person: survey.contact_person || "",
    survey_range: survey.survey_range || [],
    structure_conditions: survey.structure_conditions || [],
    pest_evidence: survey.pest_evidence || [],
    comprehensive_plan: survey.comprehensive_plan || "",
    disinfection_plan: survey.disinfection_plan || "",
    environment_suggestions: survey.environment_suggestions || "",
    prevention_measures: survey.prevention_measures || "",
    review_date: survey.review_date || "",
    pest_type: survey.pest_type || "鼠",
    risk_level: survey.risk_level || "中",
    conclusion: survey.conclusion || "",
    status: survey.status || "draft",
    items: survey.items || [],
    photos: survey.photos || [],
    signatures: survey.signatures || [],
    ...overrides,
  };
}

export function serviceReportUpdatePayload(
  report: ServiceReport,
  overrides: Record<string, unknown> = {},
) {
  return {
    customer_id: report.customer_id || 0,
    customer_name: report.customer_name || "",
    address: report.address || "",
    contact: report.contact || "",
    contact_phone: report.contact_phone || "",
    service_project: report.service_project || "结构漏洞封堵",
    task_tag: report.task_tag || "结构封堵",
    service_date: report.service_date || "",
    start_time: report.start_time || "",
    end_time: report.end_time || "",
    service_person: report.service_person || "",
    content: report.content || "",
    follow_up: report.follow_up || "",
    risk_follow: report.risk_follow || "",
    customer_comment: report.customer_comment || "",
    status: report.status || "assigned",
    materials: report.materials || [],
    photos: report.photos || [],
    risk_photos: report.risk_photos || [],
    signatures: report.signatures || [],
    ...overrides,
  };
}
