import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Checkbox } from "../../components/ui/checkbox";
import { Calendar } from "../../components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { MapPin, Clock, ChevronRight, ChevronLeft, Check, ShoppingCart, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { API_URL } from "../../lib/api";

const API = `${API_URL}/api`;

const STEPS = ["location", "services", "datetime", "confirm"];
const STEP_LABELS = ["Select Location", "Choose Services", "Date & Time", "Confirm Booking"];

export default function BookingPage() {
  const [settings, setSettings] = useState({ business_name: "LuxeSalon", theme: "earthy-minimal" });
  const [locations, setLocations] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [step, setStep] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ full_name: "", phone: "", email: "", whatsapp: "", same_as_phone: false });
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  useEffect(() => {
    axios.get(`${API}/settings`).then((r) => setSettings(r.data)).catch(() => {});
    axios.get(`${API}/locations`).then((r) => setLocations(r.data)).catch(() => {});
    axios.get(`${API}/services`).then((r) => setAllServices(r.data)).catch(() => {});
  }, []);

  const availableServices = useMemo(() => {
    if (!selectedLocation) return [];
    return allServices.filter((s) => s.locations?.includes(selectedLocation.id));
  }, [selectedLocation, allServices]);

  const totalPrice = useMemo(() => {
    return cart.reduce((sum, item) => {
      let price = item.service.price;
      item.selectedAddOns.forEach((ao) => { price += ao.price; });
      return sum + price;
    }, 0);
  }, [cart]);

  const totalDuration = useMemo(() => {
    return cart.reduce((sum, item) => {
      let dur = item.service.duration_minutes;
      item.selectedAddOns.forEach((ao) => { dur += ao.duration_minutes; });
      return sum + dur;
    }, 0);
  }, [cart]);

  useEffect(() => {
    if (selectedDate && selectedLocation && totalDuration > 0) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      axios.get(`${API}/timeslots`, { params: { location_id: selectedLocation.id, date: dateStr, duration: totalDuration } })
        .then((r) => setTimeSlots(r.data))
        .catch(() => setTimeSlots([]));
    }
  }, [selectedDate, selectedLocation, totalDuration]);

  const toggleService = (svc) => {
    const exists = cart.find((c) => c.service.id === svc.id);
    if (exists) {
      setCart(cart.filter((c) => c.service.id !== svc.id));
    } else {
      setCart([...cart, { service: svc, selectedAddOns: [] }]);
    }
  };

  const toggleAddOn = (svcId, addOn) => {
    setCart(cart.map((c) => {
      if (c.service.id !== svcId) return c;
      const hasIt = c.selectedAddOns.find((ao) => ao.id === addOn.id);
      return {
        ...c,
        selectedAddOns: hasIt ? c.selectedAddOns.filter((ao) => ao.id !== addOn.id) : [...c.selectedAddOns, addOn],
      };
    }));
  };

  const validatePhone = (val) => {
    const regex = /^\+91\d{10}$/;
    return regex.test(val);
  };

  const handlePhoneChange = (val) => {
    setCustomerInfo((p) => {
      const updated = { ...p, phone: val };
      if (p.same_as_phone) updated.whatsapp = val;
      return updated;
    });
    setPhoneError(val && !validatePhone(val) ? "Format: +91 followed by 10 digits" : "");
  };

  const handleWhatsappChange = (val) => {
    setCustomerInfo((p) => ({ ...p, whatsapp: val }));
    setWhatsappError(val && !validatePhone(val) ? "Format: +91 followed by 10 digits" : "");
  };

  const handleSameAsPhone = (checked) => {
    setCustomerInfo((p) => ({
      ...p,
      same_as_phone: checked,
      whatsapp: checked ? p.phone : p.whatsapp,
    }));
    if (checked) setWhatsappError("");
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedLocation;
      case 1: return cart.length > 0;
      case 2: return !!selectedDate && !!selectedTime;
      case 3:
        return customerInfo.full_name.trim() &&
          validatePhone(customerInfo.phone) &&
          validatePhone(customerInfo.whatsapp) &&
          customerInfo.same_as_phone;
      default: return false;
    }
  };

  const submitBooking = async () => {
    if (!canProceed()) return;
    setPaymentDialogOpen(true);
  };

  const processPayment = async () => {
    setPaymentProcessing(true);
    try {
      // Step 1: Create mock Razorpay order
      const { data: order } = await axios.post(`${API}/payments/create-order`, {
        booking_id: "pending",
        amount: totalPrice
      });
      // Step 2: Create booking
      const payload = {
        location_id: selectedLocation.id,
        services: cart.map((c) => ({
          id: c.service.id,
          name: c.service.name,
          price: c.service.price,
          duration_minutes: c.service.duration_minutes,
          add_ons: c.selectedAddOns,
        })),
        date: format(selectedDate, "yyyy-MM-dd"),
        time_slot: selectedTime,
        total_price: totalPrice,
        total_duration: totalDuration,
        customer_info: customerInfo,
        payment_status: "completed",
      };
      const { data: bookingData } = await axios.post(`${API}/bookings`, payload);
      // Step 3: Verify mock payment
      await axios.post(`${API}/payments/verify?order_id=${order.order_id}&booking_id=${bookingData.id}`);
      setBookingResult(bookingData);
      setBookingSuccess(true);
      setPaymentDialogOpen(false);
      toast.success("Payment successful! Booking confirmed!");
    } catch (e) {
      toast.error("Payment failed. Please try again.");
    }
    setPaymentProcessing(false);
  };

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" data-testid="booking-success">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <h2 className="font-heading text-2xl font-light">Booking Confirmed!</h2>
            <p className="text-muted-foreground">
              Your appointment at <strong>{selectedLocation?.name}</strong> on{" "}
              <strong>{selectedDate && format(selectedDate, "PPP")}</strong> at <strong>{selectedTime}</strong> has been confirmed.
            </p>
            <p className="text-sm text-muted-foreground">
              A confirmation message has been sent to your WhatsApp ({customerInfo.whatsapp}).
              You will receive reminders 1 hour and 30 minutes before your appointment.
            </p>
            <div className="p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Payment: &#8377;{totalPrice} (MOCK Razorpay)</p>
              <p>Payment processed successfully via Razorpay (mocked)</p>
            </div>
            <p className="text-lg font-semibold text-primary">Total: &#8377;{totalPrice}</p>
            {bookingResult?.id && (
              <Button variant="outline" onClick={() => window.location.href = `/manage-booking/${bookingResult.id}`} data-testid="manage-booking-btn">
                Manage Booking (Cancel/Reschedule)
              </Button>
            )}
            <Button onClick={() => window.location.reload()} variant="ghost" className="text-sm" data-testid="book-another-btn">Book Another Appointment</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="booking-page">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-heading text-xl font-semibold tracking-tight" data-testid="booking-business-name">
            {settings.business_name || "LuxeSalon"}
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <a href="/book" className="text-primary font-medium hover:underline" data-testid="customer-view-link">Customer View</a>
            {settings.business_webpage && (
              <a href={settings.business_webpage} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="website-link">Website</a>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2" data-testid="booking-progress">
          {STEP_LABELS.map((label, i) => (
            <React.Fragment key={i}>
              <button
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/10 text-primary cursor-pointer" : "bg-secondary text-muted-foreground"}`}
                data-testid={`step-${i}`}
              >
                <span className="w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold">
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                {label}
              </button>
              {i < STEP_LABELS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step 0: Location */}
        {step === 0 && (
          <div className="space-y-4" data-testid="step-location">
            <h2 className="font-heading text-2xl font-light">Select a Location</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {locations.map((loc) => (
                <Card
                  key={loc.id}
                  className={`cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${selectedLocation?.id === loc.id ? "border-primary border-2 shadow-lg" : "border-border"}`}
                  onClick={() => { setSelectedLocation(loc); setCart([]); }}
                  data-testid={`location-option-${loc.id}`}
                >
                  <CardContent className="py-5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium text-foreground">{loc.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{loc.address}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Services */}
        {step === 1 && (
          <div className="space-y-4" data-testid="step-services">
            <h2 className="font-heading text-2xl font-light">Choose Services</h2>
            <div className="grid gap-4">
              {availableServices.map((svc) => {
                const inCart = cart.find((c) => c.service.id === svc.id);
                return (
                  <Card key={svc.id} className={`transition-all duration-200 ${inCart ? "border-primary border-2" : "border-border"}`} data-testid={`service-option-${svc.id}`}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-foreground">{svc.name}</h3>
                            {svc.category && <Badge variant="secondary" className="text-xs">{svc.category}</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{svc.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-sm font-semibold text-primary">&#8377;{svc.price}</span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{svc.duration_minutes} min</span>
                          </div>
                        </div>
                        <Button
                          variant={inCart ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleService(svc)}
                          data-testid={`toggle-book-service-${svc.id}`}
                        >
                          {inCart ? "Selected" : "Select"}
                        </Button>
                      </div>
                      {/* Add-ons */}
                      {svc.add_ons?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Add-ons</p>
                          <div className="flex flex-wrap gap-2">
                            {svc.add_ons.map((ao) => {
                              const isSelected = inCart?.selectedAddOns?.find((a) => a.id === ao.id);
                              return (
                                <button
                                  key={ao.id}
                                  disabled={!inCart}
                                  onClick={() => inCart && toggleAddOn(svc.id, ao)}
                                  className={`inline-flex flex-col items-start px-3 py-2 rounded-lg border text-xs transition-colors ${isSelected ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"} ${!inCart ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:border-primary/50"}`}
                                  data-testid={`addon-option-${ao.id}`}
                                >
                                  <span className="font-medium">{ao.name}</span>
                                  <span>&#8377;{ao.price} &middot; {ao.duration_minutes} min</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {/* Cart summary */}
            {cart.length > 0 && (
              <Card className="bg-primary/5 border-primary/20" data-testid="cart-summary">
                <CardContent className="py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">Cart Summary</span>
                  </div>
                  <div className="space-y-1">
                    {cart.map((item) => (
                      <div key={item.service.id} className="text-sm text-muted-foreground">
                        <span>{item.service.name} - &#8377;{item.service.price} ({item.service.duration_minutes} min)</span>
                        {item.selectedAddOns.map((ao) => (
                          <span key={ao.id} className="block ml-4 text-xs">+ {ao.name} - &#8377;{ao.price} ({ao.duration_minutes} min)</span>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-primary/20">
                    <span className="font-semibold text-foreground">Total: &#8377;{totalPrice}</span>
                    <span className="text-sm text-muted-foreground">{totalDuration} min ({(totalDuration / 60).toFixed(1)} hrs)</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="space-y-4" data-testid="step-datetime">
            <h2 className="font-heading text-2xl font-light">Choose Date & Time</h2>
            <p className="text-sm text-muted-foreground">Total appointment time: {totalDuration} min ({(totalDuration / 60).toFixed(1)} hrs)</p>
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardContent className="py-4 flex justify-center">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => { setSelectedDate(date); setSelectedTime(null); }}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    data-testid="booking-calendar"
                  />
                </CardContent>
              </Card>
              <div>
                {selectedDate && (
                  <>
                    <p className="text-sm font-medium mb-3">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
                    {timeSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No available slots for this date</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2" data-testid="time-slots">
                        {timeSlots.map((slot) => (
                          <Button
                            key={slot}
                            variant={selectedTime === slot ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(slot)}
                            data-testid={`time-slot-${slot}`}
                          >
                            {slot}
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="space-y-6" data-testid="step-confirm">
            <h2 className="font-heading text-2xl font-light">Confirm Booking</h2>

            {/* Booking Summary */}
            <Card>
              <CardContent className="py-4 space-y-2">
                <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">Booking Summary</h3>
                <p className="text-sm"><strong>Location:</strong> {selectedLocation?.name}</p>
                <p className="text-sm"><strong>Date:</strong> {selectedDate && format(selectedDate, "PPP")}</p>
                <p className="text-sm"><strong>Time:</strong> {selectedTime}</p>
                <div className="space-y-1 mt-2">
                  {cart.map((item) => (
                    <div key={item.service.id} className="text-sm">
                      {item.service.name} - &#8377;{item.service.price} ({item.service.duration_minutes} min)
                      {item.selectedAddOns.map((ao) => (
                        <span key={ao.id} className="block ml-4 text-xs text-muted-foreground">+ {ao.name} - &#8377;{ao.price} ({ao.duration_minutes} min)</span>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-border mt-3">
                  <span className="font-semibold">Total: &#8377;{totalPrice}</span>
                  <span className="text-sm text-muted-foreground">{totalDuration} min ({(totalDuration / 60).toFixed(1)} hrs)</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Info */}
            <Card>
              <CardContent className="py-4 space-y-4">
                <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground">Your Information</h3>
                <div className="space-y-2">
                  <Label>Full Name <span className="text-destructive">*</span></Label>
                  <Input value={customerInfo.full_name} onChange={(e) => setCustomerInfo({ ...customerInfo, full_name: e.target.value })} placeholder="Enter your full name" data-testid="customer-fullname-input" />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number <span className="text-destructive">*</span></Label>
                  <Input value={customerInfo.phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="+91XXXXXXXXXX" data-testid="customer-phone-input" />
                  {phoneError && <p className="text-xs text-destructive" data-testid="phone-error">{phoneError}</p>}
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Number <span className="text-destructive">*</span></Label>
                  <Input
                    value={customerInfo.whatsapp}
                    onChange={(e) => handleWhatsappChange(e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    disabled={customerInfo.same_as_phone}
                    data-testid="customer-whatsapp-input"
                  />
                  {whatsappError && <p className="text-xs text-destructive" data-testid="whatsapp-error">{whatsappError}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id="same-phone"
                      checked={customerInfo.same_as_phone}
                      onCheckedChange={handleSameAsPhone}
                      data-testid="same-as-phone-checkbox"
                    />
                    <label htmlFor="same-phone" className="text-sm text-foreground cursor-pointer">
                      Check the box if your WhatsApp number and phone number are the same <span className="text-destructive">*</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email (optional)</Label>
                  <Input type="email" value={customerInfo.email} onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })} placeholder="your@email.com" data-testid="customer-email-input" />
                </div>
              </CardContent>
            </Card>

            <Button className="w-full" size="lg" disabled={!canProceed() || submitting} onClick={submitBooking} data-testid="confirm-booking-btn">
              {submitting ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} data-testid="prev-step-btn">
              <ChevronLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          )}
          {step < 3 && (
            <Button className="ml-auto" disabled={!canProceed()} onClick={() => setStep(step + 1)} data-testid="next-step-btn">
              Next <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Mock Razorpay Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-4 bg-secondary/30 rounded-lg text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Amount to Pay</p>
              <p className="text-3xl font-semibold text-foreground">&#8377;{totalPrice}</p>
            </div>
            <div className="p-3 border border-border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">R</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Razorpay (MOCKED)</p>
                  <p className="text-xs text-muted-foreground">Test payment gateway</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              This is a mock payment. No real transaction will be processed.
            </p>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full" onClick={processPayment} disabled={paymentProcessing} data-testid="pay-now-btn">
              {paymentProcessing ? "Processing Payment..." : `Pay ₹${totalPrice}`}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setPaymentDialogOpen(false)} data-testid="cancel-payment-btn">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
