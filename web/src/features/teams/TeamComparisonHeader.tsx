import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import type { FounderTeamMemberSummary } from "@/features/teams/founderTeamHomebaseModel";

type Active = "venture" | "tradeoffs";

/**
 * Kopf der Vergleichsseiten im Team (Venture Alignment, Werte & Zielkonflikte).
 *
 * Wie im Entwurf „5 · Teamvergleich": oben wo man ist (Team · Teamvergleich),
 * die Frage als Titel, rechts wer dabei ist und dass alle dasselbe sehen, und
 * darunter die vier Ansichten des Vergleichs. Der Hinweis „Alle haben
 * freigegeben" steht nur, wenn der Vergleich wirklich bereit ist - die
 * Datenbank liefert ihn nur dann, und zwar erst, wenn alle aktuellen Mitglieder
 * abgegeben und geteilt haben.
 *
 * Nichts davon erscheint im Druck.
 */
export async function TeamComparisonHeader({
  teamId,
  teamLabel,
  title,
  active,
  members,
  allShared,
  badge,
}: {
  teamId: string;
  teamLabel: string | null;
  title: string;
  active: Active;
  members: FounderTeamMemberSummary[];
  allShared: boolean;
  /** „Beta": steht neben der Zeile ueber dem Titel. */
  badge?: string;
}) {
  const t = await getTranslations("teams.comparison");
  const id = encodeURIComponent(teamId);
  const tabs: { key: string; href: string; active: boolean }[] = [
    { key: "venture", href: `/teams/${id}/vorhaben-beta`, active: active === "venture" },
    { key: "workstyle", href: `/teams/${id}/workstyle`, active: false },
    { key: "tradeoffs", href: `/teams/${id}/zielkonflikte`, active: active === "tradeoffs" },
    { key: "setup", href: `/teams/${id}/setup`, active: false },
  ];
  return (
    <header className="ws-no-print">
      <Link
        href={`/teams/${id}`}
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
      >
        ← {t("back")}
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {teamLabel ? `${teamLabel} · ` : ""}
            {t("eyebrow")}
            {badge ? (
              <span className="ml-2 rounded-full border border-slate-300 px-2 py-0.5 text-[10px] text-slate-600">{badge}</span>
            ) : null}
          </p>
          <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        </div>
        {allShared && members.length > 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <ul className="flex -space-x-2">
              {members.map((member, index) => (
                <li key={member.userId}>
                  <ProfileAvatar
                    displayName={member.displayName ?? String(index + 1)}
                    avatarId={member.avatarId}
                    imageUrl={member.avatarUrl}
                    alt={member.displayName ?? ""}
                    className="h-9 w-9 rounded-full border-2 border-white object-cover"
                    fallbackClassName="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-violet-100 text-xs font-semibold text-violet-800"
                  />
                </li>
              ))}
            </ul>
            <p className="text-sm leading-5">
              <strong className="block font-semibold text-slate-900">{t("allShared")}</strong>
              <span className="text-slate-500">{t("sameReport")}</span>
            </p>
          </div>
        ) : null}
      </div>
      <nav aria-label={t("tabsLabel")} className="-mx-4 mt-5 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max items-end gap-1">
          {tabs.map((tab) => (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={tab.active ? "page" : undefined}
                className={`-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2 sm:px-4 ${
                  tab.active
                    ? "border-violet-500 font-semibold text-slate-950"
                    : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {t(`tabs.${tab.key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
