import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  QrCode,
  RefreshCw,
  UserPlus,
  WalletCards,
} from "lucide-react";
import { listContracts, itemsOf } from "../api";
import type { BackendContract } from "../api";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle, StatusPill } from "../components/ui";
import { useLiveData } from "../liveData";
import type { PageKey } from "../types";

type Period = "today" | "week" | "month";
type TrendPeriod = "week" | "month" | "year";

function dateKey(value?: string) {
  return value?.slice(0, 10) || "";
}

function localDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dayOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string) {
  if (!value) return "—";
  return value.slice(0, 19).replace("T", " ");
}

function daysBetween(start?: string, end?: string) {
  if (!start || !end) return 0;
  const startTime = new Date(`${start}T00:00:00`).getTime();
  const endTime = new Date(`${end}T00:00:00`).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0;
  return Math.max(0, Math.ceil((endTime - startTime) / 86_400_000));
}

export function DataCenter({
  onNavigate,
  onOpenInspection,
}: {
  onNavigate: (page: PageKey) => void;
  onOpenInspection: (id: string) => void;
}) {
  const {
    customers,
    error,
    lastUpdated,
    loading,
    refresh,
    refreshing,
    riskSurveys,
    templates,
    workorders,
  } = useLiveData();
  const [contracts, setContracts] = useState<BackendContract[]>([]);
  const [rankingPeriod, setRankingPeriod] = useState<Period>("today");
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>("week");
  const [contractError, setContractError] = useState("");

  useEffect(() => {
    let active = true;
    void listContracts()
      .then((payload) => {
        if (active) setContracts(itemsOf<BackendContract>(payload));
      })
      .catch((reason) => {
        if (active) {
          setContractError(
            reason instanceof Error ? reason.message : "合同数据加载失败",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [lastUpdated]);

  const today = localDateKey(new Date());
  const thisMonth = today.slice(0, 7);
  const thisYear = today.slice(0, 4);
  const todayOrders = workorders.filter(
    (order) => dateKey(order.service_date || order.report_date) === today,
  );
  const inProgressStatuses = new Set([
    "accepted",
    "checked_in",
    "in_progress",
    "submitted",
    "approved",
    "completed",
  ]);
  const newCustomers = customers.filter(
    (customer) => dateKey(customer.created_at)?.slice(0, 7) === thisMonth,
  );
  const pendingContracts = contracts.filter((contract) =>
    ["pending", "draft", "review", "待审核"].includes(contract.status || ""),
  );
  const expiringContracts = contracts.filter((contract) => {
    const end = dateKey(contract.end_date);
    return end && end >= today && end <= dayOffset(30);
  });
  const earliestStart = contracts
    .map((contract) => dateKey(contract.start_date))
    .filter(Boolean)
    .sort()[0];
  const latestEnd = contracts
    .map((contract) => dateKey(contract.end_date))
    .filter(Boolean)
    .sort()
    .at(-1);
  const managementCount = new Set(
    customers.flatMap((customer) => customer.owner_user_ids || []),
  ).size;
  const engineers = new Set(
    workorders
      .map((order) => order.engineer_name || order.supervisor_name)
      .filter(Boolean),
  );

  const ranking = useMemo(() => {
    const start =
      rankingPeriod === "today"
        ? today
        : rankingPeriod === "week"
          ? dayOffset(-6)
          : `${thisMonth}-01`;
    const counts = new Map<string, number>();
    workorders.forEach((order) => {
      const date = dateKey(order.service_date || order.report_date);
      if (!date || date < start || date > today) return;
      const name = order.engineer_name || order.supervisor_name || "未分配";
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [rankingPeriod, today, thisMonth, workorders]);

  const trend = useMemo(() => {
    if (trendPeriod === "week") {
      return Array.from({ length: 7 }, (_, index) => {
        const date = dayOffset(index - 6);
        return {
          label: new Date(`${date}T00:00:00`).toLocaleDateString("zh-CN", {
            weekday: "short",
          }),
          value: workorders.filter(
            (order) => dateKey(order.service_date || order.report_date) === date,
          ).length,
        };
      });
    }
    if (trendPeriod === "month") {
      return Array.from({ length: 4 }, (_, index) => {
        const start = dayOffset(-27 + index * 7);
        const end = dayOffset(-21 + index * 7);
        return {
          label: `第${index + 1}周`,
          value: workorders.filter((order) => {
            const date = dateKey(order.service_date || order.report_date);
            return date >= start && date <= end;
          }).length,
        };
      });
    }
    return Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, "0");
      return {
        label: `${index + 1}月`,
        value: workorders.filter((order) =>
          dateKey(order.service_date || order.report_date).startsWith(
            `${thisYear}-${month}`,
          ),
        ).length,
      };
    });
  }, [thisYear, trendPeriod, workorders]);
  const trendMax = Math.max(1, ...trend.map((item) => item.value));
  const messages = workorders
    .filter((order) => ["approved", "completed"].includes(order.status))
    .sort((left, right) =>
      (right.completed_at || right.submitted_at || "").localeCompare(
        left.completed_at || left.submitted_at || "",
      ),
    )
    .slice(0, 8);

  const metrics = [
    {
      label: "年总工单",
      value: workorders.filter((order) =>
        dateKey(order.service_date || order.report_date).startsWith(thisYear),
      ).length,
      icon: ClipboardList,
      tone: "green",
    },
    {
      label: "当日总工单",
      value: todayOrders.length,
      icon: CalendarDays,
      tone: "green",
    },
    {
      label: "当日未接单",
      value: todayOrders.filter(
        (order) => !inProgressStatuses.has(order.status),
      ).length,
      icon: CalendarClock,
      tone: "amber",
    },
    {
      label: "当日进行中",
      value: todayOrders.filter((order) =>
        inProgressStatuses.has(order.status),
      ).length,
      icon: Activity,
      tone: "blue",
    },
    {
      label: "新增客户",
      value: newCustomers.length,
      icon: UserPlus,
      tone: "blue",
    },
    {
      label: "今日收款",
      value: formatMoney(0),
      icon: WalletCards,
      tone: "neutral",
    },
    {
      label: "待审核合同",
      value: pendingContracts.length,
      icon: FileCheck2,
      tone: "amber",
    },
    {
      label: "临期合同",
      value: expiringContracts.length,
      icon: CalendarClock,
      tone: "red",
    },
  ];

  return (
    <div className="page data-center-page">
      <PageHeader
        eyebrow="DATA CENTER"
        title="数据中心"
        description="汇总当前账号可见的客户、作业、报告、员工与合同数据。"
        meta={
          <>
            <span className="live-dot" />
            {loading
              ? "正在读取经营数据"
              : error
                ? `同步异常：${error}`
                : `实时同步 ${lastUpdated || "连接中"}`}
          </>
        }
        actions={
          <button
            type="button"
            className="button secondary"
            disabled={refreshing}
            onClick={() => void refresh()}
          >
            <RefreshCw size={15} className={refreshing ? "spin" : undefined} />
            刷新数据
          </button>
        }
      />

      <section className="data-kpi-grid">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <article className={`data-kpi-card tone-${tone}`} key={label}>
            <div className="data-kpi-icon"><Icon size={18} /></div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{label === "今日收款" ? "等待财务收款数据" : "当前统计范围"}</small>
          </article>
        ))}
      </section>

      <div className="data-center-layout">
        <section className="panel data-company-panel">
          <div className="data-company-head">
            <div className="data-company-mark">
              <BriefcaseBusiness size={23} />
            </div>
            <div>
              <span className="eyebrow">CURRENT WORKSPACE</span>
              <h2>{templates?.company_name || "上海申汰实业有限公司"}</h2>
              <p>企业服务状态与当前数据范围</p>
            </div>
            <StatusPill status="服务中" />
          </div>
          <div className="data-company-stats">
            <div><span>员工</span><strong>{engineers.size} 人</strong></div>
            <div>
              <span>服务时间</span>
              <strong>{earliestStart ? `${daysBetween(earliestStart, today)} 天` : "—"}</strong>
            </div>
            <div><span>管理</span><strong>{managementCount} 人</strong></div>
            <div><span>到期时间</span><strong>{latestEnd || "—"}</strong></div>
          </div>
          <div className="data-company-actions">
            <button type="button" onClick={() => onNavigate("services")}>
              订单管理 <ChevronRight size={14} />
            </button>
            <button type="button" onClick={() => onNavigate("customers")}>
              客户管理 <ChevronRight size={14} />
            </button>
            <button type="button" onClick={() => onNavigate("reports")}>
              报告归档 <ChevronRight size={14} />
            </button>
          </div>
        </section>

        <section className="panel data-ranking-panel">
          <SectionTitle
            title="员工排行榜"
            subtitle="按作业量排序"
            action={
              <div className="segmented-control compact">
                {(["今日", "本周", "本月"] as const).map((label, index) => {
                  const key = (["today", "week", "month"] as const)[index];
                  return (
                    <button
                      type="button"
                      key={key}
                      className={rankingPeriod === key ? "active" : ""}
                      onClick={() => setRankingPeriod(key)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            }
          />
          <div className="ranking-list">
            {ranking.map(([name, value], index) => (
              <div className="ranking-row" key={name}>
                <span className="ranking-index">{String(index + 1).padStart(2, "0")}</span>
                <div className="ranking-main">
                  <div><strong>{name}</strong><span>{value} 单</span></div>
                  <div className="ranking-bar">
                    <span style={{ width: `${(value / Math.max(1, ranking[0]?.[1] || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {!ranking.length ? <div className="personnel-empty">当前周期暂无员工排行数据。</div> : null}
          </div>
        </section>

        <section className="panel data-trend-panel">
          <SectionTitle
            title="工单情况"
            subtitle="业务趋势"
            action={
              <div className="segmented-control compact">
                {(["近七天", "月度", "年度"] as const).map((label, index) => {
                  const key = (["week", "month", "year"] as const)[index];
                  return (
                    <button
                      type="button"
                      key={key}
                      className={trendPeriod === key ? "active" : ""}
                      onClick={() => setTrendPeriod(key)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            }
          />
          <div className="data-trend-chart">
            {trend.map((item) => (
              <div className="data-trend-column" key={item.label}>
                <span className="data-trend-value">{item.value}</span>
                <div className="data-trend-track">
                  <span style={{ height: `${(item.value / trendMax) * 100}%` }} />
                </div>
                <small>{item.label}</small>
              </div>
            ))}
          </div>
        </section>

        <aside className="data-center-side">
          <section className="panel data-mobile-panel">
            <SectionTitle title="员工端" subtitle="员工移动办公与现场任务" />
            <div className="data-mobile-entry">
              <img
                src="https://sunrgw.cn/download/android-download-qr.png"
                alt="员工端下载二维码"
              />
              <div>
                <strong>扫码进入移动端</strong>
                <p>现场签到、勘测、封堵、签字与报告查看。</p>
              </div>
            </div>
            <button
              type="button"
              className="data-mobile-button"
              onClick={() =>
                window.open(
                  "https://sunrgw.cn/download/",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <QrCode size={15} />
              查看下载入口
            </button>
          </section>

          <section className="panel data-message-panel">
            <SectionTitle
              title="系统消息"
              subtitle={`${messages.length} 条最近动态`}
              action={<Bell size={17} />}
            />
            <div className="data-message-list">
              {messages.map((order) => (
                <button
                  type="button"
                  className="data-message-row"
                  key={order.id}
                  onClick={() => {
                    const survey = riskSurveys.find(
                      (item) => item.customer_id === order.customer_id,
                    );
                    if (survey) onOpenInspection(String(survey.id));
                    else onNavigate("services");
                  }}
                >
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>
                      工单已完成，工单编号：{order.report_no}
                    </strong>
                    <span>
                      {formatDateTime(
                        order.completed_at || order.submitted_at || order.created_at,
                      )}
                    </span>
                  </div>
                </button>
              ))}
              {!messages.length ? <div className="personnel-empty">暂无系统消息。</div> : null}
            </div>
          </section>
        </aside>
      </div>

      {contractError ? (
        <div className="settings-banner error">
          合同数据暂不可用：{contractError}
        </div>
      ) : null}
    </div>
  );
}
