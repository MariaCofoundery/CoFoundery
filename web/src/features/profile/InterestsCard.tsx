import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { INTEREST_AREAS } from "@/features/profile/interests";
import { getInterests } from "@/features/profile/interestsData";
import { saveInterestsAction } from "@/features/profile/interestsActions";
import { ConnectSubmitButton as SubmitButton } from "@/features/connect/ConnectSubmitButton";
import { IconTile, type IconName, type IconTone } from "@/features/ui/Icons";

const ICONS: Record<(typeof INTEREST_AREAS)[number], { icon: IconName; tone: IconTone }> = {
  align: { icon: "team", tone: "violet" },
  find: { icon: "search", tone: "blue" },
  connect: { icon: "network", tone: "blue" },
  advise: { icon: "shield", tone: "teal" },
};

/**
 * „Wofuer ich hier bin": was die Person hier tun moechte. Eine Absicht - sie
 * steuert, was die Startseite vorschlaegt, und oeffnet oder schliesst nichts.
 * Rollen und Zugaenge stehen davon getrennt (Rollenfeld, Freigaben).
 *
 * Eigenes Formular, ausserhalb des Identitaetsformulars: Formulare lassen sich
 * nicht verschachteln.
 */
export async function InterestsCard({ client, userId }: { client: SupabaseClient; userId: string }) {
  const [t, current] = await Promise.all([getTranslations("capability.interests"), getInterests(client, userId)]);
  return (
    <section aria-labelledby="interests-title" className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
      <h2 id="interests-title" className="text-lg font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("text")}</p>
      <form action={saveInterestsAction} className="mt-4">
        <ul className="grid gap-3 sm:grid-cols-2">
          {INTEREST_AREAS.map((area) => (
            <li key={area}>
              <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 has-[:checked]:border-violet-400 has-[:checked]:bg-violet-50/50">
                <input type="checkbox" name="interest" value={area} defaultChecked={current.includes(area)} className="mt-1 h-4 w-4" />
                <IconTile name={ICONS[area].icon} tone={ICONS[area].tone} size="sm" />
                <span>
                  <span className="block text-sm font-semibold text-slate-950">{t(`options.${area}.title`)}</span>
                  <span className="block text-xs leading-5 text-slate-600">{t(`options.${area}.text`)}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-5 text-slate-500">{t("note")}</p>
        <SubmitButton
          label={t("save")}
          pendingLabel={t("saving")}
          className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white"
        />
      </form>
    </section>
  );
}
