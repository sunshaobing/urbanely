import { useMemo, useState } from "react";
import {
  ArrowRight,
  Camera,
  Check,
  ChevronDown,
  FileText,
  Filter,
  ShieldAlert,
  Signature,
  X,
} from "lucide-react";
import { getSite, serviceOrders } from "../data";
import type { ServiceOrder, ServiceStatus } from "../types";
import { ProgressBar, RiskPill, SectionTitle, StatusPill } from "../components/ui";
import { PageHeader } from "../components/PageHeader";

interface ServiceOrdersProps {
  onNotify: (message: string) => void;
}

function completeness(order: ServiceOrder) {
  const checks = [
    order.evidence.riskPhotos > 0,
    order.evidence.completionPhotos > 0,
    order.evidence.technicianSignature,
    order.evidence.siteSignature,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function ServiceOrders({ onNotify }: ServiceOrdersProps) {
  const [status, setStatus] = useState<"全部" | ServiceStatus>("全部");
  const [selected, setSelected] = useState<ServiceOrder | null>(null);

  const filtered = useMemo(
    () => serviceOrders.filter((order) => status === "全部" || order.status === status),
    [status],
  );

  const incomplete = serviceOrders.filter((order) => completeness(order) < 100).length;

  return (
    <div className="page">
      <PageHeader
        eyebrow="PCO SERVICE / EVIDENCE"
        title="PCO 服务单"
        description="服务内容、物料、照片和双签字放在同一张单据里，不再散落在多选项和附件字段中。"
        meta={
          <>
            <span className="live-dot" />
            本月 12 张 · 4 张待复核 · 证据完整率 91.2%
          </>
        }
        actions={
          <button type="button" className="button primary" onClick={() => onNotify("已创建 PCO 服务单草稿")}>
            <FileText size={16} />
            新建服务单
          </button>
        }
      />

      <section className="metrics-strip compact-metrics">
        <div className="mini-metric">
          <span>本月服务单</span>
          <strong>12</strong>
          <small>其中 4 单待复核</small>
        </div>
        <div className="mini-metric">
          <span>证据完整率</span>
          <strong>91.2%</strong>
          <small>{incomplete} 单存在证据缺口</small>
        </div>
        <div className="mini-metric">
          <span>高风险服务</span>
          <strong>5</strong>
          <small>需优先安排复检</small>
        </div>
        <div className="mini-metric">
          <span>客户双签率</span>
          <strong>96.4%</strong>
          <small>较上月 +1.8%</small>
        </div>
      </section>

      <div className="filter-bar">
        <div className="segmented">
          {(["全部", "待执行", "进行中", "待复核", "已完成"] as const).map((item) => (
            <button type="button" key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="filter-tools">
          <button type="button" className="button ghost">
            <Filter size={15} />
            风险
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="data-table service-table">
          <div className="table-head">
            <span>服务单编号</span>
            <span>门店</span>
            <span>服务类型</span>
            <span>开始时间</span>
            <span>风险</span>
            <span>状态</span>
            <span>证据完整度</span>
            <span />
          </div>
          {filtered.map((order) => {
            const site = getSite(order.siteId);
            const percent = completeness(order);
            return (
              <button type="button" className="table-row" key={order.id} onClick={() => setSelected(order)}>
                <span className="mono">{order.reportNo}</span>
                <span className="cell-main">
                  <strong>{site.name}</strong>
                  <small>{order.technician} · {site.region}</small>
                </span>
                <span>{order.type}</span>
                <span>{order.start}</span>
                <span>
                  <RiskPill risk={order.risk} compact />
                </span>
                <span>
                  <StatusPill status={order.status} />
                </span>
                <span className="evidence-cell">
                  <ProgressBar value={percent} tone={percent === 100 ? "teal" : "amber"} />
                  <small className={percent === 100 ? "" : "text-warning"}>{percent}%</small>
                </span>
                <span className="row-arrow">
                  <ArrowRight size={15} />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {selected ? (
        <>
          <button type="button" className="drawer-scrim" aria-label="关闭详情" onClick={() => setSelected(null)} />
          <aside className="drawer">
            <div className="drawer-head">
              <div>
                <span className="mono">{selected.reportNo}</span>
                <h2>{getSite(selected.siteId).name}</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="drawer-meta">
              <StatusPill status={selected.status} />
              <RiskPill risk={selected.risk} compact />
              <span>{selected.start}</span>
            </div>
            <section className="drawer-section">
              <SectionTitle title="服务内容" subtitle={`${selected.type} · ${selected.technician}`} />
              <p className="drawer-copy">{selected.content}</p>
            </section>
            <section className="drawer-section">
              <SectionTitle title="物料使用" />
              <div className="chip-grid">
                {selected.materials.map((item) => (
                  <span className="chip" key={item}>{item}</span>
                ))}
              </div>
            </section>
            <section className="drawer-section">
              <SectionTitle title="证据检查" subtitle="任一项缺失都会阻止报告发布" />
              <div className="check-list">
                <div className={`check-item ${selected.evidence.riskPhotos > 0 ? "done" : ""}`}>
                  {selected.evidence.riskPhotos > 0 ? <Check size={15} /> : <span className="check-empty" />}
                  风险照片 {selected.evidence.riskPhotos} 张
                </div>
                <div className={`check-item ${selected.evidence.completionPhotos > 0 ? "done" : ""}`}>
                  {selected.evidence.completionPhotos > 0 ? <Check size={15} /> : <span className="check-empty" />}
                  完工照片 {selected.evidence.completionPhotos} 张
                </div>
                <div className={`check-item ${selected.evidence.technicianSignature ? "done" : ""}`}>
                  {selected.evidence.technicianSignature ? <Check size={15} /> : <span className="check-empty" />}
                  服务人员签字
                </div>
                <div className={`check-item ${selected.evidence.siteSignature ? "done" : ""}`}>
                  {selected.evidence.siteSignature ? <Check size={15} /> : <span className="check-empty" />}
                  现场负责人签字
                </div>
              </div>
            </section>
            <div className="drawer-actions">
              <button type="button" className="button secondary" onClick={() => onNotify("已加入补拍任务")}>
                <Camera size={16} />
                补拍
              </button>
              <button type="button" className="button secondary" onClick={() => onNotify("已发起客户签字")}>
                <Signature size={16} />
                发起签字
              </button>
              <button type="button" className="button primary" onClick={() => onNotify("报告生成任务已排队")}>
                <FileText size={16} />
                生成报告
              </button>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

