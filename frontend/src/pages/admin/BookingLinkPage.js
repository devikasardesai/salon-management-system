import React, { useState, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function BookingLinkPage() {
  const { settings } = useTheme();
  const [copied, setCopied] = useState(false);

  const bookingUrl = `${window.location.origin}/book`;
  const websiteUrl = settings?.business_webpage || "";

  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl" data-testid="booking-link-page">
      <div>
        <h2 className="font-heading text-2xl sm:text-3xl font-light tracking-tight" data-testid="booking-link-title">Booking Link</h2>
        <p className="text-sm text-muted-foreground mt-1">Share this link with your customers to book appointments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            Customer Booking Page
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with your customers so they can book appointments directly.
          </p>
          <div className="flex gap-2">
            <Input value={bookingUrl} readOnly className="bg-secondary/30 font-mono text-sm" data-testid="booking-link-input" />
            <Button onClick={copyLink} variant={copied ? "default" : "outline"} className="flex-shrink-0" data-testid="copy-booking-link-btn">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <Button variant="outline" asChild data-testid="open-booking-link-btn">
            <a href="/book" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" /> Open Booking Page
            </a>
          </Button>
        </CardContent>
      </Card>

      {websiteUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              Website
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Your business website with integrated booking.</p>
            <div className="flex gap-2">
              <Input value={websiteUrl} readOnly className="bg-secondary/30 font-mono text-sm" data-testid="website-link-input" />
              <Button variant="outline" asChild className="flex-shrink-0" data-testid="open-website-btn">
                <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> Visit
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
