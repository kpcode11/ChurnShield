
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 border-b pb-1">
        {title}
      </p>
      {children}
    </div>
  );
}

function SliderField({
  label, value, onChange, min = 0, max, step = 1, unit = "",
}: {
  label: string; value: number[]; onChange: (v: number[]) => void;
  min?: number; max: number; step?: number; unit?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">
        {label}: <span className="font-semibold text-card-foreground">{value[0]}{unit}</span>
      </Label>
      <Slider value={value} onValueChange={onChange} min={min} max={max} step={step} className="mt-2" />
    </div>
  );
}

function NumberField({
  label, value, onChange, min = 0,
}: {
  label: string; value: string; onChange: (v: string) => void; min?: number;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={min}
        value={value}
        onChange={e => {
          let val = e.target.value;
          // Strip minus signs to prevent negative numbers
          if (val.includes("-")) val = val.replace(/-/g, "");
          if (val !== "" && Number(val) < min) val = String(min);
          onChange(val);
        }}
        className="mt-1 h-8 text-sm"
      />
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function PredictCustomer() {
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [result, setResult]         = useState<PredictResponse | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestResponse | null>(null);

  // ── All 28 model features — defaults match training-set medians ─────────────
  // Real churner profile: Tenure≈3, Complain=1, CashbackAmount≈160
  // Real stayer profile:  Tenure≈12, Complain=0, CashbackAmount≈181
  const [tenure,        setTenure]        = useState([9]);    // training median
  const [warehouseDist, setWarehouseDist] = useState([14]);
  const [hourOnApp,     setHourOnApp]     = useState([3]);
  const [numDevices,    setNumDevices]    = useState([4]);
  const [satisfaction,  setSatisfaction]  = useState([3]);
  const [numAddresses,  setNumAddresses]  = useState([3]);
  const [orderHike,     setOrderHike]     = useState("15");
  const [couponsUsed,   setCouponsUsed]   = useState("1");
  const [orderCount,    setOrderCount]    = useState("2");
  const [daysSince,     setDaysSince]     = useState("3");
  const [cashback,      setCashback]      = useState("163");  // training median
  const [cityTier,      setCityTier]      = useState("1");
  const [complaint,     setComplaint]     = useState(false);
  const [loginDevice,   setLoginDevice]   = useState("Mobile Phone");
  const [paymentMode,   setPaymentMode]   = useState("Debit Card");
  const [gender,        setGender]        = useState("Male");
  const [orderCat,      setOrderCat]      = useState("Laptop & Accessory");
  const [maritalStatus, setMaritalStatus] = useState("Single");
  const [totalSpend, setTotalSpend] = useState("500");
  const [avgOrderValue, setAvgOrderValue] = useState("100");
  const [returnRate, setReturnRate] = useState([0.1]);
  const [customerAge, setCustomerAge] = useState([30]);
  const [lastLoginDaysAgo, setLastLoginDaysAgo] = useState("5");
  const [reviewsGiven, setReviewsGiven] = useState("0");
  const [wishlistItems, setWishlistItems] = useState("0");
  const [subscriptionPlan, setSubscriptionPlan] = useState("Free");
  const [referralsMade, setReferralsMade] = useState("0");
  const [supportTicketCount, setSupportTicketCount] = useState("0");

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSuggestion(null);

    const payload = {
      Tenure:                      tenure[0],
      CityTier:                    parseInt(cityTier),
      WarehouseToHome:             warehouseDist[0],
      HourSpendOnApp:              hourOnApp[0],
      NumberOfDeviceRegistered:    numDevices[0],
      SatisfactionScore:           satisfaction[0],
      NumberOfAddress:             numAddresses[0],
      Complain:                    complaint ? 1 : 0,
      OrderAmountHikeFromlastYear: parseFloat(orderHike) || 15,
      CouponUsed:                  parseFloat(couponsUsed) || 0,
      OrderCount:                  parseFloat(orderCount) || 0,
      DaySinceLastOrder:           parseFloat(daysSince) || 0,
      CashbackAmount:              parseFloat(cashback) || 0,
      PreferredLoginDevice:        loginDevice,
      PreferredPaymentMode:        paymentMode,
      Gender:                      gender,
      PreferedOrderCat:            orderCat,
      MaritalStatus:               maritalStatus,
      TotalSpend:                  parseFloat(totalSpend) || 0,
      AvgOrderValue:               parseFloat(avgOrderValue) || 0,
      ReturnRate:                  returnRate[0],
      CustomerAge:                 customerAge[0],
      LastLoginDaysAgo:            parseFloat(lastLoginDaysAgo) || 0,
      ReviewsGiven:                parseFloat(reviewsGiven) || 0,
      WishlistItems:               parseFloat(wishlistItems) || 0,
      SubscriptionPlan:            subscriptionPlan,
      ReferralsMade:               parseFloat(referralsMade) || 0,
      SupportTicketCount:          parseFloat(supportTicketCount) || 0,
    };

    const hasNegative = Object.values(payload).some(v => typeof v === 'number' && v < 0);
    if (hasNegative) {
      setError("Input values cannot be negative.");
      setLoading(false);
      return;
    }

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

  // Risk factor explanations — aligned with what the model actually learned from the XLSX data:
  // Top drivers: Tenure (27%), CashbackAmount (11%), Complain (7%), DaySinceLastOrder (6%)
  // Key insight: churners have LOW tenure (avg 3.4 mo) and LOW cashback (avg ₹160 vs ₹181)
  const riskFactors: string[] = [];
  if (result) {
    if (tenure[0] <= 3)                riskFactors.push(`New customer (${tenure[0]} mo) — highest churn risk window`);
    if (complaint)                     riskFactors.push("Complaint filed — 3× higher churn rate");
    if (parseFloat(cashback) < 130)    riskFactors.push(`Low cashback ₹${cashback} — churners avg ₹160 vs ₹181 for stayers`);
    if (parseFloat(daysSince) <= 3 && tenure[0] <= 6)
                                       riskFactors.push("Very recent order but new customer — early churn pattern");
    if (numDevices[0] >= 5)            riskFactors.push(`${numDevices[0]} devices registered — higher engagement risk`);
    if (satisfaction[0] >= 4 && tenure[0] <= 3)
                                       riskFactors.push("High satisfaction but new — may churn before habit forms");
    if (riskFactors.length === 0)      riskFactors.push("No major churn signals detected");
  }

  const riskPct   = result ? Math.round(result.churn_probability * 100) : 0;
  const riskLevel = result?.risk_level ?? "Low";

  return (
    <div className="space-y-6 pb-10">
      <div className="bg-[#001e2b] text-white -mx-6 lg:-mx-8 -mt-6 lg:-mt-8 px-6 lg:px-8 py-10 pb-16 rounded-b-[24px]">
        <h1 className="text-4xl font-medium tracking-tight text-white mb-2">Predict Single Customer</h1>
        <p className="text-[#a8b3bc] mt-1 font-normal text-lg">
          All 28 model features — for the most accurate churn prediction
        </p>
        <div className="mt-4 px-3 py-1.5 bg-[#00ed64]/10 border border-[#00ed64]/20 rounded-md inline-block">
          <p className="text-xs text-[#00ed64] font-medium">
            ✓ XGBoost — 92.10% ROC-AUC · 28 features · threshold 0.43
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 -mt-12 relative z-10 px-0">

        {/* ── Input Form ── */}
        <div className="bg-card rounded-lg p-6 card-shadow space-y-6 overflow-y-auto max-h-[80vh]">
          <h3 className="text-sm font-semibold text-card-foreground">Customer Details</h3>

          <Section title="Account & Lifecycle">
            <SliderField label="Tenure" value={tenure} onChange={setTenure} max={60} unit=" mo" />
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="City Tier" value={cityTier} onChange={setCityTier}
                options={[
                  { value: "1", label: "Tier 1 (Metro)" },
                  { value: "2", label: "Tier 2" },
                  { value: "3", label: "Tier 3" },
                ]}
              />
              <SelectField label="Gender" value={gender} onChange={setGender}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                ]}
              />
            </div>
            <SliderField label="Customer Age" value={customerAge} onChange={setCustomerAge} min={18} max={100} />
            <SelectField label="Subscription Plan" value={subscriptionPlan} onChange={setSubscriptionPlan}
              options={[
                { value: "Free", label: "Free" },
                { value: "Silver", label: "Silver" },
                { value: "Gold", label: "Gold" },
                { value: "Platinum", label: "Platinum" },
              ]}
            />
            <SelectField label="Marital Status" value={maritalStatus} onChange={setMaritalStatus}
              options={[
                { value: "Single", label: "Single" },
                { value: "Married", label: "Married" },
                { value: "Divorced", label: "Divorced" },
              ]}
            />
          </Section>

          <Section title="Engagement">
            <SelectField label="Preferred Login Device" value={loginDevice} onChange={setLoginDevice}
              options={[
                { value: "Mobile Phone", label: "Mobile Phone" },
                { value: "Computer", label: "Computer" },
                { value: "Phone", label: "Phone" },
              ]}
            />
            <SliderField label="Hours on App / day" value={hourOnApp} onChange={setHourOnApp} max={5} step={0.5} />
            <SliderField label="Devices Registered" value={numDevices} onChange={setNumDevices} min={1} max={6} />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Last Login Days Ago" value={lastLoginDaysAgo} onChange={setLastLoginDaysAgo} />
              <NumberField label="Wishlist Items" value={wishlistItems} onChange={setWishlistItems} />
            </div>
            <NumberField label="Referrals Made" value={referralsMade} onChange={setReferralsMade} />
            <SliderField label="Saved Addresses" value={numAddresses} onChange={setNumAddresses} min={1} max={10} />
          </Section>

          <Section title="Orders & Spend">
            <SelectField label="Preferred Order Category" value={orderCat} onChange={setOrderCat}
              options={[
                { value: "Laptop & Accessory", label: "Laptop & Accessory" },
                { value: "Mobile", label: "Mobile" },
                { value: "Mobile Phone", label: "Mobile Phone" },
                { value: "Fashion", label: "Fashion" },
                { value: "Grocery", label: "Grocery" },
                { value: "Electronics", label: "Electronics" },
                { value: "Others", label: "Others" },
              ]}
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Order Count" value={orderCount} onChange={setOrderCount} />
              <NumberField label="Days Since Last Order" value={daysSince} onChange={setDaysSince} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Coupons Used" value={couponsUsed} onChange={setCouponsUsed} />
              <NumberField label="Total Spend (₹)" value={totalSpend} onChange={setTotalSpend} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Avg Order Value (₹)" value={avgOrderValue} onChange={setAvgOrderValue} />
              <div className="pt-2">
                <SliderField label="Return Rate" value={returnRate} onChange={setReturnRate} max={1} step={0.01} />
              </div>
              <NumberField label="Order Hike YoY (%)" value={orderHike} onChange={setOrderHike} />
            </div>
            <SliderField label="Warehouse → Home (km)" value={warehouseDist} onChange={setWarehouseDist} max={60} />
          </Section>

          <Section title="Payment & Rewards">
            <SelectField label="Preferred Payment Mode" value={paymentMode} onChange={setPaymentMode}
              options={[
                { value: "Debit Card", label: "Debit Card" },
                { value: "Credit Card", label: "Credit Card" },
                { value: "UPI", label: "UPI" },
                { value: "Cash on Delivery", label: "Cash on Delivery" },
                { value: "COD", label: "COD" },
                { value: "E wallet", label: "E-Wallet" },
              ]}
            />
            <NumberField label="Cashback Amount (₹)" value={cashback} onChange={setCashback} />
          </Section>

          <Section title="Satisfaction">
            <SliderField label="Satisfaction Score" value={satisfaction} onChange={setSatisfaction} min={1} max={5} />
            <p className="text-[10px] text-muted-foreground/60 -mt-1">1 = Very dissatisfied · 5 = Very satisfied</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Reviews Given" value={reviewsGiven} onChange={setReviewsGiven} />
              <NumberField label="Support Tickets" value={supportTicketCount} onChange={setSupportTicketCount} />
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs text-muted-foreground">Complaint Filed?</Label>
              <Switch checked={complaint} onCheckedChange={setComplaint} />
            </div>
          </Section>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button className="w-full" onClick={handlePredict} disabled={loading}>
            {loading ? "Predicting…" : "Predict Churn"}
          </Button>
        </div>

        {/* ── Results Panel ── */}
        <div className="space-y-4">
          {result ? (
            <>
              {/* Risk score card */}
              <div className={`bg-card rounded-lg p-6 card-shadow border-l-4 ${riskColors[riskLevel]}`}>
                <p className={`text-xs font-semibold uppercase tracking-wide ${riskTextColors[riskLevel]}`}>
                  Churn Risk: {riskLevel}
                </p>
                <p className="text-5xl font-bold text-card-foreground mt-2">{riskPct}%</p>
                <Progress value={riskPct} className={`mt-3 h-3 ${progressColors[riskLevel]}`} />
                <p className="text-sm text-muted-foreground mt-3">
                  {(result.churn_probability * 100).toFixed(1)}% probability of churn
                  {result.prediction === 1
                    ? " — customer predicted to churn."
                    : " — customer predicted to stay."}
                </p>
              </div>

              {/* Risk signals */}
              <div className="bg-card rounded-lg p-5 card-shadow">
                <h4 className="text-sm font-semibold text-card-foreground mb-3">Risk Signals Detected</h4>
                <div className="space-y-2">
                  {riskFactors.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <span className={`mt-0.5 text-xs ${f.startsWith("No major") ? "text-success" : "text-destructive"}`}>
                        {f.startsWith("No major") ? "✓" : "⚠"}
                      </span>
                      <span className="text-card-foreground">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Input summary — all 28 features */}
              <div className="bg-card rounded-lg p-5 card-shadow">
                <h4 className="text-sm font-semibold text-card-foreground mb-3">
                  All 28 Features Sent to Model
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  {[
                    ["Tenure",        `${tenure[0]} mo`],
                    ["City Tier",     `Tier ${cityTier}`],
                    ["Satisfaction",  `${satisfaction[0]}/5`],
                    ["Days Idle",     daysSince],
                    ["Orders",        orderCount],
                    ["Cashback",      `₹${cashback}`],
                    ["Coupons",       couponsUsed],
                    ["App Hrs/day",   `${hourOnApp[0]}`],
                    ["Complaint",     complaint ? "Yes" : "No"],
                    ["Order Hike",    `${orderHike}%`],
                    ["Devices",       `${numDevices[0]}`],
                    ["Addresses",     `${numAddresses[0]}`],
                    ["Login Device",  loginDevice],
                    ["Payment",       paymentMode],
                    ["Category",      orderCat],
                    ["Gender",        gender],
                    ["Marital",       maritalStatus],
                    ["Age",           `${customerAge[0]}`],
                    ["Plan",          subscriptionPlan],
                    ["Last Login",    `${lastLoginDaysAgo}d ago`],
                    ["Wishlist",      wishlistItems],
                    ["Referrals",     referralsMade],
                    ["Total Spend",   `₹${totalSpend}`],
                    ["Avg Order Val", `₹${avgOrderValue}`],
                    ["Return Rate",   `${Math.round(returnRate[0] * 100)}%`],
                    ["Reviews",       reviewsGiven],
                    ["Tickets",       supportTicketCount],
                    ["Warehouse km",  `${warehouseDist[0]}`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/30 pb-1">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium text-card-foreground">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retention suggestion */}
              {suggestion && (
                <div className="bg-card rounded-lg p-5 card-shadow">
                  <h4 className="text-sm font-semibold text-card-foreground">Recommended Action</h4>
                  <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    suggestion.priority === "critical" ? "bg-destructive/10 text-destructive" :
                    suggestion.priority === "high"     ? "bg-accent/10 text-accent" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {suggestion.priority} priority · {suggestion.action_type}
                  </span>
                  <p className="text-sm text-muted-foreground mt-2">→ {suggestion.suggestion}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 italic">{suggestion.reason}</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-card rounded-lg p-12 card-shadow flex items-center justify-center">
              <p className="text-muted-foreground text-sm text-center">
                {loading
                  ? "Running prediction across all 28 features…"
                  : "Fill in the customer details and click Predict Churn"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
