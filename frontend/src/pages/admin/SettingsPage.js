import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { useTheme } from "../../contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { Check } from "lucide-react";

export default function SettingsPage() {
  const { themeName, themes, updateTheme, settings, updateSettings, fetchSettings } = useTheme();
  const [personalForm, setPersonalForm] = useState({ name: "", email: "" });
  const [businessForm, setBusinessForm] = useState({ business_name: "", business_email: "", business_webpage: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: profile } = await api.get("/profile");
        setPersonalForm({ name: profile.name || "", email: profile.email || "" });
      } catch (e) {}
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if (settings) {
      setBusinessForm({
        business_name: settings.business_name || "",
        business_email: settings.business_email || "",
        business_webpage: settings.business_webpage || "",
      });
    }
  }, [settings]);

  const savePersonal = async () => {
    setLoading(true);
    try {
      await api.put("/profile", { ...personalForm, payment_plan: "Free", payment_details: "" });
      toast.success("Personal information updated");
    } catch (e) { toast.error("Failed to update"); }
    setLoading(false);
  };

  const saveBusiness = async () => {
    setLoading(true);
    try {
      await updateSettings({ ...settings, ...businessForm });
      await fetchSettings();
      toast.success("Business information updated");
    } catch (e) { toast.error("Failed to update"); }
    setLoading(false);
  };

  const themeEntries = Object.entries(themes);

  return (
    <div className="space-y-6 max-w-2xl" data-testid="settings-page">
      <div>
        <h2 className="font-heading text-2xl sm:text-3xl font-light tracking-tight" data-testid="settings-title">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Account & business preferences</p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={personalForm.name} onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })} data-testid="settings-personal-name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={personalForm.email} onChange={(e) => setPersonalForm({ ...personalForm, email: e.target.value })} data-testid="settings-personal-email" />
            </div>
          </div>
          <Button onClick={savePersonal} disabled={loading} size="sm" data-testid="save-personal-btn">Save Personal Info</Button>
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Business Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input value={businessForm.business_name} onChange={(e) => setBusinessForm({ ...businessForm, business_name: e.target.value })} data-testid="settings-business-name" />
          </div>
          <div className="space-y-2">
            <Label>Business Email</Label>
            <Input type="email" value={businessForm.business_email} onChange={(e) => setBusinessForm({ ...businessForm, business_email: e.target.value })} data-testid="settings-business-email" />
          </div>
          <div className="space-y-2">
            <Label>Business Webpage</Label>
            <Input value={businessForm.business_webpage} onChange={(e) => setBusinessForm({ ...businessForm, business_webpage: e.target.value })} placeholder="https://yoursalon.com" data-testid="settings-business-webpage" />
          </div>
          <Button onClick={saveBusiness} disabled={loading} size="sm" data-testid="save-business-btn">Save Business Info</Button>
        </CardContent>
      </Card>

      {/* Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Theme</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {themeEntries.map(([key, theme]) => {
              const isActive = themeName === key;
              const bg = theme.type === "dark" ? "#0B1015" : key === "soft-blush" ? "#FFF5F5" : "#FDFBF7";
              const primary = key === "midnight-luxe" ? "#D4AF37" : key === "soft-blush" ? "#E29578" : "#C87966";
              return (
                <button
                  key={key}
                  onClick={() => updateTheme(key)}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${isActive ? "border-primary shadow-lg scale-[1.02]" : "border-border hover:border-primary/40"}`}
                  data-testid={`theme-${key}`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex gap-2 mb-3">
                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: bg }} />
                    <div className="w-8 h-8 rounded-md" style={{ backgroundColor: primary }} />
                  </div>
                  <p className="font-medium text-sm text-foreground">{theme.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{theme.type === "dark" ? "Dark" : "Light"} theme</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
