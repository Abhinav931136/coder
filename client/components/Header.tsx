import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MoonIcon,
  SunIcon,
  MenuIcon,
  UserIcon,
  LogOutIcon,
  SettingsIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [user, setUser] = useState<any | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
      const token = localStorage.getItem("token");
      if (token && !stored) {
        // use apiFetch which adds token automatically and handles network errors
        try {
          import("@/lib/api").then(({ apiFetch }) => {
            apiFetch("/api/auth/profile")
              .then((r: any) => r.json())
              .then((d: any) => {
                if (d?.success && d?.data?.user) {
                  localStorage.setItem("user", JSON.stringify(d.data.user));
                  setUser(d.data.user);
                }
              })
              .catch(() => {});
          });
        } catch {}
      }
    } catch {}

    const onUpdate = () => {
      try {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      } catch {}
    };
    window.addEventListener("user:update", onUpdate);
    return () => window.removeEventListener("user:update", onUpdate);
  }, [location.pathname]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const navigationItems = [
    { name: "Challenges", href: "/challenges" },
    { name: "Battles", href: "/battles" },
    { name: "Hackathons", href: "/hackathons" },
    { name: "Leaderboard", href: "/leaderboard" },
    ...(user ? [{ name: "Dashboard", href: "/dashboard" }] : []),
    ...(user && (user.role === "platform_admin" || user.role === "instructor")
      ? [{ name: "Admin", href: "/admin/hackathons" }]
      : []),
  ];

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2">
          <img
            src="https://interndesire.com/favicon.png"
            alt="InternDesire"
            className="h-10 w-auto md:h-12"
            onError={(e) => {
              // Fallback if logo fails to load
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
          <div className="hidden font-bold text-xl bg-gradient-to-r from-brand-600 to-code-600 bg-clip-text text-transparent">
            InternDesire
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                location.pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground",
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </Button>

          <div className="hidden md:flex items-center space-x-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={user.profile_image || ""} />
                      <AvatarFallback>
                        {(user.username || "?").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span>
                      {user.first_name
                        ? `${user.first_name} ${user.last_name || ""}`.trim()
                        : user.username}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    Signed in as {user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-red-600">
                    <LogOutIcon className="h-4 w-4 mr-2" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <MenuIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 space-y-2">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "block px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                  location.pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground",
                )}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex flex-col space-y-2 pt-4 border-t">
              {user ? (
                <>
                  <Button variant="ghost" className="justify-start" asChild>
                    <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                      Dashboard
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    className="justify-start"
                    onClick={() => {
                      setIsMenuOpen(false);
                      logout();
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="justify-start" asChild>
                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button className="justify-start" asChild>
                    <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
