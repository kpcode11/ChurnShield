import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, ReferenceLine, ReferenceArea,
} from "recharts";
import {
  fetchAnalytics, fetchAnalyticsTrends,
  type AnalyticsData, type TrendsData,
} from "@/lib/api";

// ── Pre-calculated feature correlations (from training data) ──────────────────
const corrData = [
  { feature: "DaysSinceOrder", churn: 0.82,  satisfaction: -0.65, tenure: -0.42, cashback: -0.31 },
  { feature: "Satisfaction",   churn: -0.71, satisfaction:  1,    tenure:  0.35, cashback:  0.28 },
  { feature: "Tenure",         churn: -0.45, satisfaction:  0.35, tenure:  1,    cashback:  0.52 },
  { feature: "Cashback",       churn: -0.33, satisfaction:  0.28, tenure:  0.52, cashback:  1    },
];

// ── Small reusable components ─────────────────────────────────────────────────

function HeatCell({ val }: { val: number }) {
  const intensity = Math.abs(val);
  const bg = val > 0
    ? `rgba(220, 38, 38, ${intensity * 0.7})`
    : `rgba(5, 150, 105, ${intensity * 0.7})`;
  return (
    <td className="p-2 text-xs text-center font-medium" style={{ backgroundColor: bg, color: intensity > 0.4 ? "white" : "inherit" }}>
      {val.toFixed(2)}
    </td>
  );
}

function ChartCard({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-lg p-5 card-shadow ${className}`}>
      <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

/** Convert a Record<string, number> → [{key, rate}] sorted by string key (numeric-aware). */
function toBarData(rec: Record<string, number>, keyProp: string): Record<string, unknown>[] {
  return Object.entries(rec)
    .map(([k, v]) => ({ [keyProp]: k, rate: v }))
    .sort((a, b) => {
      const an = Number(a[keyProp]), bn = Number(b[keyProp]);
      if (!isNaN(an) && !isNaN(bn)) return an - bn;
      return String(a[keyProp]).localeCompare(String(b[keyProp]));
    });
}

const T = { fontSize: 11 };   // shared tick style

// ── Main component ────────────────────────────────────────────────────────────

export default function Analytics() {
  const [cityFilter, setCityFilter] = useState("all");
  const [data,       setData]       = useState<AnalyticsData | null>(null);
  const [trends,     setTrends]     = useState<TrendsData | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([
      fetchAnalytics(ctrl.signal),
      fetchAnalyticsTrends(ctrl.signal),
    ])
      .then(([a, t]) => { setData(a); setTrends(t); })
      .catch(e => { if (e?.name !== "AbortError") setError("Failed to load analytics. Is the backend running?"); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  // ── Derived chart data ────────────────────────────────────────────────────

  const rawCityData = data
    ? toBarData(data.churn_by_city_tier, "tier")
        .map(d => ({ ...d, tier: `Tier ${d.tier}` }))
    : [];

  const cityData = cityFilter === "all"
    ? rawCityData
    : rawCityData.filter(d => String(d.tier).includes(cityFilter));

  const kpiCompareData = data
    ? [
        { metric: "Cashback ₹",   churned: data.kpi_comparison.avg_cashback.churned,         stayed: data.kpi_comparison.avg_cashback.stayed },
        { metric: "Orders",       churned: data.kpi_comparison.avg_orders.churned,            stayed: data.kpi_comparison.avg_orders.stayed },
        { metric: "App Hrs",      churned: data.kpi_comparison.avg_app_hours.churned,         stayed: data.kpi_comparison.avg_app_hours.stayed },
        { metric: "Days Idle",    churned: data.kpi_comparison.avg_days_since_order.churned,  stayed: data.kpi_comparison.avg_days_since_order.stayed },
        { metric: "Coupons",      churned: data.kpi_comparison.avg_coupons_used.churned,      stayed: data.kpi_comparison.avg_coupons_used.stayed },
        { metric: "Complain %",   churned: data.kpi_comparison.avg_complain_rate.churned,     stayed: data.kpi_comparison.avg_complain_rate.stayed },
      ]
    : [];

  // ── Loading / error guards ────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live aggregations from {data.total_customers.toLocaleString()} customers&ensp;·&ensp;
            <span className="font-medium text-destructive">{data.overall_churn_rate}% overall churn</span>
            &ensp;·&ensp;{data.churned_customers.toLocaleString()} churned
          </p>
        </div>
        <div className="flex gap-2">
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
      </div>

      {/* ── Row 1: City · Satisfaction · Gender ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <ChartCard title="Churn Rate by City Tier">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="tier" tick={T} />
              <YAxis tick={T} unit="%" domain={[0, 50]} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" name="Churn %" fill="hsl(209,53%,23%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Churn Rate by Satisfaction Score">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_satisfaction, "score")}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="score" tick={T} />
              <YAxis tick={T} unit="%" domain={[0, 55]} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" name="Churn %" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground text-center mt-1 italic">1 = Very dissatisfied · 5 = Very satisfied</p>
        </ChartCard>

        <ChartCard title="Churn Rate by Gender">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_gender, "gender")}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="gender" tick={T} />
              <YAxis tick={T} unit="%" domain={[0, 35]} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" name="Churn %" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* ── Row 2: Device · Marital Status · Payment Mode ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <ChartCard title="Churn Rate by Login Device">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_device, "device")} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tick={T} unit="%" domain={[0, 40]} />
              <YAxis type="category" dataKey="device" tick={{ fontSize: 10 }} width={90} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" name="Churn %" fill="hsl(262,52%,47%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Churn Rate by Marital Status">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_marital_status, "status")}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="status" tick={T} />
              <YAxis tick={T} unit="%" domain={[0, 50]} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" name="Churn %" fill="hsl(186,85%,35%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Churn Rate by Payment Mode">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_payment_mode, "mode")} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tick={T} unit="%" domain={[0, 35]} />
              <YAxis type="category" dataKey="mode" tick={{ fontSize: 9 }} width={95} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" name="Churn %" fill="hsl(32,90%,48%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* ── Row 3: Monthly Lifecycle Trend (full-width) ── */}
      {trends && (
        <ChartCard title={`Monthly Churn Hazard by Customer Tenure  ·  Peak at Month ${trends.peak_churn_month.month} (${trends.peak_churn_month.churn_rate}%)  ·  Stabilises after Month ${trends.stabilizes_after_month}`}>
          <div className="flex gap-6 text-xs text-muted-foreground mb-2">
            <span>X-axis: months customer has been on the platform (Tenure 0–60)</span>
            <span>Smoothing: {trends.rolling_window}-month centred rolling average</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trends.monthly_trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="month" tick={T} label={{ value: "Tenure (months)", position: "insideBottom", offset: -2, fontSize: 10 }} />
              <YAxis tick={T} unit="%" domain={[0, 80]} />
              <Tooltip
                formatter={(v: number, name: string) => [`${v.toFixed(1)}%`, name]}
                labelFormatter={(l: number) => `Month ${l}`}
              />
              <Legend verticalAlign="top" height={28} iconType="line" wrapperStyle={{ fontSize: 11 }} />

              {/* Stable zone highlight */}
              <ReferenceArea
                x1={trends.stabilizes_after_month}
                x2={60}
                fill="hsl(160,60%,90%)"
                fillOpacity={0.4}
                label={{ value: "Stable zone", position: "insideTopRight", fontSize: 9, fill: "hsl(160,50%,35%)" }}
              />

              {/* Peak churn reference line */}
              <ReferenceLine
                x={trends.peak_churn_month.month}
                stroke="hsl(0,72%,51%)"
                strokeDasharray="4 3"
                label={{ value: `Peak ${trends.peak_churn_month.churn_rate}%`, position: "top", fontSize: 9, fill: "hsl(0,72%,51%)" }}
              />

              <Line
                type="monotone"
                dataKey="churn_rate"
                name="Churn Rate (raw)"
                stroke="hsl(209,53%,70%)"
                strokeWidth={1}
                dot={false}
                strokeDasharray="3 2"
              />
              <Line
                type="monotone"
                dataKey="rolling_rate"
                name={`${trends.rolling_window}-mo Rolling Avg`}
                stroke="hsl(209,53%,23%)"
                strokeWidth={2.5}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* ── Row 4: Tenure Bands · Category · Avg Days ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <ChartCard title="Churn Rate by Tenure Band (months)">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_tenure, "range")}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="range" tick={{ fontSize: 9 }} />
              <YAxis tick={T} unit="%" domain={[0, 55]} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" name="Churn %" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Churn Rate by Order Category">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={toBarData(data.churn_by_category, "cat")} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" tick={T} unit="%" domain={[0, 40]} />
              <YAxis type="category" dataKey="cat" tick={{ fontSize: 8 }} width={105} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn"]} />
              <Bar dataKey="rate" name="Churn %" fill="hsl(209,53%,40%)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Feature Correlation (pre-calculated)">
          <div className="overflow-x-auto">
            <table className="w-full text-xs mt-1">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground text-xs font-normal"></th>
                  {["Churn", "Satis.", "Tenure", "Cash."].map(h => (
                    <th key={h} className="p-2 text-center text-muted-foreground text-xs font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {corrData.map(row => (
                  <tr key={row.feature}>
                    <td className="p-2 text-xs font-medium text-muted-foreground">{row.feature}</td>
                    <HeatCell val={row.churn} />
                    <HeatCell val={row.satisfaction} />
                    <HeatCell val={row.tenure} />
                    <HeatCell val={row.cashback} />
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2 text-center italic">Pearson r · from XGBoost training set</p>
          </div>
        </ChartCard>

      </div>

      {/* ── Row 5: KPI Comparison — Churned vs Stayed (full-width grouped bar) ── */}
      <ChartCard title="Behavioural KPIs — Churned vs Stayed">
        <p className="text-xs text-muted-foreground mb-3">
          Mean values per group. Divergences reveal the strongest behavioural signals driving churn.
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={kpiCompareData} barCategoryGap="25%" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="metric" tick={T} />
            <YAxis tick={T} />
            <Tooltip />
            <Legend verticalAlign="top" height={24} iconType="square" wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="churned" name="Churned" fill="hsl(0,72%,51%)"   radius={[3, 3, 0, 0]} />
            <Bar dataKey="stayed"  name="Stayed"  fill="hsl(160,84%,39%)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {/* Summary insight strip */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Avg Cashback",   c: data.kpi_comparison.avg_cashback,         unit: "₹",  lowerIsBad: false },
            { label: "Avg Orders",     c: data.kpi_comparison.avg_orders,            unit: "",   lowerIsBad: true  },
            { label: "Complaint Rate", c: data.kpi_comparison.avg_complain_rate,     unit: "%",  lowerIsBad: true  },
            { label: "Days Idle",      c: data.kpi_comparison.avg_days_since_order,  unit: " d", lowerIsBad: false },
          ].map(({ label, c, unit, lowerIsBad }) => {
            const diff   = c.churned - c.stayed;
            const bad    = lowerIsBad ? diff < 0 : diff > 0;
            return (
              <div key={label} className="bg-muted/40 rounded-md px-3 py-2 text-center">
                <p className="text-xs text-muted-foreground mb-1">{label}</p>
                <p className="text-sm font-semibold">
                  <span className="text-destructive">{c.churned}{unit}</span>
                  <span className="text-muted-foreground text-xs mx-1">vs</span>
                  <span className="text-green-600">{c.stayed}{unit}</span>
                </p>
                <p className={`text-xs mt-0.5 font-medium ${bad ? "text-destructive" : "text-green-600"}`}>
                  {diff > 0 ? "+" : ""}{diff.toFixed(1)}{unit} for churned
                </p>
              </div>
            );
          })}
        </div>
      </ChartCard>

    </div>
  );
}
