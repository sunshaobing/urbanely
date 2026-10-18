import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { Toast } from "./components/ui";
import { Customers } from "./pages/Customers";
import { Dashboard } from "./pages/Dashboard";
import { FieldMode } from "./pages/FieldMode";
import { Inspections } from "./pages/Inspections";
import { Permissions } from "./pages/Permissions";
import { Reports } from "./pages/Reports";
import { Sealing } from "./pages/Sealing";
import { ServiceOrders } from "./pages/ServiceOrders";
import type { PageKey, ReportTemplate } from "./types";

export default function App() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [focusInspectionId, setFocusInspectionId] = useState<string | null>(null);
  const [reportTemplate, setReportTemplate] = useState<ReportTemplate>("survey");
  const [reportInspectionId, setReportInspectionId] = useState("insp-1");
  const [reportSealingId, setReportSealingId] = useState("seal-1");

  const notify = (message: string) => {
    setToast(message);
  };

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const navigate = (page: PageKey) => {
    setActivePage(page);
    if (page !== "inspections") setFocusInspectionId(null);
  };

  const openInspection = (id: string) => {
    setFocusInspectionId(id);
    setActivePage("inspections");
  };

  const openReport = (template: ReportTemplate, id: string) => {
    setReportTemplate(template);
    if (template === "survey") setReportInspectionId(id);
    else setReportSealingId(id);
    setActivePage("reports");
  };

  return (
    <Layout activePage={activePage} onNavigate={navigate} search={search} onSearch={setSearch}>
      {activePage === "dashboard" ? (
        <Dashboard onNavigate={navigate} onOpenInspection={openInspection} />
      ) : null}
      {activePage === "inspections" ? (
        <Inspections
          search={search}
          focusId={focusInspectionId}
          onNotify={notify}
          onOpenReport={openReport}
        />
      ) : null}
      {activePage === "sealing" ? <Sealing onNotify={notify} onOpenReport={openReport} /> : null}
      {activePage === "services" ? <ServiceOrders onNotify={notify} /> : null}
      {activePage === "customers" ? <Customers onNotify={notify} /> : null}
      {activePage === "permissions" ? <Permissions onNotify={notify} /> : null}
      {activePage === "reports" ? (
        <Reports
          initialTemplate={reportTemplate}
          initialInspectionId={reportInspectionId}
          initialSealingId={reportSealingId}
          onNotify={notify}
        />
      ) : null}
      {activePage === "field" ? <FieldMode onNotify={notify} /> : null}
      {toast ? <Toast message={toast} onClose={() => setToast(null)} /> : null}
    </Layout>
  );
}

