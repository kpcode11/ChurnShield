import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";
import { calcRevenueImpact, fetchAnalytics, type RevenueResponse, type AnalyticsData } from "@/lib/api";

const fmt = (n: number) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
};

export default function RevenueImpact() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize with real data from analytics
  useEffect(() => {
    const ctrl = new AbortController();
    fetchAnalytics(ctrl.signal)
      .then((data) => {
        setAnalytics(data);
        // Set real values from analytics
        setAtRisk([data.churned_customers]);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    return () => ctrl.abort();
  }, []);

  const [atRisk,     setAtRisk]    = useState([948]); // Will be updated from analytics
  const [aov,        setAov]       = useState([850]);
  const [coupon,     setCoupon]    = useState([100]);
  const [retention,  setRetention] = useState([55]);
  const [ordersYear, setOrdersYear] = useState([8]);

  const [result,  setResult]  = useState<RevenueResponse | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleCalculate = async () => {
    setCalculating(true);
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
      setCalculating(false);
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
        <p className="text-sm text-muted-foreground mt-1">Calculate ROI for retention campaigns using real churn data</p>
        {analytics && (
          <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-700 font-medium">
              ℹ️ At-Risk Customers initialized from real data: {analytics.churned_customers.toLocaleString()} churned customers
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="bg-card rounded-lg p-12 card-shadow flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading analytics data...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inputs */}
            <div className="bg-card rounded-lg p-6 card-shadow space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-card-foreground">Campaign Parameters</h3>
                <p className="text-xs text-muted-foreground mt-1">Adjust values to model different retention scenarios</p>
              </div>
              {[
                { 
                  label: `At-Risk Customers: ${atRisk[0].toLocaleString()}`, 
                  val: atRisk, 
                  set: setAtRisk, 
                  max: 20000, 
                  step: 100,
                  help: "Number of customers predicted to churn (from analytics)"
                },
                { 
                  label: `Average Order Value: ₹${aov[0]}`, 
                  val: aov, 
                  set: setAov, 
                  max: 2000, 
                  step: 50,
                  help: "Average revenue per order"
                },
                { 
                  label: `Coupon Amount: ₹${coupon[0]}`, 
                  val: coupon, 
                  set: setCoupon, 
                  max: 500, 
                  step: 10,
                  help: "Cost per customer for retention offer"
                },
                { 
                  label: `Retention Rate: ${retention[0]}%`, 
                  val: retention, 
                  set: setRetention, 
                  max: 100, 
                  step: 1,
                  help: "Expected % of targeted customers who will stay"
                },
                { 
                  label: `Orders Per Year: ${ordersYear[0]}`, 
                  val: ordersYear, 
                  set: setOrdersYear, 
                  max: 24, 
                  step: 1,
                  help: "Average annual orders per retained customer"
                },
              ].map(s => (
                <div key={s.label}>
                  <Label className="text-xs text-muted-foreground">{s.label}</Label>
                  <Slider value={s.val} onValueChange={s.set} max={s.max} step={s.step} className="mt-2" />
                  <p className="text-[10px] text-muted-foreground/60 mt-1 italic">{s.help}</p>
                </div>
              ))}

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button className="w-full" onClick={handleCalculate} disabled={calculating}>
                {calculating ? "Calculating…" : "Calculate Revenue Impact"}
              </Button>
            </div>

            {/* Results */}
            <div className="space-y-4">
              {result ? (
                <>
                  <div className="bg-card rounded-lg p-6 card-shadow">
                    <h3 className="text-sm font-semibold text-card-foreground mb-4">Financial Impact</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Revenue at Risk",      value: fmt(result.revenue_at_risk),             color: "text-destructive", desc: "Total potential revenue loss" },
                        { label: "Campaign Cost",        value: fmt(result.campaign_cost),               color: "text-muted-foreground", desc: "Total retention spend" },
                        { label: "Customers Retained",   value: result.customers_retained.toLocaleString(), color: "text-success", desc: "Expected saves" },
                        { label: "Revenue Saved",        value: fmt(result.revenue_saved),               color: "text-success", desc: "Recovered revenue" },
                      ].map(r => (
                        <div key={r.label} className="text-center p-3 bg-muted/30 rounded-lg">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{r.label}</p>
                          <p className={`text-2xl font-bold mt-1 ${r.color}`}>{r.value}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-0.5">{r.desc}</p>
                        </div>
                      ))}
                    </div>
                    <div className="border-t mt-4 pt-4 text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Net ROI</p>
                      <p className={`text-4xl font-bold mt-2 ${result.net_roi > 0 ? "text-success" : "text-destructive"}`}>
                        {fmt(result.net_roi)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        ROI Multiplier: <span className="font-semibold">{roiMultiplier}x</span> · {result.roi_percentage}% return
                      </p>
                      <div className="mt-3 p-2 bg-muted/40 rounded-md">
                        <p className="text-xs text-muted-foreground">
                          {result.net_roi > 0 
                            ? `✓ Campaign is profitable — every ₹1 spent returns ₹${roiMultiplier}` 
                            : `✗ Campaign loses money — adjust retention rate or reduce coupon amount`}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card rounded-lg p-6 card-shadow">
                    <h3 className="text-sm font-semibold text-card-foreground mb-4">ROI Gauge</h3>
                    <div className="flex justify-center">
                      <ResponsiveContainer width={200} height={200}>
                        <PieChart>
                          <Pie data={gaugeData} startAngle={180} endAngle={0} cx="50%" cy="100%" innerRadius={60} outerRadius={90} dataKey="value">
                            <Cell fill={result.net_roi > 0 ? "hsl(160, 84%, 39%)" : "hsl(0, 72%, 51%)"} />
                            <Cell fill="hsl(220, 14%, 90%)" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      {result.net_roi > 0 ? "Positive ROI" : "Negative ROI"}
                    </p>
                  </div>

                  {/* Breakdown Chart */}
                  <div className="bg-card rounded-lg p-6 card-shadow">
                    <h3 className="text-sm font-semibold text-card-foreground mb-4">Cost vs Revenue Breakdown</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { metric: "Campaign Cost", value: result.campaign_cost, fill: "hsl(0, 72%, 51%)" },
                        { metric: "Revenue Saved", value: result.revenue_saved, fill: "hsl(160, 84%, 39%)" },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                        <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RechartsTooltip formatter={(v: number) => [fmt(v), ""]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : (
                <div className="bg-card rounded-lg p-12 card-shadow flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {calculating ? "Calculating…" : "Adjust parameters and click Calculate"}
                    </p>
                    {analytics && (
                      <p className="text-xs text-muted-foreground/60 mt-2">
                        Using {analytics.churned_customers.toLocaleString()} at-risk customers from analytics
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Explanation Section */}
          <div className="bg-card rounded-lg p-6 card-shadow">
            <h3 className="text-sm font-semibold text-card-foreground mb-3">How Revenue Impact is Calculated</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div className="space-y-2">
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="font-semibold text-card-foreground mb-1">Revenue at Risk</p>
                  <p className="font-mono text-[10px]">= At-Risk Customers × AOV × Orders/Year</p>
                  <p className="mt-1">Total potential revenue loss if all at-risk customers churn</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="font-semibold text-card-foreground mb-1">Campaign Cost</p>
                  <p className="font-mono text-[10px]">= At-Risk Customers × Coupon Amount</p>
                  <p className="mt-1">Total spend to reach all at-risk customers</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="font-semibold text-card-foreground mb-1">Revenue Saved</p>
                  <p className="font-mono text-[10px]">= Customers Retained × AOV × Orders/Year</p>
                  <p className="mt-1">Revenue recovered from successful retention</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-md">
                  <p className="font-semibold text-card-foreground mb-1">Net ROI</p>
                  <p className="font-mono text-[10px]">= Revenue Saved − Campaign Cost</p>
                  <p className="mt-1">Profit/loss after accounting for campaign spend</p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs text-blue-700">
                <span className="font-semibold">Data Source:</span> At-Risk Customers uses real churned customer count from your dataset ({analytics?.churned_customers.toLocaleString() || "—"}). 
                Other parameters are adjustable to model different retention scenarios.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

