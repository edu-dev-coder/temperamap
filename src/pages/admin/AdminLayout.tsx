import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import FrederaLogo from "@/components/FrederaLogo";
import {
  LayoutDashboard,
  KeyRound,
  Quote,
  HelpCircle,
  Sparkles,
  ClipboardList,
  Users,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/passcodes", label: "Passcodes", icon: KeyRound },
  { href: "/admin/testimonials", label: "Testimonials", icon: Quote },
  { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
  { href: "/admin/features", label: "Features", icon: Sparkles },
  { href: "/admin/sessions", label: "Sessions", icon: ClipboardList },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top header */}
      <header className="sticky top-0 z-40 bg-primary text-white shadow-md">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mr-3 p-1.5 rounded-md hover:bg-white/10 transition-colors lg:hidden"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <FrederaLogo size="sm" onDark />
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-white/60 hidden sm:inline">Admin Panel</span>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-14 lg:top-14 z-30
            h-[calc(100vh-3.5rem)]
            w-64 bg-white border-r border-border
            transform transition-transform duration-200 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            overflow-y-auto
          `}
        >
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    window.location.href = item.href;
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-6">{title}</h1>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
