import { Link, NavLink } from "react-router-dom";
import clsx from "clsx";
import Button from "../ui/Button";
import logoMark from "/Just Logo.png";

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
                  key={link.to}
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
            <Button variant="secondary" size="sm">
              Sync Session Notes
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
