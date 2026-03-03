import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FileUp } from "lucide-react";
import { bulkPredict } from "@/lib/api";

type Step = "upload" | "ready" | "loading" | "done";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BulkPrediction() {
  const [step, setStep]         = useState<Step>("upload");
  const [file, setFile]         = useState<File | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const inputRef                = useRef<HTMLInputElement>(null);
  const abortRef                = useRef<AbortController | null>(null);

  const handleFileSelect = (selected: File | null) => {
    if (!selected) return;
    if (!selected.name.endsWith(".csv")) {
      setError("Only .csv files are supported.");
      return;
    }
    setFile(selected);
    setError(null);
    setStep("ready");
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files[0] ?? null);
  };

  const handlePredict = async () => {
    if (!file) return;
    setStep("loading");
    setError(null);

    abortRef.current = new AbortController();
    try {
      const blob = await bulkPredict(file, abortRef.current.signal);
      triggerDownload(blob, "churnshield_results.xlsx");
      setStep("done");
    } catch (e: unknown) {
      const ae = e as { message?: string; status?: number };
      if (ae?.status !== 0) {          // ignore abort
        setError(ae?.message ?? "Upload failed. Is the backend running?");
        setStep("ready");
      }
    }
  };

  const reset = () => {
    setFile(null);
    setStep("upload");
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bulk CSV Prediction</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload thousands of customers and get scored predictions</p>
      </div>

      {/* Hidden real file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
      />

      {step === "upload" && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          className="bg-card rounded-lg card-shadow border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer p-16 flex flex-col items-center justify-center text-center"
        >
          <FileUp className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-base font-medium text-card-foreground">Drag & drop your CSV here</p>
          <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
          <p className="text-xs text-muted-foreground mt-3">Supported format: .csv | Max: 50MB</p>
        </div>
      )}

      {step === "ready" && file && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg card-shadow p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-card-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB · ready to score</p>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>✕ Remove</Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button onClick={handlePredict} className="w-full sm:w-auto">
            ⚡ Run Churn Prediction
          </Button>
        </div>
      )}

      {step === "loading" && (
        <div className="bg-card rounded-lg p-10 card-shadow text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
          <p className="text-sm font-medium text-card-foreground">Scoring customers…</p>
          <p className="text-xs text-muted-foreground">The backend is running predictions. This may take a moment.</p>
          <Button variant="ghost" size="sm" onClick={() => { abortRef.current?.abort(); reset(); }}>
            Cancel
          </Button>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4">
          <div className="bg-card rounded-lg p-8 card-shadow text-center space-y-3">
            <p className="text-3xl">✅</p>
            <p className="text-base font-semibold text-card-foreground">Predictions complete!</p>
            <p className="text-sm text-muted-foreground">
              Your scored Excel file has been downloaded automatically. It includes churn probability,
              risk level (Low / Medium / High), and a suggested retention action for each customer.
            </p>
            <Button onClick={reset} variant="outline" size="sm" className="mt-2">
              📂 Score another file
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

