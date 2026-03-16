#!/usr/bin/env bash
set -euo pipefail

# Dateien, die wir prüfen wollen (passe an, wenn nötig)
TARGETS=(
  "src"
)

# Nur Text-Dateien scannen; ignoriere node_modules/build outputs
EXCLUDES=(
  "--exclude-dir=node_modules"
  "--exclude-dir=.next"
  "--exclude-dir=dist"
  "--exclude-dir=build"
)

# Wir suchen nach typischen Umlaut-Ersatzschreibweisen in deutschen Texten.
# (Das ist bewusst "streng"; wenn es false positives gibt, machen wir Whitelist/Ignore.)
PATTERN='(AE|OE|UE|ae|oe|ue)'

echo "🔎 Checking for umlaut ASCII fallbacks (ae/oe/ue) in ${TARGETS[*]} ..."

if grep -RIn ${EXCLUDES[*]} -E "$PATTERN" "${TARGETS[@]}"; then
  echo ""
  echo "❌ Found possible umlaut fallbacks (ae/oe/ue). Please replace with ä/ö/ü where appropriate."
  exit 1
else
  echo "✅ No umlaut fallbacks found."
fi