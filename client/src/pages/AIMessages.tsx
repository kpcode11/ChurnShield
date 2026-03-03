import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const messages: Record<string, string> = {
  "friendly-english": `Hi Rahul! 👋

We noticed it's been a while since your last order and we genuinely miss you!

As a thank-you for being a valued customer, here's ₹100 cashback waiting for you on your next order.

Use code: BACK100  (valid 7 days)

Tap below to shop now 🛍️`,
  "urgent-english": `Dear Valued Customer,

We noticed your account has been inactive. We'd hate to lose you!

Here's an exclusive ₹100 cashback — valid for the next 48 hours only.

Code: URGENT100

Don't miss out — shop now!`,
  "friendly-hindi": `नमस्ते राहुल! 👋

हमने देखा कि आपने कुछ समय से ऑर्डर नहीं किया। हम आपकी कमी महसूस कर रहे हैं!

आपके अगले ऑर्डर पर ₹100 कैशबैक का इंतजार कर रहा है।

कोड: BACK100 (7 दिन के लिए वैध)

अभी शॉपिंग करें 🛍️`,
};

export default function AIMessages() {
  const [segment, setSegment] = useState("at-risk");
  const [channel, setChannel] = useState("whatsapp");
  const [offer, setOffer] = useState("100-cashback");
  const [tone, setTone] = useState("friendly");
  const [language, setLanguage] = useState("english");
  const [generated, setGenerated] = useState(false);

  const messageKey = `${tone}-${language}`;
  const message = messages[messageKey] || messages["friendly-english"];

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
            { label: "Customer Segment", val: segment, set: setSegment, opts: [["at-risk", "At Risk Customers"], ["champions", "Champions"], ["new", "New Customers"], ["lost", "Lost Customers"]] },
            { label: "Channel", val: channel, set: setChannel, opts: [["whatsapp", "WhatsApp"], ["email", "Email"], ["sms", "SMS"]] },
            { label: "Offer", val: offer, set: setOffer, opts: [["100-cashback", "₹100 Cashback"], ["200-off", "₹200 Off"], ["free-delivery", "Free Delivery"]] },
            { label: "Tone", val: tone, set: setTone, opts: [["friendly", "Friendly"], ["urgent", "Urgent"], ["formal", "Formal"]] },
            { label: "Language", val: language, set: setLanguage, opts: [["english", "English"], ["hindi", "Hindi"]] },
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

          <Button className="w-full" onClick={() => setGenerated(true)}>✨ Generate Message</Button>
        </div>

        {/* Output */}
        <div>
          {generated ? (
            <div className="space-y-4">
              <div className="bg-card rounded-lg p-6 card-shadow">
                <pre className="text-sm text-card-foreground whitespace-pre-wrap font-sans leading-relaxed">
                  {message}
                </pre>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(message); toast.success("Copied!"); }}>
                  📋 Copy
                </Button>
                <Button variant="outline" size="sm">📤 Export to CSV</Button>
                <Button variant="outline" size="sm" onClick={() => setGenerated(true)}>🔄 Regenerate</Button>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-lg p-12 card-shadow flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Configure settings and generate a message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
