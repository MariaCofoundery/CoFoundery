import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Feierabend: jede Mitteilung aufs Geraet geht durch dieselbe Pruefung, Hinweise in der App bleiben", () => {
  const push = readFileSync("src/features/notifications/pushDelivery.ts", "utf8");
  const quiet = push.indexOf('client.rpc("is_quiet_now"');
  assert.ok(quiet > 0 && quiet < push.indexOf('.from("push_subscriptions")'), "die Pruefung steht vor dem Versand");
  const sql = readFileSync("../supabase/migrations/20270317120000_notification_quiet_hours.sql", "utf8");
  assert.match(sql, /grant execute on function public\.is_quiet_now\(uuid\) to service_role;/);
  assert.match(sql, /using \(user_id = auth\.uid\(\)\)/);
  assert.match(sql, /interval '3 days'/);
  const section = readFileSync("src/features/notifications/QuietHoursSection.tsx", "utf8");
  assert.match(section, /<TimezoneInput \/>/);
  const actions = readFileSync("src/features/notifications/quietHoursActions.ts", "utf8");
  assert.doesNotMatch(actions, /redirect\(String\(formData/);
  assert.match(readFileSync("src/features/account/accountExport.ts", "utf8"), /table: "notification_quiet_hours"/);
  assert.match(readFileSync("src/app/datenschutz/page.tsx", "utf8"), /Feierabend-Zeiten/);
  for (const locale of ["de", "en"]) {
    const quietCopy = JSON.parse(readFileSync(`messages/${locale}/notices.json`, "utf8")).quiet;
    for (const day of [0, 1, 2, 3, 4, 5, 6]) assert.ok(quietCopy[`day${day}`], `${locale} day${day}`);
  }
});
