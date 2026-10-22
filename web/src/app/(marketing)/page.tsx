import type { Metadata } from "next";
import Link from "next/link";
import { HomepageNav } from "@/components/marketing/HomepageNav";
import styles from "@/components/marketing/homepage.module.css";
import { getHomepageContent } from "@/data/homepage";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getBetaAccessRequestHref } from "@/features/auth/betaAccess";
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

const AREA_ICONS: Record<string, React.ReactNode> = {
  align: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.8 3.6-5.8 7-5.8s6.2 2 7 5.8" /></>,
  find: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  connect: <><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="6" r="2.4" /><circle cx="18" cy="18" r="2.4" /><path d="M8.2 11l7.6-3.8M8.2 13l7.6 3.8" /></>,
};
const END_CARD_CLASS = ["endViolet", "endTeal", "endAmber"] as const;
const AREA_TILE_CLASS = { align: "tileViolet", find: "tileTeal", connect: "tileBlue" } as const;

function Arrow() {
  return <svg className={styles.arrow} viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}

export default async function Page() {
  const content = getHomepageContent(await getRequestLocale());
  return (
    <div className={styles.page}>
      <InstalledAppEntry />
      <a className={styles.skipLink} href="#inhalt">{content.skip}</a>
      <HomepageNav />
      <main id="inhalt" tabIndex={-1}>
        <section className={`${styles.container} ${styles.heroWrap}`} aria-labelledby="hero-title">
          <div className={styles.hero}>
            <div className={`${styles.blob} ${styles.blobOne}`} aria-hidden="true" />
            <div className={`${styles.blob} ${styles.blobTwo}`} aria-hidden="true" />
            <div className={`${styles.blob} ${styles.blobThree}`} aria-hidden="true" />
            <div className={styles.heroCopy}>
              <p className={`${styles.rise} ${styles.d1} ${styles.kicker}`}>{content.kicker}</p>
              <h1 id="hero-title" className={`${styles.rise} ${styles.d2}`}>
                {content.headline[0]}<span className={styles.grad}>{content.headline[1]}</span><br />{content.headline[2]}
              </h1>
              <p className={`${styles.rise} ${styles.d3} ${styles.lead}`}>{content.lead}</p>
              <div className={`${styles.rise} ${styles.d4} ${styles.heroActions}`}>
                <Link href="/start" className={styles.ctaButton}>{content.start}<Arrow /></Link>
                <Link href="/login" className={styles.heroLink}>{content.login}</Link>
              </div>
              <p className={`${styles.rise} ${styles.d4} ${styles.fine}`}>
                {content.fineStart}<br />{content.fineBeta}{" "}
                <a href={getBetaAccessRequestHref()}>{content.fineRequest}</a>
              </p>
            </div>
            <div className={styles.deck} role="img" aria-label={content.deckLabel}>
              {content.deck.map((card, index) => (
                <div key={card.kind} className={`${styles.card} ${styles[`card${index}` as "card0"]} ${styles[`tone_${card.tone}` as "tone_blue"]}`}>
                  <span className={styles.cardKind}><i />{card.kind}</span>
                  <p>{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.container} ${styles.why}`} aria-labelledby="why-title">
          <div>
            <p className={styles.label}>{content.whyLabel}</p>
            <h2 id="why-title" className={styles.whyTitle}>
              <span className={styles.markTeal}>{content.whyTitle[0]}</span><br />
              <span className={styles.markAmber}>{content.whyTitle[1]}</span>
            </h2>
          </div>
          <div className={styles.whyText}>{content.whyText.map((text) => <p key={text}>{text}</p>)}</div>
        </section>

        <section id="so" className={`${styles.container} ${styles.block}`} aria-labelledby="example-title">
          <h2 id="example-title" className={styles.h2}>{content.exampleTitle}</h2>
          <p className={styles.muted}>{content.exampleLead}</p>
          <div className={styles.example}>
            <span className={styles.exampleTag}>{content.exampleTag}</span>
            <div className={styles.exampleHead}>
              <span className={styles.avatars} aria-hidden="true"><span className={styles.avA}>{content.exampleNames[0][0]}</span><span className={styles.avB}>{content.exampleNames[1][0]}</span></span>
              <b>{content.exampleNames[0]} · {content.exampleNames[1]}</b>
            </div>
            {content.exampleRows.map((row) => (
              <div key={row.label} className={styles.exampleRow}>
                <b>{row.label}</b>
                {row.both ? (
                  <div className={styles.exampleBoth}><span className={styles.tagBlue}>{row.bothTag}</span><p>{row.both}</p></div>
                ) : (
                  <>
                    <div><span className={styles.tagViolet}>{content.exampleNames[0]}</span><p>{row.a}</p></div>
                    <div><span className={styles.tagTeal}>{content.exampleNames[1]}</span><p>{row.b}</p></div>
                  </>
                )}
              </div>
            ))}
            <div className={styles.exampleQuestion}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v10H10l-5 4V5zM9 9h6M9 12h4" /></svg>
              <div><b>{content.exampleQuestionTitle}</b><p>{content.exampleQuestion}</p></div>
            </div>
          </div>
        </section>

        <section className={`${styles.container} ${styles.block}`} aria-labelledby="end-title">
          <h2 id="end-title" className={styles.h2}>{content.endTitle}</h2>
          <ol className={styles.endGrid}>
            {content.end.map((item, index) => (
              <li key={item.title} className={`${styles.endCard} ${styles[END_CARD_CLASS[index]]}`}>
                <span className={styles.endNumber} aria-hidden="true">{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="bereiche" className={`${styles.container} ${styles.block}`} aria-labelledby="areas-title">
          <h2 id="areas-title" className={styles.h2Small}>{content.areasTitle}</h2>
          <p className={styles.muted}>{content.areasLead}</p>
          <div className={styles.areaGrid}>
            {content.areas.map((area) => (
              <article key={area.id} id={area.id} className={styles.area}>
                <span className={`${styles.tile} ${styles[AREA_TILE_CLASS[area.id as keyof typeof AREA_TILE_CLASS]]}`}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">{AREA_ICONS[area.id]}</svg>
                </span>
                <h3>{area.label}</h3>
                <p>{area.text}</p>
              </article>
            ))}
          </div>
          <p className={styles.advisor}>{content.advisorLine} <Link href="/start">{content.advisorLink}</Link></p>
        </section>

        <section className={`${styles.container} ${styles.bandWrap}`} aria-labelledby="band-title">
          <div className={styles.band}>
            <div className={`${styles.blob} ${styles.blobBand}`} aria-hidden="true" />
            <h2 id="band-title">{content.bandTitle[0]}<br />{content.bandTitle[1]}</h2>
            <div className={styles.heroActions}>
              <Link href="/start" className={styles.ctaButton}>{content.start}<Arrow /></Link>
              <Link href="/login" className={styles.heroLink}>{content.login}</Link>
            </div>
          </div>
        </section>
      </main>
      <footer className={`${styles.container} ${styles.footer}`}>
        <div><Link href="/" className={styles.footerBrand}><BrandLogo className={styles.footerLogo} claim claimClassName={styles.footerClaimText} sizes="208px" /></Link><p>{content.footer}</p><span>© 2026 {BRAND_NAME}</span></div>
        <nav aria-label={content.legal}><Link href="/impressum">{content.legal}</Link><Link href="/datenschutz">{content.privacy}</Link><Link href="/informierte-entscheidungen">{content.stance}</Link></nav>
      </footer>
    </div>
  );
}
