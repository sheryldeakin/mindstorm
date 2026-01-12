import { Link, NavLink, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";
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
  { label: "Today", to: "/journal" },
  { label: "Journal", to: "/journal" },
  { label: "Entry", to: "/entry" },
  { label: "Patterns", to: "/patterns" },
  { label: "Cycles", to: "/cycles" },
];

const Navbar = ({ variant = "landing" }: NavbarProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
      if (event.key === "Escape") setMenuOpen(false);
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
    <header className="sticky top-0 z-50 border-b border-brand/10 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3 text-lg font-semibold tracking-tight text-brand">
          <span className="inline-flex h-14 w-14 items-center justify-center">
            <img src={logoMark} alt="MindStorm logo" className="h-12 w-auto object-contain" />
          </span>
          <span>MindStorm</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-brand/70 md:flex">
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
            : appLinks.map((link) => (
                <NavLink
                  key={link.label}
                  to={link.to}
                  className={({ isActive }) =>
                    clsx(
                      "transition hover:text-brand",
                      isActive ? "text-brand font-semibold" : "text-brand/60",
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
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
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm transition hover:border-slate-300"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                  {initials}
                </span>
                <span className="hidden max-w-[140px] truncate text-left text-sm font-medium text-slate-700 md:block">
                  {user?.name?.trim() || user?.email || "Account"}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-lg">
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
                    className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
