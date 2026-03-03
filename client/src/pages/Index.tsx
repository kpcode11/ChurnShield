import { useEffect, useState } from "react";
import { KpiCard } from "@/components/KpiCard";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Users, UserMinus, AlertTriangle, IndianRupee } from "lucide-react";
import { fetchAnalytics, type AnalyticsData } from "@/lib/api";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";

const churnTrend = [
  { month: "Jan", rate: 12.1 }, { month: "Feb", rate: 11.5 }, { month: "Mar", rate: 13.2 },
  { month: "Apr", rate: 14.0 }, { month: "May", rate: 12.8 }, { month: "Jun", rate: 11.9 },
  { month: "Jul", rate: 13.5 }, { month: "Aug", rate: 15.1 }, { month: "Sep", rate: 14.3 },
  { month: "Oct", rate: 13.7 }, { month: "Nov", rate: 12.4 }, { month: "Dec", rate: 11.8 },
];

const riskDist = [
  { name: "Low Risk", value: 54200, color: "hsl(160, 84%, 39%)" },
  { name: "Medium Risk", value: 29930, color: "hsl(38, 92%, 50%)" },
  { name: "High Risk", value: 18210, color: "hsl(0, 72%, 51%)" },
];

const topCustomers = [
  { id: "#1042", tenure: 14, daysSince: 47, risk: 0.78, level: "high" as const, action: "Priority call + ₹150 coupon" },
  { id: "#2091", tenure: 8, daysSince: 52, risk: 0.85, level: "high" as const, action: "Immediate outreach + free delivery" },
  { id: "#3344", tenure: 22, daysSince: 38, risk: 0.72, level: "high" as const, action: "Loyalty reward + feedback survey" },
  { id: "#4521", tenure: 5, daysSince: 61, risk: 0.91, level: "high" as const, action: "Win-back campaign + ₹200 off" },
  { id: "#5678", tenure: 30, daysSince: 25, risk: 0.55, level: "medium" as const, action: "Engagement email series" },
  { id: "#6102", tenure: 11, daysSince: 33, risk: 0.63, level: "medium" as const, action: "Personalized recommendations" },
  { id: "#7890", tenure: 3, daysSince: 44, risk: 0.68, level: "medium" as const, action: "Onboarding follow-up call" },
  { id: "#8234", tenure: 18, daysSince: 29, risk: 0.58, level: "medium" as const, action: "Cross-sell opportunity" },
  { id: "#9001", tenure: 42, daysSince: 55, risk: 0.82, level: "high" as const, action: "VIP retention package" },
  { id: "#9512", tenure: 7, daysSince: 40, risk: 0.74, level: "high" as const, action: "Discount + priority support" },
];

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

  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnalytics(ctrl.signal)
      .then(setAnalytics)
      .catch(() => {/* dashboard degrades gracefully if API is unavailable */});
    return () => ctrl.abort();
  }, []);

  const totalCustomers = analytics
    ? analytics.total_customers.toLocaleString()
    : "—";
  const totalChurned = analytics
    ? analytics.churned_customers.toLocaleString()
    : "—";
  const churnRate = analytics
    ? `${analytics.overall_churn_rate}%`
    : undefined;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Good morning, Admin 👋</h1>
        <p className="text-sm text-muted-foreground mt-1">Here's your business health snapshot for today</p>
      </div>

      {/* KPI Cards — Total Customers and Churned are live from /analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard title="Total Customers"     value={totalCustomers}  change={churnRate} changeType="down" icon={Users} />
        <KpiCard title="Total Churned"       value={totalChurned}                                         icon={UserMinus} variant="danger" />
        <KpiCard title="High Risk Right Now" value="—"               icon={AlertTriangle} variant="warning" />
        <KpiCard title="Revenue At Risk"     value="—"               icon={IndianRupee}   variant="danger" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-card rounded-xl p-6 card-shadow">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">Churn Rate Trend</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Monthly churn rate over 12 months</p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-md font-medium">2025</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={churnTrend}>
              <defs>
                <linearGradient id="churnGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(209, 53%, 23%)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(209, 53%, 23%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 93%)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} unit="%" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="rate" stroke="hsl(209, 53%, 23%)" strokeWidth={2.5} fill="url(#churnGrad)" dot={{ r: 3, fill: "hsl(209, 53%, 23%)", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(0,0%,100%)" }} />
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
              <Pie data={riskDist} cx="50%" cy="45%" innerRadius={65} outerRadius={100} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {riskDist.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={8} formatter={(value: string) => <span className="text-xs text-muted-foreground ml-1">{value}</span>} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Table */}
      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">Priority Attention Required</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Top 10 customers needing immediate action</p>
          </div>
          <Button variant="outline" size="sm" className="text-xs">
            View All
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30">
                {["Customer ID", "Tenure", "Days Inactive", "Risk Score", "Status", "Suggested Action", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((c, i) => (
                <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3.5 font-semibold text-card-foreground">{c.id}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{c.tenure} mo</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{c.daysSince} days</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${c.risk > 0.7 ? "bg-destructive" : c.risk > 0.5 ? "bg-accent" : "bg-success"}`}
                          style={{ width: `${c.risk * 100}%` }}
                        />
                      </div>
                      <span className="font-semibold text-card-foreground text-xs">{(c.risk * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><RiskBadge level={c.level} /></td>
                  <td className="px-4 py-3.5 text-muted-foreground text-xs max-w-[200px] truncate">{c.action}</td>
                  <td className="px-4 py-3.5">
                    <Button variant="outline" size="sm" className="text-xs h-7 rounded-lg">
                      Action →
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Index;
