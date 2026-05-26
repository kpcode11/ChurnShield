import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ReferenceLine, ReferenceArea, Cell,
} from "recharts";
import {
  fetchAnalytics, fetchAnalyticsTrends,
  type AnalyticsData, type TrendsData, type KpiPair,
} from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

function ChartCard({ title, children, className = "", subtitle }: {
  title: string;
  children: React.ReactNode;
  className?: string;
  subtitle?: string;
}) {
  return (
    <div className={`bg-card rounded-lg p-5 card-shadow ${className}`}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      {subtitle && <p className="text-xs text-muted-foreground mt-1 mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

function toBarData(rec: Record<string, number>, keyProp: string, labelMap?: Record<string, string>) {
  return Object.entries(rec)
    .map(([k, v]) => ({
      [keyProp]: labelMap?.[k] ?? k,
      rate: v,
      rawKey: k,
    }))
    .sort((a, b) => {
      const an = Number(a.rawKey), bn = Number(b.rawKey);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return String(a[keyProp]).localeCompare(String(b[keyProp]));
    });
}

/** Y-axis max with headroom for churn-rate bar charts. */
function churnRateDomain(data: { rate: number }[]): [number, number] {
  if (!data.length) return [0, 40];
  const max = Math.max(...data.map(d => d.rate), 1);
  return [0, Math.ceil(max * 1.15)];
}

function formatFeature(name: string) {
  return name.replace(/([A-Z])/g, " $1").trim();
}

const T = { fontSize: 11 };
const CHURN_COLOR = "hsl(0, 72%, 51%)";
const STAY_COLOR = "hsl(160, 84%, 39%)";

const SUBSCRIPTION_ORDER = ["Free", "Silver", "Gold", "Platinum"];

function StatCard({ label, value, hint, accent }: {
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "danger" | "success";
}) {
  const valueClass =
    accent === "danger" ? "text-destructive" :
    accent === "success" ? "text-green-600" :
    "text-card-foreground";
  return (
    <div className="bg-card rounded-lg p-4 card-shadow">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-2xl font-bold ${valueClass}`}>{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function KpiInsight({
  label, pair, unit, churnedHigherIsRisk,
}: {
  label: string;
  pair: KpiPair;
  unit: string;
  churnedHigherIsRisk: boolean;
}) {
  const diff = pair.churned - pair.stayed;
  const isRisk = churnedHigherIsRisk ? diff > 0 : diff < 0;
  return (
    <div className="bg-muted/40 rounded-md px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold">
        <span className="text-destructive">{pair.churned}{unit}</span>
        <span className="text-muted-foreground text-xs mx-1">vs</span>
        <span className="text-green-600">{pair.stayed}{unit}</span>
      </p>
      <p className={`text-xs mt-0.5 font-medium ${isRisk ? "text-destructive" : "text-green-600"}`}>
        {diff > 0 ? "+" : ""}{diff.toFixed(1)}{unit} for churned
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Analytics() {
  const [cityFilter, setCityFilter] = useState("all");
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [trends, setTrends]   = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      fetchAnalytics(ctrl.signal),
      fetchAnalyticsTrends(ctrl.signal),
    ])
      .then(([a, t]) => { setData(a); setTrends(t); })
      .catch(e => {
        if (e?.name !== "AbortError") {
          setError("Failed to load analytics. Is the backend running on port 8000?");
        }
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const subscriptionData = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data.churn_by_subscription);
    return SUBSCRIPTION_ORDER
      .filter(plan => plan in data.churn_by_subscription)
      .map(plan => ({ plan, rate: data.churn_by_subscription[plan] }))
      .concat(
        entries
          .filter(([plan]) => !SUBSCRIPTION_ORDER.includes(plan))
          .map(([plan, rate]) => ({ plan, rate })),
      );
  }, [data]);

  const complainData = useMemo(() => {
    if (!data?.churn_by_complain) return [];
    return [
      { label: "No complaint", rate: data.churn_by_complain["0"] ?? 0 },
      { label: "Complaint filed", rate: data.churn_by_complain["1"] ?? 0 },
    ];
  }, [data]);

  const cityData = useMemo(() => {
    if (!data) return [];
    const raw = toBarData(data.churn_by_city_tier, "tier").map(d => ({
      ...d,
      tier: `Tier ${d.rawKey}`,
    }));
    return cityFilter === "all"
      ? raw
      : raw.filter(d => String(d.rawKey) === cityFilter);
  }, [data, cityFilter]);

  const featureChartData = useMemo(
    () => (data?.feature_importance ?? []).slice(0, 10).map(f => ({
      ...f,
      displayName: formatFeature(f.feature),
    })),
    [data],
  );

  const featureDomainMax = useMemo(() => {
    const m = Math.max(...featureChartData.map(f => f.importance_pct), 5);
    return Math.ceil(m * 1.2);
  }, [featureChartData]);

  const engagementKpis = useMemo(() => {
    if (!data) return [];
    const k = data.kpi_comparison;
    return [
      { metric: "App hours / day", churned: k.avg_app_hours.churned, stayed: k.avg_app_hours.stayed },
      { metric: "Orders", churned: k.avg_orders.churned, stayed: k.avg_orders.stayed },
      { metric: "Days since order", churned: k.avg_days_since_order.churned, stayed: k.avg_days_since_order.stayed },
      { metric: "Last login (days)", churned: k.avg_last_login_days.churned, stayed: k.avg_last_login_days.stayed },
      { metric: "Support tickets", churned: k.avg_support_tickets.churned, stayed: k.avg_support_tickets.stayed },
    ];
  }, [data]);

  const financialKpis = useMemo(() => {
    if (!data) return [];
    const k = data.kpi_comparison;
    return [
      { metric: "Total spend ₹", churned: k.avg_total_spend.churned, stayed: k.avg_total_spend.stayed },
      { metric: "Cashback ₹", churned: k.avg_cashback.churned, stayed: k.avg_cashback.stayed },
      { metric: "Return rate %", churned: k.avg_return_rate.churned, stayed: k.avg_return_rate.stayed },
      { metric: "Coupons used", churned: k.avg_coupons_used.churned, stayed: k.avg_coupons_used.stayed },
    ];
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm animate-pulse">Loading analytics…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive text-sm">{error ?? "No data"}</p>
      </div>
    );
  }

  const mp = data.model_performance;
  const retained = data.total_customers - data.churned_customers;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Production customers only (validation anchor rows excluded from aggregates)
          </p>
        </div>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="City Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="1">Tier 1</SelectItem>
            <SelectItem value="2">Tier 2</SelectItem>
            <SelectItem value="3">Tier 3</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total customers" value={data.total_customers.toLocaleString()} />
        <StatCard label="Churned" value={data.churned_customers.toLocaleString()} accent="danger" />
        <StatCard
          label="Overall churn rate"
          value={`${data.overall_churn_rate}%`}
          hint={`${retained.toLocaleString()} retained`}
          accent="danger"
        />
        {mp && (
          <StatCard
            label={`${mp.model_name} ROC-AUC`}
            value={`${(mp.roc_auc * 100).toFixed(1)}%`}
            hint={`Threshold ${(mp.threshold * 100).toFixed(0)}% · test n=${mp.total_test_samples}`}
            accent="success"
          />
        )}
      </div>

      {/* Model performance */}
      {mp && (
        <ChartCard
          title="Model performance (held-out test set)"
          subtitle="Metrics from outputs/metrics.json after last evaluate run"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {[
              { label: "ROC-AUC", value: `${(mp.roc_auc * 100).toFixed(1)}%` },
              { label: "Accuracy", value: `${(mp.accuracy * 100).toFixed(1)}%` },
              { label: "F1 (churn)", value: `${(mp.f1_score * 100).toFixed(1)}%` },
              { label: "Precision", value: `${(mp.precision * 100).toFixed(1)}%` },
              { label: "Recall", value: `${(mp.recall * 100).toFixed(1)}%` },
              { label: "Threshold", value: `${(mp.threshold * 100).toFixed(0)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-md bg-muted/50 px-3 py-2 text-center">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-card-foreground">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Confusion matrix (test)</p>
              <div className="grid grid-cols-3 gap-1 text-xs text-center max-w-xs mx-auto">
                <div />
                <div className="font-medium text-muted-foreground py-1">Pred stay</div>
                <div className="font-medium text-muted-foreground py-1">Pred churn</div>
                <div className="font-medium text-muted-foreground py-2">Actual stay</div>
                <div className="bg-green-100 dark:bg-green-950 rounded p-2 font-semibold">
                  {mp.true_negatives ?? "—"}
                </div>
                <div className="bg-amber-100 dark:bg-amber-950 rounded p-2 font-semibold text-amber-800">
                  {mp.false_positives}
                </div>
                <div className="font-medium text-muted-foreground py-2">Actual churn</div>
                <div className="bg-amber-100 dark:bg-amber-950 rounded p-2 font-semibold text-amber-800">
                  {mp.false_negatives}
                </div>
                <div className="bg-green-100 dark:bg-green-950 rounded p-2 font-semibold">
                  {mp.true_positives ?? "—"}
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                FP = stayed but flagged churn · FN = churned but missed
              </p>
            </div>
            {mp.vs_naive_baseline && (
              <div className="rounded-md border border-border p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">vs naive baseline</p>
                <p className="text-xs text-muted-foreground mb-2">{mp.vs_naive_baseline.description}</p>
                <ul className="text-sm space-y-1">
                  <li>Baseline accuracy: <strong>{(mp.vs_naive_baseline.accuracy * 100).toFixed(1)}%</strong></li>
                  <li>Model accuracy: <strong>{(mp.accuracy * 100).toFixed(1)}%</strong></li>
                  <li>Baseline F1 (churn): <strong>{(mp.vs_naive_baseline.f1_churn * 100).toFixed(1)}%</strong></li>
                  <li>Model F1 (churn): <strong>{(mp.f1_score * 100).toFixed(1)}%</strong></li>
                </ul>
              </div>
            )}
          </div>
        </ChartCard>
      )}

      {/* Top churn drivers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="Churn by satisfaction score" subtitle="1 = very dissatisfied · 5 = very satisfied">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={toBarData(data.churn_by_satisfaction, "score")}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="score" tick={T} label={{ value: "Score", position: "insideBottom", offset: -2, fontSize: 10 }} />
              <YAxis tick={T} unit="%" domain={churnRateDomain(toBarData(data.churn_by_satisfaction, "score"))} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn rate"]} />
              <Bar dataKey="rate" name="Churn %" radius={[4, 4, 0, 0]}>
                {toBarData(data.churn_by_satisfaction, "score").map((_, i) => (
                  <Cell key={i} fill={`hsl(38, 92%, ${42 + i * 8}%)`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Churn by subscription plan" subtitle="Free → Platinum commitment ladder">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subscriptionData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tick={T} unit="%" domain={churnRateDomain(subscriptionData.map(d => ({ rate: d.rate })))} />
              <YAxis type="category" dataKey="plan" tick={{ fontSize: 10 }} width={72} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn rate"]} />
              <Bar dataKey="rate" name="Churn %" fill="hsl(340, 70%, 48%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Complaint filed vs not" subtitle="Customers who filed a complaint">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={complainData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={T} unit="%" domain={churnRateDomain(complainData.map(d => ({ rate: d.rate })))} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn rate"]} />
              <Bar dataKey="rate" name="Churn %" radius={[4, 4, 0, 0]}>
                <Cell fill="hsl(160, 84%, 39%)" />
                <Cell fill="hsl(0, 72%, 51%)" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Segmentation */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ChartCard title="Churn by city tier">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="tier" tick={T} />
              <YAxis tick={T} unit="%" domain={churnRateDomain(cityData)} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" fill="hsl(209,53%,23%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Churn by gender">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_gender, "gender")}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="gender" tick={T} />
              <YAxis tick={T} unit="%" domain={churnRateDomain(toBarData(data.churn_by_gender, "gender"))} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Churn by payment mode">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_payment_mode, "mode")} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tick={T} unit="%" domain={churnRateDomain(toBarData(data.churn_by_payment_mode, "mode"))} />
              <YAxis type="category" dataKey="mode" tick={{ fontSize: 9 }} width={88} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" fill="hsl(32, 90%, 48%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Churn by login device">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_device, "device")} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tick={T} unit="%" domain={churnRateDomain(toBarData(data.churn_by_device, "device"))} />
              <YAxis type="category" dataKey="device" tick={{ fontSize: 9 }} width={88} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" fill="hsl(262, 52%, 47%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Tenure + category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title="Churn by tenure band" subtitle="Months on platform">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={toBarData(data.churn_by_tenure, "band")}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="band" tick={{ fontSize: 9 }} />
              <YAxis tick={T} unit="%" domain={churnRateDomain(toBarData(data.churn_by_tenure, "band"))} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" fill="hsl(209, 53%, 35%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Churn by order category">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={toBarData(data.churn_by_category, "category")} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tick={T} unit="%" domain={churnRateDomain(toBarData(data.churn_by_category, "category"))} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 9 }} width={100} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" fill="hsl(186, 85%, 35%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Lifecycle trend */}
      {trends && (
        <ChartCard
          title="Churn hazard by customer tenure"
          subtitle={`Peak hazard month ${trends.peak_churn_month.month} (${trends.peak_churn_month.churn_rate}%) · Stabilises after month ${trends.stabilizes_after_month}`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends.monthly_trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="month" tick={T} label={{ value: "Tenure (months)", position: "insideBottom", offset: -2, fontSize: 10 }} />
              <YAxis tick={T} unit="%" domain={[0, "auto"]} />
              <Tooltip
                formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                labelFormatter={(l: number) => `Month ${l}`}
              />
              <Legend verticalAlign="top" height={28} iconType="line" wrapperStyle={{ fontSize: 11 }} />
              <ReferenceArea
                x1={trends.stabilizes_after_month}
                x2={60}
                fill="hsl(160,60%,90%)"
                fillOpacity={0.35}
              />
              <ReferenceLine
                x={trends.peak_churn_month.month}
                stroke={CHURN_COLOR}
                strokeDasharray="4 3"
              />
              <Line type="monotone" dataKey="churn_rate" name="Raw churn %" stroke="hsl(209,53%,70%)" strokeWidth={1} dot={false} strokeDasharray="3 2" />
              <Line type="monotone" dataKey="rolling_rate" name={`${trends.rolling_window}-mo rolling`} stroke="hsl(209,53%,23%)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Feature importance */}
      {featureChartData.length > 0 && (
        <ChartCard title="Top 10 feature importances (XGBoost gain)" subtitle="From the trained model on the current dataset">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={featureChartData} layout="vertical" margin={{ left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tick={T} unit="%" domain={[0, featureDomainMax]} />
              <YAxis type="category" dataKey="displayName" tick={{ fontSize: 10 }} width={130} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Importance"]} />
              <Bar dataKey="importance_pct" name="Importance %" fill="hsl(209,53%,40%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* KPI comparisons — split scales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Engagement KPIs — churned vs stayed" subtitle="Mean per group">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={engagementKpis} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="metric" tick={{ fontSize: 9 }} />
              <YAxis tick={T} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="churned" name="Churned" fill={CHURN_COLOR} radius={[3, 3, 0, 0]} />
              <Bar dataKey="stayed" name="Stayed" fill={STAY_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Financial KPIs — churned vs stayed" subtitle="Mean per group">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={financialKpis} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="metric" tick={{ fontSize: 9 }} />
              <YAxis tick={T} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="churned" name="Churned" fill={CHURN_COLOR} radius={[3, 3, 0, 0]} />
              <Bar dataKey="stayed" name="Stayed" fill={STAY_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Key behavioural deltas">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiInsight label="Total spend" pair={data.kpi_comparison.avg_total_spend} unit="₹" churnedHigherIsRisk={false} />
          <KpiInsight label="Return rate" pair={data.kpi_comparison.avg_return_rate} unit="%" churnedHigherIsRisk />
          <KpiInsight label="Support tickets" pair={data.kpi_comparison.avg_support_tickets} unit="" churnedHigherIsRisk />
          <KpiInsight label="Satisfaction proxy" pair={data.kpi_comparison.avg_app_hours} unit="h" churnedHigherIsRisk={false} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Complaint rate: {data.kpi_comparison.avg_complain_rate.churned}% of churned vs{" "}
          {data.kpi_comparison.avg_complain_rate.stayed}% of stayed filed at least one complaint.
        </p>
      </ChartCard>

    </div>
  );
}
