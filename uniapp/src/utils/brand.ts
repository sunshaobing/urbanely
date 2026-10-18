import { reactive } from "vue";
import { API_BASE_URL, getTemplates } from "./api";
import type { BrandTemplates } from "./types";

const FALLBACK_LOGO = "";
const DEFAULT_COMPANY = "上海申汰实业有限公司";

export const brandState = reactive<BrandTemplates>({
  logo_url: FALLBACK_LOGO,
  company_name: DEFAULT_COMPANY,
});

let loaded = false;
let loading: Promise<void> | null = null;

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function assetValue(value: unknown): string {
  if (typeof value === "string") return value;
  const record = objectValue(value);
  if (!record) return "";
  const nested = record.url ?? record.path ?? record.src ?? record.logo_url;
  return typeof nested === "string" ? nested : "";
}

function resolveAsset(value: unknown) {
  const asset = assetValue(value).trim();
  if (!asset) return "";
  if (/^(https?:|data:|wxfile:)/.test(asset)) return asset;
  return `${API_BASE_URL}${asset.startsWith("/") ? asset : `/${asset}`}`;
}

function normaliseTemplates(payload: unknown) {
  const root = objectValue(payload) ?? {};
  const nested =
    objectValue(root.data) ??
    objectValue(root.templates) ??
    objectValue(root.settings) ??
    {};
  const candidates = [root, nested, objectValue(nested.templates) ?? {}];
  let logo = "";
  for (const candidate of candidates) {
    logo =
      resolveAsset(candidate.logo_url) ||
      resolveAsset(candidate.logo_path) ||
      resolveAsset(candidate.logo) ||
      resolveAsset(candidate.company_logo) ||
      resolveAsset(candidate.brand_logo);
    if (logo) break;
  }
  let company = "";
  for (const candidate of candidates) {
    const value =
      candidate.company_name ??
      candidate.service_company ??
      candidate.company ??
      candidate.organisation_name;
    if (typeof value === "string" && value.trim()) {
      company = value.trim();
      break;
    }
  }
  brandState.logo_url = logo || FALLBACK_LOGO;
  brandState.company_name = company || DEFAULT_COMPANY;
}

export function ensureBrand() {
  if (loaded) return Promise.resolve();
  if (loading) return loading;
  loading = getTemplates()
    .then((payload) => {
      normaliseTemplates(payload);
    })
    .catch(() => {
      brandState.logo_url = FALLBACK_LOGO;
      brandState.company_name = DEFAULT_COMPANY;
    })
    .finally(() => {
      loaded = true;
      loading = null;
    });
  return loading;
}
