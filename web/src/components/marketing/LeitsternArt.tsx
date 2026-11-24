import styles from "./landing.module.css";

/**
 * Das Bild im Kopf der Advisor-Seite: ein warmer Leitstern, von dem feine Linien zu drei kleinen
 * Sternbildern (Teams) gehen. Es ist dieselbe Bildsprache wie am Ende der Scrollreise auf der Startseite
 * ("Begleitung, wenn ihr sie wollt"). Reine Dekoration, deshalb ohne Beschriftung fuer Hilfstechniken;
 * das Pulsieren ist reines CSS und steht bei "weniger Bewegung" still.
 */
const GROUPS = [
  { nodes: [[70, 300], [120, 270], [150, 320], [100, 350]], edges: [[0, 1], [1, 2], [2, 3], [3, 0]] },
  { nodes: [[250, 330], [300, 300], [340, 345]], edges: [[0, 1], [1, 2]] },
  { nodes: [[430, 260], [470, 300], [440, 340], [400, 305]], edges: [[0, 1], [1, 2], [2, 3], [3, 0]] },
];
const STAR = { x: 260, y: 80 };

export function LeitsternArt() {
  return (
    <svg className={styles.leitstern} viewBox="0 0 520 400" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="leitGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffe2a0" stopOpacity=".9" />
          <stop offset="35%" stopColor="#ffe2a0" stopOpacity=".28" />
          <stop offset="100%" stopColor="#ffe2a0" stopOpacity="0" />
        </radialGradient>
      </defs>
      {GROUPS.map((group, gi) => {
        const cx = group.nodes.reduce((sum, n) => sum + n[0], 0) / group.nodes.length;
        const cy = group.nodes.reduce((sum, n) => sum + n[1], 0) / group.nodes.length;
        return (
          <g key={gi}>
            <line x1={STAR.x} y1={STAR.y} x2={cx} y2={cy} stroke="rgba(255,240,200,.22)" strokeWidth="1" />
            {group.edges.map(([a, b]) => (
              <line key={`${a}-${b}`} x1={group.nodes[a][0]} y1={group.nodes[a][1]} x2={group.nodes[b][0]} y2={group.nodes[b][1]} stroke="rgba(185,163,255,.55)" strokeWidth="1.2" />
            ))}
            {group.nodes.map((n, ni) => (
              <circle key={ni} cx={n[0]} cy={n[1]} r="3.4" fill={(gi + ni) % 2 ? "#6fd3ff" : "#b9a3ff"} className={styles.leitNode} style={{ animationDelay: `${(gi * 4 + ni) * 0.37}s` }} />
            ))}
          </g>
        );
      })}
      <circle cx={STAR.x} cy={STAR.y} r="86" fill="url(#leitGlow)" className={styles.leitPulse} />
      <path d={`M${STAR.x - 34} ${STAR.y}H${STAR.x + 34}M${STAR.x} ${STAR.y - 34}V${STAR.y + 34}`} stroke="rgba(255,240,205,.75)" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx={STAR.x} cy={STAR.y} r="6" fill="#fff6dc" />
    </svg>
  );
}
