import type { ServiceReport, Session, WorkOrder } from "./types";

export type FieldMode = "survey" | "sealing" | "both" | "none";

const surveyRoles = new Set([
  "engineer",
  "surveyor",
  "survey_engineer",
  "inspector",
]);
const sealingRoles = new Set([
  "sealing_engineer",
  "sealer",
  "sealing_operator",
  "construction_engineer",
]);
const bothRoles = new Set(["super_admin", "admin", "supervisor"]);

export function roleMode(role: string): FieldMode {
  if (bothRoles.has(role)) return "both";
  if (surveyRoles.has(role)) return "survey";
  if (sealingRoles.has(role)) return "sealing";
  if (role === "service_engineer") return "survey";
  return "none";
}

export function canUseSurvey(role: string) {
  const mode = roleMode(role);
  return mode === "survey" || mode === "both";
}

export function canUseSealing(role: string) {
  const mode = roleMode(role);
  return mode === "sealing" || mode === "both";
}

export function canUseReports(role: string) {
  return roleMode(role) === "both";
}

export function fieldHome(role: string) {
  const mode = roleMode(role);
  if (mode === "survey") {
    return "/pages/workbench/index?kind=risk";
  }
  if (mode === "sealing") {
    return "/pages/workbench/index?kind=sealing";
  }
  if (mode === "none") {
    return "/pages/profile/index";
  }
  return "/pages/workbench/index";
}

function sameIdentity(
  id: number | undefined,
  name: string | undefined,
  session: Session,
) {
  return (
    id === session.id ||
    Boolean(name && [session.name, session.username].includes(name))
  );
}

function isSurveyOwner(task: WorkOrder, session: Session) {
  return sameIdentity(task.engineer_id, task.engineer_name, session);
}

function isSealingOwner(task: WorkOrder, session: Session) {
  return (
    sameIdentity(task.supervisor_id, task.supervisor_name, session) ||
    sameIdentity(task.assignee_id, task.assignee_name, session) ||
    sameIdentity(task.operator_id, task.operator_name, session) ||
    sameIdentity(task.owner_id, task.owner_name, session)
  );
}

export function reportMatchesTask(report: ServiceReport, task: WorkOrder) {
  return (
    report.work_order_id === task.id ||
    report.work_order_no === task.report_no ||
    Boolean(report.content?.includes(task.report_no)) ||
    Boolean(report.task_tag?.includes(task.report_no))
  );
}

function reportOwnedBy(
  report: ServiceReport,
  task: WorkOrder,
  session: Session,
) {
  if (!reportMatchesTask(report, task)) return false;
  return [session.name, session.username].includes(report.service_person || "");
}

export function ownTasks(
  tasks: WorkOrder[],
  session: Session,
  mode: FieldMode,
  reports: ServiceReport[] = [],
) {
  if (mode === "both") return tasks;
  if (mode === "survey") {
    return tasks.filter((task) => isSurveyOwner(task, session));
  }
  if (mode === "sealing") {
    return tasks.filter(
      (task) =>
        isSealingOwner(task, session) ||
        reports.some((report) => reportOwnedBy(report, task, session)),
    );
  }
  return [];
}

export function isCompletedTask(task: WorkOrder) {
  return task.status === "approved" || task.status === "completed";
}
