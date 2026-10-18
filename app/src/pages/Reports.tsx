import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  CheckCircle2,
  Download,
  FileCheck2,
  FileText,
  History,
  Printer,
  QrCode,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { getInspection, getSealingOrder, getSite, reportVersions } from "../data";
import type { ReportTemplate } from "../types";
import { SealingReportSheet, SurveyReportSheet } from "../components/ReportSheet";
import { SectionTitle, StatusPill } from "../components/ui";
import { useInspectionSignatures, useSealingSignatures } from "../signatureStore";
import { PageHeader } from "../components/PageHeader";

interface ReportsProps {
  initialTemplate: ReportTemplate;
  initialInspectionId: string;
  initialSealingId: string;
  onNotify: (message: string) => void;
}

export function Reports({
  initialTemplate,
  initialInspectionId,
  initialSealingId,
  onNotify,
}: ReportsProps) {
  const [template, setTemplate] = useState<ReportTemplate>(initialTemplate);
  const [inspectionId, setInspectionId] = useState(initialInspectionId);
  const [sealingId, setSealingId] = useState(initialSealingId);
  const [zoom, setZoom] = useState(75);

  useEffect(() => {
    setTemplate(initialTemplate);
    setInspectionId(initialInspectionId);
    setSealingId(initialSealingId);
  }, [initialTemplate, initialInspectionId, initialSealingId]);

  const inspection = getInspection(inspectionId);
  const sealing = getSealingOrder(sealingId);
  const [inspectionSignatures] = useInspectionSignatures(inspection.id);
  const [sealingSignatures] = useSealingSignatures(sealing.id);
  const inspectionSigned = Boolean(inspectionSignatures.surveyor && inspectionSignatures.customer);
  const sealingSigned = Boolean(sealingSignatures.responsible && sealingSignatures.customer);
  const reportInspection = { ...inspection, signatures: inspectionSignatures };
  const reportSealing = { ...sealing, signatures: sealingSignatures, signed: sealingSigned };
  const canExport = template === "survey" ? inspectionSigned : sealingSigned;
  const site = getSite(template === "survey" ? inspection.siteId : sealing.siteId);
  const versions = useMemo(
    () => reportVersions.filter((version) => version.template === template),
    [template],
  );

  const reportNo = template === "survey" ? inspection.reportNo : sealing.reportNo;

  return (
    <div className="page reports-page">
      <PageHeader
        className="no-print"
        eyebrow="REPORTS / SNAPSHOTS"
        title="报告中心"
        description="结构化数据生成 A4 快照，报告版本、照片和签字可追溯。"
        meta={
          <>
            <span className="live-dot" />
            当前模板 v2.3 · 已生成 3 个版本
          </>
        }
        actions={
          <>
          <button
            type="button"
            className="button secondary"
            disabled={!canExport}
            title={canExport ? "生成新的报告版本" : "完成双方签字后才能生成正式版本"}
            onClick={() => onNotify("已生成新的报告版本，正在后台渲染 PDF")}
          >
            <RefreshCw size={16} />
            生成新版本
          </button>
          <button
            type="button"
            className="button primary"
            disabled={!canExport}
            title={canExport ? "打印或导出 PDF" : "完成双方签字后才能导出 PDF"}
            onClick={() => window.print()}
          >
            <Printer size={16} />
            打印 / 导出 PDF
          </button>
          </>
        }
      />

      <div className="reports-layout">
        <aside className="panel report-templates no-print">
          <SectionTitle title="报告模板" subtitle="当前组织启用的模板" />
          <button
            type="button"
            className={`template-card ${template === "survey" ? "active" : ""}`}
            onClick={() => setTemplate("survey")}
          >
            <div className="template-icon">
              <FileText size={20} />
            </div>
            <div>
              <strong>现场勘测报告</strong>
              <span>KC-YYYY-BG-NNN</span>
              <small>结构隐患、虫害证据、治理方案、复检计划</small>
            </div>
          </button>
          <button
            type="button"
            className={`template-card ${template === "sealing" ? "active" : ""}`}
            onClick={() => setTemplate("sealing")}
          >
            <div className="template-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong>结构(鼠患)封堵服务单</strong>
              <span>STFD-YYYY-NNN</span>
              <small>封堵部位、材料、前后照片、验收与签字</small>
            </div>
          </button>

          <div className="template-divider" />
          <SectionTitle title="输出设置" />
          <div className="output-settings">
            <div>
              <span>纸张</span>
              <strong>A4 纵向</strong>
            </div>
            <div>
              <span>模板版本</span>
              <strong>v2.3</strong>
            </div>
            <div>
              <span>照片</span>
              <strong>按部位成对输出</strong>
            </div>
            <div>
              <span>水印</span>
              <strong>关闭</strong>
            </div>
          </div>
        </aside>

        <section className="report-preview panel">
          <div className="report-toolbar no-print">
            <div>
              <span className="mono">{reportNo}</span>
              <strong>{template === "survey" ? "现场勘测报告" : "结构(鼠患)封堵服务单"}</strong>
            </div>
            <div className="report-toolbar-actions">
              <label className="zoom-control">
                <span>{zoom}%</span>
                <input
                  type="range"
                  min="60"
                  max="110"
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  aria-label="报告缩放"
                />
              </label>
              <button type="button" className="button ghost" onClick={() => onNotify("已复制报告只读验证链接")}>
                <QrCode size={15} />
                验证链接
              </button>
            </div>
          </div>
          <div className="report-scroll">
            <div
              className="report-zoom"
              style={{ width: 794, zoom: zoom / 100 } as CSSProperties}
            >
              {template === "survey" ? (
                <SurveyReportSheet inspection={reportInspection} site={site} />
              ) : (
                <SealingReportSheet order={reportSealing} site={site} />
              )}
            </div>
          </div>
        </section>

        <aside className="panel report-meta no-print">
          <SectionTitle title="报告信息" subtitle="快照生成后不可直接修改" />
          <div className="meta-list">
            <div>
              <span>报告编号</span>
              <strong className="mono">{reportNo}</strong>
            </div>
            <div>
              <span>客户</span>
              <strong>{site.customer}</strong>
            </div>
            <div>
              <span>门店</span>
              <strong>{site.name}</strong>
            </div>
            <div>
              <span>当前版本</span>
              <strong>v{versions[0]?.version ?? 1}</strong>
            </div>
            <div>
              <span>签字状态</span>
              {template === "sealing" ? (
                <StatusPill status={sealingSigned ? "双方已签" : "待签字"} />
              ) : (
                <StatusPill status={inspectionSigned ? "双方已签" : "待客户签字"} />
              )}
            </div>
            <div>
              <span>文件哈希</span>
              <strong className="mono hash">8f3a…c21e</strong>
            </div>
          </div>

          <div className="report-checks">
            <div className="done">
              <CheckCircle2 size={15} />
              数据字段完整
            </div>
            <div className="done">
              <CheckCircle2 size={15} />
              照片与隐患点绑定
            </div>
            <div className={template === "sealing" && !sealingSigned ? "warn" : "done"}>
              {template === "sealing" && !sealingSigned ? <FileCheck2 size={15} /> : <CheckCircle2 size={15} />}
              {template === "sealing" && !sealingSigned ? "等待双方签字" : "签字文件已归档"}
            </div>
          </div>

          <button
            type="button"
            className="button secondary full-width"
            disabled={!canExport}
            title={canExport ? "下载当前版本" : "完成双方签字后才能下载"}
            onClick={() => onNotify("PDF 已加入下载队列")}
          >
            <Download size={16} />
            下载当前版本
          </button>

          <div className="version-list">
            <div className="version-title">
              <History size={15} />
              <strong>版本历史</strong>
            </div>
            {versions.map((version) => (
              <div className="version-item" key={version.id}>
                <div>
                  <strong>v{version.version}</strong>
                  <span>{version.generatedAt}</span>
                  <small>{version.generatedBy} · {version.size}</small>
                </div>
                <StatusPill status={version.status} />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

