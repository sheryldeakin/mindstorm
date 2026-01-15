const footerLinks = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Contact", href: "#" },
  { label: "Support", href: "#" },
];

const Footer = () => {
  return (
    <footer className="ms-card ms-elev-1 mt-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-semibold text-brand">MindStorm</p>
          <p className="text-sm text-brand/70">"Where your mind becomes the solution, not the storm."</p>
        </div>
        <nav className="flex flex-wrap gap-4 text-sm text-brand/70">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="transition hover:text-brand"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
