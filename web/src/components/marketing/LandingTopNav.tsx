"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Produkt", href: "/#produkt" },
  { label: "So funktioniert’s", href: "/#ablauf" },
  { label: "FAQ", href: "/#faq" },
];

function NavLink({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group relative inline-flex items-center py-2 text-sm text-slate-600 transition hover:text-slate-950"
    >
      <span>{label}</span>
      <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-slate-900/70 transition-transform duration-300 ease-out group-hover:scale-x-100" />
    </Link>
  );
}

export function LandingTopNav() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setHasScrolled(window.scrollY > 10);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const closeMenu = () => setIsMenuOpen(false);
    window.addEventListener("resize", closeMenu);
    return () => window.removeEventListener("resize", closeMenu);
  }, []);

  return (
    <header className="sticky top-0 z-30 mx-auto w-full max-w-6xl px-5 pt-4 md:px-8">
      <div
        className={`rounded-[24px] border px-4 py-3 transition-all duration-300 md:px-6 ${
          hasScrolled
            ? "border-white/70 bg-white/78 shadow-[0_18px_45px_rgba(15,23,42,0.10)] backdrop-blur-xl"
            : "border-[color:var(--line)] bg-white/66 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-lg"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-8">
            <Link href="/" className="flex min-w-0 items-center">
              <Image
                src="/cofoundery-align-logo.svg"
                alt="CoFoundery Align"
                width={190}
                height={40}
                className="h-9 w-auto max-w-[172px] md:h-10 md:max-w-[190px]"
              />
            </Link>

            <nav className="hidden items-center gap-7 md:flex">
              {navItems.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="inline-flex items-center rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-white/70 hover:text-slate-950"
            >
              Login
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-2xl border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-5 py-3 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-slate-950 shadow-[0_10px_25px_rgba(38,118,255,0.16)] transition duration-200 hover:-translate-y-[1px] hover:shadow-[0_14px_30px_rgba(38,118,255,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]"
            >
              Jetzt starten
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-3 py-2 font-[var(--font-display)] text-[10px] tracking-[0.14em] text-slate-950 shadow-[0_8px_22px_rgba(38,118,255,0.14)] transition hover:-translate-y-[1px]"
            >
              Starten
            </Link>
            <button
              type="button"
              aria-expanded={isMenuOpen}
              aria-label="Navigation öffnen"
              onClick={() => setIsMenuOpen((open) => !open)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/80 bg-white/78 text-slate-700 transition hover:bg-white"
            >
              <span className="relative h-4 w-4">
                <span
                  className={`absolute left-0 top-[2px] h-px w-4 bg-current transition ${
                    isMenuOpen ? "translate-y-[5px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[7px] h-px w-4 bg-current transition ${
                    isMenuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[12px] h-px w-4 bg-current transition ${
                    isMenuOpen ? "-translate-y-[5px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>

        <div
          className={`overflow-hidden transition-[max-height,opacity,margin] duration-300 md:hidden ${
            isMenuOpen ? "mt-4 max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="rounded-[22px] border border-slate-200/80 bg-white/86 p-4 shadow-[0_14px_35px_rgba(15,23,42,0.08)] backdrop-blur">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  onClick={() => setIsMenuOpen(false)}
                />
              ))}
            </nav>

            <div className="mt-4 border-t border-slate-200/80 pt-4">
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex items-center rounded-xl px-1 py-2 text-sm text-slate-600 transition hover:text-slate-950"
              >
                Login
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-5 py-3 font-[var(--font-display)] text-[11px] tracking-[0.16em] text-slate-950 shadow-[0_10px_24px_rgba(38,118,255,0.16)] transition hover:-translate-y-[1px]"
              >
                Jetzt starten
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
