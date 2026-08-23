import assert from "node:assert/strict";
import test from "node:test";
import { normalizeSafeInternalPath } from "@/features/auth/safeInternalPath";

const FALLBACK = "/dashboard";

test("allows normal internal auth redirect targets", () => {
  for (const target of [
    "/dashboard",
    "/join?token=test",
    "/advisor/report",
    "/advisor/report?invitationId=test#summary",
  ]) {
    assert.equal(normalizeSafeInternalPath(target, FALLBACK), target);
  }
});

test("rejects absolute, scheme-relative and backslash-based redirects", () => {
  for (const target of [
    "https://evil.example",
    "http://evil.example",
    "javascript:alert(1)",
    "data:text/html,evil",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "/\\\\evil.example",
    "\\evil.example",
  ]) {
    assert.equal(normalizeSafeInternalPath(target, FALLBACK), FALLBACK, target);
  }
});

test("rejects encoded slash and backslash redirect bypasses", () => {
  for (const target of [
    "/%5Cevil.example",
    "/%255Cevil.example",
    "/%2Fevil.example",
    "/%2F%2Fevil.example",
    "/%252F%252Fevil.example",
  ]) {
    assert.equal(normalizeSafeInternalPath(target, FALLBACK), FALLBACK, target);
  }
});

test("uses the requested safe fallback for malformed redirect input", () => {
  assert.equal(normalizeSafeInternalPath("/%E0%A4%A", "/login"), "/login");
  assert.equal(normalizeSafeInternalPath(null, ""), "");
});
