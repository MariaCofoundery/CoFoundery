import { getTranslations } from "next-intl/server";
import { deleteContentItemAction, saveContentDefaultsAction, saveContentItemAction } from "@/features/advisor/contentSettingsActions";
import { BRAND_COLORS, BRAND_COLOR_STYLE, CHANNELS, CONTENT_KINDS, POST_STATUSES, type ContentDefaults, type ContentItem, type ContentKind } from "@/features/advisor/socialCalendarModel";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { TILE, TILE_INPUT, TILE_LABEL } from "@/features/ui/FormControls";

/**
 * Content einmal einrichten (Entwurf 09.11.2026): Marken (mit Farbe), Content-Saeulen und Formate der Organisation, dazu der
 * Standard fuer neue Beitraege. Beim Anlegen eines Beitrags ist der Standard vorgewaehlt - man aendert nur, was diesmal
 * anders ist. Pflegen darf, wer das Recht "Termine, Formate und Materialien pflegen" hat (die Datenbank prueft es).
 */
export async function ContentSettings({
  orgId,
  items,
  defaults,
  members,
  canEdit,
  feedback,
}: {
  orgId: string;
  items: ContentItem[];
  defaults: ContentDefaults | null;
  members: { userId: string; name: string }[];
  canEdit: boolean;
  feedback: { error: boolean; saved: boolean };
}) {
  const t = await getTranslations("advisor.social.settings");
  const ts = await getTranslations("advisor.social");
  const of = (kind: ContentKind) => items.filter((item) => item.kind === kind);
  const select = (name: string, kind: ContentKind, value: string | null) => (
    <select name={name} defaultValue={value ?? ""} disabled={!canEdit} className={TILE_INPUT}>
      <option value="">{t("none")}</option>
      {of(kind).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  );
  return (
    <div className="grid gap-5">
      {feedback.error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t("error")}</p> : feedback.saved ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{ts("saved")}</p> : null}
      <p className="max-w-3xl text-[14.5px] leading-6 text-slate-700">{t("intro")}</p>
      {!canEdit ? <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{t("readOnly")}</p> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {CONTENT_KINDS.map((kind) => (
          <section key={kind} aria-labelledby={`content-${kind}`} className="advisor-card grid content-start gap-3 p-5">
            <h2 id={`content-${kind}`} className="text-[17px] font-bold text-slate-950">{t(`kinds.${kind}.title`)}</h2>
            <p className="text-[13px] leading-5 text-slate-600">{t(`kinds.${kind}.hint`)}</p>
            <ul className="grid gap-2">
              {of(kind).map((item) => (
                <li key={item.id} className="flex min-h-12 items-center gap-2.5 rounded-xl border border-slate-200 px-3">
                  {kind === "brand" ? <span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 rounded" style={{ background: BRAND_COLOR_STYLE[item.color ?? "violet"].hex }} /> : null}
                  <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{item.name}</span>
                  {canEdit ? (
                    <form action={deleteContentItemAction}>
                      <input type="hidden" name="orgId" value={orgId} />
                      <input type="hidden" name="id" value={item.id} />
                      <SubmitButton label={t("remove")} pendingLabel="…" className="inline-flex min-h-11 items-center px-2 text-[13px] font-semibold text-slate-600 underline-offset-4 hover:text-rose-800 hover:underline" />
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
            {canEdit ? (
              <form action={saveContentItemAction} className="grid gap-2 rounded-xl border-[1.5px] border-dashed border-slate-300 p-3">
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="kind" value={kind} />
                <label className="block"><span className="sr-only">{t(`kinds.${kind}.add`)}</span><input name="name" required maxLength={60} placeholder={t(`kinds.${kind}.add`)} className={`${TILE_INPUT} w-full`} /></label>
                {kind === "brand" ? (
                  <fieldset className="flex flex-wrap gap-2">
                    <legend className="sr-only">{t("color")}</legend>
                    {BRAND_COLORS.map((color, index) => (
                      <label key={color} className="relative cursor-pointer">
                        <input type="radio" name="color" value={color} defaultChecked={index === 0} className="peer sr-only" />
                        <span aria-hidden="true" className="block h-8 w-8 rounded-lg ring-offset-2 peer-checked:ring-2 peer-checked:ring-slate-900 peer-focus-visible:ring-2 peer-focus-visible:ring-violet-500" style={{ background: BRAND_COLOR_STYLE[color].hex }} />
                        <span className="sr-only">{t(`colors.${color}`)}</span>
                      </label>
                    ))}
                  </fieldset>
                ) : null}
                <SubmitButton label={`+ ${t(`kinds.${kind}.addShort`)}`} pendingLabel="…" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-violet-800 hover:bg-violet-50" />
              </form>
            ) : null}
          </section>
        ))}
      </div>

      <section aria-labelledby="content-defaults" className="advisor-card grid gap-4 p-5 sm:p-6">
        <div>
          <h2 id="content-defaults" className="text-[17px] font-bold text-slate-950">{t("defaultsTitle")}</h2>
          <p className="mt-1 text-[13px] leading-5 text-slate-600">{t("defaultsHint")}</p>
        </div>
        <form action={saveContentDefaultsAction} className="grid gap-4">
          <input type="hidden" name="orgId" value={orgId} />
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <label className={TILE}><span className={TILE_LABEL}>{t("single.brand")}</span>{select("brandId", "brand", defaults?.brandId ?? null)}</label>
            <label className={TILE}>
              <span className={TILE_LABEL}>{ts("form.channels")}</span>
              <select name="channel" defaultValue={defaults?.channel ?? ""} disabled={!canEdit} className={TILE_INPUT}>
                <option value="">{t("none")}</option>
                {CHANNELS.map((channel) => <option key={channel} value={channel}>{ts(`channels.${channel}`)}</option>)}
              </select>
            </label>
            <label className={TILE}><span className={TILE_LABEL}>{t("single.pillar")}</span>{select("pillarId", "pillar", defaults?.pillarId ?? null)}</label>
            <label className={TILE}><span className={TILE_LABEL}>{t("single.format")}</span>{select("formatId", "format", defaults?.formatId ?? null)}</label>
            <label className={TILE}>
              <span className={TILE_LABEL}>{ts("form.approver")}</span>
              <select name="approver" defaultValue={defaults?.approverUserId ?? ""} disabled={!canEdit} className={TILE_INPUT}>
                <option value="">{t("nobodyNeeded")}</option>
                {members.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}
              </select>
            </label>
            <label className={TILE}>
              <span className={TILE_LABEL}>{t("startStatus")}</span>
              <select name="status" defaultValue={defaults?.status ?? ""} disabled={!canEdit} className={TILE_INPUT}>
                <option value="">{t("none")}</option>
                {POST_STATUSES.map((status) => <option key={status} value={status}>{ts(`status.${status}`)}</option>)}
              </select>
            </label>
          </div>
          {canEdit ? <SubmitButton label={t("saveDefaults")} pendingLabel="…" className="inline-flex min-h-[46px] items-center justify-self-start rounded-xl bg-[#6D49E0] px-6 text-[14.5px] font-semibold text-white hover:bg-[#5B36D6]" /> : null}
        </form>
      </section>
    </div>
  );
}
