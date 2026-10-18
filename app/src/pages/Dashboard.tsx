import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  MapPin,
  Plus,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { getSite, tasks, topHazards, weeklyTrend } from "../data";
import type { PageKey } from "../types";
import { Metric, RiskPill, SectionTitle, StatusPill } from "../components/ui";

interface DashboardProps {
  onNavigate: (page: PageKey) => void;
  onOpenInspection: (id: string) => void;
}

export function Dashboard({ onNavigate, onOpenInspection }: DashboardProps) {
  const maxTrend = Math.max(...weeklyTrend.map((item) => item.total));

  return (
    <div className="page dashboard-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">SUNDAY · 2026.10.18</span>
          <h1>运营工作台</h1>
          <p>先处理高风险和逾期复检，再看今天的作业节奏。</p>
        </div>
        <div className="page-actions">
          <button type="button" className="button secondary" onClick={() => onNavigate("reports")}>
            <FileText size={16} />
            导出周报
          </button>
          <button type="button" className="button primary" onClick={() => onNavigate("inspections")}>
            <Plus size={16} />
            新建勘测
          </button>
        </div>
      </div>

      <section className="metrics-strip">
        <Metric
          label="待整改"
          value="8"
          hint="其中 3 家高风险门店"
          icon={<Wrench size={18} />}
          tone="amber"
        />
        <Metric
          label="今日作业"
          value="12"
          hint="6 项已出发，2 项待提交"
          icon={<ClipboardCheck size={18} />}
          tone="teal"
        />
        <Metric
          label="逾期复检"
          value="3"
          hint="最早逾期 3 天"
          icon={<CalendarClock size={18} />}
          tone="red"
        />
        <Metric
          label="封堵闭环率"
          value="92.4%"
          hint="较上月 +4.8%"
          icon={<CheckCircle2 size={18} />}
          tone="blue"
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel panel-span-2">
          <SectionTitle
            title="今日作业"
            subtitle="按计划时间排序，风险高的任务优先展示"
            action={
              <button type="button" className="text-button" onClick={() => onNavigate("services")}>
                查看全部
                <ArrowUpRight size={14} />
              </button>
            }
          />
          <div className="data-table compact-table">
            <div className="table-head">
              <span>时间</span>
              <span>门店</span>
              <span>类型</span>
              <span>负责人</span>
              <span>状态</span>
              <span>优先级</span>
            </div>
            {tasks.map((task) => {
              const site = getSite(task.siteId);
              return (
                <button
                  type="button"
                  className="table-row"
                  key={task.id}
                  onClick={() => onOpenInspection("insp-1")}
                >
                  <span className="mono">{task.time}</span>
                  <span className="cell-main">
                    <strong>{site.name}</strong>
                    <small>
                      <MapPin size={12} />
                      {site.region}
                    </small>
                  </span>
                  <span>{task.type}</span>
                  <span>{task.assignee}</span>
                  <span>
                    <StatusPill status={task.status} />
                  </span>
                  <span>
                    <RiskPill risk={task.priority} compact />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="panel risk-panel">
          <SectionTitle
            title="风险队列"
            subtitle="按风险、逾期和证据缺口排序"
            action={<span className="count-badge">6</span>}
          />
          <button type="button" className="risk-item" onClick={() => onOpenInspection("insp-3")}>
            <div className="risk-item-top">
              <RiskPill risk="critical" compact />
              <span className="mono">KC-2026-BG-126</span>
            </div>
            <strong>好特卖·龙华壹方天地</strong>
            <p>外墙管线孔洞 + 冷柜底部鼠迹，封堵未完成。</p>
            <span className="risk-meta">
              <Clock3 size={13} /> 复检 10-20 · 还剩 2 天
            </span>
          </button>
          <button type="button" className="risk-item" onClick={() => onOpenInspection("insp-1")}>
            <div className="risk-item-top">
              <RiskPill risk="high" compact />
              <span className="mono">KC-2026-BG-128</span>
            </div>
            <strong>趣坊·深圳水围店</strong>
            <p>3 处结构隐患待整改，复检日期已逾期 3 天。</p>
            <span className="risk-meta danger">
              <AlertTriangle size={13} /> 逾期复检 · 需立即处理
            </span>
          </button>
          <button type="button" className="risk-item" onClick={() => onNavigate("services")}>
            <div className="risk-item-top">
              <RiskPill risk="high" compact />
              <span className="mono">STFW-2026-168</span>
            </div>
            <strong>趣坊·深圳水围店</strong>
            <p>服务单缺少现场负责人签字，报告暂不可发布。</p>
            <span className="risk-meta">
              <ShieldAlert size={13} /> 证据缺口 · 1 项
            </span>
          </button>
        </aside>

        <section className="panel">
          <SectionTitle
            title="本周服务节奏"
            subtitle="已完成 / 计划"
            action={<span className="legend"><i className="legend-done" />已完成 <i className="legend-total" />计划</span>}
          />
          <div className="bar-chart" aria-label="本周服务完成情况">
            {weeklyTrend.map((item) => (
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
          <SectionTitle title="高频隐患" subtitle="近 30 天，按隐患点数量" />
          <div className="hazard-list">
            {topHazards.map((item, index) => (
              <div className="hazard-row" key={item.name}>
                <span className="hazard-rank">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <div className="hazard-label">
                    <strong>{item.name}</strong>
                    <span className="mono">{item.value}</span>
                  </div>
                  <div className="hazard-bar">
                    <span style={{ width: `${(item.value / topHazards[0].value) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

