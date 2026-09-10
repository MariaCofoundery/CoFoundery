"use client";

import { useState } from "react";
import { saveConnectListingAction } from "./connectActions";
import { ConnectSubmitButton } from "./ConnectSubmitButton";
import {
  CONNECT_CATEGORIES,
  CONNECT_DIRECTIONS,
  CONNECT_GEOGRAPHIC_SCOPES,
  CONNECT_REMOTE_MODES,
  CONNECT_VENTURE_STAGES,
  categorySupportsRemoteMode,
  categorySupportsVentureStage,
  type ConnectCategory,
  type ConnectListing,
} from "./connectTypes";
import { normalizeConnectLocations } from "./connectPresentation";
import { ConnectVisibilityField } from "./ConnectVisibilityField";

type T = (key: string, values?: Record<string, string | number>) => string;
const field = "mt-2 min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-slate-100";
const hint = "mt-1 block text-xs leading-5 text-slate-500";

export function ConnectListingForm({ listing, direction, category, canPublish = true, t }: { listing?: ConnectListing | null; direction?: string; category?: ConnectCategory;
  /**
   * Ob ein aktives Connect-Profil vorliegt. Ohne eines weist die Datenbank
   * das Veroeffentlichen ab (enforce_network_publication) - der Entwurf geht
   * aber. Der Knopf, der nicht funktioniert, wird deshalb nicht angeboten;
   * der Hinweis dazu steht auf der Seite ueber dem Formular.
   */
  canPublish?: boolean; t: T }) {
  const [selectedCategory, setSelectedCategory] = useState<ConnectCategory>(listing?.category || category || "expertise");
  const showRemote = categorySupportsRemoteMode(selectedCategory);
  const showStage = categorySupportsVentureStage(selectedCategory);

  return <form action={saveConnectListingAction} className="space-y-6">
    {listing ? <input type="hidden" name="id" value={listing.id} /> : null}
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-medium">{t("form.direction")}<select name="direction" defaultValue={listing?.direction || direction || "seeking"} className={field}>{CONNECT_DIRECTIONS.map((value) => <option key={value} value={value}>{t(`directions.${value}`)}</option>)}</select></label>
      <label className="text-sm font-medium">{t("form.category")}<select name="category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value as ConnectCategory)} className={field}>{CONNECT_CATEGORIES.map((value) => <option key={value} value={value}>{t(`categories.${value}`)}</option>)}</select></label>
    </div>
    <label className="block text-sm font-medium">{t("form.title")}<input name="title" required minLength={5} maxLength={100} defaultValue={listing?.title} className={field} /></label>
    <label className="block text-sm font-medium">{t("form.summary")}<textarea name="summary" required minLength={20} maxLength={800} rows={6} defaultValue={listing?.summary} className={field} /><span className={hint}>{t("form.summaryHint")}</span></label>
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-medium">{t("form.topics")}<input name="topics" defaultValue={listing?.topics.join(", ")} className={field} /><span className={hint}>{t("form.topicsHint", { max: 8 })}</span></label>
      <label className="text-sm font-medium">{t("form.industries")}<input name="industries" defaultValue={listing?.industries.join(", ")} className={field} /><span className={hint}>{t("form.industriesHint", { max: 5 })}</span></label>
      <label className="text-sm font-medium">{t("form.locations")}<input name="locations" defaultValue={normalizeConnectLocations(listing?.locations).join(", ")} className={field} /><span className={hint}>{t("form.locationsHint", { max: 3 })}</span></label>
      <label className="text-sm font-medium">{t("form.scope")}<select name="geographic_scope" defaultValue={listing?.geographic_scope || ""} className={field}><option value="">{t("form.optional")}</option>{CONNECT_GEOGRAPHIC_SCOPES.map((value) => <option key={value} value={value}>{t(`scopes.${value}`)}</option>)}</select><span className={hint}>{t("form.scopeHint")}</span></label>
      {showRemote ? <label className="text-sm font-medium">{t("form.remote")}<select name="remote_mode" defaultValue={listing?.remote_mode || ""} className={field}><option value="">{t("form.optional")}</option>{CONNECT_REMOTE_MODES.map((value) => <option key={value} value={value}>{t(`remote.${value}`)}</option>)}</select></label> : null}
      {showStage ? <label className="text-sm font-medium">{t("form.stage")}<select name="venture_stage" defaultValue={listing?.venture_stage || ""} className={field}><option value="">{t("form.optional")}</option>{CONNECT_VENTURE_STAGES.map((value) => <option key={value} value={value}>{t(`stages.${value}`)}</option>)}</select></label> : null}
      <label className="text-sm font-medium">{t("form.startsOn")}<input type="date" name="starts_on" defaultValue={listing?.starts_on || ""} className={field} /><span className={hint}>{t("form.startsOnHint")}</span></label>
      <label className="text-sm font-medium">{t("form.endsOn")}<input type="date" name="ends_on" defaultValue={listing?.ends_on || ""} className={field} /><span className={hint}>{t("form.endsOnHint")}</span></label>
    </div>
    {selectedCategory === "investment" ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{t("investmentNotice")}</p> : null}
    <ConnectVisibilityField initial={listing?.visibility} copy={{
      title: t("visibility.listingTitle"), membersOnly: t("visibility.membersOnly"), public: t("visibility.public"),
      publicHint: t("visibility.listingPublicHint"), confirm: t("visibility.listingConfirm"),
      previewTitle: t("visibility.publicFields"), previewItems: t("visibility.listingFields"),
    }} />
    <div className="flex flex-wrap gap-3">
      {canPublish ? (
        <ConnectSubmitButton intent="publish" label={t("actions.publish")} pendingLabel={t("pending.publish")} className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold" />
      ) : null}
      <ConnectSubmitButton intent="draft" label={t("actions.saveDraft")} pendingLabel={t("pending.save")} className="min-h-11 rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold" />
    </div>
  </form>;
}
