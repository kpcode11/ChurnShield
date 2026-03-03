import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export default function PredictCustomer() {
  const [predicted, setPredicted] = useState(false);
  const [tenure, setTenure] = useState([12]);
  const [satisfaction, setSatisfaction] = useState([3]);
  const [daysSince, setDaysSince] = useState("15");
  const [cityTier, setCityTier] = useState("1");
  const [devices, setDevices] = useState([2]);
  const [complaint, setComplaint] = useState(false);
  const [cashback, setCashback] = useState("120");
  const [addresses, setAddresses] = useState([2]);

  const riskScore = 78;

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

          <Button className="w-full" onClick={() => setPredicted(true)}>
            🔍 Predict Churn
          </Button>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          {predicted ? (
            <>
              <div className="bg-card rounded-lg p-6 card-shadow border-l-4 border-l-destructive">
                <p className="text-xs font-semibold text-destructive uppercase tracking-wide">Churn Risk: High</p>
                <p className="text-4xl font-bold text-card-foreground mt-2">{riskScore}%</p>
                <Progress value={riskScore} className="mt-3 h-3 [&>div]:bg-destructive" />
                <p className="text-sm text-muted-foreground mt-3">
                  This customer is very likely to leave within 2–3 weeks.
                </p>
              </div>

              <div className="bg-card rounded-lg p-6 card-shadow space-y-3">
                <h4 className="text-sm font-semibold text-card-foreground">Why is this customer at risk?</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-destructive">🔴</span>
                    <span className="text-card-foreground"><strong>47 days since last order</strong> — most critical</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent">🟠</span>
                    <span className="text-card-foreground"><strong>Satisfaction score: 2/5</strong> — needs attention</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-warning">🟡</span>
                    <span className="text-card-foreground"><strong>Filed a complaint recently</strong> — follow up needed</span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg p-6 card-shadow">
                <h4 className="text-sm font-semibold text-card-foreground">Recommended Action</h4>
                <p className="text-sm text-muted-foreground mt-2">→ Priority support call + ₹150 loyalty coupon</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm">📄 Generate Health Card</Button>
                  <Button variant="outline" size="sm">📧 Generate Message</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card rounded-lg p-12 card-shadow flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Enter customer details and click predict to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
