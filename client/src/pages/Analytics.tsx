import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from "recharts";

const cityData = [
  { tier: "Tier 1", rate: 12.4 }, { tier: "Tier 2", rate: 18.7 }, { tier: "Tier 3", rate: 22.1 },
];
const satData = [
  { score: "1", rate: 38 }, { score: "2", rate: 27 }, { score: "3", rate: 15 }, { score: "4", rate: 8 }, { score: "5", rate: 4 },
];
const genderData = [
  { gender: "Male", rate: 16.2 }, { gender: "Female", rate: 14.8 },
];
const engagementData = [
  { month: "Jan", churned: 42, stayed: 12 }, { month: "Feb", churned: 45, stayed: 11 },
  { month: "Mar", churned: 38, stayed: 14 }, { month: "Apr", churned: 50, stayed: 10 },
  { month: "May", churned: 44, stayed: 13 }, { month: "Jun", churned: 47, stayed: 9 },
];
const tenureData = [
  { range: "0-6", count: 820 }, { range: "6-12", count: 640 }, { range: "12-24", count: 510 },
  { range: "24-36", count: 280 }, { range: "36-48", count: 150 }, { range: "48+", count: 90 },
];
const corrData = [
  { feature: "DaysSinceOrder", churn: 0.82, satisfaction: -0.65, tenure: -0.42, cashback: -0.31 },
  { feature: "Satisfaction", churn: -0.71, satisfaction: 1, tenure: 0.35, cashback: 0.28 },
  { feature: "Tenure", churn: -0.45, satisfaction: 0.35, tenure: 1, cashback: 0.52 },
  { feature: "Cashback", churn: -0.33, satisfaction: 0.28, tenure: 0.52, cashback: 1 },
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Deep analysis of your customer base</p>
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
              <Tooltip />
              <Bar dataKey="rate" fill="hsl(209,53%,23%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Satisfaction */}
        <div className="bg-card rounded-lg p-5 card-shadow">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">Churn Rate by Satisfaction</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={satData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="score" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
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
              <Tooltip />
              <Bar dataKey="rate" fill="hsl(160,84%,39%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Engagement */}
        <div className="bg-card rounded-lg p-5 card-shadow">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">Avg Days Since Order</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="churned" stroke="hsl(0,72%,51%)" strokeWidth={2} name="Churned" />
              <Line type="monotone" dataKey="stayed" stroke="hsl(160,84%,39%)" strokeWidth={2} name="Stayed" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tenure Distribution */}
        <div className="bg-card rounded-lg p-5 card-shadow">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3">Tenure Distribution (Churned)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={tenureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Correlation Heatmap */}
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
          </div>
        </div>
      </div>
    </div>
  );
}
