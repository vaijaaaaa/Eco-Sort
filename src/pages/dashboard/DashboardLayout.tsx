import { Outlet, useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Package, PlusCircle, ShoppingCart, User, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { label: "Overview", to: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "My Listings", to: "/dashboard/listings", icon: Package },
  { label: "Create Listing", to: "/dashboard/listings/new", icon: PlusCircle },
  { label: "Buying", to: "/dashboard/buying", icon: ShoppingCart },
  { label: "Profile", to: "/dashboard/profile", icon: User },
];

const DashboardLayout = () => {
  const location = useLocation();
  const { profile, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("")
    : user?.email?.charAt(0).toUpperCase() ?? "U";

  const renderNavItem = (item: (typeof navigation)[number]) => {
    const isActive = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
    return (
      <Link
        key={item.to}
        to={item.to}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
        )}
        onClick={() => setMobileOpen(false)}
      >
        <item.icon className="h-4 w-4" />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar px-4 py-4 transition-transform lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <Link to="/" className="mb-6 flex items-center gap-2 text-lg font-semibold text-foreground">
          <span className="h-3 w-3 rounded-sm bg-primary" />
          EcoSort
        </Link>

  <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-background/60 p-3 text-sm shadow-sm mb-6">
          <Avatar className="h-10 w-10 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? "Profile Avatar"} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-foreground">
              {profile?.full_name ?? user?.email ?? "EcoSort User"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {profile?.role === "admin" ? "Administrator" : "Community Member"}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">{navigation.map(renderNavItem)}</nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen((prev) => !prev)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your e-waste journey and track activity</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="outline" size="sm">
              <Link to="/marketplace">Browse marketplace</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/dashboard/listings/new">New listing</Link>
            </Button>
          </div>
        </header>

        <main className="flex-1 bg-muted/30 p-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
