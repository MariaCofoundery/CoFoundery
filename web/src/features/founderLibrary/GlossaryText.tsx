import { getTranslations } from "next-intl/server";
import { FOUNDER_LIBRARY_TERMS } from "@/features/founderLibrary/founderLibraryRegistry";
import {
  buildGlossarySegments,
  founderLibraryTermHref,
  type GlossaryEntry,
} from "@/features/founderLibrary/glossaryLinking";

/**
 * Ein Absatz, in dem die Fachwoerter nachschlagbar sind.
 *
 * Serverkomponente: Das Verlinken ist reines Textumformen und braucht kein
 * JavaScript im Browser. Die Begriffsnamen kommen aus dem Sprachpaket, also
 * verlinkt ein englischer Text englische Begriffe.
 *
 * Die Links tragen `target="_blank"` - so bleibt das Formular, an dem gerade
 * jemand schreibt, unangetastet. Ein sichtbarer Hinweis darauf steht im
 * `title`, damit die Entscheidung nicht ueberrascht.
 */
export async function GlossaryText({
  text,
  className,
  maxLinks,
}: {
  text: string;
  className?: string;
  maxLinks?: number;
}) {
  const t = await getTranslations("founderLibrary");

  const entries: GlossaryEntry[] = FOUNDER_LIBRARY_TERMS.filter(
    (term) => term.status === "available"
  ).map((term) => ({
    id: term.id,
    slug: term.slug,
    name: t(`terms.${term.id}.term`),
  }));

  const segments = buildGlossarySegments(text, entries, { maxLinks });

  /**
   * Die Erklaerung selbst in die Vorschau, nicht der Hinweis auf die Library.
   *
   * Vorher stand im `title` nur "in der Founder Library nachschlagen - oeffnet
   * ein neues Fenster". Das ist die Bedienungsanleitung fuer den Link, nicht
   * die Antwort auf die Frage, die jemand gerade hat. Wer mit der Maus auf
   * "Vinkulierung" geht, will wissen, was das ist - und der Satz dazu liegt
   * ohnehin schon im Sprachpaket. Zwei Zeilen: erst die Erklaerung, dann der
   * Hinweis, dass ein Klick ein neues Fenster oeffnet.
   */
  const preview = (id: string) =>
    `${t(`terms.${id}.shortDefinition`)}\n\n${t("glossaryLink.more")}`;

  return (
    <p className={className}>
      {segments.map((segment, index) =>
        segment.type === "text" ? (
          <span key={index}>{segment.value}</span>
        ) : (
          <a
            key={index}
            href={founderLibraryTermHref(segment.slug)}
            target="_blank"
            rel="noreferrer noopener"
            title={preview(segment.id)}
            className="rounded-sm font-medium text-slate-900 decoration-slate-400 decoration-dotted underline-offset-4 hover:decoration-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 underline"
          >
            {segment.value}
          </a>
        )
      )}
    </p>
  );
}
