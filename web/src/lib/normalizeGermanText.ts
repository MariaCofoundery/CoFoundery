const MOJIBAKE_REPLACEMENTS: Array<[string, string]> = [
  ["Ã„", "Ä"],
  ["Ã–", "Ö"],
  ["Ãœ", "Ü"],
  ["Ã¤", "ä"],
  ["Ã¶", "ö"],
  ["Ã¼", "ü"],
  ["ÃŸ", "ß"],
  ["â€“", "–"],
  ["â€”", "—"],
  ["â€ž", "„"],
  ["â€œ", "“"],
  ["â€", "„"],
  ["â€", "“"],
  ["â€", "”"],
  ["â€™", "’"],
  ["â€¦", "…"],
  ["Â·", "·"],
  ["Â", ""],
];

const SHARP_S_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Schliess/g, "Schließ"],
  [/schliess/g, "schließ"],
  [/Heisst/g, "Heißt"],
  [/heisst/g, "heißt"],
  [/Massgeb/g, "Maßgeb"],
  [/massgeb/g, "maßgeb"],
  [/Gröss/g, "Größ"],
  [/gröss/g, "größ"],
];

// Legacy product copy still contains a small set of ASCII transliterations
// like "klaert" or "Rueckkopplung". We repair only well-known German stems
// here to avoid corrupting valid words such as "zuerst", "Dauer" or
// "aufbauend".
const ASCII_GERMAN_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Aeusser/g, "Äußer"],
  [/aeusser/g, "äußer"],
  [/Aussen/g, "Außen"],
  [/aussen/g, "außen"],
  [/Beruehr/g, "Berühr"],
  [/beruehr/g, "berühr"],
  [/Eigenstaend/g, "Eigenständ"],
  [/eigenstaend/g, "eigenständ"],
  [/Entschaerf/g, "Entschärf"],
  [/entschaerf/g, "entschärf"],
  [/Erschoepf/g, "Erschöpf"],
  [/erschoepf/g, "erschöpf"],
  [/Fuehr/g, "Führ"],
  [/fuehr/g, "führ"],
  [/Fuer/g, "Für"],
  [/fuer/g, "für"],
  [/Gefuehl/g, "Gefühl"],
  [/gefuehl/g, "gefühl"],
  [/Haeufig/g, "Häufig"],
  [/haeufig/g, "häufig"],
  [/Klaer/g, "Klär"],
  [/klaer/g, "klär"],
  [/Koenn/g, "Könn"],
  [/koenn/g, "könn"],
  [/Kuenft/g, "Künft"],
  [/kuenft/g, "künft"],
  [/Naechst/g, "Nächst"],
  [/naechst/g, "nächst"],
  [/Noet/g, "Nöt"],
  [/noet/g, "nöt"],
  [/Persoen/g, "Persön"],
  [/persoen/g, "persön"],
  [/Praes/g, "Präs"],
  [/praes/g, "präs"],
  [/Pruef/g, "Prüf"],
  [/pruef/g, "prüf"],
  [/Regelmaess/g, "Regelmäß"],
  [/regelmaess/g, "regelmäß"],
  [/Rueck/g, "Rück"],
  [/rueck/g, "rück"],
  [/Selbststaend/g, "Selbstständ"],
  [/selbststaend/g, "selbstständ"],
  [/Sorgfaelt/g, "Sorgfält"],
  [/sorgfaelt/g, "sorgfält"],
  [/Spuer/g, "Spür"],
  [/spuer/g, "spür"],
  [/Tragfaeh/g, "Tragfäh"],
  [/tragfaeh/g, "tragfäh"],
  [/Ueber/g, "Über"],
  [/ueber/g, "über"],
  [/Veraender/g, "Veränder"],
  [/veraender/g, "veränder"],
  [/Verfueg/g, "Verfüg"],
  [/verfueg/g, "verfüg"],
  [/Verlaess/g, "Verläss"],
  [/verlaess/g, "verläss"],
  [/Waehl/g, "Wähl"],
  [/waehl/g, "wähl"],
  [/Zusaetz/g, "Zusätz"],
  [/zusaetz/g, "zusätz"],
  [/Zustaend/g, "Zuständ"],
  [/zustaend/g, "zuständ"],
  [/Zuverlaess/g, "Zuverläss"],
  [/zuverlaess/g, "zuverläss"],
];

function restoreInWordGermanDigraphs(value: string) {
  return value
    .replace(/([B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z])ae/g, "$1ä")
    .replace(/([B-DF-HJ-NP-TV-Zb-df-hj-np-tv-z])oe/g, "$1ö")
    // Exclude q/Q and z/Z here so valid words like "zuerst" stay intact.
    .replace(/([B-DF-HJ-NP-TV-Yb-df-hj-np-tv-y])ue/g, "$1ü");
}

export function normalizeGermanText(value: string | null | undefined) {
  if (!value) return value ?? "";

  let normalized = value.normalize("NFC");

  for (const [source, target] of MOJIBAKE_REPLACEMENTS) {
    normalized = normalized.split(source).join(target);
  }

  for (const [pattern, target] of SHARP_S_REPLACEMENTS) {
    normalized = normalized.replace(pattern, target);
  }

  for (const [pattern, target] of ASCII_GERMAN_REPLACEMENTS) {
    normalized = normalized.replace(pattern, target);
  }

  normalized = restoreInWordGermanDigraphs(normalized);

  return normalized;
}
