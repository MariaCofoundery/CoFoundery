import { getTranslations } from "next-intl/server";

import type { ShortProfile } from "@/features/strengths/shortProfileData";
import { UserText } from "@/features/ui/UserText";

/**
 * Die Karte „Ich in Kürze“: ein Satz, bis zu fünf Stärken (gleichwertig, ohne Rangfolge, ohne Zahl), optional „ich suche“,
 * „ich biete“ und je Stärke ein eigenes Zitat. Sie zeigt nur, was die Person selbst eingetragen hat.
 */
export async function ShortProfileCard({ profile, name }: { profile: Pick<ShortProfile, "tagline" | "strengths" | "seeks" | "offers">; name?: string }) {
  const t = await getTranslations("strengths.shortProfile");
  return (
    <section aria-label={t("cardLabel")} className="overflow-hidden rounded-[24px] bg-[#14152b] p-6 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c9bbf7]">{name ? t("cardFor", { name }) : t("cardLabel")}</p>
      {profile.tagline ? (
        <p className="font-brand mt-3 text-[clamp(24px,3vw,32px)] leading-[1.15]">
          <UserText text={profile.tagline} />
        </p>
      ) : null}
      {profile.strengths.length > 0 ? (
        <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0">
          {profile.strengths.map((entry) => (
            <li key={entry.label} className="flex flex-col gap-1">
              <span className="w-fit rounded-full bg-[#2a1f6b] px-3 py-1 text-sm font-semibold text-[#e6deff]">{entry.label}</span>
              {entry.quote ? (
                <span className="text-[15px] italic text-[#b9bbd6]">
                  »<UserText text={entry.quote} />«
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {profile.seeks || profile.offers ? (
        <dl className="m-0 mt-5 grid gap-3 border-t border-white/15 pt-4 text-[15px] sm:grid-cols-2">
          {profile.seeks ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a9abcb]">{t("seeks")}</dt>
              <dd className="m-0 mt-1"><UserText text={profile.seeks} /></dd>
            </div>
          ) : null}
          {profile.offers ? (
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-[#a9abcb]">{t("offers")}</dt>
              <dd className="m-0 mt-1"><UserText text={profile.offers} /></dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </section>
  );
}
