import assert from "node:assert/strict";
import test from "node:test";

import {
  connectValuesForBasePhoto,
  copyBasePhotoToConnect,
  syncConnectBasePhoto,
} from "@/features/connect/connectBasePhoto";

/**
 * Das Basisfoto in Connect, durchgespielt an einem nachgebauten Client.
 *
 * Geprueft wird, was in den Eimern liegt und was in der Connect-Zeile steht -
 * nicht, welche Zeilen im Quelltext stehen.
 */

const ME = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

type Row = { user_id: string; photo_source: string | null; photo_avatar_id: string | null; photo_path: string | null; public_slug: string | null };

function fakeClient(options: { row?: Row | null; avatars?: Record<string, string>; failUpdate?: boolean } = {}) {
  const buckets: Record<string, Map<string, { type: string; body: string }>> = {
    avatars: new Map(Object.entries(options.avatars ?? {}).map(([k, v]) => [k, { type: "image/jpeg", body: v }])),
    "network-profile-images": new Map(),
  };
  const state = { row: options.row ?? null, buckets };

  const client = {
    storage: {
      from(bucket: string) {
        const store = buckets[bucket];
        return {
          async download(path: string) {
            const file = store.get(path);
            if (!file) return { data: null, error: { message: "not found" } };
            return { data: { type: file.type, arrayBuffer: async () => new TextEncoder().encode(file.body).buffer }, error: null };
          },
          async upload(path: string, body: ArrayBuffer, opts: { contentType: string }) {
            store.set(path, { type: opts.contentType, body: new TextDecoder().decode(body) });
            return { error: null };
          },
          async remove(paths: string[]) {
            paths.forEach((p) => store.delete(p));
            return { error: null };
          },
        };
      },
    },
    from(table: string) {
      assert.equal(table, "network_profiles", "der Nachzug fasst nur network_profiles an");
      const filters: Record<string, unknown> = {};
      let patch: Partial<Row> | null = null;
      const matches = () => state.row && Object.entries(filters).every(([k, v]) => (state.row as Record<string, unknown>)[k] === v);
      const builder = {
        select() { return builder; },
        update(values: Partial<Row>) { patch = values; return builder; },
        eq(column: string, value: unknown) { filters[column] = value; return builder; },
        async maybeSingle() { return { data: matches() ? { ...state.row } : null, error: null }; },
        then(resolve: (value: { error: unknown }) => void) {
          if (options.failUpdate) return resolve({ error: { message: "denied" } });
          if (patch && matches()) state.row = { ...(state.row as Row), ...patch };
          resolve({ error: null });
        },
      };
      return builder;
    },
  };
  return { client: client as never, state };
}

const connectFiles = (state: ReturnType<typeof fakeClient>["state"]) => [...state.buckets["network-profile-images"].keys()];

test("eine Illustration wird als Kennung uebernommen, ohne Datei", async () => {
  const { client, state } = fakeClient();
  const values = await connectValuesForBasePhoto(client, ME, { avatar_id: "avatar-07", avatar_url: null });
  assert.deepEqual(values, { photo_source: "profile_avatar", photo_avatar_id: "avatar-07", photo_path: null });
  assert.deepEqual(connectFiles(state), []);
});

test("ein eigenes Basisfoto wird kopiert - das Original bleibt, wo es ist", async () => {
  const { client, state } = fakeClient({ avatars: { [`${ME}/1-a.jpg`]: "ORIGINAL" } });
  const values = await connectValuesForBasePhoto(client, ME, { avatar_id: null, avatar_url: `avatars/${ME}/1-a.jpg` });
  assert.equal(values.photo_source, "profile_avatar");
  assert.equal(values.photo_avatar_id, null);
  assert.ok(values.photo_path?.startsWith(`${ME}/`));
  assert.equal(state.buckets["network-profile-images"].get(values.photo_path!)?.body, "ORIGINAL");
  assert.ok(state.buckets.avatars.has(`${ME}/1-a.jpg`), "das Original wurde angefasst");
});

test("ein fremdes Original wird nie kopiert", async () => {
  const { client, state } = fakeClient({ avatars: { [`${OTHER}/1-a.jpg`]: "FREMD" } });
  assert.equal(await copyBasePhotoToConnect(client, ME, `avatars/${OTHER}/1-a.jpg`), null);
  assert.deepEqual(connectFiles(state), []);
});

test("ersetzen: neue Kopie, die alte Kopie verschwindet", async () => {
  const { client, state } = fakeClient({
    avatars: { [`${ME}/2-b.jpg`]: "NEU" },
    row: { user_id: ME, photo_source: "profile_avatar", photo_avatar_id: null, photo_path: `${ME}/old-copy.jpg`, public_slug: null },
  });
  state.buckets["network-profile-images"].set(`${ME}/old-copy.jpg`, { type: "image/jpeg", body: "ALT" });

  await syncConnectBasePhoto(client, ME, { avatar_id: null, avatar_url: `avatars/${ME}/2-b.jpg` });

  assert.notEqual(state.row?.photo_path, `${ME}/old-copy.jpg`);
  assert.deepEqual(connectFiles(state), [state.row?.photo_path]);
  assert.equal(state.buckets["network-profile-images"].get(state.row!.photo_path!)?.body, "NEU");
});

test("von eigenem Bild zur Illustration: Kennung statt Datei, die Kopie geht", async () => {
  const { client, state } = fakeClient({
    row: { user_id: ME, photo_source: "profile_avatar", photo_avatar_id: null, photo_path: `${ME}/copy.jpg`, public_slug: null },
  });
  state.buckets["network-profile-images"].set(`${ME}/copy.jpg`, { type: "image/jpeg", body: "KOPIE" });

  await syncConnectBasePhoto(client, ME, { avatar_id: "avatar-03", avatar_url: null });

  assert.equal(state.row?.photo_avatar_id, "avatar-03");
  assert.equal(state.row?.photo_path, null);
  assert.deepEqual(connectFiles(state), []);
});

test("entfernen: Connect zeigt nichts mehr, und die Kopie ist geloescht", async () => {
  const { client, state } = fakeClient({
    row: { user_id: ME, photo_source: "profile_avatar", photo_avatar_id: null, photo_path: `${ME}/copy.jpg`, public_slug: null },
  });
  state.buckets["network-profile-images"].set(`${ME}/copy.jpg`, { type: "image/jpeg", body: "KOPIE" });

  await syncConnectBasePhoto(client, ME, null);

  assert.deepEqual(
    { s: state.row?.photo_source, a: state.row?.photo_avatar_id, p: state.row?.photo_path },
    { s: null, a: null, p: null },
  );
  assert.deepEqual(connectFiles(state), []);
});

test("ein eigenes Connect-Bild bleibt unberuehrt - Zeile und Datei", async () => {
  const { client, state } = fakeClient({
    avatars: { [`${ME}/3-c.jpg`]: "NEU" },
    row: { user_id: ME, photo_source: "network_upload", photo_avatar_id: null, photo_path: `${ME}/eigen.jpg`, public_slug: null },
  });
  state.buckets["network-profile-images"].set(`${ME}/eigen.jpg`, { type: "image/jpeg", body: "EIGEN" });

  await syncConnectBasePhoto(client, ME, { avatar_id: null, avatar_url: `avatars/${ME}/3-c.jpg` });
  await syncConnectBasePhoto(client, ME, null);

  assert.equal(state.row?.photo_source, "network_upload");
  assert.equal(state.row?.photo_path, `${ME}/eigen.jpg`);
  assert.deepEqual(connectFiles(state), [`${ME}/eigen.jpg`]);
});

test("misslingt das Schreiben der Zeile, bleibt keine verwaiste Kopie liegen", async () => {
  const { client, state } = fakeClient({
    avatars: { [`${ME}/4-d.jpg`]: "NEU" },
    row: { user_id: ME, photo_source: "profile_avatar", photo_avatar_id: "avatar-01", photo_path: null, public_slug: null },
    failUpdate: true,
  });

  await syncConnectBasePhoto(client, ME, { avatar_id: null, avatar_url: `avatars/${ME}/4-d.jpg` });

  assert.deepEqual(connectFiles(state), []);
});
