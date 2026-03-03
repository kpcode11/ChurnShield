import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function RevenueImpact() {
  const [atRisk, setAtRisk] = useState([8210]);
  const [aov, setAov] = useState([850]);
  const [coupon, setCoupon] = useState([100]);
  const [retention, setRetention] = useState([55]);
  const [ordersYear, setOrdersYear] = useState([8]);

  const revenueAtRisk = atRisk[0] * aov[0];
  const campaignCost = atRisk[0] * coupon[0];
  const retained = Math.round(atRisk[0] * retention[0] / 100);
  const revenueSaved = retained * aov[0] * ordersYear[0];
  const netROI = revenueSaved - campaignCost;
  const roiMultiplier = campaignCost > 0 ? (revenueSaved / campaignCost).toFixed(1) : "0";

  const gaugeData = [
    { name: "ROI", value: Math.min(Number(roiMultiplier), 10) },
    { name: "Remaining", value: Math.max(10 - Number(roiMultiplier), 0) },
  ];

  const fmt = (n: number) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Revenue Impact Calculator</h1>
        <p className="text-sm text-muted-foreground mt-1">Translate churn risk into real business impact</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="bg-card rounded-lg p-6 card-shadow space-y-6">
          <h3 className="text-sm font-semibold text-card-foreground">Adjust Parameters</h3>
          {[
            { label: `At-Risk Customers: ${atRisk[0].toLocaleString()}`, val: atRisk, set: setAtRisk, max: 20000, step: 100 },
            { label: `Average Order Value: ₹${aov[0]}`, val: aov, set: setAov, max: 2000, step: 50 },
            { label: `Coupon Amount: ₹${coupon[0]}`, val: coupon, set: setCoupon, max: 500, step: 10 },
            { label: `Retention Rate: ${retention[0]}%`, val: retention, set: setRetention, max: 100, step: 1 },
            { label: `Orders Per Year: ${ordersYear[0]}`, val: ordersYear, set: setOrdersYear, max: 24, step: 1 },
          ].map(s => (
            <div key={s.label}>
              <Label className="text-xs text-muted-foreground">{s.label}</Label>
              <Slider value={s.val} onValueChange={s.set} max={s.max} step={s.step} className="mt-2" />
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-card rounded-lg p-6 card-shadow">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Revenue at Risk", value: fmt(revenueAtRisk), color: "text-destructive" },
                { label: "Campaign Cost", value: fmt(campaignCost), color: "text-muted-foreground" },
                { label: "Customers Retained", value: retained.toLocaleString(), color: "text-success" },
                { label: "Revenue Saved", value: fmt(revenueSaved), color: "text-success" },
              ].map(r => (
                <div key={r.label} className="text-center">
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <p className={`text-xl font-bold mt-1 ${r.color}`}>{r.value}</p>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4 text-center">
              <p className="text-xs text-muted-foreground">Net ROI</p>
              <p className={`text-3xl font-bold mt-1 ${netROI > 0 ? "text-success" : "text-destructive"}`}>
                {fmt(netROI)} {netROI > 0 ? "✅" : "❌"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">ROI Multiplier: {roiMultiplier}x</p>
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 card-shadow flex justify-center">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={gaugeData} startAngle={180} endAngle={0} cx="50%" cy="100%" innerRadius={60} outerRadius={90} dataKey="value">
                  <Cell fill="hsl(160, 84%, 39%)" />
                  <Cell fill="hsl(220, 14%, 90%)" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
