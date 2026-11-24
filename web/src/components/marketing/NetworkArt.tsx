import styles from "./landing.module.css";

/**
 * Das Bild im Kopf der Connect-Seite: ein Netz aus Menschen. Ein Problem (warmer Punkt links) sendet Wellen aus,
 * ein Lichtpunkt wandert ueber die Verbindungen, und nacheinander leuchten die Stationen auf, bis die Loesung
 * (hellblauer Punkt rechts) erreicht ist: der Dominoeffekt, von dem die Seite handelt. Reine Dekoration, deshalb
 * ohne Beschriftung fuer Hilfstechniken; alle Bewegung ist CSS und steht bei "weniger Bewegung" still.
 *
 * Die Formen sind bewusst als feste Zeichnung ausgeschrieben, damit sich jede Linie einzeln anfassen laesst.
 */
export function NetworkArt() {
  return (
    <svg className={styles.leitstern} viewBox="0 50 560 340" aria-hidden="true" focusable="false">
      <line x1="100" y1="236" x2="190" y2="190" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="190" y1="190" x2="250" y2="270" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="190" y1="190" x2="300" y2="160" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="250" y1="270" x2="360" y2="240" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="300" y1="160" x2="360" y2="240" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="300" y1="160" x2="410" y2="100" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="360" y1="240" x2="462" y2="176" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="410" y1="100" x2="462" y2="176" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="150" y1="120" x2="190" y2="190" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="150" y1="120" x2="62" y2="150" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="62" y1="150" x2="100" y2="236" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="250" y1="270" x2="300" y2="340" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="360" y1="240" x2="500" y2="290" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="462" y1="176" x2="500" y2="290" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="300" y1="340" x2="360" y2="240" stroke="rgba(185,163,255,.3)" strokeWidth="1" />
      <line x1="100" y1="236" x2="190" y2="190" stroke="rgba(255,226,160,.6)" strokeWidth="1.3" className={styles.leitFlow} />
      <line x1="190" y1="190" x2="300" y2="160" stroke="rgba(255,226,160,.6)" strokeWidth="1.3" className={styles.leitFlow} />
      <line x1="300" y1="160" x2="360" y2="240" stroke="rgba(255,226,160,.6)" strokeWidth="1.3" className={styles.leitFlow} />
      <line x1="360" y1="240" x2="462" y2="176" stroke="rgba(255,226,160,.6)" strokeWidth="1.3" className={styles.leitFlow} />
      <circle cx="100" cy="236" r="9" fill="none" stroke="#ffc36b" strokeWidth="1.2" className={styles.netRipple} style={{ animationDelay: "0.00s" }} />
      <circle cx="100" cy="236" r="9" fill="none" stroke="#ffc36b" strokeWidth="1.2" className={styles.netRipple} style={{ animationDelay: "1.33s" }} />
      <circle cx="100" cy="236" r="9" fill="none" stroke="#ffc36b" strokeWidth="1.2" className={styles.netRipple} style={{ animationDelay: "2.66s" }} />
      <circle cx="40" cy="90" r="1.5" fill="#e8e6ff" opacity="0.7" className={styles.leitNode} style={{ animationDelay: "0.0s" }} />
      <circle cx="250" cy="80" r="1.6" fill="#e8e6ff" opacity="0.78" />
      <circle cx="330" cy="70" r="1.6" fill="#e8e6ff" opacity="0.77" />
      <circle cx="520" cy="120" r="1.0" fill="#e8e6ff" opacity="0.59" className={styles.leitNode} style={{ animationDelay: "1.8s" }} />
      <circle cx="540" cy="220" r="1.8" fill="#e8e6ff" opacity="0.66" />
      <circle cx="450" cy="350" r="1.7" fill="#e8e6ff" opacity="0.45" />
      <circle cx="180" cy="360" r="1.4" fill="#e8e6ff" opacity="0.5" className={styles.leitNode} style={{ animationDelay: "3.6s" }} />
      <circle cx="60" cy="330" r="1.4" fill="#e8e6ff" opacity="0.63" />
      <circle cx="380" cy="320" r="1.0" fill="#e8e6ff" opacity="0.49" />
      <circle cx="220" cy="120" r="1.2" fill="#e8e6ff" opacity="0.77" className={styles.leitNode} style={{ animationDelay: "5.4s" }} />
      <circle cx="120" cy="300" r="1.6" fill="#e8e6ff" opacity="0.46" />
      <circle cx="470" cy="60" r="1.6" fill="#e8e6ff" opacity="0.46" />
      <circle cx="100" cy="236" r="9" fill="#ffc36b" opacity="0.16" className={styles.netChain} style={{ animationDelay: "0.0s" }} />
      <circle cx="100" cy="236" r="4.2" fill="#ffc36b" />
      <circle cx="190" cy="190" r="9" fill="#b9a3ff" opacity="0.16" className={styles.netChain} style={{ animationDelay: "1.2s" }} />
      <circle cx="190" cy="190" r="4.2" fill="#b9a3ff" />
      <circle cx="250" cy="270" r="9" fill="#b9a3ff" opacity="0.16" />
      <circle cx="250" cy="270" r="3.2" fill="#b9a3ff" />
      <circle cx="300" cy="160" r="9" fill="#6fd3ff" opacity="0.16" className={styles.netChain} style={{ animationDelay: "2.4s" }} />
      <circle cx="300" cy="160" r="4.2" fill="#6fd3ff" />
      <circle cx="360" cy="240" r="9" fill="#b9a3ff" opacity="0.16" className={styles.netChain} style={{ animationDelay: "3.6s" }} />
      <circle cx="360" cy="240" r="4.2" fill="#b9a3ff" />
      <circle cx="462" cy="176" r="9" fill="#6fd3ff" opacity="0.16" className={styles.netChain} style={{ animationDelay: "4.8s" }} />
      <circle cx="462" cy="176" r="4.2" fill="#6fd3ff" />
      <circle cx="410" cy="100" r="9" fill="#b9a3ff" opacity="0.16" />
      <circle cx="410" cy="100" r="3.2" fill="#b9a3ff" />
      <circle cx="150" cy="120" r="9" fill="#6fd3ff" opacity="0.16" />
      <circle cx="150" cy="120" r="3.2" fill="#6fd3ff" />
      <circle cx="300" cy="340" r="9" fill="#6fd3ff" opacity="0.16" />
      <circle cx="300" cy="340" r="3.2" fill="#6fd3ff" />
      <circle cx="500" cy="290" r="9" fill="#b9a3ff" opacity="0.16" />
      <circle cx="500" cy="290" r="3.2" fill="#b9a3ff" />
      <circle cx="62" cy="150" r="9" fill="#b9a3ff" opacity="0.16" />
      <circle cx="62" cy="150" r="3.2" fill="#b9a3ff" />
      <circle cx="0" cy="0" r="2.6" fill="#fff0c8" className={styles.leitDot} style={{ animationDelay: "0.0s", offsetPath: "path('M100 236 L190 190 L300 160 L360 240 L462 176')" }} />
      <circle cx="0" cy="0" r="2.6" fill="#fff0c8" className={styles.leitDot} style={{ animationDelay: "3.0s", offsetPath: "path('M100 236 L190 190 L300 160 L360 240 L462 176')" }} />
    </svg>
  );
}
