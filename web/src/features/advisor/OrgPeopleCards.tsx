import { getTranslations } from "next-intl/server";
import { saveOrgMemberCardAction } from "@/features/advisor/orgPeopleActions";
import type { MemberCard } from "@/features/advisor/orgPeopleData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { TILE, TILE_INPUT, TILE_LABEL } from "@/features/ui/FormControls";

type Member = { userId: string; displayName: string | null; role: "owner" | "advisor"; status: string; isSelf: boolean };

/**
 * "Wer ist wer" fuer die Organisation (06.11.2026): je aktivem Mitglied eine Karte - Kurzzeile, ein paar Saetze,
 * Kontakt - und der Haken "Die Startups im Programm duerfen das sehen". Standard ist nicht sichtbar. Die Inhaberin
 * beschreibt die anderen und zeigt sie; jede Person kann ihre Karte selbst aendern oder zuruecknehmen, und den
 * Kontakt traegt nur sie selbst ein.
 */
export async function OrgPeopleCards({
  orgId,
  members,
  cards,
  isOwner,
  back,
  savedUserId,
  error,
}: {
  orgId: string;
  members: Member[];
  cards: Map<string, MemberCard>;
  isOwner: boolean;
  back?: "setup";
  savedUserId: string | null;
  error: string | null;
}) {
  const t = await getTranslations("advisor.people");
  const active = members.filter((member) => member.status === "active");
  const shownCount = active.filter((member) => cards.get(member.userId)?.shown).length;
  const mine = active.find((member) => member.isSelf);
  // Wer noch nichts hat, steht zuerst offen: erst die eigene Karte, dann die der anderen.
  const ordered = [...active].sort((a, b) => Number(b.isSelf) - Number(a.isSelf));

  return (
    <section id="wer-ist-wer" aria-labelledby="people-title" className="scroll-mt-24 rounded-[20px] border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="people-title" className="font-brand text-[24px] font-semibold leading-tight text-slate-950">{t("title")}</h2>
      <p className="mt-1 max-w-2xl text-[14.5px] leading-6 text-slate-700">{t("text")}</p>
      <p className="mt-2 inline-flex rounded-full bg-violet-50 px-3 py-1 text-[13px] font-semibold text-violet-900">{t("summary", { shown: shownCount, total: active.length })}</p>
      {error ? <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">{error === "hidden" ? t("errorHidden") : t("errorFailed")}</p> : null}
      {mine && !cards.get(mine.userId)?.headline ? <p className="mt-3 rounded-xl bg-amber-50 px-4 py-2.5 text-[14px] text-amber-950">{t("describeYourself")}</p> : null}

      <ul className="mt-4 grid gap-3">
        {ordered.map((member) => {
          const card = cards.get(member.userId) ?? null;
          const canEdit = member.isSelf || isOwner;
          const name = member.displayName?.trim() || t("unnamed");
          const status = card?.shown ? "shown" : card?.selfHidden ? "withdrawn" : "hidden";
          return (
            <li key={member.userId} className="rounded-2xl border border-slate-200">
              <details open={savedUserId === member.userId || (member.isSelf && !card?.headline)}>
                <summary className="flex min-h-14 cursor-pointer list-none flex-wrap items-center gap-3 px-4 py-3">
                  <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-[15px] font-bold text-violet-900">{name.slice(0, 1).toUpperCase()}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15.5px] font-semibold text-slate-950">{name}{member.isSelf ? ` (${t("you")})` : ""} <span className="font-normal text-slate-600">· {member.role === "owner" ? t("roleOwner") : t("roleAdvisor")}</span></span>
                    <span className="truncate text-[13.5px] text-slate-700">{card?.headline || t("noHeadline")}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${status === "shown" ? "bg-emerald-100 text-emerald-900" : status === "withdrawn" ? "bg-amber-100 text-amber-950" : "bg-slate-100 text-slate-800"}`}>{t(`status.${status}`)}</span>
                </summary>
                {canEdit ? (
                  <form action={saveOrgMemberCardAction} className="grid gap-3 border-t border-slate-100 px-4 pb-4 pt-3">
                    <input type="hidden" name="orgId" value={orgId} />
                    <input type="hidden" name="userId" value={member.userId} />
                    {back ? <input type="hidden" name="back" value={back} /> : null}
                    <label className={TILE}>
                      <span className={TILE_LABEL}>{t("headline")}</span>
                      <input name="headline" maxLength={120} defaultValue={card?.headline ?? ""} placeholder={t("headlinePlaceholder")} className={TILE_INPUT} />
                    </label>
                    <label className={TILE}>
                      <span className={TILE_LABEL}>{t("about")}</span>
                      <textarea name="about" rows={3} maxLength={600} defaultValue={card?.about ?? ""} placeholder={t("aboutPlaceholder")} className={`${TILE_INPUT} resize-y font-normal leading-6`} />
                    </label>
                    {member.isSelf ? (
                      <label className={TILE}>
                        <span className={TILE_LABEL}>{t("contact")}</span>
                        <input name="contact" maxLength={200} defaultValue={card?.contact ?? ""} placeholder={t("contactPlaceholder")} className={TILE_INPUT} />
                      </label>
                    ) : (
                      <p className="text-[13px] text-slate-600">{t("contactOnlySelf")}</p>
                    )}
                    <label className={`flex items-start gap-3 rounded-[14px] px-3 py-3 ${card?.selfHidden && !member.isSelf ? "bg-amber-50" : "bg-[#F4F5FB]"}`}>
                      <input type="checkbox" name="shown" value="yes" defaultChecked={card?.shown ?? false} disabled={Boolean(card?.selfHidden && !member.isSelf)} className="mt-0.5 size-5 shrink-0" />
                      <span className="text-[14px] leading-6 text-slate-900">
                        <span className="font-semibold">{t("showToStartups")}</span>
                        <span className="block text-[13px] text-slate-700">{card?.selfHidden && !member.isSelf ? t("selfHiddenNote") : member.isSelf ? t("showHintSelf") : t("showHintOther")}</span>
                      </span>
                    </label>
                    <SubmitButton label={t("save")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white hover:bg-[#5B36D6]" />
                  </form>
                ) : (
                  <p className="border-t border-slate-100 px-4 py-3 text-[13.5px] text-slate-700">{card?.about || t("noAbout")}</p>
                )}
              </details>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
