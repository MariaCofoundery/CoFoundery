import { getTranslations } from "next-intl/server";
import { AnswerList } from "@/features/team-intake/Answers";
import {
  FACT_KEYS,
  PAIR_FACT_KEYS,
  pairKeys,
  type IntakeRound,
  type IntakeReport,
} from "@/features/team-intake/model";

/** Only the shared RPC result enters this component; never private notes. */
export async function SharedIntakeReport({
  round,
  report,
}: {
  round: IntakeRound;
  report: IntakeReport;
}) {
  const t = await getTranslations("intake");
  const name = (id: string) =>
    round.participants.find((p) => p.user_id === id)?.name ?? t("missing");
  const commonSections = [
    { title: "formationSection", keys: [...FACT_KEYS] },
    {
      title: "motivationSection",
      keys: round.mode === "selection" ? ["motivation"] : ["works_well"],
    },
    {
      title: "openSection",
      keys:
        round.mode === "selection"
          ? ["open_topics", "open_text"]
          : ["team_clarity"],
    },
  ];
  const pairSections = [
    { title: "history", keys: [...PAIR_FACT_KEYS] },
    {
      title: "perspectives",
      keys: pairKeys(round.mode).filter(
        (k) => !PAIR_FACT_KEYS.includes(k as (typeof PAIR_FACT_KEYS)[number]),
      ),
    },
  ];
  return (
    <>
      <h2 className="text-2xl font-semibold">{t("report")}</h2>
      <p>
        {t("stand")}: {round.published_at?.slice(0, 10)}
      </p>
      {pairSections.slice(0, 1).map((section) => (
        <section key={section.title} className="space-y-5">
          <h3 className="text-xl font-semibold">{t(section.title)}</h3>
          {report.pairs.map((a) => (
            <article
              key={`${a.author_user_id}-${a.target_user_id}`}
              className="rounded-xl border p-4"
            >
              <h4 className="mb-4 font-semibold">
                {t("direction", {
                  author: name(a.author_user_id),
                  target: name(a.target_user_id),
                })}
              </h4>
              <AnswerList data={a.data} keys={section.keys} />
            </article>
          ))}
        </section>
      ))}
      {commonSections.slice(0, 1).map((section) => (
        <section key={section.title} className="space-y-5">
          <h3 className="text-xl font-semibold">{t(section.title)}</h3>
          {report.common.map((a) => (
            <article key={a.author_user_id} className="rounded-xl border p-4">
              <h4 className="mb-4 font-semibold">
                {t("by", { name: name(a.author_user_id) })}
              </h4>
              <AnswerList data={a.data} keys={section.keys} />
            </article>
          ))}
        </section>
      ))}
      {pairSections.slice(1).map((section) => (
        <section key={section.title} className="space-y-5">
          <h3 className="text-xl font-semibold">{t(section.title)}</h3>
          {report.pairs.map((a) => (
            <article
              key={`${a.author_user_id}-${a.target_user_id}`}
              className="rounded-xl border p-4"
            >
              <h4 className="mb-4 font-semibold">
                {t("direction", {
                  author: name(a.author_user_id),
                  target: name(a.target_user_id),
                })}
              </h4>
              <AnswerList data={a.data} keys={section.keys} />
            </article>
          ))}
        </section>
      ))}
      {commonSections.slice(1).map((section) => (
        <section key={section.title} className="space-y-5">
          <h3 className="text-xl font-semibold">{t(section.title)}</h3>
          {report.common.map((a) => (
            <article key={a.author_user_id} className="rounded-xl border p-4">
              <h4 className="mb-4 font-semibold">
                {t("by", { name: name(a.author_user_id) })}
              </h4>
              <AnswerList data={a.data} keys={section.keys} />
            </article>
          ))}
        </section>
      ))}
      <section>
        <h3 className="text-xl font-semibold">{t("conversationSection")}</h3>
        <p>{t("conversationHelp")}</p>
      </section>
    </>
  );
}
