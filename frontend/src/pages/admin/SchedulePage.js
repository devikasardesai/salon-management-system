import React, { useState, useEffect, useMemo } from "react";
import api from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Calendar as CalendarIcon, Clock, User, MapPin, X, CalendarDays } from "lucide-react";
import { Calendar } from "../../components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";
import { toast } from "sonner";

export default function SchedulePage() {
  const [bookings, setBookings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [newDate, setNewDate] = useState(null);
  const [newTime, setNewTime] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [selectedLocation]);

  const fetchLocations = async () => {
    try {
      const { data } = await api.get("/locations");
      setLocations(data);
    } catch (e) { console.error(e); }
  };

  const fetchBookings = async () => {
    try {
      const params = selectedLocation !== "all" ? { location_id: selectedLocation } : {};
      const { data } = await api.get("/bookings", { params });
      setBookings(data);
    } catch (e) { console.error(e); }
  };

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 9 AM to 6 PM

  const getBookingsForDay = (day) => {
    return bookings.filter((b) => {
      try { return isSameDay(parseISO(b.date), day); } catch { return false; }
    });
  };

  const getLocationName = (id) => locations.find((l) => l.id === id)?.name || "Unknown";

  const openCancelDialog = (b) => { setSelectedBooking(b); setCancelDialogOpen(true); };
  const openRescheduleDialog = (b) => { setSelectedBooking(b); setNewDate(null); setNewTime(null); setRescheduleDialogOpen(true); };

  const handleAdminCancel = async () => {
    if (!selectedBooking) return;
    setActionLoading(true);
    try {
      await api.put(`/bookings/${selectedBooking.id}/admin-cancel`);
      toast.success("Booking cancelled");
      fetchBookings();
      setCancelDialogOpen(false);
    } catch (e) {
      toast.error("Failed to cancel");
    }
    setActionLoading(false);
  };

  useEffect(() => {
    if (newDate && selectedBooking) {
      const dateStr = format(newDate, "yyyy-MM-dd");
      api.get("/timeslots", { params: { location_id: selectedBooking.location_id, date: dateStr, duration: selectedBooking.total_duration || 60 } })
        .then((r) => setTimeSlots(r.data))
        .catch(() => setTimeSlots([]));
    }
  }, [newDate, selectedBooking]);

  const handleAdminReschedule = async () => {
    if (!selectedBooking || !newDate || !newTime) return;
    setActionLoading(true);
    try {
      await api.put(`/bookings/${selectedBooking.id}/admin-reschedule`, {
        phone: selectedBooking.customer_info?.phone || "",
        new_date: format(newDate, "yyyy-MM-dd"),
        new_time_slot: newTime
      });
      toast.success("Booking rescheduled");
      fetchBookings();
      setRescheduleDialogOpen(false);
    } catch (e) {
      toast.error("Failed to reschedule");
    }
    setActionLoading(false);
  };

  const statusColor = (status) => {
    const map = { confirmed: "default", rescheduled: "secondary", cancelled: "destructive" };
    return map[status] || "secondary";
  };

  return (
    <div className="space-y-6" data-testid="schedule-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-light tracking-tight" data-testid="schedule-title">Schedule</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your appointments</p>
        </div>
        <Select value={selectedLocation} onValueChange={setSelectedLocation} data-testid="location-filter-select">
          <SelectTrigger className="w-[220px]" data-testid="location-filter-trigger">
            <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-4">
        <button onClick={() => setCurrentDate(addDays(currentDate, -7))} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="prev-week-btn">&larr; Prev Week</button>
        <span className="text-sm font-medium">{format(weekDays[0], "MMM d")} - {format(weekDays[6], "MMM d, yyyy")}</span>
        <button onClick={() => setCurrentDate(addDays(currentDate, 7))} className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="next-week-btn">Next Week &rarr;</button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day headers */}
          <div className="grid grid-cols-8 gap-px bg-border rounded-t-lg overflow-hidden">
            <div className="bg-card p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</div>
            {weekDays.map((day, i) => (
              <div key={i} className={`bg-card p-3 text-center ${isSameDay(day, new Date()) ? "bg-primary/10" : ""}`}>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{format(day, "EEE")}</div>
                <div className={`text-lg font-medium mt-1 ${isSameDay(day, new Date()) ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</div>
              </div>
            ))}
          </div>

          {/* Time slots */}
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 gap-px bg-border">
              <div className="bg-card p-2 text-xs text-muted-foreground flex items-start pt-3">
                {`${hour.toString().padStart(2, "0")}:00`}
              </div>
              {weekDays.map((day, di) => {
                const dayBookings = getBookingsForDay(day).filter((b) => {
                  const [h] = (b.time_slot || "").split(":");
                  return parseInt(h) === hour;
                });
                return (
                  <div key={di} className="bg-card p-1 min-h-[60px] relative">
                    {dayBookings.map((b) => {
                      const heightBlocks = Math.max(1, Math.ceil((b.total_duration || 60) / 60));
                      return (
                        <div
                          key={b.id}
                          className="absolute inset-x-1 bg-primary/15 border border-primary/30 rounded-md p-1.5 z-10 overflow-hidden"
                          style={{ height: `${heightBlocks * 60 - 8}px` }}
                          data-testid={`booking-block-${b.id}`}
                        >
                          <p className="text-xs font-medium text-foreground truncate">{b.customer_info?.full_name}</p>
                          <p className="text-[10px] text-muted-foreground">{b.time_slot} - {b.total_duration}min</p>
                          <p className="text-[10px] text-muted-foreground truncate">{getLocationName(b.location_id)}</p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bookings list */}
      <div className="space-y-3">
        <h3 className="font-heading text-lg font-medium">Upcoming Appointments</h3>
        {bookings.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No appointments found</CardContent></Card>
        ) : (
          bookings.map((b) => (
            <Card key={b.id} data-testid={`booking-card-${b.id}`}>
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-medium">{b.customer_info?.full_name}</span>
                    <Badge variant={statusColor(b.status)} className="text-xs">{b.status}</Badge>
                    {b.payment_status && <Badge variant="outline" className="text-xs">&#8377;{b.total_price}</Badge>}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {b.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.time_slot}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {getLocationName(b.location_id)}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {b.services?.map((s) => s.name).join(", ")} &middot; {b.total_duration} min
                  </div>
                </div>
                {b.status !== "cancelled" && (
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openRescheduleDialog(b)} data-testid={`admin-reschedule-${b.id}`}>
                      <CalendarDays className="w-3 h-3 mr-1" /> Reschedule
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => openCancelDialog(b)} data-testid={`admin-cancel-${b.id}`}>
                      <X className="w-3 h-3 mr-1" /> Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Admin Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Cancel appointment for <strong>{selectedBooking?.customer_info?.full_name}</strong> on {selectedBooking?.date} at {selectedBooking?.time_slot}?
            A cancellation notice will be sent to the customer's WhatsApp.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>Keep</Button>
            <Button variant="destructive" onClick={handleAdminCancel} disabled={actionLoading} data-testid="admin-confirm-cancel-btn">
              {actionLoading ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reschedule Booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">
            Rescheduling for <strong>{selectedBooking?.customer_info?.full_name}</strong>
          </p>
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
                  <div className="grid grid-cols-3 gap-2">
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
            <Button onClick={handleAdminReschedule} disabled={!newDate || !newTime || actionLoading} data-testid="admin-confirm-reschedule-btn">
              {actionLoading ? "Rescheduling..." : "Confirm Reschedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
