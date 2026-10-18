import type { ReactNode } from "react";
import {
  Bell,
  ClipboardCheck,
  FileText,
  LayoutDashboard,
  Search,
  Settings2,
  ShieldCheck,
  Smartphone,
  Store,
  Wrench,
} from "lucide-react";
import type { PageKey } from "../types";

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
  { key: "field", label: "现场模式", icon: Smartphone, hint: "手机端离线采集" },
];

const pageTitles: Record<PageKey, string> = {
  dashboard: "运营工作台",
  inspections: "现场勘测",
  sealing: "结构封堵",
  services: "PCO 服务单",
  customers: "客户与门店",
  reports: "报告中心",
  field: "现场模式",
};

interface LayoutProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  search: string;
  onSearch: (value: string) => void;
  children: ReactNode;
}

export function Layout({ activePage, onNavigate, search, onSearch, children }: LayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar no-print">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={22} />
          </div>
          <div>
            <strong>申汰 PCO</strong>
            <span>FIELD OPERATIONS</span>
          </div>
        </div>

        <nav className="nav" aria-label="主导航">
          {navItems.map((item) => {
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
        </nav>

        <div className="sidebar-foot">
          <div className="sync-card">
            <span className="sync-dot" />
            <div>
              <strong>离线同步正常</strong>
              <span>最后同步 2 分钟前</span>
            </div>
          </div>
          <button type="button" className="nav-item muted">
            <Settings2 size={18} />
            <span>系统设置</span>
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar no-print">
          <div className="crumb">
            <span>申汰实业</span>
            <i>/</i>
            <strong>{pageTitles[activePage]}</strong>
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
              <kbd>⌘ K</kbd>
            </label>
            <span className="today">2026.10.18 · 周日</span>
            <button type="button" className="icon-button" aria-label="通知" title="通知">
              <Bell size={18} />
              <i className="notification-dot" />
            </button>
            <div className="avatar" title="Eric · 运营负责人">
              E
            </div>
          </div>
        </header>

        <main className="main">{children}</main>
      </div>

      <nav className="mobile-nav no-print" aria-label="移动端导航">
        {navItems
          .filter((item) => ["dashboard", "inspections", "sealing", "reports", "field"].includes(item.key))
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
      </nav>
    </div>
  );
}

