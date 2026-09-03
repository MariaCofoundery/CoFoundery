import { saveNetworkListingAction } from "./networkActions";
import { NETWORK_CATEGORIES, NETWORK_DIRECTIONS, NETWORK_REMOTE_MODES, NETWORK_VENTURE_STAGES, type NetworkListing } from "./networkTypes";

type T = (key: string, values?: Record<string, string | number>) => string;
const field = "mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100";
export function NetworkListingForm({ listing, direction, category, t }: { listing?: NetworkListing | null; direction?: string; category?: string; t: T }) {
  return <form action={saveNetworkListingAction} className="space-y-6">
    {listing ? <input type="hidden" name="id" value={listing.id} /> : null}
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-medium">{t("form.direction")}<select name="direction" defaultValue={listing?.direction || direction || "seeking"} className={field}>{NETWORK_DIRECTIONS.map((v) => <option key={v} value={v}>{t(`directions.${v}`)}</option>)}</select></label>
      <label className="text-sm font-medium">{t("form.category")}<select name="category" defaultValue={listing?.category || category || "expertise"} className={field}>{NETWORK_CATEGORIES.map((v) => <option key={v} value={v}>{t(`categories.${v}`)}</option>)}</select></label>
    </div>
    <label className="block text-sm font-medium">{t("form.title")}<input name="title" required minLength={5} maxLength={100} defaultValue={listing?.title} className={field} /></label>
    <label className="block text-sm font-medium">{t("form.summary")}<textarea name="summary" required minLength={20} maxLength={800} rows={6} defaultValue={listing?.summary} className={field} /><span className="mt-1 block text-xs text-slate-500">{t("form.summaryHint")}</span></label>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-medium">{t("form.topics")}<input name="topics" defaultValue={listing?.topics.join(", ")} className={field} /><span className="mt-1 block text-xs text-slate-500">{t("form.tagsHint", { max: 8 })}</span></label>
      <label className="text-sm font-medium">{t("form.industries")}<input name="industries" defaultValue={listing?.industries.join(", ")} className={field} /><span className="mt-1 block text-xs text-slate-500">{t("form.tagsHint", { max: 5 })}</span></label>
      <label className="text-sm font-medium">{t("form.location")}<input name="location_region" maxLength={120} defaultValue={listing?.location_region || ""} className={field} /></label>
      <label className="text-sm font-medium">{t("form.remote")}<select name="remote_mode" defaultValue={listing?.remote_mode || ""} className={field}><option value="">{t("form.optional")}</option>{NETWORK_REMOTE_MODES.map((v) => <option key={v} value={v}>{t(`remote.${v}`)}</option>)}</select></label>
      <label className="text-sm font-medium">{t("form.timeframe")}<input name="timeframe" maxLength={80} defaultValue={listing?.timeframe || ""} className={field} /></label>
      <label className="text-sm font-medium">{t("form.stage")}<select name="venture_stage" defaultValue={listing?.venture_stage || ""} className={field}><option value="">{t("form.optional")}</option>{NETWORK_VENTURE_STAGES.map((v) => <option key={v} value={v}>{t(`stages.${v}`)}</option>)}</select></label>
    </div>
    {listing?.category === "investment" || category === "investment" ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{t("investmentNotice")}</p> : null}
    <div className="flex flex-wrap gap-3"><button name="intent" value="publish" className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold">{t("actions.publish")}</button><button name="intent" value="draft" className="min-h-11 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold">{t("actions.saveDraft")}</button></div>
  </form>;
}
