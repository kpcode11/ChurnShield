import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ReferenceLine, ReferenceArea, Cell,
} from "recharts";
import { ChartPanel, PageHero } from "@/components/supabaze";
import {
  fetchAnalytics, fetchAnalyticsTrends,
  type AnalyticsData, type TrendsData, type KpiPair,
} from "@/lib/api";
import {
  CHART,
  chartCategoryColor,
  chartChurnRateColor,
  useChartTheme,
} from "@/lib/chart-colors";

/** Matches backend/analytics.py tenure bins — must not sort lexicographically */
const TENURE_BAND_ORDER = ["0-6", "7-12", "13-18", "19-24", "25-36", "37-48", "49-60", "60+"] as const;

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

function toTenureBarData(rec: Record<string, number>) {
  return TENURE_BAND_ORDER.filter((band) => band in rec).map((band) => ({
    band,
    rate: rec[band],
    rawKey: band,
  }));
}

function churnRateDomain(data: { rate: number }[]): [number, number] {
  if (!data.length) return [0, 40];
  const max = Math.max(...data.map(d => d.rate), 1);
  return [0, Math.ceil(max * 1.15)];
}

function formatFeature(name: string) {
  return name.replace(/([A-Z])/g, " $1").trim();
}

const CHURN_COLOR = CHART.churned;
const STAY_COLOR = CHART.stayed;

const SUBSCRIPTION_ORDER = ["Free", "Silver", "Gold", "Platinum"];

function StatCard({ label, value, hint, accent }: {
  label: string;
  value: string;
  hint?: string;
  accent?: "default" | "danger" | "success";
}) {
  const accentBorder =
    accent === "danger" ? CHART.churned :
    accent === "success" ? CHART.stayed :
    undefined;
  return (
    <div
      className="rounded-xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
      style={accentBorder ? { borderLeftWidth: 4, borderLeftColor: accentBorder } : undefined}
    >
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p
        className="mt-1 text-2xl font-medium tracking-[-0.02em] text-foreground"
        style={accentBorder ? { color: accentBorder } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p>}
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
    <div className="rounded-md border border-border bg-muted px-3 py-2 text-center">
      <p className="mb-1 text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">
        <span style={{ color: CHART.churned }}>{pair.churned}{unit}</span>
        <span className="text-[#9a9a9a] text-xs mx-1">vs</span>
        <span style={{ color: CHART.stayed }}>{pair.stayed}{unit}</span>
      </p>
      <p className={`mt-0.5 text-xs font-medium ${isRisk ? "text-[#e2005a]" : "text-muted-foreground"}`}>
        {diff > 0 ? "+" : ""}{diff.toFixed(1)}{unit} for churned
      </p>
    </div>
  );
}

export default function Analytics() {
  const chartTheme = useChartTheme();
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

  const satisfactionBars = useMemo(
    () => toBarData(data?.churn_by_satisfaction ?? {}, "score"),
    [data],
  );
  const satisfactionRates = useMemo(
    () => satisfactionBars.map(d => d.rate),
    [satisfactionBars],
  );

  const tenureBandData = useMemo(
    () => (data ? toTenureBarData(data.churn_by_tenure) : []),
    [data],
  );
  const tenureBandRates = useMemo(
    () => tenureBandData.map(d => d.rate),
    [tenureBandData],
  );

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
      <div className="mx-auto flex h-64 max-w-[1280px] items-center justify-center">
        <p className="animate-pulse text-sm text-muted-foreground">Loading analytics…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex h-64 max-w-[1280px] items-center justify-center">
        <p className="text-sm text-[#e2005a]">{error ?? "No data"}</p>
      </div>
    );
  }

  const mp = data.model_performance;
  const retained = data.total_customers - data.churned_customers;

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 pb-10">
      <PageHero
        title="Analytics dashboard"
        lead="Production customers only — validation anchor rows excluded from aggregates."
        badge="Model insights"
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
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

      {mp && (
        <ChartPanel
          title="Model performance"
          subtitle="Metrics from outputs/metrics.json after last evaluate run"
        >
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "ROC-AUC", value: `${(mp.roc_auc * 100).toFixed(1)}%` },
              { label: "Accuracy", value: `${(mp.accuracy * 100).toFixed(1)}%` },
              { label: "F1 (churn)", value: `${(mp.f1_score * 100).toFixed(1)}%` },
              { label: "Precision", value: `${(mp.precision * 100).toFixed(1)}%` },
              { label: "Recall", value: `${(mp.recall * 100).toFixed(1)}%` },
              { label: "Threshold", value: `${(mp.threshold * 100).toFixed(0)}%` },
            ].map(({ label, value }, i) => (
              <div
                key={label}
                className="rounded-md border border-border bg-muted px-3 py-2 text-center"
                style={{ borderTopColor: chartCategoryColor(i), borderTopWidth: 3 }}
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-medium" style={{ color: chartCategoryColor(i) }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-md border border-border p-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Confusion matrix (test)</p>
              <div className="mx-auto grid max-w-xs grid-cols-3 gap-1 text-center text-xs">
                <div />
                <div className="py-1 font-medium text-muted-foreground">Pred stay</div>
                <div className="py-1 font-medium text-muted-foreground">Pred churn</div>
                <div className="py-2 font-medium text-muted-foreground">Actual stay</div>
                <div className="rounded p-2 font-medium text-foreground" style={{ backgroundColor: `${CHART.stayed}33` }}>
                  {mp.true_negatives ?? "—"}
                </div>
                <div className="rounded p-2 font-medium text-foreground" style={{ backgroundColor: `${CHART.peakLine}18` }}>
                  {mp.false_positives}
                </div>
                <div className="py-2 font-medium text-muted-foreground">Actual churn</div>
                <div className="rounded p-2 font-medium text-foreground" style={{ backgroundColor: `${CHART.peakLine}18` }}>
                  {mp.false_negatives}
                </div>
                <div className="rounded p-2 font-medium text-foreground" style={{ backgroundColor: `${CHART.stayed}33` }}>
                  {mp.true_positives ?? "—"}
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground/80">
                FP = stayed but flagged churn · FN = churned but missed
              </p>
            </div>
            {mp.vs_naive_baseline && (
              <div className="rounded-md border border-border p-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">vs naive baseline</p>
                <p className="mb-2 text-xs text-muted-foreground/80">{mp.vs_naive_baseline.description}</p>
                <ul className="space-y-1 text-sm text-foreground">
                  <li>Baseline accuracy: <strong>{(mp.vs_naive_baseline.accuracy * 100).toFixed(1)}%</strong></li>
                  <li>Model accuracy: <strong>{(mp.accuracy * 100).toFixed(1)}%</strong></li>
                  <li>Baseline F1 (churn): <strong>{(mp.vs_naive_baseline.f1_churn * 100).toFixed(1)}%</strong></li>
                  <li>Model F1 (churn): <strong>{(mp.f1_score * 100).toFixed(1)}%</strong></li>
                </ul>
              </div>
            )}
          </div>
        </ChartPanel>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <ChartPanel title="Churn by satisfaction score" subtitle="1 = very dissatisfied · 5 = very satisfied · greener = lower churn">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={satisfactionBars}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="score" tick={chartTheme.tick} label={{ value: "Score", position: "insideBottom", offset: -2, fontSize: 10, fill: chartTheme.tick.fill }} />
              <YAxis tick={chartTheme.tick} unit="%" domain={churnRateDomain(satisfactionBars)} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn rate"]} contentStyle={chartTheme.tooltip} />
              <Bar dataKey="rate" name="Churn %" radius={[4, 4, 0, 0]}>
                {satisfactionBars.map((entry, i) => (
                  <Cell key={i} fill={chartChurnRateColor(entry.rate, satisfactionRates)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Churn by subscription plan" subtitle="Free → Platinum commitment ladder">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subscriptionData} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis type="number" tick={chartTheme.tick} unit="%" domain={churnRateDomain(subscriptionData.map(d => ({ rate: d.rate })))} />
              <YAxis type="category" dataKey="plan" tick={{ fontSize: 10, fill: chartTheme.tick.fill }} width={72} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn rate"]} contentStyle={chartTheme.tooltip} />
              <Bar dataKey="rate" name="Churn %" radius={[0, 4, 4, 0]}>
                {subscriptionData.map((_, i) => (
                  <Cell key={i} fill={CHART.subscription[i % CHART.subscription.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Complaint filed vs not" subtitle="Customers who filed a complaint">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={complainData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: chartTheme.tick.fill }} />
              <YAxis tick={chartTheme.tick} unit="%" domain={churnRateDomain(complainData.map(d => ({ rate: d.rate })))} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn rate"]} contentStyle={chartTheme.tooltip} />
              <Bar dataKey="rate" name="Churn %" radius={[4, 4, 0, 0]}>
                <Cell fill={CHART.stayed} />
                <Cell fill={CHART.churned} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        <ChartPanel title="Churn by city tier" padding="md">
          <div className="mb-3 flex justify-end">
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="h-8 w-[120px] rounded-md border-border text-xs">
                <SelectValue placeholder="All tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="1">Tier 1</SelectItem>
                <SelectItem value="2">Tier 2</SelectItem>
                <SelectItem value="3">Tier 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="tier" tick={chartTheme.tick} />
              <YAxis tick={chartTheme.tick} unit="%" domain={churnRateDomain(cityData)} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} contentStyle={chartTheme.tooltip} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {cityData.map((_, i) => (
                  <Cell key={i} fill={chartCategoryColor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Churn by gender" padding="md">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_gender, "gender")}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="gender" tick={chartTheme.tick} />
              <YAxis tick={chartTheme.tick} unit="%" domain={churnRateDomain(toBarData(data.churn_by_gender, "gender"))} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} contentStyle={chartTheme.tooltip} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {toBarData(data.churn_by_gender, "gender").map((_, i) => (
                  <Cell key={i} fill={chartCategoryColor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Churn by payment mode" padding="md">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_payment_mode, "mode")} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis type="number" tick={chartTheme.tick} unit="%" domain={churnRateDomain(toBarData(data.churn_by_payment_mode, "mode"))} />
              <YAxis type="category" dataKey="mode" tick={{ fontSize: 9, fill: chartTheme.tick.fill }} width={88} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} contentStyle={chartTheme.tooltip} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {toBarData(data.churn_by_payment_mode, "mode").map((_, i) => (
                  <Cell key={i} fill={chartCategoryColor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Churn by login device" padding="md">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_device, "device")} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis type="number" tick={chartTheme.tick} unit="%" domain={churnRateDomain(toBarData(data.churn_by_device, "device"))} />
              <YAxis type="category" dataKey="device" tick={{ fontSize: 9, fill: chartTheme.tick.fill }} width={88} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} contentStyle={chartTheme.tooltip} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {toBarData(data.churn_by_device, "device").map((_, i) => (
                  <Cell key={i} fill={chartCategoryColor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <ChartPanel title="Churn by tenure band" subtitle="Months on platform">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tenureBandData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="band" tick={{ fontSize: 9, fill: chartTheme.tick.fill }} />
              <YAxis tick={chartTheme.tick} unit="%" domain={churnRateDomain(tenureBandData)} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} contentStyle={chartTheme.tooltip} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {tenureBandData.map((entry, i) => (
                  <Cell
                    key={entry.rawKey}
                    fill={chartChurnRateColor(entry.rate, tenureBandRates)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Churn by order category">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={toBarData(data.churn_by_category, "category")} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis type="number" tick={chartTheme.tick} unit="%" domain={churnRateDomain(toBarData(data.churn_by_category, "category"))} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 9, fill: chartTheme.tick.fill }} width={100} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} contentStyle={chartTheme.tooltip} />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]}>
                {toBarData(data.churn_by_category, "category").map((_, i) => (
                  <Cell key={i} fill={chartCategoryColor(i)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      {trends && (
        <ChartPanel
          title="Churn hazard by customer tenure"
          subtitle={`Peak hazard month ${trends.peak_churn_month.month} (${trends.peak_churn_month.churn_rate}%) · Stabilises after month ${trends.stabilizes_after_month}`}
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends.monthly_trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="month" tick={chartTheme.tick} label={{ value: "Tenure (months)", position: "insideBottom", offset: -2, fontSize: 10, fill: chartTheme.tick.fill }} />
              <YAxis tick={chartTheme.tick} unit="%" domain={[0, "auto"]} />
              <Tooltip
                formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                labelFormatter={(l: number) => `Month ${l}`}
                contentStyle={chartTheme.tooltip}
              />
              <Legend verticalAlign="top" height={28} iconType="line" wrapperStyle={{ fontSize: 11 }} />
              <ReferenceArea
                x1={trends.stabilizes_after_month}
                x2={60}
                fill={CHART.stayed}
                fillOpacity={0.12}
              />
              <ReferenceLine x={trends.peak_churn_month.month} stroke={CHART.peakLine} strokeWidth={2} strokeDasharray="4 3" />
              <Line type="monotone" dataKey="churn_rate" name="Raw churn %" stroke={chartTheme.rawLine} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
              <Line type="monotone" dataKey="rolling_rate" name={`${trends.rolling_window}-mo rolling`} stroke={CHART.rollingLine} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: CHART.stayed }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      )}

      {featureChartData.length > 0 && (
        <ChartPanel title="Top 10 feature importances" subtitle="XGBoost gain on the current dataset">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={featureChartData} layout="vertical" margin={{ left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis type="number" tick={chartTheme.tick} unit="%" domain={[0, featureDomainMax]} />
              <YAxis type="category" dataKey="displayName" tick={{ fontSize: 10, fill: chartTheme.tick.fill }} width={130} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Importance"]} contentStyle={chartTheme.tooltip} />
              <Bar dataKey="importance_pct" name="Importance %" radius={[4, 4, 4, 4]}>
                {featureChartData.map((_, i) => (
                  <Cell key={i} fill={CHART.importance[i % CHART.importance.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartPanel title="Engagement KPIs — churned vs stayed" subtitle="Mean per group">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={engagementKpis} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="metric" tick={{ fontSize: 9, fill: chartTheme.tick.fill }} />
              <YAxis tick={chartTheme.tick} />
              <Tooltip contentStyle={chartTheme.tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="churned" name="Churned" fill={CHURN_COLOR} radius={[3, 3, 0, 0]} />
              <Bar dataKey="stayed" name="Stayed" fill={STAY_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Financial KPIs — churned vs stayed" subtitle="Mean per group">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={financialKpis} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
              <XAxis dataKey="metric" tick={{ fontSize: 9, fill: chartTheme.tick.fill }} />
              <YAxis tick={chartTheme.tick} />
              <Tooltip contentStyle={chartTheme.tooltip} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="churned" name="Churned" fill={CHURN_COLOR} radius={[3, 3, 0, 0]} />
              <Bar dataKey="stayed" name="Stayed" fill={STAY_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <ChartPanel title="Key behavioural deltas">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiInsight label="Total spend" pair={data.kpi_comparison.avg_total_spend} unit="₹" churnedHigherIsRisk={false} />
          <KpiInsight label="Return rate" pair={data.kpi_comparison.avg_return_rate} unit="%" churnedHigherIsRisk />
          <KpiInsight label="Support tickets" pair={data.kpi_comparison.avg_support_tickets} unit="" churnedHigherIsRisk />
          <KpiInsight label="Satisfaction proxy" pair={data.kpi_comparison.avg_app_hours} unit="h" churnedHigherIsRisk={false} />
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Complaint rate: {data.kpi_comparison.avg_complain_rate.churned}% of churned vs{" "}
          {data.kpi_comparison.avg_complain_rate.stayed}% of stayed filed at least one complaint.
        </p>
      </ChartPanel>
    </div>
  );
}
