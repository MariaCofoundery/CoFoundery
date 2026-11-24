import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { FloatingStart } from "@/components/marketing/FloatingStart";
import { HomepageNav } from "@/components/marketing/HomepageNav";
import { LandingEffects } from "@/components/marketing/LandingEffects";
import { AdvisorWindow, AlignWindow, ConnectWindow, FindWindow, LandingIcon } from "@/components/marketing/LandingWindows";
import { SetupTopics } from "@/components/marketing/SetupTopics";
import { StarJourney } from "@/components/marketing/StarJourney";
import styles from "@/components/marketing/homepage.module.css";
import land from "@/components/marketing/landing.module.css";
import { getHomepageContent } from "@/data/homepage";
import { BETA_ACCESS_REQUEST_EMAIL, getBetaAccessRequestHref } from "@/features/auth/betaAccess";
import { BRAND_NAME } from "@/features/brand";
import { InstalledAppEntry } from "@/features/navigation/InstalledAppEntry";
import { getRequestLocale } from "@/i18n/getLocale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const content = getHomepageContent(locale);
  return {
    title: content.seoTitle, description: content.seoDescription,
    applicationName: BRAND_NAME,
    alternates: { canonical: "/" },
    openGraph: { title: content.seoTitle, description: content.seoDescription, type: "website", url: "/", siteName: BRAND_NAME, locale: locale === "en" ? "en_US" : "de_DE" },
    twitter: { card: "summary", title: content.seoTitle, description: content.seoDescription },
  };
}

/**
 * Startseite fuer Besucher ohne Konto. Reihenfolge (mit Maria abgestimmt am 24.11.2026): Scrollreise,
 * Bruecke, "Wo stehst du gerade?", Find und Align, Founder Setup, Marias Wort, Netzwerk, Ergebnisse,
 * Fragen, Schluss. Alle Knoepfe gehen nach /start (Konto, Zugangscode) oder zum Kasten "Zugang zur
 * Beta"; jeder Abschnitt, der etwas will, hat denselben Knopf mit demselben Text.
 */
export default async function Page() {
  const c = getHomepageContent(await getRequestLocale());
  const o = c.overview;
  const primary = `${land.btn} ${land.btnLg} ${land.btnPrimary}`;
  return (
    <div className={styles.page}>
      <InstalledAppEntry />
      <a className={styles.skipLink} href="#inhalt">{c.skip}</a>
      <HomepageNav />
      <main id="inhalt" tabIndex={-1}>
        <div className={land.land}>
          <div id="so" className={land.anchor}>
            <StarJourney content={c.journey} startLabel={c.start} accessLabel={c.accessRequest} />
          </div>
          <div className={land.fade} aria-hidden="true" />

          {/* Bruecke */}
          <section className={`${land.wrap} ${land.section} ${land.bridge}`} aria-labelledby="why-title">
            <div>
              <p className={land.label} data-rv>{c.bridge.label}</p>
              <h2 id="why-title" data-rv>
                <span className={`${land.mk} ${land.mkT}`}>{c.bridge.lines[0]}</span><br />
                <span className={`${land.mk} ${land.mkA}`}>{c.bridge.lines[1]}</span>
              </h2>
            </div>
            <div className={land.bridgeText}>
              {c.bridge.paragraphs.map((text) => <p key={text} data-rv>{text}</p>)}
              <div className={land.ctaRow} data-rv><Link href="/start" className={primary}>{c.start}</Link></div>
            </div>
          </section>

          {/* Tueren */}
          <section className={`${land.wrap} ${land.section}`} aria-labelledby="doors-title">
            <h2 id="doors-title" className={land.doorsTitle} data-rv>{c.doors.title}</h2>
            <div className={land.doorGrid}>
              {c.doors.items.map((door) => (
                <Link key={door.title} href={door.href} className={land.door} data-rv>
                  <LandingIcon kind={door.icon} />
                  <span className={land.doorKicker}>{door.kicker}</span>
                  <b>{door.title}</b>
                  <span className={land.doorText}>{door.text}</span>
                  <span className={land.doorGo}>{door.cta}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Find und Align */}
          <section id="bereiche" className={`${land.wrap} ${land.section} ${land.anchor}`} aria-labelledby="overview-title">
            <div className={land.overHead}>
              <p className={land.label} data-rv>{o.label}</p>
              <h2 id="overview-title" data-rv>{o.title}</h2>
              <p className={land.sub} data-rv>{o.sub}</p>
            </div>
            <div className={land.chap}>
              <div className={land.copy}>
                <p className={land.label} data-rv><i />{o.find.label}</p>
                <h3 data-rv>{o.find.title}</h3>
                <p data-rv>{o.find.text}</p>
                <ul className={land.checks}>{o.find.bullets.map((b) => <li key={b} data-rv>{b}</li>)}</ul>
              </div>
              <div className={`${land.panel} ${land.panelFind} ${land.starry}`} data-rv="scale">
                <span className={land.ex}>{c.example}</span>
                <FindWindow c={o.find} />
              </div>
            </div>
            <div className={`${land.chap} ${land.chapAlign} ${land.chapFlip}`}>
              <div className={land.copy}>
                <p className={land.label} data-rv><i />{o.align.label}</p>
                <h3 data-rv>{o.align.title}</h3>
                <p data-rv>{o.align.text}</p>
                <ul className={land.checks}>{o.align.bullets.map((b) => <li key={b} data-rv>{b}</li>)}</ul>
              </div>
              <div className={`${land.panel} ${land.panelAlign}`} data-rv="scale">
                <span className={land.ex}>{c.example}</span>
                <AlignWindow c={o.align} />
              </div>
            </div>
          </section>

          {/* Founder Setup */}
          <section className={`${land.wrap} ${land.section}`} aria-labelledby="setup-title">
            <div className={land.setupBox}>
              <div data-rv>
                <p className={land.label}>{c.setup.label}</p>
                <h2 id="setup-title">{c.setup.title}</h2>
                <p className={land.setupIntro}>{c.setup.intro}</p>
              </div>
              <div data-rv><SetupTopics topics={c.setup.topics} note={c.setup.note} more={c.setup.more} /></div>
            </div>
          </section>

          {/* Marias Wort */}
          <section className={`${land.wrap} ${land.section}`} aria-labelledby="founder-title">
            <div className={land.founderBox}>
              <div className={land.photo} data-rv>
                <Image src="/brand/maria.jpg" alt={c.founder.photoAlt} width={720} height={720} sizes="(min-width: 900px) 420px, 90vw" />
              </div>
              <div className={land.founderText}>
                <p className={land.label} data-rv>{c.founder.label}</p>
                <h2 id="founder-title" data-rv>{c.founder.title}</h2>
                {c.founder.paragraphs.map((text) => <p key={text} data-rv>{text}</p>)}
                <p className={land.sig} data-rv>{c.founder.sig}</p>
              </div>
            </div>
          </section>

          {/* Netzwerk */}
          <section id="netzwerk" className={`${land.wrap} ${land.section} ${land.anchor}`} aria-labelledby="net-title">
            <div className={land.netHead}>
              <p className={land.label} data-rv>{c.net.label}</p>
              <h2 id="net-title" data-rv>{c.net.title}</h2>
              <p className={land.sub} data-rv>{c.net.sub}</p>
            </div>
            <div className={land.duo}>
              <article className={`${land.big} ${land.bigConnect} ${land.starry}`} data-rv="scale">
                <p className={land.label}>{c.net.connect.label}</p>
                <h3>{c.net.connect.title}</h3>
                <p>{c.net.connect.text}</p>
                <ul className={land.checks}>{c.net.connect.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                <ConnectWindow c={c.net.connect} />
                <Link href={c.net.connect.moreHref} className={land.more}>{c.net.connect.more}</Link>
              </article>
              <article className={`${land.big} ${land.bigAdvisor} ${land.starry}`} data-rv="scale">
                <p className={land.label}>{c.net.advisor.label}</p>
                <h3>{c.net.advisor.title}</h3>
                <p>{c.net.advisor.text}</p>
                <ul className={land.checks}>{c.net.advisor.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                <AdvisorWindow c={c.net.advisor} />
                <Link href={c.net.advisor.moreHref} className={land.more}>{c.net.advisor.more}</Link>
              </article>
            </div>
          </section>

          {/* Ergebnisse */}
          <section className={`${land.wrap} ${land.section} ${land.out}`} aria-labelledby="outcomes-title">
            <h2 id="outcomes-title" data-rv>{c.outcomes.title}</h2>
            <div className={land.outGrid}>
              {c.outcomes.items.map((item) => (
                <div key={item.title} className={land.outItem} data-rv>
                  <LandingIcon kind={item.icon} />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <div className={land.ctaRow} data-rv><Link href="/start" className={primary}>{c.start}</Link></div>
          </section>

          {/* Haeufige Fragen */}
          <section className={`${land.wrap} ${land.section} ${land.faq}`} aria-labelledby="faq-title">
            <h2 id="faq-title" data-rv>{c.faq.title}</h2>
            <div data-rv><FaqAccordion items={c.faq.items} /></div>
          </section>

          {/* Schluss und Zugang */}
          <section className={`${land.wrap} ${land.closeSec}`} aria-labelledby="closing-title">
            <div id="landing-close" className={land.closeBox}>
              <h2 id="closing-title">{c.closing.title[0]}<span>{c.closing.title[1]}</span></h2>
              <div className={land.ctaRow}>
                <Link href="/start" className={primary}>{c.start}</Link>
                <Link href="/login" className={`${land.btn} ${land.btnLg} ${land.btnQuiet}`}>{c.login}</Link>
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
        <div><Link href="/" className={styles.footerBrand}><BrandLogo className={styles.footerLogo} claim claimClassName={styles.footerClaimText} sizes="208px" /></Link><p>{c.footer}</p><span>© 2026 {BRAND_NAME}</span></div>
        <nav aria-label={c.legal}><Link href="/impressum">{c.legal}</Link><Link href="/datenschutz">{c.privacy}</Link><Link href="/informierte-entscheidungen">{c.stance}</Link><Link href="/fuer-advisor">{c.forAdvisors}</Link><a href="/made2found-aufs-handy.pdf" target="_blank" rel="noopener">{c.phone}</a></nav>
      </footer>
      <LandingEffects />
      <FloatingStart label={c.start} endId="landing-close" />
    </div>
  );
}
