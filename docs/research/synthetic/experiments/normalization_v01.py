"""Deterministische Normalisierung fuer Freitext-Felder (Matching-Experiment v0.1).

Drei Stufen, damit ihr Effekt einzeln messbar ist:

  exact    – wie das Produkt heute: lower() + trim (search_by_frame, connect_match_terms)
  generic  – Unicode, Kleinschreibung, Umlaute (ä→ae), Satzzeichen, Leerraum,
             einfache Singularbildung. Kein Wissen ueber Begriffe.
  synonym  – generic + die Wörterbücher unten (DE/EN, Abkürzungen, Orte).

ALLE Regeln stehen in dieser Datei. Es gibt kein LLM, keine Embeddings, keine
Web-Recherche und keinen Zugriff auf Testannotationen. Begriffe, die kein Wörterbuch
kennt, bleiben ihr generisch normalisierter String – sie können also weiterhin
wörtlich matchen, aber nicht über ein Synonym.

BEKANNTE SCHWAeCHE (siehe report_v01.md): Die Wörterbücher wurden vom selben Autor
geschrieben wie der Generator des synthetischen Datensatzes. Sie decken dessen
Varianten deshalb vermutlich besser ab als reale Nutzereingaben. Tippfehler werden
bewusst NICHT abgefangen (kein Fuzzy-Matching).
"""
import re
import unicodedata

LEVELS = ("exact", "generic", "synonym")

# ---------------------------------------------------------------------------
# Generische Normalisierung
# ---------------------------------------------------------------------------
_UMLAUT = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss"})


def exact(text):
    """Produktsemantik heute: lower(btrim(x))."""
    return (text or "").strip().lower()


def _singular(token):
    # Nur offensichtliche Pluralformen, um keine Woerter zu zerstoeren.
    if len(token) > 4 and token.endswith("ies"):
        return token[:-3] + "y"
    if len(token) > 4 and token.endswith("s") and not token.endswith(("ss", "us", "is", "os")):
        return token[:-1]
    return token


def generic(text):
    s = unicodedata.normalize("NFKC", text or "").lower().translate(_UMLAUT)
    s = s.replace("&", " und ")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return " ".join(_singular(t) for t in s.split())


# ---------------------------------------------------------------------------
# Woerterbuecher (Begriff -> Schreibweisen). Schluessel sind eigene Konzeptnamen.
# ---------------------------------------------------------------------------
INDUSTRY_SYNONYMS = {
    "ind:health": ["Digital Health", "HealthTech", "Health Tech", "Healthcare", "Health Care", "Gesundheitswesen",
                   "Gesundheit", "Digitale Gesundheit", "E-Health", "eHealth", "MedTech", "Medizintechnik"],
    "ind:software": ["SaaS", "Software as a Service", "B2B SaaS", "Software", "B2B-Software", "Unternehmenssoftware",
                     "Enterprise Software"],
    "ind:climate_energy": ["Climate Tech", "ClimateTech", "Cleantech", "Clean Tech", "Energy", "Energie",
                           "Erneuerbare Energien", "Renewables", "Renewable Energy", "Klimaschutz", "Klima", "Energiewende"],
    "ind:education": ["Education", "EdTech", "Bildung", "Weiterbildung", "E-Learning", "Learning", "Lernen"],
    "ind:consumer": ["Consumer", "Consumer Goods", "Konsumgüter", "E-Commerce", "eCommerce", "D2C", "DTC", "Retail", "Handel"],
    "ind:deep_tech": ["Deep Tech", "DeepTech", "Robotics", "Robotik", "Materialforschung", "Materials Science",
                      "Quantentechnologie", "Quantum Technology"],
    "ind:social_impact": ["Social Impact", "Impact", "Sozialunternehmen", "Social Entrepreneurship", "Gemeinwohl",
                          "Gemeinwohlökonomie", "Non-Profit", "Nonprofit"],
    "ind:marketplace": ["Marketplace", "Marktplatz", "Marktplätze", "Platform", "Plattform", "Two-sided Marketplace"],
    "ind:media": ["Media", "Medien", "Creative Industries", "Kreativwirtschaft", "Content", "Creator Economy", "Medien & Kultur"],
    "ind:finance": ["FinTech", "Financial Services", "Finanzdienstleistungen", "Banking", "InsurTech"],
    "ind:mobility": ["Mobility", "Mobilität", "Logistics", "Logistik", "Transport", "Supply Chain"],
    "ind:food_agri": ["Food", "FoodTech", "Lebensmittel", "AgriTech", "Agrar", "Landwirtschaft"],
    "ind:real_estate": ["PropTech", "Real Estate", "Immobilien", "Construction", "ConTech", "Bauwirtschaft", "Bau"],
    "ind:work": ["HR", "HR Tech", "HRTech", "Personalwesen", "Future of Work", "New Work", "Arbeitswelt"],
    "ind:manufacturing": ["Manufacturing", "Industrie", "Industry 4.0", "Industrie 4.0", "Produktion", "Maschinenbau", "Industrial"],
}

TOPIC_SYNONYMS = {
    "top:software": ["Software Engineering", "Softwareentwicklung", "Backend", "Full-Stack", "Full Stack", "Programmierung",
                     "Engineering", "Dev"],
    "top:ai": ["AI", "KI", "Künstliche Intelligenz", "Artificial Intelligence", "Machine Learning", "ML", "GenAI", "LLM",
               "LLMs", "KI / ML", "AI/ML"],
    "top:data": ["Data", "Data Analytics", "Datenanalyse", "Analytics", "BI", "Business Intelligence", "Data Science"],
    "top:hardware": ["Hardware", "Hardware-Entwicklung", "Elektronik", "Electronics", "IoT", "Embedded", "Prototyping"],
    "top:product": ["Product Discovery", "Discovery", "Produktentwicklung", "User Research", "Nutzerforschung", "Product",
                    "Produktmanagement", "Product Management"],
    "top:design": ["UX", "UX Design", "UX-Design", "UI/UX", "UX/UI", "Design", "Produktdesign", "Gestaltung"],
    "top:sales": ["Go-to-Market", "GTM", "Markteintritt", "Sales", "Vertrieb", "B2B Sales", "B2B-Vertrieb", "Vertriebsaufbau"],
    "top:pilots": ["Pilot Customers", "Pilotkunden", "Erste Kunden", "Early Adopters", "Pilotprojekte", "Pilots"],
    "top:partnerships": ["Partnerships", "Partnerschaften", "Kooperationen", "Business Development", "BD", "BizDev"],
    "top:marketing": ["Marketing", "Branding", "Brand", "Brand Marketing", "Markenaufbau", "Content Marketing",
                      "Performance Marketing"],
    "top:community": ["Community", "Community Building", "Community-Aufbau", "Communities", "Netzwerk", "Events"],
    "top:operations": ["Operations", "Ops", "Prozesse", "Prozessoptimierung", "Scaling", "Skalierung"],
    "top:hiring": ["Hiring", "Recruiting", "Teamaufbau", "Personalgewinnung", "Talent", "People"],
    "top:fundraising": ["Fundraising", "Finanzierung", "Investorensuche", "Seed Funding", "Seed-Runde", "VC", "Fundraise"],
    "top:finance_planning": ["Finanzplanung", "Financial Planning"],
    "top:pricing": ["Pricing", "Preisgestaltung", "Monetarisierung", "Monetization", "Preismodelle", "Revenue Model"],
    "top:regulatory": ["Regulatory", "Regulatorik", "Compliance", "Zulassung", "Zulassungen", "Regulatory Affairs"],
    "top:impact_measurement": ["Impact Measurement", "Wirkungsmessung", "SROI"],
    "top:sustainability": ["Sustainability", "Nachhaltigkeit", "ESG", "CO2-Bilanz", "Climate Reporting"],
    "top:legal": ["Legal", "Recht", "IP", "Patente", "Patent Law", "Gesellschaftsrecht"],
    "top:medical_device_regulation": ["MDR", "Medical Device Regulation", "MDR-Zulassung", "Medizinprodukterecht", "MDR/IVDR",
                                      "CE-Kennzeichnung Medizinprodukte"],
    "top:battery": ["Battery Chemistry", "Batteriechemie", "Zellchemie", "Cell Chemistry", "Li-Ion", "Batterietechnik"],
    "top:quantum_sensing": ["Quantum Sensing", "Quantensensorik"],
    "top:soil": ["Soil Science", "Bodenkunde", "Bodengesundheit", "Soil Health", "Regenerative Landwirtschaft", "Agronomy"],
    "top:public_procurement": ["Public Procurement", "Vergaberecht", "Öffentliche Beschaffung", "GovTech Sales",
                               "Ausschreibungen", "Vergabe"],
}

# Orte: Metropolregion -> Schreibweisen. Zusaetze wie ", Germany" werden vorher entfernt.
LOCATION_ALIASES = {
    "loc:berlin": ["Berlin", "Berlin-Brandenburg", "Großraum Berlin"],
    "loc:munich": ["München", "Munich", "Muenchen", "Bayern", "Bavaria"],
    "loc:hamburg": ["Hamburg", "HH"],
    "loc:cologne": ["Köln", "Cologne", "Koeln", "Köln/Bonn", "Rheinland"],
    "loc:frankfurt": ["Frankfurt", "Frankfurt am Main", "Rhein-Main", "FFM"],
    "loc:leipzig": ["Leipzig", "Mitteldeutschland", "Mitteldeutschland (Leipzig)"],
    "loc:stuttgart": ["Stuttgart", "Region Stuttgart"],
    "loc:ruhr": ["Ruhrgebiet", "Ruhr Area", "Essen", "Dortmund", "Essen / Ruhrgebiet"],
    "loc:vienna": ["Wien", "Vienna"],
    "loc:zurich": ["Zürich", "Zurich", "Zuerich"],
}
# Angaben, die keinen Ort festlegen: passen zu jedem Ort, sind aber kein Ort.
LOCATION_WILDCARDS = ["DACH", "Deutschland", "Germany", "bundesweit", "remote (DE)", "Remote", "Remote / überall", "überall"]
# Zusaetze, die nach einem Ort stehen und nichts unterscheiden.
LOCATION_SUFFIXES = ["germany", "deutschland", "de", "bayern", "bavaria", "bw", "sachsen", "oesterreich", "austria",
                     "und umgebung", "umgebung"]

WILDCARD = "loc:*"


def _index(table):
    out = {}
    for key, forms in table.items():
        for f in forms:
            out[generic(f)] = key
    return out


_IND = _index(INDUSTRY_SYNONYMS)
_TOP = _index(TOPIC_SYNONYMS)
_LOC = _index(LOCATION_ALIASES)
_WILD = {generic(w) for w in LOCATION_WILDCARDS}
_SUFFIX = re.compile(r"(?:\s+(?:" + "|".join(LOCATION_SUFFIXES) + r"))+$")


def term(text, kind, level):
    """Ein Begriff -> Vergleichsschluessel. kind: 'industry' | 'topic'."""
    if level == "exact":
        return exact(text)
    g = generic(text)
    if level == "generic":
        return g
    table = _IND if kind == "industry" else _TOP
    # Erst der ganze Begriff, dann eine Variante ohne Zusatz wie "for ..."/"in ..."
    return table.get(g, g)


def terms(values, kind, level, min_len=1):
    out = set()
    for v in values or []:
        k = term(v, kind, level)
        if k and len(k) >= min_len:
            out.add(k)
    return out


def location(text, level):
    """Ort -> Schluessel, WILDCARD (passt ueberall) oder None (keine Angabe)."""
    if not text or not text.strip():
        return None
    if level == "exact":
        return exact(text)
    g = generic(text)
    if level == "generic":
        return g
    if g in _WILD:
        return WILDCARD
    if g in _LOC:
        return _LOC[g]
    stripped = _SUFFIX.sub("", g).strip()
    if stripped in _WILD:
        return WILDCARD
    return _LOC.get(stripped, stripped)


def same_place(a, b):
    """True/False, oder None, wenn eine Seite nichts festlegt."""
    if a is None or b is None or a == WILDCARD or b == WILDCARD:
        return None
    return a == b
