import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  MapPin,
  Pencil,
  Phone,
  Search,
  ShieldCheck,
  Store,
  Trash2,
} from "lucide-react";
import type { RiskLevel, Site } from "../types";
import type { BackendCustomer, BackendSite } from "../api";
import { ProgressBar, RiskPill, SectionTitle, StatusPill } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { CustomerEditor, DeleteCustomerDialog } from "../components/CustomerEditor";
import { DispatchSurveyDialog } from "../components/DispatchSurveyDialog";
import { useLiveData } from "../liveData";
import {
  buildSites,
  inspectionStatusFromBackend,
  riskLevelFromBackend,
  sealingStatusFromBackend,
} from "../backendMappers";

interface CustomersProps {
  onNotify: (message: string) => void;
}

export function Customers({ onNotify }: CustomersProps) {
  const {
    customers,
    error,
    lastUpdated,
    refresh,
    riskSurveys,
    serviceReports,
    sites,
    workorders,
  } = useLiveData();
  const liveSites = useMemo(
    () => buildSites(customers, sites, workorders, riskSurveys),
    [customers, riskSurveys, sites, workorders],
  );
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<"全部" | RiskLevel>("全部");
  const [selectedId, setSelectedId] = useState("");
  const [editor, setEditor] = useState<
    { mode: "create" } | { mode: "edit"; customerId: number } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    customer: BackendCustomer;
    site?: BackendSite;
    hasWorkOrders: boolean;
  } | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<{
    customer: BackendCustomer;
    site?: BackendSite;
  } | null>(null);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return liveSites.filter((site) => {
      const match =
        !normalized ||
        site.name.toLowerCase().includes(normalized) ||
        site.customer.toLowerCase().includes(normalized) ||
        site.code.includes(normalized);
      return match && (risk === "全部" || site.risk === risk);
    });
  }, [liveSites, query, risk]);
  const selected =
    liveSites.find((site) => site.id === selectedId) ?? liveSites[0] ?? null;
  const selectedCustomer = selected ? customerRecord(selected) : undefined;

  function customerRecord(site: Site) {
    const id = Number(site.id.replace("customer-", ""));
    return customers.find((customer) => customer.id === id);
  }

  function siteRecord(customerId: number) {
    return sites.find((site) => site.customer_id === customerId);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="LIVE CUSTOMERS / SITES"
        title="客户与门店"
        description="客户、门店、合同状态和关联单据直接读取生产后端。"
        meta={
          <>
            <span className="live-dot" />
            {error
              ? `同步异常：${error}`
              : `${liveSites.length} 家门店 · 实时同步 ${lastUpdated}`}
          </>
        }
        actions={
          <button type="button" className="button primary" onClick={() => setEditor({ mode: "create" })}>
            <Building2 size={16} />
            新建客户
          </button>
        }
      />

      <section className="metrics-strip compact-metrics">
        <div className="mini-metric">
          <span>客户门店</span>
          <strong>{liveSites.length}</strong>
          <small>来自客户与门店接口</small>
        </div>
        <div className="mini-metric">
          <span>高风险门店</span>
          <strong>{liveSites.filter((site) => ["high", "critical"].includes(site.risk)).length}</strong>
          <small>按实时勘测风险排序</small>
        </div>
        <div className="mini-metric">
          <span>未闭环隐患</span>
          <strong>{liveSites.reduce((sum, site) => sum + site.openFindings, 0)}</strong>
          <small>分布在 {liveSites.filter((site) => site.openFindings > 0).length} 家门店</small>
        </div>
        <div className="mini-metric">
          <span>封堵报告</span>
          <strong>{serviceReports.length}</strong>
          <small>{serviceReports.filter((report) => ["approved", "completed"].includes(report.status)).length} 张已完成</small>
        </div>
      </section>

      <div className="filter-bar">
        <label className="inline-search customer-search">
          <Search size={15} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索客户、门店或编码" />
        </label>
        <div className="segmented">
          {(["全部", "critical", "high", "medium", "low"] as const).map((item) => (
            <button type="button" key={item} className={risk === item ? "active" : ""} onClick={() => setRisk(item)}>
              {item === "全部" ? "全部" : item === "critical" ? "极高" : item === "high" ? "高" : item === "medium" ? "中" : "低"}
            </button>
          ))}
        </div>
      </div>

      <div className="customer-layout">
        <section className="panel table-panel customer-table-panel">
          <div className="data-table customer-table">
            <div className="table-head">
              <span>门店</span>
              <span>客户</span>
              <span>风险</span>
              <span>合同</span>
              <span>下次服务</span>
              <span>未闭环</span>
            </div>
            {filtered.map((site) => (
              <button
                type="button"
                key={site.id}
                className={`table-row ${selected?.id === site.id ? "selected" : ""}`}
                onClick={() => setSelectedId(site.id)}
              >
                <span className="cell-main">
                  <strong>{site.name}</strong>
                  <small><MapPin size={12} />{site.region || site.address} · {site.code}</small>
                </span>
                <span>{site.customer}</span>
                <span><RiskPill risk={site.risk} compact /></span>
                <span><StatusPill status={site.contractStatus} /></span>
                <span>{site.nextService}</span>
                <span className="mono">{site.openFindings}</span>
              </button>
            ))}
            {!filtered.length ? <div className="personnel-empty">后端暂无匹配客户。</div> : null}
          </div>
        </section>
        {selected ? (
          <SiteProfile
            site={selected}
            surveys={riskSurveys}
            reports={serviceReports}
            workorders={workorders}
            canManage={Boolean(selectedCustomer)}
            onNotify={onNotify}
            onDispatch={() => {
              if (selectedCustomer) {
                setDispatchTarget({
                  customer: selectedCustomer,
                  site: siteRecord(selectedCustomer.id),
                });
              }
            }}
            onEdit={() => {
              if (selectedCustomer) {
                setEditor({ mode: "edit", customerId: selectedCustomer.id });
              }
            }}
            onDelete={() => {
              if (!selectedCustomer) return;
              setDeleteTarget({
                customer: selectedCustomer,
                site: siteRecord(selectedCustomer.id),
                hasWorkOrders: workorders.some(
                  (task) => task.customer_id === selectedCustomer.id,
                ),
              });
            }}
          />
        ) : (
          <aside className="panel site-profile"><div className="personnel-empty">暂无客户数据。</div></aside>
        )}
      </div>

      {editor ? (
        <CustomerEditor
          key={editor.mode === "edit" ? editor.customerId : "new"}
          mode={editor.mode}
          customer={
            editor.mode === "edit"
              ? customers.find((customer) => customer.id === editor.customerId)
              : undefined
          }
          site={
            editor.mode === "edit"
              ? siteRecord(editor.customerId)
              : undefined
          }
          onClose={() => setEditor(null)}
          onSaved={async (customerId) => {
            setSelectedId(`customer-${customerId}`);
            await refresh();
          }}
          onNotify={onNotify}
        />
      ) : null}

      {deleteTarget ? (
        <DeleteCustomerDialog
          customer={deleteTarget.customer}
          site={deleteTarget.site}
          hasWorkOrders={deleteTarget.hasWorkOrders}
          onClose={() => setDeleteTarget(null)}
          onDeleted={refresh}
          onNotify={onNotify}
        />
      ) : null}

      {dispatchTarget ? (
        <DispatchSurveyDialog
          customer={dispatchTarget.customer}
          site={dispatchTarget.site}
          onClose={() => setDispatchTarget(null)}
          onDispatched={refresh}
          onNotify={onNotify}
        />
      ) : null}
    </div>
  );
}

function SiteProfile({
  site,
  surveys,
  reports,
  workorders,
  canManage,
  onNotify,
  onDispatch,
  onEdit,
  onDelete,
}: {
  site: Site;
  surveys: ReturnType<typeof useLiveData>["riskSurveys"];
  reports: ReturnType<typeof useLiveData>["serviceReports"];
  workorders: ReturnType<typeof useLiveData>["workorders"];
  canManage: boolean;
  onNotify: (message: string) => void;
  onDispatch: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const customerId = Number(site.id.replace("customer-", ""));
  const customerWorkorders = workorders.filter((task) => task.customer_id === customerId);
  const customerSurveys = surveys.filter((survey) => survey.customer_id === customerId);
  const customerReports = reports.filter((report) => report.customer_id === customerId);
  const openItems = customerSurveys.flatMap((survey) =>
    (survey.items || []).map((item) => ({
      ...item,
      risk: riskLevelFromBackend(survey.risk_level),
      status: inspectionStatusFromBackend(survey.status),
    })),
  );
  const riskScore = site.risk === "critical" ? 92 : site.risk === "high" ? 78 : site.risk === "medium" ? 54 : 26;

  return (
    <aside className="panel site-profile">
      <div className="site-profile-head">
        <div className="site-avatar"><Store size={22} /></div>
        <div>
          <span className="eyebrow">LIVE SITE PROFILE</span>
          <h2>{site.name}</h2>
          <p>{site.customer} · 编码 {site.code}</p>
        </div>
        <RiskPill risk={site.risk} />
        {canManage ? (
          <div className="site-profile-tools">
            <button
              type="button"
              className="icon-button"
              aria-label="编辑客户与门店"
              onClick={onEdit}
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              className="icon-button danger"
              aria-label="删除客户与门店"
              onClick={onDelete}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ) : null}
      </div>

      <div className="site-contact">
        <div><span>门店地址</span><strong>{site.address}</strong></div>
        <div><span>联系人</span><strong>{site.contact}</strong></div>
        <div><span>联系电话</span><strong><Phone size={13} />{site.phoneMasked}</strong></div>
        <div><span>服务频率</span><strong>{site.frequency}</strong></div>
      </div>

      <div className="site-health">
        <div><span>风险分</span><strong>{riskScore}</strong><small>/ 100</small></div>
        <ProgressBar value={riskScore} tone={site.risk === "critical" || site.risk === "high" ? "red" : "amber"} />
      </div>

      <div className="site-kpis">
        <div><CalendarClock size={16} /><span>下次服务</span><strong>{site.nextService}</strong></div>
        <div><ShieldCheck size={16} /><span>未闭环隐患</span><strong>{openItems.length}</strong></div>
        <div><FileWarning size={16} /><span>关联报告</span><strong>{customerSurveys.length + customerReports.length}</strong></div>
      </div>

      <section className="profile-section">
        <SectionTitle title="未闭环隐患" subtitle="来自实时勘测明细" />
        <div className="profile-findings">
          {openItems.slice(0, 4).map((item, index) => (
            <div key={`${item.location}-${index}`}>
              <RiskPill risk={item.risk} compact />
              <strong>{item.location}</strong>
              <span>{item.description || item.status}</span>
            </div>
          ))}
          {!openItems.length ? <div className="profile-empty"><CheckCircle2 size={18} />暂无未闭环隐患</div> : null}
        </div>
      </section>

      <section className="profile-section">
        <SectionTitle title="最近单据" subtitle="作业单、勘测与封堵" />
        <div className="timeline">
          {customerWorkorders.slice(0, 3).map((task) => (
            <div className="timeline-item" key={`wo-${task.id}`}>
              <i />
              <div>
                <span className="mono">{task.report_no}</span>
                <strong>{task.service_type || "现场作业"} · {task.status}</strong>
                <small>{task.service_date || task.report_date || "—"} · {task.engineer_name || "—"}</small>
              </div>
            </div>
          ))}
          {customerSurveys.slice(0, 2).map((survey) => (
            <div className="timeline-item" key={`survey-${survey.id}`}>
              <i />
              <div>
                <span className="mono">{survey.code || `KC-${survey.id}`}</span>
                <strong>现场勘测 · {inspectionStatusFromBackend(survey.status)}</strong>
                <small>{survey.survey_date || "—"} · {survey.contact_person || "—"}</small>
              </div>
            </div>
          ))}
          {customerReports.slice(0, 2).map((report) => (
            <div className="timeline-item" key={`report-${report.id}`}>
              <i />
              <div>
                <span className="mono">{report.report_no || `STFD-${report.id}`}</span>
                <strong>结构封堵 · {sealingStatusFromBackend(report.status)}</strong>
                <small>{report.service_date || "—"} · {report.service_person || "—"}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="site-actions">
        <button type="button" className="button secondary" onClick={() => onNotify("服务计划需在业务配置中维护")}>
          查看服务计划
        </button>
        <button type="button" className="button primary" onClick={onDispatch}>
          安排勘测
          <ArrowUpRight size={15} />
        </button>
      </div>
    </aside>
  );
}
