import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Orientierung auf der Startseite: „Euer Weg" und die beiden anderen Bereiche.
 *
 * Beides beantwortet eine Frage, die die Startseite bisher nicht stellte: Wo stehe ich auf dem Weg, und was
 * gibt es ausser Align noch? Es sind Wegweiser, keine Aufgaben - die stehen darunter („Was gerade ansteht").
 *
 *   Euer Weg   Ich verstehen -> Uns vergleichen -> Vereinbaren. Der erste Schritt hat einen Zustand (Profil
 *              offen/begonnen/steht), der zweite „hier geht es weiter", sobald es ein Team gibt. Kein
 *              Prozent, kein „x von y".
 *   Bereiche   Find und Connect als ruhiger Streifen mit dem Verlauf der Marke - nie als Aufgabe.
 */
export type ProfileStage = "open" | "started" | "done";

export async function DashboardPath({ profile, hasTeam }: { profile: ProfileStage; hasTeam: boolean }) {
  const t = await getTranslations("dashboard.path");
  const chip = {
    done: "bg-emerald-100 text-emerald-800",
    here: "bg-violet-100 text-violet-800",
    quiet: "bg-slate-100 text-slate-600",
  } as const;
  const stages = [
    {
      key: "understand",
      href: "/me/profile",
      state: profile === "done" ? ("done" as const) : profile === "started" ? ("here" as const) : ("quiet" as const),
      label: profile === "done" ? t("state.done") : profile === "started" ? t("state.started") : t("state.open"),
      active: profile !== "done",
    },
    {
      key: "compare",
      href: "/connections",
      state: hasTeam ? ("here" as const) : ("quiet" as const),
      label: hasTeam ? t("state.here") : t("state.open"),
      active: profile === "done" && hasTeam,
    },
    { key: "agree", href: "/connections", state: "quiet" as const, label: t("state.inTeam"), active: false },
  ];

  return (
    <section id="dashboard-block-path" className="mb-8" aria-labelledby="dashboard-path-title">
      <h2 id="dashboard-path-title" className="text-lg font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-1 text-sm text-slate-600">{t("lead")}</p>
      <ol className="mt-4 grid gap-3 md:grid-cols-3">
        {stages.map((stage, index) => (
          <li key={stage.key}>
            <Link
              href={stage.href}
              className={`flex h-full flex-col gap-2 rounded-2xl border bg-white p-5 transition hover:border-slate-300 ${
                stage.active ? "border-violet-300" : "border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-800">{index + 1}</span>
                <span className="text-base font-semibold text-slate-950">{t(`${stage.key}.title`)}</span>
              </span>
              <span className="text-sm leading-6 text-slate-600">{t(`${stage.key}.text`)}</span>
              <span className={`mt-auto self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${chip[stage.state]}`}>{stage.label}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export async function DashboardAreas({ hasConnect }: { hasConnect: boolean }) {
  const t = await getTranslations("dashboard.areas");
  return (
    <section id="dashboard-block-areas" className="brand-panel mb-8 flex flex-wrap items-center justify-between gap-5 rounded-[28px] p-6 sm:p-7" aria-labelledby="dashboard-areas-title">
      <div className="max-w-xl">
        <h2 id="dashboard-areas-title" className="text-xl font-semibold">{t("title")}</h2>
        <p className="mt-2 text-sm leading-7 text-white">{t("text")}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/discovery" className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-violet-800">{t("find")}</Link>
        {hasConnect ? (
          <Link href="/connect" className="inline-flex min-h-11 items-center rounded-xl border border-white/60 bg-white/15 px-5 text-sm font-semibold text-white">{t("connect")}</Link>
        ) : null}
      </div>
    </section>
  );
}
