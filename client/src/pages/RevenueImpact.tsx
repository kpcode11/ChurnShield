import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { calcRevenueImpact, type RevenueResponse } from "@/lib/api";

const fmt = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

export default function RevenueImpact() {
  const [atRisk,     setAtRisk]    = useState([8210]);
  const [aov,        setAov]       = useState([850]);
  const [coupon,     setCoupon]    = useState([100]);
  const [retention,  setRetention] = useState([55]);
  const [ordersYear, setOrdersYear] = useState([8]);

  const [result,  setResult]  = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await calcRevenueImpact({
        at_risk_customers: atRisk[0],
        avg_order_value:   aov[0],
        coupon_amount:     coupon[0],
        retention_rate:    retention[0],
        orders_per_year:   ordersYear[0],
      });
      setResult(res);
    } catch (e: unknown) {
      const ae = e as { message?: string };
      setError(ae?.message ?? "Calculation failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const roiMultiplier = result && result.campaign_cost > 0
    ? (result.revenue_saved / result.campaign_cost).toFixed(1)
    : "0";
  const gaugeVal = Math.min(Number(roiMultiplier), 10);
  const gaugeData = [
    { name: "ROI",       value: gaugeVal },
    { name: "Remaining", value: Math.max(10 - gaugeVal, 0) },
  ];

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
            { label: `At-Risk Customers: ${atRisk[0].toLocaleString()}`,   val: atRisk,     set: setAtRisk,     max: 20000, step: 100 },
            { label: `Average Order Value: ₹${aov[0]}`,                    val: aov,        set: setAov,        max: 2000,  step: 50  },
            { label: `Coupon Amount: ₹${coupon[0]}`,                       val: coupon,     set: setCoupon,     max: 500,   step: 10  },
            { label: `Retention Rate: ${retention[0]}%`,                   val: retention,  set: setRetention,  max: 100,   step: 1   },
            { label: `Orders Per Year: ${ordersYear[0]}`,                  val: ordersYear, set: setOrdersYear, max: 24,    step: 1   },
          ].map(s => (
            <div key={s.label}>
              <Label className="text-xs text-muted-foreground">{s.label}</Label>
              <Slider value={s.val} onValueChange={s.set} max={s.max} step={s.step} className="mt-2" />
            </div>
          ))}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button className="w-full" onClick={handleCalculate} disabled={loading}>
            {loading ? "⏳ Calculating…" : "📊 Calculate Revenue Impact"}
          </Button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className="bg-card rounded-lg p-6 card-shadow">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Revenue at Risk",      value: fmt(result.revenue_at_risk),             color: "text-destructive" },
                    { label: "Campaign Cost",        value: fmt(result.campaign_cost),               color: "text-muted-foreground" },
                    { label: "Customers Retained",   value: result.customers_retained.toLocaleString(), color: "text-success" },
                    { label: "Revenue Saved",        value: fmt(result.revenue_saved),               color: "text-success" },
                  ].map(r => (
                    <div key={r.label} className="text-center">
                      <p className="text-xs text-muted-foreground">{r.label}</p>
                      <p className={`text-xl font-bold mt-1 ${r.color}`}>{r.value}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t mt-4 pt-4 text-center">
                  <p className="text-xs text-muted-foreground">Net ROI</p>
                  <p className={`text-3xl font-bold mt-1 ${result.net_roi > 0 ? "text-success" : "text-destructive"}`}>
                    {fmt(result.net_roi)} {result.net_roi > 0 ? "✅" : "❌"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    ROI Multiplier: {roiMultiplier}x · {result.roi_percentage}% return on campaign spend
                  </p>
                </div>
              </div>

              <div className="bg-card rounded-lg p-6 card-shadow flex justify-center">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={gaugeData} startAngle={180} endAngle={0} cx="50%" cy="100%" innerRadius={60} outerRadius={90} dataKey="value">
                      <Cell fill={result.net_roi > 0 ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"} />
                      <Cell fill="hsl(220, 14%, 90%)" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="bg-card rounded-lg p-12 card-shadow flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {loading ? "Calculating…" : "Adjust parameters and click Calculate to see the impact"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

