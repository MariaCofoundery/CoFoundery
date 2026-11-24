import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { FloatingStart } from "@/components/marketing/FloatingStart";
import { HomepageNav } from "@/components/marketing/HomepageNav";
import { LandingEffects } from "@/components/marketing/LandingEffects";
import { AdvisorWindow, ProgramWindow, TeamroomWindow } from "@/components/marketing/LandingWindows";
import { LeitsternArt } from "@/components/marketing/LeitsternArt";
import styles from "@/components/marketing/homepage.module.css";
import land from "@/components/marketing/landing.module.css";
import { getAdvisorPageContent } from "@/data/advisorPage";
import { getHomepageContent } from "@/data/homepage";
import { BETA_ACCESS_REQUEST_EMAIL, getBetaAccessRequestHref } from "@/features/auth/betaAccess";
import { BRAND_NAME } from "@/features/brand";
import { getRequestLocale } from "@/i18n/getLocale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = getAdvisorPageContent(locale);
  return {
    title: content.seoTitle, description: content.seoDescription,
    applicationName: BRAND_NAME,
    alternates: { canonical: "/fuer-advisor" },
    openGraph: { title: content.seoTitle, description: content.seoDescription, type: "website", url: "/fuer-advisor", siteName: BRAND_NAME, locale: locale === "en" ? "en_US" : "de_DE" },
    twitter: { card: "summary", title: content.seoTitle, description: content.seoDescription },
  };
}

/**
 * Oeffentliche Seite fuer Advisor und Accelerator (Entwurf vom 24.11.2026). Gleiche Bildsprache und gleiche
 * Bausteine wie die Startseite: Kopf mit Leitstern, drei Bloecke mit App-Fenstern (erfundene Daten), drei
 * Schritte, ein Gespraechsangebot fuer Programme, Fragen, Schluss mit dem Kasten "Zugang zur Beta".
 * Alle Knoepfe gehen nach /start (Konto, Zugangscode) oder zum Kasten; keine Preise, kein Score.
 */
export default async function AdvisorPage() {
  const locale = await getRequestLocale();
  const c = getAdvisorPageContent(locale);
  const home = getHomepageContent(locale);
  const f = c.features;
  const primary = `${land.btn} ${land.btnLg} ${land.btnPrimary}`;
  const talkHref = `mailto:${BETA_ACCESS_REQUEST_EMAIL}?subject=${encodeURIComponent(c.talk.subject)}&body=${encodeURIComponent(c.talk.body)}`;
  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#inhalt">{home.skip}</a>
      <HomepageNav />
      <main id="inhalt" tabIndex={-1}>
        <div className={land.land}>
          {/* Kopf */}
          <section className={`${land.advHero} ${land.starry}`} aria-labelledby="adv-title">
            <div className={`${land.wrap} ${land.advHeroGrid}`}>
              <div>
                <p className={land.label}>{c.hero.label}</p>
                <h1 id="adv-title"><span>{c.hero.title[0]}</span><span className={land.two}>{c.hero.title[1]}</span></h1>
                <p className={land.advSub}>{c.hero.sub}</p>
                <div className={land.ctaRow}>
                  <Link href="/start" className={primary}>{c.hero.primary}</Link>
                  <a href="#zugang" className={`${land.btn} ${land.btnLg} ${land.btnGhost}`}>{c.hero.access}</a>
                </div>
                <p className={land.advFine}>{c.hero.price} {c.hero.fine}</p>
              </div>
              <div className={land.heroArt}><LeitsternArt /></div>
            </div>
          </section>

          {/* Was du bekommst */}
          <section id="was" className={`${land.wrap} ${land.section} ${land.anchor}`} aria-labelledby="adv-features-title">
            <div className={land.overHead}>
              <p className={land.label} data-rv>{f.label}</p>
              <h2 id="adv-features-title" data-rv>{f.title}</h2>
            </div>
            <div className={land.chap}>
              <div className={land.copy}>
                <p className={land.label} data-rv><i />{f.team.label}</p>
                <h3 data-rv>{f.team.title}</h3>
                <p data-rv>{f.team.text}</p>
                <ul className={land.checks}>{f.team.bullets.map((b) => <li key={b} data-rv>{b}</li>)}</ul>
              </div>
              <div className={`${land.panel} ${land.panelFind} ${land.starry}`} data-rv="scale">
                <span className={land.ex}>{c.hero.example}</span>
                <TeamroomWindow c={f.team} />
              </div>
            </div>
            <div className={`${land.chap} ${land.chapAlign} ${land.chapFlip}`}>
              <div className={land.copy}>
                <p className={land.label} data-rv><i />{f.program.label}</p>
                <h3 data-rv>{f.program.title}</h3>
                <p data-rv>{f.program.text}</p>
                <ul className={land.checks}>{f.program.bullets.map((b) => <li key={b} data-rv>{b}</li>)}</ul>
              </div>
              <div className={`${land.panel} ${land.panelAlign}`} data-rv="scale">
                <span className={land.ex}>{c.hero.example}</span>
                <ProgramWindow c={f.program} />
              </div>
            </div>
            <div className={land.chap}>
              <div className={land.copy}>
                <p className={land.label} data-rv><i />{f.shares.label}</p>
                <h3 data-rv>{f.shares.title}</h3>
                <p data-rv>{f.shares.text}</p>
                <ul className={land.checks}>{f.shares.bullets.map((b) => <li key={b} data-rv>{b}</li>)}</ul>
              </div>
              <div className={`${land.panel} ${land.panelFind} ${land.starry}`} data-rv="scale">
                <span className={land.ex}>{c.hero.example}</span>
                <AdvisorWindow c={home.net.advisor} />
              </div>
            </div>
          </section>

          {/* So startest du: eine echte Reihenfolge, deshalb nummeriert */}
          <section className={`${land.wrap} ${land.section}`} aria-labelledby="adv-steps-title">
            <div className={land.overHead}>
              <p className={land.label} data-rv>{c.steps.label}</p>
              <h2 id="adv-steps-title" data-rv>{c.steps.title}</h2>
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

          {/* Gespraechsangebot fuer Programme */}
          <section className={`${land.wrap} ${land.section}`} aria-labelledby="adv-talk-title">
            <div className={land.talk} data-rv>
              <div>
                <h2 id="adv-talk-title">{c.talk.title}</h2>
                <p>{c.talk.text}</p>
              </div>
              <a href={talkHref} className={`${land.btn} ${land.btnLg} ${land.btnQuiet}`}>{c.talk.cta}</a>
            </div>
          </section>

          {/* Fragen */}
          <section className={`${land.wrap} ${land.section} ${land.faq}`} aria-labelledby="adv-faq-title">
            <h2 id="adv-faq-title" data-rv>{c.faq.title}</h2>
            <div data-rv><FaqAccordion items={c.faq.items} /></div>
          </section>

          {/* Schluss und Zugang */}
          <section className={`${land.wrap} ${land.closeSec}`} aria-labelledby="adv-closing-title">
            <div id="landing-close" className={land.closeBox}>
              <h2 id="adv-closing-title">{c.closing.title[0]}<span>{c.closing.title[1]}</span></h2>
              <div className={land.ctaRow}>
                <Link href="/start" className={primary}>{c.hero.primary}</Link>
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
        <nav aria-label={home.legal}><Link href="/impressum">{home.legal}</Link><Link href="/datenschutz">{home.privacy}</Link><Link href="/informierte-entscheidungen">{home.stance}</Link><Link href="/fuer-advisor">{home.forAdvisors}</Link><a href="/made2found-aufs-handy.pdf" target="_blank" rel="noopener">{home.phone}</a></nav>
      </footer>
      <LandingEffects />
      <FloatingStart label={home.start} endId="landing-close" />
    </div>
  );
}
