import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildCapabilityComparison } from "@/features/capability/capabilityComparison";
import { getCapabilityVocabulary } from "@/features/capability/capabilityData";
import {
  findComparablePerson,
  getComparisonSides,
} from "@/features/capability/capabilityComparisonData";
import { CapabilityComparisonView } from "@/features/capability/CapabilityComparisonView";
import { createClient } from "@/lib/supabase/server";

/**
 * Der Vergleich mit einer verbundenen Person.
 *
 * Die Zugriffspruefung steht vor allem anderen: Eine beliebige user_id in der
 * URL ergibt 404, nicht eine leere Seite. Und selbst mit Verbindung liefert
 * die Datenbank von der anderen Person nur, was ihre Freigabestufe hergibt -
 * die Seite kann die Leiter nicht umgehen.
 */
export default async function CompareCapabilityPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: otherUserId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/profile/compare/${otherUserId}`);

  const person = await findComparablePerson(supabase, user.id, otherUserId);
  // Keine Verbindung, keine Seite. Ein "kein Zugriff"-Hinweis wuerde
  // bestaetigen, dass es dieses Konto gibt.
  if (!person) notFound();

  const [t, vocabulary, sides] = await Promise.all([
    getTranslations("capability"),
    getCapabilityVocabulary(supabase),
    getComparisonSides(supabase, user.id, person),
  ]);

  const comparison = buildCapabilityComparison(
    sides.own,
    sides.other,
    vocabulary.areas,
    vocabulary.families
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <Link href="/profile" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:underline">
        ← {t("comparison.back")}
      </Link>

      {comparison.coverage.together === 0 ? (
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t("comparison.title")}</h1>
          {/* Kein Vergleich ohne Grundlage - und die Meldung sagt nicht, an
              welcher der beiden Seiten es liegt. */}
          <p className="mt-3 leading-7 text-slate-600">
            {t("comparison.empty", { name: person.displayName })}
          </p>
          <Link
            href="/profile?step=evidence"
            className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold"
          >
            {t("comparison.fillOwn")}
          </Link>
        </section>
      ) : (
        <div className="mt-6">
          <CapabilityComparisonView
            comparison={comparison}
            copy={{
              title: t("comparison.title"),
              intro: t("comparison.intro"),
              basis: t("comparison.basis"),
              gapNote: t("comparison.gapNote"),
              coverage: t("comparison.coverage", {
                together: comparison.coverage.together,
                shared: comparison.coverage.shared,
                onlyA: comparison.coverage.onlyA,
                onlyB: comparison.coverage.onlyB,
                name: person.displayName,
              }),
              overlap: comparison.overlap ? t(`comparison.overlap.${comparison.overlap}`) : null,
              yours: t("comparison.yours"),
              theirName: person.displayName,
              ownerLabel: (who) => t("comparison.ownerLabel", { who }),
              stateTitle: (state) => t(`comparison.states.${state}.title`),
              stateText: (state) => t(`comparison.states.${state}.text`),
              areaLabel: (areaId) => t(`areaLabels.${areaId}`),
              familyLabel: (familyId) => t(`families.${familyId}`),
              levelLabel: (level) => t(`levels.${level}`),
              levelUnset: t("comparison.levelUnset"),
              ownershipLabel: (wish) => t(`ownershipWishes.${wish}`),
              wishUnset: t("comparison.wishUnset"),
            }}
          />
        </div>
      )}
    </main>
  );
}
