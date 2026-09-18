"use client";

import { ChangeEvent, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { saveConnectVentureAction } from "@/features/connect/connectVentureActions";
import {
  VENTURE_AUDIENCE_MAX,
  VENTURE_AUDIENCE_MIN,
  VENTURE_MOTIVATION_MAX,
  VENTURE_NAME_MAX,
  VENTURE_NAME_MIN,
  VENTURE_WHAT_MAX,
  VENTURE_WHAT_MIN,
  type ConnectVenture,
} from "@/features/connect/connectTypes";
import { SubmitButton } from "@/features/ui/SubmitButton";

const field =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100";
const hint = "mt-1 block text-xs leading-5 text-slate-500";

/**
 * Ein Eintrag, nicht fuenf auf einmal.
 *
 * Fuenf Eintraege mit je fuenf Feldern in EIN Profilformular zu legen haette
 * es auf das Dreifache gebracht - und man haette alle zusammen speichern
 * muessen. Hier traegt jeder Eintrag sein eigenes Formular.
 */
export function ConnectVentureForm({
  venture,
  className,
}: {
  venture: ConnectVenture | null;
  className: string;
}) {
  const t = useTranslations("connect");
  const [logo, setLogo] = useState("");

  async function onLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogo(await readAsDataUrl(file));
  }

  return (
    <section className={className}>
      <h2 className="text-lg font-semibold">
        {t(venture ? "ventures.editTitle" : "ventures.formTitle")}
      </h2>

      <form action={saveConnectVentureAction} className="mt-5 grid gap-5">
        {venture ? <input type="hidden" name="venture_id" value={venture.id} /> : null}
        <input type="hidden" name="logo_image_data" value={logo} />

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {t("ventures.name")}
            <input
              name="name"
              required
              minLength={VENTURE_NAME_MIN}
              maxLength={VENTURE_NAME_MAX}
              defaultValue={venture?.name ?? ""}
              className={field}
              placeholder={t("ventures.namePlaceholder")}
            />
          </label>
          <label className="block text-sm font-medium">
            {t("ventures.roleLabel")}
            <input
              name="role_label"
              maxLength={VENTURE_NAME_MAX}
              defaultValue={venture?.role_label ?? ""}
              className={field}
              placeholder={t("ventures.roleLabelPlaceholder")}
            />
            <span className={hint}>{t("ventures.roleLabelHint")}</span>
          </label>
        </div>

        <label className="block text-sm font-medium">
          {t("ventures.whatItDoes")}
          <textarea
            name="what_it_does"
            required
            rows={4}
            minLength={VENTURE_WHAT_MIN}
            maxLength={VENTURE_WHAT_MAX}
            defaultValue={venture?.what_it_does ?? ""}
            className={field}
            placeholder={t("ventures.whatItDoesPlaceholder")}
          />
        </label>

        {/* Abgesetzt hervorgehoben: Es ist das Feld, an dem sich entscheidet,
            ob jemand beim Lesen an eine dritte Person denkt. */}
        <label className="block rounded-2xl border-l-[3px] border-violet-400 bg-violet-50/30 p-4 text-sm font-medium">
          {t("ventures.audience")}
          <textarea
            name="audience"
            required
            rows={2}
            minLength={VENTURE_AUDIENCE_MIN}
            maxLength={VENTURE_AUDIENCE_MAX}
            defaultValue={venture?.audience ?? ""}
            className={field}
            placeholder={t("ventures.audiencePlaceholder")}
          />
          <span className={hint}>{t("ventures.audienceHint")}</span>
        </label>

        <label className="block text-sm font-medium">
          {t("ventures.motivation")}
          <textarea
            name="motivation"
            rows={3}
            maxLength={VENTURE_MOTIVATION_MAX}
            defaultValue={venture?.motivation ?? ""}
            className={field}
            placeholder={t("ventures.motivationPlaceholder")}
          />
          <span className={hint}>{t("ventures.motivationHint")}</span>
        </label>

        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {t("ventures.website")}
            <input
              name="website"
              maxLength={200}
              defaultValue={venture?.website ?? ""}
              className={field}
              placeholder={t("ventures.websitePlaceholder")}
            />
            <span className={hint}>{t("ventures.websiteHint")}</span>
          </label>
          <label className="block text-sm font-medium">
            {t("ventures.logo")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onLogo}
              className="mt-2 block w-full text-sm text-slate-600 file:mr-3 file:min-h-11 file:rounded-full file:border file:border-slate-200 file:bg-white file:px-4 file:text-sm file:font-semibold"
            />
            <span className={hint}>
              {logo ? t("ventures.logoChange") : venture?.logo_path ? t("ventures.logoKeep") : t("ventures.logoHint")}
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton
            label={t("ventures.save")}
            pendingLabel={t("ventures.saving")}
            className="min-h-11 rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold"
          />
          {venture ? (
            <Link
              href="/connect/ventures"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-500 underline underline-offset-2"
            >
              {t("ventures.cancel")}
            </Link>
          ) : null}
        </div>
      </form>
    </section>
  );
}

/** Die Datei als data:-URL. Die Groessenpruefung macht der Server. */
function readAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}
