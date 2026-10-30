"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { PublicLanguageSwitcher } from "@/features/i18n/PublicLanguageSwitcher";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
    // Wer bei offenem Menue weiterscrollt, will die Seite lesen, nicht das Menue.
    const onScroll = () => setIsOpen(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.headerRow}>
        {/* Header: logo only. The claim lives in brand and footer areas. */}
        <Link href="/" className={styles.wordmark}><BrandLogo className={styles.headerLogo} priority sizes="(min-width: 640px) 176px, 144px" /></Link>
        <nav className={styles.desktopNav} aria-label={content.navigation}>
          <Link href="/#so">{content.navSo}</Link>
          <Link href="/#bereiche">{content.navAreas}</Link>
        </nav>
        <div className={styles.desktopActions}>
          <PublicLanguageSwitcher />
          <Link href="/login" className={`${styles.smallButton} ${styles.smallButtonGhost}`}>{content.login}</Link>
          <Link href="/start" className={styles.smallButton}>{content.start}</Link>
        </div>
        <button ref={menuButton} className={styles.menuButton} aria-expanded={isOpen} aria-controls="marketing-menu" aria-label={isOpen ? content.close : content.menu} onClick={() => setIsOpen((open) => !open)}>
          {content.menu}<span aria-hidden="true">{isOpen ? "−" : "+"}</span>
        </button>
      </div>
      <div id="marketing-menu" hidden={!isOpen} className={styles.mobileMenu}>
        <nav aria-label={content.navigation}>
          <Link href="/#so" onClick={() => setIsOpen(false)}>{content.navSo}</Link>
          <Link href="/#bereiche" onClick={() => setIsOpen(false)}>{content.navAreas}</Link>
          <Link href="/login" className={`${styles.smallButton} ${styles.smallButtonGhost}`} onClick={() => setIsOpen(false)}>{content.login}</Link>
          <Link href="/start" className={styles.smallButton} onClick={() => setIsOpen(false)}>{content.start}</Link>
        </nav>
        <PublicLanguageSwitcher />
      </div>
    </header>
  );
}
