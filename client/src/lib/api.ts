/**
 * API utility for ChurnShield client.
 *
 * Vite proxies /api/* → http://localhost:8000 during development,
 * so no absolute URL or CORS header is required in dev.
 *
 * For production, set VITE_API_BASE_URL in .env.production:
 *   VITE_API_BASE_URL=https://your-backend.com
 */

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "") + "/api";

// ─── Types ──────────────────────────────────────────────────────────────────

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface ApiError {
  status: number;
  message: string;
  detail?: unknown;
}

// Matches backend CustomerInput schema (all optional — backend has defaults)
export interface CustomerInput {
  Tenure?: number;
  PreferredLoginDevice?: string;
  CityTier?: number;
  WarehouseToHome?: number;
  PreferredPaymentMode?: string;
  Gender?: string;
  HourSpendOnApp?: number;
  NumberOfDeviceRegistered?: number;
  PreferedOrderCat?: string;
  SatisfactionScore?: number;
  MaritalStatus?: string;
  NumberOfAddress?: number;
  Complain?: number;
  OrderAmountHikeFromlastYear?: number;
  CouponUsed?: number;
  OrderCount?: number;
  DaySinceLastOrder?: number;
  CashbackAmount?: number;
}

export interface PredictResponse {
  prediction: 0 | 1;
  churn_probability: number;       // 0.0–1.0
  risk_level: "Low" | "Medium" | "High";
  top_risk_factors: { feature: string; impact: number }[];
  threshold_used: number;
}

// Matches backend SuggestInput schema
export interface SuggestInput {
  DaySinceLastOrder?: number;
  SatisfactionScore?: number;
  Complain?: number;
  CashbackAmount?: number;
  Tenure?: number;
}

export interface ChurnSignal {
  rank: number;
  key: string;
  label: string;
  action_type: string;
  reason: string;
  suggestion: string;
}

export interface SuggestResponse {
  reason: string;
  suggestion: string;
  action_type: string;                    // e.g. "call", "email", "coupon", "cashback"…
  churn_signals: ChurnSignal[];           // all triggered signals ranked by severity
  priority: "critical" | "high" | "medium" | "low";
}

// Matches backend RevenueInput schema
export interface RevenueInput {
  at_risk_customers: number;
  avg_order_value: number;
  coupon_amount: number;
  retention_rate: number;
  orders_per_year?: number;
}

export interface RevenueResponse {
  at_risk_customers: number;
  revenue_at_risk: number;
  campaign_cost: number;
  customers_retained: number;
  revenue_saved: number;
  net_roi: number;
  roi_percentage: number;
  orders_per_year: number;
}

// Matches backend POST /metrics/revenue-impact schemas
export interface CustomerRevenueRecord {
  customer_id?: string;
  churn_probability: number;   // 0.0 – 1.0
  revenue_value: number;       // per-order revenue
  orders_per_year?: number;
  risk_level?: "High" | "Medium" | "Low";
}

export interface RevenueImpactInput {
  customers: CustomerRevenueRecord[];
  campaign_cost_per_customer: number;
  retention_rate: number;  // percentage, e.g. 30
}

interface RiskTierDetail {
  customers: number;
  revenue_at_risk: number;
  share_pct: number;
}

interface TopAtRiskCustomer {
  customer_id: string | null;
  churn_probability: number;
  annual_revenue: number;
  at_risk_revenue: number;
  risk_level: "High" | "Medium" | "Low";
}

export interface RevenueImpactResponse {
  risk_analysis: {
    total_customers: number;
    total_revenue_base: number;
    total_revenue_at_risk: number;
    weighted_churn_probability: number;
    weighted_churn_probability_pct: number;
    by_risk_tier: Record<"High" | "Medium" | "Low", RiskTierDetail>;
    top_at_risk_customers: TopAtRiskCustomer[];
  };
  roi: {
    campaign_cost: number;
    customers_retained: number;
    revenue_saved: number;
    net_roi: number;
    roi_percentage: number;
    payback_ratio: number;
    break_even_retention_rate_pct: number;
    is_roi_positive: boolean;
  };
  meta: {
    retention_rate_input: number;
    campaign_cost_per_customer: number;
  };
}

// Matches backend MessageInput schema
export interface MessageInput {
  customer_segment: string;
  suggestion: string;
  tone?: string;
  channel?: string;
  churn_signals?: object[];
}

export interface MessageResponse {
  message: string;
  source: "ollama" | "claude" | "template";
}

// Matches backend MessageSendInput schema
export interface MessageSendInput {
  customer_segment: string;
  suggestion: string;
  to_number: string;          // E.164, e.g. '+919876543210'
  tone?: string;
  channel?: string;
  churn_signals?: object[];
}

export interface MessageDelivery {
  success: boolean;
  sid: string | null;
  status: string;
  error: string | null;
}

export interface MessageSendResponse {
  message: string;
  source: "ollama" | "claude" | "template";
  delivery: MessageDelivery;
}

// Matches backend GET /analytics response
export interface KpiPair {
  churned: number;
  stayed:  number;
}

export interface KpiComparison {
  avg_cashback:          KpiPair;
  avg_orders:            KpiPair;
  avg_order_hike_pct:    KpiPair;
  avg_app_hours:         KpiPair;
  avg_days_since_order:  KpiPair;
  avg_warehouse_to_home: KpiPair;
  avg_coupons_used:      KpiPair;
  avg_num_devices:       KpiPair;
  avg_complain_rate:     KpiPair;
  avg_total_spend:       KpiPair;
  avg_order_value:       KpiPair;
  avg_return_rate:       KpiPair;
  avg_customer_age:      KpiPair;
  avg_last_login_days:   KpiPair;
  avg_reviews_given:     KpiPair;
  avg_wishlist_items:    KpiPair;
  avg_referrals_made:    KpiPair;
  avg_support_tickets:   KpiPair;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  importance_pct: number;
}

export interface ModelPerformance {
  model_name: string;
  roc_auc: number;
  f1_score: number;
  accuracy: number;
  precision: number;
  recall: number;
  false_positives: number;
  false_negatives: number;
  total_test_samples: number;
  training_time_seconds: number;
  threshold: number;
}

export interface AnalyticsData {
  total_customers:          number;
  churned_customers:        number;
  overall_churn_rate:       number;
  churn_by_city_tier:       Record<string, number>;
  churn_by_gender:          Record<string, number>;
  churn_by_satisfaction:    Record<string, number>;
  churn_by_device:          Record<string, number>;
  churn_by_marital_status:  Record<string, number>;
  churn_by_category:        Record<string, number>;
  churn_by_payment_mode:    Record<string, number>;
  churn_by_subscription:    Record<string, number>;
  avg_days_since_last_order: { churned: number; stayed: number };
  churn_by_tenure:          Record<string, number>;
  kpi_comparison:           KpiComparison;
  feature_importance:       FeatureImportance[];
  model_performance:        ModelPerformance;
}

// Matches backend GET /analytics/trends response
export interface MonthlyTrendPoint {
  month:        number;   // Tenure month on platform (0-60)
  churned:      number;
  stayed:       number;
  total:        number;
  churn_rate:   number;   // raw %
  rolling_rate: number;   // smoothed 3-month rolling average %
}

export interface TrendsData {
  monthly_trend:          MonthlyTrendPoint[];
  rolling_window:         number;
  peak_churn_month:       { month: number; churn_rate: number };
  stabilizes_after_month: number;
}

// ─── Core fetch wrapper ──────────────────────────────────────────────────────

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers: HeadersInit = { Accept: "application/json" };

  if (body && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    credentials: "include",
    signal,
    body:
      body instanceof FormData
        ? body
        : body !== undefined
          ? JSON.stringify(body)
          : undefined,
  });

  if (!res.ok) {
    let detail: unknown;
    try { detail = await res.json(); } catch { detail = await res.text(); }
    throw { status: res.status, message: `API error ${res.status}: ${res.statusText}`, detail } as ApiError;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Download a binary response (e.g. Excel). Returns the raw Blob. */
async function requestBlob(
  method: HttpMethod,
  path: string,
  body?: FormData,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    credentials: "include",
    signal,
    body,
  });
  if (!res.ok) {
    throw { status: res.status, message: `API error ${res.status}: ${res.statusText}` } as ApiError;
  }
  return res.blob();
}

// ─── Convenience helpers ─────────────────────────────────────────────────────

export const api = {
  get:      <T>(path: string, signal?: AbortSignal) => request<T>("GET", path, undefined, signal),
  post:     <T>(path: string, body: unknown, signal?: AbortSignal) => request<T>("POST", path, body, signal),
  postBlob: (path: string, formData: FormData, signal?: AbortSignal) => requestBlob("POST", path, formData, signal),
  put:      <T>(path: string, body: unknown, signal?: AbortSignal) => request<T>("PUT", path, body, signal),
  del:      <T>(path: string, signal?: AbortSignal) => request<T>("DELETE", path, undefined, signal),
};

// ─── ChurnShield endpoint helpers ────────────────────────────────────────────

/** POST /predict — single customer churn prediction */
export const predictCustomer = (payload: CustomerInput) =>
  api.post<PredictResponse>("/predict", payload);

/** POST /suggest — rule-based retention suggestion */
export const getSuggestion = (payload: SuggestInput) =>
  api.post<SuggestResponse>("/suggest", payload);

/** POST /predict/bulk — CSV upload → scored .xlsx file download */
export const bulkPredict = (file: File, signal?: AbortSignal): Promise<Blob> => {
  const form = new FormData();
  form.append("file", file);
  return api.postBlob("/predict/bulk", form, signal);
};

/** GET /analytics — aggregated analytics from the CSV dataset */
export const fetchAnalytics = (signal?: AbortSignal) =>
  api.get<AnalyticsData>("/analytics", signal);

/** GET /analytics/trends — monthly churn time-series (Tenure as lifecycle axis) */
export const fetchAnalyticsTrends = (signal?: AbortSignal) =>
  api.get<TrendsData>("/analytics/trends", signal);

/** POST /revenue — simple aggregate revenue impact calculation */
export const calcRevenueImpact = (payload: RevenueInput) =>
  api.post<RevenueResponse>("/revenue", payload);

/** POST /metrics/revenue-impact — per-customer granular revenue risk + ROI */
export const calcGranularRevenueImpact = (payload: RevenueImpactInput) =>
  api.post<RevenueImpactResponse>("/metrics/revenue-impact", payload);

/** POST /message — AI / template-based retention message (generate only) */
export const generateRetentionMessage = (payload: MessageInput) =>
  api.post<MessageResponse>("/message", payload);

/** POST /message/send — generate + dispatch via Twilio WhatsApp */
export const sendRetentionMessage = (payload: MessageSendInput) =>
  api.post<MessageSendResponse>("/message/send", payload);

