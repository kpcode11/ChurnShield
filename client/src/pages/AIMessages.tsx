import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { generateRetentionMessage } from "@/lib/api";

// Maps UI offer key → human-readable text sent to the backend/LLM
const OFFER_TEXTS: Record<string, string> = {
  "100-cashback":  "₹100 cashback on next order (use code: BACK100, valid 7 days)",
  "200-off":       "₹200 off on next purchase (use code: SAVE200, min order ₹500)",
  "free-delivery": "Free delivery on next 3 orders, no minimum order value required",
};

export default function AIMessages() {
  const [segment,  setSegment]  = useState("at-risk");
  const [channel,  setChannel]  = useState("whatsapp");
  const [offer,    setOffer]    = useState("100-cashback");
  const [tone,     setTone]     = useState("friendly");
  const [language, setLanguage] = useState("english");

  const [message,  setMessage]  = useState<string | null>(null);
  const [source,   setSource]   = useState<string>("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    // Compose tone string (the backend passes it to the LLM prompt as-is)
    const composedTone = language === "hindi"
      ? `${tone}, in Hindi`
      : tone;

    try {
      const res = await generateRetentionMessage({
        customer_segment: segment,
        suggestion:       OFFER_TEXTS[offer] ?? offer,
        tone:             composedTone,
      });
      setMessage(res.message);
      setSource(res.source);
    } catch (e: unknown) {
      const ae = e as { message?: string };
      setError(ae?.message ?? "Generation failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Message Generator</h1>
        <p className="text-sm text-muted-foreground mt-1">Generate personalized retention messages for customer segments</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings */}
        <div className="bg-card rounded-lg p-6 card-shadow space-y-4">
          <h3 className="text-sm font-semibold text-card-foreground">Message Settings</h3>
          {[
            {
              label: "Customer Segment", val: segment, set: setSegment,
              opts: [["at-risk", "At Risk Customers"], ["champions", "Champions"], ["new", "New Customers"], ["lost", "Lost Customers"]],
            },
            {
              label: "Channel", val: channel, set: setChannel,
              opts: [["whatsapp", "WhatsApp"], ["email", "Email"], ["sms", "SMS"]],
            },
            {
              label: "Offer", val: offer, set: setOffer,
              opts: [["100-cashback", "₹100 Cashback"], ["200-off", "₹200 Off"], ["free-delivery", "Free Delivery"]],
            },
            {
              label: "Tone", val: tone, set: setTone,
              opts: [["friendly", "Friendly"], ["urgent", "Urgent"], ["formal", "Formal"]],
            },
            {
              label: "Language", val: language, set: setLanguage,
              opts: [["english", "English"], ["hindi", "Hindi"]],
            },
          ].map(f => (
            <div key={f.label}>
              <Label className="text-xs text-muted-foreground">{f.label}</Label>
              <Select value={f.val} onValueChange={f.set}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {f.opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button className="w-full" onClick={handleGenerate} disabled={loading}>
            {loading ? "⏳ Generating…" : "✨ Generate Message"}
          </Button>
        </div>

        {/* Output */}
        <div>
          {message ? (
            <div className="space-y-4">
              <div className="bg-card rounded-lg p-6 card-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">{channel}</span>
                  {source && (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${source === "ai" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                      {source === "ai" ? "✦ AI generated" : "Template"}
                    </span>
                  )}
                </div>
                <pre className="text-sm text-card-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {message}
                </pre>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline" size="sm"
                  onClick={() => { navigator.clipboard.writeText(message); toast.success("Copied!"); }}
                >
                  📋 Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
                  🔄 Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg p-12 card-shadow flex items-center justify-center">
              <p className="text-sm text-muted-foreground">
                {loading ? "Contacting AI generator…" : "Configure settings and generate a message"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

