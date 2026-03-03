import { useState } from "react";
import { RiskBadge } from "@/components/RiskBadge";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const segments = [
  { name: "Champions", icon: "👑", count: 2340, color: "hsl(209,53%,23%)", strategy: "Reward & upsell" },
  { name: "Loyal", icon: "⭐", count: 3120, color: "hsl(160,84%,39%)", strategy: "Engage & nurture" },
  { name: "At Risk", icon: "⚠️", count: 1890, color: "hsl(38,92%,50%)", strategy: "Retention campaign" },
  { name: "New", icon: "🌱", count: 980, color: "hsl(270,60%,55%)", strategy: "Onboard & educate" },
  { name: "Lost", icon: "😴", count: 620, color: "hsl(0,72%,51%)", strategy: "Win-back offer" },
];

const scatterData: Record<string, Array<{ recency: number; frequency: number; monetary: number }>> = {
  Champions: Array.from({ length: 30 }, () => ({ recency: Math.random() * 10 + 1, frequency: Math.random() * 20 + 15, monetary: Math.random() * 5000 + 3000 })),
  Loyal: Array.from({ length: 30 }, () => ({ recency: Math.random() * 20 + 5, frequency: Math.random() * 15 + 8, monetary: Math.random() * 3000 + 1500 })),
  "At Risk": Array.from({ length: 25 }, () => ({ recency: Math.random() * 30 + 20, frequency: Math.random() * 10 + 3, monetary: Math.random() * 2000 + 500 })),
  New: Array.from({ length: 15 }, () => ({ recency: Math.random() * 15 + 1, frequency: Math.random() * 5 + 1, monetary: Math.random() * 1500 + 200 })),
  Lost: Array.from({ length: 10 }, () => ({ recency: Math.random() * 20 + 40, frequency: Math.random() * 3 + 1, monetary: Math.random() * 800 + 100 })),
};

const sampleCustomers = [
  { id: "#1042", name: "Rahul Sharma", recency: 47, frequency: 3, monetary: 920, level: "high" as const },
  { id: "#2091", name: "Priya Patel", recency: 52, frequency: 2, monetary: 650, level: "high" as const },
  { id: "#3344", name: "Amit Kumar", recency: 12, frequency: 18, monetary: 3400, level: "low" as const },
  { id: "#4521", name: "Sneha Gupta", recency: 5, frequency: 22, monetary: 4100, level: "low" as const },
  { id: "#5678", name: "Vikram Singh", recency: 30, frequency: 6, monetary: 1200, level: "medium" as const },
];

export default function CustomerSegments() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Segments (RFM)</h1>
        <p className="text-sm text-muted-foreground mt-1">Behavioral segmentation of your customer base</p>
      </div>

      {/* Segment Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {segments.map(s => (
          <div
            key={s.name}
            onClick={() => setSelected(selected === s.name ? null : s.name)}
            className={`bg-card rounded-lg p-4 card-shadow cursor-pointer transition-all text-center hover:card-shadow-hover ${
              selected === s.name ? "ring-2 ring-primary" : ""
            }`}
          >
            <span className="text-2xl">{s.icon}</span>
            <p className="text-sm font-semibold text-card-foreground mt-2">{s.name}</p>
            <p className="text-xl font-bold text-card-foreground">{s.count.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">customers</p>
          </div>
        ))}
      </div>

      {/* Scatter Plot */}
      <div className="bg-card rounded-lg p-5 card-shadow">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Recency vs Frequency (bubble = monetary)</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis dataKey="recency" name="Recency (days)" tick={{ fontSize: 11 }} label={{ value: "Recency (days)", position: "bottom", fontSize: 11 }} />
            <YAxis dataKey="frequency" name="Frequency" tick={{ fontSize: 11 }} label={{ value: "Frequency", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <ZAxis dataKey="monetary" range={[30, 300]} name="Monetary" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Legend />
            {segments.map(s => (
              <Scatter key={s.name} name={s.name} data={scatterData[s.name]} fill={s.color} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Customer Table */}
      {selected && (
        <div className="bg-card rounded-lg card-shadow overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="text-sm font-semibold text-card-foreground">{selected} — Customer Details</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Strategy: {segments.find(s => s.name === selected)?.strategy}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  {["ID", "Name", "Recency", "Frequency", "Monetary", "Risk"].map(h => (
                    <th key={h} className="text-left p-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleCustomers.map(c => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium text-card-foreground">{c.id}</td>
                    <td className="p-3 text-card-foreground">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.recency} days</td>
                    <td className="p-3 text-muted-foreground">{c.frequency}</td>
                    <td className="p-3 text-card-foreground">₹{c.monetary}</td>
                    <td className="p-3"><RiskBadge level={c.level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
