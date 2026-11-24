import styles from "./landing.module.css";

/**
 * Das Bild im Kopf der Advisor-Seite (Ueberarbeitung vom 24.11.2026): ein warmer Leitstern in der Mitte,
 * vier Teams (kleine Sternbilder) auf Bahnen um ihn, feine Linien mit wandernden Lichtpunkten vom Stern zu
 * jedem Team. Es ist dieselbe Bildsprache wie die Ringe der Align-Uebersicht und der Leitstern am Ende der
 * Scrollreise auf der Startseite. Reine Dekoration, deshalb ohne Beschriftung fuer Hilfstechniken; die Bewegung
 * (Puls, Funkeln, fliessende Linien, Lichtpunkte) ist reines CSS und steht bei "weniger Bewegung" still.
 *
 * Die Formen sind bewusst als feste Zeichnung ausgeschrieben und nicht aus Daten berechnet: so laesst sich jede
 * Linie einzeln anfassen. Die Zeichnung ist aus einer kleinen Vorlage erzeugt worden.
 */
export function LeitsternArt() {
  return (
    <svg className={styles.leitstern} viewBox="0 60 560 330" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="leitGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe2a0" stopOpacity=".75" />
          <stop offset="30%" stopColor="#ffe2a0" stopOpacity=".2" />
          <stop offset="100%" stopColor="#ffe2a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="280" cy="215" rx="110" ry="48" fill="none" stroke="rgba(185,163,255,0.22)" strokeWidth="1" transform="rotate(-8 280 215)" />
      <ellipse cx="280" cy="215" rx="180" ry="80" fill="none" stroke="rgba(185,163,255,0.17)" strokeWidth="1" transform="rotate(-8 280 215)" />
      <ellipse cx="280" cy="215" rx="250" ry="112" fill="none" stroke="rgba(185,163,255,0.12)" strokeWidth="1" transform="rotate(-8 280 215)" />
      <line x1="280" y1="215" x2="128" y2="226" stroke="rgba(255,240,200,.4)" strokeWidth="1" className={styles.leitFlow} />
      <line x1="280" y1="215" x2="452" y2="140" stroke="rgba(255,240,200,.4)" strokeWidth="1" className={styles.leitFlow} />
      <line x1="280" y1="215" x2="372" y2="276" stroke="rgba(255,240,200,.4)" strokeWidth="1" className={styles.leitFlow} />
      <line x1="280" y1="215" x2="206" y2="142" stroke="rgba(255,240,200,.4)" strokeWidth="1" className={styles.leitFlow} />
      <line x1="100" y1="238" x2="128" y2="226" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="128" y1="226" x2="140" y2="262" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="140" y1="262" x2="108" y2="274" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="108" y1="274" x2="100" y2="238" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="452" y1="140" x2="482" y2="126" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="482" y1="126" x2="494" y2="162" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="494" y1="162" x2="462" y2="174" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="462" y1="174" x2="452" y2="140" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="452" y1="140" x2="494" y2="162" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="372" y1="276" x2="402" y2="266" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="402" y1="266" x2="408" y2="300" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="408" y1="300" x2="372" y2="276" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="176" y1="162" x2="206" y2="142" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="206" y1="142" x2="220" y2="178" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <line x1="220" y1="178" x2="176" y2="162" stroke="rgba(185,163,255,.6)" strokeWidth="1.2" />
      <circle cx="100" cy="238" r="8" fill="#b9a3ff" opacity="0.16" />
      <circle cx="100" cy="238" r="3.4" fill="#b9a3ff" className={styles.leitNode} style={{ animationDelay: "0.00s" }} />
      <circle cx="128" cy="226" r="8" fill="#6fd3ff" opacity="0.16" />
      <circle cx="128" cy="226" r="3.4" fill="#6fd3ff" className={styles.leitNode} style={{ animationDelay: "0.37s" }} />
      <circle cx="140" cy="262" r="8" fill="#b9a3ff" opacity="0.16" />
      <circle cx="140" cy="262" r="3.4" fill="#b9a3ff" className={styles.leitNode} style={{ animationDelay: "0.74s" }} />
      <circle cx="108" cy="274" r="8" fill="#6fd3ff" opacity="0.16" />
      <circle cx="108" cy="274" r="3.4" fill="#6fd3ff" className={styles.leitNode} style={{ animationDelay: "1.11s" }} />
      <circle cx="452" cy="140" r="8" fill="#6fd3ff" opacity="0.16" />
      <circle cx="452" cy="140" r="3.4" fill="#6fd3ff" className={styles.leitNode} style={{ animationDelay: "1.48s" }} />
      <circle cx="482" cy="126" r="8" fill="#b9a3ff" opacity="0.16" />
      <circle cx="482" cy="126" r="3.4" fill="#b9a3ff" className={styles.leitNode} style={{ animationDelay: "1.85s" }} />
      <circle cx="494" cy="162" r="8" fill="#6fd3ff" opacity="0.16" />
      <circle cx="494" cy="162" r="3.4" fill="#6fd3ff" className={styles.leitNode} style={{ animationDelay: "2.22s" }} />
      <circle cx="462" cy="174" r="8" fill="#b9a3ff" opacity="0.16" />
      <circle cx="462" cy="174" r="3.4" fill="#b9a3ff" className={styles.leitNode} style={{ animationDelay: "2.59s" }} />
      <circle cx="372" cy="276" r="8" fill="#b9a3ff" opacity="0.16" />
      <circle cx="372" cy="276" r="3.4" fill="#b9a3ff" className={styles.leitNode} style={{ animationDelay: "2.96s" }} />
      <circle cx="402" cy="266" r="8" fill="#6fd3ff" opacity="0.16" />
      <circle cx="402" cy="266" r="3.4" fill="#6fd3ff" className={styles.leitNode} style={{ animationDelay: "3.33s" }} />
      <circle cx="408" cy="300" r="8" fill="#b9a3ff" opacity="0.16" />
      <circle cx="408" cy="300" r="3.4" fill="#b9a3ff" className={styles.leitNode} style={{ animationDelay: "3.70s" }} />
      <circle cx="176" cy="162" r="8" fill="#6fd3ff" opacity="0.16" />
      <circle cx="176" cy="162" r="3.4" fill="#6fd3ff" className={styles.leitNode} style={{ animationDelay: "4.44s" }} />
      <circle cx="206" cy="142" r="8" fill="#b9a3ff" opacity="0.16" />
      <circle cx="206" cy="142" r="3.4" fill="#b9a3ff" className={styles.leitNode} style={{ animationDelay: "4.81s" }} />
      <circle cx="220" cy="178" r="8" fill="#6fd3ff" opacity="0.16" />
      <circle cx="220" cy="178" r="3.4" fill="#6fd3ff" className={styles.leitNode} style={{ animationDelay: "5.18s" }} />
      <circle cx="46" cy="92" r="1.4" fill="#e8e6ff" opacity="0.67" className={styles.leitNode} style={{ animationDelay: "0.0s" }} />
      <circle cx="88" cy="196" r="1.7" fill="#e8e6ff" opacity="0.64" />
      <circle cx="40" cy="330" r="1.4" fill="#e8e6ff" opacity="0.68" />
      <circle cx="120" cy="364" r="1.1" fill="#e8e6ff" opacity="0.65" className={styles.leitNode} style={{ animationDelay: "1.5s" }} />
      <circle cx="200" cy="372" r="1.5" fill="#e8e6ff" opacity="0.77" />
      <circle cx="330" cy="376" r="1.1" fill="#e8e6ff" opacity="0.57" />
      <circle cx="430" cy="366" r="1.1" fill="#e8e6ff" opacity="0.77" className={styles.leitNode} style={{ animationDelay: "3.0s" }} />
      <circle cx="520" cy="300" r="1.6" fill="#e8e6ff" opacity="0.47" />
      <circle cx="536" cy="210" r="1.8" fill="#e8e6ff" opacity="0.84" />
      <circle cx="500" cy="90" r="1.5" fill="#e8e6ff" opacity="0.7" className={styles.leitNode} style={{ animationDelay: "4.5s" }} />
      <circle cx="400" cy="70" r="1.1" fill="#e8e6ff" opacity="0.46" />
      <circle cx="330" cy="96" r="1.4" fill="#e8e6ff" opacity="0.47" />
      <circle cx="170" cy="84" r="1.2" fill="#e8e6ff" opacity="0.55" className={styles.leitNode} style={{ animationDelay: "6.0s" }} />
      <circle cx="70" cy="262" r="1.0" fill="#e8e6ff" opacity="0.64" />
      <circle cx="250" cy="140" r="1.4" fill="#e8e6ff" opacity="0.79" />
      <circle cx="0" cy="0" r="2.4" fill="#fff0c8" className={styles.leitDot} style={{ animationDelay: "0.0s", offsetPath: "path('M280 215 L128 226')" }} />
      <circle cx="0" cy="0" r="2.4" fill="#fff0c8" className={styles.leitDot} style={{ animationDelay: "1.6s", offsetPath: "path('M280 215 L452 140')" }} />
      <circle cx="0" cy="0" r="2.4" fill="#fff0c8" className={styles.leitDot} style={{ animationDelay: "3.2s", offsetPath: "path('M280 215 L372 276')" }} />
      <circle cx="0" cy="0" r="2.4" fill="#fff0c8" className={styles.leitDot} style={{ animationDelay: "4.8s", offsetPath: "path('M280 215 L206 142')" }} />
      <circle cx="280" cy="215" r="150" fill="url(#leitGlow)" className={styles.leitPulse} />
      <path d="M234 215H326M280 169V261" stroke="rgba(255,240,205,.75)" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M258 193L302 237M302 193L258 237" stroke="rgba(255,240,205,.35)" strokeWidth="1" strokeLinecap="round" />
      <circle cx="280" cy="215" r="15" fill="none" stroke="rgba(255,240,205,.5)" strokeWidth="1" />
      <circle cx="280" cy="215" r="6.5" fill="#fff6dc" />
    </svg>
  );
}
