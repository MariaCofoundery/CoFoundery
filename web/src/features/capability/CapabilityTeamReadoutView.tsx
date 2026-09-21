import { getTranslations } from "next-intl/server";

import type { TeamCapabilityReadout } from "./capabilityTeamData";
import { TEAM_AREA_STATES, type TeamAreaStateKey } from "./capabilityTeamReadout";

/**
 * Die Rollenlage, sichtbar gemacht.
 *
 * WARUM EINE DECKUNGSKARTE UND KEIN NETZDIAGRAMM: Ein Spinnennetz über die
 * Familien sieht gut aus und behauptet eine Zahl je Familie - also einen
 * Score. Genau den gibt dieses Modell nicht her (Edwards, siehe
 * `docs/capability-comparison-theory-brief.md`), und ein Bild, das mehr
 * behauptet als die Daten, ist die unehrlichste Stelle einer Auswertung.
 *
 * Gezeigt wird deshalb, was wirklich vorliegt: je Familie ein Balken aus
 * einzelnen Bereichen, jeder in der Farbe seines Zustands. Das sind Zählwerte
 * über Bereiche - Tatsachen, keine Note.
 *
 * DER BALKEN IST SCHMUCK, DIE ZAHLEN SIND DER INHALT. Er ist `aria-hidden`,
 * und dieselbe Auskunft steht als Text daneben: Wer mit einem Screenreader
 * liest oder Farben nicht unterscheidet, verliert nichts.
 *
 * "DARÜBER HAT NIEMAND GESPROCHEN" IST DIE WICHTIGSTE ZELLE. Bei 47 Bereichen
 * und einer Handvoll Einträgen je Person ist sie am Anfang der Normalfall. Sie
 * wird deshalb ausdrücklich NICHT wie eine Lücke gezeichnet - graue Schrift,
 * kein Balken, kein Warnton. Eine Lücke ist eine Aussage über das Team; das
 * hier ist eine über das Gespräch.
 */

/**
 * Farbe je Zustand.
 *
 * Rot NUR für `gap` - "niemand will, niemand kann" ist der einzige Zustand,
 * der eine Entscheidung erzwingt (einstellen, beauftragen oder bewusst
 * lassen). Ein doppelter Anspruch ist dringend, aber lösbar: bernstein. Und
 * `noBasis` ist blass, weil es kein Befund ist.
 */
const STATE_COLOR: Record<TeamAreaStateKey, string> = {
  contested: "bg-amber-400",
  gap: "bg-rose-400",
  openPosition: "bg-slate-400",
  claimedShallow: "bg-violet-300",
  handoverPath: "bg-sky-300",
  settled: "bg-emerald-400",
  noBasis: "bg-slate-200",
};

/** Zustände, die eine Handlung nach sich ziehen - sie stehen ausgeschrieben da. */
const ACTIONABLE: TeamAreaStateKey[] = [
  "contested",
  "gap",
  "openPosition",
  "claimedShallow",
  "handoverPath",
];

export async function CapabilityTeamReadoutView({
  data,
}: {
  data: TeamCapabilityReadout;
}) {
  const t = await getTranslations("capability");
  const { readout } = data;

  const nameOf = (userId: string) =>
    readout.members.find((member) => member.userId === userId)?.name?.trim() ||
    t("team.unnamedMember");

  const areaLabel = (areaId: string) => t(`areaLabels.${areaId}`);
  const familyLabel = (familyId: string) => t(`families.${familyId}`);

  const actionable = readout.findings.filter((finding) => ACTIONABLE.includes(finding.state));
  const settled = readout.findings.find((finding) => finding.state === "settled");
  const noBasis = readout.findings.find((finding) => finding.state === "noBasis");

  return (
    <div>
      {/* ------------------------------------------------------------------
          Erst die Auskunft darüber, worauf das hier beruht.

          Sie steht VOR der Auswertung und nicht als Fußnote darunter: Eine
          dünne Karte liest sich sonst wie ein Befund über das Team, obwohl sie
          eine Auskunft über Einstellungen ist.
          ------------------------------------------------------------------ */}
      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
        {t("team.basis", {
          contributing: data.contributing,
          members: data.memberCount,
          withDepth: data.withDepth,
        })}
      </p>

      {/* ------------------------------------------------------------------
          Die Deckungskarte.
          ------------------------------------------------------------------ */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold text-slate-950">{t("team.mapTitle")}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{t("team.mapText")}</p>

        <ul className="mt-4 grid gap-2">
          {readout.families.map((family) => {
            const claimants = family.claimants.map(nameOf);
            const isUnspoken = family.state === "unspoken";

            return (
              <li
                key={family.familyId}
                className={`grid gap-1 rounded-2xl border p-3 sm:grid-cols-[14rem_1fr_9rem] sm:items-center sm:gap-4 ${
                  isUnspoken ? "border-slate-100 bg-white/50" : "border-slate-200 bg-white"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    isUnspoken ? "text-slate-400" : "text-slate-900"
                  }`}
                >
                  {familyLabel(family.familyId)}
                </p>

                {isUnspoken ? (
                  /* Kein Balken. Ein leerer oder grauer Balken würde wie ein
                     Messergebnis aussehen, und es gibt keines. */
                  <p className="text-xs leading-5 text-slate-400">{t("team.familyUnspoken")}</p>
                ) : (
                  <div>
                    {/* Schmuck: Die Farben wiederholen nur, was rechts und
                        unten in Worten steht. */}
                    <div aria-hidden className="flex h-2 gap-0.5 overflow-hidden rounded-full">
                      {family.areas.map((area) => (
                        <span
                          key={area.areaId}
                          title={`${areaLabel(area.areaId)}: ${t(`team.states.${area.state}.label`)}`}
                          className={`h-2 flex-1 ${STATE_COLOR[area.state]}`}
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs leading-5 text-slate-500">
                      {TEAM_AREA_STATES.filter((state) => family.counts[state] > 0)
                        .map((state) =>
                          t("team.countEntry", {
                            count: family.counts[state],
                            state: t(`team.states.${state}.label`),
                          })
                        )
                        .join(" · ")}
                    </p>
                  </div>
                )}

                {!isUnspoken ? (
                  <p className="text-xs leading-5 text-slate-600 sm:text-right">
                    {claimants.length > 0
                      ? t("team.claimedBy", { names: claimants.join(", ") })
                      : t("team.claimedByNobody")}
                  </p>
                ) : (
                  <span />
                )}
              </li>
            );
          })}
        </ul>

        {/* Die Legende, in derselben Reihenfolge wie die Dringlichkeit. */}
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-slate-600">
          {TEAM_AREA_STATES.map((state) => (
            <li key={state} className="flex items-center gap-1.5">
              <span aria-hidden className={`h-2 w-4 rounded-full ${STATE_COLOR[state]}`} />
              {t(`team.states.${state}.label`)}
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------------
          Was daraus folgt - ausgeschrieben, nach Dringlichkeit.

          Die Farben oben zeigen die Lage; hier steht, was sie bedeutet und was
          man damit tun kann. Ein Bild ohne diesen Teil wäre eine Behauptung
          ohne Begründung.
          ------------------------------------------------------------------ */}
      {actionable.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-950">{t("team.findingsTitle")}</h2>
          <div className="mt-4 grid gap-4">
            {actionable.map((finding) => (
              <article
                key={finding.state}
                className="rounded-3xl border border-slate-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span aria-hidden className={`h-2 w-4 rounded-full ${STATE_COLOR[finding.state]}`} />
                  <h3 className="text-base font-semibold text-slate-950">
                    {t(`team.states.${finding.state}.label`)}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {t("team.areaCount", { count: finding.areas.length })}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {t(`team.states.${finding.state}.text`)}
                </p>

                <ul className="mt-3 grid gap-2">
                  {finding.areas.map((area) => {
                    const claimants = area.claimants.map(nameOf);
                    const deep = area.deep.map(nameOf);
                    return (
                      <li key={area.areaId} className="text-sm leading-6">
                        <span className="font-medium text-slate-900">{areaLabel(area.areaId)}</span>
                        {/* WER, IN KLARTEXT. "Jemand will das verantworten"
                            ist unbrauchbar - das Gespräch darüber führt man
                            mit Namen. */}
                        {claimants.length > 0 ? (
                          <span className="text-slate-600">
                            {" – "}
                            {t("team.wants", { names: claimants.join(", ") })}
                          </span>
                        ) : null}
                        {deep.length > 0 ? (
                          <span className="text-slate-500">
                            {" · "}
                            {t("team.canDo", { names: deep.join(", ") })}
                          </span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {/* Besetztes und Angabenloses zusammengeklappt: Beides ist keine
          Handlung. Wer nachsehen will, klappt es auf. */}
      {settled || noBasis ? (
        <section className="mt-6 grid gap-3">
          {settled ? (
            <details className="rounded-3xl border border-slate-200 bg-white p-5">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-800">
                {t("team.states.settled.label")} ({settled.areas.length})
              </summary>
              <ul className="mt-3 grid gap-1 text-sm leading-6">
                {settled.areas.map((area) => (
                  <li key={area.areaId}>
                    <span className="font-medium text-slate-900">{areaLabel(area.areaId)}</span>
                    <span className="text-slate-600">
                      {" – "}
                      {t("team.wants", { names: area.claimants.map(nameOf).join(", ") })}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {noBasis ? (
            <details className="rounded-3xl border border-slate-200 bg-white/60 p-5">
              <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">
                {t("team.states.noBasis.label")} ({noBasis.areas.length})
              </summary>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {t("team.states.noBasis.text")}
              </p>
              <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-700">
                {noBasis.areas.map((area) => (
                  <li key={area.areaId}>{areaLabel(area.areaId)}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
