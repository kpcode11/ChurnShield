import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileUp } from "lucide-react";

export default function BulkPrediction() {
  const [step, setStep] = useState<"upload" | "preview" | "processing" | "done">("upload");
  const [progress, setProgress] = useState(0);

  const handleUpload = () => {
    setStep("preview");
  };

  const runPrediction = () => {
    setStep("processing");
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => setStep("done"), 500);
      }
      setProgress(Math.min(p, 100));
    }, 300);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bulk CSV Prediction</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload thousands of customers and get scored predictions</p>
      </div>

      {step === "upload" && (
        <div
          onClick={handleUpload}
          className="bg-card rounded-lg card-shadow border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer p-16 flex flex-col items-center justify-center text-center"
        >
          <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-base font-medium text-card-foreground">Drag & drop your CSV here</p>
          <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          <p className="text-xs text-muted-foreground mt-3">Supported format: .csv | Max: 50MB</p>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg card-shadow overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold text-card-foreground">Preview — customer_data.csv</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {["CustomerID", "Tenure", "Satisfaction", "DaysSinceOrder", "CityTier", "Cashback"].map(h => (
                      <th key={h} className="text-left p-3 font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["#1001", "14", "2", "47", "1", "₹95"],
                    ["#1002", "28", "4", "12", "2", "₹210"],
                    ["#1003", "6", "1", "55", "3", "₹50"],
                    ["#1004", "35", "5", "3", "1", "₹340"],
                    ["#1005", "9", "3", "31", "2", "₹120"],
                  ].map((row, i) => (
                    <tr key={i} className="border-b last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="p-3 text-card-foreground">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Button onClick={runPrediction} className="w-full sm:w-auto">
            ⚡ Run Churn Prediction on 12,450 customers
          </Button>
        </div>
      )}

      {step === "processing" && (
        <div className="bg-card rounded-lg p-8 card-shadow text-center space-y-4">
          <p className="text-sm font-medium text-card-foreground">Processing...</p>
          <Progress value={progress} className="h-3" />
          <p className="text-xs text-muted-foreground">{Math.round(progress * 124.5)} / 12,450 customers</p>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "🟢 Low", count: "6,230", pct: "50.1%", color: "border-l-success" },
              { label: "🟡 Medium", count: "3,890", pct: "31.2%", color: "border-l-accent" },
              { label: "🔴 High", count: "2,330", pct: "18.7%", color: "border-l-destructive" },
            ].map(s => (
              <div key={s.label} className={`bg-card rounded-lg p-5 card-shadow border-l-4 ${s.color} text-center`}>
                <p className="text-lg font-bold text-card-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-card-foreground mt-1">{s.count}</p>
                <p className="text-sm text-muted-foreground">{s.pct}</p>
              </div>
            ))}
          </div>
          <Button className="w-full sm:w-auto">⬇️ Download Full Report (.xlsx)</Button>
        </div>
      )}
    </div>
  );
}
