import React, { useState, useEffect, useMemo } from "react";
import api from "../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { Calendar, Clock, User, MapPin } from "lucide-react";
import { format, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";

export default function SchedulePage() {
  const [bookings, setBookings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [currentDate, setCurrentDate] = useState(new Date());

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
                    <Badge variant={b.status === "confirmed" ? "default" : "secondary"} className="text-xs">{b.status}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {b.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.time_slot}</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {getLocationName(b.location_id)}</span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {b.services?.map((s, i) => s.name).join(", ")} &middot; {b.total_duration} min &middot; &#8377;{b.total_price}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
