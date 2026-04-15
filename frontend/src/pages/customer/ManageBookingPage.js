import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Calendar } from "../../components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Check, X, CalendarDays, Clock, MapPin, AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ManageBookingPage() {
  const { bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [newDate, setNewDate] = useState(null);
  const [newTime, setNewTime] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [settings, setSettings] = useState({ business_name: "LuxeSalon" });

  useEffect(() => {
    fetchBooking();
    axios.get(`${API}/settings`).then((r) => setSettings(r.data)).catch(() => {});
  }, [bookingId]);

  const fetchBooking = async () => {
    try {
      const { data } = await axios.get(`${API}/bookings/${bookingId}`);
      setBooking(data);
    } catch (e) {
      setError("Booking not found");
    }
    setLoading(false);
  };

  const verifyPhone = () => {
    if (booking?.customer_info?.phone === phone) {
      setVerified(true);
      setError("");
    } else {
      setError("Phone number does not match booking");
    }
  };

  useEffect(() => {
    if (newDate && booking) {
      const dateStr = format(newDate, "yyyy-MM-dd");
      axios.get(`${API}/timeslots`, { params: { location_id: booking.location_id, date: dateStr, duration: booking.total_duration } })
        .then((r) => setTimeSlots(r.data))
        .catch(() => setTimeSlots([]));
    }
  }, [newDate, booking]);

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await axios.put(`${API}/bookings/${bookingId}/cancel`, { phone });
      toast.success("Booking cancelled. A cancellation notice has been sent to your WhatsApp.");
      await fetchBooking();
      setCancelDialogOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to cancel");
    }
    setActionLoading(false);
  };

  const handleReschedule = async () => {
    if (!newDate || !newTime) return;
    setActionLoading(true);
    try {
      await axios.put(`${API}/bookings/${bookingId}/reschedule`, {
        phone,
        new_date: format(newDate, "yyyy-MM-dd"),
        new_time_slot: newTime
      });
      toast.success("Booking rescheduled! Updated details sent to your WhatsApp.");
      await fetchBooking();
      setRescheduleDialogOpen(false);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to reschedule");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading booking...</div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" data-testid="booking-not-found">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-4">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto" />
            <h2 className="font-heading text-2xl">Booking Not Found</h2>
            <p className="text-muted-foreground">The booking you're looking for doesn't exist or has been removed.</p>
            <Button variant="outline" onClick={() => window.location.href = "/book"} data-testid="back-to-booking-btn">Book New Appointment</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors = {
    confirmed: "bg-green-100 text-green-800 border-green-200",
    rescheduled: "bg-blue-100 text-blue-800 border-blue-200",
    cancelled: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <div className="min-h-screen bg-background" data-testid="manage-booking-page">
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-heading text-xl font-semibold tracking-tight">{settings.business_name}</h1>
          <a href="/book" className="text-sm text-primary hover:underline" data-testid="book-new-link">Book New</a>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h2 className="font-heading text-2xl font-light">Manage Your Booking</h2>

        {!verified ? (
          <Card data-testid="verify-phone-card">
            <CardContent className="py-6 space-y-4">
              <p className="text-sm text-muted-foreground">Please verify your phone number to manage this booking.</p>
              {error && <p className="text-sm text-destructive" data-testid="verify-error">{error}</p>}
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" data-testid="verify-phone-input" />
              </div>
              <Button onClick={verifyPhone} data-testid="verify-phone-btn">Verify & View Booking</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Booking Details */}
            <Card data-testid="booking-details-card">
              <CardContent className="py-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">Booking Details</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[booking.status] || "bg-secondary text-foreground"}`} data-testid="booking-status-badge">
                    {booking.status}
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    <span>{booking.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{booking.time_slot} ({booking.total_duration} min)</span>
                  </div>
                </div>
                <div className="space-y-1 pt-2 border-t border-border">
                  {booking.services?.map((s, i) => (
                    <div key={i} className="text-sm">
                      {s.name} — &#8377;{s.price}
                      {s.add_ons?.map((ao, j) => (
                        <span key={j} className="block ml-4 text-xs text-muted-foreground">+ {ao.name} — &#8377;{ao.price}</span>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border">
                  <span className="font-semibold">Total: &#8377;{booking.total_price}</span>
                  <Badge variant="outline" className="text-xs">
                    Payment: {booking.payment_status || "completed"}
                  </Badge>
                </div>

                {booking.previous_date && (
                  <div className="p-3 bg-secondary/50 rounded-lg text-xs text-muted-foreground">
                    Previously scheduled: {booking.previous_date} at {booking.previous_time}
                  </div>
                )}

                {/* WhatsApp Notifications */}
                {booking.notifications && (
                  <div className="space-y-1 pt-2 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications (MOCKED)</p>
                    {booking.notifications.map((n, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`w-1.5 h-1.5 rounded-full ${n.status === "sent" ? "bg-green-500" : "bg-yellow-500"}`} />
                        {n.type}: {n.status}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            {booking.status !== "cancelled" && (
              <div className="flex gap-3" data-testid="booking-actions">
                <Button variant="outline" className="flex-1" onClick={() => setRescheduleDialogOpen(true)} data-testid="reschedule-btn">
                  <CalendarDays className="w-4 h-4 mr-2" /> Reschedule
                </Button>
                <Button variant="destructive" className="flex-1" onClick={() => setCancelDialogOpen(true)} data-testid="cancel-btn">
                  <X className="w-4 h-4 mr-2" /> Cancel Booking
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to cancel this appointment? A cancellation notice will be sent to your WhatsApp.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep Booking</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={actionLoading} data-testid="confirm-cancel-btn">
              {actionLoading ? "Cancelling..." : "Yes, Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={newDate}
                onSelect={(d) => { setNewDate(d); setNewTime(null); }}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              />
            </div>
            {newDate && (
              <>
                <p className="text-sm font-medium">{format(newDate, "EEEE, MMMM d, yyyy")}</p>
                {timeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No available slots</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2" data-testid="reschedule-time-slots">
                    {timeSlots.map((slot) => (
                      <Button key={slot} variant={newTime === slot ? "default" : "outline"} size="sm" onClick={() => setNewTime(slot)}>
                        {slot}
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleReschedule} disabled={!newDate || !newTime || actionLoading} data-testid="confirm-reschedule-btn">
              {actionLoading ? "Rescheduling..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
