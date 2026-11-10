import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { getOrgMembers } from "@/features/advisor/orgData";
import { listProgramEventsSplit } from "@/features/advisor/teamProgramData";
import { deleteContactAction, saveContactAction, setContactEventAction } from "@/features/advisor/partners/partnersActions";
import { CONTACT_KINDS, CONTACT_STATUSES, contactOf, filterContacts, isContactKind, type ContactEventLink, type OrgContact } from "@/features/advisor/partners/partnersModel";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-[15px] font-normal";
const LABEL = "block text-sm font-semibold text-slate-900";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Partnerliste (Entwurf 10.11.2026): interne Liste fuer Partner, Investoren, Speaker und Mentoren. Nur Mitglieder mit dem Recht
 * "Personen" sehen sie - Teams, Gaeste, andere Organisationen und Connect nie (Zeilensicherheit der Tabellen). Kein Verlauf,
 * keine Bewertung. Speaker lassen sich Events zuordnen.
 */
export async function OrgPartners({ client, orgId, query, canUse, locale }: { client: SupabaseClient; orgId: string; query: Record<string, string | undefined>; canUse: boolean; locale: string }) {
  const t = await getTranslations("advisor.partners");
  if (!canUse) return <p role="note" className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[15px] text-slate-800">{t("noRight")}</p>;

  const [contactsResult, linksResult, eventsResult, members] = await Promise.all([
    client.from("advisor_org_contacts").select("id, name, kinds, company, email, phone, url, notes, status, owner_user_id, topic, offer_link").eq("org_id", orgId).limit(1000),
    client.from("advisor_org_contact_events").select("contact_id, event_id, role").eq("org_id", orgId).limit(2000),
    listProgramEventsSplit(client, orgId),
    getOrgMembers(client, orgId),
  ]);
  const contacts = Array.isArray(contactsResult.data) ? (contactsResult.data as Record<string, unknown>[]).map(contactOf) : [];
  const links: ContactEventLink[] = Array.isArray(linksResult.data) ? (linksResult.data as { contact_id: string; event_id: string; role: string | null }[]).map((row) => ({ contactId: row.contact_id, eventId: row.event_id, role: row.role })) : [];
  // Termine liest man nur ueber die Funktion list_program_events (die Tabelle ist nicht direkt lesbar).
  const events = [...eventsResult.active].sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1)).map((event) => ({ id: event.eventId, title: event.title, starts_at: event.startsAt }));
  const memberList = members.filter((member) => member.status === "active").map((member) => ({ userId: member.userId, name: member.displayName ?? t("unnamed") }));
  const memberName = new Map(memberList.map((member) => [member.userId, member.name]));
  const day = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });

  const kind = isContactKind(query.art) ? query.art : null;
  const q = (query.q ?? "").slice(0, 80);
  const shown = filterContacts(contacts, kind, q);
  const countOf = (value: string) => contacts.filter((contact) => contact.kinds.includes(value as OrgContact["kinds"][number])).length;
  const selectedId = UUID.test(query.eintrag ?? "") ? (query.eintrag as string) : null;
  const creating = query.eintrag === "neu";
  const selected = selectedId ? contacts.find((contact) => contact.id === selectedId) ?? null : null;
  const href = (extra: Record<string, string | null>) => {
    const params = new URLSearchParams({ org: orgId, tab: "partners", ...(kind ? { art: kind } : {}), ...(q ? { q } : {}) });
    for (const [key, value] of Object.entries(extra)) value === null ? params.delete(key) : params.set(key, value);
    return `/advisor/organisation?${params.toString()}`;
  };
  const statusTone: Record<string, string> = { asked: "bg-slate-100 text-slate-800", talking: "bg-emerald-100 text-emerald-900", committed: "bg-violet-100 text-violet-900", active: "bg-emerald-100 text-emerald-900", paused: "bg-amber-100 text-amber-900" };
  const form = creating ? { contact: null as OrgContact | null } : selected ? { contact: selected } : null;
  const own = selected ? links.filter((link) => link.contactId === selected.id) : [];

  return (
    <section aria-labelledby="partners-title" className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="partners-title" className="font-brand text-2xl font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-1 max-w-2xl text-[14.5px] leading-6 text-slate-700">{t("intro")}</p>
        </div>
        <Link href={href({ eintrag: "neu" })} className="inline-flex min-h-11 items-center rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white hover:bg-[#5B36D6]">+ {t("add")}</Link>
      </div>
      {query.gespeichert === "1" ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("saved")}</p> : query.geloescht === "1" ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("deleted")}</p> : query.fehler ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{t(query.fehler === "url" ? "errorUrl" : "error")}</p> : null}

      <nav aria-label={t("kindsLabel")} className="flex flex-wrap gap-2">
        <Link href={href({ art: null })} aria-current={kind === null ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border-[1.5px] px-4 text-[13.5px] font-semibold ${kind === null ? "border-violet-600 bg-violet-50 text-slate-950" : "border-slate-200 bg-white text-slate-800"}`}>{t("all")} {contacts.length}</Link>
        {CONTACT_KINDS.map((entry) => <Link key={entry} href={href({ art: entry })} aria-current={kind === entry ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border-[1.5px] px-4 text-[13.5px] font-semibold ${kind === entry ? "border-violet-600 bg-violet-50 text-slate-950" : "border-slate-200 bg-white text-slate-800"}`}>{t(`kinds.${entry}`)} {countOf(entry)}</Link>)}
        <form method="get" action="/advisor/organisation" role="search" className="ml-auto flex gap-2">
          <input type="hidden" name="org" value={orgId} /><input type="hidden" name="tab" value="partners" />{kind ? <input type="hidden" name="art" value={kind} /> : null}
          <label className="sr-only" htmlFor="partner-q">{t("search")}</label>
          <input id="partner-q" type="search" name="q" defaultValue={q} maxLength={80} placeholder={t("search")} className="min-h-10 w-44 rounded-full border border-slate-300 bg-white px-4 text-[14px]" />
        </form>
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-1">
          {shown.length === 0 ? <p className="py-5 text-[15px] text-slate-700">{contacts.length === 0 ? t("empty") : t("emptyFiltered")}</p> : null}
          <ul>
            {shown.map((contact) => (
              <li key={contact.id} className={`flex items-center gap-3 border-t border-slate-100 first:border-t-0 ${contact.id === selectedId ? "-mx-5 bg-violet-50 px-5" : ""}`}>
                <Link href={href({ eintrag: contact.id })} className="min-w-0 flex-1 py-3.5">
                  <span className="block text-[15px] font-semibold text-slate-950">{contact.name}</span>
                  <span className="block truncate text-[13px] text-slate-700">{[contact.company, contact.kinds.map((entry) => t(`kinds.${entry}`)).join(", ")].filter(Boolean).join(" · ")}</span>
                </Link>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${statusTone[contact.status]}`}>{t(`statuses.${contact.status}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        {form ? (
          <div className="grid gap-4 rounded-[18px] border border-slate-200 bg-white p-5">
            <form action={saveContactAction} className="grid gap-3">
              <input type="hidden" name="orgId" value={orgId} />
              {form.contact ? <input type="hidden" name="contactId" value={form.contact.id} /> : null}
              <h3 className="text-lg font-semibold text-slate-950">{form.contact ? form.contact.name : t("newTitle")}</h3>
              <label className={LABEL}>{t("fields.name")}<input name="name" required maxLength={120} defaultValue={form.contact?.name ?? ""} className={FIELD} /></label>
              <fieldset><legend className="text-sm font-semibold text-slate-900">{t("fields.kinds")}</legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {CONTACT_KINDS.map((entry) => <label key={entry} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border-[1.5px] border-slate-300 bg-white px-3.5 text-[13.5px] font-semibold has-[:checked]:border-violet-600 has-[:checked]:bg-violet-50"><input type="checkbox" name="kind" value={entry} defaultChecked={form.contact ? form.contact.kinds.includes(entry) : entry === "partner"} className="h-4 w-4" />{t(`kinds.${entry}`)}</label>)}
                </div>
                <p className="mt-1 text-xs text-slate-600">{t("kindsHint")}</p>
              </fieldset>
              <label className={LABEL}>{t("fields.company")}<input name="company" maxLength={120} defaultValue={form.contact?.company ?? ""} className={FIELD} /></label>
              <label className={LABEL}>{t("fields.topic")}<input name="topic" maxLength={200} defaultValue={form.contact?.topic ?? ""} placeholder={t("fields.topicPlaceholder")} className={FIELD} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={LABEL}>{t("fields.email")}<input type="email" name="email" maxLength={200} defaultValue={form.contact?.email ?? ""} className={FIELD} /></label>
                <label className={LABEL}>{t("fields.phone")}<input name="phone" maxLength={60} defaultValue={form.contact?.phone ?? ""} className={FIELD} /></label>
              </div>
              <label className={LABEL}>{t("fields.url")}<input type="url" name="url" maxLength={300} defaultValue={form.contact?.url ?? ""} placeholder="https://" className={FIELD} /></label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={LABEL}>{t("fields.status")}<select name="status" defaultValue={form.contact?.status ?? "asked"} className={FIELD}>{CONTACT_STATUSES.map((entry) => <option key={entry} value={entry}>{t(`statuses.${entry}`)}</option>)}</select></label>
                <label className={LABEL}>{t("fields.owner")}<select name="owner" defaultValue={form.contact?.ownerUserId ?? ""} className={FIELD}><option value="">{t("fields.nobody")}</option>{memberList.map((member) => <option key={member.userId} value={member.userId}>{member.name}</option>)}</select></label>
              </div>
              <details open={Boolean(form.contact?.offerLink)}>
                <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center text-[14.5px] font-semibold text-violet-800">{t("fields.more")}</summary>
                <label className={`${LABEL} mt-1`}>{t("fields.offerLink")}<input name="offerLink" maxLength={500} defaultValue={form.contact?.offerLink ?? ""} placeholder="https://" className={FIELD} /><span className="mt-1 block text-xs font-normal text-slate-600">{t("fields.offerLinkHint")}</span></label>
              </details>
              <label className={LABEL}>{t("fields.notes")}<textarea name="notes" rows={4} maxLength={2000} defaultValue={form.contact?.notes ?? ""} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-[15px] font-normal" /></label>
              <div className="flex flex-wrap items-center gap-3">
                <SubmitButton label={t("save")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl bg-[#6D49E0] px-5 text-sm font-semibold text-white hover:bg-[#5B36D6]" />
                <Link href={href({ eintrag: null })} className="inline-flex min-h-11 items-center px-3 text-sm font-semibold text-slate-700">{t("close")}</Link>
              </div>
            </form>

            {form.contact ? (
              <>
                <section aria-labelledby="contact-events" className="grid gap-2 border-t border-slate-100 pt-4">
                  <h4 id="contact-events" className="text-[14.5px] font-bold text-slate-900">{t("eventsTitle")}</h4>
                  {own.length === 0 ? <p className="text-[13.5px] text-slate-600">{t("eventsNone")}</p> : null}
                  <ul className="grid gap-1.5">
                    {own.map((link) => {
                      const event = events.find((entry) => entry.id === link.eventId);
                      return (
                        <li key={link.eventId} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 text-[14px]">
                          <span className="min-w-0 flex-1 py-2.5">{event ? `${event.title} · ${day.format(new Date(event.starts_at))}` : t("hiddenEvent")}{link.role ? ` · ${link.role}` : ""}</span>
                          <form action={setContactEventAction}><input type="hidden" name="orgId" value={orgId} /><input type="hidden" name="contactId" value={form.contact!.id} /><input type="hidden" name="eventId" value={link.eventId} /><input type="hidden" name="remove" value="yes" /><SubmitButton label={t("eventRemove")} pendingLabel="…" className="inline-flex min-h-11 items-center px-2 text-[13px] font-semibold text-slate-600 hover:text-rose-800" /></form>
                        </li>
                      );
                    })}
                  </ul>
                  {events.length > 0 ? (
                    <form action={setContactEventAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
                      <input type="hidden" name="orgId" value={orgId} /><input type="hidden" name="contactId" value={form.contact.id} />
                      <select name="eventId" required defaultValue="" aria-label={t("eventPick")} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-[14px]"><option value="" disabled>{t("eventPick")}</option>{events.filter((event) => !own.some((link) => link.eventId === event.id)).map((event) => <option key={event.id} value={event.id}>{event.title} · {day.format(new Date(event.starts_at))}</option>)}</select>
                      <input name="role" maxLength={60} aria-label={t("eventRole")} placeholder={t("eventRole")} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-[14px]" />
                      <SubmitButton label={t("eventAdd")} pendingLabel="…" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-violet-800 hover:bg-violet-50" />
                    </form>
                  ) : null}
                </section>
                <form action={deleteContactAction} className="border-t border-slate-100 pt-3">
                  <input type="hidden" name="orgId" value={orgId} /><input type="hidden" name="contactId" value={form.contact.id} />
                  <SubmitButton label={t("delete")} pendingLabel="…" className="inline-flex min-h-11 items-center text-sm font-semibold text-rose-700 underline-offset-4 hover:underline" />
                </form>
              </>
            ) : null}
            {form.contact?.ownerUserId ? <p className="text-xs text-slate-600">{t("ownerLine", { name: memberName.get(form.contact.ownerUserId) ?? t("unnamed") })}</p> : null}
          </div>
        ) : (
          <p className="rounded-[18px] border border-dashed border-slate-300 bg-white px-5 py-6 text-[14.5px] leading-6 text-slate-700">{t("pickHint")}</p>
        )}
      </div>
      <p className="max-w-3xl text-xs leading-5 text-slate-600">{t("footnote")}</p>
    </section>
  );
}
