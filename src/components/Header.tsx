import { Link, useNavigate } from "@tanstack/react-router";
import { Search, Plus, Heart, Building2, LogOut, User, ChevronDown, LayoutDashboard, BadgeCheck, UserCircle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { logout, initAdmin } from "@/lib/auth";
import { initListings } from "@/lib/listings";
import { useUnreadCount } from "@/lib/messages";
import { NotificationBell } from "@/components/NotificationBell";
import { useState, useRef, useEffect } from "react";

export function Header() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const unread = useUnreadCount(user?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initAdmin();
    initListings();
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate({ to: "/" });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    navigate({ to: "/search", search: q ? { q } : {} });
  }

  function initials(name: string) {
    return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" className="group flex shrink-0 items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-xl font-extrabold text-primary tracking-tight">عقاري</span>
        </Link>

        <form
          onSubmit={handleSearch}
          className="group hidden md:flex flex-1 max-w-md items-center gap-2 rounded-full border border-border bg-background ps-5 pe-1.5 py-1.5 text-sm shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-md focus-within:border-primary/50 focus-within:shadow-md"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن أي عقار · المدينة · النوع · السعر"
            aria-label="ابحث عن عقار"
            className="min-w-0 flex-1 bg-transparent font-semibold text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            type="submit"
            aria-label="بحث"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-transform duration-300 hover:scale-110 hover:rotate-12"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>

        <div className="flex items-center gap-2">
          <Link
            to="/add-property"
            className="press hidden sm:inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-muted"
          >
            <Plus className="h-4 w-4" /> أضف عقارك
          </Link>

          <Link
            to="/favorites"
            className="hidden sm:grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-muted hover:text-primary"
            aria-label="المفضلة"
          >
            <Heart className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
          </Link>

          {isLoggedIn && user && (
            <Link
              to="/messages"
              className="relative hidden sm:grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-muted hover:text-primary"
              aria-label="الرسائل"
            >
              <MessageCircle className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -left-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          )}

          {/* Notification bell — only for logged-in users */}
          {isLoggedIn && user && (
            <div className="hidden sm:block">
              <NotificationBell userId={user.id} />
            </div>
          )}

          {isLoggedIn && user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-bold hover:bg-muted transition"
              >
                <div className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-extrabold">
                  {initials(user.name)}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user.name.split(" ")[0]}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>

              {menuOpen && (
                <div className="absolute left-0 top-full mt-2 w-52 rounded-2xl border border-border bg-card shadow-lg overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-bold truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {user.role === "admin" && (
                        <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          مدير النظام
                        </span>
                      )}
                      {user.verified && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">
                          <BadgeCheck className="h-3 w-3" /> موثّق
                        </span>
                      )}
                    </div>
                  </div>
                  {user.role === "admin" && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-primary hover:bg-primary/5 transition"
                    >
                      <LayoutDashboard className="h-4 w-4" /> لوحة التحكم
                    </Link>
                  )}
                  <Link
                    to="/my-listings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                  >
                    <Building2 className="h-4 w-4" /> عقاراتي
                  </Link>
                  <Link
                    to="/messages"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                  >
                    <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> الرسائل</span>
                    {unread > 0 && (
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                  >
                    <UserCircle className="h-4 w-4" /> حسابي
                  </Link>
                  <Link
                    to="/add-property"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                  >
                    <Plus className="h-4 w-4" /> أضف عقاراً
                  </Link>
                  <Link
                    to="/favorites"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-muted transition"
                  >
                    <Heart className="h-4 w-4" /> المفضلة
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition border-t border-border"
                  >
                    <LogOut className="h-4 w-4" /> تسجيل الخروج
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="outline" className="rounded-full h-10 gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">دخول</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
