import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Save,
  Stamp,
  X,
} from "lucide-react";
import {
  updateTemplates,
  uploadReportLogo,
  uploadReportSeal,
} from "../api";
import type {
  BackendTemplates,
  ReportTemplateInput,
} from "../api";
import { mediaUrl } from "../backendMappers";

const DEFAULT_SECTIONS = [
  "service_content",
  "materials",
  "risk_follow",
  "photos",
  "customer_comment",
];

const SECTION_LABELS: Record<string, string> = {
  service_content: "服务简报",
  materials: "物料使用",
  risk_follow: "风险跟进",
  photos: "封堵后照片",
  customer_comment: "客户点评",
};

interface ReportTemplateEditorProps {
  open: boolean;
  templates: BackendTemplates | null;
  onClose: () => void;
  onSaved: (templates: BackendTemplates) => void;
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function linesValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function normalizedSections(value: unknown) {
  const source = Array.isArray(value)
    ? value.map((item) => String(item)).filter(Boolean)
    : [];
  const sections = [...new Set(source.length ? source : DEFAULT_SECTIONS)];
  DEFAULT_SECTIONS.forEach((section) => {
    if (!sections.includes(section)) sections.push(section);
  });
  return sections;
}

function formFromTemplates(templates: BackendTemplates | null): ReportTemplateInput {
  return {
    company_name: textValue(templates?.company_name, "上海申汰实业有限公司"),
    company_phone: textValue(templates?.company_phone, "021-66010559"),
    report_prefix: textValue(templates?.report_prefix, "STFD"),
    report_year_digits: numberValue(templates?.report_year_digits, 4),
    report_seq_digits: numberValue(templates?.report_seq_digits, 3),
    acceptance_items: linesValue(templates?.acceptance_items),
    hygiene_items: linesValue(templates?.hygiene_items),
    service_suggestion: textValue(templates?.service_suggestion),
    service_report_sections: normalizedSections(
      templates?.service_report_sections,
    ),
    report_watermark_text: textValue(
      templates?.report_watermark_text,
      textValue(templates?.company_name, "上海申汰实业有限公司"),
    ),
  };
}

export function ReportTemplateEditor({
  open,
  templates,
  onClose,
  onSaved,
}: ReportTemplateEditorProps) {
  const [form, setForm] = useState<ReportTemplateInput>(() =>
    formFromTemplates(templates),
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [sealFile, setSealFile] = useState<File | null>(null);
  const [acceptanceText, setAcceptanceText] = useState("");
  const [hygieneText, setHygieneText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const logoUrl = useMemo(
    () => mediaUrl(templates?.logo_url || templates?.report_logo),
    [templates?.logo_url, templates?.report_logo],
  );
  const sealUrl = useMemo(
    () => mediaUrl(templates?.report_seal),
    [templates?.report_seal],
  );

  useEffect(() => {
    if (!open) return;
    const nextForm = formFromTemplates(templates);
    setForm(nextForm);
    setAcceptanceText(nextForm.acceptance_items.join("\n"));
    setHygieneText(nextForm.hygiene_items.join("\n"));
    setLogoFile(null);
    setSealFile(null);
    setError("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open, saving]);

  if (!open) return null;

  const update = <K extends keyof ReportTemplateInput>(
    key: K,
    value: ReportTemplateInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const moveSection = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= form.service_report_sections.length) return;
    const next = [...form.service_report_sections];
    [next[index], next[target]] = [next[target], next[index]];
    update("service_report_sections", next);
  };

  const chooseFile = (
    event: ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
  ) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;
    if (!/\.(png|jpe?g)$/i.test(file.name)) {
      setError("Logo 和印章仅支持 PNG、JPG、JPEG 文件");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo 或印章文件不能超过 2 MB");
      return;
    }
    setError("");
    setter(file);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.company_name.trim()) {
      setError("请填写公司名称");
      return;
    }
    if (!form.report_prefix.trim()) {
      setError("请填写报告编号前缀");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (logoFile) await uploadReportLogo(logoFile);
      if (sealFile) await uploadReportSeal(sealFile);
      const saved = await updateTemplates({
        ...form,
        acceptance_items: linesValue(acceptanceText),
        hygiene_items: linesValue(hygieneText),
        company_name: form.company_name.trim(),
        company_phone: form.company_phone.trim(),
        report_prefix: form.report_prefix.trim().toUpperCase(),
        report_year_digits: Math.min(4, Math.max(2, Number(form.report_year_digits))),
        report_seq_digits: Math.min(8, Math.max(2, Number(form.report_seq_digits))),
        service_suggestion: form.service_suggestion.trim(),
        report_watermark_text: form.report_watermark_text.trim(),
      });
      onSaved(saved);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "报告模板保存失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="personnel-modal-backdrop" role="presentation">
      <section
        className="personnel-modal report-template-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-template-editor-title"
      >
        <header className="personnel-modal-head">
          <div>
            <span className="eyebrow">REPORT TEMPLATE</span>
            <h2 id="report-template-editor-title">编辑报告模板</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={saving}
            aria-label="关闭报告模板编辑器"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={(event) => void save(event)}>
          <div className="report-template-editor-body">
            <section className="template-editor-section">
              <div className="template-editor-section-head">
                <h3>品牌与编号</h3>
                <p>同步用于后端报告页眉、页脚与编号生成。</p>
              </div>
              <div className="personnel-form-grid report-template-grid">
                <label>
                  <span>公司名称</span>
                  <input
                    value={form.company_name}
                    maxLength={100}
                    onChange={(event) => update("company_name", event.target.value)}
                  />
                </label>
                <label>
                  <span>公司电话</span>
                  <input
                    value={form.company_phone}
                    maxLength={30}
                    onChange={(event) => update("company_phone", event.target.value)}
                  />
                </label>
                <label>
                  <span>编号前缀</span>
                  <input
                    value={form.report_prefix}
                    maxLength={16}
                    onChange={(event) => update("report_prefix", event.target.value)}
                  />
                </label>
                <label>
                  <span>年份位数</span>
                  <select
                    value={form.report_year_digits}
                    onChange={(event) => update("report_year_digits", Number(event.target.value))}
                  >
                    <option value={2}>2 位（26）</option>
                    <option value={4}>4 位（2026）</option>
                  </select>
                </label>
                <label>
                  <span>流水号位数</span>
                  <input
                    type="number"
                    min={2}
                    max={8}
                    value={form.report_seq_digits}
                    onChange={(event) => update("report_seq_digits", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>报告水印</span>
                  <input
                    value={form.report_watermark_text}
                    maxLength={100}
                    onChange={(event) => update("report_watermark_text", event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="template-editor-section">
              <div className="template-editor-section-head">
                <h3>品牌资产</h3>
                <p>Logo 与专用章随模板保存，之后生成的 PDF 自动使用。</p>
              </div>
              <div className="report-template-assets">
                <div className="template-asset-row">
                  <div className="template-asset-preview">
                    {logoUrl ? <img src={logoUrl} alt="当前报告 Logo" /> : <ImagePlus size={24} />}
                  </div>
                  <div className="template-asset-copy">
                    <strong>报告 Logo</strong>
                    <span>{logoFile?.name || (logoUrl ? "已上传" : "未上传")}</span>
                  </div>
                  <label className="button secondary template-file-button">
                    <ImagePlus size={15} />
                    选择
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      onChange={(event) => chooseFile(event, setLogoFile)}
                    />
                  </label>
                </div>
                <div className="template-asset-row">
                  <div className="template-asset-preview">
                    {sealUrl ? <img src={sealUrl} alt="当前报告专用章" /> : <Stamp size={24} />}
                  </div>
                  <div className="template-asset-copy">
                    <strong>报告专用章</strong>
                    <span>{sealFile?.name || (sealUrl ? "已上传" : "未上传")}</span>
                  </div>
                  <label className="button secondary template-file-button">
                    <Stamp size={15} />
                    选择
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                      onChange={(event) => chooseFile(event, setSealFile)}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="template-editor-section">
              <div className="template-editor-section-head">
                <h3>封堵报告章节</h3>
                <p>使用上下按钮调整 PDF 中封堵报告的章节顺序。</p>
              </div>
              <ol className="template-section-list">
                {form.service_report_sections.map((section, index) => (
                  <li key={section}>
                    <span className="template-section-index">{String(index + 1).padStart(2, "0")}</span>
                    <strong>{SECTION_LABELS[section] || section}</strong>
                    <div className="template-section-actions">
                      <button
                        type="button"
                        className="icon-button"
                        disabled={index === 0}
                        onClick={() => moveSection(index, -1)}
                        aria-label={`上移${SECTION_LABELS[section] || section}`}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        disabled={index === form.service_report_sections.length - 1}
                        onClick={() => moveSection(index, 1)}
                        aria-label={`下移${SECTION_LABELS[section] || section}`}
                      >
                        <ArrowDown size={15} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="template-editor-section">
              <div className="template-editor-section-head">
                <h3>标准文案</h3>
                <p>验收和卫生建议每行一项，供后续报告默认带出。</p>
              </div>
              <div className="report-template-copy-grid">
                <label>
                  <span>验收标准</span>
                  <textarea
                    rows={6}
                    value={acceptanceText}
                    onChange={(event) => setAcceptanceText(event.target.value)}
                  />
                </label>
                <label>
                  <span>卫生改善建议</span>
                  <textarea
                    rows={6}
                    value={hygieneText}
                    onChange={(event) => setHygieneText(event.target.value)}
                  />
                </label>
                <label className="wide">
                  <span>后续服务建议</span>
                  <textarea
                    rows={4}
                    value={form.service_suggestion}
                    onChange={(event) => update("service_suggestion", event.target.value)}
                  />
                </label>
              </div>
            </section>
          </div>

          {error ? <div className="personnel-modal-error">{error}</div> : null}

          <footer className="personnel-modal-actions">
            <button type="button" className="button ghost" onClick={onClose} disabled={saving}>
              取消
            </button>
            <button type="submit" className="button primary" disabled={saving}>
              <Save size={15} />
              {saving ? "保存中" : "保存模板"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
