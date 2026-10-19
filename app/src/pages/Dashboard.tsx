import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  MapPin,
  Plus,
  Wrench,
} from "lucide-react";
import type { PageKey } from "../types";
import { Metric, RiskPill, SectionTitle, StatusPill } from "../components/ui";
import { PageHeader } from "../components/PageHeader";
import { useLiveData } from "../liveData";
import {
  buildSites,
  inspectionStatusFromBackend,
  riskLevelFromBackend,
  toTask,
} from "../backendMappers";

interface DashboardProps {
  onNavigate: (page: PageKey) => void;
  onOpenInspection: (id: string) => void;
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function Dashboard({ onNavigate, onOpenInspection }: DashboardProps) {
  const {
    customers,
    error,
    lastUpdated,
    loading,
    riskSurveys,
    serviceReports,
    sites,
    summary,
    warnings,
    workorders,
  } = useLiveData();
  const liveSites = buildSites(customers, sites, workorders, riskSurveys);
  const siteById = new Map(liveSites.map((site) => [site.id, site]));
  const today = new Date().toISOString().slice(0, 10);
  const openSurveys = riskSurveys.filter(
    (survey) => !["approved", "completed"].includes(survey.status),
  );
  const overdueSurveys = openSurveys.filter(
    (survey) => Boolean(survey.review_date && survey.review_date < today),
  );
  const completedReports = serviceReports.filter((report) =>
    ["approved", "completed"].includes(report.status),
  );
  const activeReports = serviceReports.filter(
    (report) => !["approved", "completed"].includes(report.status),
  );
  const tasks = workorders.slice(0, 8).map(toTask);
  const riskQueue = [...riskSurveys]
    .filter((survey) =>
      ["critical", "high", "极高", "高"].includes(survey.risk_level || ""),
    )
    .sort((left, right) =>
      (left.review_date || "9999").localeCompare(right.review_date || "9999"),
    )
    .slice(0, 3);
  const closureRate = percent(completedReports.length, serviceReports.length);
  const weekCounts = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      day: date.toLocaleDateString("zh-CN", { weekday: "short" }),
      total: workorders.filter(
        (task) => (task.service_date || task.report_date)?.slice(0, 10) === key,
      ).length,
      completed: workorders.filter(
        (task) =>
          (task.service_date || task.report_date)?.slice(0, 10) === key &&
          ["approved", "completed"].includes(task.status),
      ).length,
    };
  });
  const maxTrend = Math.max(1, ...weekCounts.map((item) => item.total));
  const hazardCounts = new Map<string, number>();
  riskSurveys.forEach((survey) => {
    (survey.items || []).forEach((item) => {
      const key = item.description || item.location || "结构隐患";
      hazardCounts.set(key, (hazardCounts.get(key) || 0) + 1);
    });
  });
  const hazards = [...hazardCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);

  return (
    <div className="page dashboard-page">
      <PageHeader
        eyebrow="LIVE OPERATIONS"
        title="运营工作台"
        description="指标直接读取生产后端，窗口重新聚焦和每 12 秒自动刷新。"
        meta={
          <>
            <span className="live-dot" />
            {loading
              ? "正在加载实时数据"
              : error
                ? `同步异常：${error}`
                : `实时同步 ${lastUpdated} · ${warnings[0] || "全部数据源正常"}`}
          </>
        }
        actions={
          <>
            <button type="button" className="button secondary" onClick={() => onNavigate("reports")}>
              <FileText size={16} />
              报告中心
            </button>
            <button type="button" className="button primary" onClick={() => onNavigate("inspections")}>
              <Plus size={16} />
              查看勘测
            </button>
          </>
        }
      />

      <section className="metrics-strip">
        <Metric
          label="未闭环勘测"
          value={String(openSurveys.length)}
          hint={`共 ${riskSurveys.length} 张勘测报告`}
          icon={<Wrench size={18} />}
          tone="amber"
        />
        <Metric
          label="现场作业单"
          value={String(workorders.length)}
          hint={`${summary?.cards.total_holes || 0} 个封堵部位`}
          icon={<ClipboardCheck size={18} />}
          tone="teal"
        />
        <Metric
          label="逾期复检"
          value={String(overdueSurveys.length)}
          hint={overdueSurveys.length ? "需要优先处理" : "暂无逾期"}
          icon={<CalendarClock size={18} />}
          tone="red"
        />
        <Metric
          label="封堵完成率"
          value={`${closureRate}%`}
          hint={`${completedReports.length}/${serviceReports.length} 张封堵报告`}
          icon={<CheckCircle2 size={18} />}
          tone="blue"
        />
      </section>

      <section className="panel flow-panel">
        <SectionTitle
          title="实时闭环存量"
          subtitle="数据来自当前登录账号可见的生产 API"
          action={<span className="live-badge"><i />LIVE</span>}
        />
        <div className="flow-map">
          <div className="flow-node flow-teal">
            <span className="flow-index">01</span>
            <span className="flow-label">现场勘测</span>
            <strong>{openSurveys.length}</strong>
            <small>{riskSurveys.length} 张累计</small>
            <div className="flow-progress"><span style={{ width: `${percent(openSurveys.length, Math.max(1, riskSurveys.length))}%` }} /></div>
          </div>
          <div className="flow-connector" />
          <div className="flow-node flow-amber">
            <span className="flow-index">02</span>
            <span className="flow-label">待整改</span>
            <strong>{openSurveys.filter((survey) => inspectionStatusFromBackend(survey.status) === "待整改").length}</strong>
            <small>高风险 {riskQueue.length} 张</small>
            <div className="flow-progress"><span style={{ width: "68%" }} /></div>
          </div>
          <div className="flow-connector" />
          <div className="flow-node flow-blue">
            <span className="flow-index">03</span>
            <span className="flow-label">结构封堵</span>
            <strong>{activeReports.length}</strong>
            <small>{serviceReports.length} 张累计</small>
            <div className="flow-progress"><span style={{ width: `${percent(activeReports.length, Math.max(1, serviceReports.length))}%` }} /></div>
          </div>
          <div className="flow-connector" />
          <div className="flow-node flow-red">
            <span className="flow-index">04</span>
            <span className="flow-label">逾期复检</span>
            <strong>{overdueSurveys.length}</strong>
            <small>{overdueSurveys.length ? "需要立即处理" : "当前无逾期"}</small>
            <div className="flow-progress"><span style={{ width: `${percent(overdueSurveys.length, Math.max(1, openSurveys.length))}%` }} /></div>
          </div>
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="panel panel-span-2">
          <SectionTitle
            title="现场作业"
            subtitle="最新服务端作业单"
            action={
              <button type="button" className="text-button" onClick={() => onNavigate("services")}>
                查看全部
                <ArrowUpRight size={14} />
              </button>
            }
          />
          <div className="data-table compact-table">
            <div className="table-head">
              <span>日期</span>
              <span>门店</span>
              <span>类型</span>
              <span>负责人</span>
              <span>状态</span>
              <span>风险</span>
            </div>
            {tasks.map((task, index) => {
              const site = siteById.get(task.siteId);
              const raw = workorders[index];
              return (
                <button
                  type="button"
                  className="table-row"
                  key={task.id}
                  onClick={() => {
                    const inspection = riskSurveys.find(
                      (survey) => survey.customer_id === raw?.customer_id,
                    );
                    if (inspection) onOpenInspection(String(inspection.id));
                    else onNavigate("services");
                  }}
                >
                  <span className="mono">{task.time}</span>
                  <span className="cell-main">
                    <strong>{site?.name || raw?.customer_name || "—"}</strong>
                    <small><MapPin size={12} />{raw?.service_address || site?.address || "—"}</small>
                  </span>
                  <span>{raw?.service_type || task.type}</span>
                  <span>{task.assignee}</span>
                  <span><StatusPill status={raw?.status || task.status} /></span>
                  <span><RiskPill risk={riskLevelFromBackend(raw?.density)} compact /></span>
                </button>
              );
            })}
            {!tasks.length ? <div className="personnel-empty">后端当前没有作业单。</div> : null}
          </div>
        </section>

        <aside className="panel risk-panel">
          <SectionTitle title="风险队列" subtitle="高风险勘测报告" action={<span className="count-badge">{riskQueue.length}</span>} />
          {riskQueue.map((survey) => {
            const task = workorders.find((item) => item.customer_id === survey.customer_id);
            return (
              <button type="button" className="risk-item" key={survey.id} onClick={() => onOpenInspection(String(survey.id))}>
                <div className="risk-item-top">
                  <RiskPill risk={riskLevelFromBackend(survey.risk_level)} compact />
                  <span className="mono">{survey.code || `KC-${survey.id}`}</span>
                </div>
                <strong>{survey.customer_name || task?.customer_name || `客户 ${survey.customer_id}`}</strong>
                <p>{survey.conclusion || survey.comprehensive_plan || "查看实时勘测详情"}</p>
                <span className="risk-meta"><Clock3 size={13} /> 复检 {survey.review_date || "待安排"}</span>
              </button>
            );
          })}
          {!riskQueue.length ? <div className="personnel-empty">当前没有高风险勘测。</div> : null}
        </aside>

        <section className="panel">
          <SectionTitle title="近 7 天作业" subtitle="已完成 / 计划" action={<span className="legend"><i className="legend-done" />已完成 <i className="legend-total" />计划</span>} />
          <div className="bar-chart" aria-label="近 7 天作业完成情况">
            {weekCounts.map((item) => (
              <div className="bar-group" key={item.day}>
                <div className="bar-track">
                  <span className="bar-total" style={{ height: `${(item.total / maxTrend) * 100}%` }} />
                  <span className="bar-done" style={{ height: `${(item.completed / maxTrend) * 100}%` }} />
                </div>
                <small>{item.day}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <SectionTitle title="高频风险点" subtitle="来自实时勘测明细" />
          <div className="hazard-list">
            {hazards.map(([name, value], index) => (
              <div className="hazard-row" key={name}>
                <span className="hazard-rank">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className="hazard-label"><strong>{name}</strong><span className="mono">{value}</span></div>
                  <div className="hazard-bar"><span style={{ width: `${(value / Math.max(1, hazards[0]?.[1] || 1)) * 100}%` }} /></div>
                </div>
              </div>
            ))}
            {!hazards.length ? <div className="personnel-empty">暂无风险点数据。</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
