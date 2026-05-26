import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Outlet, useLocation } from "react-router-dom";

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
    <SidebarProvider defaultOpen>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
          <h2 className="hidden text-base font-semibold text-foreground md:block">{title}</h2>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
