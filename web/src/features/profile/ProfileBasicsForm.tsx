"use client";

import { useState } from "react";
import { upsertProfileBasicsAction } from "@/features/profile/actions";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { AVATAR_LIBRARY } from "@/features/profile/avatarLibrary";
import {
  PROFILE_ROLE_OPTIONS,
  normalizeProfileRoles,
  profileRoleLabel,
} from "@/features/profile/profileRoles";

type ProfileBasicsValues = {
  display_name: string | null;
  focus_skill: string | null;
  intention: string | null;
  roles?: string[] | null;
  avatar_id?: string | null;
};

type Props = {
  mode: "onboarding" | "edit";
  initialValues: ProfileBasicsValues;
  submitLabel: string;
  onSuccessRedirectTo?: string;
  variant?: "default" | "accent";
  fallbackAvatarUrl?: string | null;
};

const SKILLS = ["Tech", "Sales", "Marketing", "Product", "Operations", "Finance"] as const;
const INTENTIONS = ["Suche", "Partner-Match", "Selbsttest"] as const;

function normalizePath(path: string | undefined, fallback: string) {
  const normalized = (path ?? "").trim();
  if (!normalized.startsWith("/")) {
    return fallback;
  }
  return normalized;
}

export function ProfileBasicsForm({
  mode,
  initialValues,
  submitLabel,
  onSuccessRedirectTo,
  variant = "default",
  fallbackAvatarUrl = null,
}: Props) {
  const successRedirect = normalizePath(onSuccessRedirectTo, "/dashboard");
  const errorRedirect = successRedirect;
  const cardClass =
    variant === "accent"
      ? "rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/80 via-white to-violet-50/70 p-6"
      : "rounded-2xl border border-slate-200/80 bg-white/95 p-6";
  const selectedRoles = normalizeProfileRoles(initialValues.roles ?? ["founder"]);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [selectedAvatarId, setSelectedAvatarId] = useState(initialValues.avatar_id?.trim() ?? "");
  const previewName = initialValues.display_name?.trim() || "Founder";

  return (
    <section className={cardClass}>
      {mode === "onboarding" ? (
        <div className="mb-4 border-b border-cyan-200 pb-3">
          <h2 className="text-sm font-semibold tracking-[0.08em] text-slate-900">Profil-Basics</h2>
          <p className="mt-1 text-xs text-slate-600">Du kannst das später im Dashboard ändern.</p>
        </div>
      ) : null}

      <form action={upsertProfileBasicsAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="onSuccessRedirectTo" value={successRedirect} />
        <input type="hidden" name="onErrorRedirectTo" value={errorRedirect} />
        <input type="hidden" name="avatarId" value={selectedAvatarId} />

        <div className="md:col-span-2 rounded-2xl border border-slate-200/80 bg-slate-50/85 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <ProfileAvatar
                displayName={previewName}
                avatarId={selectedAvatarId || null}
                imageUrl={selectedAvatarId ? null : fallbackAvatarUrl}
                className="h-16 w-16 rounded-[20px] border border-white/80 object-cover shadow-[0_10px_20px_rgba(15,23,42,0.08)]"
                fallbackClassName="flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/80 bg-[linear-gradient(135deg,rgba(103,232,249,0.16),rgba(255,255,255,0.92)_48%,rgba(124,58,237,0.08))] text-base font-semibold text-slate-700 shadow-[0_10px_20px_rgba(15,23,42,0.06)]"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">Avatar</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  Wähle eines von 30 festen Avataren für Dashboard und Workbook.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAvatarPickerOpen((current) => !current)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {avatarPickerOpen ? "Auswahl schließen" : "Avatar ändern"}
            </button>
          </div>

          {avatarPickerOpen ? (
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {AVATAR_LIBRARY.map((avatar) => {
                const selected = selectedAvatarId === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => setSelectedAvatarId(avatar.id)}
                    className={`rounded-2xl border p-2 transition ${
                      selected
                        ? "border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)]/10 shadow-[0_10px_24px_rgba(34,211,238,0.14)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                    aria-pressed={selected}
                    aria-label={avatar.label}
                  >
                    <ProfileAvatar
                      displayName={avatar.label}
                      avatarId={avatar.id}
                      className="h-auto w-full rounded-[18px] border border-slate-100 object-cover"
                    />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        <label className="grid gap-2 text-sm text-slate-700 md:col-span-2">
          Anzeigename
          <input
            name="displayName"
            required
            defaultValue={initialValues.display_name ?? ""}
            placeholder="Dein Name"
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
          />
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          Fokus-Skill
          <select
            name="focusSkill"
            required
            defaultValue={initialValues.focus_skill ?? ""}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
          >
            <option value="" disabled>
              Bitte auswählen
            </option>
            {SKILLS.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-slate-700">
          Intention
          <select
            name="intention"
            required
            defaultValue={initialValues.intention ?? ""}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-cyan-300 focus:ring-2 focus:ring-violet-200"
          >
            <option value="" disabled>
              Bitte auswählen
            </option>
            {INTENTIONS.map((intention) => (
              <option key={intention} value={intention}>
                {intention}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="grid gap-3 text-sm text-slate-700 md:col-span-2">
          <legend className="text-sm font-medium text-slate-900">Deine Rollen</legend>
          <p className="text-xs leading-6 text-slate-500">
            Wähle aus, in welchen Ansichten du CoFoundery aktuell nutzen möchtest. Rollen steuern
            die sichtbaren Dashboard-Modi, nicht automatisch konkrete Team-Zugriffe.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {PROFILE_ROLE_OPTIONS.map((role) => {
              const checked = selectedRoles.includes(role);
              return (
                <label
                  key={role}
                  className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <input
                    type="checkbox"
                    name="roles"
                    value={role}
                    defaultChecked={checked}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-500 focus:ring-violet-200"
                  />
                  <span>
                    <span className="block font-medium text-slate-900">{profileRoleLabel(role)}</span>
                    <span className="mt-1 block text-xs leading-6 text-slate-500">
                      {role === "advisor"
                        ? "Nutze CoFoundery auch, um Founder-Teams als Advisor zu begleiten."
                        : "Nutze CoFoundery für dein eigenes Founder-Profil, Matching und Alignment."}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg border border-cyan-300 bg-cyan-300 px-4 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-cyan-400"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
