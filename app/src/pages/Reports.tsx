import { useEffect, useMemo, useState } from "react";
import { Download, FileCheck2, FileText, Printer, RefreshCw, Wrench } from "lucide-react";
import { getRiskSurvey, getServiceReport, openBackendPdf } from "../api";
import type { BackendRiskSurvey, BackendServiceReport } from "../api";
import type { CheckinRecord, ReportTemplate, Site } from "../types";
import { buildSites, toInspection, toSealingOrder } from "../backendMappers";
import { SealingReportSheet, SurveyReportSheet } from "../components/ReportSheet";
import { PageHeader } from "../components/PageHeader";
import { SectionTitle, StatusPill } from "../components/ui";
import { useLiveData } from "../liveData";

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
  const {
    customers,
    error,
    lastUpdated,
    refresh,
    refreshing,
    riskSurveys,
    serviceReports,
    sites,
    workorders,
  } = useLiveData();
  const liveSites = useMemo(
    () => buildSites(customers, sites, workorders, riskSurveys),
    [customers, riskSurveys, sites, workorders],
  );
  const siteById = new Map(liveSites.map((site) => [site.id, site]));
  const [surveyDetail, setSurveyDetail] = useState<BackendRiskSurvey | null>(null);
  const [reportDetail, setReportDetail] = useState<BackendServiceReport | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const inspections = useMemo(
    () =>
      riskSurveys.map((survey) =>
        toInspection(
          surveyDetail && surveyDetail.id === survey.id ? surveyDetail : survey,
          workorders,
          customers,
          sites,
        ),
      ),
    [customers, riskSurveys, sites, surveyDetail, workorders],
  );
  const orders = useMemo(
    () =>
      serviceReports.map((report) =>
        toSealingOrder(
          reportDetail && reportDetail.id === report.id ? reportDetail : report,
          workorders,
          customers,
          sites,
        ),
      ),
    [customers, reportDetail, serviceReports, sites, workorders],
  );
  const [template, setTemplate] = useState<ReportTemplate>(initialTemplate);
  const [inspectionId, setInspectionId] = useState(initialInspectionId || inspections[0]?.id || "");
  const [sealingId, setSealingId] = useState(initialSealingId || orders[0]?.id || "");
  const selectedInspection = inspections.find((item) => item.id === inspectionId) || inspections[0];
  const selectedOrder = orders.find((item) => item.id === sealingId) || orders[0];
  const activeCheckin: CheckinRecord | undefined =
    template === "survey" ? selectedInspection?.checkin : selectedOrder?.checkin;
  const selectedSite =
    siteById.get(template === "survey" ? selectedInspection?.siteId || "" : selectedOrder?.siteId || "") ||
    ({
      id: "unknown",
      code: "—",
      name: "—",
      customer: "—",
      customerType: "客户",
      address: "地址待补充",
      region: "",
      contact: "—",
      phoneMasked: "—",
      risk: "medium",
      lastService: "—",
      nextService: "—",
      openFindings: 0,
      contractStatus: "待补",
      frequency: "按合同",
    } satisfies Site);

  useEffect(() => {
    if (!inspectionId && inspections[0]) setInspectionId(inspections[0].id);
    if (!sealingId && orders[0]) setSealingId(orders[0].id);
  }, [inspectionId, inspections, orders, sealingId]);

  useEffect(() => {
    if (template !== "survey" || !selectedInspection) return;
    let cancelled = false;
    setDetailLoading(true);
    void getRiskSurvey(Number(selectedInspection.id))
      .then((detail) => {
        if (!cancelled) setSurveyDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setSurveyDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [template, selectedInspection?.id]);

  useEffect(() => {
    if (template !== "sealing" || !selectedOrder) return;
    let cancelled = false;
    setDetailLoading(true);
    void getServiceReport(Number(selectedOrder.id))
      .then((detail) => {
        if (!cancelled) setReportDetail(detail);
      })
      .catch(() => {
        if (!cancelled) setReportDetail(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [template, selectedOrder?.id]);

  const openPdf = async () => {
    try {
      if (template === "survey" && selectedInspection) {
        await openBackendPdf(`/api/risk-surveys/${selectedInspection.id}/pdf`);
      } else if (template === "sealing" && selectedOrder) {
        await openBackendPdf(`/api/service-reports/${selectedOrder.id}/pdf`);
      } else {
        throw new Error("后端暂无报告数据");
      }
      onNotify("已从后端打开 PDF");
    } catch (pdfError) {
      onNotify(pdfError instanceof Error ? pdfError.message : "PDF 打开失败");
    }
  };

  return (
    <div className="page">
      <PageHeader
        eyebrow="LIVE REPORTS"
        title="报告中心"
        description="勘测报告和封堵报告直接来自生产后端，PDF 由后端实时生成。"
        meta={
          <>
            <span className="live-dot" />
            {error ? `同步异常：${error}` : `${riskSurveys.length} 份勘测 · ${serviceReports.length} 份封堵 · ${lastUpdated}`}
          </>
        }
        actions={
          <button type="button" className="button secondary" disabled={refreshing} onClick={() => void refresh()}>
            <RefreshCw size={15} className={refreshing ? "spin" : undefined} />
            {refreshing ? "刷新中" : "立即刷新"}
          </button>
        }
      />

      <div className="reports-layout">
        <aside className="panel report-templates no-print">
          <SectionTitle title="报告模板" subtitle="实时后端报告" />
          <button type="button" className={`template-card ${template === "survey" ? "active" : ""}`} onClick={() => setTemplate("survey")}>
            <FileText size={18} />
            <div><strong>现场勘测报告</strong><span>{riskSurveys.length} 份记录</span></div>
          </button>
          <button type="button" className={`template-card ${template === "sealing" ? "active" : ""}`} onClick={() => setTemplate("sealing")}>
            <Wrench size={18} />
            <div><strong>结构封堵报告</strong><span>{serviceReports.length} 份记录</span></div>
          </button>

          <div className="report-record-list">
            {template === "survey"
              ? inspections.map((item) => (
                  <button type="button" key={item.id} className={item.id === selectedInspection?.id ? "active" : ""} onClick={() => setInspectionId(item.id)}>
                    <span className="mono">{item.reportNo}</span>
                    <strong>{siteById.get(item.siteId)?.name || "—"}</strong>
                    <small>{item.date} · {item.status}</small>
                  </button>
                ))
              : orders.map((item) => (
                  <button type="button" key={item.id} className={item.id === selectedOrder?.id ? "active" : ""} onClick={() => setSealingId(item.id)}>
                    <span className="mono">{item.reportNo}</span>
                    <strong>{siteById.get(item.siteId)?.name || "—"}</strong>
                    <small>{item.date} · {item.status}</small>
                  </button>
                ))}
          </div>
        </aside>

        <section className="report-preview panel">
          <div className="report-toolbar no-print">
            <div>
              <span className="mono">{template === "survey" ? selectedInspection?.reportNo || "—" : selectedOrder?.reportNo || "—"}</span>
              <StatusPill status={template === "survey" ? selectedInspection?.status || "—" : selectedOrder?.status || "—"} />
            </div>
            <div className="report-toolbar-actions">
              <button type="button" className="button ghost" onClick={() => window.print()}>
                <Printer size={15} />
                打印
              </button>
              <button type="button" className="button primary" onClick={() => void openPdf()}>
                <Download size={15} />
                后端 PDF
              </button>
            </div>
          </div>
          <div className="report-canvas">
            {template === "survey" && selectedInspection ? (
              <SurveyReportSheet inspection={selectedInspection} site={selectedSite} />
            ) : template === "sealing" && selectedOrder ? (
              <SealingReportSheet order={selectedOrder} site={selectedSite} />
            ) : (
              <div className="personnel-empty">后端暂无报告数据。</div>
            )}
          </div>
        </section>

        <aside className="panel report-meta no-print">
          <SectionTitle title="报告状态" subtitle="来自实时 API" />
          <div className="check-list">
            <div className="check-item done"><FileCheck2 size={15} />数据已同步</div>
            <div className="check-item done"><FileText size={15} />PDF 由服务端生成</div>
            <div className={`check-item ${detailLoading ? "" : "done"}`}>
              <FileText size={15} />
              {detailLoading ? "正在读取完整记录" : "完整记录已读取"}
            </div>
          </div>
          <div className="checkin-panel">
            <div className="checkin-panel-head">
              <strong>到场签到</strong>
              <span className={activeCheckin ? "pill checkin-ok" : "pill"}>
                {activeCheckin ? "已签到" : "未签到"}
              </span>
            </div>
            {activeCheckin ? (
              <>
                <span>{activeCheckin.time}</span>
                <small>
                  {activeCheckin.accuracy && activeCheckin.accuracy > 0
                    ? `定位精度 ±${Math.round(activeCheckin.accuracy)} 米`
                    : "定位精度未记录"}
                </small>
                {activeCheckin.latitude != null && activeCheckin.longitude != null ? (
                  <small className="mono">
                    {activeCheckin.latitude.toFixed(6)}, {activeCheckin.longitude.toFixed(6)}
                  </small>
                ) : null}
              </>
            ) : (
              <small>该记录暂无现场签到数据</small>
            )}
          </div>
          <button type="button" className="button secondary full-width" onClick={() => void openPdf()}>
            <Download size={15} />
            下载当前版本
          </button>
          <div className="version-list">
            <div className="version-title"><FileText size={15} /><strong>当前记录</strong></div>
            <div className="version-item">
              <div>
                <strong>实时版本</strong>
                <span>{lastUpdated || "—"}</span>
                <small>{selectedSite.name}</small>
              </div>
              <StatusPill status="可下载" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
