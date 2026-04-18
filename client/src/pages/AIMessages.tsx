import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { generateRetentionMessage, sendRetentionMessage, type MessageDelivery } from "@/lib/api";

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

  const [phone,    setPhone]    = useState("");

  const [message,  setMessage]  = useState<string | null>(null);
  const [source,   setSource]   = useState<string>("");
  const [loading,  setLoading]  = useState(false);
  const [sending,  setSending]  = useState(false);
  const [delivery, setDelivery] = useState<MessageDelivery | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const composedTone = language === "hindi" ? `${tone}, in Hindi` : tone;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    setDelivery(null);

    try {
      const res = await generateRetentionMessage({
        customer_segment: segment,
        suggestion:       OFFER_TEXTS[offer] ?? offer,
        tone:             composedTone,
        channel:          channel.toUpperCase(),
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

  const handleSend = async () => {
    if (!message) return;
    const trimmed = phone.trim();
    if (!trimmed) { toast.error("Enter a phone number before sending."); return; }
    if (!/^\+\d{7,15}$/.test(trimmed)) {
      toast.error("Phone must be in E.164 format, e.g. +919876543210");
      return;
    }
    setSending(true);
    setDelivery(null);
    try {
      const res = await sendRetentionMessage({
        customer_segment: segment,
        suggestion:       OFFER_TEXTS[offer] ?? offer,
        to_number:        trimmed,
        tone:             composedTone,
        channel:          channel.toUpperCase(),
      });
      setDelivery(res.delivery);
      if (res.delivery.success) {
        toast.success(`Sent! Twilio SID: ${res.delivery.sid}`);
      } else {
        toast.error(`Send failed: ${res.delivery.error ?? "unknown error"}`);
      }
    } catch (e: unknown) {
      const ae = e as { message?: string };
      toast.error(ae?.message ?? "Send failed. Check Twilio credentials.");
    } finally {
      setSending(false);
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

          {/* Phone number for WhatsApp dispatch */}
          <div>
            <Label className="text-xs text-muted-foreground">WhatsApp Number (E.164)</Label>
            <Input
              className="mt-1 font-mono text-sm"
              placeholder="+919876543210"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button className="w-full" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating…" : "Generate Message"}
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
                      {source === "ai" ? "AI generated" : "Template"}
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
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={sending || !phone.trim()}
                >
                  {sending ? "Sending…" : "Send via WhatsApp"}
                </Button>
              </div>

              {/* Delivery status badge */}
              {delivery && (
                <div className={`text-xs rounded-md px-3 py-2 ${
                  delivery.success
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {delivery.success ? (
                    <>
                      <span className="font-semibold">Delivered</span>
                      {" — "}
                      <span className="font-mono">{delivery.sid}</span>
                      {" "}
                      <span className="opacity-70">({delivery.status})</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">Failed</span>
                      {" — "}{delivery.error}
                    </>
                  )}
                </div>
              )}
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

