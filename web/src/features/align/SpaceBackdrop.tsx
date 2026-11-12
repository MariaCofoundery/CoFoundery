import "@/features/align/align.css";

/**
 * Sterne und ein Schimmer für dunkle Köpfe (Align-Übersicht, Gesamtbild, später Stärken entdecken).
 * Die Sterne stehen fest - gewürfelt wird mit einem festen Startwert, damit Server und Browser
 * dasselbe Bild zeichnen.
 *
 * Gehört in einen Elternknoten mit `position: relative; overflow: hidden` (z. B. `.align-hero`).
 */
export function SpaceBackdrop({
  count = 50,
  seed = 11,
  glowClassName = "right-[8%] top-[60px] h-[460px] w-[520px]",
}: {
  count?: number;
  seed?: number;
  glowClassName?: string;
}) {
  let state = seed;
  const random = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
  const stars = Array.from({ length: count }, () => {
    const size = 1 + Math.round(random() * 2);
    return {
      left: `${(random() * 100).toFixed(1)}%`,
      top: `${(random() * 100).toFixed(1)}%`,
      size,
      delay: `${(random() * 4).toFixed(2)}s`,
    };
  });

  return (
    <>
      <div aria-hidden="true" className={`align-glow pointer-events-none absolute rounded-full bg-[#5b36d4] blur-[150px] ${glowClassName}`} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {stars.map((star, index) => (
          <span
            key={index}
            className="align-twinkle absolute rounded-full bg-white"
            style={{ left: star.left, top: star.top, width: star.size, height: star.size, animationDelay: star.delay }}
          />
        ))}
      </div>
    </>
  );
}
