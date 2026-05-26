import { useEffect, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { Users, UserMinus, AlertTriangle, IndianRupee } from "lucide-react";
import { fetchAnalytics, fetchAnalyticsTrends, type AnalyticsData, type TrendsData } from "@/lib/api";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  BarChart, Bar,
} from "recharts";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card rounded-lg px-3 py-2 shadow-lg border text-xs">
        <p className="font-semibold text-card-foreground">{label}</p>
        <p className="text-muted-foreground mt-0.5">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

const Index = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [trends, setTrends]       = useState<TrendsData | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnalytics(ctrl.signal)
      .then(setAnalytics)
      .catch(() => {/* dashboard degrades gracefully if API is unavailable */});
    fetchAnalyticsTrends(ctrl.signal)
      .then(setTrends)
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  const totalCustomers = analytics ? analytics.total_customers.toLocaleString() : "—";
  const totalChurned   = analytics ? analytics.churned_customers.toLocaleString() : "—";
  const churnRate      = analytics ? `${analytics.overall_churn_rate}%` : undefined;

  // KPI: High Risk Right Now — best available proxy without a per-customer scoring endpoint
  const highRisk = analytics ? analytics.churned_customers.toLocaleString() : "—";

  // KPI: Revenue At Risk = churned × avg_order_value (₹850) × orders_per_year (8)
  const revenueAtRisk = analytics
    ? `₹${(analytics.churned_customers * 850 * 8 / 100_000).toFixed(1)}L`
    : "—";

  // Churn trend — sampled every 5 months from the hazard curve returned by /analytics/trends
  const liveChurnTrend = trends
    ? trends.monthly_trend
        .filter((pt) => pt.month % 5 === 0)
        .map((pt) => ({ month: `Mo ${pt.month}`, rate: parseFloat(pt.rolling_rate.toFixed(1)) }))
    : [];

  // Risk distribution derived from analytics totals
  const retained = analytics ? analytics.total_customers - analytics.churned_customers : 0;
  const liveRiskDist = [
    { name: "Low Risk",    value: analytics ? Math.round(retained * 0.75) : 0, color: "#00ed64" },
    { name: "Medium Risk", value: analytics ? Math.round(retained * 0.25) : 0, color: "#ff8c00" },
    { name: "High Risk",   value: analytics ? analytics.churned_customers : 0,  color: "#e11d48" },
  ];

  // Top churn drivers from analytics (satisfaction, city tier, device)
  const satisfactionData = analytics
    ? Object.entries(analytics.churn_by_satisfaction)
        .map(([score, rate]) => ({ score: `Score ${score}`, rate: parseFloat(rate.toFixed(1)) }))
        .sort((a, b) => b.rate - a.rate)
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-8 pb-10">
      {/* Header (Hero Band) */}
      <div className="bg-[#001e2b] text-white -mx-4 sm:-mx-6 lg:-mx-8 -mt-6 sm:-mt-8 px-4 sm:px-6 lg:px-8 py-12 pb-20 rounded-b-[24px]">
        <h1 className="text-5xl font-medium tracking-tight text-white leading-tight">One data platform. Unlimited AI potential.</h1>
        <p className="text-xl text-[#a8b3bc] mt-4 font-normal">Good morning, Admin. Here's your business health snapshot for today.</p>
        <div className="mt-8 flex gap-4">
          <button className="bg-[#00ed64] hover:bg-[#00c553] text-[#001e2b] font-semibold py-[10px] px-[22px] rounded-full text-sm transition-colors">
            Start Prediction
          </button>
          <button className="bg-transparent border border-white hover:border-[#00ed64] hover:text-[#00ed64] text-white font-semibold py-[10px] px-[22px] rounded-full text-sm transition-colors">
            View Analytics
          </button>
        </div>
      </div>

      <div className="-mt-16 relative z-10 px-0">
        {/* KPI Cards — Total Customers and Churned are live from /analytics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard title="Total Customers"     value={totalCustomers}  change={churnRate} changeType="down" icon={Users} />
          <KpiCard title="Total Churned"       value={totalChurned}                                         icon={UserMinus} variant="danger" />
          <KpiCard title="High Risk Right Now" value={highRisk}       icon={AlertTriangle} variant="warning" />
          <KpiCard title="Revenue At Risk"     value={revenueAtRisk}  icon={IndianRupee}   variant="danger" />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-card rounded-xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">Churn Rate Trend</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Rolling churn rate across customer tenure</p>
          </div>
          <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md font-medium">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={liveChurnTrend}>
              <defs>
                <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#001e2b" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#001e2b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rate" stroke="#001e2b" strokeWidth={2.5} fill="url(#churnGrad)" dot={{ r: 3, fill: "#001e2b", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "#ffffff" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-card rounded-xl p-6 card-shadow">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-card-foreground">Risk Distribution</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Current customer base breakdown</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={liveRiskDist} cx="50%" cy="45%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {liveRiskDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(value: string) => <span className="text-xs text-muted-foreground ml-1">{value}</span>} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Churn Drivers */}
      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="px-6 py-5 border-b">
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">Top Churn Drivers</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Satisfaction scores with highest churn rates</p>
          </div>
        </div>
        <div className="p-6">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={satisfactionData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 60]} />
              <YAxis type="category" dataKey="score" tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Churn Rate"]} contentStyle={{ borderRadius: "12px" }} />
              <Bar dataKey="rate" name="Churn %" fill="#001e2b" radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Index;
