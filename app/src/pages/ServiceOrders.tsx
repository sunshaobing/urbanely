import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  Filter,
  RefreshCw,
  X,
} from "lucide-react";
import type { ServiceOrder, ServiceStatus } from "../types";
import { ProgressBar, RiskPill, SectionTitle, StatusPill } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { useLiveData } from "../liveData";
import { buildSites, toServiceOrder } from "../backendMappers";
import { openBackendPdf } from "../api";

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
  const {
    customers,
    error,
    lastUpdated,
    refresh,
    refreshing,
    riskSurveys,
    serviceReports,
    sites,
    workorders,
  } = useLiveData();
  const liveSites = useMemo(
    () => buildSites(customers, sites, workorders, riskSurveys),
    [customers, riskSurveys, sites, workorders],
  );
  const siteById = new Map(liveSites.map((site) => [site.id, site]));
  const orders = useMemo(
    () => serviceReports.map((report) => toServiceOrder(report, workorders, customers, sites)),
    [customers, serviceReports, sites, workorders],
  );
  const [status, setStatus] = useState<"全部" | ServiceStatus>("全部");
  const [selected, setSelected] = useState<ServiceOrder | null>(null);
  const filtered = orders.filter((order) => status === "全部" || order.status === status);
  const incomplete = orders.filter((order) => completeness(order) < 100).length;

  const openPdf = async (order: ServiceOrder) => {
    try {
      await openBackendPdf(`/api/service-reports/${order.id}/pdf`);
      onNotify("已从后端打开服务单 PDF");
    } catch (pdfError) {
      onNotify(pdfError instanceof Error ? pdfError.message : "PDF 打开失败");
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="LIVE SERVICE / EVIDENCE"
        title="现场服务单"
        description="服务内容、材料、照片和双方签字直接来自生产后端。"
        meta={
          <>
            <span className="live-dot" />
            {error ? `同步异常：${error}` : `${orders.length} 张服务单 · 实时同步 ${lastUpdated}`}
          </>
        }
        actions={
          <button type="button" className="button secondary" disabled={refreshing} onClick={() => void refresh()}>
            <RefreshCw size={15} className={refreshing ? "spin" : undefined} />
            {refreshing ? "刷新中" : "立即刷新"}
          </button>
        }
      />

      <section className="metrics-strip compact-metrics">
        <div className="mini-metric"><span>服务单总数</span><strong>{orders.length}</strong><small>来自实时服务报告</small></div>
        <div className="mini-metric"><span>证据完整率</span><strong>{orders.length ? Math.round((orders.filter((order) => completeness(order) === 100).length / orders.length) * 100) : 0}%</strong><small>{incomplete} 单存在证据缺口</small></div>
        <div className="mini-metric"><span>待审批</span><strong>{orders.filter((order) => order.status === "待复核").length}</strong><small>等待后端审批</small></div>
        <div className="mini-metric"><span>双签完成</span><strong>{orders.filter((order) => order.evidence.technicianSignature && order.evidence.siteSignature).length}</strong><small>双方签字已归档</small></div>
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
          <button type="button" className="button ghost"><Filter size={15} />实时数据<ChevronDown size={14} /></button>
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
            const site = siteById.get(order.siteId);
            const percent = completeness(order);
            return (
              <button type="button" className="table-row" key={order.id} onClick={() => setSelected(order)}>
                <span className="mono">{order.reportNo}</span>
                <span className="cell-main"><strong>{site?.name || "—"}</strong><small>{order.technician}</small></span>
                <span>{order.type}</span>
                <span>{order.start}</span>
                <span><RiskPill risk={order.risk} compact /></span>
                <span><StatusPill status={order.status} /></span>
                <span className="evidence-cell"><ProgressBar value={percent} tone={percent === 100 ? "teal" : "amber"} /><small className={percent === 100 ? "" : "text-warning"}>{percent}%</small></span>
                <span className="row-arrow"><ArrowRight size={15} /></span>
              </button>
            );
          })}
          {!filtered.length ? <div className="personnel-empty">后端暂无匹配服务单。</div> : null}
        </div>
      </section>

      {selected ? (
        <>
          <button type="button" className="drawer-scrim" aria-label="关闭详情" onClick={() => setSelected(null)} />
          <aside className="drawer">
            <div className="drawer-head">
              <div><span className="mono">{selected.reportNo}</span><h2>{siteById.get(selected.siteId)?.name || "服务单详情"}</h2></div>
              <button type="button" className="icon-button" onClick={() => setSelected(null)} aria-label="关闭"><X size={18} /></button>
            </div>
            <div className="drawer-meta"><StatusPill status={selected.status} /><RiskPill risk={selected.risk} compact /><span>{selected.start}</span></div>
            <section className="drawer-section"><SectionTitle title="服务内容" subtitle={`${selected.type} · ${selected.technician}`} /><p className="drawer-copy">{selected.content || "—"}</p></section>
            <section className="drawer-section"><SectionTitle title="物料使用" /><div className="chip-grid">{selected.materials.map((item) => <span className="chip" key={item}>{item}</span>)}{!selected.materials.length ? <span className="chip">暂无材料</span> : null}</div></section>
            <section className="drawer-section">
              <SectionTitle title="证据检查" subtitle="任一项缺失都会阻止报告发布" />
              <div className="check-list">
                <div className={`check-item ${selected.evidence.riskPhotos > 0 ? "done" : ""}`}>{selected.evidence.riskPhotos > 0 ? <Check size={15} /> : <span className="check-empty" />}封堵前照片 {selected.evidence.riskPhotos} 张</div>
                <div className={`check-item ${selected.evidence.completionPhotos > 0 ? "done" : ""}`}>{selected.evidence.completionPhotos > 0 ? <Check size={15} /> : <span className="check-empty" />}封堵后照片 {selected.evidence.completionPhotos} 张</div>
                <div className={`check-item ${selected.evidence.technicianSignature ? "done" : ""}`}>{selected.evidence.technicianSignature ? <Check size={15} /> : <span className="check-empty" />}封堵责任人签字</div>
                <div className={`check-item ${selected.evidence.siteSignature ? "done" : ""}`}>{selected.evidence.siteSignature ? <Check size={15} /> : <span className="check-empty" />}客户代表签字</div>
              </div>
            </section>
            <div className="drawer-actions">
              <button type="button" className="button secondary" onClick={() => void refresh()}><RefreshCw size={16} />刷新</button>
              <button type="button" className="button primary" onClick={() => void openPdf(selected)}><Download size={16} />后端 PDF</button>
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}
