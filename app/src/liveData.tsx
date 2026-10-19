import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  getDashboardSummary,
  getTemplates,
  itemsOf,
  listCustomers,
  listRiskSurveys,
  listServiceReports,
  listSites,
  listWorkOrders,
} from "./api";
import type {
  BackendCustomer,
  BackendDashboardSummary,
  BackendRiskSurvey,
  BackendServiceReport,
  BackendSite,
  BackendTemplates,
  BackendWorkOrder,
} from "./api";

export const LIVE_REFRESH_MS = 12_000;

export interface LiveSnapshot {
  summary: BackendDashboardSummary | null;
  workorders: BackendWorkOrder[];
  riskSurveys: BackendRiskSurvey[];
  serviceReports: BackendServiceReport[];
  customers: BackendCustomer[];
  sites: BackendSite[];
  templates: BackendTemplates | null;
}

interface LiveContextValue extends LiveSnapshot {
  loading: boolean;
  refreshing: boolean;
  error: string;
  warnings: string[];
  lastUpdated: string;
  refresh: () => Promise<void>;
}

const emptySnapshot: LiveSnapshot = {
  summary: null,
  workorders: [],
  riskSurveys: [],
  serviceReports: [],
  customers: [],
  sites: [],
  templates: null,
};

const LiveDataContext = createContext<LiveContextValue | null>(null);

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : "实时数据加载失败";
}

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState("");
  const requestId = useRef(0);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setRefreshing(true);
    const results = await Promise.allSettled([
      getDashboardSummary(),
      listWorkOrders({ page: 1, page_size: 200 }),
      listRiskSurveys(),
      listServiceReports(),
      listCustomers({ page: 1, page_size: 500 }),
      listSites(),
      getTemplates(),
    ]);
    if (!mounted.current || currentRequest !== requestId.current) return;

    const [
      summaryResult,
      workordersResult,
      surveysResult,
      reportsResult,
      customersResult,
      sitesResult,
      templatesResult,
    ] = results;
    const failures = results
      .map((result, index) =>
        result.status === "rejected"
          ? `${[
              "运营汇总",
              "作业单",
              "勘测报告",
              "封堵报告",
              "客户",
              "门店",
              "模板",
            ][index]}：${messageOf(result.reason)}`
          : "",
      )
      .filter(Boolean);

    setSnapshot((current) => ({
      summary:
        summaryResult.status === "fulfilled"
          ? summaryResult.value
          : current.summary,
      workorders:
        workordersResult.status === "fulfilled"
          ? itemsOf<BackendWorkOrder>(workordersResult.value)
          : current.workorders,
      riskSurveys:
        surveysResult.status === "fulfilled"
          ? itemsOf<BackendRiskSurvey>(surveysResult.value)
          : current.riskSurveys,
      serviceReports:
        reportsResult.status === "fulfilled"
          ? itemsOf<BackendServiceReport>(reportsResult.value)
          : current.serviceReports,
      customers:
        customersResult.status === "fulfilled"
          ? itemsOf<BackendCustomer>(customersResult.value)
          : current.customers,
      sites:
        sitesResult.status === "fulfilled"
          ? itemsOf<BackendSite>(sitesResult.value)
          : current.sites,
      templates:
        templatesResult.status === "fulfilled"
          ? templatesResult.value
          : current.templates,
    }));
    setWarnings(failures);
    setError(
      failures.length === results.length ? failures.join("；") : "",
    );
    setLoading(false);
    setRefreshing(false);
    setLastUpdated(
      new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, LIVE_REFRESH_MS);
    const onFocus = () => {
      void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const value = useMemo<LiveContextValue>(
    () => ({
      ...snapshot,
      loading,
      refreshing,
      error,
      warnings,
      lastUpdated,
      refresh,
    }),
    [error, lastUpdated, loading, refresh, refreshing, snapshot, warnings],
  );

  return (
    <LiveDataContext.Provider value={value}>
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData() {
  const context = useContext(LiveDataContext);
  if (!context) {
    throw new Error("useLiveData must be used within LiveDataProvider");
  }
  return context;
}
