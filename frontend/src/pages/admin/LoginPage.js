import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";

function formatError(detail) {
  if (!detail) return "Something went wrong";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg || JSON.stringify(d)).join(" ");
  return String(detail);
}

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/admin/schedule");
    } catch (err) {
      setError(formatError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      await register(name, email, password, businessName);
      navigate("/admin/schedule");
    } catch (err) {
      setError(formatError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="login-page">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-heading text-2xl">{isSignup ? "Create Account" : "Admin Login"}</CardTitle>
          <CardDescription>{isSignup ? "Sign up to start managing your salon" : "Sign in to manage your salon"}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Tabs */}
          <div className="flex mb-6 border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => { setIsSignup(false); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${!isSignup ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              data-testid="login-tab"
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignup(true); setError(""); }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${isSignup ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
              data-testid="signup-tab"
            >
              Sign Up
            </button>
          </div>

          {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg mb-4" data-testid="auth-error">{error}</div>}

          {isSignup ? (
            <form onSubmit={handleSignup} className="space-y-4" data-testid="signup-form">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <Input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required data-testid="signup-name-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-business">Business Name</Label>
                <Input id="signup-business" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your salon name" data-testid="signup-business-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required data-testid="signup-email-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required data-testid="signup-password-input" />
              </div>
              <div className="p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Free Trial — 1 month</p>
                <p>Unlimited locations, all features. After trial: ₹1,000/location/month.</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="signup-submit-button">
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@salon.com" required data-testid="login-email-input" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required data-testid="login-password-input" />
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="login-submit-button">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
