import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Send, X } from "lucide-react";
import { createWorkOrder, listPersonnel } from "../api";
import type {
  BackendCustomer,
  BackendSite,
  PersonnelRecord,
} from "../api";

interface DispatchSurveyDialogProps {
  customer: BackendCustomer;
  site?: BackendSite;
  onClose: () => void;
  onDispatched: () => Promise<void>;
  onNotify: (message: string) => void;
}

const SURVEY_ROLES = new Set([
  "service_engineer",
  "engineer",
  "surveyor",
  "survey_engineer",
  "inspector",
]);

const roleLabels: Record<string, string> = {
  service_engineer: "服务工程师",
  engineer: "工程师",
  surveyor: "勘测员",
  survey_engineer: "勘测工程师",
  inspector: "检查员",
};

function todayString() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function DispatchSurveyDialog({
  customer,
  site,
  onClose,
  onDispatched,
  onNotify,
}: DispatchSurveyDialogProps) {
  const [engineers, setEngineers] = useState<PersonnelRecord[]>([]);
  const [engineerId, setEngineerId] = useState("");
  const [serviceDate, setServiceDate] = useState(todayString);
  const [serviceType, setServiceType] = useState("现场勘测");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    listPersonnel()
      .then((result) => {
        if (cancelled) return;
        const available = result.items
          .filter((item) => item.active && SURVEY_ROLES.has(item.role))
          .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
        setEngineers(available);
        if (available.length) {
          setEngineerId((current) => current || String(available[0].id));
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(messageOf(loadError, "勘测人员加载失败"));
        }
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
      setError("请选择勘测师傅");
      return;
    }
    if (!serviceDate) {
      setError("请选择服务日期");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const order = await createWorkOrder({
        report_date: serviceDate,
        customer_id: customer.id,
        customer_code: customer.code || "",
        customer_name: customer.name,
        service_address: site?.address || customer.address || "",
        contact: customer.contact || "",
        contact_phone: customer.phone || "",
        service_type: serviceType.trim() || "现场勘测",
        service_company: "上海申汰实业有限公司",
        service_date: serviceDate,
        weather: "",
        engineer_id: engineer.id,
        supervisor_id: null,
        rat_species: [],
        density: "",
        activity_areas: [],
        purpose_options: [],
        purpose_custom: "",
        hole_types: [],
        acceptance_items: [],
        hygiene_items: [],
        acceptance_result: "",
        service_frequency: "",
        service_suggestion: note.trim(),
        materials: [],
        sites: [],
        signatures: [],
      });
      await onDispatched();
      onNotify(`已派单给 ${engineer.name}，工单号 ${order.report_no}`);
      onClose();
    } catch (dispatchError) {
      setError(messageOf(dispatchError, "派单失败，请稍后重试"));
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
        aria-labelledby="dispatch-survey-title"
      >
        <div className="personnel-modal-head">
          <div>
            <span className="eyebrow">DISPATCH SURVEY</span>
            <h2 id="dispatch-survey-title">派单给勘测师傅</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="dispatch-summary">
          <strong>{customer.name}</strong>
          <span>{site?.name || customer.name}</span>
          <p>{site?.address || customer.address || "地址待补充"}</p>
          <p>
            联系人：{customer.contact || "—"} · 电话：{customer.phone || "—"}
          </p>
        </div>

        {loading ? (
          <div className="dispatch-hint">正在加载勘测人员...</div>
        ) : null}
        {!loading && !engineers.length ? (
          <div className="dispatch-empty">
            当前没有可用的勘测人员，请先在“人员与权限”中创建或启用勘测账号。
          </div>
        ) : null}

        <div className="personnel-form-grid">
          <label className="personnel-form-wide">
            <span>勘测师傅 *</span>
            <select
              value={engineerId}
              onChange={(event) => setEngineerId(event.target.value)}
              disabled={loading || !engineers.length}
            >
              {engineers.map((engineer) => (
                <option key={engineer.id} value={engineer.id}>
                  {engineer.name} · {roleLabels[engineer.role] || engineer.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>服务日期 *</span>
            <input
              type="date"
              value={serviceDate}
              onChange={(event) => setServiceDate(event.target.value)}
            />
          </label>
          <label>
            <span>服务类型</span>
            <select
              value={serviceType}
              onChange={(event) => setServiceType(event.target.value)}
            >
              <option value="现场勘测">现场勘测</option>
              <option value="上门封堵">上门封堵</option>
            </select>
          </label>
          <label className="personnel-form-wide">
            <span>派单备注</span>
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="例如：优先检查厨房和仓库的管道孔"
            />
          </label>
        </div>

        <p className="dispatch-hint">
          派单后，工单会进入该师傅微信小程序的工作台。若对方已打开小程序，下拉刷新或重新进入即可看到。
        </p>
        {error ? <div className="personnel-modal-error">{error}</div> : null}
        <div className="personnel-modal-actions">
          <button type="button" className="button ghost" onClick={onClose}>
            取消
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={submitting || loading || !engineers.length}
          >
            <Send size={15} />
            {submitting ? "派单中..." : "确认派单"}
          </button>
        </div>
      </form>
    </div>
  );
}
