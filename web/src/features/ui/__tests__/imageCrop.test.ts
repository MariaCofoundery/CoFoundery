import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { clampCropOffset, cropBounds, cropDrawRect } from "@/features/ui/imageCrop";

test("Zoom 1 fuellt das Fenster mit der kuerzeren Seite, ein Logo darf ganz hineinpassen", () => {
  // Querformat 600 x 300 im 300er Fenster: Hoehe passt, Breite steht ueber.
  assert.deepEqual(cropDrawRect(600, 300, 300, 1, { x: 0, y: 0 }), { left: -150, top: 0, width: 600, height: 300 });
  assert.deepEqual(cropBounds(600, 300, 300, false), { minZoom: 1, maxZoom: 4 });
  assert.deepEqual(cropBounds(600, 300, 300, true), { minZoom: 0.5, maxZoom: 4 });
});

test("verschieben nur bis zur Kante, ein kleineres Bild steht mittig", () => {
  assert.deepEqual(clampCropOffset(600, 300, 300, 1, { x: 999, y: 50 }), { x: 150, y: 0 });
  assert.deepEqual(clampCropOffset(600, 300, 300, 1, { x: -999, y: 0 }), { x: -150, y: 0 });
  // Logo kleiner gezoomt: keine Verschiebung, mittig.
  assert.deepEqual(clampCropOffset(600, 300, 300, 0.5, { x: 40, y: 40 }), { x: 0, y: 0 });
  assert.deepEqual(cropDrawRect(600, 300, 300, 0.5, { x: 0, y: 0 }), { left: 0, top: 75, width: 300, height: 150 });
});

test("die Dialoge stehen dort, wo hochgeladen wird - Foto rund, Logo mit durchsichtigem Rand", () => {
  const read = (path: string) => readFileSync(path, "utf8");
  assert.match(read("src/features/profile/ProfilePhotoField.tsx"), /<ImageCropDialog[\s\S]*shape="photo"/);
  assert.match(read("src/features/profile/ProfileBasicsForm.tsx"), /<ImageCropDialog[\s\S]*shape="photo"/);
  assert.match(read("src/features/connect/ConnectPhotoField.tsx"), /<ImageCropDialog[\s\S]*shape="photo"/);
  assert.match(read("src/features/connect/ConnectVentureForm.tsx"), /<ImageCropDialog[\s\S]*shape="logo"[\s\S]*type: "image\/png"/);
  for (const locale of ["de", "en"]) {
    const copy = JSON.parse(read(`messages/${locale}/common.json`)).imageCrop as Record<string, string>;
    for (const key of ["title", "hint", "hintLogo", "area", "zoom", "cancel", "confirm", "failed", "adjust"]) assert.ok(copy[key], `${locale}: ${key}`);
  }
});
