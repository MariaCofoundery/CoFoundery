import { getTranslations } from "next-intl/server";
import type { ConversationPoint } from "@/features/find/conversationPrompts";

/**
 * Darstellung der Gesprächspunkte aus `conversationPoints` - ohne Wertung,
 * ohne Zahl. Jede Zeile trägt ihre Claim-ID als `data-claim`.
 */
export async function ConversationPoints({
  points,
  kind,
  candidateName,
  variant = "detail",
}: {
  points: ConversationPoint[];
  kind: "why" | "discuss";
  candidateName: string;
  variant?: "detail" | "card";
}) {
  const [t, tDiscovery, tCapability, tWorkstyle] = await Promise.all([
    getTranslations("find.conversation"),
    getTranslations("discovery"),
    getTranslations("capability"),
    getTranslations("find.workstyle"),
  ]);
  const list = (values: string[] | undefined, label: (v: string) => string) => (values ?? []).map(label).join(", ");
  const text = (point: ConversationPoint) => {
    const v = point.values;
    const valueLabel = (value: string | undefined) => {
      if (!value) return "";
      if (point.key === "discuss.searchIntentDiffers") return tDiscovery(`searchIntents.${value}.short`);
      if (point.key === "discuss.startHorizonDiffers") return tDiscovery(`startHorizons.${value}.short`);
      if (point.key === "discuss.remoteModeDiffers") return tDiscovery(`remoteModes.${value}`);
      return value;
    };
    return t(point.key, {
      name: candidateName,
      roles: list(v.roles, (r) => tDiscovery(`roles.${r}`)),
      areas: list(v.areas, (a) => tCapability(`areaLabels.${a}`)),
      industries: (v.industries ?? []).join(", "),
      you: valueLabel(v.you),
      them: valueLabel(v.them),
      area: v.workstyleArea ? tWorkstyle(`areas.${v.workstyleArea}`) : "",
    });
  };

  if (variant === "card") {
    if (!points.length) return null;
    return (
      <section className="mt-5 border-t border-slate-100 pt-4" aria-label={t("whyTitle")}>
        <p className="text-xs font-semibold text-slate-700">{t("cardWhyLead")}</p>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
          {points.slice(0, 2).map((point) => (
            <li key={point.claim} data-claim={point.claim}>
              {text(point)}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  const headingId = `find-conversation-${kind}`;
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-6"
    >
      <h2 id={headingId} className="text-2xl font-semibold text-slate-950">
        {t(kind === "why" ? "whyTitle" : "discussTitle")}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        {t(kind === "why" ? "whyIntro" : "discussIntro")}
      </p>
      {points.length ? (
        <ul className="mt-4 space-y-3">
          {points.map((point) => (
            <li
              key={point.claim}
              data-claim={point.claim}
              className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-800"
            >
              {text(point)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm leading-6 text-slate-600">{t(kind === "why" ? "whyEmpty" : "discussEmpty")}</p>
      )}
    </section>
  );
}
