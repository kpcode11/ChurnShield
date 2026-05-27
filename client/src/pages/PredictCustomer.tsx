
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { PageHero, PillTag, SurfaceCard } from "@/components/supabaze";
import { predictCustomer, getSuggestion, type PredictResponse, type SuggestResponse } from "@/lib/api";
import { btnPrimary } from "@/lib/supabaze";
import { CHART, RISK, riskLevelColor } from "@/lib/chart-colors";
import { cn } from "@/lib/utils";

function featureValueColor(key: string, value: string): string | undefined {
  if (key === "Complaint" && value === "Yes") return CHART.churned;
  if (key === "Tenure" && parseInt(value, 10) <= 3) return RISK.medium;
  if (key === "Satisfaction" && (value.startsWith("1") || value.startsWith("2"))) return CHART.churned;
  if (key === "Days Idle" && parseInt(value, 10) <= 3) return RISK.medium;
  if (key === "Cashback" && parseInt(value.replace(/[^\d]/g, ""), 10) < 130) return CHART.churned;
  return undefined;
}

function priorityPillVariant(priority: string): "danger" | "violet" | "soft" {
  if (priority === "critical") return "danger";
  if (priority === "high") return "violet";
  return "soft";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="border-b border-border pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
        {label}: <span className="font-medium text-foreground">{value[0]}{unit}</span>
      </Label>
      <Slider
        value={value}
        onValueChange={onChange}
        min={min}
        max={max}
        step={step}
        className="mt-2 [&_[role=slider]]:border-[#3ecf8e] [&_[role=slider]]:bg-[#3ecf8e] [&_.bg-primary]:bg-[#3ecf8e]"
      />
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
          if (val.includes("-")) val = val.replace(/-/g, "");
          if (val !== "" && Number(val) < min) val = String(min);
          onChange(val);
        }}
        className="mt-1 h-9 rounded-md border-border bg-background text-sm focus-visible:ring-[#3ecf8e]"
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
        <SelectTrigger className="mt-1 h-9 rounded-md border-border bg-background text-sm"><SelectValue /></SelectTrigger>
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

  const [tenure,        setTenure]        = useState([9]);
  const [warehouseDist, setWarehouseDist] = useState([14]);
  const [hourOnApp,     setHourOnApp]     = useState([3]);
  const [numDevices,    setNumDevices]    = useState([4]);
  const [satisfaction,  setSatisfaction]  = useState([3]);
  const [numAddresses,  setNumAddresses]  = useState([3]);
  const [orderHike,     setOrderHike]     = useState("15");
  const [couponsUsed,   setCouponsUsed]   = useState("1");
  const [orderCount,    setOrderCount]    = useState("2");
  const [daysSince,     setDaysSince]     = useState("3");
  const [cashback,      setCashback]      = useState("163");
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
  const riskColor = riskLevelColor(riskLevel);
  const riskPillVariant =
    riskLevel === "High" ? "danger" as const :
    riskLevel === "Medium" ? "violet" as const :
    "green" as const;
  const progressClass =
    riskLevel === "High" ? "[&>div]:bg-[#e2005a]" :
    riskLevel === "Medium" ? "[&>div]:bg-[#644fc1]" :
    "[&>div]:bg-[#3ecf8e]";

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 pb-10">
      <PageHero
        title="Predict single customer"
        lead="All 28 model features — for the most accurate churn prediction."
        badge="XGBoost · 92.10% ROC-AUC · threshold 0.43"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SurfaceCard padding="md" className="max-h-[80vh] space-y-6 overflow-y-auto">
          <h3 className="text-lg font-medium text-foreground">Customer details</h3>

          <Section title="Account & lifecycle">
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

          <Section title="Orders & spend">
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

          <Section title="Payment & rewards">
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
            <p className="-mt-1 text-xs text-muted-foreground/80">1 = Very dissatisfied · 5 = Very satisfied</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Reviews Given" value={reviewsGiven} onChange={setReviewsGiven} />
              <NumberField label="Support Tickets" value={supportTicketCount} onChange={setSupportTicketCount} />
            </div>
            <div
              className={cn(
                "flex items-center justify-between rounded-md px-2 py-2 pt-1 transition-colors",
                complaint && "border border-[#e2005a]/25 bg-[#e2005a]/06",
              )}
            >
              <Label className={cn("text-xs", complaint ? "font-medium text-[#e2005a]" : "text-muted-foreground")}>
                Complaint filed?
              </Label>
              <Switch checked={complaint} onCheckedChange={setComplaint} />
            </div>
          </Section>

          {error && <p className="text-xs text-[#e2005a]">{error}</p>}

          <button type="button" className={cn(btnPrimary, "w-full")} onClick={handlePredict} disabled={loading}>
            {loading ? "Predicting…" : "Predict churn"}
          </button>
        </SurfaceCard>

        <div className="space-y-4">
          {result ? (
            <>
              <SurfaceCard
                padding="md"
                className="border-l-4"
                style={{
                  borderLeftColor: riskColor,
                  backgroundColor: `${riskColor}0a`,
                }}
              >
                <PillTag variant={riskPillVariant} className="mb-3">
                  Churn risk: {riskLevel}
                </PillTag>
                <p className="text-5xl font-medium tracking-[-0.02em]" style={{ color: riskColor }}>
                  {riskPct}%
                </p>
                <Progress value={riskPct} className={cn("mt-3 h-2.5 rounded-md bg-muted", progressClass)} />
                <p className="mt-3 text-sm text-muted-foreground">
                  {(result.churn_probability * 100).toFixed(1)}% probability of churn
                  {result.prediction === 1
                    ? " — customer predicted to churn."
                    : " — customer predicted to stay."}
                </p>
                <div className="mt-4 flex gap-2">
                  {[
                    { label: "Low", color: RISK.low },
                    { label: "Medium", color: RISK.medium },
                    { label: "High", color: RISK.high },
                  ].map((tier) => (
                    <span
                      key={tier.label}
                      className={cn(
                        "flex-1 rounded-md py-1 text-center text-[10px] font-medium uppercase tracking-wide",
                        riskLevel === tier.label ? "text-foreground" : "bg-muted text-muted-foreground/60",
                      )}
                      style={{
                        backgroundColor: riskLevel === tier.label ? `${tier.color}30` : undefined,
                        borderBottom: riskLevel === tier.label ? `2px solid ${tier.color}` : "2px solid transparent",
                      }}
                    >
                      {tier.label}
                    </span>
                  ))}
                </div>
              </SurfaceCard>

              <SurfaceCard padding="md">
                <h4 className="mb-3 text-lg font-medium text-foreground">Risk signals detected</h4>
                <div className="space-y-2">
                  {riskFactors.map((f, i) => {
                    const isSafe = f.startsWith("No major");
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex items-start gap-2 rounded-md px-2 py-1.5 text-sm",
                          isSafe ? "bg-[#3ecf8e]/10" : "bg-[#e2005a]/06",
                        )}
                      >
                        <span
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: isSafe ? CHART.stayed : CHART.churned }}
                        />
                        <span className="text-foreground" style={{ color: isSafe ? CHART.stayedDeep : undefined }}>{f}</span>
                      </div>
                    );
                  })}
                </div>
              </SurfaceCard>

              <SurfaceCard padding="md" className="overflow-hidden">
                <h4 className="mb-3 text-lg font-medium text-foreground">Features sent to model</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0 text-xs">
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
                  ].map(([k, v], i) => (
                    <div
                      key={k}
                      className={cn(
                        "flex justify-between border-b border-border py-1.5",
                        i % 2 === 1 && "bg-muted/50",
                      )}
                    >
                      <span className="text-muted-foreground">{k}</span>
                      <span
                        className="font-medium text-foreground"
                        style={{ color: featureValueColor(k, String(v)) }}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </SurfaceCard>

              <div className="rounded-md bg-[#1c1c1c] p-4 font-mono text-sm shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <p className="text-[#9a9a9a]">
                  <span style={{ color: CHART.stayed }}>POST</span>
                  <span className="text-white"> /predict</span>
                  <span className="text-[#707070]"> · </span>
                  <span style={{ color: RISK.medium }}>{riskLevel}</span>
                  <span className="text-[#707070]"> risk · </span>
                  <span style={{ color: CHART.churned }}>{riskPct}%</span>
                </p>
              </div>

              {suggestion && (
                <SurfaceCard
                  padding="md"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor:
                      suggestion.priority === "critical" ? CHART.churned :
                      suggestion.priority === "high" ? RISK.medium :
                      CHART.stayed,
                  }}
                >
                  <h4 className="text-lg font-medium text-foreground">Recommended action</h4>
                  <PillTag variant={priorityPillVariant(suggestion.priority)} className="mt-2">
                    {suggestion.priority} priority · {suggestion.action_type}
                  </PillTag>
                  <p className="mt-3 text-sm text-muted-foreground">→ {suggestion.suggestion}</p>
                  <p className="mt-1 text-xs italic text-muted-foreground/80">{suggestion.reason}</p>
                </SurfaceCard>
              )}
            </>
          ) : (
            <SurfaceCard padding="lg" className="flex min-h-[320px] flex-col items-center justify-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl border border-[#3ecf8e]/30"
                style={{ backgroundColor: `${CHART.stayed}18` }}
              >
                <span className="text-2xl font-medium" style={{ color: CHART.stayedDeep }}>%</span>
              </div>
              <p className="max-w-xs text-center text-sm text-muted-foreground">
                {loading
                  ? "Running prediction across all 28 features…"
                  : "Fill in the customer details and click Predict churn"}
              </p>
              {!loading && (
                <div className="flex gap-2">
                  {[RISK.low, RISK.medium, RISK.high].map((c) => (
                    <span key={c} className="h-2 w-8 rounded-full" style={{ backgroundColor: c, opacity: 0.6 }} />
                  ))}
                </div>
              )}
            </SurfaceCard>
          )}
        </div>
      </div>
    </div>
  );
}
