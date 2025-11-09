import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Leaf, LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, profile, signOut, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigation = useMemo(() => {
    const items = [
      { label: "Home", to: "/" },
      { label: "AI Classifier", to: "/classifier" },
      { label: "Marketplace", to: "/marketplace" },
    ];

    if (user) {
      items.push({ label: "Dashboard", to: "/dashboard" });
    }

    return items;
  }, [user]);

  const initials = useMemo(() => {
    if (profile?.full_name) {
      const parts = profile.full_name.split(" ");
      return parts
        .map((part) => part.charAt(0).toUpperCase())
        .slice(0, 2)
        .join("");
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  }, [profile?.full_name, user?.email]);

  const handleSignOut = async () => {
    await signOut();
    setMobileOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full items-center px-4 sm:px-6 lg:px-8">
        <div className="flex w-full max-w-[1600px] mx-auto items-center gap-4">
          {/* Logo - Left */}
          <div className="flex items-center shrink-0 w-48">
            <Link to="/" className="flex items-center gap-2">
              <Leaf className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">EcoSort</span>
            </Link>
          </div>

          {/* Navigation - Center (Absolute Center) */}
          <nav className="hidden md:flex items-center justify-center gap-8 flex-1">
            {navigation.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary whitespace-nowrap"
                activeClassName="text-foreground"
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* User Actions - Right */}
          <div className="flex items-center gap-2 shrink-0 w-48 justify-end">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="hidden lg:flex items-center gap-2 rounded-full border border-border bg-muted/60 px-2.5 py-1 transition-colors hover:border-primary/60 hover:bg-background"
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? user.email ?? "User Avatar"} />
                    <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground whitespace-nowrap max-w-[100px] truncate">
                    {profile?.full_name ?? user.email}
                  </span>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="hidden lg:inline-flex items-center gap-1 h-8 text-xs shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign out</span>
                </Button>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
                  <Link to="/auth">Login</Link>
                </Button>
                <Button asChild size="sm" className="h-8 text-xs shadow-sm">
                  <Link to="/auth">Sign Up</Link>
                </Button>
              </div>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader className="mb-6">
                <SheetTitle className="flex items-center gap-2 text-lg">
                  <Leaf className="h-6 w-6 text-primary" />
                  EcoSort
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  {navigation.map(({ label, to }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className="rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      activeClassName="bg-muted text-foreground"
                      onClick={() => setMobileOpen(false)}
                    >
                      {label}
                    </NavLink>
                  ))}
                </div>

                <div className="border-t pt-4">
                  {user ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? user.email ?? "User Avatar"} />
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {profile?.full_name ?? user.email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Signed in
                          </span>
                        </div>
                      </div>
                      <Button onClick={handleSignOut} disabled={loading} className="justify-start gap-2">
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <Button
                        asChild
                        variant="outline"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Link to="/auth">Login</Link>
                      </Button>
                      <Button
                        asChild
                        onClick={() => setMobileOpen(false)}
                      >
                        <Link to="/auth">Create account</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
