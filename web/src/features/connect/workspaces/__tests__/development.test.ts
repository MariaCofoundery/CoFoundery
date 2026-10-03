import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  publicationFields,
  publicationPayload,
} from "@/features/connect/workspaces/developmentModel";
test("publication accepts only explicit public fields, never private workspace data or identity", () => {
  const form = new FormData();
  for (const key of [
    "workspace_title",
    "workspace_description",
    "members",
    "role",
    "entries",
    "source_url",
    "source_label",
    "author_user_id",
    "problem_id",
    "published_problem_id",
    "source_problem_id",
  ])
    form.set(key, "PRIVATE_CANARY");
  form.set("title", "  Explicit title  ");
  form.set("description", "Explicit description");
  form.set("author_intent", "observation");
  form.set("locations", "Berlin, Berlin, Hamburg");
  form.set("topics", "one, two");
  const result = publicationFields(form);
  assert.deepEqual(result, {
    title: "Explicit title",
    description: "Explicit description",
    author_intent: "observation",
    geographic_scope: "regional",
    locations: ["Berlin", "Hamburg"],
    topics: ["one", "two"],
    industries: [],
    visibility: "members_only",
    outlives_account: false,
  });
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_CANARY/);
  assert.deepEqual(
    publicationPayload(
      JSON.stringify({
        ...result,
        entries: "PRIVATE_CANARY",
        author_user_id: "PRIVATE_CANARY",
      }),
    ),
    result,
  );
});
test("blank publication does not derive title or description from a workspace", () => {
  const form = new FormData();
  form.set("workspace_title", "PRIVATE_TITLE");
  form.set("workspace_description", "PRIVATE_DESCRIPTION");
  const result = publicationFields(form);
  assert.equal(result.title, "");
  assert.equal(result.description, "");
  assert.equal(result.visibility, "members_only");
});
test("public visibility and existing retention preference survive preview", () => {
  const form = new FormData();
  form.set("visibility", "public");
  form.set("outlives_account", "yes");
  form.set("author_intent", "wants_to_build");
  form.set("geographic_scope", "europe");
  form.set("industries", "A,B,C,D,E,F");
  const result = publicationFields(form);
  assert.equal(result.visibility, "members_only");
  assert.equal(result.outlives_account, true);
  assert.equal(result.industries.length, 5);
  assert.deepEqual(publicationPayload(JSON.stringify(result)), result);
});
test("malformed publication JSON rejected before RPC submission", () => {
  for (const value of ["null", "[]", "{", "{}", JSON.stringify({ title: 42 })])
    assert.throws(() => publicationPayload(value));
  const valid = publicationFields(new FormData());
  assert.throws(() =>
    publicationPayload(JSON.stringify({ ...valid, topics: "not an array" })),
  );
  assert.throws(() =>
    publicationPayload(JSON.stringify({ ...valid, outlives_account: "true" })),
  );
});
test("DE/EN cover publication, opportunities, references and venture decisions", () => {
  const de = JSON.parse(
      readFileSync("messages/de/problemWorkspace.json", "utf8"),
    ).development,
    en = JSON.parse(
      readFileSync("messages/en/problemWorkspace.json", "utf8"),
    ).development;
  assert.deepEqual(Object.keys(de).sort(), Object.keys(en).sort());
  for (const copy of [de, en])
    for (const key of [
      "preview",
      "confirmPublish",
      "publishHelp",
      "opportunityHelp",
      "referencesHelp",
      "confirmNewVenture",
      "confirmLink",
      "linkedRestricted",
      "archiveHelp",
      "founderRequired",
    ])
      assert.ok(copy[key]);
});
