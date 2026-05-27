import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { KpiCard } from "@/components/KpiCard";
import { ChartPanel, PageHero, PillTag } from "@/components/supabaze";
import { Users, UserMinus, AlertTriangle, IndianRupee } from "lucide-react";
import { fetchAnalytics, fetchAnalyticsTrends, type AnalyticsData, type TrendsData } from "@/lib/api";
import { btnOutline, btnPrimary } from "@/lib/supabaze";
import {
  CHART,
  RISK,
  chartChurnRateColor,
  useChartTheme,
} from "@/lib/chart-colors";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  BarChart, Bar,
} from "recharts";

const Index = () => {
  const chartTheme = useChartTheme();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trends, setTrends] = useState<TrendsData | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnalytics(ctrl.signal).then(setAnalytics).catch(() => {});
    fetchAnalyticsTrends(ctrl.signal).then(setTrends).catch(() => {});
    return () => ctrl.abort();
  }, []);

  const totalCustomers = analytics ? analytics.total_customers.toLocaleString() : "—";
  const totalChurned   = analytics ? analytics.churned_customers.toLocaleString() : "—";
  const churnRate      = analytics ? `${analytics.overall_churn_rate}%` : undefined;
  const highRisk = analytics ? analytics.churned_customers.toLocaleString() : "—";
  const revenueAtRisk = analytics
    ? `₹${(analytics.churned_customers * 850 * 8 / 100_000).toFixed(1)}L`
    : "—";

  const liveChurnTrend = trends
    ? trends.monthly_trend
        .filter((pt) => pt.month % 5 === 0)
        .map((pt) => ({ month: `Mo ${pt.month}`, rate: parseFloat(pt.rolling_rate.toFixed(1)) }))
    : [];

  const retained = analytics ? analytics.total_customers - analytics.churned_customers : 0;
  const liveRiskDist = [
    { name: "Low Risk",    value: analytics ? Math.round(retained * 0.75) : 0, color: RISK.low },
    { name: "Medium Risk", value: analytics ? Math.round(retained * 0.25) : 0, color: RISK.medium },
    { name: "High Risk",   value: analytics ? analytics.churned_customers : 0,  color: RISK.high },
  ];

  const satisfactionData = analytics
    ? Object.entries(analytics.churn_by_satisfaction)
        .map(([score, rate]) => ({ score: `Score ${score}`, rate: parseFloat(rate.toFixed(1)) }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5)
    : [];

  const satisfactionRates = useMemo(
    () => satisfactionData.map(d => d.rate),
    [satisfactionData],
  );

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-md border px-3 py-2 text-xs shadow-sm"
          style={{
            backgroundColor: chartTheme.tooltip.backgroundColor,
            borderColor: chartTheme.tooltip.border?.toString().replace("1px solid ", "") ?? undefined,
            color: chartTheme.tooltip.color,
          }}
        >
          <p className="font-medium">{label}</p>
          <p className="mt-0.5 font-medium" style={{ color: CHART.rollingLine }}>{payload[0].value}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 pb-10">
      <PageHero
        title="Churn intelligence at a glance"
        lead="Good morning, Admin. Here's your business health snapshot for today."
        badge="Live dashboard"
      >
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/predict" className={btnPrimary}>Start prediction</Link>
          <Link to="/analytics" className={btnOutline}>View analytics</Link>
        </div>
      </PageHero>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Customers"     value={totalCustomers}  change={churnRate} changeType="down" icon={Users} variant="success" />
        <KpiCard title="Total Churned"       value={totalChurned}    icon={UserMinus} variant="danger" />
        <KpiCard title="High Risk Right Now" value={highRisk}        icon={AlertTriangle} variant="warning" />
        <KpiCard title="Revenue At Risk"     value={revenueAtRisk}   icon={IndianRupee} variant="danger" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <ChartPanel
          className="lg:col-span-3"
          title="Churn rate trend"
          subtitle="Rolling churn rate across customer tenure"
          action={<PillTag variant="green">Live</PillTag>}
        >
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={liveChurnTrend}>
              <defs>
                <linearGradient id="indexChurnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART.stayed} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART.stayed} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="month" tick={chartTheme.tick} axisLine={false} tickLine={false} />
              <YAxis tick={chartTheme.tick} unit="%" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="rate"
                stroke={CHART.rollingLine}
                strokeWidth={2.5}
                fill="url(#indexChurnGrad)"
                dot={{ r: 3, fill: CHART.stayedDeep, strokeWidth: 0 }}
                activeDot={{ r: 5, fill: CHART.stayed, stroke: chartTheme.activeDotStroke, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel
          className="lg:col-span-2"
          title="Risk distribution"
          subtitle="Low · medium · high risk segments"
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={liveRiskDist}
                cx="50%"
                cy="45%"
                innerRadius={65}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={2}
                stroke={chartTheme.activeDotStroke}
              >
                {liveRiskDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="ml-1 text-xs text-muted-foreground">{value}</span>
                )}
              />
              <Tooltip 
                contentStyle={chartTheme.tooltip} 
                itemStyle={{ color: chartTheme.tooltip.color }} 
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            {liveRiskDist.map((seg) => (
              <span key={seg.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
                {seg.name}
              </span>
            ))}
          </div>
        </ChartPanel>
      </div>

      <ChartPanel
        title="Top churn drivers"
        subtitle="Satisfaction scores with highest churn · greener = lower churn"
      >
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={satisfactionData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
            <XAxis type="number" tick={chartTheme.tick} unit="%" domain={[0, 60]} />
            <YAxis type="category" dataKey="score" tick={chartTheme.tick} width={80} />
            <Tooltip 
              formatter={(v: number) => [`${v}%`, "Churn rate"]} 
              contentStyle={chartTheme.tooltip} 
              itemStyle={{ color: chartTheme.tooltip.color }} 
              labelStyle={{ color: chartTheme.tooltip.color }} 
            />
            <Bar dataKey="rate" name="Churn %" radius={[4, 4, 4, 4]}>
              {satisfactionData.map((entry, i) => (
                <Cell key={i} fill={chartChurnRateColor(entry.rate, satisfactionRates)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
};

export default Index;
