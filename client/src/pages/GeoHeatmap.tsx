import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const stateData = [
  { state: "Maharashtra", customers: 18430, churned: 3204, rate: 17.4, reason: "Low satisfaction score" },
  { state: "Delhi", customers: 14200, churned: 2272, rate: 16.0, reason: "High complaint rate" },
  { state: "Karnataka", customers: 12800, churned: 1920, rate: 15.0, reason: "Long order gap" },
  { state: "Tamil Nadu", customers: 11500, churned: 1610, rate: 14.0, reason: "Low cashback engagement" },
  { state: "Gujarat", customers: 9200, churned: 1472, rate: 16.0, reason: "Tier-3 city issues" },
  { state: "Rajasthan", customers: 7800, churned: 1560, rate: 20.0, reason: "Delivery delays" },
  { state: "West Bengal", customers: 8100, churned: 1458, rate: 18.0, reason: "Payment issues" },
  { state: "Uttar Pradesh", customers: 13500, churned: 2700, rate: 20.0, reason: "Service quality" },
  { state: "Telangana", customers: 6700, churned: 871, rate: 13.0, reason: "Competition" },
  { state: "Kerala", customers: 5400, churned: 594, rate: 11.0, reason: "N/A" },
];

const cityData = stateData.map(s => ({ name: s.state, rate: s.rate }));

export default function GeoHeatmap() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Geo Churn Heatmap</h1>
        <p className="text-sm text-muted-foreground mt-1">Geographic distribution of churn across India</p>
      </div>

      {/* Map Visualization as Bar Chart */}
      <div className="bg-card rounded-lg p-5 card-shadow">
        <h3 className="text-sm font-semibold text-card-foreground mb-4">Churn Rate by State</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={cityData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
            <Tooltip />
            <Bar dataKey="rate" fill="hsl(0,72%,51%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Ranked Table */}
      <div className="bg-card rounded-lg card-shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold text-card-foreground">Top 10 Highest-Churn States</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                {["Rank", "State", "Total Customers", "Churned", "Churn Rate", "Top Reason"].map(h => (
                  <th key={h} className="text-left p-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...stateData].sort((a, b) => b.rate - a.rate).map((s, i) => (
                <tr key={s.state} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3 font-medium text-card-foreground">{i + 1}</td>
                  <td className="p-3 font-medium text-card-foreground">{s.state}</td>
                  <td className="p-3 text-muted-foreground">{s.customers.toLocaleString()}</td>
                  <td className="p-3 text-destructive font-medium">{s.churned.toLocaleString()}</td>
                  <td className="p-3 font-semibold text-card-foreground">{s.rate}%</td>
                  <td className="p-3 text-muted-foreground">{s.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
