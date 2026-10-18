import type { ReactNode } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  Clock3,
  ShieldCheck,
} from "lucide-react";
import type { RiskLevel } from "../types";

const riskLabels: Record<RiskLevel, string> = {
  critical: "极高",
  high: "高",
  medium: "中",
  low: "低",
};

export function RiskPill({ risk, compact = false }: { risk: RiskLevel; compact?: boolean }) {
  return (
    <span className={`pill risk-${risk} ${compact ? "pill-compact" : ""}`}>
      {risk === "critical" || risk === "high" ? <AlertTriangle size={12} /> : null}
      {riskLabels[risk]}风险
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status.includes("逾期") || status.includes("需整改")
      ? "danger"
      : status.includes("待") || status.includes("进行中") || status.includes("施工")
        ? "warning"
        : status.includes("已") || status.includes("完成") || status.includes("通过")
          ? "success"
          : "neutral";
  const Icon =
    tone === "danger"
      ? CircleAlert
      : tone === "warning"
        ? Clock3
        : tone === "success"
          ? CheckCircle2
          : CircleDashed;
  return (
    <span className={`pill status-${tone}`}>
      <Icon size={12} />
      {status}
    </span>
  );
}

export function Metric({
  label,
  value,
  hint,
  icon,
  tone = "teal",
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone?: "teal" | "amber" | "red" | "blue";
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-copy">
        <span className="metric-label">{label}</span>
        <strong>{value}</strong>
        <span className="metric-hint">{hint}</span>
      </div>
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-title">
      <div>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "field-wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function PhotoTile({
  label,
  sublabel,
  tone = "neutral",
  captured = false,
  previewUrl,
}: {
  label: string;
  sublabel?: string;
  tone?: "neutral" | "before" | "after";
  captured?: boolean;
  previewUrl?: string;
}) {
  return (
    <div className={`photo-tile photo-${tone} ${previewUrl ? "has-image" : ""}`}>
      {previewUrl ? <img src={previewUrl} alt={label} /> : null}
      <div className="photo-grid-lines" />
      {previewUrl ? null : <Camera size={20} />}
      <span>{label}</span>
      {sublabel ? <small>{sublabel}</small> : null}
      <span className={`photo-state ${captured ? "is-captured" : ""}`}>
        {captured ? "已上传" : "待上传"}
      </span>
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "teal",
}: {
  value: number;
  tone?: "teal" | "amber" | "red";
}) {
  return (
    <div className={`progress ${tone}`}>
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Chip({
  children,
  active = false,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp className={`chip ${active ? "chip-active" : ""}`} onClick={onClick} type={onClick ? "button" : undefined}>
      {children}
    </Comp>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty-state">
      <ShieldCheck size={26} />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

export function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="toast" role="status">
      <CheckCircle2 size={18} />
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="关闭提示">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export function BackButton({ onClick, label = "返回列表" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className="text-button" onClick={onClick}>
      <ChevronRight size={15} className="back-chevron" />
      {label}
    </button>
  );
}

