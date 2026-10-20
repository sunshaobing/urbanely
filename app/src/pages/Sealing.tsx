import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Filter,
  MapPin,
  Plus,
  Ruler,
  Save,
  ShieldCheck,
  Signature,
  Wrench,
} from "lucide-react";
import type {
  Inspection,
  MaterialLine,
  SealingOrder,
  SealingSignatures,
  SealingStatus,
  SignatureImage,
  Site,
} from "../types";
import { SealingReportSheet } from "../components/ReportSheet";
import { SignatureCapture, SignaturePartyCard } from "../components/SignatureCapture";
import { getSealingSignatures, useSealingSignatures } from "../signatureStore";
import { PageHeader } from "../components/PageHeader";
import { WorkflowRail } from "../components/WorkflowRail";
import {
  BackButton,
  Chip,
  Field,
  PhotoTile,
  ProgressBar,
  RiskPill,
  SectionTitle,
  StatusPill,
} from "../components/ui";
import { useLiveData } from "../liveData";
import {
  buildSites,
  toInspection,
  toSealingOrder,
} from "../backendMappers";
import {
  openBackendPdf,
  updateServiceReport,
} from "../api";
import type { BackendServiceReport } from "../api";

interface SealingProps {
  onNotify: (message: string) => void;
  onOpenReport: (template: "sealing", sealingId: string) => void;
}

const tabs = ["施工信息", "部位与材料", "验收与签字", "报告预览"] as const;
type Tab = (typeof tabs)[number];

function createMaterialLine(): MaterialLine {
  return {
    id: `mat-${Date.now()}`,
    name: "防火泥",
    spec: "20kg/箱",
    unit: "kg",
    quantity: 1,
  };
}

export function Sealing({ onNotify, onOpenReport }: SealingProps) {
  const { customers, refresh, riskSurveys, serviceReports, sites, workorders } = useLiveData();
  const liveSites = useMemo(
    () => buildSites(customers, sites, workorders, riskSurveys),
    [customers, riskSurveys, sites, workorders],
  );
  const liveOrders = useMemo(
    () =>
      serviceReports.map((report) =>
        toSealingOrder(report, workorders, customers, sites),
      ),
    [customers, serviceReports, sites, workorders],
  );
  const liveInspections = useMemo(
    () =>
      riskSurveys.map((survey) =>
        toInspection(survey, workorders, customers, sites),
      ),
    [customers, riskSurveys, sites, workorders],
  );
  const siteById = new Map(liveSites.map((site) => [site.id, site]));
  const [status, setStatus] = useState<"全部" | SealingStatus>("全部");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(
    () => liveOrders.filter((order) => status === "全部" || order.status === status),
    [liveOrders, status],
  );

  if (selectedId && liveOrders.length) {
    const selectedOrder =
      liveOrders.find((order) => order.id === selectedId) || liveOrders[0];
    const rawReport =
      serviceReports.find((report) => String(report.id) === selectedOrder.id) ||
      serviceReports[0];
    const inspection =
      liveInspections.find((item) =>
        item.siteId === selectedOrder.siteId,
      ) || liveInspections[0];
    const selectedSite =
      siteById.get(selectedOrder.siteId) || {
        id: selectedOrder.siteId,
        code: selectedOrder.reportNo,
        name: selectedOrder.reportNo,
        customer: rawReport?.customer_name || "—",
        customerType: "客户",
        address: rawReport?.address || "地址待补充",
        region: "",
        contact: rawReport?.contact || "—",
        phoneMasked: rawReport?.contact_phone || "—",
        risk: "medium" as const,
        lastService: selectedOrder.date,
        nextService: "—",
        openFindings: 0,
        contractStatus: "待补" as const,
        frequency: "按合同",
      };
    if (!rawReport) return null;
    return (
      <SealingDetail
        order={selectedOrder}
        rawReport={rawReport}
        site={selectedSite}
        inspection={inspection}
        onRefresh={refresh}
        onBack={() => setSelectedId(null)}
        onNotify={onNotify}
        onOpenReport={onOpenReport}
      />
    );
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="SEALING / ACCEPTANCE"
        title="结构封堵"
        description="把勘测隐患变成施工部位、材料用量和可验收的前后照片。"
        meta={
          <>
            <span className="live-dot" />
            {liveOrders.length} 张封堵单 · {liveOrders.filter((order) => order.status === "待验收").length} 张待验收 · {liveOrders.filter((order) => order.status === "施工中").length} 张施工中
          </>
        }
        actions={
          <button type="button" className="button primary" onClick={() => onNotify("已创建封堵单草稿，请选择来源勘测单")}>
            <Plus size={16} />
            新建封堵单
          </button>
        }
      />

      <section className="metrics-strip compact-metrics">
        <div className="mini-metric">
          <span>待验收</span>
          <strong>{liveOrders.filter((order) => order.status === "待验收").length}</strong>
          <small>{liveOrders.filter((order) => !order.signed).length} 单缺少双方签字</small>
        </div>
        <div className="mini-metric">
          <span>施工中</span>
          <strong>{liveOrders.filter((order) => order.status === "施工中").length}</strong>
          <small>来自实时封堵报告</small>
        </div>
        <div className="mini-metric">
          <span>材料明细</span>
          <strong>{liveOrders.reduce((sum, order) => sum + order.materials.length, 0)}</strong>
          <small>当前封堵报告累计材料行</small>
        </div>
        <div className="mini-metric">
          <span>已验收</span>
          <strong>{liveOrders.filter((order) => order.status === "已验收").length}</strong>
          <small>实时完成数量</small>
        </div>
      </section>

      <div className="filter-bar">
        <div className="segmented">
          {(["全部", "草稿", "已排期", "施工中", "待验收", "已验收"] as const).map((item) => (
            <button type="button" key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="filter-tools">
          <button type="button" className="button ghost">
            <Filter size={15} />
            筛选
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      <section className="panel table-panel">
        <div className="data-table sealing-table">
          <div className="table-head">
            <span>报告编号</span>
            <span>门店</span>
            <span>服务日期</span>
            <span>施工负责人</span>
            <span>验收</span>
            <span>状态</span>
            <span>来源勘测</span>
            <span />
          </div>
          {filtered.map((order) => {
            const site = siteById.get(order.siteId);
            const signatures = getSealingSignatures(order.id);
            const isSigned = Boolean(signatures.responsible && signatures.customer);
            return (
              <button type="button" className="table-row" key={order.id} onClick={() => setSelectedId(order.id)}>
                <span className="mono">{order.reportNo}</span>
                <span className="cell-main">
                  <strong>{site?.name || "—"}</strong>
                  <small>
                    <MapPin size={12} />
                    {site?.region || site?.address || "—"} · {site?.code || "—"}
                  </small>
                </span>
                <span>{order.date}</span>
                <span>{order.leader}</span>
                <span>
                  <StatusPill status={isSigned ? "已采纳" : order.acceptanceResult} />
                </span>
                <span>
                  <StatusPill status={isSigned ? "已验收" : order.status} />
                </span>
                <span className="mono subtle">#{order.id}</span>
                <span className="row-arrow">
                  <ArrowRight size={15} />
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SealingDetail({
  order: original,
  rawReport,
  site,
  inspection,
  onRefresh,
  onBack,
  onNotify,
  onOpenReport,
}: {
  order: SealingOrder;
  rawReport: BackendServiceReport;
  site: Site;
  inspection?: Inspection;
  onRefresh: () => Promise<void>;
  onBack: () => void;
  onNotify: (message: string) => void;
  onOpenReport: (template: "sealing", sealingId: string) => void;
}) {
  const [order, setOrder] = useState<SealingOrder>(() => structuredClone(original));
  const [tab, setTab] = useState<Tab>("施工信息");
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatures, saveSealingSignatures] = useSealingSignatures(
    original.id,
    original.signatures,
  );
  const bothSigned = Boolean(signatures.responsible && signatures.customer);
  const isSigned = bothSigned || order.signed;
  const reportOrder = { ...order, signatures, signed: bothSigned };
  const completed = order.items.filter((item) => item.result === "已封堵").length;
  const progress = Math.round((completed / Math.max(1, order.items.length)) * 100);
  const workflowIndex = isSigned
    ? 4
    : order.status === "草稿"
      ? 0
      : order.status === "已排期"
        ? 1
        : order.status === "施工中"
          ? 2
          : 3;

  const update = (patch: Partial<SealingOrder>) => {
    setOrder((current) => ({ ...current, ...patch }));
  };

  const addMaterial = () => {
    update({ materials: [...order.materials, createMaterialLine()] });
    onNotify("已添加一行材料明细");
  };

  const completeSignatures = (next: Record<string, SignatureImage>) => {
    const saved = { responsible: next.responsible, customer: next.customer };
    saveSealingSignatures(saved);
    update({
      signatures: saved,
      signed: Boolean(saved.responsible && saved.customer),
    });
    setSignatureOpen(false);
    void (async () => {
      try {
        await updateServiceReport(rawReport.id, {
          ...sealingPayload(saved),
          status: backendStatus,
        });
        await onRefresh();
        onNotify("双方签字已写入封堵报告");
      } catch (saveError) {
        onNotify(
          saveError instanceof Error
            ? `签字已保存在本机，同步后端失败：${saveError.message}`
            : "签字已保存在本机，同步后端失败",
        );
      }
    })();
  };

  const backendStatus =
    order.status === "已验收"
      ? "completed"
      : order.status === "待验收"
        ? "submitted"
        : order.status === "施工中"
          ? "in_progress"
          : order.status === "已排期"
            ? "assigned"
            : "draft";
  function sealingPayload(
    effectiveSignatures: SealingSignatures = signatures,
  ) {
    return {
    customer_id: rawReport.customer_id || 0,
    customer_name: rawReport.customer_name || site.customer,
    address: rawReport.address || site.address,
    contact: rawReport.contact || site.contact,
    contact_phone: rawReport.contact_phone || "",
    service_project: rawReport.service_project || order.purpose,
    task_tag: rawReport.task_tag || "",
    service_date: order.date,
    start_time: rawReport.start_time || "",
    end_time: rawReport.end_time || "",
    service_person: order.leader,
    content: rawReport.content || "",
    follow_up: order.followUpAdvice,
    risk_follow: order.hygieneAdvice,
    customer_comment: order.acceptanceCriteria,
    status: backendStatus,
    materials: order.materials.map((material, index) => ({
      name: material.name,
      qty: material.quantity,
      unit: material.unit,
      usage_method: "",
      target: "",
      area_size: material.spec,
      region: "",
      sort_order: index,
    })),
    photos: rawReport.photos || [],
    risk_photos: rawReport.risk_photos || [],
    signatures: [
      effectiveSignatures.responsible
        ? {
            role: "service",
            name: order.leader,
            image_url: effectiveSignatures.responsible.dataUrl,
          }
        : null,
      effectiveSignatures.customer
        ? {
            role: "customer",
            name: site.contact,
            image_url: effectiveSignatures.customer.dataUrl,
          }
        : null,
    ].filter(Boolean),
    };
  }

  const backendPayload = sealingPayload();

  const saveBackend = async () => {
    try {
      await updateServiceReport(rawReport.id, backendPayload);
      await onRefresh();
      onNotify("封堵单已保存到生产后端");
    } catch (saveError) {
      onNotify(saveError instanceof Error ? saveError.message : "封堵单保存失败");
    }
  };

  const generateBackendReport = async () => {
    if (!isSigned) {
      onNotify("请先完成封堵责任人和客户代表双方签字");
      return;
    }
    try {
      await updateServiceReport(rawReport.id, {
        ...backendPayload,
        status: "completed",
      });
      await onRefresh();
      await openBackendPdf(`/api/service-reports/${rawReport.id}/pdf`);
      onNotify("封堵报告已从后端生成");
    } catch (reportError) {
      onNotify(reportError instanceof Error ? reportError.message : "报告生成失败");
    }
  };

  return (
    <div className="page detail-page">
      <BackButton onClick={onBack} />
      <div className="detail-heading">
        <div>
          <div className="detail-kicker">
            <span className="mono">{order.reportNo}</span>
            <StatusPill status={order.status} />
            <RiskPill risk={site.risk} compact />
            <span className="pill status-neutral">
              <Ruler size={12} />
              {order.items.length} 个部位
            </span>
          </div>
          <h1>{site.name}</h1>
          <p>
            来源勘测 {inspection?.reportNo || rawReport.task_tag || "—"} · {order.date} · {order.leader} 施工
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="button secondary" onClick={() => void saveBackend()}>
            <Save size={16} />
            保存
          </button>
          <button type="button" className="button secondary" onClick={() => setSignatureOpen(true)}>
            <Signature size={16} />
            手机签字
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => void generateBackendReport()}
          >
            <FileText size={16} />
            生成报告
          </button>
        </div>
      </div>

      <WorkflowRail
        activeIndex={workflowIndex}
        steps={[
          { label: "立案", hint: order.reportNo },
          { label: "施工登记", hint: `${order.leader} 负责` },
          { label: "影像归档", hint: `${order.items.filter((item) => item.afterPhoto).length} 组前后照片` },
          { label: "客户验收", hint: bothSigned ? "双方已签" : "待双方签字" },
          { label: "复检闭环", hint: order.frequency },
        ]}
      />

      <div className="detail-tabs">
        {tabs.map((item) => (
          <button type="button" key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>
            {item}
            {item === "部位与材料" ? <span className="tab-count">{order.items.length}</span> : null}
          </button>
        ))}
      </div>

      {tab === "施工信息" ? (
        <div className="detail-grid">
          <section className="panel">
            <SectionTitle title="服务信息" subtitle="与封堵报告表头字段一致" />
            <div className="form-grid">
              <Field label="报告编号">
                <input value={order.reportNo} readOnly />
              </Field>
              <Field label="服务日期">
                <input type="date" value={order.date} onChange={(event) => update({ date: event.target.value })} />
              </Field>
              <Field label="客户名称">
                <input value={site.customer} readOnly />
              </Field>
              <Field label="客户编号">
                <input value={site.code} readOnly />
              </Field>
              <Field label="服务地址" wide>
                <input value={site.address} readOnly />
              </Field>
              <Field label="联系人">
                <input value={site.contact} readOnly />
              </Field>
              <Field label="联系电话">
                <input value={site.phoneMasked} readOnly />
              </Field>
              <Field label="施工负责人">
                <input value={order.leader} onChange={(event) => update({ leader: event.target.value })} />
              </Field>
              <Field label="现场监理人">
                <input value={order.supervisor} onChange={(event) => update({ supervisor: event.target.value })} />
              </Field>
              <Field label="施工天气">
                <input value={order.weather} onChange={(event) => update({ weather: event.target.value })} />
              </Field>
              <Field label="服务类型">
                <select value="首次服务" onChange={() => undefined}>
                  <option>首次服务</option>
                  <option>返工封堵</option>
                  <option>维护服务</option>
                </select>
              </Field>
            </div>
          </section>

          <aside className="panel side-summary">
            <SectionTitle title="关联信息" />
            <div className="link-card">
              <div>
                <span>来源勘测单</span>
                <strong className="mono">{inspection?.reportNo || "—"}</strong>
              </div>
              <StatusPill status={inspection?.status || "—"} />
            </div>
            <div className="link-card">
              <div>
                <span>隐患点</span>
                <strong>{inspection?.findings.length || 0} 项</strong>
              </div>
              <RiskPill risk={inspection?.risk || "medium"} compact />
            </div>
            <div className="summary-note">
              <Wrench size={16} />
              <span>封堵部位由来源勘测隐患点生成，新增部位会同步到复检清单。</span>
            </div>
          </aside>

          <section className="panel">
            <SectionTitle title="鼠害现状评估" subtitle="用于确定封堵优先级和后续频次" />
            <div className="form-grid">
              <Field label="鼠害种类">
                <input value={order.rodent} onChange={(event) => update({ rodent: event.target.value })} />
              </Field>
              <Field label="鼠害密度">
                <select value={order.density} onChange={(event) => update({ density: event.target.value })}>
                  <option>低（少量痕迹）</option>
                  <option>中（可见痕迹）</option>
                  <option>高（多处活动）</option>
                </select>
              </Field>
              <Field label="封堵目的" wide>
                <input value={order.purpose} onChange={(event) => update({ purpose: event.target.value })} />
              </Field>
            </div>
            <div className="chip-grid">
              {["仓储 / 库房", "管道间 / 天花板", "货架上方", "货架下方", "收银区", "后场", "门头"].map((item) => (
                <Chip
                  key={item}
                  active={order.areas.includes(item)}
                  onClick={() =>
                    update({
                      areas: order.areas.includes(item)
                        ? order.areas.filter((value) => value !== item)
                        : [...order.areas, item],
                    })
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
          </section>

          <section className="panel">
            <SectionTitle title="漏洞类型" subtitle="与隐患点类型保持一致" />
            <div className="chip-grid">
              {["墙体孔洞", "管道穿墙缝隙", "结构破损缝隙", "门底缝隙", "天花板缝隙", "货架夹层"].map((item) => (
                <Chip
                  key={item}
                  active={order.holeTypes.includes(item)}
                  onClick={() =>
                    update({
                      holeTypes: order.holeTypes.includes(item)
                        ? order.holeTypes.filter((value) => value !== item)
                        : [...order.holeTypes, item],
                    })
                  }
                >
                  {item}
                </Chip>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "部位与材料" ? (
        <div className="sealing-layout">
          <div>
            <section className="panel">
              <SectionTitle
                title="封堵部位"
                subtitle="每个部位必须有封堵前照片；完成后补封堵后照片"
                action={<span className="count-badge">{order.items.length} 个</span>}
              />
              <div className="sealing-items">
                {order.items.map((item, index) => (
                  <div className="sealing-item" key={item.id}>
                    <div className="sealing-item-head">
                      <span className="finding-index">{String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <strong>{item.location}</strong>
                        <span>
                          {item.area} · {item.holeType}
                        </span>
                      </div>
                      <StatusPill status={item.result} />
                    </div>
                    <div className="sealing-item-body">
                      <PhotoTile label={item.beforePhoto} sublabel="封堵前" tone="before" captured />
                      <PhotoTile
                        label={item.afterPhoto ?? "封堵后待拍"}
                        sublabel="封堵后"
                        tone="after"
                        captured={Boolean(item.afterPhoto)}
                      />
                      <div className="item-check">
                        <strong>验收要点</strong>
                        <span>无空隙、无松动、材料贴合紧密</span>
                        <button
                          type="button"
                          className="text-button"
                          onClick={() =>
                            update({
                              items: order.items.map((current) =>
                                current.id === item.id ? { ...current, result: "已封堵" } : current,
                              ),
                            })
                          }
                        >
                          <Check size={14} />
                          标记已封堵
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <SectionTitle title="材料明细" subtitle="材料用量进入库存与成本台账" action={
                <button type="button" className="text-button" onClick={addMaterial}>
                  <Plus size={14} />
                  添加材料
                </button>
              } />
              <div className="material-table">
                <div className="material-head">
                  <span>材料</span>
                  <span>规格</span>
                  <span>单位</span>
                  <span>数量</span>
                </div>
                {order.materials.map((material) => (
                  <div className="material-row" key={material.id}>
                    <input value={material.name} onChange={(event) => update({
                      materials: order.materials.map((item) =>
                        item.id === material.id ? { ...item, name: event.target.value } : item,
                      ),
                    })} />
                    <input value={material.spec} onChange={(event) => update({
                      materials: order.materials.map((item) =>
                        item.id === material.id ? { ...item, spec: event.target.value } : item,
                      ),
                    })} />
                    <select value={material.unit} onChange={(event) => update({
                      materials: order.materials.map((item) =>
                        item.id === material.id ? { ...item, unit: event.target.value } : item,
                      ),
                    })}>
                      <option>kg</option>
                      <option>支</option>
                      <option>卷</option>
                      <option>张</option>
                      <option>包</option>
                    </select>
                    <input type="number" min="0" step="0.1" value={material.quantity} onChange={(event) => update({
                      materials: order.materials.map((item) =>
                        item.id === material.id ? { ...item, quantity: Number(event.target.value) } : item,
                      ),
                    })} />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="panel sealing-rail">
            <SectionTitle title="施工进度" subtitle={`${completed}/${order.items.length} 个部位已封堵`} />
            <ProgressBar value={progress} tone={progress === 100 ? "teal" : "amber"} />
            <div className="rail-number">{progress}%</div>
            <div className="summary-list">
              <div>
                <span>材料行</span>
                <strong>{order.materials.length}</strong>
              </div>
              <div>
                <span>前后照片</span>
                <strong>{order.items.filter((item) => item.afterPhoto).length * 2}/{order.items.length * 2}</strong>
              </div>
              <div>
                <span>客户签字</span>
                <strong>{isSigned ? "已完成" : "未完成"}</strong>
              </div>
            </div>
            <button type="button" className="button primary full-width" onClick={() => setSignatureOpen(true)}>
              <Signature size={16} />
              打开手机签字
            </button>
            <p className="rail-note">签字完成后，报告快照和签名图片哈希一并锁定。</p>
          </aside>
        </div>
      ) : null}

      {tab === "验收与签字" ? (
        <div className="detail-grid">
          <section className="panel">
            <SectionTitle title="验收标准" subtitle="来自封堵服务单模板" />
            <textarea
              className="large-textarea"
              rows={4}
              value={order.acceptanceCriteria}
              onChange={(event) => update({ acceptanceCriteria: event.target.value })}
            />
          </section>
          <section className="panel">
            <SectionTitle title="卫生改善建议" subtitle="给门店的可执行整改要求" />
            <textarea
              className="large-textarea"
              rows={4}
              value={order.hygieneAdvice}
              onChange={(event) => update({ hygieneAdvice: event.target.value })}
            />
          </section>
          <section className="panel">
            <SectionTitle title="验收结果" subtitle="客户确认后进入复检" />
            <div className="acceptance-box">
              <div>
                <span>当前结果</span>
                <StatusPill status={order.acceptanceResult} />
              </div>
              <div className="chip-grid">
                {["待验收", "已采纳", "需整改"].map((item) => (
                  <Chip
                    key={item}
                    active={order.acceptanceResult === item}
                    onClick={() => update({ acceptanceResult: item as SealingOrder["acceptanceResult"] })}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
            </div>
            <Field label="建议服务频率">
              <select value={order.frequency} onChange={(event) => update({ frequency: event.target.value })}>
                <option>每月 2 次</option>
                <option>每季度 1 次</option>
                <option>每半年 1 次</option>
              </select>
            </Field>
          </section>
          <section className="panel">
            <SectionTitle title="后续服务建议" subtitle="用于复检计划和下一次服务" />
            <textarea
              className="large-textarea"
              rows={4}
              value={order.followUpAdvice}
              onChange={(event) => update({ followUpAdvice: event.target.value })}
            />
          </section>
          <section className="panel signature-panel">
            <SectionTitle
              title="双方手写签字"
              subtitle="封堵责任人先签，再把同一台手机交给客户代表签字"
              action={<StatusPill status={bothSigned ? "双方已签" : "待签字"} />}
            />
            <div className="signature-party-grid">
              <SignaturePartyCard
                label="封堵责任人签字"
                signerName={order.leader}
                hint="由封堵责任人在本机手写签名"
                signature={signatures.responsible}
                onSign={() => setSignatureOpen(true)}
              />
              <SignaturePartyCard
                label="客户代表签字"
                signerName={site.contact}
                hint="由客户代表在同一台手机上签名"
                signature={signatures.customer}
                onSign={() => setSignatureOpen(true)}
              />
            </div>
            <button type="button" className="button primary" onClick={() => setSignatureOpen(true)}>
              <Signature size={16} />
              {bothSigned ? "重新发起双方签字" : "打开手机签字"}
            </button>
          </section>
        </div>
      ) : null}

      {tab === "报告预览" ? (
        <div className="report-inline">
          <div className="report-inline-head">
            <span>版本 v1 · 2026-10-18 17:33 · {bothSigned ? "双方已签" : "待签字"}</span>
            <button type="button" className="button primary" onClick={() => void generateBackendReport()}>
              <FileText size={16} />
              打开完整预览
            </button>
          </div>
          <SealingReportSheet order={reportOrder} site={site} />
        </div>
      ) : null}

      <SignatureCapture
        open={signatureOpen}
        title={`${order.reportNo} · 封堵单双方签字`}
        subtitle="由封堵责任人在手机上先签，再把同一台手机交给客户代表签字。"
        parties={[
          {
            key: "responsible",
            label: "封堵责任人签字",
            signerName: order.leader,
            hint: "封堵责任人在本机手写签名",
          },
          {
            key: "customer",
            label: "客户代表签字",
            signerName: site.contact,
            hint: "客户代表在同一台手机上签名",
          },
        ]}
        initial={signatures}
        onClose={() => setSignatureOpen(false)}
        onComplete={completeSignatures}
      />
    </div>
  );
}

