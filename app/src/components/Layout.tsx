import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  Bell,
  ChevronDown,
  ClipboardCheck,
  Command,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Store,
  Users,
  Wrench,
} from "lucide-react";
import type { PageKey } from "../types";
import type { AuthSession } from "../auth";
import { CommandPalette } from "./CommandPalette";
import { CartoonAvatar } from "./CartoonAvatar";
import { useLiveData } from "../liveData";

const navItems: Array<{
  key: PageKey;
  label: string;
  icon: typeof LayoutDashboard;
  hint: string;
}> = [
  { key: "dashboard", label: "运营工作台", icon: LayoutDashboard, hint: "风险与今日作业" },
  { key: "inspections", label: "勘测单", icon: ClipboardCheck, hint: "现场勘测与隐患" },
  { key: "sealing", label: "封堵单", icon: Wrench, hint: "结构封堵与验收" },
  { key: "services", label: "服务单", icon: ShieldCheck, hint: "PCO 常规服务" },
  { key: "customers", label: "客户与门店", icon: Store, hint: "合同与服务计划" },
  { key: "reports", label: "报告中心", icon: FileText, hint: "A4 报告与版本" },
  { key: "permissions", label: "人员与权限", icon: Users, hint: "角色、范围与敏感权限" },
  { key: "settings", label: "系统设置", icon: Settings2, hint: "公司资料、字典与报告配置" },
];

const pageTitles: Record<PageKey, string> = {
  dashboard: "运营工作台",
  inspections: "现场勘测",
  sealing: "结构封堵",
  services: "PCO 服务单",
  customers: "客户与门店",
  reports: "报告中心",
  permissions: "人员与权限",
  settings: "系统设置",
};

const navGroups: Array<{ label: string; keys: PageKey[] }> = [
  { label: "运营", keys: ["dashboard", "inspections", "sealing", "services"] },
  { label: "主数据", keys: ["customers", "reports"] },
  { label: "管理", keys: ["permissions", "settings"] },
];

interface LayoutProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  search: string;
  onSearch: (value: string) => void;
  session: AuthSession;
  onLogout: () => void;
  children: ReactNode;
}

export function Layout({
  activePage,
  onNavigate,
  search,
  onSearch,
  session,
  onLogout,
  children,
}: LayoutProps) {
  const [commandOpen, setCommandOpen] = useState(false);
  const { error, lastUpdated, refresh, refreshing, warnings } = useLiveData();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar no-print">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>申汰 PCO</strong>
            <span>FIELD OPERATIONS · v0.1</span>
          </div>
        </div>

        <div className="workspace-switch" title="当前工作空间">
          <span className="workspace-avatar">ST</span>
          <div>
            <strong>申汰实业</strong>
            <span>华东 + 华南 · 8 家门店</span>
          </div>
          <ChevronDown size={14} />
        </div>

        <nav className="nav" aria-label="主导航">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.keys.map((key) => {
                const item = navItems.find((navItem) => navItem.key === key);
                if (!item) return null;
                const Icon = item.icon;
                const active = item.key === activePage;
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={`nav-item ${active ? "active" : ""}`}
                    onClick={() => onNavigate(item.key)}
                    title={item.hint}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                    {active ? <i /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-risk">
          <span className="eyebrow">TODAY'S RISK</span>
          <strong>3 家门店逾期复检</strong>
          <p>趣坊·水围店已逾期 3 天，建议优先处理。</p>
          <button type="button" onClick={() => onNavigate("inspections")}>
            查看风险队列
            <ArrowUpRight size={13} />
          </button>
        </div>

        <div className="sidebar-foot">
          <div className="sync-card">
            <span className="sync-dot" />
            <div>
              <strong>{error ? "实时同步异常" : "实时同步正常"}</strong>
              <span>
                {error ||
                  warnings[0] ||
                  (lastUpdated ? `最后同步 ${lastUpdated}` : "正在连接后端")}
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar no-print">
          <div className="topbar-context">
            <div className="crumb">
              <span>申汰实业</span>
              <i>/</i>
              <strong>{pageTitles[activePage]}</strong>
            </div>
            <span className="system-status">
              <i />
              {refreshing
                ? "实时同步中"
                : error
                  ? "同步异常"
                  : `实时同步 · ${lastUpdated || "连接中"}`}
            </span>
          </div>
          <div className="topbar-tools">
            <label className="search-box">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="搜索门店、报告编号"
                aria-label="搜索门店或报告编号"
              />
            </label>
            <button
              type="button"
              className="command-trigger"
              onClick={() => setCommandOpen(true)}
              title="打开快捷命令"
            >
              <Command size={15} />
              <span>快捷命令</span>
              <kbd>⌘ K</kbd>
            </button>
            <button type="button" className="quick-create" onClick={() => onNavigate("inspections")}>
              <Plus size={15} />
              新建
            </button>
            <span className="today">
              {new Date().toLocaleDateString("zh-CN", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                weekday: "short",
              })}
            </span>
            <button
              type="button"
              className="icon-button"
              aria-label="立即刷新"
              title="立即刷新"
              onClick={() => void refresh()}
            >
              <RefreshCw size={17} className={refreshing ? "spin" : undefined} />
            </button>
            <button type="button" className="icon-button" aria-label="通知" title="通知">
              <Bell size={18} />
              <i className="notification-dot" />
            </button>
            <button
              type="button"
              className="icon-button logout-button"
              aria-label="退出登录"
              title="退出登录"
              onClick={onLogout}
            >
              <LogOut size={16} />
            </button>
            <div className="user-chip" title={`${session.name} · ${session.role}`}>
              <CartoonAvatar name={session.name} size={34} className="avatar" />
              <div>
                <strong>{session.name}</strong>
                <span>{session.role}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="main">{children}</main>
      </div>

      <nav className="mobile-nav no-print" aria-label="移动端导航">
        {navItems
          .filter((item) => ["dashboard", "inspections", "sealing", "reports"].includes(item.key))
          .map((item) => {
            const Icon = item.icon;
            const active = item.key === activePage;
            return (
              <button
                key={item.key}
                type="button"
                className={active ? "active" : ""}
                onClick={() => onNavigate(item.key)}
                aria-label={item.label}
              >
                <Icon size={18} />
                <span>{item.label.replace("运营", "").replace("单", "")}</span>
              </button>
            );
          })}
        <button
          type="button"
          className={activePage === "settings" ? "active" : ""}
          onClick={() => onNavigate("settings")}
          aria-label="系统设置"
        >
          <Settings2 size={18} />
          <span>设置</span>
        </button>
      </nav>

      <CommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        onNavigate={onNavigate}
      />
    </div>
  );
}

