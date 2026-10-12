import Image from "next/image";
import { BRAND_NAME } from "@/features/brand";

/**
 * Die Made2Found-Wortmarke.
 *
 * Quelle sind die beiden freigegebenen PNGs (2000 x 500, transparent):
 * - onLight: dunkle Schrift, fuer helle Flaechen ("schwarz M2F")
 * - onDark:  helle Verlaufsschrift, fuer dunkle Flaechen ("weisser HG M2F")
 * Sie werden weder eingefaerbt noch gefiltert noch auf eine Flaeche gelegt -
 * das Bild ist die Wortmarke.
 *
 * Der Claim steht NICHT im Bild, sondern als Text darunter: scharf auf jedem
 * Bildschirm und ohne neues Raster anpassbar. Die PNGs haben links 70 und
 * unten 56 von 2000 Pixeln transparenten Rand; die Prozentwerte unten beziehen
 * sich auf die Breite und setzen den Claim buendig unter die sichtbare Marke.
 */
const SOURCES = {
  onLight: "/brand/made2found-logo-on-light.png",
  onDark: "/brand/made2found-logo-on-dark.png",
} as const;

export const BRAND_CLAIM = "From People to Impact";

type BrandLogoProps = {
  tone?: keyof typeof SOURCES;
  /** Groesse ueber die Hoehe (z. B. "h-10"); die Breite folgt dem Seitenverhaeltnis. */
  className?: string;
  /** Claim unter der Marke - fuer Marken- und Footerbereiche, nicht fuer Kopfzeilen. */
  claim?: boolean;
  claimClassName?: string;
  priority?: boolean;
  /** Breite im Layout, damit das Bild nicht groesser als noetig geladen wird. */
  sizes?: string;
};

export function BrandLogo({
  tone = "onLight",
  className = "h-10",
  claim = false,
  claimClassName = "",
  priority = false,
  sizes = "240px",
}: BrandLogoProps) {
  const image = (
    <Image
      src={SOURCES[tone]}
      alt={BRAND_NAME}
      width={2000}
      height={500}
      sizes={sizes}
      priority={priority}
      draggable={false}
      className={`block w-auto max-w-none shrink-0 ${className}`}
    />
  );

  if (!claim) return image;

  return (
    <span className="inline-flex flex-col items-start">
      {image}
      <span
        className={`block uppercase ${claimClassName}`}
        style={{ paddingLeft: "3.5%", marginTop: "-1.5%", letterSpacing: "0.28em", fontSize: "10px", fontWeight: 600, lineHeight: 1.4 }}
      >
        {BRAND_CLAIM}
      </span>
    </span>
  );
}
