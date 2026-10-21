import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Send, X } from "lucide-react";
import {
  createServiceReport,
  listPersonnel,
  updateServiceReport,
} from "../api";
import type {
  BackendRiskSurvey,
  BackendServiceReport,
  PersonnelRecord,
} from "../api";
import type { Site } from "../types";

const SEALING_ROLES = new Set([
  "sealing_engineer",
  "sealer",
  "sealing_operator",
  "construction_engineer",
]);

const roleLabels: Record<string, string> = {
  sealing_engineer: "封堵工程师",
  sealer: "封堵员",
  sealing_operator: "封堵施工员",
  construction_engineer: "施工工程师",
};

function todayString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface DispatchSealingDialogProps {
  survey: BackendRiskSurvey;
  report?: BackendServiceReport;
  site?: Site;
  onClose: () => void;
  onDispatched: () => Promise<void>;
  onNotify: (message: string) => void;
}

export function DispatchSealingDialog({
  survey,
  report,
  site,
  onClose,
  onDispatched,
  onNotify,
}: DispatchSealingDialogProps) {
  const [engineers, setEngineers] = useState<PersonnelRecord[]>([]);
  const [engineerId, setEngineerId] = useState("");
  const [serviceDate, setServiceDate] = useState(
    report?.service_date || survey.survey_date || todayString(),
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listPersonnel()
      .then((result) => {
        if (cancelled) return;
        const available = result.items
          .filter((item) => item.active && SEALING_ROLES.has(item.role))
          .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
        setEngineers(available);
        if (available.length) {
          setEngineerId((current) => current || String(available[0].id));
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(messageOf(loadError, "封堵人员加载失败"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const engineer = engineers.find((item) => String(item.id) === engineerId);
    if (!engineer) {
      setError("请选择封堵师傅");
      return;
    }
    if (!serviceDate) {
      setError("请选择上门日期");
      return;
    }
    setSubmitting(true);
    setError("");
    const reportNo = survey.code || `RS-${survey.id}`;
    const baseContent =
      report?.content || `来源勘测报告 ${reportNo}`;
    const payload = {
      customer_id:
        report?.customer_id || survey.customer_id || 0,
      customer_name:
        report?.customer_name || survey.customer_name || site?.customer || "",
      address:
        report?.address || survey.customer_address || site?.address || "",
      contact: report?.contact || survey.contact_person || site?.contact || "",
      contact_phone: report?.contact_phone || "",
      service_project: report?.service_project || "结构漏洞封堵",
      task_tag: `封堵派单 ${reportNo}`,
      service_date: serviceDate,
      start_time: report?.start_time || "",
      end_time: report?.end_time || "",
      service_person: engineer.name,
      content: baseContent,
      follow_up: report?.follow_up || "",
      risk_follow: report?.risk_follow || "",
      customer_comment: report?.customer_comment || "",
      status: "assigned",
      materials: report?.materials || [],
      photos: report?.photos || [],
      risk_photos: report?.risk_photos || [],
      signatures: report?.signatures || [],
    };
    try {
      if (report) {
        await updateServiceReport(report.id, payload);
      } else {
        await createServiceReport(payload);
      }
      await onDispatched();
      onNotify(`已派单给 ${engineer.name}，封堵师傅手机上即可看到任务`);
      onClose();
    } catch (dispatchError) {
      setError(messageOf(dispatchError, "封堵派单失败，请稍后重试"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="personnel-modal-backdrop" role="presentation">
      <form
        className="personnel-modal dispatch-modal"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispatch-sealing-title"
      >
        <div className="personnel-modal-head">
          <div>
            <span className="eyebrow">DISPATCH SEALING</span>
            <h2 id="dispatch-sealing-title">派单给封堵师傅</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="dispatch-summary">
          <strong>{survey.customer_name || site?.customer || "—"}</strong>
          <span>{site?.name || "待封堵客户"}</span>
          <p>{site?.address || survey.customer_address || "地址待补充"}</p>
          <p>来源勘测：{survey.code || `RS-${survey.id}`}</p>
        </div>

        {loading ? (
          <div className="dispatch-hint">正在加载封堵人员...</div>
        ) : null}
        {!loading && !engineers.length ? (
          <div className="dispatch-empty">
            当前没有可用的封堵人员，请先在“人员与权限”中启用封堵账号。
          </div>
        ) : null}

        <div className="personnel-form-grid">
          <label className="personnel-form-wide">
            <span>封堵师傅 *</span>
            <select
              value={engineerId}
              onChange={(event) => setEngineerId(event.target.value)}
              disabled={loading || !engineers.length}
            >
              {engineers.map((engineer) => (
                <option key={engineer.id} value={engineer.id}>
                  {engineer.name} ·{" "}
                  {roleLabels[engineer.role] || engineer.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>上门日期 *</span>
            <input
              type="date"
              value={serviceDate}
              onChange={(event) => setServiceDate(event.target.value)}
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        <p className="dispatch-hint">
          派单后，封堵师傅会在手机工作台收到任务，并可到场签到、上传封堵前后照片、完成双方手写签字后提交服务单。
        </p>

        <div className="personnel-form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={submitting || loading || !engineers.length}
          >
            <Send size={16} />
            {submitting ? "派单中..." : "确认派单"}
          </button>
        </div>
      </form>
    </div>
  );
}
