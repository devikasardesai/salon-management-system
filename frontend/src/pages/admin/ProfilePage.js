import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import { Check } from "lucide-react";

export default function ProfilePage() {
  const [form, setForm] = useState({ name: "", email: "", payment_plan: "Free Trial", payment_details: "" });
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchPlans();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get("/profile");
      setForm({ name: data.name || "", email: data.email || "", payment_plan: data.payment_plan || "Free Trial", payment_details: data.payment_details || "" });
    } catch (e) { console.error(e); }
  };

  const fetchPlans = async () => {
    try {
      const { data } = await api.get("/payment-plans");
      setPlans(data);
    } catch (e) { console.error(e); }
  };

  const save = async () => {
    setLoading(true);
    try {
      await api.put("/profile", form);
      toast.success("Profile updated");
    } catch (e) { toast.error("Failed to update"); }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl" data-testid="profile-page">
      <div>
        <h2 className="font-heading text-2xl sm:text-3xl font-light tracking-tight" data-testid="profile-title">Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Your account information</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="profile-name-input" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="profile-email-input" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Plans */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {plans.map((plan) => {
              const isActive = form.payment_plan.toLowerCase().includes(plan.id.replace("_", " "));
              return (
                <div
                  key={plan.id}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${isActive ? "border-primary shadow-md" : "border-border hover:border-primary/30"}`}
                  data-testid={`plan-${plan.id}`}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2">
                      <Badge className="text-xs">Current</Badge>
                    </div>
                  )}
                  <h4 className="font-medium text-foreground">{plan.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{plan.duration}</p>
                  {plan.price_per_location !== null ? (
                    <p className="text-lg font-semibold text-primary mt-2">
                      {plan.price_per_location === 0 ? "Free" : `₹${plan.price_per_location}`}
                      <span className="text-xs font-normal text-muted-foreground">/location/month</span>
                    </p>
                  ) : (
                    <p className="text-lg font-semibold text-primary mt-2">Custom</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">{plan.description}</p>
                  <ul className="mt-3 space-y-1">
                    {plan.features?.map((f, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-primary" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <Input value={form.payment_plan} onChange={(e) => setForm({ ...form, payment_plan: e.target.value })} data-testid="profile-plan-input" />
            </div>
            <div className="space-y-2">
              <Label>Payment Details</Label>
              <Input value={form.payment_details} onChange={(e) => setForm({ ...form, payment_details: e.target.value })} placeholder="Card ending in ****" data-testid="profile-payment-input" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Button onClick={save} disabled={loading} data-testid="save-profile-btn">{loading ? "Saving..." : "Save Profile"}</Button>
    </div>
  );
}
