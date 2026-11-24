import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { FloatingStart } from "@/components/marketing/FloatingStart";
import { HomepageNav } from "@/components/marketing/HomepageNav";
import { LandingEffects } from "@/components/marketing/LandingEffects";
import { AlertWindow, ComposeWindow, ConnectWindow } from "@/components/marketing/LandingWindows";
import { NetworkArt } from "@/components/marketing/NetworkArt";
import styles from "@/components/marketing/homepage.module.css";
import land from "@/components/marketing/landing.module.css";
import { getHomepageContent } from "@/data/homepage";
import { getNetworkPageContent } from "@/data/networkPage";
import { BETA_ACCESS_REQUEST_EMAIL, getBetaAccessRequestHref } from "@/features/auth/betaAccess";
import { BRAND_NAME } from "@/features/brand";
import { getRequestLocale } from "@/i18n/getLocale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = getNetworkPageContent(locale);
  return {
    title: content.seoTitle, description: content.seoDescription,
    applicationName: BRAND_NAME,
    alternates: { canonical: "/netzwerk" },
    openGraph: { title: content.seoTitle, description: content.seoDescription, type: "website", url: "/netzwerk", siteName: BRAND_NAME, locale: locale === "en" ? "en_US" : "de_DE" },
    twitter: { card: "summary", title: content.seoTitle, description: content.seoDescription },
  };
}

/**
 * Oeffentliche Seite zu Connect (Entwurf vom 24.11.2026), im Aufbau der Advisor-Seite: Kopf mit dem Netz-Bild
 * (ein Problem, ein Lichtpunkt, eine Loesung), drei Bloecke mit App-Fenstern (erfundene Beispiele), drei Schritte,
 * Fragen, Schluss mit dem Kasten "Zugang zur Beta". Connect ist fuer alle, nicht nur fuer Gruender. Investment und
 * Unternehmensnachfolge werden hier bewusst nicht beworben. Alle Knoepfe gehen nach /start oder zum Kasten.
 */
export default async function NetworkPage() {
  const locale = await getRequestLocale();
  const c = getNetworkPageContent(locale);
  const home = getHomepageContent(locale);
  const f = c.features;
  const primary = `${land.btn} ${land.btnLg} ${land.btnPrimary}`;
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#inhalt">{home.skip}</a>
      <HomepageNav />
      <main id="inhalt" tabIndex={-1}>
        <div className={land.land}>
          {/* Kopf */}
          <section className={`${land.advHero} ${land.starry}`} aria-labelledby="net-title">
            <div className={`${land.wrap} ${land.advHeroGrid}`}>
              <div>
                <p className={land.label}>{c.hero.label}</p>
                <h1 id="net-title"><span>{c.hero.title[0]}</span><span className={land.two}>{c.hero.title[1]}</span></h1>
                <p className={land.advSub}>{c.hero.sub}</p>
                <div className={land.ctaRow}>
                  <Link href="/start" className={primary}>{home.start}</Link>
                  <a href="#zugang" className={`${land.btn} ${land.btnLg} ${land.btnGhost}`}>{c.hero.access}</a>
                </div>
                <p className={land.advFine}>{c.hero.price} {c.hero.fine}</p>
              </div>
              <div className={land.heroArt}><NetworkArt /></div>
            </div>
          </section>

          {/* Was du hier tun kannst */}
          <section id="was" className={`${land.wrap} ${land.section} ${land.anchor}`} aria-labelledby="net-features-title">
            <div className={land.overHead}>
              <p className={land.label} data-rv>{f.label}</p>
              <h2 id="net-features-title" data-rv>{f.title}</h2>
            </div>
            <div className={land.chap}>
              <div className={land.copy}>
                <p className={land.label} data-rv><i />{f.post.label}</p>
                <h3 data-rv>{f.post.title}</h3>
                <p data-rv>{f.post.text}</p>
                <ul className={land.checks}>{f.post.bullets.map((b) => <li key={b} data-rv>{b}</li>)}</ul>
              </div>
              <div className={`${land.panel} ${land.panelFind} ${land.starry}`} data-rv="scale">
                <span className={land.ex}>{c.hero.example}</span>
                <ComposeWindow c={f.post} />
              </div>
            </div>
            <div className={`${land.chap} ${land.chapAlign} ${land.chapFlip}`}>
              <div className={land.copy}>
                <p className={land.label} data-rv><i />{f.find.label}</p>
                <h3 data-rv>{f.find.title}</h3>
                <p data-rv>{f.find.text}</p>
                <ul className={land.checks}>{f.find.bullets.map((b) => <li key={b} data-rv>{b}</li>)}</ul>
              </div>
              <div className={`${land.panel} ${land.panelAlign}`} data-rv="scale">
                <span className={land.ex}>{c.hero.example}</span>
                <ConnectWindow c={home.net.connect} />
              </div>
            </div>
            <div className={land.chap}>
              <div className={land.copy}>
                <p className={land.label} data-rv><i />{f.alert.label}</p>
                <h3 data-rv>{f.alert.title}</h3>
                <p data-rv>{f.alert.text}</p>
                <ul className={land.checks}>{f.alert.bullets.map((b) => <li key={b} data-rv>{b}</li>)}</ul>
              </div>
              <div className={`${land.panel} ${land.panelFind} ${land.starry}`} data-rv="scale">
                <span className={land.ex}>{c.hero.example}</span>
                <AlertWindow c={f.alert} />
              </div>
            </div>
          </section>

          {/* So startest du: eine echte Reihenfolge, deshalb nummeriert */}
          <section className={`${land.wrap} ${land.section}`} aria-labelledby="net-steps-title">
            <div className={land.overHead}>
              <p className={land.label} data-rv>{c.steps.label}</p>
              <h2 id="net-steps-title" data-rv>{c.steps.title}</h2>
            </div>
            <ol className={land.stepsList}>
              {c.steps.items.map((step, i) => (
                <li key={step.title} className={land.step} data-rv>
                  <span className={land.stepNum}>{i + 1}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Fragen */}
          <section className={`${land.wrap} ${land.section} ${land.faq}`} aria-labelledby="net-faq-title">
            <h2 id="net-faq-title" data-rv>{c.faq.title}</h2>
            <div data-rv><FaqAccordion items={c.faq.items} /></div>
          </section>

          {/* Schluss und Zugang */}
          <section className={`${land.wrap} ${land.closeSec}`} aria-labelledby="net-closing-title">
            <div id="landing-close" className={land.closeBox}>
              <h2 id="net-closing-title">{c.closing.title[0]}<span>{c.closing.title[1]}</span></h2>
              <div className={land.ctaRow}>
                <Link href="/start" className={primary}>{home.start}</Link>
                <Link href="/login" className={`${land.btn} ${land.btnLg} ${land.btnQuiet}`}>{home.login}</Link>
              </div>
              <div id="zugang" className={`${land.access} ${land.anchor}`}>
                <b>{c.closing.accessTitle}</b>
                <p>{c.closing.accessText} <span className={land.mail}>{BETA_ACCESS_REQUEST_EMAIL}</span></p>
                <a href={getBetaAccessRequestHref()} className={`${land.btn} ${land.btnGhost} ${land.accessLink}`}>{c.closing.accessCta}</a>
              </div>
            </div>
          </section>
        </div>
      </main>
      <footer className={`${styles.container} ${styles.footer}`}>
        <div><Link href="/" className={styles.footerBrand}><BrandLogo className={styles.footerLogo} claim claimClassName={styles.footerClaimText} sizes="208px" /></Link><p>{home.footer}</p><span>© 2026 {BRAND_NAME}</span></div>
        <nav aria-label={home.legal}><Link href="/impressum">{home.legal}</Link><Link href="/datenschutz">{home.privacy}</Link><Link href="/informierte-entscheidungen">{home.stance}</Link><Link href="/netzwerk">{home.network}</Link><Link href="/fuer-advisor">{home.forAdvisors}</Link><a href="/made2found-aufs-handy.pdf" target="_blank" rel="noopener">{home.phone}</a></nav>
      </footer>
      <LandingEffects />
      <FloatingStart label={home.start} endId="landing-close" />
    </div>
  );
}
