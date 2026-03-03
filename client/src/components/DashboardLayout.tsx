import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/predict": "Predict Customer",
  "/bulk": "Bulk Prediction",
  "/analytics": "Analytics",
  "/revenue": "Revenue Impact",
  "/segments": "Customer Segments",
  "/geo": "Geo Heatmap",
  "/messages": "AI Messages",
  "/health": "Health Card",
  "/settings": "Settings",
};

export function DashboardLayout() {
  const location = useLocation();
  const title = pageTitles[location.pathname] || "Dashboard";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center border-b border-border/60 bg-card/80 backdrop-blur-sm px-6 gap-4 shrink-0 sticky top-0 z-10">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <h2 className="text-base font-semibold text-foreground hidden md:block">{title}</h2>

            <div className="ml-auto flex items-center gap-3">
              <div className="relative hidden md:block">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 h-8 w-48 text-xs bg-muted/50 border-0 focus-visible:ring-1"
                />
              </div>
              <button className="relative h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
