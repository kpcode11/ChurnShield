import {
  Home,
  Search,
  FileUp,
  BarChart3,
  DollarSign,
  Mail,
  Shield,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const mainNav = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Predict", url: "/predict", icon: Search },
  { title: "Bulk Upload", url: "/bulk", icon: FileUp },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const toolsNav = [
  { title: "Revenue Impact", url: "/revenue", icon: DollarSign },
  { title: "AI Messages", url: "/messages", icon: Mail },
];

function NavGroup({ label, items, collapsed }: { label: string; items: typeof mainNav; collapsed: boolean }) {
  return (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/40 font-semibold px-3 mb-1">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-all duration-150"
                  activeClassName="bg-sidebar-primary/15 text-sidebar-primary font-semibold shadow-sm"
                >
                  <item.icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon" className="border-r-0 shadow-xl">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-16 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-sidebar-primary/20 flex items-center justify-center shrink-0">
          <Shield className="h-[18px] w-[18px] text-sidebar-primary" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-[15px] font-bold text-sidebar-foreground tracking-tight leading-tight">
              ChurnShield
            </span>
            <span className="text-[10px] text-sidebar-foreground/40 font-medium">
              Retention Platform
            </span>
          </div>
        )}
      </div>

      <div className="px-3 mb-1">
        <Separator className="bg-sidebar-border/50" />
      </div>

      <SidebarContent className="px-1 pt-1 gap-1">
        <NavGroup label="Overview" items={mainNav} collapsed={collapsed} />
        <NavGroup label="Tools" items={toolsNav} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter className="p-2 mt-auto">
        <div className="px-3 mb-2">
          <Separator className="bg-sidebar-border/50" />
        </div>

        {!collapsed && (
          <div className="mx-2 mt-2 p-3 rounded-lg bg-sidebar-accent/40 flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground text-xs font-bold shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">Admin User</p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">admin@company.com</p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
