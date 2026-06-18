import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveDiscoveryAssessmentConsentState,
} from "@/features/discovery/discoveryConsent";
import { normalizeDiscoveryPreferencesInput } from "@/features/discovery/discoveryValidation";

const NOW = "2026-06-18T10:00:00.000Z";
const EXISTING_CONSENTED_AT = "2026-06-17T09:00:00.000Z";
const CLIENT_SUPPLIED_TIMESTAMP = "1999-01-01T00:00:00.000Z";

test("defaults assessment signal consent to inactive without timestamp", () => {
  const normalized = normalizeDiscoveryPreferencesInput({});
  const state = resolveDiscoveryAssessmentConsentState({
    includeAssessmentSignals: normalized.includeAssessmentSignals,
    existingConsentedAt: null,
    now: NOW,
  });

  assert.equal(normalized.includeAssessmentSignals, false);
  assert.deepEqual(state, {
    includeAssessmentSignals: false,
    assessmentSignalsConsentedAt: null,
  });
});

test("sets consent timestamp when assessment signal consent is activated", () => {
  const normalized = normalizeDiscoveryPreferencesInput({
    includeAssessmentSignals: "true",
  });
  const state = resolveDiscoveryAssessmentConsentState({
    includeAssessmentSignals: normalized.includeAssessmentSignals,
    existingConsentedAt: null,
    now: NOW,
  });

  assert.deepEqual(state, {
    includeAssessmentSignals: true,
    assessmentSignalsConsentedAt: NOW,
  });
});

test("keeps existing consent timestamp when saving again while active", () => {
  const normalized = normalizeDiscoveryPreferencesInput({
    includeAssessmentSignals: "on",
  });
  const state = resolveDiscoveryAssessmentConsentState({
    includeAssessmentSignals: normalized.includeAssessmentSignals,
    existingConsentedAt: EXISTING_CONSENTED_AT,
    now: NOW,
  });

  assert.deepEqual(state, {
    includeAssessmentSignals: true,
    assessmentSignalsConsentedAt: EXISTING_CONSENTED_AT,
  });
});

test("clears consent timestamp when assessment signal consent is deactivated", () => {
  const normalized = normalizeDiscoveryPreferencesInput({
    includeAssessmentSignals: false,
  });
  const state = resolveDiscoveryAssessmentConsentState({
    includeAssessmentSignals: normalized.includeAssessmentSignals,
    existingConsentedAt: EXISTING_CONSENTED_AT,
    now: NOW,
  });

  assert.deepEqual(state, {
    includeAssessmentSignals: false,
    assessmentSignalsConsentedAt: null,
  });
});

test("ignores any client supplied consent timestamp", () => {
  const normalized = normalizeDiscoveryPreferencesInput({
    includeAssessmentSignals: true,
    assessmentSignalsConsentedAt: CLIENT_SUPPLIED_TIMESTAMP,
  } as Parameters<typeof normalizeDiscoveryPreferencesInput>[0] & {
    assessmentSignalsConsentedAt: string;
  });
  const state = resolveDiscoveryAssessmentConsentState({
    includeAssessmentSignals: normalized.includeAssessmentSignals,
    existingConsentedAt: null,
    now: NOW,
  });

  assert.deepEqual(state, {
    includeAssessmentSignals: true,
    assessmentSignalsConsentedAt: NOW,
  });
  assert.notEqual(state.assessmentSignalsConsentedAt, CLIENT_SUPPLIED_TIMESTAMP);
});
