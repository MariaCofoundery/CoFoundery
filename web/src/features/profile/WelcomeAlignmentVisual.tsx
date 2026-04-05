import { useId, type CSSProperties } from "react";

type Props = {
  className?: string;
  durationSeconds?: number;
  primaryColor?: string;
  accentColor?: string;
};

export function WelcomeAlignmentVisual({
  className = "",
  durationSeconds = 7.2,
  primaryColor = "rgba(103, 232, 249, 0.95)",
  accentColor = "rgba(124, 58, 237, 0.72)",
}: Props) {
  const gradientAId = useId();
  const gradientBId = useId();
  const glowId = useId();

  return (
    <div
      className={`welcome-alignment-visual ${className}`.trim()}
      style={
        {
          "--welcome-line-duration": `${durationSeconds}s`,
          "--welcome-line-primary": primaryColor,
          "--welcome-line-accent": accentColor,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <svg viewBox="0 0 640 280" role="presentation" focusable="false">
        <defs>
          <linearGradient id={gradientAId} x1="24" y1="216" x2="620" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="rgba(103, 232, 249, 0.18)" />
            <stop offset="0.52" stopColor="var(--welcome-line-primary)" />
            <stop offset="1" stopColor="rgba(16, 26, 42, 0.22)" />
          </linearGradient>
          <linearGradient id={gradientBId} x1="24" y1="50" x2="620" y2="170" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="rgba(124, 58, 237, 0.12)" />
            <stop offset="0.52" stopColor="var(--welcome-line-accent)" />
            <stop offset="1" stopColor="rgba(16, 26, 42, 0.18)" />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="welcome-alignment-visual__field">
          <path
            d="M34 224C112 224 156 188 220 166C280 146 338 139 398 137C474 134 544 125 608 106"
            className="welcome-alignment-visual__line-shell"
          />
          <path
            d="M34 224C112 224 156 188 220 166C280 146 338 139 398 137C474 134 544 125 608 106"
            className="welcome-alignment-visual__line welcome-alignment-visual__line--primary"
            stroke={`url(#${gradientAId})`}
          />
          <path
            d="M34 224C112 224 156 188 220 166C280 146 338 139 398 137C474 134 544 125 608 106"
            className="welcome-alignment-visual__line-trace welcome-alignment-visual__line-trace--primary"
            filter={`url(#${glowId})`}
          />
        </g>

        <g className="welcome-alignment-visual__field welcome-alignment-visual__field--delayed">
          <path
            d="M34 56C112 58 160 96 222 118C282 139 338 144 398 145C474 147 544 154 608 168"
            className="welcome-alignment-visual__line-shell"
          />
          <path
            d="M34 56C112 58 160 96 222 118C282 139 338 144 398 145C474 147 544 154 608 168"
            className="welcome-alignment-visual__line welcome-alignment-visual__line--accent"
            stroke={`url(#${gradientBId})`}
          />
          <path
            d="M34 56C112 58 160 96 222 118C282 139 338 144 398 145C474 147 544 154 608 168"
            className="welcome-alignment-visual__line-trace welcome-alignment-visual__line-trace--accent"
            filter={`url(#${glowId})`}
          />
        </g>

        <circle cx="318" cy="141" r="58" className="welcome-alignment-visual__core-glow" />
        <circle cx="318" cy="141" r="3.5" className="welcome-alignment-visual__meeting-point" />
      </svg>
    </div>
  );
}
