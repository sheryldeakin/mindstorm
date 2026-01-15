import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "../ui/Button";
import logoMark from "/Just Logo.png";
import { useAuth } from "../../contexts/AuthContext";

interface NavbarProps {
  variant?: "landing" | "app";
}

const landingLinks = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Use cases", href: "#use-cases" },
  { label: "Stories", href: "#stories" },
];

const appLinks = [
  { label: "Home", to: "/home" },
  { label: "Journal", to: "/journal" },
  { label: "Entry", to: "/entry" },
  { label: "Check-in", to: "/check-in" },
  { label: "Connections", to: "/connections" },
  { label: "Patterns", to: "/patterns" },
  { label: "Cycles", to: "/cycles" },
  { label: "Prepare", to: "/prepare" },
  { label: "Settings", to: "/settings" },
];

const Navbar = ({ variant = "landing" }: NavbarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const portalTarget = typeof document !== "undefined" ? document.body : null;

  const initials = useMemo(() => {
    if (!user?.email) return "U";
    const [first, second] = user.email.split("@")[0]?.split(/[.\s-_]+/);
    const firstChar = first?.[0] || "U";
    const secondChar = second?.[0] || "";
    return `${firstChar}${secondChar}`.toUpperCase();
  }, [user?.email]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current || !(event.target instanceof Node)) return;
      if (!menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const handleSignOut = () => {
    signOut();
    setMenuOpen(false);
    navigate("/login");
  };

  return (
    <header className="ms-card ms-card-flat ms-elev-1 sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-brand">
          <span className="inline-flex h-14 w-14 items-center justify-center">
            <img src={logoMark} alt="MindStorm logo" className="h-12 w-auto object-contain" />
          </span>
          <span>MindStorm</span>
        </Link>
        <nav className="hidden flex-1 items-center justify-start gap-6 pl-6 text-sm text-brand/70 md:flex">
          {variant === "landing"
            ? landingLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="transition hover:text-brand"
                >
                  {link.label}
                </a>
              ))
            : (
              <>
                <div className="flex items-center gap-6 md:flex lg:hidden">
                  {appLinks
                    .filter((link) => link.to === "/home")
                    .map((link) => (
                      <NavLink
                        key={link.label}
                        to={link.to}
                        className={({ isActive }) =>
                          clsx(
                            "transition hover:text-brand",
                            (link.to === "/home" && (pathname === "/home" || pathname === "/dashboard")) || isActive
                              ? "text-brand font-semibold"
                              : "text-brand/60",
                          )
                        }
                      >
                        {link.label}
                      </NavLink>
                    ))}
                </div>
                <div className="hidden items-center gap-6 lg:flex">
                  {appLinks.map((link) => (
                    <NavLink
                      key={link.label}
                      to={link.to}
                      className={({ isActive }) =>
                        clsx(
                          "transition hover:text-brand",
                          (link.to === "/home" && (pathname === "/home" || pathname === "/dashboard")) || isActive
                            ? "text-brand font-semibold"
                            : "text-brand/60",
                        )
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
        </nav>
        <div className="flex items-center gap-3">
          {variant === "landing" ? (
            <>
              <Button variant="ghost" size="sm" className="hidden md:inline-flex">
                View demo
              </Button>
              <Link to="/login">
                <Button size="sm">Start free journal</Button>
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMobileOpen((prev) => !prev)}
                className="ms-glass-pill inline-flex items-center justify-center rounded-full p-2 text-slate-600 transition hover:border-slate-300 lg:hidden"
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              </button>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="ms-glass-pill flex items-center gap-3 rounded-full px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-300"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                    {initials}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-left text-sm font-medium text-slate-700 md:block">
                    {user?.name?.trim() || user?.email || "Account"}
                  </span>
                </button>
                {menuOpen && (
                  <div className="ms-glass-surface absolute right-0 mt-2 w-56 rounded-2xl p-2 text-sm text-slate-700">
                    <div className="px-3 py-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signed in as</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-800">
                        {user?.email || "Account"}
                      </p>
                    </div>
                    <div className="my-1 h-px bg-slate-100" />
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-white/60"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {portalTarget && mobileOpen
        ? createPortal(
            <div className="fixed inset-0 z-[999] lg:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                aria-label="Close navigation menu"
              />
              <div className="ms-glass-surface relative z-[1000] h-full w-72 max-w-[85vw] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Navigation</span>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="ms-glass-pill rounded-full p-2 text-slate-600"
                    aria-label="Close navigation menu"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="6" y1="6" x2="18" y2="18" />
                      <line x1="6" y1="18" x2="18" y2="6" />
                    </svg>
                  </button>
                </div>
                <div className="mt-6 flex flex-col gap-2 text-sm text-brand/70">
                  {variant === "landing"
                    ? landingLinks.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          className="rounded-2xl px-3 py-2 text-sm text-brand/70 transition hover:bg-brand/5 hover:text-brand"
                          onClick={() => setMobileOpen(false)}
                        >
                          {link.label}
                        </a>
                      ))
                    : appLinks.map((link) => (
                        <NavLink
                          key={link.label}
                          to={link.to}
                          onClick={() => setMobileOpen(false)}
                          className={({ isActive }) =>
                            clsx(
                              "rounded-2xl px-3 py-2 text-sm transition",
                              (link.to === "/home" && (pathname === "/home" || pathname === "/dashboard")) || isActive
                                ? "bg-brand/10 text-brand font-semibold"
                                : "text-brand/60 hover:bg-brand/5 hover:text-brand",
                            )
                          }
                        >
                          {link.label}
                        </NavLink>
                      ))}
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </header>
  );
};

export default Navbar;
