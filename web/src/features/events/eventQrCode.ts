import "server-only";

import QRCode, { type QRCodeToDataURLOptions } from "qrcode";

export type EventQrCodeResult =
  | { ok: true; dataUrl: string }
  | { ok: false };

export type EventQrCodeEncoder = (
  value: string,
  options: QRCodeToDataURLOptions
) => Promise<string>;

const EVENT_QR_CODE_OPTIONS = {
  type: "image/png",
  width: 260,
  margin: 0,
  errorCorrectionLevel: "M",
} as const satisfies QRCodeToDataURLOptions;

const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

function isPngDataUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith(PNG_DATA_URL_PREFIX)) {
    return false;
  }

  const encoded = value.slice(PNG_DATA_URL_PREFIX.length);
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
    return false;
  }

  const decoded = Buffer.from(encoded, "base64");
  return PNG_SIGNATURE.every((byte, index) => decoded[index] === byte);
}

const defaultEncoder: EventQrCodeEncoder = (value, options) =>
  QRCode.toDataURL(value, options);

export async function generateEventQrCode(
  compareUrl: string,
  encoder: EventQrCodeEncoder = defaultEncoder
): Promise<EventQrCodeResult> {
  try {
    const dataUrl = await encoder(compareUrl, EVENT_QR_CODE_OPTIONS);
    return isPngDataUrl(dataUrl) ? { ok: true, dataUrl } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/** Ein groesserer QR-Code fuer Aushang und Druck (Standard 640 Pixel, Rand ja). Gleiche Pruefung wie oben: nur ein echtes PNG kommt zurueck. */
export async function generateQrPng(
  value: string,
  width = 640,
  encoder: EventQrCodeEncoder = defaultEncoder
): Promise<EventQrCodeResult> {
  try {
    const dataUrl = await encoder(value, { type: "image/png", width, margin: 2, errorCorrectionLevel: "M" });
    return isPngDataUrl(dataUrl) ? { ok: true, dataUrl } : { ok: false };
  } catch {
    return { ok: false };
  }
}
