import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Toaster } from "./components/ui/sonner";

import LoginPage from "./pages/admin/LoginPage";
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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Customer booking - public */}
      <Route path="/book" element={<BookingPage />} />
      <Route path="/manage-booking/:bookingId" element={<ManageBookingPage />} />

      {/* Admin login/signup */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* Admin protected routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
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

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/book" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="App">
            <AppRoutes />
            <Toaster position="top-right" richColors />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
