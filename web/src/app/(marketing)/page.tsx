import type { Metadata } from "next";
import Link from "next/link";
import { HomepageNav } from "@/components/marketing/HomepageNav";
import styles from "@/components/marketing/homepage.module.css";
import { getHomepageContent } from "@/data/homepage";
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

export default async function Page() {
  const content = getHomepageContent(await getRequestLocale());
  return (
    <div className={styles.page}>
      <InstalledAppEntry />
      <a className={styles.skipLink} href="#inhalt">{content.skip}</a>
      <HomepageNav />
      <main id="inhalt" tabIndex={-1}>
        <section className={`${styles.container} ${styles.hero}`} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>People <span aria-hidden="true">•</span> Ideas <span aria-hidden="true">•</span> Ventures</p>
            <h1 id="hero-title">{content.headline[0]}<br /><span>{content.headline[1]}</span></h1>
            <p className={styles.possibility}>{content.possibility}</p>
            <p className={styles.intro}>{content.intro}</p>
            <div className={styles.actions}>
              <Link href="/start" className={styles.primaryButton}>{content.try}<span aria-hidden="true">↗</span></Link>
              <Link href="#ablauf" className={styles.textLink}>{content.how}<span aria-hidden="true">↓</span></Link>
            </div>
            <p className={styles.access}>{content.access}</p>
          </div>
          <div className={styles.board} aria-hidden="true">
            <div className={styles.boardGrid} />
            <span className={styles.boardCaption}>A little space for possibilities</span>
            <svg className={styles.boardLines} viewBox="0 0 480 520" fill="none"><path d="M110 155C320 120 110 365 325 360M325 135C160 230 375 230 240 440" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 7" /></svg>
            <div className={`${styles.note} ${styles.notePeople}`}><span className={styles.noteLabel}>{content.board[0]}</span><div className={styles.people}><i>✳</i><i>↗</i><i>+</i></div><strong>{content.tags[0]}</strong><span>{content.tags[1]}</span></div>
            <div className={`${styles.note} ${styles.noteIdea}`}><span className={styles.noteLabel}>{content.board[1]}</span><span className={styles.ideaSpark}>✳</span><strong>{content.tags[2]}</strong></div>
            <div className={`${styles.note} ${styles.noteVenture}`}><span className={styles.noteLabel}>{content.board[2]}</span><strong>{content.tags[4]}</strong><span>{content.tags[3]}</span><span className={styles.noteArrow}>↗</span></div>
            <span className={styles.boardSticker}>what if<br />we…?</span>
            <p className={styles.boardFoot}>{content.connection}<span>⤴</span></p>
          </div>
        </section>
        <div className={styles.statusLine}><span className={styles.statusDot} aria-hidden="true" />{content.beta}<span className={styles.statusClaim}>From People to Impact</span></div>

        <section className={`${styles.container} ${styles.areas}`} aria-labelledby="areas-title">
          <p className={styles.eyebrow}>{content.areasEyebrow}</p>
          <h2 id="areas-title" className={styles.sectionTitle}>{content.areasTitle}</h2>
          {content.areas.map((area, index) => (
            <article key={area.id} id={area.id} className={`${styles.area} ${styles[area.id]}`}>
              <div className={styles.areaLabel}><span className={styles.areaNumber}>0{index + 1}</span><h3>{area.label}</h3><span className={styles.lens}>{area.lens}</span></div>
              <div className={styles.areaCopy}><h4>{area.question}</h4><p>{area.text}</p><p className={styles.areaNote}>{area.note}</p></div>
              <div className={styles.areaWords} aria-hidden="true">{area.words.map((word, i) => <span key={word}>{i === 2 ? "↳ " : "+ "}{word}</span>)}</div>
            </article>
          ))}
        </section>

        <section className={styles.stance} aria-labelledby="stance-title"><div className={`${styles.container} ${styles.stanceGrid}`}>
          <div><p className={styles.eyebrow}>{content.stanceEyebrow}</p><h2 id="stance-title">{content.stanceTitle}</h2></div>
          <div><p>{content.stanceText}</p><ul className={styles.lenses}>{content.lenses.map((lens, index) => <li key={lens}><span aria-hidden="true">{["↗", "+", "↔", "✳"][index]}</span>{lens}</li>)}</ul><p className={styles.stanceNote}>{content.stanceNote}</p></div>
        </div></section>

        <section id="ablauf" className={`${styles.container} ${styles.stepsSection}`} aria-labelledby="steps-title">
          <p className={styles.eyebrow}>{content.how}</p><h2 id="steps-title" className={styles.sectionTitle}>{content.stepsTitle}</h2>
          <ol className={styles.steps}>{content.steps.map((step, index) => <li key={step.title}><span className={styles.stepNumber}>0{index + 1}</span><h3>{step.title}</h3><p>{step.text}</p></li>)}</ol>
        </section>

        <section className={`${styles.container} ${styles.audienceSection}`} aria-labelledby="audience-title">
          <div className={styles.audienceHeading}><div><p className={styles.eyebrow}>{content.audienceEyebrow}</p><h2 id="audience-title" className={styles.sectionTitle}>{content.audienceTitle}</h2></div><span aria-hidden="true" className={styles.audienceSpark}>✳</span></div>
          <div className={styles.audiences}>{content.audiences.map((audience) => <article key={audience.title}><h3>{audience.title}</h3><p>{audience.text}</p></article>)}</div>
          <aside className={styles.team}><h3>{content.teamTitle}</h3><p>{content.teamText}</p></aside>
          <p className={styles.future}>{content.future}</p>
        </section>

        <section className={styles.betaSection} aria-labelledby="beta-title"><div className={styles.container}>
          <p className={styles.eyebrow}>{content.betaEyebrow}</p><h2 id="beta-title">{content.betaTitle}</h2><p className={styles.betaText}>{content.betaText}</p><p className={styles.betaCode}>{content.code}</p>
          <Link href="/start" className={styles.primaryButton}>{content.try}<span aria-hidden="true">↗</span></Link><p className={styles.betaNote}>{content.noCode}</p>
        </div></section>
      </main>
      <footer className={`${styles.container} ${styles.footer}`}>
        <div><Link href="/" className={styles.wordmark}>{BRAND_NAME}</Link><p>{content.footer}</p><span>© 2026 {BRAND_NAME}</span></div>
        <nav aria-label={content.legal}><Link href="/impressum">{content.legal}</Link><Link href="/datenschutz">{content.privacy}</Link><Link href="/informierte-entscheidungen">{content.stance}</Link></nav>
        <p className={styles.footerClaim}>From People to Impact</p>
      </footer>
    </div>
  );
}
