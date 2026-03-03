import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchAnalytics, type AnalyticsData } from "@/lib/api";

// Feature correlations are pre-calculated from training data — no backend endpoint
const corrData = [
  { feature: "DaysSinceOrder", churn: 0.82, satisfaction: -0.65, tenure: -0.42, cashback: -0.31 },
  { feature: "Satisfaction",   churn: -0.71, satisfaction: 1,    tenure: 0.35,  cashback: 0.28 },
  { feature: "Tenure",         churn: -0.45, satisfaction: 0.35, tenure: 1,     cashback: 0.52 },
  { feature: "Cashback",       churn: -0.33, satisfaction: 0.28, tenure: 0.52,  cashback: 1 },
];

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

export default function Analytics() {
  const [cityFilter, setCityFilter] = useState("all");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnalytics(ctrl.signal)
      .then(setData)
      .catch(e => { if (e?.name !== "AbortError") setError("Failed to load analytics data."); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  // Transform API response → chart-friendly arrays
  const rawCityData = data
    ? Object.entries(data.churn_by_city_tier)
        .map(([k, v]) => ({ tier: `Tier ${k}`, rate: v, _key: k }))
        .sort((a, b) => a._key.localeCompare(b._key))
    : [];

  const cityData = cityFilter === "all"
    ? rawCityData
    : rawCityData.filter(d => d._key === cityFilter);

  const satData = data
    ? Object.entries(data.churn_by_satisfaction)
        .map(([k, v]) => ({ score: k, rate: v }))
        .sort((a, b) => Number(a.score) - Number(b.score))
    : [];

  const genderData = data
    ? Object.entries(data.churn_by_gender).map(([k, v]) => ({ gender: k, rate: v }))
    : [];

  const avgDaysData = data
    ? [
        { label: "Churned", days: data.avg_days_since_last_order.churned },
        { label: "Stayed",  days: data.avg_days_since_last_order.stayed },
      ]
    : [];

  const tenureData = data
    ? Object.entries(data.churn_by_tenure).map(([range, rate]) => ({ range, rate }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm animate-pulse">Loading analytics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deep analysis of your customer base
            {data && (
              <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded font-medium">
                {data.total_customers.toLocaleString()} customers · {data.overall_churn_rate}% overall churn
              </span>
            )}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* City Tier */}
        <div className="bg-card rounded-lg p-5 card-shadow">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">Churn Rate by City Tier</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="tier" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn Rate"]} />
              <Bar dataKey="rate" fill="hsl(209,53%,23%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Satisfaction */}
        <div className="bg-card rounded-lg p-5 card-shadow">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">Churn Rate by Satisfaction Score</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={satData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="score" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn Rate"]} />
              <Bar dataKey="rate" fill="hsl(38,92%,50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gender */}
        <div className="bg-card rounded-lg p-5 card-shadow">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">Churn Rate by Gender</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={genderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="gender" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn Rate"]} />
              <Bar dataKey="rate" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Avg Days Since Last Order: Churned vs Stayed */}
        <div className="bg-card rounded-lg p-5 card-shadow">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">Avg Days Since Last Order</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={avgDaysData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit=" d" />
              <Tooltip formatter={(v: number) => [`${v} days`]} />
              <Bar dataKey="days" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} name="Avg Days" />
            </BarChart>
          </ResponsiveContainer>
          {data && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Churned customers wait {(data.avg_days_since_last_order.churned - data.avg_days_since_last_order.stayed).toFixed(1)} more days on average
            </p>
          )}
        </div>

        {/* Churn Rate by Tenure Band */}
        <div className="bg-card rounded-lg p-5 card-shadow">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">Churn Rate by Tenure (months)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tenureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn Rate"]} />
              <Bar dataKey="rate" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Feature Correlation Heatmap (pre-calculated — no backend endpoint) */}
        <div className="bg-card rounded-lg p-5 card-shadow">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">Feature Correlation</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-muted-foreground"></th>
                  <th className="p-2 text-center text-muted-foreground">Churn</th>
                  <th className="p-2 text-center text-muted-foreground">Satis.</th>
                  <th className="p-2 text-center text-muted-foreground">Tenure</th>
                  <th className="p-2 text-center text-muted-foreground">Cash.</th>
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
            <p className="text-xs text-muted-foreground mt-2 text-center italic">Pre-calculated from training data</p>
          </div>
        </div>
      </div>
    </div>
  );
}

