import Link from "next/link";
import { getTranslations } from "next-intl/server";

export type FreigabenData = {
  photoVisible: boolean;
  linkedinUrl: string | null;
  linkedinVisibility: string | null;
  disclosure: string;
  /** null: Die Erlaubnis gibt es hier nicht (Matching v0.1 ist nicht aktiv). */
  matchingAllowed: boolean | null;
  hasFind: boolean;
  findStatus: string | null;
  workstyleShared: boolean;
  hasConnect: boolean;
  connectStatus: string | null;
  connectVisibility: string | null;
  suggestable: boolean | null;
  highlightable: boolean | null;
  research: string;
};

type Row = { key: string; title: string; state: string; on: boolean; href: string; note?: string };

/**
 * Alle Freigaben auf einer Seite: wo sie gelten, wie sie gerade stehen und wohin
 * man geht, um sie zu aendern.
 *
 * DAS IST EINE UEBERSICHT, KEIN ZWEITER ORT ZUM ENTSCHEIDEN. Jede Freigabe hat
 * ihren eigenen Vertrag, ihren eigenen Text und ihre eigene Speicherung dort,
 * wo sie wirkt (Foto beim Foto, Find im Find-Profil, ...). Diese Seite liest nur
 * und verlinkt. Keine Freigabe zieht eine andere nach, und hier gibt es keinen
 * "alles freigeben"-Schalter. Die beiden Einstellungen, die auf der Seite selbst
 * liegen (Faehigkeiten und deren Nutzung fuer Find), stehen darunter.
 */
export async function FreigabenOverview({ data }: { data: FreigabenData }) {
  const t = await getTranslations("capability.freigaben");

  const groups: { id: string; rows: Row[] }[] = [
    {
      id: "you",
      rows: [
        { key: "photo", title: t("rows.photo.title"), state: t(data.photoVisible ? "rows.photo.on" : "rows.photo.off"), on: data.photoVisible, href: "/profile?step=identity" },
        {
          key: "linkedin",
          title: t("rows.linkedin.title"),
          state: t(!data.linkedinUrl ? "rows.linkedin.none" : data.linkedinVisibility === "contacts" ? "rows.linkedin.contacts" : "rows.linkedin.private"),
          on: Boolean(data.linkedinUrl) && data.linkedinVisibility === "contacts",
          href: "/profile?step=identity",
        },
        {
          key: "capability",
          title: t("rows.capability.title"),
          state: t(`rows.capability.${["areas", "areas_depth_on_contact"].includes(data.disclosure) ? data.disclosure : "private"}`),
          on: data.disclosure !== "private",
          href: "#capability-disclosure",
        },
        ...(data.matchingAllowed !== null
          ? [{ key: "matching", title: t("rows.matching.title"), state: t(data.matchingAllowed ? "rows.matching.on" : "rows.matching.off"), on: data.matchingAllowed, href: "#capability-matching" }]
          : []),
      ],
    },
    {
      id: "align",
      rows: [{ key: "align", title: t("rows.align.title"), state: t("rows.align.state"), on: false, href: "/connections", note: t("rows.align.text") }],
    },
    ...(data.hasFind
      ? [
          {
            id: "find",
            rows: [
              { key: "find", title: t("rows.find.title"), state: t(`rows.find.${["active", "paused"].includes(data.findStatus ?? "") ? data.findStatus : "draft"}`), on: data.findStatus === "active", href: "/discovery/profile" },
              { key: "workstyle", title: t("rows.workstyle.title"), state: t(data.workstyleShared ? "rows.workstyle.on" : "rows.workstyle.off"), on: data.workstyleShared, href: "/discovery/suche#workstyle" },
            ],
          },
        ]
      : []),
    ...(data.hasConnect
      ? [
          {
            id: "connect",
            rows: [
              {
                key: "connect",
                title: t("rows.connect.title"),
                state: t(
                  data.connectStatus === "active"
                    ? data.connectVisibility === "public"
                      ? "rows.connect.public"
                      : "rows.connect.members"
                    : data.connectStatus === "paused"
                      ? "rows.connect.paused"
                      : "rows.connect.draft"
                ),
                on: data.connectStatus === "active",
                href: "/connect/profile",
              },
              { key: "suggest", title: t("rows.suggest.title"), state: t(data.suggestable === false ? "rows.suggest.off" : "rows.suggest.on"), on: data.suggestable !== false, href: "/connect/profile" },
              { key: "highlight", title: t("rows.highlight.title"), state: t(data.highlightable ? "rows.highlight.on" : "rows.highlight.off"), on: data.highlightable === true, href: "/connect/profile" },
            ],
          },
        ]
      : []),
    {
      id: "account",
      rows: [
        { key: "research", title: t("rows.research.title"), state: t(`rows.research.${["accepted", "declined", "undecided"].includes(data.research) ? data.research : "unknown"}`), on: data.research === "accepted", href: "/account" },
      ],
    },
  ];

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="freigaben-title">
      <h2 id="freigaben-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{t("text")}</p>
      <div className="mt-5 grid gap-6">
        {groups.map((group) => (
          <div key={group.id} className="grid gap-2">
            <h3 className="text-[11px] font-bold uppercase tracking-[.08em] text-slate-500">{t(`groups.${group.id}`)}</h3>
            {group.rows.map((row) => (
              <div key={row.key} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 rounded-2xl border border-slate-200 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-950">{row.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-sm text-slate-600">
                    <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${row.on ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span>{row.state}</span>
                  </p>
                  {row.note ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{row.note}</p> : null}
                </div>
                <Link href={row.href} className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                  {t("change")}
                </Link>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">{t("never")}</p>
    </section>
  );
}
