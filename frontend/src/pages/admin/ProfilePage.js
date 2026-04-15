import React, { useState, useEffect } from "react";
import api from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";

export default function ProfilePage() {
  const [form, setForm] = useState({ name: "", email: "", payment_plan: "Free", payment_details: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      const { data } = await api.get("/profile");
      setForm({ name: data.name || "", email: data.email || "", payment_plan: data.payment_plan || "Free", payment_details: data.payment_details || "" });
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
    <div className="space-y-6 max-w-2xl" data-testid="profile-page">
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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment Plan</Label>
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
