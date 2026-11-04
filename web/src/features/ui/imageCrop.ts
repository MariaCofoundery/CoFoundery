/**
 * Die Rechnung hinter `ImageCropDialog`: wie gross das Bild im quadratischen Fenster steht und wie
 * weit es sich verschieben laesst. Rein, damit sie getestet werden kann.
 *
 * Zoom 1 heisst: Das Bild fuellt das Fenster gerade so (die kuerzere Seite passt). Beim Logo darf
 * man darunter gehen, bis das ganze Bild hineinpasst - der Rest bleibt durchsichtig.
 */
export const MAX_CROP_ZOOM = 4;

const coverScale = (width: number, height: number, view: number) => Math.max(view / width, view / height);

export function cropBounds(width: number, height: number, view: number, allowContain: boolean) {
  const cover = coverScale(width, height, view);
  const contain = Math.min(view / width, view / height);
  return { minZoom: allowContain ? contain / cover : 1, maxZoom: MAX_CROP_ZOOM };
}

function displaySize(width: number, height: number, view: number, zoom: number) {
  const scale = coverScale(width, height, view) * zoom;
  return { width: width * scale, height: height * scale };
}

/** Verschieben nur so weit, dass keine leere Kante entsteht; ist das Bild kleiner, steht es mittig. */
export function clampCropOffset(width: number, height: number, view: number, zoom: number, offset: { x: number; y: number }) {
  const size = displaySize(width, height, view, zoom);
  const maxX = Math.max(0, (size.width - view) / 2);
  const maxY = Math.max(0, (size.height - view) / 2);
  return { x: Math.min(maxX, Math.max(-maxX, offset.x)), y: Math.min(maxY, Math.max(-maxY, offset.y)) };
}

/** Wo das Bild im Fenster liegt - dieselben Masse gelten, hochgerechnet, fuer das fertige Bild. */
export function cropDrawRect(width: number, height: number, view: number, zoom: number, offset: { x: number; y: number }) {
  const size = displaySize(width, height, view, zoom);
  return { left: view / 2 - size.width / 2 + offset.x, top: view / 2 - size.height / 2 + offset.y, width: size.width, height: size.height };
}
