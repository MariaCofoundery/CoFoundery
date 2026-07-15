import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import test from "node:test";
import type { QRCodeToDataURLOptions } from "qrcode";

type ResolveHookResult = {
  url: string;
  shortCircuit?: boolean;
};

type RegisterHooks = (hooks: {
  resolve: (
    specifier: string,
    context: unknown,
    nextResolve: (specifier: string, context?: unknown) => ResolveHookResult
  ) => ResolveHookResult;
}) => void;

const registerHooks = (nodeModule as unknown as { registerHooks: RegisterHooks }).registerHooks;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export%20{}",
      };
    }

    return nextResolve(specifier, context);
  },
});

const { generateEventQrCode } = await import("@/features/events/eventQrCode");

const MASKED_COMPARE_URL =
  "https://cofoundery.test/event/masked-event/compare/masked-participant-token";
const VALID_PNG_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";

test("encodes the unchanged comparison URL with fixed PNG options", async () => {
  let receivedValue: string | null = null;
  let receivedOptions: QRCodeToDataURLOptions | null = null;

  const result = await generateEventQrCode(MASKED_COMPARE_URL, async (value, options) => {
    receivedValue = value;
    receivedOptions = options;
    return VALID_PNG_DATA_URL;
  });

  assert.deepEqual(result, { ok: true, dataUrl: VALID_PNG_DATA_URL });
  assert.equal(receivedValue, MASKED_COMPARE_URL);
  assert.deepEqual(receivedOptions, {
    type: "image/png",
    width: 260,
    margin: 0,
    errorCorrectionLevel: "M",
  });
});

test("rejects an invalid encoder response without exposing sensitive input", async () => {
  const result = await generateEventQrCode(
    MASKED_COMPARE_URL,
    async () => "data:image/png;base64,not-a-png"
  );

  assert.deepEqual(result, { ok: false });
  assert.equal(JSON.stringify(result).includes(MASKED_COMPARE_URL), false);
});

test("contains encoder failures without exposing the raw error", async () => {
  const rawError = "masked raw encoder failure";
  const result = await generateEventQrCode(MASKED_COMPARE_URL, async () => {
    throw new Error(rawError);
  });

  assert.deepEqual(result, { ok: false });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes(MASKED_COMPARE_URL), false);
  assert.equal(serialized.includes(rawError), false);
});
