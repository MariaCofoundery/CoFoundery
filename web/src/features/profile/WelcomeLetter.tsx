import { getTranslations } from "next-intl/server";

/**
 * Marias Begruessung im ersten Schritt des Einstiegs.
 *
 * Bewusst ein Brief und kein Werbetext: erste Person, ihre Geschichte, was ihr
 * an dem Ort hier wichtig ist. Die vier Umgangsregeln stehen hier, damit sie
 * vor dem ersten Kontakt gelesen werden und nicht erst im Streitfall.
 *
 * Das Foto liegt in /public/brand (quadratisch zugeschnitten, 720 px). Ist
 * keins eingetragen, steht eine Kreisflaeche mit dem Anfangsbuchstaben da.
 */
const MARIA_PHOTO_SRC: string | null = "/brand/maria.jpg";

const VALUES = ["kind", "respect", "honest", "yours"] as const;

export async function WelcomeLetter() {
  const t = await getTranslations("profile.welcomeLetter");

  return (
    <div className="mt-5 grid gap-5 text-left md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] md:items-start">
      <article className="flex min-w-0 flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-4">
          {MARIA_PHOTO_SRC ? (
            // eslint-disable-next-line @next/next/no-img-element -- ein festes Bild aus /public
            <img
              src={MARIA_PHOTO_SRC}
              alt={t("photoAlt")}
              className="h-20 w-20 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-violet-100 text-2xl font-semibold text-violet-800"
            >
              M
            </span>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{t("fromLabel")}</p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-950">{t("greeting")}</h3>
          </div>
        </div>
        <p className="text-[15px] leading-7 text-slate-700">{t("story1")}</p>
        <p className="text-[15px] leading-7 text-slate-700">{t("story2")}</p>
        <p className="text-[15px] leading-7 text-slate-700">{t("story3")}</p>
        <p className="text-lg font-semibold text-slate-950">{t("signoff")}</p>
      </article>

      <div className="flex min-w-0 flex-col gap-5">
        <section className="rounded-3xl border border-violet-200 bg-violet-50/60 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">{t("valuesTitle")}</h3>
          <ol className="mt-3 grid gap-3">
            {VALUES.map((key, index) => (
              <li key={key} className="flex gap-3 text-[15px] leading-6 text-slate-700">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-sm font-semibold text-violet-800"
                >
                  {index + 1}
                </span>
                <p>
                  <strong className="font-semibold text-slate-950">{t(`values.${key}.title`)}</strong>{" "}
                  {t(`values.${key}.text`)}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950">{t("goodToKnowTitle")}</h3>
          <ul className="mt-3 grid gap-3 text-[15px] leading-6 text-slate-700">
            <li>
              <strong className="font-semibold text-slate-950">{t("phone.title")}</strong> {t("phone.text")}{" "}
              <a href="/made2found-aufs-handy.pdf" target="_blank" rel="noopener" className="font-semibold text-violet-700 underline underline-offset-2">
                {t("phone.link")}
              </a>
            </li>
            <li>
              <strong className="font-semibold text-slate-950">{t("feedback.title")}</strong> {t("feedback.text")}
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
