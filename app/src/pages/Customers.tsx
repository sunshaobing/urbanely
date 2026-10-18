import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  FileWarning,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import { inspections, sealingOrders, serviceOrders, sites } from "../data";
import type { RiskLevel, Site } from "../types";
import { ProgressBar, RiskPill, SectionTitle, StatusPill } from "../components/ui";

interface CustomersProps {
  onNotify: (message: string) => void;
}

export function Customers({ onNotify }: CustomersProps) {
  const [query, setQuery] = useState("");
  const [risk, setRisk] = useState<"全部" | RiskLevel>("全部");
  const [selectedId, setSelectedId] = useState(sites[0].id);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return sites.filter((site) => {
      const match =
        !normalized ||
        site.name.toLowerCase().includes(normalized) ||
        site.customer.toLowerCase().includes(normalized) ||
        site.code.includes(normalized);
      return match && (risk === "全部" || site.risk === risk);
    });
  }, [query, risk]);

  const selected = sites.find((site) => site.id === selectedId) ?? sites[0];

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">CUSTOMERS / SITES</span>
          <h1>客户与门店</h1>
          <p>合同、服务频率、风险和未闭环隐患放在同一个门店视图里。</p>
        </div>
        <div className="page-actions">
          <button type="button" className="button primary" onClick={() => onNotify("已创建客户草稿")}>
            <Building2 size={16} />
            新建客户
          </button>
        </div>
      </div>

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
              <span>客户类型</span>
              <span>风险</span>
              <span>合同</span>
              <span>下次服务</span>
              <span>未闭环</span>
            </div>
            {filtered.map((site) => (
              <button
                type="button"
                key={site.id}
                className={`table-row ${site.id === selected.id ? "selected" : ""}`}
                onClick={() => setSelectedId(site.id)}
              >
                <span className="cell-main">
                  <strong>{site.name}</strong>
                  <small>
                    <MapPin size={12} />
                    {site.region} · {site.code}
                  </small>
                </span>
                <span>{site.customerType}</span>
                <span>
                  <RiskPill risk={site.risk} compact />
                </span>
                <span>
                  <StatusPill status={site.contractStatus} />
                </span>
                <span>{site.nextService}</span>
                <span className="mono">{site.openFindings}</span>
              </button>
            ))}
          </div>
        </section>

        <SiteProfile site={selected} onNotify={onNotify} />
      </div>
    </div>
  );
}

function SiteProfile({ site, onNotify }: { site: Site; onNotify: (message: string) => void }) {
  const siteInspections = inspections.filter((inspection) => inspection.siteId === site.id);
  const siteSealing = sealingOrders.filter((order) => order.siteId === site.id);
  const siteServices = serviceOrders.filter((order) => order.siteId === site.id);
  const openFindings = siteInspections.flatMap((inspection) =>
    inspection.findings.filter((finding) => finding.status !== "已封堵"),
  );

  return (
    <aside className="panel site-profile">
      <div className="site-profile-head">
        <div className="site-avatar">
          <Store size={22} />
        </div>
        <div>
          <span className="eyebrow">SITE PROFILE</span>
          <h2>{site.name}</h2>
          <p>{site.customer} · 编码 {site.code}</p>
        </div>
        <RiskPill risk={site.risk} />
      </div>

      <div className="site-contact">
        <div>
          <span>门店地址</span>
          <strong>{site.address}</strong>
        </div>
        <div>
          <span>联系人</span>
          <strong>{site.contact}</strong>
        </div>
        <div>
          <span>联系电话</span>
          <strong>
            <Phone size={13} />
            {site.phoneMasked}
          </strong>
        </div>
        <div>
          <span>服务频率</span>
          <strong>{site.frequency}</strong>
        </div>
      </div>

      <div className="site-health">
        <div>
          <span>风险分</span>
          <strong>{site.risk === "critical" ? "92" : site.risk === "high" ? "78" : site.risk === "medium" ? "54" : "26"}</strong>
          <small>/ 100</small>
        </div>
        <ProgressBar
          value={site.risk === "critical" ? 92 : site.risk === "high" ? 78 : site.risk === "medium" ? 54 : 26}
          tone={site.risk === "critical" || site.risk === "high" ? "red" : "amber"}
        />
      </div>

      <div className="site-kpis">
        <div>
          <CalendarClock size={16} />
          <span>下次服务</span>
          <strong>{site.nextService}</strong>
        </div>
        <div>
          <ShieldCheck size={16} />
          <span>未闭环隐患</span>
          <strong>{openFindings.length}</strong>
        </div>
        <div>
          <FileWarning size={16} />
          <span>合同附件</span>
          <strong>{site.contractStatus}</strong>
        </div>
      </div>

      <section className="profile-section">
        <SectionTitle title="未闭环隐患" subtitle="按严重度排序" />
        <div className="profile-findings">
          {openFindings.slice(0, 4).map((finding) => (
            <div key={finding.id}>
              <RiskPill risk={finding.severity} compact />
              <strong>{finding.location}</strong>
              <span>{finding.type} · {finding.status}</span>
            </div>
          ))}
          {openFindings.length === 0 ? (
            <div className="profile-empty">
              <CheckCircle2 size={18} />
              暂无未闭环隐患
            </div>
          ) : null}
        </div>
      </section>

      <section className="profile-section">
        <SectionTitle title="最近单据" subtitle="勘测、封堵、服务单" />
        <div className="timeline">
          {siteInspections.slice(0, 2).map((inspection) => (
            <div className="timeline-item" key={inspection.id}>
              <i />
              <div>
                <span className="mono">{inspection.reportNo}</span>
                <strong>现场勘测 · {inspection.status}</strong>
                <small>{inspection.date} · {inspection.surveyor}</small>
              </div>
            </div>
          ))}
          {siteSealing.slice(0, 2).map((order) => (
            <div className="timeline-item" key={order.id}>
              <i />
              <div>
                <span className="mono">{order.reportNo}</span>
                <strong>结构封堵 · {order.status}</strong>
                <small>{order.date} · {order.leader}</small>
              </div>
            </div>
          ))}
          {siteServices.slice(0, 2).map((order) => (
            <div className="timeline-item" key={order.id}>
              <i />
              <div>
                <span className="mono">{order.reportNo}</span>
                <strong>{order.type} · {order.status}</strong>
                <small>{order.start} · {order.technician}</small>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="site-actions">
        <button type="button" className="button secondary" onClick={() => onNotify("已打开服务计划")}>
          查看服务计划
        </button>
        <button type="button" className="button primary" onClick={() => onNotify("已创建该门店的勘测任务")}>
          安排勘测
          <ArrowUpRight size={15} />
        </button>
      </div>
    </aside>
  );
}

