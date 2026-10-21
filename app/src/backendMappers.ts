import type {
  BackendCustomer,
  BackendRiskSurvey,
  BackendServiceReport,
  BackendSite,
  BackendTemplates,
  BackendWorkOrder,
} from "./api";
import type {
  Inspection,
  InspectionStatus,
  RiskLevel,
  SealingOrder,
  SealingStatus,
  ServiceOrder,
  ServiceStatus,
  SignatureImage,
  Site,
  Task,
} from "./types";
import { API_BASE_URL } from "./api";

export function mediaUrl(value?: string) {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${API_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

function maskPhone(phone?: string) {
  if (!phone) return "—";
  return phone.length >= 7
    ? `${phone.slice(0, 3)}****${phone.slice(-4)}`
    : phone;
}

export function riskLevelFromBackend(value?: string): RiskLevel {
  if (value === "critical" || value === "极高") return "critical";
  if (value === "high" || value === "高") return "high";
  if (value === "low" || value === "低") return "low";
  return "medium";
}

export function inspectionStatusFromBackend(status?: string): InspectionStatus {
  if (status === "approved" || status === "completed") return "已闭环";
  if (status === "submitted" || status === "reviewed") return "待复检";
  if (status === "assigned" || status === "in_progress") return "整改中";
  return "待整改";
}

export function sealingStatusFromBackend(status?: string): SealingStatus {
  if (status === "approved" || status === "completed") return "已验收";
  if (status === "submitted" || status === "reviewed") return "待验收";
  if (status === "assigned") return "已排期";
  if (["accepted", "checked_in", "in_progress"].includes(status || "")) {
    return "施工中";
  }
  return "草稿";
}

export function serviceStatusFromBackend(status?: string): ServiceStatus {
  if (status === "approved" || status === "completed") return "已完成";
  if (status === "submitted" || status === "reviewed") return "待复核";
  if (
    ["accepted", "checked_in", "in_progress", "assigned"].includes(status || "")
  ) {
    return "进行中";
  }
  return "待执行";
}

function signatureImage(
  role: string,
  signatures?: Array<{
    role: string;
    name: string;
    image_url: string;
    signed_at?: string;
  }>,
): SignatureImage | undefined {
  const signature = signatures?.find((item) => item.role === role);
  if (!signature) return undefined;
  return {
    dataUrl: mediaUrl(signature.image_url),
    signedAt: signature.signed_at || "",
    signerName: signature.name,
  };
}

export function customerForWorkOrder(
  task: BackendWorkOrder | undefined,
  customers: BackendCustomer[],
) {
  if (!task) return undefined;
  return customers.find((customer) => customer.id === task.customer_id);
}

export function siteForWorkOrder(
  task: BackendWorkOrder | undefined,
  sites: BackendSite[],
) {
  if (!task) return undefined;
  return sites.find((site) => site.customer_id === task.customer_id);
}

export function buildSites(
  customers: BackendCustomer[],
  sites: BackendSite[],
  workorders: BackendWorkOrder[],
  surveys: BackendRiskSurvey[],
): Site[] {
  const ids = new Set<number>();
  customers.forEach((customer) => ids.add(customer.id));
  workorders.forEach((task) => {
    if (task.customer_id) ids.add(task.customer_id);
  });
  return [...ids].map((id) => {
    const customer = customers.find((item) => item.id === id);
    const site = sites.find((item) => item.customer_id === id);
    const task = workorders.find((item) => item.customer_id === id);
    const survey = surveys.find((item) => item.customer_id === id);
    const risk = riskLevelFromBackend(
      survey?.risk_level || customer?.risk || "medium",
    );
    return {
      id: `customer-${id}`,
      code: customer?.code || site?.id?.toString() || String(id),
      name: site?.name || task?.customer_name || customer?.name || `客户 ${id}`,
      customer: customer?.name || task?.customer_name || `客户 ${id}`,
      customerType: "客户",
      address:
        site?.address ||
        customer?.address ||
        task?.service_address ||
        "地址待补充",
      region: "",
      contact: customer?.contact || task?.contact || site?.note || "—",
      phoneMasked: maskPhone(customer?.phone || task?.contact_phone),
      risk,
      lastService: task?.service_date || task?.report_date || "—",
      nextService: survey?.review_date || "—",
      openFindings: surveys.filter(
        (item) =>
          item.customer_id === id &&
          !["approved", "completed"].includes(item.status),
      ).length,
      contractStatus:
        customer?.status === "active"
          ? "已签"
          : customer?.status === "closed"
            ? "缺失"
            : "待补",
      frequency: "按合同",
    };
  });
}

export function toInspection(
  survey: BackendRiskSurvey,
  workorders: BackendWorkOrder[],
  customers: BackendCustomer[],
  sites: BackendSite[],
): Inspection {
  const task =
    workorders.find((item) => item.report_no === survey.code) ||
    workorders.find((item) => item.customer_id === survey.customer_id);
  const customer = customerForWorkOrder(task, customers);
  const site = siteForWorkOrder(task, sites);
  return {
    id: String(survey.id),
    reportNo: survey.code || task?.report_no || `KC-${survey.id}`,
    siteId: `customer-${survey.customer_id || task?.customer_id || survey.id}`,
    date: survey.survey_date || survey.created_at?.slice(0, 10) || "—",
    timeRange: survey.survey_time || "",
    surveyor: task?.engineer_name || survey.contact_person || "现场人员",
    contact: survey.contact_person || task?.contact || customer?.contact || "—",
    contactPhone: maskPhone(task?.contact_phone || customer?.phone),
    riskPhotos: (survey.photos || []).map((photo, index) => ({
      id: `${survey.id}-photo-${index}`,
      label: photo.caption || `结构风险 ${index + 1}`,
      previewUrl: mediaUrl(photo.url),
    })),
    signatures: {
      surveyor: signatureImage("engineer", survey.signatures),
      customer: signatureImage("customer", survey.signatures),
    },
    scope: survey.survey_range || [],
    structure: survey.structure_conditions || [],
    pests: [survey.pest_type || "鼠"],
    evidence: survey.pest_evidence || [],
    risk: riskLevelFromBackend(survey.risk_level),
    status: inspectionStatusFromBackend(survey.status),
    recheckDate: survey.review_date || "—",
    integratedPlan: survey.comprehensive_plan || "",
    treatmentPlan: survey.disinfection_plan || "",
    environmentAdvice: survey.environment_suggestions || "",
    longTermPrevention: survey.prevention_measures || "",
    findings: (survey.items || []).map((item, index) => ({
      id: `${survey.id}-finding-${item.id || index}`,
      area: site?.name || "现场",
      location: item.location,
      type: "结构隐患",
      severity: riskLevelFromBackend(survey.risk_level),
      evidence: survey.pest_evidence || [],
      status:
        survey.status === "approved" || survey.status === "completed"
          ? "已封堵"
          : "待整改",
      recommendation: item.suggestion || item.description || "",
    })),
    checkin: (() => {
      const record = task?.checkins?.find(
        (checkin) => checkin.role === "surveyor",
      );
      if (!record?.checkin_time) return undefined;
      return {
        time: record.checkin_time,
        latitude: record.latitude,
        longitude: record.longitude,
        accuracy: record.accuracy,
        address: record.address,
      };
    })(),
  };
}

export function toSealingOrder(
  report: BackendServiceReport,
  workorders: BackendWorkOrder[],
  customers: BackendCustomer[],
  sites: BackendSite[],
): SealingOrder {
  const task =
    workorders.find(
      (item) =>
        item.id ===
          Number(
            report.task_tag?.match(/\d+/)?.[0] ||
              report.content?.match(/\d+/)?.[0] ||
              0,
          ) ||
        item.report_no === report.task_tag?.split(" ").pop() ||
        item.report_no === report.content?.split(" ").pop(),
    ) ||
    workorders.find((item) => item.customer_id === report.customer_id);
  const customer = customerForWorkOrder(task, customers);
  const site = siteForWorkOrder(task, sites);
  const signatures = {
    responsible:
      signatureImage("responsible", report.signatures) ||
      signatureImage("service", report.signatures),
    customer: signatureImage("customer", report.signatures),
  };
  const beforePhotos = report.risk_photos || [];
  const afterPhotos = report.photos || [];
  const workSites = task?.sites || [];
  const items = workSites.length
    ? workSites.map((item, index) => ({
        id: `${report.id}-item-${item.id}`,
        area: item.remark || item.name,
        location: item.name,
        holeType: item.hole_type || "结构孔洞",
        result:
          sealingStatusFromBackend(report.status) === "已验收"
            ? ("已封堵" as const)
            : ("待封堵" as const),
        beforePhoto:
          beforePhotos[index]?.caption ||
          beforePhotos[0]?.caption ||
          "封堵前",
        afterPhoto:
          afterPhotos[index]?.caption ||
          afterPhotos[0]?.caption ||
          "封堵后",
        beforePhotoUrl: mediaUrl(
          beforePhotos[index]?.url || beforePhotos[0]?.url,
        ),
        afterPhotoUrl: mediaUrl(
          afterPhotos[index]?.url || afterPhotos[0]?.url,
        ),
      }))
    : Array.from(
        { length: Math.max(beforePhotos.length, afterPhotos.length) },
        (_, index) => ({
          id: `${report.id}-photo-item-${index}`,
          area: "现场封堵",
          location:
            beforePhotos[index]?.caption ||
            afterPhotos[index]?.caption ||
            `封堵点位 ${index + 1}`,
          holeType: "结构孔洞",
          result:
            sealingStatusFromBackend(report.status) === "已验收"
              ? ("已封堵" as const)
              : ("待封堵" as const),
          beforePhoto: beforePhotos[index]?.caption || "封堵前",
          afterPhoto: afterPhotos[index]?.caption || "封堵后",
          beforePhotoUrl: mediaUrl(
            beforePhotos[index]?.url || beforePhotos[0]?.url,
          ),
          afterPhotoUrl: mediaUrl(
            afterPhotos[index]?.url || afterPhotos[0]?.url,
          ),
        }),
      );
  return {
    id: String(report.id),
    reportNo: report.report_no || report.code || `STFD-${report.id}`,
    siteId: `customer-${report.customer_id || task?.customer_id || report.id}`,
    inspectionId: task ? String(task.id) : "",
    date: report.service_date || report.created_at?.slice(0, 10) || "—",
    weather: task?.weather || "—",
    leader: report.service_person || "待派单",
    supervisor: report.service_person || task?.supervisor_name || "—",
    rodent: "鼠",
    density: task?.density || "—",
    areas: [],
    purpose: report.service_project || "结构封堵",
    holeTypes: (task?.sites || []).map((item) => item.hole_type || "结构孔洞"),
    status: sealingStatusFromBackend(report.status),
    materials: (report.materials || []).map((item, index) => ({
      id: `${report.id}-material-${index}`,
      name: item.name,
      spec: item.area_size || "",
      unit: item.unit || "",
      quantity: item.qty || 0,
    })),
    items,
    acceptanceResult:
      sealingStatusFromBackend(report.status) === "已验收" ? "已采纳" : "待验收",
    frequency: "",
    followUpAdvice: report.follow_up || "",
    hygieneAdvice: report.risk_follow || "",
    acceptanceCriteria: report.customer_comment || "",
    signed: Boolean(signatures.responsible && signatures.customer),
    signatures,
    checkin: (() => {
      const record = task?.checkins?.find(
        (checkin) => checkin.role === "sealing",
      );
      const time = record?.checkin_time || report.checkin?.checkin_time || "";
      if (!time) return undefined;
      return {
        time,
        latitude:
          record?.latitude ?? report.checkin?.checkin_latitude ?? null,
        longitude:
          record?.longitude ?? report.checkin?.checkin_longitude ?? null,
        accuracy:
          record?.accuracy ?? report.checkin?.checkin_accuracy ?? null,
        address:
          record?.address || report.checkin?.checkin_location || "",
      };
    })(),
  };
}

export function toServiceOrder(
  report: BackendServiceReport,
  workorders: BackendWorkOrder[],
  customers: BackendCustomer[],
  sites: BackendSite[],
): ServiceOrder {
  const task =
    workorders.find((item) => item.customer_id === report.customer_id) ||
    workorders.find(
      (item) =>
        item.report_no === report.task_tag?.split(" ").pop() ||
        item.report_no === report.content?.split(" ").pop(),
    );
  const site = siteForWorkOrder(task, sites);
  const customer = customerForWorkOrder(task, customers);
  return {
    id: String(report.id),
    reportNo: report.report_no || report.code || `SVC-${report.id}`,
    siteId: `customer-${report.customer_id || report.id}`,
    type: report.service_project || "现场服务",
    start: [report.service_date, report.start_time].filter(Boolean).join(" "),
    risk: riskLevelFromBackend(task?.density),
    status: serviceStatusFromBackend(report.status),
    technician: report.service_person || task?.engineer_name || "—",
    content: report.content || report.task_tag || "",
    materials: (report.materials || []).map(
      (item) =>
        `${item.name}${item.qty ? ` × ${item.qty}${item.unit || ""}` : ""}`,
    ),
    evidence: {
      riskPhotos: report.risk_photos?.length || 0,
      completionPhotos: report.photos?.length || 0,
      technicianSignature: Boolean(
        signatureImage("responsible", report.signatures) ||
          signatureImage("service", report.signatures),
      ),
      siteSignature: Boolean(signatureImage("customer", report.signatures)),
    },
    _siteName: site?.name || customer?.name || report.customer_name || "—",
  } as ServiceOrder;
}

export function toTask(task: BackendWorkOrder): Task {
  return {
    id: String(task.id),
    time: task.service_date || task.report_date || "",
    siteId: `customer-${task.customer_id || task.id}`,
    type:
      task.service_type?.includes("封堵")
        ? "封堵"
        : task.service_type?.includes("复检")
          ? "复检"
          : "勘测",
    assignee: task.engineer_name || task.supervisor_name || "—",
    status:
      task.status === "approved" || task.status === "completed"
        ? "已完成"
        : task.status === "pending"
          ? "进行中"
          : task.status === "rejected"
            ? "待提交"
            : "待出发",
    priority: "medium",
  };
}

export function brandFromTemplates(templates: BackendTemplates | null) {
  return {
    logoUrl: templates?.logo_url || "",
    companyName:
      templates?.company_name ||
      templates?.service_company ||
      "上海申汰实业有限公司",
  };
}
