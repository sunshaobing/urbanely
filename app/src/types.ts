export type RiskLevel = "critical" | "high" | "medium" | "low";
export type InspectionStatus = "待整改" | "整改中" | "待复检" | "已闭环";
export type SealingStatus = "草稿" | "已排期" | "施工中" | "待验收" | "已验收";
export type ServiceStatus = "待执行" | "进行中" | "待复核" | "已完成";
export type PageKey =
  | "dashboard"
  | "inspections"
  | "sealing"
  | "services"
  | "customers"
  | "permissions"
  | "reports"
  | "settings"
  | "dictionary";

export type ReportTemplate = "survey" | "sealing";

export interface Site {
  id: string;
  code: string;
  name: string;
  customer: string;
  customerType: string;
  address: string;
  region: string;
  contact: string;
  phoneMasked: string;
  risk: RiskLevel;
  lastService: string;
  nextService: string;
  openFindings: number;
  contractStatus: "已签" | "待补" | "缺失";
  frequency: string;
}

export interface Finding {
  id: string;
  area: string;
  location: string;
  type: string;
  severity: RiskLevel;
  evidence: string[];
  status: "待整改" | "整改中" | "已封堵" | "无法施工";
  recommendation: string;
  // Legacy migration fields; the inspection UI uses the inspection-level RiskPhoto list.
  beforePhoto?: string;
  afterPhoto?: string;
}

export interface RiskPhoto {
  id: string;
  label: string;
  previewUrl?: string;
}

export interface SignatureImage {
  dataUrl: string;
  signedAt: string;
  signerName: string;
}

export interface InspectionSignatures {
  surveyor?: SignatureImage;
  customer?: SignatureImage;
}

export interface SealingSignatures {
  responsible?: SignatureImage;
  customer?: SignatureImage;
}

export interface CheckinRecord {
  time: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  address: string;
}

export interface Inspection {
  id: string;
  reportNo: string;
  siteId: string;
  date: string;
  timeRange: string;
  surveyor: string;
  contact: string;
  contactPhone: string;
  riskPhotos: RiskPhoto[];
  signatures: InspectionSignatures;
  scope: string[];
  structure: string[];
  pests: string[];
  evidence: string[];
  risk: RiskLevel;
  status: InspectionStatus;
  recheckDate: string;
  integratedPlan: string;
  treatmentPlan: string;
  environmentAdvice: string;
  longTermPrevention: string;
  findings: Finding[];
  checkin?: CheckinRecord;
}

export interface MaterialLine {
  id: string;
  name: string;
  spec: string;
  unit: string;
  quantity: number;
}

export interface SealingItem {
  id: string;
  area: string;
  location: string;
  holeType: string;
  result: "已封堵" | "待封堵" | "无法施工";
  beforePhoto: string;
  afterPhoto?: string;
  beforePhotoUrl?: string;
  afterPhotoUrl?: string;
}

export interface SealingOrder {
  id: string;
  reportNo: string;
  siteId: string;
  inspectionId: string;
  date: string;
  weather: string;
  leader: string;
  supervisor: string;
  rodent: string;
  density: string;
  areas: string[];
  purpose: string;
  holeTypes: string[];
  status: SealingStatus;
  materials: MaterialLine[];
  items: SealingItem[];
  acceptanceResult: "待验收" | "已采纳" | "需整改";
  frequency: string;
  followUpAdvice: string;
  hygieneAdvice: string;
  acceptanceCriteria: string;
  signed: boolean;
  signatures: SealingSignatures;
  checkin?: CheckinRecord;
}

export interface ServiceOrder {
  id: string;
  reportNo: string;
  siteId: string;
  type: string;
  start: string;
  risk: RiskLevel;
  status: ServiceStatus;
  technician: string;
  content: string;
  materials: string[];
  evidence: {
    riskPhotos: number;
    completionPhotos: number;
    technicianSignature: boolean;
    siteSignature: boolean;
  };
}

export interface Task {
  id: string;
  time: string;
  siteId: string;
  type: "勘测" | "封堵" | "复检" | "常规服务";
  assignee: string;
  status: "待出发" | "进行中" | "待提交" | "已完成";
  priority: RiskLevel;
}

export interface ReportVersion {
  id: string;
  template: ReportTemplate;
  version: number;
  generatedAt: string;
  generatedBy: string;
  size: string;
  status: "可下载" | "生成中";
}

