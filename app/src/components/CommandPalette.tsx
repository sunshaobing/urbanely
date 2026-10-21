import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  ClipboardCheck,
  Command,
  FileText,
  LayoutDashboard,
  Search,
  Settings2,
  ShieldCheck,
  Store,
  Users,
  Wrench,
} from "lucide-react";
import type { PageKey } from "../types";

const commands: Array<{
  page: PageKey;
  label: string;
  hint: string;
  icon: typeof LayoutDashboard;
  group: string;
}> = [
  { page: "dashboard", label: "运营工作台", hint: "风险与今日作业", icon: LayoutDashboard, group: "页面" },
  { page: "inspections", label: "现场勘测", hint: "勘测单、隐患点与结构风险图片", icon: ClipboardCheck, group: "页面" },
  { page: "sealing", label: "结构封堵", hint: "施工、材料、验收与签字", icon: Wrench, group: "页面" },
  { page: "services", label: "PCO 服务单", hint: "常规服务与证据完整度", icon: ShieldCheck, group: "页面" },
  { page: "customers", label: "客户与门店", hint: "合同、风险与服务计划", icon: Store, group: "页面" },
  { page: "reports", label: "报告中心", hint: "A4 报告、版本与导出", icon: FileText, group: "页面" },
  { page: "permissions", label: "人员与权限", hint: "角色、门店范围与敏感权限", icon: Users, group: "页面" },
  { page: "settings", label: "系统设置", hint: "公司资料、现场规则与报告配置", icon: Settings2, group: "页面" },
  { page: "inspections", label: "新建勘测", hint: "创建一张新的现场勘测单", icon: ClipboardCheck, group: "快捷操作" },
  { page: "sealing", label: "发起封堵", hint: "从隐患点进入封堵流程", icon: Wrench, group: "快捷操作" },
  { page: "reports", label: "打开报告中心", hint: "预览或导出当前报告", icon: FileText, group: "快捷操作" },
  { page: "permissions", label: "管理角色权限", hint: "编辑权限矩阵和敏感操作", icon: Users, group: "快捷操作" },
];

export function CommandPalette({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: PageKey) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return commands;
    return commands.filter(
      (item) =>
        item.label.toLowerCase().includes(normalized) ||
        item.hint.toLowerCase().includes(normalized) ||
        item.group.toLowerCase().includes(normalized),
    );
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => Math.min(filtered.length - 1, current + 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => Math.max(0, current - 1));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = filtered[activeIndex];
        if (!item) return;
        onNavigate(item.page);
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, filtered, onClose, onNavigate, open]);

  if (!open) return null;

  return (
    <div className="command-overlay" role="dialog" aria-modal="true" aria-label="快捷命令" onMouseDown={onClose}>
      <div className="command-panel" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-search">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="搜索页面或快捷操作"
            aria-label="搜索页面或快捷操作"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-list">
          {filtered.length === 0 ? (
            <div className="command-empty">没有匹配的命令</div>
          ) : (
            filtered.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  type="button"
                  key={`${item.group}-${item.label}`}
                  className={`command-item ${index === activeIndex ? "active" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    onNavigate(item.page);
                    onClose();
                  }}
                >
                  <span className="command-icon">
                    <Icon size={17} />
                  </span>
                  <span className="command-copy">
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                  <span className="command-group">{item.group}</span>
                  <ArrowUpRight size={14} className="command-arrow" />
                </button>
              );
            })
          )}
        </div>
        <div className="command-foot">
          <span><Command size={13} /> 快捷命令</span>
          <span>↑↓ 选择 · ↵ 打开 · Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}

