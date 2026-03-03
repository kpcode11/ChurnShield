import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { predictCustomer, getSuggestion, type PredictResponse, type SuggestResponse } from "@/lib/api";

const riskColors: Record<string, string> = {
  High:   "border-l-destructive",
  Medium: "border-l-accent",
  Low:    "border-l-success",
};
const riskTextColors: Record<string, string> = {
  High:   "text-destructive",
  Medium: "text-accent",
  Low:    "text-success",
};
const progressColors: Record<string, string> = {
  High:   "[&>div]:bg-destructive",
  Medium: "[&>div]:bg-accent",
  Low:    "[&>div]:bg-success",
};

export default function PredictCustomer() {
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);

  // Form state
  const [tenure, setTenure]           = useState([12]);
  const [satisfaction, setSatisfaction] = useState([3]);
  const [daysSince, setDaysSince]     = useState("15");
  const [cityTier, setCityTier]       = useState("1");
  const [devices, setDevices]         = useState([2]);
  const [complaint, setComplaint]     = useState(false);
  const [cashback, setCashback]       = useState("120");
  const [addresses, setAddresses]     = useState([2]);

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSuggestion(null);

    const payload = {
      Tenure:                    tenure[0],
      SatisfactionScore:         satisfaction[0],
      DaySinceLastOrder:         parseFloat(daysSince) || 0,
      CityTier:                  parseInt(cityTier),
      NumberOfDeviceRegistered:  devices[0],
      Complain:                  complaint ? 1 : 0,
      CashbackAmount:            parseFloat(cashback) || 0,
      NumberOfAddress:           addresses[0],
    };

    try {
      const [pred, sug] = await Promise.all([
        predictCustomer(payload),
        getSuggestion({
          Tenure:            payload.Tenure,
          SatisfactionScore: payload.SatisfactionScore,
          DaySinceLastOrder: payload.DaySinceLastOrder,
          CashbackAmount:    payload.CashbackAmount,
          Complain:          payload.Complain,
        }),
      ]);
      setResult(pred);
      setSuggestion(sug);
    } catch (e: unknown) {
      const ae = e as { message?: string };
      setError(ae?.message ?? "Prediction failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  // Derive human-readable risk factors from form values
  const riskFactors: { icon: string; text: string }[] = [];
  if (result) {
    if (parseFloat(daysSince) > 30)   riskFactors.push({ icon: "🔴", text: `${daysSince} days since last order — critical` });
    if (satisfaction[0] <= 2)          riskFactors.push({ icon: "🟠", text: `Satisfaction score: ${satisfaction[0]}/5 — needs attention` });
    if (complaint)                     riskFactors.push({ icon: "🟡", text: "Complaint filed — follow up needed" });
    if (tenure[0] < 6)                 riskFactors.push({ icon: "🟡", text: `New customer (${tenure[0]} months) — higher churn risk` });
    if (parseFloat(cashback) < 50)     riskFactors.push({ icon: "🟡", text: `Low cashback (₹${cashback}) — not incentivised` });
    if (riskFactors.length === 0)      riskFactors.push({ icon: "✅", text: "No major churn signals detected" });
  }

  const riskPct = result ? Math.round(result.probability_pct) : 0;
  const riskLevel = result?.risk ?? "Low";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Predict Single Customer</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter customer details to get an instant churn prediction</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-card rounded-lg p-6 card-shadow space-y-5">
          <h3 className="text-sm font-semibold text-card-foreground">Customer Details</h3>

          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Tenure (months): {tenure[0]}</Label>
              <Slider value={tenure} onValueChange={setTenure} max={60} step={1} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Satisfaction Score: {satisfaction[0]}</Label>
              <Slider value={satisfaction} onValueChange={setSatisfaction} min={1} max={5} step={1} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Days Since Last Order</Label>
              <Input type="number" value={daysSince} onChange={(e) => setDaysSince(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">City Tier</Label>
              <Select value={cityTier} onValueChange={setCityTier}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Tier 1 (Metro)</SelectItem>
                  <SelectItem value="2">Tier 2</SelectItem>
                  <SelectItem value="3">Tier 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Number of Devices: {devices[0]}</Label>
              <Slider value={devices} onValueChange={setDevices} min={1} max={6} step={1} className="mt-2" />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Complaint Filed?</Label>
              <Switch checked={complaint} onCheckedChange={setComplaint} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Average Cashback (₹)</Label>
              <Input type="number" value={cashback} onChange={(e) => setCashback(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Number of Addresses: {addresses[0]}</Label>
              <Slider value={addresses} onValueChange={setAddresses} min={1} max={10} step={1} className="mt-2" />
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button className="w-full" onClick={handlePredict} disabled={loading}>
            {loading ? "⏳ Predicting…" : "🔍 Predict Churn"}
          </Button>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {result ? (
            <>
              <div className={`bg-card rounded-lg p-6 card-shadow border-l-4 ${riskColors[riskLevel]}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${riskTextColors[riskLevel]}`}>
                  Churn Risk: {riskLevel}
                </p>
                <p className="text-4xl font-bold text-card-foreground mt-2">{riskPct}%</p>
                <Progress value={riskPct} className={`mt-3 h-3 ${progressColors[riskLevel]}`} />
                <p className="text-sm text-muted-foreground mt-3">
                  Model confidence: {result.probability_pct.toFixed(1)}% probability of churn
                  {result.churn === 1 ? " — customer predicted to churn." : " — customer predicted to stay."}
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 card-shadow space-y-3">
                <h4 className="text-sm font-semibold text-card-foreground">Why is this customer at risk?</h4>
                <div className="space-y-2 text-sm">
                  {riskFactors.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span>{f.icon}</span>
                      <span className="text-card-foreground">{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {suggestion && (
                <div className="bg-card rounded-lg p-6 card-shadow">
                  <h4 className="text-sm font-semibold text-card-foreground">Recommended Action</h4>
                  <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{suggestion.action_type}</p>
                  <p className="text-sm text-muted-foreground mt-2">→ {suggestion.suggestion}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 italic">{suggestion.reason}</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-card rounded-lg p-12 card-shadow flex items-center justify-center">
              <p className="text-muted-foreground text-sm">
                {loading ? "Running prediction…" : "Enter customer details and click predict to see results"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

