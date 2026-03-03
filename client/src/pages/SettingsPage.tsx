import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

export default function SettingsPage() {
  const [aov, setAov] = useState("850");
  const [threshold, setThreshold] = useState([60]);
  const [whatsapp, setWhatsapp] = useState(false);
  const [phone, setPhone] = useState("");

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your ChurnShield preferences</p>
      </div>

      <div className="bg-card rounded-lg p-6 card-shadow space-y-6">
        <div>
          <Label className="text-sm font-medium text-card-foreground">Upload Customer Dataset</Label>
          <p className="text-xs text-muted-foreground mt-1">Replace the default dataset with your own CSV file</p>
          <div className="mt-2 border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
            <p className="text-sm text-muted-foreground">Click to upload or drag & drop</p>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-card-foreground">Average Order Value (₹)</Label>
          <Input value={aov} onChange={e => setAov(e.target.value)} type="number" className="mt-1" />
        </div>

        <div>
          <Label className="text-sm font-medium text-card-foreground">Churn Threshold: {threshold[0]}%</Label>
          <p className="text-xs text-muted-foreground mt-1">Customers above this score are marked as high risk</p>
          <Slider value={threshold} onValueChange={setThreshold} max={100} step={5} className="mt-2" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium text-card-foreground">WhatsApp Alerts</Label>
            <p className="text-xs text-muted-foreground">Get weekly churn summary notifications</p>
          </div>
          <Switch checked={whatsapp} onCheckedChange={setWhatsapp} />
        </div>

        {whatsapp && (
          <div>
            <Label className="text-sm font-medium text-card-foreground">Phone Number</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" className="mt-1" />
          </div>
        )}

        <Button className="w-full" onClick={() => toast.success("Settings saved!")}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
