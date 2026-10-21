import { useEffect, useState } from "react";
import {
  Building2,
  Database,
  FileText,
  Pencil,
  Save,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import {
  getSystemSettings,
  updateSystemSettings,
} from "../api";
import type {
  BackendSystemSettings,
  SystemSettingsInput,
} from "../api";
import { PageHeader } from "../components/PageHeader";
import { ReportTemplateEditor } from "../components/ReportTemplateEditor";
import { SectionTitle, StatusPill } from "../components/ui";
import { mediaUrl } from "../backendMappers";
import { useLiveData } from "../liveData";

interface SystemSettingsProps {
  canEdit: boolean;
  canManageTemplates: boolean;
  onOpenDictionary: () => void;
  onNotify: (message: string) => void;
}

const emptySettings: SystemSettingsInput = {
  company_name: "",
  company_address: "",
  company_phone: "",
  contact: "",
  hotline: "",
  email: "",
  website: "",
  region: "",
  report_remark: "",
  checkout_force_photo: true,
  work_checkin_sync: true,
  report_email_send: false,
  report_hide_customer_phone: false,
  stock_strong_check: false,
};

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function settingsFromApi(value: BackendSystemSettings): SystemSettingsInput {
  return {
    company_name: textValue(value.company_name),
    company_address: textValue(value.company_address),
    company_phone: textValue(value.company_phone),
    contact: textValue(value.contact),
    hotline: textValue(value.hotline),
    email: textValue(value.email),
    website: textValue(value.website),
    region: textValue(value.region),
    report_remark: textValue(value.report_remark),
    checkout_force_photo: booleanValue(value.checkout_force_photo, true),
    work_checkin_sync: booleanValue(value.work_checkin_sync, true),
    report_email_send: booleanValue(value.report_email_send, false),
    report_hide_customer_phone: booleanValue(value.report_hide_customer_phone, false),
    stock_strong_check: booleanValue(value.stock_strong_check, false),
  };
}

function SettingSwitch({
  label,
  detail,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="settings-switch-row">
      <div>
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function SystemSettings({
  canEdit,
  canManageTemplates,
  onOpenDictionary,
  onNotify,
}: SystemSettingsProps) {
  const { refresh: refreshLiveData, templates } = useLiveData();
  const [form, setForm] = useState<SystemSettingsInput>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const settings = await getSystemSettings();
      setForm(settingsFromApi(settings));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "系统设置加载失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const update = <K extends keyof SystemSettingsInput>(
    key: K,
    value: SystemSettingsInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!canEdit) return;
    if (!form.company_name.trim()) {
      setError("请填写公司名称");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = await updateSystemSettings({
        ...form,
        company_name: form.company_name.trim(),
        company_address: form.company_address.trim(),
        company_phone: form.company_phone.trim(),
        contact: form.contact.trim(),
        hotline: form.hotline.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        region: form.region.trim(),
        report_remark: form.report_remark.trim(),
      });
      setForm(settingsFromApi(saved));
      await refreshLiveData();
      onNotify("系统设置已保存");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "系统设置保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="SYSTEM CONTROL"
        title="系统设置"
        description="维护公司资料、现场作业规则、报告开关与模板入口。"
        meta={
          <>
            <span className="live-dot" />
            {canEdit ? "管理员可编辑" : "当前账号只读"}
          </>
        }
        actions={
          <div className="settings-header-actions">
            {!canEdit ? <StatusPill status="只读" /> : null}
            {canManageTemplates ? (
              <button
                type="button"
                className="button ghost"
                onClick={() => setTemplateEditorOpen(true)}
              >
                <Pencil size={15} />
                编辑报告模板
              </button>
            ) : null}
            {canEdit ? (
              <button
                type="button"
                className="button primary"
                disabled={saving || loading}
                onClick={() => void save()}
              >
                <Save size={15} />
                {saving ? "保存中" : "保存设置"}
              </button>
            ) : null}
          </div>
        }
      />

      {error ? <div className="settings-banner error">{error}</div> : null}

      <div className="system-settings-layout">
        <main className="settings-main">
          <section className="panel settings-panel">
            <SectionTitle
              title="公司资料"
              subtitle="用于报告、通知与运营页面展示"
              action={<Building2 size={18} />}
            />
            <fieldset disabled={!canEdit || loading || saving}>
              <div className="settings-form-grid">
                <label>
                  <span>公司名称</span>
                  <input
                    value={form.company_name}
                    onChange={(event) => update("company_name", event.target.value)}
                  />
                </label>
                <label>
                  <span>负责人</span>
                  <input
                    value={form.contact}
                    onChange={(event) => update("contact", event.target.value)}
                  />
                </label>
                <label>
                  <span>公司电话</span>
                  <input
                    value={form.company_phone}
                    onChange={(event) => update("company_phone", event.target.value)}
                  />
                </label>
                <label>
                  <span>服务热线</span>
                  <input
                    value={form.hotline}
                    onChange={(event) => update("hotline", event.target.value)}
                  />
                </label>
                <label>
                  <span>联系邮箱</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => update("email", event.target.value)}
                  />
                </label>
                <label>
                  <span>网站</span>
                  <input
                    value={form.website}
                    onChange={(event) => update("website", event.target.value)}
                  />
                </label>
                <label className="wide">
                  <span>公司地址</span>
                  <input
                    value={form.company_address}
                    onChange={(event) => update("company_address", event.target.value)}
                  />
                </label>
                <label className="wide">
                  <span>服务区域</span>
                  <input
                    value={form.region}
                    onChange={(event) => update("region", event.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          </section>

          <div className="settings-two-column">
            <section className="panel settings-panel">
              <SectionTitle
                title="现场作业规则"
                subtitle="控制签到与现场证据要求"
                action={<ShieldCheck size={18} />}
              />
              <div className="settings-switch-list">
                <SettingSwitch
                  label="到场/离场强制拍照"
                  detail="现场签到时必须留存照片证据"
                  checked={form.checkout_force_photo}
                  disabled={!canEdit || loading || saving}
                  onChange={(checked) => update("checkout_force_photo", checked)}
                />
                <SettingSwitch
                  label="签到数据同步"
                  detail="作业单签到同步到对应服务报告"
                  checked={form.work_checkin_sync}
                  disabled={!canEdit || loading || saving}
                  onChange={(checked) => update("work_checkin_sync", checked)}
                />
                <SettingSwitch
                  label="库存强校验"
                  detail="材料出库不足时阻止提交作业"
                  checked={form.stock_strong_check}
                  disabled={!canEdit || loading || saving}
                  onChange={(checked) => update("stock_strong_check", checked)}
                />
              </div>
            </section>

            <section className="panel settings-panel">
              <SectionTitle
                title="报告与隐私"
                subtitle="控制报告生成与客户信息展示"
                action={<SlidersHorizontal size={18} />}
              />
              <div className="settings-switch-list">
                <SettingSwitch
                  label="报告生成后邮件推送"
                  detail="报告完成后发送到配置邮箱"
                  checked={form.report_email_send}
                  disabled={!canEdit || loading || saving}
                  onChange={(checked) => update("report_email_send", checked)}
                />
                <SettingSwitch
                  label="报告隐藏客户电话"
                  detail="导出 PDF 时对客户电话进行脱敏"
                  checked={form.report_hide_customer_phone}
                  disabled={!canEdit || loading || saving}
                  onChange={(checked) => update("report_hide_customer_phone", checked)}
                />
              </div>
            </section>
          </div>

          <section className="panel settings-panel">
            <SectionTitle
              title="报告备注"
              subtitle="显示在支持备注的 PDF 报告底部"
              action={<FileText size={18} />}
            />
            <textarea
              className="settings-remark"
              rows={4}
              disabled={!canEdit || loading || saving}
              value={form.report_remark}
              onChange={(event) => update("report_remark", event.target.value)}
            />
          </section>
        </main>

        <aside className="settings-aside">
          <section className="panel settings-summary">
            <SectionTitle title="报告模板" subtitle="章节、文案、Logo 与专用章" />
            <div className="settings-template-brand">
              <div className="settings-template-mark">
                {templates?.logo_url || templates?.report_logo ? (
                  <img src={mediaUrl(templates.logo_url || templates.report_logo)} alt="" />
                ) : (
                  <FileText size={22} />
                )}
              </div>
              <div>
                <strong>{textValue(templates?.company_name, form.company_name || "—")}</strong>
                <span>{templates?.service_report_sections?.length || 5} 个封堵报告章节</span>
              </div>
            </div>
            {canManageTemplates ? (
              <button
                type="button"
                className="button secondary full-width"
                onClick={() => setTemplateEditorOpen(true)}
              >
                <Pencil size={15} />
                打开模板编辑器
              </button>
            ) : null}
          </section>

          <section className="panel settings-summary">
            <SectionTitle title="当前生效" subtitle="保存后立即作用于新生成报告" />
            <div className="settings-readonly-list">
              <div><span>公司电话</span><strong>{form.company_phone || "—"}</strong></div>
              <div><span>联系邮箱</span><strong>{form.email || "—"}</strong></div>
              <div><span>服务区域</span><strong>{form.region || "—"}</strong></div>
              <div><span>签到同步</span><strong>{form.work_checkin_sync ? "开启" : "关闭"}</strong></div>
              <div><span>邮件推送</span><strong>{form.report_email_send ? "开启" : "关闭"}</strong></div>
            </div>
          </section>

          <section className="panel settings-summary">
            <SectionTitle title="系统字典" subtitle="统一维护分类与可选值" />
            <div className="settings-dictionary-card">
              <Database size={22} />
              <div>
                <strong>业务字典中心</strong>
                <span>风险等级、虫害、结构情况、漏洞类型等</span>
              </div>
            </div>
            <button
              type="button"
              className="button secondary full-width"
              onClick={onOpenDictionary}
            >
              <Database size={15} />
              {canEdit ? "管理系统字典" : "查看系统字典"}
            </button>
          </section>
        </aside>
      </div>

      <ReportTemplateEditor
        open={canManageTemplates && templateEditorOpen}
        templates={templates}
        onClose={() => setTemplateEditorOpen(false)}
        onSaved={() => {
          void refreshLiveData();
          onNotify("报告模板已保存");
        }}
      />
    </div>
  );
}
