import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  FOUNDER_LIBRARY_TERMS,
  type FounderLibraryTerm,
} from "@/features/founderLibrary/founderLibraryRegistry";
import { getRequestUser } from "@/lib/supabase/server";

/**
 * Ein einzelner Begriff, unter einer eigenen Adresse.
 *
 * Diese Seite gibt es, weil Begriffe verlinkbar sein muessen. Bis zum
 * 19.09.2026 lebte das Glossar ausschliesslich als Liste mit aufklappbaren
 * Eintraegen - man konnte niemanden auf einen Begriff zeigen lassen, und der
 * `slug` im Register war unbenutzt.
 *
 * Bewusst schmal gehalten: Sie wird ueblicherweise in einem zweiten Fenster
 * geoeffnet, waehrend nebenan ein Text gelesen oder ein Formular ausgefuellt
 * wird. Wer mehr will, geht von hier ins vollstaendige Glossar.
 *
 * Und bewusst NICHT auf `hasFounder` beschraenkt wie die Library-Uebersicht:
 * Eine Worterklaerung hinter eine Rolle zu sperren, schuetzt nichts. Angemeldet
 * sein muss man, weil die Seite im Produktbereich liegt.
 */

function findTerm(slug: string): FounderLibraryTerm | null {
  return FOUNDER_LIBRARY_TERMS.find((term) => term.slug === slug && term.status === "available") ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const term = findTerm(slug);
  if (!term) return {};

  const t = await getTranslations("founderLibrary");
  return {
    title: `${t(`terms.${term.id}.term`)} – ${t("eyebrow")}`,
    description: t(`terms.${term.id}.shortDefinition`),
  };
}

export default async function FounderLibraryTermPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const term = findTerm(slug);
  if (!term) notFound();

  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/founder-library/${slug}`)}`);

  const [t, setupT] = await Promise.all([
    getTranslations("founderLibrary"),
    getTranslations("teams.setup"),
  ]);

  const relatedTerms = FOUNDER_LIBRARY_TERMS.filter(
    (entry) =>
      entry.id !== term.id && entry.status === "available" && entry.category === term.category
  ).slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {t(`categories.${term.category}`)}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {t(`terms.${term.id}.term`)}
      </h1>
      <p className="mt-4 text-base leading-8 text-slate-700">
        {t(`terms.${term.id}.shortDefinition`)}
      </p>

      {term.setupTopicKeys && term.setupTopicKeys.length > 0 ? (
        <section className="mt-8 rounded-2xl bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-slate-900">{t("termPage.setupTitle")}</h2>
          <ul className="mt-2 space-y-1 text-sm leading-7 text-slate-700">
            {term.setupTopicKeys.map((topicKey) => (
              <li key={topicKey}>{setupT(`items.${topicKey}.title`)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {relatedTerms.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-slate-900">{t("termPage.relatedTitle")}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {relatedTerms.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/founder-library/${entry.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-white px-4 text-sm font-medium text-slate-800 ring-1 ring-inset ring-slate-200 hover:ring-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  {t(`terms.${entry.id}.term`)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-xs leading-6 text-slate-500">{t("professionalNote")}</p>

      <p className="mt-6">
        <Link
          href="/founder-library"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          {t("termPage.allTerms")}
        </Link>
      </p>
    </main>
  );
}
