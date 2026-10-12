import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { authLanguageMetadata, normalizeAuthLanguage, syncAuthLanguage } from "@/features/auth/authLanguage";

const source = (path: string) => readFileSync(path, "utf8");
const GUARD = '{{ if eq (printf "%v" .Data.language) "en" }}';
const MAGIC_LINK = "https://made2found.de/auth/confirm?token_hash={{ .TokenHash }}&type=email";

test("auth language normalizes to de/en and falls back to de", () => {
  assert.equal(normalizeAuthLanguage("de"), "de");
  assert.equal(normalizeAuthLanguage("en"), "en");
  assert.equal(normalizeAuthLanguage("EN"), "en");
  assert.equal(normalizeAuthLanguage("en-US"), "en");
  for (const value of ["fr", "", "  ", null, undefined, 5, {}, ["en"], "english"]) {
    assert.equal(normalizeAuthLanguage(value), "de", JSON.stringify(value));
  }
  assert.deepEqual(authLanguageMetadata("en"), { language: "en" });
  assert.deepEqual(authLanguageMetadata("de"), { language: "de" });
  assert.deepEqual(authLanguageMetadata("xx"), { language: "de" });
});

/** Behaves like Supabase: updateUser({ data }) merges top-level keys. */
function fakeClient(metadata: Record<string, unknown> | null, options: { fail?: boolean; signedOut?: boolean } = {}) {
  const writes: Record<string, unknown>[] = [];
  const state = { metadata: metadata ? { ...metadata } : null };
  return {
    writes,
    state,
    auth: {
      async getUser() {
        if (options.fail) throw new Error("network");
        return { data: { user: options.signedOut ? null : { user_metadata: state.metadata } } };
      },
      async updateUser({ data }: { data: Record<string, unknown> }) {
        writes.push(data);
        state.metadata = { ...(state.metadata ?? {}), ...data };
        return { error: null };
      },
    },
  };
}

test("syncing writes only the language key and keeps all other metadata", async () => {
  const client = fakeClient({ avatar_url: "https://example.invalid/a.png", full_name: "Mara", language: "de" });
  await syncAuthLanguage(client, "en");
  assert.deepEqual(client.writes, [{ language: "en" }]);
  assert.deepEqual(client.state.metadata, { avatar_url: "https://example.invalid/a.png", full_name: "Mara", language: "en" });
});

test("syncing DE and EN sets the matching language, unknown values fall back to de", async () => {
  for (const [input, expected] of [["de", "de"], ["en", "en"], ["fr", "de"], [undefined, "de"]] as const) {
    const client = fakeClient({});
    await syncAuthLanguage(client, input);
    assert.deepEqual(client.writes, [{ language: expected }], String(input));
  }
});

test("syncing does not write when nothing changes, when signed out, or on errors", async () => {
  const same = fakeClient({ language: "en" });
  await syncAuthLanguage(same, "en");
  assert.deepEqual(same.writes, []);
  const signedOut = fakeClient({}, { signedOut: true });
  await syncAuthLanguage(signedOut, "en");
  assert.deepEqual(signedOut.writes, []);
  const failing = fakeClient({}, { fail: true });
  await assert.doesNotReject(syncAuthLanguage(failing, "en"));
  assert.deepEqual(failing.writes, []);
});

test("new accounts from /start and the login form carry the current UI language", () => {
  const start = source("src/app/(product)/start/page.tsx");
  assert.match(start, /shouldCreateUser: true,[\s\S]{0,200}data: authLanguageMetadata\(await getRequestLocale\(\)\),/);
  const form = source("src/features/auth/MagicLinkForm.tsx");
  assert.match(form, /const locale = useLocale\(\);/);
  assert.match(form, /shouldCreateUser,[\s\S]{0,200}data: authLanguageMetadata\(locale\),/);
  // The OTP flow keeps its redirect contract.
  for (const file of [start, form]) assert.match(file, /emailRedirectTo: redirectTo\.toString\(\),/);
});

test("every sign-in completion stores the current UI language before redirecting", () => {
  for (const route of ["src/app/auth/confirm/route.ts", "src/app/auth/callback/route.ts"]) {
    assert.match(source(route), /await syncAuthLanguage\(supabase, await getRequestLocale\(\)\);\s*const destination = await resolvePostAuthRedirectPath\(/, route);
  }
  assert.match(source("src/app/auth/landing/route.ts"), /await cleanupOversizedAvatarMetadata\(supabase, user\);\s*await syncAuthLanguage\(supabase, await getRequestLocale\(\)\);/);
  assert.match(source("src/features/auth/emailCodeActions.ts"), /store\.delete\(PENDING_EMAIL_COOKIE\);\s*await syncAuthLanguage\(supabase, await getRequestLocale\(\)\);\s*redirect\(await resolvePostAuthRedirectPath/);
  assert.match(source("src/features/account/accountPreferenceActions.ts"), /await syncAuthLanguage\(client, locale\);/);
});

test("an email change sends its confirmation in the current UI language without replacing metadata", () => {
  const actions = source("src/features/account/accountActions.ts");
  assert.match(actions, /client\.auth\.updateUser\(\s*\{ email: nextEmail, data: authLanguageMetadata\(await getRequestLocale\(\)\) \},/);
  assert.match(actions, /emailRedirectTo: `\$\{getPublicAppOrigin\(\)\}\/auth\/confirm\?next=%2Faccount`/);
});

test("no unauthenticated or admin path mutates user metadata, and reset/reauth/invite stay untouched", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) { if (entry.name !== "__tests__") walk(path); }
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(path);
    }
  };
  walk("src");
  const all = files.map((file) => [file, source(file)] as const);
  for (const [file, text] of all) {
    assert.doesNotMatch(text, /admin\.updateUserById|admin\.inviteUserByEmail|resetPasswordForEmail|auth\.reauthenticate\(/, file);
  }
  // language is written by the signed-in person only: the helper and the email change.
  const writers = all.filter(([, text]) => /updateUser\([\s\S]{0,80}language/.test(text)).map(([file]) => file).sort();
  assert.deepEqual(writers, ["src/features/auth/authLanguage.ts"]);
  assert.match(source("src/features/auth/authLanguage.ts"), /updateUser\(\{ data: \{ language \} \}\)/);
});

const TEMPLATES = ["confirm-signup", "invite", "magic-link", "change-email", "reset-password", "reauthentication"];

test("all six Supabase templates switch DE/EN on .Data.language with a German fallback", () => {
  for (const name of TEMPLATES) {
    const html = source(`../supabase/templates/${name}.html`);
    const body = html.replace(/<!--[\s\S]*?-->/, "");
    const comment = html.match(/<!--[\s\S]*?-->/)?.[0] ?? "";
    assert.equal(body.trim().indexOf(GUARD), 0, `${name}: body starts with the guard`);
    assert.equal(body.split("{{ else }}").length, 2, `${name}: one else`);
    assert.equal(body.split("{{ end }}").length, 2, `${name}: one end`);
    const [en, de] = body.split("{{ else }}");
    assert.match(en, /<div lang="en"/, name);
    assert.match(de, /<div lang="de"/, name);
    // The same sign-off closes every mail, once, as the last paragraph of its language.
    assert.match(en, /<p style="margin:24px 0 0;color:#334155;">\s*Founderly yours,<br \/>\s*your Made2Found Team\s*<\/p>\s*<\/div>\s*$/, `${name}: EN sign-off`);
    assert.match(de, /<p style="margin:24px 0 0;color:#334155;">\s*Gründerige Grüße<br \/>\s*dein Made2Found Team\s*<\/p>\s*<\/div>\s*\{\{ end \}\}\s*$/, `${name}: DE sign-off`);
    assert.equal(body.split("Founderly yours,").length, 2, `${name}: one EN sign-off`);
    assert.equal(body.split("Gründerige Grüße").length, 2, `${name}: one DE sign-off`);
    assert.doesNotMatch(en, /Gründerige Grüße|dein Made2Found Team/, `${name}: no German sign-off in EN`);
    assert.doesNotMatch(de, /Founderly yours|your Made2Found Team/, `${name}: no English sign-off in DE`);
    // Subject: one line, same guard, both languages.
    const subject = comment.match(/Betreff \(Dashboard-Feld "Subject", genau eine Zeile\):\n\s*(.+)\n/)?.[1] ?? "";
    // A bare comparison against a missing key is avoided in everything Supabase executes.
    assert.doesNotMatch(body + subject, /eq \.Data\.language/, name);
    assert.match(subject, /^\{\{ if eq \(printf "%v" \.Data\.language\) "en" \}\}[^{]+\{\{ else \}\}[^{]+\{\{ end \}\}$/, `${name}: subject`);
    assert.match(subject, /Made2Found/, name);
    assert.doesNotMatch(html, /CoFoundery|Cofoundery|Founder Fit|Matching Score|compatib|Kompatib/i, name);
  }
});

test("the magic link keeps the production direct link and the code in both languages", () => {
  const html = source("../supabase/templates/magic-link.html");
  const body = html.replace(/<!--[\s\S]*?-->/, "");
  const [en, de] = body.split("{{ else }}");
  for (const branch of [en, de]) {
    assert.equal(branch.split(`href="${MAGIC_LINK}"`).length, 2);
    assert.match(branch, /\{\{ \.Token \}\}/);
    assert.doesNotMatch(branch, /ConfirmationURL/);
  }
  // German copy is unchanged from the version that is live today.
  assert.match(de, /Ein Klick, und du bist drin:/);
  assert.match(de, /Hast du Made2Found als App auf dem Startbildschirm\? Dann nimm dort diesen Code –/);
  assert.match(de, /Beides gilt eine Stunde\. Wenn du dich nicht anmelden wolltest, ignorier diese Mail einfach\./);
});

test("confirm signup keeps its confirmation link and code fallback in both languages", () => {
  const body = source("../supabase/templates/confirm-signup.html").replace(/<!--[\s\S]*?-->/, "");
  for (const branch of body.split("{{ else }}")) {
    assert.match(branch, /href="\{\{ \.ConfirmationURL \}\}"/);
    assert.match(branch, /\{\{ \.Token \}\}/);
  }
  assert.match(source("../supabase/templates/reauthentication.html"), /\{\{ \.Token \}\}[\s\S]*\{\{ else \}\}[\s\S]*\{\{ \.Token \}\}/);
  assert.match(source("../supabase/templates/change-email.html"), /\{\{ \.NewEmail \}\}[\s\S]*\{\{ else \}\}[\s\S]*\{\{ \.NewEmail \}\}/);
});
