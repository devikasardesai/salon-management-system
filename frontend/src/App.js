import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/sonner";

import AdminLayout from "./components/AdminLayout";
import SchedulePage from "./pages/admin/SchedulePage";
import ServicesPage from "./pages/admin/ServicesPage";
import EmployeesPage from "./pages/admin/EmployeesPage";
import LocationsPage from "./pages/admin/LocationsPage";
import CustomersPage from "./pages/admin/CustomersPage";
import ProfilePage from "./pages/admin/ProfilePage";
import SettingsPage from "./pages/admin/SettingsPage";
import BookingLinkPage from "./pages/admin/BookingLinkPage";
import BookingPage from "./pages/customer/BookingPage";
import ManageBookingPage from "./pages/customer/ManageBookingPage";

function AppRoutes() {
  return (
    <Routes>
      {/* Customer booking - public */}
      <Route path="/book" element={<BookingPage />} />
      <Route path="/manage-booking/:bookingId" element={<ManageBookingPage />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/schedule" replace />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="booking-link" element={<BookingLinkPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Default redirect - admin is the main view */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <div className="App">
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </div>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
