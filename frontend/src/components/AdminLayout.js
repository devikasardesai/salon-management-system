import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Calendar, Link2, Scissors, Users, MapPin, UserCircle, Settings, LogOut, Menu, X, Database, ExternalLink, Eye } from "lucide-react";
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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const isAdminActive = location.pathname.startsWith("/admin");

  return (
    <div className="min-h-screen flex flex-col bg-background" data-testid="admin-layout">
      {/* Top bar with 3 main sections */}
      <header className="h-12 border-b border-border bg-card flex items-center px-4 lg:px-6 sticky top-0 z-40" data-testid="top-header">
        <h1 className="font-heading text-lg font-semibold tracking-tight text-foreground mr-8" data-testid="admin-business-name">
          {settings?.business_name || "LuxeSalon"}
        </h1>
        <nav className="flex items-center gap-1" data-testid="top-nav">
          <NavLink
            to="/admin/schedule"
            className={() =>
              `px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-200 ${isAdminActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`
            }
            data-testid="top-nav-admin"
          >
            Admin
          </NavLink>
          <a
            href="/book"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors duration-200"
            data-testid="top-nav-customer-view"
          >
            <Eye className="w-3.5 h-3.5" />
            Customer View
          </a>
          {settings?.business_webpage && (
            <a
              href={settings.business_webpage}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors duration-200"
              data-testid="top-nav-website"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Website
            </a>
          )}
        </nav>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground hidden sm:inline">{user?.email}</span>
      </header>

      <div className="flex-1 flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        {/* Sidebar */}
        <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`} data-testid="admin-sidebar">
          <div className="px-4 pt-4 pb-2 lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`
                }
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-border">
            <Button variant="ghost" className="w-full justify-start gap-3 text-sm text-muted-foreground hover:text-foreground" onClick={handleLogout} data-testid="logout-button">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </aside>
        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="h-11 border-b border-border bg-card/60 flex items-center px-4 lg:hidden" data-testid="mobile-header">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} data-testid="mobile-menu-button">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
          <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
