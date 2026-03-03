import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search } from "lucide-react";

const customerDB: Record<string, { name: string; id: string; tenure: number; orders: number; lastOrder: number; aov: number; cashback: string; satisfaction: number; complaint: boolean; risk: number }> = {
  "#1042": { name: "Rakesh Sharma", id: "#1042", tenure: 14, orders: 23, lastOrder: 47, aov: 920, cashback: "Low", satisfaction: 2, complaint: true, risk: 74 },
  "#2091": { name: "Priya Mehta", id: "#2091", tenure: 8, orders: 9, lastOrder: 52, aov: 650, cashback: "Medium", satisfaction: 1, complaint: true, risk: 85 },
  "#3344": { name: "Amit Kumar", id: "#3344", tenure: 22, orders: 45, lastOrder: 5, aov: 1200, cashback: "High", satisfaction: 5, complaint: false, risk: 12 },
};

export default function HealthCard() {
  const [query, setQuery] = useState("");
  const [customer, setCustomer] = useState<typeof customerDB["#1042"] | null>(null);

  const search = () => {
    const key = query.startsWith("#") ? query : `#${query}`;
    setCustomer(customerDB[key] || null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Customer Health Card</h1>
        <p className="text-sm text-muted-foreground mt-1">One-page profile and risk breakdown for any customer</p>
      </div>

      <div className="flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Customer ID (e.g. #1042)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && search()}
            className="pl-9"
          />
        </div>
        <Button onClick={search}>Search</Button>
      </div>

      {customer ? (
        <div className="bg-card rounded-lg card-shadow overflow-hidden max-w-2xl">
          <div className="bg-primary p-4">
            <p className="text-xs text-primary-foreground/70 font-medium">ChurnShield — Customer Health Report</p>
          </div>

          <div className="p-5 border-b flex flex-wrap justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-card-foreground">{customer.name}</p>
              <p className="text-sm text-muted-foreground">ID: {customer.id} · Joined: {customer.tenure} months ago</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-destructive uppercase">Churn Risk: {customer.risk >= 60 ? "HIGH" : customer.risk >= 35 ? "MEDIUM" : "LOW"}</p>
              <p className="text-2xl font-bold text-card-foreground">{customer.risk}%</p>
              <Progress value={customer.risk} className={`mt-1 h-2 ${customer.risk >= 60 ? "[&>div]:bg-destructive" : customer.risk >= 35 ? "[&>div]:bg-accent" : "[&>div]:bg-success"}`} />
            </div>
          </div>

          <div className="p-5 border-b grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div><p className="text-xs text-muted-foreground">Total Orders</p><p className="font-semibold text-card-foreground">{customer.orders}</p></div>
            <div><p className="text-xs text-muted-foreground">Last Order</p><p className="font-semibold text-card-foreground">{customer.lastOrder} days ago</p></div>
            <div><p className="text-xs text-muted-foreground">Avg Order Value</p><p className="font-semibold text-card-foreground">₹{customer.aov}</p></div>
            <div><p className="text-xs text-muted-foreground">Cashback Usage</p><p className="font-semibold text-card-foreground">{customer.cashback}</p></div>
          </div>

          <div className="p-5 border-b space-y-2">
            <h4 className="text-sm font-semibold text-card-foreground">Risk Factors</h4>
            {customer.lastOrder > 30 && (
              <p className="text-sm text-card-foreground">🔴 Days since last order — <span className="text-destructive font-medium">Critical</span></p>
            )}
            {customer.satisfaction <= 2 && (
              <p className="text-sm text-card-foreground">🟠 Satisfaction score {customer.satisfaction}/5 — <span className="text-accent font-medium">Needs help</span></p>
            )}
            {customer.complaint && (
              <p className="text-sm text-card-foreground">🟡 Complaint filed — <span className="text-warning font-medium">Follow up pending</span></p>
            )}
            {customer.risk < 35 && (
              <p className="text-sm text-success">✅ Customer is healthy — no major risk factors</p>
            )}
          </div>

          <div className="p-5 space-y-3">
            <h4 className="text-sm font-semibold text-card-foreground">Recommended Action</h4>
            <p className="text-sm text-muted-foreground">
              {customer.risk >= 60
                ? "Priority support call + ₹150 loyalty offer"
                : customer.risk >= 35
                  ? "Engagement email series + personalized recommendations"
                  : "Continue nurturing — send loyalty rewards"}
            </p>
            <Button variant="outline" size="sm">📥 Download as PDF</Button>
          </div>
        </div>
      ) : query ? (
        <div className="bg-card rounded-lg p-8 card-shadow max-w-2xl text-center">
          <p className="text-sm text-muted-foreground">No customer found. Try #1042, #2091, or #3344</p>
        </div>
      ) : null}
    </div>
  );
}
