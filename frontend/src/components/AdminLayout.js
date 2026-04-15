import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Calendar, Link2, Scissors, Users, MapPin, UserCircle, Settings, LogOut, Menu, X, Database } from "lucide-react";
import { Button } from "../components/ui/button";

const navItems = [
  { to: "/admin/schedule", icon: Calendar, label: "Schedule" },
  { to: "/admin/booking-link", icon: Link2, label: "Booking Link" },
  { to: "/admin/services", icon: Scissors, label: "Services" },
  { to: "/admin/employees", icon: Users, label: "Employees" },
  { to: "/admin/locations", icon: MapPin, label: "Locations" },
  { to: "/admin/customers", icon: Database, label: "Customers" },
  { to: "/admin/profile", icon: UserCircle, label: "Profile" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const { settings } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-background" data-testid="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`} data-testid="admin-sidebar">
        <div className="p-6 border-b border-border">
          <h1 className="font-heading text-xl font-semibold tracking-tight text-foreground" data-testid="admin-business-name">
            {settings?.business_name || "LuxeSalon"}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Admin Portal</p>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`
              }
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground" onClick={handleLogout} data-testid="logout-button">
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>
      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-xl flex items-center px-4 lg:px-6 sticky top-0 z-30" data-testid="admin-header">
          <Button variant="ghost" size="icon" className="lg:hidden mr-2" onClick={() => setSidebarOpen(true)} data-testid="mobile-menu-button">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <span className="text-sm text-muted-foreground">{user?.email}</span>
        </header>
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
