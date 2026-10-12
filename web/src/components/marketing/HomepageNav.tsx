"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { BRAND_NAME } from "@/features/brand";
import { getHomepageContent } from "@/data/homepage";
import styles from "./homepage.module.css";

export function HomepageNav() {
  const locale = useLocale();
  const content = getHomepageContent(locale);
  const [isOpen, setIsOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        menuButton.current?.focus();
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 960) setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.headerRow}>
        {/* Plain brand text until the approved standalone logo is supplied. */}
        <Link href="/" className={styles.wordmark}>{BRAND_NAME}</Link>
        <nav className={styles.desktopNav} aria-label={content.navigation}>
          {content.areas.map((area) => <Link key={area.id} href={`/#${area.id}`}>{area.label}</Link>)}
          <Link href="/#ablauf">{content.how}</Link>
        </nav>
        <div className={styles.desktopActions}>
          <PublicLanguageSwitcher />
          <Link href="/login">{content.login}</Link>
          <Link href="/start" className={styles.smallButton}>{content.start}<span aria-hidden="true">↗</span></Link>
        </div>
        <button ref={menuButton} className={styles.menuButton} aria-expanded={isOpen} aria-controls="marketing-menu" aria-label={isOpen ? content.close : content.menu} onClick={() => setIsOpen((open) => !open)}>
          {content.menu}<span aria-hidden="true">{isOpen ? "−" : "+"}</span>
        </button>
      </div>
      <div id="marketing-menu" hidden={!isOpen} className={styles.mobileMenu}>
        <nav aria-label={content.navigation}>
          {content.areas.map((area) => <Link key={area.id} href={`/#${area.id}`} onClick={() => setIsOpen(false)}>{area.label}<span aria-hidden="true">↗</span></Link>)}
          <Link href="/#ablauf" onClick={() => setIsOpen(false)}>{content.how}</Link>
          <Link href="/login" onClick={() => setIsOpen(false)}>{content.login}</Link>
          <Link href="/start" className={styles.smallButton} onClick={() => setIsOpen(false)}>{content.start}<span aria-hidden="true">↗</span></Link>
        </nav>
        <PublicLanguageSwitcher />
      </div>
    </header>
  );
}
