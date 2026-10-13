"""Synthetische Testpopulation fuer Made2Found Matching Engine v0.1.

    python3 docs/research/synthetic/tools/generate_profiles.py [--out DIR] [--workstyle-seed N]

Deterministisch (feste Seeds). Liest nur die Repo-Migrationen fuer Vokabulare
(54 Capability-Bereiche, 29 Workstyle-Kernitems). Schreibt nach
docs/research/synthetic/ oder --out. Keine Datenbank, kein Netzwerk.
Source of Truth fuer die Datenstruktur: docs/research/matching-v0.1-data-inventory.md

Anti-Zirkularitaet:
  * Jede Referenzklasse wird VOR dem Bau der Profile als Absicht festgelegt
    (Szenario-Konstruktion). Profile werden fuer diese Absicht gebaut.
  * Die Einzeldimensionen werden danach auf der kanonischen Referenzschicht
    annotiert (nie auf Freitext-Strings).
  * Eine Konsistenzpruefung verwirft nur widerspruechliche Konstruktionen
    (z. B. "excellent" mit harter Bedingung). Sie erzeugt keine Klasse.
  * Workstyle-Antworten kommen aus einem eigenen Zufallsstrom und werden von
    keiner Funktion gelesen, die Klassen oder Dimensionen bestimmt.
"""
import argparse
import csv
import datetime as dt
import json
import os
import random
import re
import sys
from collections import Counter, defaultdict

SEED_PROFILES = 20261013
SEED_WORKSTYLE = 9029

_args = argparse.ArgumentParser(description="Erzeugt die synthetische Matching-Testpopulation v0.1.")
_args.add_argument("--repo", default=os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..")),
                   help="Repository-Wurzel (Standard: aus dem Skriptpfad abgeleitet)")
_args.add_argument("--out", default=None, help="Zielordner (Standard: docs/research/synthetic)")
_args.add_argument("--workstyle-seed", type=int, default=SEED_WORKSTYLE,
                   help="Nur fuer den Unabhaengigkeitsnachweis: aendert ausschliesslich workstyle_core.json")
ARGS = _args.parse_args()
REPO = ARGS.repo
OUT = ARGS.out or os.path.join(REPO, "docs/research/synthetic")
os.makedirs(OUT, exist_ok=True)

R = random.Random(SEED_PROFILES)         # Profile + Paare
RW = random.Random(ARGS.workstyle_seed)  # Workstyle, getrennter Strom
NOW = dt.date(2026, 10, 13)

# ---------------------------------------------------------------------------
# Vokabulare aus dem Repo
# ---------------------------------------------------------------------------
AREAS = {}
for fn in sorted(os.listdir(os.path.join(REPO, "supabase/migrations"))):
    s = re.sub(r"--[^\n]*", "", open(os.path.join(REPO, "supabase/migrations", fn), encoding="utf-8").read())
    for m in re.finditer(r"insert into public\.capability_areas\s*\(([^)]*)\)\s*values(.*?);", s, re.S | re.I):
        for row in re.finditer(r"\(\s*'([a-z0-9_]+)'\s*,\s*'([a-z0-9_]+)'\s*,\s*\d+", m.group(2)):
            AREAS[row.group(1)] = row.group(2)
assert len(AREAS) == 54, len(AREAS)
_seed = open(os.path.join(REPO, "supabase/migrations/20261113121000_workstyle_v3_item_seed.sql"), encoding="utf-8").read()
CORE_ITEMS = [dict(item_key=i["item_key"], item_version=i["item_version"], area_key=i["area_key"],
                   response_format=i["response_format"], options=[o["option_id"] for o in i.get("options") or []])
              for i in json.loads(_seed[_seed.index("$workstyle$[") + len("$workstyle$"): _seed.index("]$workstyle$") + 1])
              if i.get("usage") == "core"]
assert len(CORE_ITEMS) == 29

ROLES = ["tech", "product", "sales", "growth", "marketing", "operations", "finance",
         "design", "strategy", "research", "community", "other"]
COMMITMENT = ["side_project", "part_time", "full_time", "all_in"]          # aktiv erlaubt
FIND_STAGE = ["no_idea_open_to_join", "exploring_ideas", "idea_validating", "already_building"]
GOALS = ["explore", "side_project", "profitable_business", "venture_scale", "exit_oriented"]
INTENTS = ["ready_now", "actively_exploring", "open_later"]
HORIZONS = ["now", "next_3_months", "next_6_months", "later_or_flexible"]
REMOTE = ["onsite", "hybrid", "remote", "flexible"]
NETWORK_ROLES = ["founder", "aspiring_founder", "expert", "advisor_mentor", "business_angel", "company_representative"]
FORMATS = ["coffee", "walk", "video", "call", "sparring", "intro"]
CATEGORIES = ["expertise", "cooperation", "investment", "sparring", "succession"]
SCOPES = ["regional", "germany", "europe", "global"]
LISTING_STAGE = ["exploring", "idea", "validation", "early", "growth", "established"]
AUTHOR_INTENT = ["observation", "wants_to_build", "already_building"]
WISHES = ["own", "contribute", "grow_into", "prefer_other", "prefer_external", "unclear"]

ROLE_AREAS = {
    "tech": ["software_engineering", "technical_architecture", "ai_ml", "data_analytics", "hardware_production"],
    "product": ["product_management", "product_discovery", "product_strategy"],
    "sales": ["b2b_sales", "partnerships", "customer_success"],
    "growth": ["b2c_growth", "performance_marketing", "data_analytics"],
    "marketing": ["marketing_brand", "performance_marketing", "positioning"],
    "operations": ["operations", "process_design", "people_management"],
    "finance": ["financial_planning", "fundraising", "unit_economics", "investor_relations"],
    "design": ["ux_design", "prototyping"],
    "strategy": ["business_model", "strategic_planning", "positioning"],
    "research": ["user_research", "market_analysis", "customer_discovery"],
    "community": ["community", "networking", "facilitation"],
    "other": [],
}

# Archetypen: Rolle(n), Kernbereiche, Nebenbereiche, typische Suche, Themen
ARCH = {
    "tech_builder": dict(own=["tech"], seek=[["sales"], ["product"], ["growth"], ["sales", "finance"]],
                         core=["software_engineering", "technical_architecture"], sec=["data_analytics", "ai_ml", "prototyping", "security"],
                         topics=["software_dev", "ai_ml", "data_analytics"]),
    "ai_researcher": dict(own=["research", "tech"], seek=[["product"], ["sales"], ["product", "sales"]],
                          core=["ai_ml", "data_analytics"], sec=["user_research", "technical_architecture", "deciding_under_uncertainty"],
                          topics=["ai_ml", "data_analytics"]),
    "hardware_engineer": dict(own=["tech"], seek=[["sales", "finance"], ["operations"], ["finance"]],
                              core=["hardware_production", "prototyping"], sec=["technical_architecture", "process_design", "security"],
                              topics=["hardware", "operations_scaling"]),
    "product_lead": dict(own=["product"], seek=[["tech"], ["tech", "design"], ["tech", "growth"]],
                         core=["product_management", "product_discovery", "product_strategy"], sec=["user_research", "ux_design", "prioritising"],
                         topics=["product_discovery", "design_ux"]),
    "designer": dict(own=["design"], seek=[["tech"], ["tech", "sales"], ["product"]],
                     core=["ux_design", "prototyping"], sec=["marketing_brand", "user_research", "facilitation"],
                     topics=["design_ux", "brand_marketing"]),
    "sales_bd": dict(own=["sales"], seek=[["tech"], ["tech", "product"], ["product"]],
                     core=["b2b_sales", "partnerships"], sec=["pricing", "customer_success", "networking", "difficult_conversations"],
                     topics=["go_to_market", "pilot_customers", "partnerships"]),
    "growth_marketer": dict(own=["growth", "marketing"], seek=[["tech"], ["tech", "product"], ["product"]],
                            core=["performance_marketing", "b2c_growth"], sec=["marketing_brand", "data_analytics", "community"],
                            topics=["brand_marketing", "go_to_market"]),
    "brand_storyteller": dict(own=["marketing"], seek=[["tech"], ["tech", "finance"], ["product"]],
                              core=["marketing_brand", "positioning"], sec=["public_speaking", "community", "networking"],
                              topics=["brand_marketing", "community_building"]),
    "ops_operator": dict(own=["operations"], seek=[["tech"], ["sales"], ["tech", "sales"]],
                         core=["operations", "process_design"], sec=["recruiting", "people_management", "structuring_work"],
                         topics=["operations_scaling", "hiring"]),
    "finance_lead": dict(own=["finance"], seek=[["tech"], ["tech", "product"], ["product", "sales"]],
                         core=["financial_planning", "fundraising", "unit_economics"], sec=["investor_relations", "accounting_controlling", "pricing"],
                         topics=["fundraising", "pricing"]),
    "strategist": dict(own=["strategy"], seek=[["tech"], ["tech", "product"], ["sales"]],
                       core=["business_model", "strategic_planning", "positioning"], sec=["market_analysis", "pricing", "deciding_under_uncertainty"],
                       topics=["go_to_market", "pricing"]),
    "domain_researcher": dict(own=["research"], seek=[["tech"], ["tech", "sales"], ["sales"]],
                              core=["user_research", "market_analysis", "industry_domain"], sec=["customer_discovery", "target_segments", "teaching_mentoring"],
                              topics=["product_discovery", "regulatory"]),
    "community_builder": dict(own=["community"], seek=[["tech"], ["tech", "finance"], ["finance"]],
                              core=["community", "networking", "facilitation"], sec=["public_speaking", "teaching_mentoring", "customer_success"],
                              topics=["community_building", "impact_measurement"]),
    "people_ops": dict(own=["operations"], seek=[["tech"], ["sales", "tech"]],
                       core=["people_management", "recruiting", "org_design"], sec=["difficult_conversations", "process_design", "facilitation"],
                       topics=["hiring", "operations_scaling"]),
}
ARCH_OF_ROLE = defaultdict(list)
for k, a in ARCH.items():
    for r_ in a["own"]:
        ARCH_OF_ROLE[r_].append(k)

# Kanonische Branchen -> Oberflaechenformen (DE, EN, Varianten). Absichtlich unsauber.
IND = {
    "digital_health": (["Gesundheitswesen", "Digitale Gesundheit"], ["Digital Health", "HealthTech", "Healthcare"], ["E-Health", "Health Tech", "healthtech", "MedTech", "Helthcare"]),
    "saas_b2b": (["Unternehmenssoftware", "B2B-Software"], ["SaaS", "B2B SaaS", "Software"], ["Software as a Service", "saas", "Enterprise Software"]),
    "climate_energy": (["Energie", "Erneuerbare Energien", "Klimaschutz"], ["Climate Tech", "Energy", "Cleantech"], ["ClimateTech", "Klima", "Renewables", "Energiewende"]),
    "education": (["Bildung", "Weiterbildung"], ["Education", "EdTech"], ["Edtech", "Lernen", "Learning", "E-Learning"]),
    "consumer": (["Konsumgüter", "Handel"], ["Consumer", "Consumer Goods", "E-Commerce"], ["D2C", "DTC", "Retail", "eCommerce"]),
    "deep_tech": (["Robotik", "Materialforschung"], ["Deep Tech", "Robotics"], ["DeepTech", "Quantentechnologie", "Hardware"]),
    "social_impact": (["Sozialunternehmen", "Gemeinwohl"], ["Social Impact", "Impact"], ["Social Entrepreneurship", "Non-Profit", "Gemeinwohlökonomie"]),
    "marketplace": (["Marktplatz", "Plattform"], ["Marketplace", "Platform"], ["Two-sided Marketplace", "Marktplätze", "marketplace"]),
    "creative_media": (["Medien", "Kreativwirtschaft"], ["Media", "Creative Industries"], ["Content", "Creator Economy", "Medien & Kultur"]),
    "fintech": (["Finanzdienstleistungen", "Banking"], ["FinTech", "Financial Services"], ["Fintech", "Insurtech", "Fintec"]),
    "mobility": (["Mobilität", "Logistik"], ["Mobility", "Logistics"], ["Transport", "Supply Chain", "Mobilitaet"]),
    "food_agri": (["Lebensmittel", "Landwirtschaft"], ["FoodTech", "AgriTech"], ["Food", "Agrar", "Agritech"]),
    "proptech": (["Immobilien", "Bauwirtschaft"], ["PropTech", "Real Estate"], ["ConTech", "Construction", "Proptech"]),
    "hr_work": (["Personalwesen", "Arbeitswelt"], ["HR Tech", "Future of Work"], ["HR", "HRTech", "New Work"]),
    "manufacturing": (["Industrie", "Maschinenbau"], ["Manufacturing", "Industry 4.0"], ["Produktion", "Industrie 4.0", "Industrial"]),
}
ADJ = {frozenset(p) for p in [("digital_health", "saas_b2b"), ("saas_b2b", "hr_work"), ("saas_b2b", "fintech"),
                               ("climate_energy", "mobility"), ("climate_energy", "deep_tech"), ("climate_energy", "proptech"),
                               ("deep_tech", "manufacturing"), ("consumer", "marketplace"), ("consumer", "food_agri"),
                               ("education", "hr_work"), ("education", "social_impact"), ("social_impact", "climate_energy"),
                               ("creative_media", "consumer"), ("marketplace", "mobility"), ("food_agri", "climate_energy"),
                               ("digital_health", "social_impact"), ("proptech", "manufacturing")]}
B2X = {"digital_health": "B2B", "saas_b2b": "B2B", "climate_energy": "B2B", "education": "B2C", "consumer": "B2C",
       "deep_tech": "B2B", "social_impact": "B2C", "marketplace": "B2C", "creative_media": "B2C", "fintech": "B2B",
       "mobility": "B2B", "food_agri": "B2C", "proptech": "B2B", "hr_work": "B2B", "manufacturing": "B2B"}

TOP = {
    "software_dev": (["Softwareentwicklung", "Backend"], ["Software Engineering", "Full-Stack"], ["Dev", "Programmierung", "Engineering"]),
    "ai_ml": (["KI", "Künstliche Intelligenz"], ["AI", "Machine Learning"], ["ML", "GenAI", "LLMs"]),
    "data_analytics": (["Datenanalyse"], ["Data Analytics", "Data"], ["BI", "Analytics", "Data Science"]),
    "hardware": (["Hardware-Entwicklung", "Elektronik"], ["Hardware", "Prototyping"], ["IoT", "Embedded"]),
    "product_discovery": (["Produktentwicklung", "Nutzerforschung"], ["Product Discovery", "User Research"], ["Discovery", "Product"]),
    "design_ux": (["Produktdesign", "Gestaltung"], ["UX Design", "UX"], ["UI/UX", "Design", "UX/UI"]),
    "go_to_market": (["Markteintritt", "Vertrieb"], ["Go-to-Market", "Sales"], ["GTM", "B2B Sales", "Vertriebsaufbau"]),
    "pilot_customers": (["Pilotkunden", "Erste Kunden"], ["Pilot Customers", "Early Adopters"], ["Pilotprojekte", "Pilots"]),
    "partnerships": (["Kooperationen", "Partnerschaften"], ["Partnerships", "Business Development"], ["BD", "BizDev"]),
    "brand_marketing": (["Markenaufbau", "Marketing"], ["Branding", "Brand Marketing"], ["Content Marketing", "Performance Marketing", "Brand"]),
    "community_building": (["Community-Aufbau", "Netzwerk"], ["Community Building", "Community"], ["Communities", "Events"]),
    "operations_scaling": (["Prozesse", "Skalierung"], ["Operations", "Scaling"], ["Ops", "Prozessoptimierung"]),
    "hiring": (["Teamaufbau", "Personalgewinnung"], ["Hiring", "Recruiting"], ["Talent", "People"]),
    "fundraising": (["Finanzierung", "Investorensuche"], ["Fundraising", "Seed Funding"], ["VC", "Seed-Runde", "Fundraise"]),
    "pricing": (["Preisgestaltung", "Monetarisierung"], ["Pricing", "Monetization"], ["Preismodelle", "Revenue Model"]),
    "regulatory": (["Regulatorik", "Zulassung"], ["Regulatory", "Compliance"], ["Regulatory Affairs", "Zulassungen"]),
    "impact_measurement": (["Wirkungsmessung"], ["Impact Measurement"], ["SROI", "Impact"]),
    "sustainability": (["Nachhaltigkeit"], ["Sustainability", "ESG"], ["CO2-Bilanz", "Climate Reporting"]),
    "legal_ip": (["Recht", "Patente"], ["Legal", "IP"], ["Gesellschaftsrecht", "Patent Law"]),
    # Nischen fuer Spezialistinnen
    "mdr_regulatory": (["MDR-Zulassung", "Medizinprodukterecht"], ["MDR", "Medical Device Regulation"], ["CE-Kennzeichnung Medizinprodukte", "MDR/IVDR"]),
    "battery_chemistry": (["Batteriechemie", "Zellchemie"], ["Battery Chemistry", "Cell Chemistry"], ["Li-Ion", "Batterietechnik"]),
    "quantum_sensing": (["Quantensensorik"], ["Quantum Sensing"], ["Quantum", "Quantentechnologie"]),
    "soil_science": (["Bodenkunde", "Bodengesundheit"], ["Soil Science", "Soil Health"], ["Regenerative Landwirtschaft", "Agronomy"]),
    "public_procurement": (["Vergaberecht", "Öffentliche Beschaffung"], ["Public Procurement", "GovTech Sales"], ["Ausschreibungen", "Vergabe"]),
}
NICHE = ["mdr_regulatory", "battery_chemistry", "quantum_sensing", "soil_science", "public_procurement"]
NICHE_IND = {"mdr_regulatory": "digital_health", "battery_chemistry": "climate_energy", "quantum_sensing": "deep_tech",
             "soil_science": "food_agri", "public_procurement": "saas_b2b"}
NICHE_AREAS = {"mdr_regulatory": ["compliance_regulatory", "industry_domain"], "battery_chemistry": ["hardware_production", "industry_domain"],
               "quantum_sensing": ["hardware_production", "technical_architecture"], "soil_science": ["industry_domain", "market_analysis"],
               "public_procurement": ["compliance_regulatory", "b2b_sales"]}

LOC = {
    "berlin": (["Berlin", "Berlin, Germany", "Berlin-Brandenburg", "berlin", "Berlin (DE)", "Großraum Berlin"], 25),
    "munich": (["München", "Munich", "München / Bayern", "Muenchen", "Munich, Bavaria"], 14),
    "hamburg": (["Hamburg", "Hamburg, Deutschland", "HH", "Hamburg & Umgebung"], 10),
    "cologne": (["Köln", "Cologne", "Köln/Bonn", "Koeln"], 8),
    "frankfurt": (["Frankfurt am Main", "Frankfurt", "Rhein-Main", "FFM"], 7),
    "leipzig": (["Leipzig", "Leipzig, Sachsen", "Mitteldeutschland (Leipzig)"], 5),
    "stuttgart": (["Stuttgart", "Region Stuttgart", "Stuttgart, BW"], 5),
    "ruhr": (["Ruhrgebiet", "Ruhr Area", "Essen / Ruhrgebiet"], 5),
    "vienna": (["Wien", "Vienna", "Wien, Österreich"], 5),
    "zurich": (["Zürich", "Zurich", "Zuerich"], 3),
    "anywhere_dach": (["DACH", "Deutschland", "Germany", "bundesweit", "remote (DE)"], 8),
}

FIRST = ["Mara", "Jonas", "Aylin", "Theo", "Nele", "Kofi", "Ida", "Mateo", "Sanna", "Leon", "Yara", "Emil", "Defne", "Noah",
         "Lina", "Arjun", "Greta", "Malik", "Juna", "Paul", "Selin", "Finn", "Amira", "Oskar", "Hanna", "Ravi", "Lotte", "Bao",
         "Clara", "Tariq", "Merle", "Elias", "Zoe", "Can", "Frieda", "Luca", "Imani", "Henrik", "Mina", "Jan", "Nora", "Kenji",
         "Alma", "Samir", "Pia", "Vincent", "Leyla", "Matti", "Ronja", "Dario"]

ROLE_WORD = {"de": {"tech": "Technik", "product": "Produkt", "sales": "Vertrieb", "growth": "Wachstum", "marketing": "Marketing",
                    "operations": "Operations", "finance": "Finanzen", "design": "Design", "strategy": "Strategie",
                    "research": "Forschung", "community": "Community", "other": "Sonstiges"},
             "en": {"tech": "tech", "product": "product", "sales": "sales", "growth": "growth", "marketing": "marketing",
                    "operations": "operations", "finance": "finance", "design": "design", "strategy": "strategy",
                    "research": "research", "community": "community", "other": "other"}}
HEAD = {
    "tech_builder": (["Software-Engineering & Architektur – {ind}", "Baue Produkte von Backend bis Frontend ({ind})"], ["Full-stack engineer, curious about {ind}", "Engineer building {ind} products"]),
    "ai_researcher": (["Machine-Learning-Forschung, jetzt Richtung Gründung", "KI-Forschung trifft {ind}"], ["ML researcher moving into {ind}", "Applied AI for {ind}"]),
    "hardware_engineer": (["Hardware- und Prototypenbau für {ind}", "Elektronik, Fertigung, Prototypen"], ["Hardware engineer, prototypes to production", "Building physical products for {ind}"]),
    "product_lead": (["Produktverantwortung in {ind}", "Product Discovery und Roadmaps"], ["Product lead in {ind}", "Product person who loves discovery"]),
    "designer": (["UX- und Produktdesign, {ind}", "Gestalte Produkte, die man versteht"], ["UX and product designer, {ind}", "Designer turning research into products"]),
    "sales_bd": (["B2B-Vertrieb und Partnerschaften – {ind}", "Erste Kunden gewinnen ist mein Ding"], ["B2B sales & partnerships in {ind}", "I get the first ten customers"]),
    "growth_marketer": (["Growth & Performance Marketing", "Wachstum für {ind}-Produkte"], ["Growth marketer for {ind}", "Performance and lifecycle marketing"]),
    "brand_storyteller": (["Marke, Positionierung, Geschichten", "Markenaufbau für {ind}"], ["Brand & positioning for {ind}", "Storyteller and brand builder"]),
    "ops_operator": (["Operations und Prozesse – {ind}", "Mache aus Chaos Abläufe"], ["Operator for early-stage teams ({ind})", "Ops & process builder"]),
    "finance_lead": (["Finanzen, Fundraising, Unit Economics", "Finanzplanung für {ind}"], ["Finance & fundraising for {ind}", "Former VC analyst, now building"]),
    "strategist": (["Geschäftsmodelle und Strategie – {ind}", "Strategie mit Bodenhaftung"], ["Business model & strategy, {ind}", "Strategy consultant turned founder"]),
    "domain_researcher": (["Forschung und Fachwissen in {ind}", "Kenne {ind} von innen"], ["Domain researcher in {ind}", "Insider knowledge of {ind}"]),
    "community_builder": (["Community-Aufbau und Netzwerke – {ind}", "Bringe Menschen zusammen"], ["Community builder in {ind}", "Building communities that last"]),
    "people_ops": (["People & Organisation für junge Teams", "Teamaufbau in {ind}"], ["People & org design for startups", "Hiring and team building, {ind}"]),
}

INTENT_BUNDLES = [
    dict(commitment="full_time", hours=(38, 50), intent="ready_now", horizon="now", goals=["venture_scale", "profitable_business"]),
    dict(commitment="all_in", hours=(48, 65), intent="ready_now", horizon="now", goals=["venture_scale", "exit_oriented"]),
    dict(commitment="part_time", hours=(15, 30), intent="actively_exploring", horizon="next_3_months", goals=["profitable_business", "venture_scale"]),
    dict(commitment="side_project", hours=(4, 12), intent="actively_exploring", horizon="next_6_months", goals=["side_project", "explore"]),
    dict(commitment="part_time", hours=(18, 28), intent="open_later", horizon="later_or_flexible", goals=["profitable_business", "explore"]),
    dict(commitment="full_time", hours=(35, 45), intent="actively_exploring", horizon="next_3_months", goals=["profitable_business", "venture_scale"]),
]

# ---------------------------------------------------------------------------
# Hilfen
# ---------------------------------------------------------------------------
def pick(seq, k=1):
    return R.sample(seq, k)

def wchoice(pairs):
    tot = sum(w for _, w in pairs)
    x = R.uniform(0, tot)
    for v, w in pairs:
        x -= w
        if x <= 0:
            return v
    return pairs[-1][0]

def surface(table, canon, locale, noise=0.3):
    de, en, var = table[canon]
    if R.random() < noise:
        return R.choice(var + (en if locale == "de" else de))
    return R.choice(de if locale == "de" else en)

def loc_surface(canon, noise=0.3):
    forms = LOC[canon][0]
    return forms[0] if R.random() >= noise else R.choice(forms[1:])

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

# ---------------------------------------------------------------------------
# Latente Person (Referenzschicht) + Produktprofil
# ---------------------------------------------------------------------------
P = {}          # id -> {"raw": ..., "ref": ...}
ORDER = []

def new_id():
    return f"syn-p{len(ORDER) + 1:03d}"

def make_latent(arch, scenario, *, industries=None, bundle=None, location=None, remote=None, own=None, seek=None,
                stage=None, seniority=None, handover_from=None, extra_areas=None, find_active=True, connect_active=None,
                locale=None, noise=0.3, archetype_label=None):
    a = ARCH[arch]
    L = dict(archetype=archetype_label or arch, scenario=scenario)
    L["locale"] = locale or ("de" if R.random() < 0.7 else "en")
    L["industries"] = industries or pick(list(IND), 1 if R.random() < 0.55 else 2)
    b = dict(bundle or R.choice(INTENT_BUNDLES))
    L["bundle"] = b
    L["commitment"] = b["commitment"]
    L["hours"] = R.randint(*b["hours"])
    L["intent"] = b["intent"]
    L["horizon"] = b["horizon"]
    L["goal"] = R.choice(b["goals"])
    L["location"] = location or wchoice([(k, v[1]) for k, v in LOC.items()])
    L["remote"] = remote or wchoice([("hybrid", 35), ("remote", 20), ("flexible", 25), ("onsite", 15)])
    if L["location"] == "anywhere_dach" and L["remote"] == "onsite":
        L["remote"] = "remote"
    L["own"] = list(own or a["own"])
    L["seek"] = list(seek or R.choice(a["seek"]))
    L["seek"] = [r for r in L["seek"] if r not in L["own"]] or ["tech" if "tech" not in L["own"] else "sales"]
    L["stage"] = stage or wchoice([("no_idea_open_to_join", 25), ("exploring_ideas", 25), ("idea_validating", 30), ("already_building", 20)])
    L["seniority"] = seniority or wchoice([("junior", 25), ("mid", 45), ("senior", 30)])
    L["noise"] = noise
    shift = {"junior": -1, "mid": 0, "senior": 1}[L["seniority"]]
    caps = []
    for ar in a["core"] + (extra_areas or []):
        lvl = clamp(R.choice([3, 4, 4, 5]) + shift, 1, 5)
        wish = "own" if R.random() < 0.72 else "contribute"
        caps.append(dict(area_id=ar, application_level=lvl, ownership_wish=wish))
    for ar in R.sample(a["sec"], R.randint(1, len(a["sec"]))):
        if any(c["area_id"] == ar for c in caps):
            continue
        lvl = clamp(R.choice([1, 2, 2, 3, 3, 4]) + shift, 1, 5) if R.random() > 0.12 else None
        wish = wchoice([("contribute", 40), ("grow_into", 25), ("unclear", 12), (None, 13), ("own", 10)])
        caps.append(dict(area_id=ar, application_level=lvl, ownership_wish=wish))
    # Abgeben: Bereiche der gesuchten Rollen
    pool = handover_from or [x for r_ in L["seek"] for x in ROLE_AREAS[r_]]
    for ar in R.sample(pool, min(len(pool), R.randint(1, 3))):
        if any(c["area_id"] == ar for c in caps):
            continue
        caps.append(dict(area_id=ar, application_level=R.choice([None, 1, 2, 2, 3]),
                         ownership_wish=R.choice(["prefer_other", "prefer_other", "prefer_external"])))
    L["caps"] = caps
    L["topics"] = list(dict.fromkeys(R.sample(a["topics"], min(len(a["topics"]), R.randint(1, len(a["topics"]))))))
    L["find_active"] = find_active
    L["connect_active"] = (R.random() < 0.55) if connect_active is None else connect_active
    L["must"] = {}
    L["contradictions"] = []
    if scenario == "normal":
        L["hide_location"] = R.random() < 0.08
        L["hide_remote"] = R.random() < 0.05
        L["hide_industries"] = R.random() < 0.07
        L["hide_expertise"] = R.random() < 0.10
        if R.random() < 0.10:
            L["intent"] = None
        if R.random() < 0.12:
            L["horizon"] = None
    L["designed_cluster"] = None
    L["partners"] = []
    return L

def offers(L):
    return {c["area_id"] for c in L["caps"] if c["ownership_wish"] in ("own", "contribute") and (c["application_level"] or 0) >= 3}

def covers(L):
    """Explizite Ownership: nur 'own', mit Erfahrung >= 3. grow_into zaehlt NIE."""
    return {c["area_id"] for c in L["caps"] if c["ownership_wish"] == "own" and (c["application_level"] or 0) >= 3}

def weak_covers(L):
    return {c["area_id"] for c in L["caps"] if (c["ownership_wish"] == "own" and (c["application_level"] or 0) < 3)
            or (c["ownership_wish"] == "contribute" and (c["application_level"] or 0) >= 3)}

def handovers(L):
    return {c["area_id"] for c in L["caps"] if c["ownership_wish"] in ("prefer_other", "prefer_external")}

def need_areas(L):
    return handovers(L) | set(L["must"].get("requiredCapabilityAreasAny", []))

# ---------------------------------------------------------------------------
# Annotation (kanonische Schicht) – NIE Workstyle, NIE Freitext-Strings
# ---------------------------------------------------------------------------
def find_need_offer(A, B):
    if A.get("sparse"):
        return "unknown"
    role = bool(set(A["seek"]) & set(B["own"]))
    # Nur Bedarf, der in den Rollenbereich von B faellt (oder ausdruecklich verlangt ist)
    domain = {x for r_ in B["own"] for x in ROLE_AREAS[r_]}
    na = (handovers(A) & domain) | set(A["must"].get("requiredCapabilityAreasAny", []))
    area = bool(na & offers(B)) if na else None
    if role and (area or area is None):
        return "strong"
    if role or area:
        return "partial"
    return "none"

def role_comp(A, B):
    ab, ba = bool(set(A["seek"]) & set(B["own"])), bool(set(B["seek"]) & set(A["own"]))
    if ab and ba:
        return "complementary"
    if ab or ba:
        return "partial"
    if set(A["own"]) & set(B["own"]):
        return "overlapping"
    return "none"

def cap_comp(A, B):
    if not A["caps"] or not B["caps"]:
        return "unknown"
    ab = handovers(A) & covers(B)
    ba = handovers(B) & covers(A)
    weak = (handovers(A) & weak_covers(B)) | (handovers(B) & weak_covers(A))
    if ab and ba:
        return "strong"
    if ab or ba or weak:
        return "partial"
    if len(covers(A) & covers(B)) >= 2:
        return "contested"
    return "none"

def context_rel(A_ind, B_ind):
    if not A_ind or not B_ind:
        return "unknown"
    if set(A_ind) & set(B_ind):
        return "same_context"
    if any(frozenset((x, y)) in ADJ for x in A_ind for y in B_ind):
        return "adjacent"
    return "unrelated"

def commit_feas(A, B):
    if A.get("sparse_commit") or B.get("sparse_commit"):
        return "unknown"
    ia, ib = COMMITMENT.index(A["commitment"]), COMMITMENT.index(B["commitment"])
    d = abs(ia - ib)
    ratio = min(A["hours"], B["hours"]) / max(A["hours"], B["hours"])
    flex = A.get("flex") == "would_expand" or B.get("flex") == "would_expand"
    if d <= 1 and ratio >= 0.5:
        return "compatible"
    if d <= 2 and (ratio >= 0.3 or flex):
        return "stretch"
    return "incompatible"

GOAL_GROUP = {"explore": 0, "side_project": 0, "profitable_business": 1, "venture_scale": 2, "exit_oriented": 2}

def intent_comp(A, B):
    if A.get("sparse") or B.get("sparse"):
        return "unknown"
    worst = 0
    if A["intent"] and B["intent"]:
        d = abs(INTENTS.index(A["intent"]) - INTENTS.index(B["intent"]))
        worst = max(worst, 2 if d == 2 else (1 if d == 1 and "open_later" in (A["intent"], B["intent"]) else 0))
    if A["horizon"] and B["horizon"]:
        d = abs(HORIZONS.index(A["horizon"]) - HORIZONS.index(B["horizon"]))
        worst = max(worst, 2 if d == 3 else (1 if d == 2 else 0))
    g = abs(GOAL_GROUP[A["goal"]] - GOAL_GROUP[B["goal"]])
    worst = max(worst, 2 if g == 2 else (1 if g == 1 else 0))
    if A["stage"] == B["stage"] == "already_building":
        worst = max(worst, 1)     # zwei getrennte Vorhaben
    if A["stage"] == B["stage"] == "no_idea_open_to_join":
        worst = max(worst, 1)     # niemand bringt eine Idee mit
    return ["compatible", "partial", "incompatible"][worst]

def hard_find(A, B):
    """Ausdrueckliche Must-haves der einen Seite gegen die kanonischen Daten der anderen."""
    reasons, soft = [], []
    for X, Y, tag in ((A, B, "A"), (B, A, "B")):
        m = X["must"]
        if m.get("requiredRolesAny") and not set(m["requiredRolesAny"]) & set(Y["own"]):
            reasons.append(f"{tag} verlangt Rolle {'/'.join(m['requiredRolesAny'])}")
        if m.get("minimumAvailabilityHoursPerWeek") and Y["hours"] < m["minimumAvailabilityHoursPerWeek"]:
            reasons.append(f"{tag} verlangt mind. {m['minimumAvailabilityHoursPerWeek']} h/Woche, Gegenüber hat {Y['hours']}")
        if m.get("acceptedRemoteModes") and Y["remote"] not in m["acceptedRemoteModes"] and Y["remote"] != "flexible":
            reasons.append(f"{tag} akzeptiert nur {'/'.join(m['acceptedRemoteModes'])}, Gegenüber ist {Y['remote']}")
        if m.get("desiredLocationCanon") and Y["location"] != m["desiredLocationCanon"]:
            reasons.append(f"{tag} verlangt Standort {m['desiredLocationCanon']}, Gegenüber ist {Y['location']}")
        if m.get("acceptedSearchIntents") and Y["intent"] and Y["intent"] not in m["acceptedSearchIntents"]:
            reasons.append(f"{tag} akzeptiert nur Suchstand {'/'.join(m['acceptedSearchIntents'])}")
        if m.get("acceptedStartHorizons") and Y["horizon"] and Y["horizon"] not in m["acceptedStartHorizons"]:
            reasons.append(f"{tag} akzeptiert nur Start {'/'.join(m['acceptedStartHorizons'])}")
        if m.get("requiredExpertiseCanon") and not set(m["requiredExpertiseCanon"]) & set(Y["topics"]):
            reasons.append(f"{tag} verlangt Expertise {m['requiredExpertiseCanon'][0]}")
        if m.get("requiredCapabilityAreasAny") and not set(m["requiredCapabilityAreasAny"]) & offers(Y):
            reasons.append(f"{tag} verlangt einen der Bereiche {', '.join(m['requiredCapabilityAreasAny'])}")
    if A["remote"] == B["remote"] == "onsite" and A["location"] != B["location"]:
        reasons.append(f"beide nur vor Ort, aber {A['location']} vs. {B['location']}")
    elif "onsite" in (A["remote"], B["remote"]) and A["location"] != B["location"] and "remote" in (A["remote"], B["remote"]):
        soft.append("vor Ort vs. remote an verschiedenen Orten")
    return reasons, soft

def completeness(L):
    if L.get("sparse"):
        return "low"
    if L["contradictions"]:
        return "medium" if len(L["contradictions"]) == 1 else "low"
    score = sum([bool(L["caps"]), bool(L["industries"]) and not L.get("hide_industries"), bool(L["intent"]), bool(L["horizon"]),
                 bool(L["topics"]) and not L.get("hide_expertise"), not L.get("hide_location"), not L.get("hide_remote")])
    return "high" if score == 7 else "medium"

def conf(A, B):
    order = ["low", "medium", "high"]
    return order[min(order.index(completeness(A)), order.index(completeness(B)))]

def annotate_find(A, B):
    hard, soft = hard_find(A, B)
    return dict(
        A_to_B_need_offer=find_need_offer(A, B),
        B_to_A_need_offer=find_need_offer(B, A),
        role_complementarity="unknown" if (A.get("sparse") or B.get("sparse")) else role_comp(A, B),
        capability_complementarity=cap_comp(A, B),
        context_relevance=context_rel(A["industries"], B["industries"]),
        commitment_feasibility=commit_feas(A, B),
        intent_compatibility=intent_comp(A, B),
        hard_constraint_conflict="hard" if hard else ("soft" if soft else "none"),
        hard_constraint_reasons=hard + soft,
        data_confidence=conf(A, B),
    )

# CONNECT: auf Ebene konkreter Eintraege
def listing_need_offer(seek, offer):
    if not seek or not offer:
        return "none"
    if seek.get("sparse") or offer.get("sparse"):
        return "unknown"
    tov = set(seek["c_topics"]) & set(offer["c_topics"])
    cat = seek["category"] == offer["category"]
    if tov and cat:
        return "strong"
    if tov:
        return "partial"
    return "none"

def hard_connect(sl, ol):
    reasons = []
    if ol["status"] != "active" or ol["expires_at"] < NOW.isoformat():
        reasons.append(f"Angebot ist nicht aktiv ({ol['status']}, läuft bis {ol['expires_at']})")
    for x, y in ((sl, ol), (ol, sl)):
        if x["geographic_scope"] == "regional" and x.get("remote_mode") == "onsite" and x["c_locations"] and y["c_locations"] \
                and not set(x["c_locations"]) & set(y["c_locations"]):
            reasons.append(f"regional vor Ort ({x['c_locations'][0]}) vs. {y['c_locations'][0]}")
    return reasons

def annotate_connect(A, B, sl, ol, reverse_strength):
    hard = hard_connect(sl, ol)
    ctx = context_rel(sl["c_industries"], ol["c_industries"])
    if ctx == "unknown":
        ctx = "not_specified"
    return dict(
        A_to_B_need_offer=listing_need_offer(sl, ol),
        B_to_A_need_offer=reverse_strength,
        role_complementarity="not_applicable",
        capability_complementarity="not_applicable",
        context_relevance=ctx,
        commitment_feasibility="not_applicable",
        intent_compatibility="not_applicable",
        hard_constraint_conflict="hard" if hard else "none",
        hard_constraint_reasons=hard,
        data_confidence="low" if (sl.get("sparse") or ol.get("sparse")) else conf(A, B),
    )

def reverse_connect_strength(A, B):
    """Bietet A etwas, das B in einem seeking-Eintrag sucht?"""
    best = "none"
    for s in B["listings"]:
        if s["direction"] != "seeking":
            continue
        for o in A["listings"]:
            if o["direction"] == "offering":
                v = listing_need_offer(s, o)
                if v == "strong":
                    return "strong"
                if v == "partial":
                    best = "partial"
        if set(s["c_topics"]) & set(A["topics"]) and best == "none":
            best = "partial"
    return best

# ---------------------------------------------------------------------------
# Konsistenz: Absicht vs. annotierte Dimensionen (verwirft nur Widersprueche)
# ---------------------------------------------------------------------------
def consistent(cls, d, ctx):
    hard = d["hard_constraint_conflict"] == "hard"
    ab, ba = d["A_to_B_need_offer"], d["B_to_A_need_offer"]
    if cls == "insufficient_data":
        return d["data_confidence"] == "low"
    if d["data_confidence"] == "low":
        return False
    if cls == "exclude":
        return hard
    if hard:
        return False
    if ctx == "connect":
        return {"excellent_candidate": ab == "strong" and d["context_relevance"] in ("same_context", "adjacent", "not_specified"),
                "promising": ab in ("strong", "partial"),
                "worth_exploring": ab == "partial",
                "low_relevance": ab == "none",
                "asymmetric": False}[cls]
    strongish = {"strong", "partial"}
    if cls == "excellent_candidate":
        return (ab == ba == "strong" and d["role_complementarity"] == "complementary" and d["context_relevance"] == "same_context"
                and d["commitment_feasibility"] == "compatible" and d["intent_compatibility"] == "compatible")
    if cls == "promising":
        return ((ab == "strong" and ba in strongish) or (ba == "strong" and ab in strongish)) and \
            d["context_relevance"] in ("same_context", "adjacent") and d["commitment_feasibility"] != "incompatible" \
            and d["intent_compatibility"] != "incompatible" and not consistent("excellent_candidate", d, ctx)
    if cls == "worth_exploring":
        # beide Seiten zumindest teilweise, aber nicht im Rahmen von promising/excellent
        return ab in strongish and ba in strongish and not consistent("excellent_candidate", d, ctx) \
            and not consistent("promising", d, ctx)
    if cls == "asymmetric":
        return (ab in strongish and ba == "none") or (ba in strongish and ab == "none")
    if cls == "low_relevance":
        return ab == "none" and ba == "none"
    return False

# ---------------------------------------------------------------------------
# Produktdaten bauen
# ---------------------------------------------------------------------------
def build_raw(pid, L):
    loc = L["locale"]
    nz = L["noise"]
    ind_surf = [surface(IND, c, loc, nz) for c in L["industries"]]
    top_surf = [surface(TOP, t, loc, nz) for t in L["topics"]]
    area_label = {"software_engineering": "Software Engineering", "b2b_sales": "B2B-Vertrieb", "product_management": "Produktmanagement",
                  "fundraising": "Fundraising", "ux_design": "UX-Design", "performance_marketing": "Performance Marketing",
                  "operations": "Operations", "ai_ml": "KI / ML", "community": "Community", "financial_planning": "Finanzplanung"}
    exp = list(top_surf)
    for c in L["caps"]:
        if c["area_id"] in area_label and c["ownership_wish"] in ("own", "contribute") and R.random() < 0.5:
            exp.append(area_label[c["area_id"]])
    exp = list(dict.fromkeys(exp))[:8]
    first = FIRST[(int(pid[-3:]) * 7) % len(FIRST)]
    ind0 = ind_surf[0] if ind_surf else ("Startups" if loc == "en" else "Gründung")
    head = R.choice(HEAD[L["archetype"]][0 if loc == "de" else 1] if L["archetype"] in HEAD else ["Gründungsinteressiert", "Founder-curious"]).format(ind=ind0)
    seekw = ", ".join(ROLE_WORD[loc][r_] for r_ in L["seek"])
    if loc == "de":
        bio = (f"Ich arbeite seit {'wenigen' if L['seniority'] == 'junior' else 'vielen'} Jahren im Bereich {ind0}. "
               f"Gerade {'baue ich schon an einem Vorhaben' if L['stage'] == 'already_building' else 'prüfe ich eine Idee' if L['stage'] == 'idea_validating' else 'sammle ich Ideen' if L['stage'] == 'exploring_ideas' else 'möchte ich in ein bestehendes Vorhaben einsteigen'}. "
               f"Ich suche Menschen mit Stärken in {seekw}.")
    else:
        bio = (f"I've spent {'a few' if L['seniority'] == 'junior' else 'many'} years in {ind0}. "
               f"Right now I'm {'already building something' if L['stage'] == 'already_building' else 'validating an idea' if L['stage'] == 'idea_validating' else 'exploring ideas' if L['stage'] == 'exploring_ideas' else 'looking to join an existing venture'}. "
               f"Looking for people strong in {seekw}.")
    raw = dict(
        id=pid,
        person_core=dict(
            display_name=f"{first} Synth-{pid[-3:]}",
            headline=head[:160],
            bio=bio[:1200],
            location_region=None if L.get("hide_location") else loc_surface(L["location"], nz),
            remote_mode=None if L.get("hide_remote") else L["remote"],
            expertise=[] if L.get("sparse") or L.get("hide_expertise") else exp,
            industries=[] if L.get("sparse") or L.get("hide_industries") else ind_surf,
            capability_disclosure=L.get("disclosure") or wchoice([("private", 30), ("areas", 40), ("areas_depth_on_contact", 30)]),
            photo_visible_to_members=R.random() < 0.4,
            locale=loc,
        ),
        profiles=dict(roles=["founder", "advisor"] if R.random() < 0.08 else ["founder"]),
        capability_entries=[] if L.get("sparse") else [dict(c) for c in L["caps"]],
        find_profile=None,
        connect_profile=None,
        connect_listings=[],
        connect_problems=[],
        person_resources=[],
    )
    if L.get("niche"):
        nt = surface(TOP, L["niche"], loc, 0.2)
        head = f"{nt} – tiefe Fachexpertise, offen für Gründungsteams" if loc == "de" else f"Deep expertise in {nt}, open to founding teams"
        raw["person_core"]["headline"] = head[:160]
    elif L["archetype"] == "generalist":
        raw["person_core"]["headline"] = ("Allround-Profil für frühe Phasen – von Strategie bis Betrieb" if loc == "de"
                                          else "Generalist for early-stage ventures, strategy to operations")
    if L.get("headline_override"):
        raw["person_core"]["headline"] = L["headline_override"]
    if L.get("location_override") is not None:
        raw["person_core"]["location_region"] = L["location_override"]
    if L["find_active"] is not None:
        status = "active" if L["find_active"] else R.choice(["draft", "paused"])
        fp = dict(
            status=status,
            own_roles=L["own"][:3],
            seeking_roles=L["seek"][:3],
            own_role_other=("Regulatorik & Recht" if "other" in L["own"] else None),
            seeking_role_other=("Hardware-Fertigung" if "other" in L["seek"] else None),
            availability_hours_per_week=L["hours"],
            availability_flexibility=L.get("flex"),
            availability_condition=("Mehr Zeit, sobald die Elternzeit endet" if L.get("flex") == "would_expand" and loc == "de"
                                    else "More time once my current contract ends" if L.get("flex") == "would_expand" else None),
            commitment_level=L["commitment"],
            venture_stage=L["stage"],
            venture_goal=L["goal"],
            search_intent=L["intent"],
            start_horizon=L["horizon"],
            recent_step=(None if L.get("sparse") or R.random() < 0.55 else
                         ("Habe zehn Interviews mit möglichen Kundinnen und Kunden geführt." if loc == "de"
                          else "Ran ten interviews with potential customers last month.")),
            must_haves={k: v for k, v in L["must"].items() if k not in ("desiredLocationCanon", "requiredExpertiseCanon")},
            workstyle_discovery_enabled=L.get("ws_consent", R.random() < 0.5),
        )
        raw["find_profile"] = fp
    if L["connect_active"]:
        raw["connect_profile"] = dict(
            status="active",
            network_roles=L.get("network_roles") or (["founder"] if L["stage"] in ("already_building", "idea_validating") else ["aspiring_founder"])
            + (["expert"] if L["seniority"] == "senior" and R.random() < 0.5 else []),
            open_to_formats=R.sample(FORMATS, R.randint(0, 4)),
            network_reach=(None if R.random() < 0.6 else
                           ("Kenne viele Leute aus Kliniken und Krankenkassen in Norddeutschland." if "digital_health" in L["industries"] and loc == "de"
                            else "Gute Kontakte in die Szene rund um " + ind0 + "." if loc == "de" else "Well connected in the " + ind0 + " scene.")),
            contact_note=None if R.random() < 0.7 else ("Am liebsten erst per Nachricht." if loc == "de" else "Message me first, please."),
            suggestable=R.random() < 0.9,
            visibility="members_only",
        )
    if R.random() < 0.2 and not L.get("sparse"):
        raw["person_resources"].append(dict(kind=R.choice(["network", "access", "offer"]),
                                            label=("Zugang zu Pilotkliniken" if loc == "de" else "Intro to pilot customers"),
                                            origin="self", status="confirmed"))
    return raw

LISTING_N = [0]
PROBLEM_N = [0]

def add_listing(pid, direction, category, c_topics, c_industries=None, c_locations=None, scope=None, remote=None, status="active",
                published=None, sparse=False, stage=None):
    L = P[pid]["ref"]
    raw = P[pid]["raw"]
    loc = L["locale"]
    LISTING_N[0] += 1
    lid = f"syn-l{LISTING_N[0]:04d}"
    c_industries = L["industries"][:1] if c_industries is None else c_industries
    c_locations = [L["location"]] if c_locations is None else c_locations
    t0 = surface(TOP, c_topics[0], loc, L["noise"]) if c_topics else ("Unterstützung" if loc == "de" else "Support")
    if loc == "de":
        title = {"seeking": f"Suche Unterstützung: {t0}", "offering": f"Biete {t0}"}[direction]
        summary = (f"{'Wir suchen' if direction == 'seeking' else 'Ich biete'} {t0} für ein Vorhaben im Bereich "
                   f"{surface(IND, c_industries[0], loc, L['noise']) if c_industries else 'Startups'}. Gerne erst ein kurzes Gespräch.")
    else:
        title = {"seeking": f"Looking for help with {t0}", "offering": f"Offering {t0}"}[direction]
        summary = (f"{'We are looking for' if direction == 'seeking' else 'I can offer'} {t0} for a venture in "
                   f"{surface(IND, c_industries[0], loc, L['noise']) if c_industries else 'startups'}. Happy to start with a short call.")
    if sparse:
        title, summary = ("Hilfe gesucht" if loc == "de" else "Need help"), ("Melde dich gern bei mir." if loc == "de" else "Get in touch with me.")
    published = published or (NOW - dt.timedelta(days=R.randint(1, 50)))
    rm = remote if category in ("expertise", "cooperation", "sparring") else None
    if rm is None and category in ("expertise", "cooperation", "sparring") and not sparse:
        rm = R.choice(REMOTE)
    st = stage if category in ("expertise", "cooperation", "investment") else None
    if st is None and category in ("expertise", "cooperation", "investment") and R.random() < 0.6:
        st = R.choice(LISTING_STAGE[:4])
    lst = dict(
        id=lid, direction=direction, category=category,
        title=title[:100], summary=summary[:800],
        topics=[] if sparse else list(dict.fromkeys(surface(TOP, t, loc, L["noise"]) for t in c_topics))[:8],
        industries=[] if sparse else [surface(IND, c, loc, L["noise"]) for c in c_industries][:5],
        locations=[] if sparse else [loc_surface(c, L["noise"]) for c in c_locations][:3],
        geographic_scope=None if sparse else (scope or R.choice(SCOPES)),
        remote_mode=rm, venture_stage=st,
        starts_on=None, ends_on=None,
        status=status, visibility="members_only",
        published_at=published.isoformat(),
        expires_at=(published + dt.timedelta(days=60)).isoformat(),
    )
    raw["connect_listings"].append(lst)
    ref = dict(lst, c_topics=list(c_topics), c_industries=list(c_industries), c_locations=list(c_locations), sparse=sparse)
    L["listings"].append(ref)
    return ref

def add_problem(pid, c_topics, intent):
    L = P[pid]["ref"]
    loc = L["locale"]
    PROBLEM_N[0] += 1
    t0 = surface(TOP, c_topics[0], loc, L["noise"])
    ind = surface(IND, L["industries"][0], loc, L["noise"])
    desc = (f"In {ind} fällt mir immer wieder auf, dass {t0} für kleine Teams kaum bezahlbar und schwer zugänglich ist. "
            f"Ich möchte verstehen, wer das noch erlebt.") if loc == "de" else (
            f"In {ind} I keep seeing that {t0} is hard to access and expensive for small teams. I want to learn who else runs into this.")
    pr = dict(id=f"syn-pr{PROBLEM_N[0]:03d}", title=(f"{t0} ist für kleine Teams zu schwer" if loc == "de" else f"{t0} is too hard for small teams")[:120],
              description=desc[:2000], author_intent=intent,
              locations=[loc_surface(L["location"], L["noise"])], geographic_scope=R.choice(SCOPES),
              topics=[surface(TOP, t, loc, L["noise"]) for t in c_topics][:8],
              industries=[ind], status="active")
    P[pid]["raw"]["connect_problems"].append(pr)
    L["problems"].append(dict(pr, c_topics=c_topics))

def register(L):
    pid = new_id()
    ORDER.append(pid)
    L["id"] = pid
    L["listings"] = []
    L["problems"] = []
    L.setdefault("flex", R.choice([None, None, "fixed", "would_expand"]))
    P[pid] = dict(ref=L, raw=None)
    return pid

def finalize_raw(pid):
    P[pid]["raw"] = build_raw(pid, P[pid]["ref"])

def gen_must(L, density=0.6):
    if L.get("sparse") or R.random() > density:
        return
    m = {}
    if R.random() < 0.6:
        m["requiredRolesAny"] = L["seek"][:]
    if R.random() < 0.35:
        m["minimumAvailabilityHoursPerWeek"] = max(4, int(L["hours"] * R.choice([0.4, 0.5, 0.6])))
    if R.random() < 0.3:
        m["acceptedRemoteModes"] = sorted({L["remote"], "hybrid", "flexible"} if L["remote"] != "remote" else {"remote", "hybrid", "flexible"})
    if R.random() < 0.18 and L["remote"] in ("onsite", "hybrid") and L["location"] != "anywhere_dach":
        m["desiredLocationCanon"] = L["location"]
        m["desiredLocationRegion"] = loc_surface(L["location"], 0.6)
    if R.random() < 0.2 and L["intent"]:
        i = INTENTS.index(L["intent"])
        m["acceptedSearchIntents"] = INTENTS[max(0, i - 1): i + 2]
    if R.random() < 0.15 and L["horizon"]:
        i = HORIZONS.index(L["horizon"])
        m["acceptedStartHorizons"] = HORIZONS[max(0, i - 1): i + 2]
    if R.random() < 0.15 and handovers(L):
        m["requiredCapabilityAreasAny"] = sorted(handovers(L))[:3]
    if R.random() < 0.1:
        t = R.choice(list(TOP)[:19])
        m["requiredExpertiseCanon"] = [t]
        m["requiredExpertiseAny"] = [surface(TOP, t, L["locale"], 0.5)]
    L["must"] = m

BANDS = {"side_project": (4, 12), "part_time": (12, 30), "full_time": (35, 50), "all_in": (48, 65)}

def fit_commitment(L):
    """Stunden und Commitment-Stufe passen zusammen (ausser beim gewollten Widerspruchsfall)."""
    for c in COMMITMENT:
        lo, hi = BANDS[c]
        if lo <= L["hours"] <= hi and not (BANDS[L["commitment"]][0] <= L["hours"] <= BANDS[L["commitment"]][1]):
            L["commitment"] = c
            return
    if L["hours"] > 30 and L["hours"] < 35:
        L["hours"] = 35 if L["commitment"] in ("full_time", "all_in") else 30

def satisfy_musts_of(target, L):
    """L so anpassen, dass es die Must-haves von target erfuellt (fuer gewollt konfliktfreie Paare)."""
    m = target["must"]
    if m.get("requiredRolesAny") and not set(m["requiredRolesAny"]) & set(L["own"]):
        L["own"] = [m["requiredRolesAny"][0]] + [r_ for r_ in L["own"] if r_ != m["requiredRolesAny"][0]][:2]
    if m.get("minimumAvailabilityHoursPerWeek") and L["hours"] < m["minimumAvailabilityHoursPerWeek"]:
        L["hours"] = m["minimumAvailabilityHoursPerWeek"] + R.randint(0, 6)
        fit_commitment(L)
    if m.get("acceptedRemoteModes") and L["remote"] not in m["acceptedRemoteModes"]:
        L["remote"] = R.choice(m["acceptedRemoteModes"])
    if m.get("desiredLocationCanon"):
        L["location"] = m["desiredLocationCanon"]
    if m.get("acceptedSearchIntents") and L["intent"] not in m["acceptedSearchIntents"]:
        L["intent"] = m["acceptedSearchIntents"][0]
    if m.get("acceptedStartHorizons") and L["horizon"] not in m["acceptedStartHorizons"]:
        L["horizon"] = m["acceptedStartHorizons"][0]
    if m.get("requiredCapabilityAreasAny") and not set(m["requiredCapabilityAreasAny"]) & offers(L):
        L["caps"].append(dict(area_id=m["requiredCapabilityAreasAny"][0], application_level=4, ownership_wish="own"))
    if m.get("requiredExpertiseCanon") and not set(m["requiredExpertiseCanon"]) & set(L["topics"]):
        L["topics"] = list(dict.fromkeys(L["topics"] + m["requiredExpertiseCanon"]))
    if target["remote"] == "onsite" and L["remote"] == "onsite":
        L["location"] = target["location"]

def align_logistics(L, T, *, same_industry=True):
    """Gemeinsame Rahmenbedingungen fuer gewollt passende Paare."""
    if same_industry:
        L["industries"] = list(dict.fromkeys([T["industries"][0]] + L["industries"][:1]))[:2]
    b = T["bundle"]
    L["bundle"], L["commitment"], L["intent"], L["horizon"] = b, b["commitment"], b["intent"], b["horizon"]
    L["hours"] = clamp(T["hours"] + R.randint(-6, 6), b["hours"][0], b["hours"][1])
    fit_commitment(L)
    L["goal"] = T["goal"] if R.random() < 0.7 else R.choice(b["goals"])
    if T["remote"] == "onsite" or R.random() < 0.5:
        L["location"] = T["location"]
    if T["stage"] in ("no_idea_open_to_join",):
        L["stage"] = R.choice(["idea_validating", "already_building", "exploring_ideas"])
    elif T["stage"] == "already_building":
        L["stage"] = R.choice(["no_idea_open_to_join", "exploring_ideas"])
    elif L["stage"] == "already_building" and T["stage"] == "already_building":
        L["stage"] = "no_idea_open_to_join"

def complement_caps(L, T, strong=True):
    """L uebernimmt Verantwortung (own, Stufe >=3) fuer Bereiche, die T abgeben will – und gibt ab, was T besitzt."""
    for ar in sorted(handovers(T))[: (3 if strong else 1)]:
        L["caps"] = [c for c in L["caps"] if c["area_id"] != ar]
        L["caps"].append(dict(area_id=ar, application_level=R.choice([3, 4, 5]) if strong else 3,
                              ownership_wish="own" if strong else "contribute"))
    if strong:
        tc = sorted(covers(T))
        if tc:
            for ar in R.sample(tc, min(2, len(tc))):
                if ar not in {c["area_id"] for c in L["caps"]}:
                    L["caps"].append(dict(area_id=ar, application_level=R.choice([None, 1, 2]), ownership_wish="prefer_other"))
                else:
                    for c in L["caps"]:
                        if c["area_id"] == ar:
                            c["ownership_wish"], c["application_level"] = "prefer_other", R.choice([None, 1, 2])

PAIRS = []

def add_pair(a, b, cls, ctx, source, rationale, a_listing=None, b_listing=None):
    PAIRS.append(dict(a=a, b=b, cls=cls, ctx=ctx, source=source, rationale=rationale, a_listing=a_listing, b_listing=b_listing))

def annotate_pair(p):
    A, B = P[p["a"]]["ref"], P[p["b"]]["ref"]
    if p["ctx"] == "find":
        return annotate_find(A, B)
    sl = next(x for x in A["listings"] if x["id"] == p["a_listing"])
    ol = next(x for x in B["listings"] if x["id"] == p["b_listing"])
    return annotate_connect(A, B, sl, ol, reverse_connect_strength(A, B))

def ok_pair(a, b, cls, ctx="find"):
    return consistent(cls, annotate_pair(dict(a=a, b=b, ctx=ctx, a_listing=None, b_listing=None)), ctx)

# ---------------------------------------------------------------------------
# 1) 110 normale Profile (30 frei, 80 mit geplanter Beziehung zu einem frueheren)
# ---------------------------------------------------------------------------
NORMAL = []
arch_keys = list(ARCH)
for i in range(30):
    arch = arch_keys[i % len(arch_keys)] if i < len(arch_keys) else R.choice(arch_keys)
    L = make_latent(arch, "normal", find_active=(True if i < 18 else (None if R.random() < 0.6 else False)))
    gen_must(L)
    NORMAL.append(register(L))

RELS = [("excellent_candidate", 22), ("promising", 18), ("worth_exploring", 14), ("asymmetric", 14), ("low_relevance", 14), ("exclude", 10)]

def try_build_related(cls):
    anchors = [x for x in NORMAL if P[x]["ref"]["find_active"]]
    for _ in range(60):
        j = R.choice(anchors)
        T = P[j]["ref"]
        if cls in ("excellent_candidate", "promising"):
            own = list(T["seek"][:2])
            arch = R.choice(ARCH_OF_ROLE[own[0]] or arch_keys)
            seek = list(T["own"][:1]) + ([R.choice([r_ for r_ in ROLES if r_ not in own + T["own"] and r_ != "other"])] if cls == "promising" and R.random() < 0.5 else [])
            L = make_latent(arch, "normal", own=own, seek=seek, handover_from=sorted(covers(T)) or None)
            align_logistics(L, T, same_industry=(cls == "excellent_candidate" or R.random() < 0.5))
            complement_caps(L, T, strong=(cls == "excellent_candidate"))
            if cls == "promising" and R.random() < 0.5:
                L["commitment"] = COMMITMENT[clamp(COMMITMENT.index(T["commitment"]) + R.choice([-1, 1]), 0, 3)]
                L["bundle"] = next(b for b in INTENT_BUNDLES if b["commitment"] == L["commitment"])
                L["hours"] = R.randint(*L["bundle"]["hours"])
                L["horizon"], L["intent"] = L["bundle"]["horizon"], L["bundle"]["intent"]
        elif cls == "worth_exploring":
            # Rollen ergaenzen sich, aber in unverbundenen Feldern: gegenseitig interessant, ohne gemeinsamen Kontext
            own = [R.choice(T["seek"])]
            arch = R.choice(ARCH_OF_ROLE[own[0]] or arch_keys)
            far = [x for x in IND if x not in T["industries"] and all(frozenset((x, y)) not in ADJ for y in T["industries"])]
            L = make_latent(arch, "normal", own=own, seek=T["own"][:1], industries=[R.choice(far)])
            align_logistics(L, T, same_industry=False)
            L["industries"] = [R.choice(far)]
        elif cls == "asymmetric":
            own = [R.choice([r_ for r_ in ROLES if r_ not in T["seek"] + T["own"] and r_ != "other"])]
            arch = R.choice(ARCH_OF_ROLE[own[0]] or arch_keys)
            L = make_latent(arch, "normal", own=own, seek=T["own"][:1], handover_from=sorted(covers(T)) or None)
            align_logistics(L, T)
            L["caps"] = [c for c in L["caps"] if c["area_id"] not in handovers(T)]
        elif cls == "low_relevance":
            own = T["own"][:1]
            arch = R.choice(ARCH_OF_ROLE[own[0]] or arch_keys)
            far = [x for x in IND if x not in T["industries"] and all(frozenset((x, y)) not in ADJ for y in T["industries"])]
            L = make_latent(arch, "normal", own=own, seek=T["seek"][:], industries=[R.choice(far)])
            L["caps"] = [c for c in L["caps"] if c["area_id"] not in handovers(T)]
        else:  # exclude: fachlich passend, aber eine ausdrueckliche Bedingung verletzt
            own = list(T["seek"][:1])
            arch = R.choice(ARCH_OF_ROLE[own[0]] or arch_keys)
            L = make_latent(arch, "normal", own=own, seek=T["own"][:1])
            align_logistics(L, T)
            complement_caps(L, T)
        L["find_active"] = True
        if cls != "exclude":
            gen_must(L, 0.45)
            if cls in ("excellent_candidate", "promising", "worth_exploring", "asymmetric", "low_relevance"):
                satisfy_musts_of(T, L)
                # eigene Must-haves duerfen T nicht ausschliessen
                L["must"] = {k: v for k, v in L["must"].items()
                             if not (k == "requiredRolesAny" and not set(v) & set(T["own"]))
                             and not (k == "minimumAvailabilityHoursPerWeek" and T["hours"] < v)
                             and not (k == "acceptedRemoteModes" and T["remote"] not in v and T["remote"] != "flexible")
                             and not (k in ("desiredLocationCanon", "desiredLocationRegion") and T["location"] != L["location"])
                             and not (k == "acceptedSearchIntents" and T["intent"] not in v)
                             and not (k == "acceptedStartHorizons" and T["horizon"] not in v)
                             and not (k == "requiredCapabilityAreasAny" and not set(v) & offers(T))
                             and not (k in ("requiredExpertiseCanon", "requiredExpertiseAny") and not set(L["must"].get("requiredExpertiseCanon", [])) & set(T["topics"]))}
                if "desiredLocationRegion" in L["must"] and "desiredLocationCanon" not in L["must"]:
                    L["must"].pop("desiredLocationRegion")
        else:
            kind = R.choice(["hours", "remote", "intent", "location"])
            if kind == "hours" and T["hours"] > 44:
                kind = "intent"
            if kind == "hours":
                L["must"] = {"minimumAvailabilityHoursPerWeek": min(60, T["hours"] + R.randint(8, 20))}
            elif kind == "remote":
                L["remote"] = "onsite" if T["remote"] == "remote" else L["remote"]
                L["must"] = {"acceptedRemoteModes": ["onsite", "hybrid"] if T["remote"] == "remote" else ["remote"]}
                if T["remote"] == "flexible":
                    L["must"] = {"acceptedSearchIntents": [x for x in INTENTS if x != T["intent"]][:1]}
            elif kind == "intent":
                others = [x for x in INTENTS if x != T["intent"]]
                L["must"] = {"acceptedSearchIntents": [others[0]]}
            else:
                other_loc = R.choice([x for x in LOC if x not in (T["location"], "anywhere_dach")])
                L["location"], L["remote"] = other_loc, "onsite"
                L["must"] = {"desiredLocationCanon": other_loc, "desiredLocationRegion": loc_surface(other_loc, 0.5)}
        pid = register(L)
        if ok_pair(pid, j, cls):
            return pid, j
        ORDER.pop()
        del P[pid]
    return None, None

def rel_text(cls, A, B):
    rw = lambda rs: "/".join(ROLE_WORD["de"][r_] for r_ in rs)
    ind = lambda X: ", ".join(X["industries"]) or "–"
    base = f"A ({rw(A['own'])}, sucht {rw(A['seek'])}; {ind(A)}) – B ({rw(B['own'])}, sucht {rw(B['seek'])}; {ind(B)}). "
    return base + {
        "excellent_candidate": "Beide bieten genau, was die andere Seite sucht, und übernehmen gern die Bereiche, die die andere abgeben will. Gleiches Feld, ähnliche Zeit und gleicher Zeitpunkt.",
        "promising": "In einer Richtung passt es klar, in der anderen zumindest teilweise; Kontext und Zeitrahmen sind vereinbar, aber nicht deckungsgleich.",
        "worth_exploring": "Beide finden beim anderen zumindest teilweise, was sie suchen – aber Feld, Zeitrahmen oder Vorhaben passen nicht zusammen. Ein Gespräch kann sich lohnen, ein klarer Treffer ist es nicht.",
        "asymmetric": "A braucht, was B mitbringt – B findet bei A aber nicht, was B sucht.",
        "low_relevance": "Beide bringen dasselbe mit und suchen dasselbe, in unverbundenen Feldern. Kein fachlicher Anlass.",
        "exclude": "Fachlich würde es passen, aber eine ausdrücklich gesetzte Bedingung schließt das Gegenüber aus.",
    }[cls]

for k in range(80):
    if R.random() < 0.28:
        # Nur CONNECT, kein FIND-Profil: eine realistische Nutzungsform
        L = make_latent(R.choice(arch_keys), "normal", find_active=None, connect_active=True)
        NORMAL.append(register(L))
        continue
    cls = wchoice(RELS)
    pid, j = try_build_related(cls)
    if pid:
        NORMAL.append(pid)
        add_pair(pid, j, cls, "find", "designed_normal_relation", rel_text(cls, P[pid]["ref"], P[j]["ref"]))
    else:
        L = make_latent(R.choice(arch_keys), "normal", find_active=R.random() < 0.7)
        gen_must(L)
        NORMAL.append(register(L))
assert len(NORMAL) == 110, len(NORMAL)

# ---------------------------------------------------------------------------
# 2) 30 komplementaere Profile = 10 Match-Cluster zu je 3
# ---------------------------------------------------------------------------
CLUSTER_ROLES = [("tech", "sales", "finance"), ("product", "tech", "growth"), ("research", "sales", "operations"),
                 ("tech", "finance", "sales"), ("design", "tech", "marketing"), ("strategy", "tech", "community"),
                 ("tech", "product", "sales"), ("operations", "tech", "marketing"), ("community", "tech", "finance"),
                 ("finance", "product", "tech")]
CLUSTER_IND = ["digital_health", "climate_energy", "education", "deep_tech", "consumer", "social_impact", "saas_b2b",
               "food_agri", "creative_media", "fintech"]
CLUSTER_ARCH = {"tech": "tech_builder", "sales": "sales_bd", "finance": "finance_lead", "product": "product_lead", "growth": "growth_marketer",
                "research": "domain_researcher", "operations": "ops_operator", "design": "designer", "marketing": "brand_storyteller",
                "strategy": "strategist", "community": "community_builder"}
COMP = []
for ci, roles in enumerate(CLUSTER_ROLES):
    ind = CLUSTER_IND[ci]
    bundle = R.choice(INTENT_BUNDLES[:3] + INTENT_BUNDLES[5:])
    loc = wchoice([(k, v[1]) for k, v in LOC.items() if k != "anywhere_dach"])
    remote = R.choice(["hybrid", "flexible", "remote"])
    stretch_member = 2 if ci in (1, 4, 7) else None
    members = []
    for mi, role in enumerate(roles):
        others = [r_ for r_ in roles if r_ != role]
        b = bundle
        if mi == stretch_member:
            b = dict(bundle, commitment="part_time", hours=(12, 14)) if bundle["commitment"] in ("full_time", "all_in") \
                else dict(bundle, commitment="side_project", hours=(5, 8))
        L = make_latent(CLUSTER_ARCH[role], "complementary_cluster", industries=[ind], bundle=b, location=loc, remote=remote,
                        own=[role], seek=others, stage=["idea_validating", "no_idea_open_to_join", "exploring_ideas"][mi],
                        handover_from=[x for r_ in others for x in ARCH[CLUSTER_ARCH[r_]]["core"]], find_active=True,
                        connect_active=R.random() < 0.6)
        L["intent"], L["horizon"] = bundle["intent"], bundle["horizon"]
        L["goal"] = bundle["goals"][0]
        L["designed_cluster"] = f"cluster-{ci + 1:02d}"
        if mi == stretch_member:
            L["flex"] = "would_expand"
        members.append(register(L))
    # Kernbereiche gegenseitig: jede besitzt ihre Kernbereiche mit Stufe >= 3
    for m in members:
        for c in P[m]["ref"]["caps"]:
            if c["area_id"] in ARCH[CLUSTER_ARCH[P[m]["ref"]["own"][0]]]["core"]:
                c["ownership_wish"], c["application_level"] = "own", max(3, c["application_level"] or 3)
    COMP += members
    for x in range(3):
        for y in range(x + 1, 3):
            a, b = members[x], members[y]
            stretch = stretch_member in (x, y)
            cls = "promising" if stretch else "excellent_candidate"
            text = (f"Konstruierter Match-Cluster {ci + 1} ({ind}): drei Rollen ({', '.join(roles)}), die sich gegenseitig suchen und "
                    f"die Bereiche der anderen abgeben wollen. Gleiche Branche, gleicher Suchstand." +
                    (" Eine Person ist eine Commitment-Stufe darunter – deshalb nur promising." if stretch else ""))
            add_pair(a, b, cls, "find", "designed_cluster", text)

# ---------------------------------------------------------------------------
# 3) 15 asymmetrische Faelle
# ---------------------------------------------------------------------------
ASYM = []
cands = [x for x in NORMAL if P[x]["ref"]["find_active"] and not P[x]["ref"]["must"].get("requiredRolesAny")
         and not P[x]["ref"]["must"].get("requiredCapabilityAreasAny")]
R.shuffle(cands)
for T_id in cands:
    if len(ASYM) == 15:
        break
    T = P[T_id]["ref"]
    for _ in range(25):
        own = [R.choice([r_ for r_ in ROLES if r_ not in T["seek"] + T["own"] and r_ != "other"])]
        L = make_latent(R.choice(ARCH_OF_ROLE[own[0]] or arch_keys), "asymmetric", own=own, seek=T["own"][:1],
                        handover_from=sorted(covers(T)) or None, find_active=True)
        align_logistics(L, T)
        L["caps"] = [c for c in L["caps"] if c["area_id"] not in handovers(T)]
        satisfy_musts_of(T, L)
        if set(T["seek"]) & set(L["own"]):
            continue
        pid = register(L)
        if ok_pair(pid, T_id, "asymmetric"):
            ASYM.append(pid)
            L["partners"].append(T_id)
            add_pair(pid, T_id, "asymmetric", "find", "designed_asymmetric",
                     f"Konstruiert einseitig: A sucht {ROLE_WORD['de'][T['own'][0]]} und will genau die Bereiche abgeben, die B besitzt. "
                     f"B sucht {', '.join(ROLE_WORD['de'][r_] for r_ in T['seek'])} – das bringt A nicht mit.")
            break
        ORDER.pop()
        del P[pid]
assert len(ASYM) == 15, len(ASYM)

# ---------------------------------------------------------------------------
# 4) 15 Constraint-Konflikte: fachlich stark, eine harte Bedingung kollidiert
# ---------------------------------------------------------------------------
CONF = []
targets = [x for x in NORMAL + COMP if P[x]["ref"]["find_active"]]
R.shuffle(targets)
KINDS = ["hours", "remote", "location_onsite", "intent", "horizon", "role"] * 3
for T_id in targets:
    if len(CONF) == 15:
        break
    T = P[T_id]["ref"]
    kind = KINDS[len(CONF)]
    if kind == "hours" and T["hours"] > 44:
        continue
    own = T["seek"][:1]
    L = make_latent(R.choice(ARCH_OF_ROLE[own[0]] or arch_keys), "constraint_conflict", own=own, seek=T["own"][:1],
                    handover_from=sorted(covers(T)) or None, find_active=True)
    align_logistics(L, T)
    complement_caps(L, T)
    satisfy_musts_of(T, L)
    if kind == "hours":
        L["must"] = {"minimumAvailabilityHoursPerWeek": min(60, T["hours"] + R.randint(10, 25))}
        why = f"A verlangt mindestens {L['must']['minimumAvailabilityHoursPerWeek']} h/Woche; B hat {T['hours']} h."
    elif kind == "remote":
        if T["remote"] == "flexible":
            continue
        L["must"] = {"acceptedRemoteModes": ["onsite", "hybrid"] if T["remote"] == "remote" else ["remote"]}
        why = f"A akzeptiert nur {'/'.join(L['must']['acceptedRemoteModes'])}; B arbeitet {T['remote']}."
    elif kind == "location_onsite":
        if T["remote"] != "onsite":
            continue
        L["remote"] = "onsite"
        L["location"] = R.choice([x for x in LOC if x not in (T["location"], "anywhere_dach")])
        L["must"] = {}
        why = f"Beide arbeiten nur vor Ort – A in {L['location']}, B in {T['location']}."
    elif kind == "intent":
        L["must"] = {"acceptedSearchIntents": [x for x in INTENTS if x != T["intent"]][:1]}
        why = f"A sucht nur Personen mit Suchstand {L['must']['acceptedSearchIntents'][0]}; B ist {T['intent']}."
    elif kind == "horizon":
        L["must"] = {"acceptedStartHorizons": [x for x in HORIZONS if x != T["horizon"]][:1]}
        why = f"A will nur Start {L['must']['acceptedStartHorizons'][0]}; B plant {T['horizon']}."
    else:
        need = R.choice([r_ for r_ in ROLES if r_ not in T["own"] and r_ != "other"])
        L["must"] = {"requiredRolesAny": [need]}
        L["seek"] = list(dict.fromkeys([need] + L["seek"]))[:3]
        why = f"A verlangt die Rolle {ROLE_WORD['de'][need]}; B bringt {ROLE_WORD['de'][T['own'][0]]} mit."
    pid = register(L)
    if ok_pair(pid, T_id, "exclude"):
        CONF.append(pid)
        L["partners"].append(T_id)
        L["conflict_kind"] = kind
        add_pair(pid, T_id, "exclude", "find", "designed_constraint_conflict",
                 "Fachlich konstruiert als Ergänzung (A deckt die Bereiche ab, die B abgeben will). Aber: " + why)
    else:
        ORDER.pop()
        del P[pid]
if len(CONF) < 15:
    # Auffuellen mit Stunden-Konflikten, die immer konstruierbar sind
    for T_id in targets:
        if len(CONF) == 15:
            break
        T = P[T_id]["ref"]
        if T["hours"] > 44:
            continue
        own = T["seek"][:1]
        L = make_latent(R.choice(ARCH_OF_ROLE[own[0]] or arch_keys), "constraint_conflict", own=own, seek=T["own"][:1], find_active=True)
        align_logistics(L, T)
        complement_caps(L, T)
        L["must"] = {"minimumAvailabilityHoursPerWeek": T["hours"] + 15}
        pid = register(L)
        if ok_pair(pid, T_id, "exclude"):
            CONF.append(pid)
            L["conflict_kind"] = "hours"
            L["partners"].append(T_id)
            add_pair(pid, T_id, "exclude", "find", "designed_constraint_conflict",
                     f"Fachlich ergänzend, aber A verlangt mindestens {T['hours'] + 15} h/Woche; B hat {T['hours']} h.")
        else:
            ORDER.pop()
            del P[pid]
assert len(CONF) == 15, len(CONF)

# ---------------------------------------------------------------------------
# 5) 10 Sparse, 5 Generalisten, 5 Spezialisten, 10 Noise
# ---------------------------------------------------------------------------
SPARSE = []
for i in range(10):
    L = make_latent(R.choice(arch_keys), "sparse", find_active=(i < 6), connect_active=(i >= 6) or R.random() < 0.3)
    L["sparse"] = True
    L["caps"], L["topics"], L["industries"] = [], [], []
    L["intent"], L["horizon"] = None, None
    L["flex"] = None
    L["must"] = {}
    L["hide_location"] = R.random() < 0.6
    L["hide_remote"] = R.random() < 0.5
    L["disclosure"] = "private"
    SPARSE.append(register(L))

GEN = []
for i in range(5):
    own = R.sample(["product", "operations", "strategy", "marketing", "sales", "community"], 3)
    L = make_latent("strategist", "generalist", own=own, seek=["tech"], find_active=True, archetype_label="generalist")
    wide = R.sample([a for a in AREAS if a not in ("other",)], 13)
    L["caps"] = [dict(area_id=a, application_level=R.choice([2, 2, 3, None]), ownership_wish=R.choice(["contribute", "contribute", "grow_into", "unclear"]))
                 for a in wide] + [dict(area_id=R.choice(ROLE_AREAS[own[0]]), application_level=3, ownership_wish="own")]
    L["caps"] = list({c["area_id"]: c for c in L["caps"]}.values())
    L["caps"] += [dict(area_id=a, application_level=None, ownership_wish="prefer_other")
                  for a in ["software_engineering", "technical_architecture"] if a not in {c["area_id"] for c in L["caps"]}]
    L["industries"] = R.sample(list(IND), 2)
    L["topics"] = R.sample(list(TOP)[:19], 5)
    GEN.append(register(L))

SPEC = []
for i, niche in enumerate(NICHE):
    L = make_latent("domain_researcher", "specialist", industries=[NICHE_IND[niche]], seek=["sales"] if i % 2 else ["tech"],
                    find_active=R.random() < 0.6, connect_active=True, seniority="senior", archetype_label="niche_specialist")
    L["own"] = ["research"] if niche in ("soil_science", "quantum_sensing", "battery_chemistry") else ["other"]
    L["caps"] = [dict(area_id=a, application_level=5, ownership_wish="own") for a in NICHE_AREAS[niche]] + \
                [dict(area_id=R.choice([x for x in ["b2b_sales", "fundraising", "marketing_brand"] if x not in NICHE_AREAS[niche]]),
                      application_level=None, ownership_wish="prefer_other")]
    L["topics"] = [niche]
    L["niche"] = niche
    SPEC.append(register(L))

NOISE = []
noise_targets = [x for x in NORMAL if P[x]["ref"]["find_active"] and not P[x]["ref"]["must"]]
R.shuffle(noise_targets)
contradictions = [
    ("commitment_hours", "commitment all_in, aber nur 6 h/Woche"),
    ("onsite_remote_text", "remote_mode onsite, Standort lautet 'Remote / überall'"),
    ("headline_role", "Headline 'CTO', own_roles nur marketing"),
    ("stage_bio", "venture_stage no_idea_open_to_join, Bio beschreibt ein laufendes Unternehmen"),
]
for i in range(10):
    T_id = noise_targets[i]
    T = P[T_id]["ref"]
    own = T["seek"][:1]
    L = make_latent(R.choice(ARCH_OF_ROLE[own[0]] or arch_keys), "noise_edge", own=own, seek=T["own"][:1],
                    handover_from=sorted(covers(T)) or None, find_active=True,
                    locale=("en" if T["locale"] == "de" else "de"), noise=0.95)
    align_logistics(L, T)
    complement_caps(L, T)
    satisfy_musts_of(T, L)
    L["topics"] = list(dict.fromkeys(T["topics"] + L["topics"]))[:3]
    if i >= 6:
        kind, txt = contradictions[i - 6]
        L["contradictions"] = [txt, "zweite Unstimmigkeit"] if i == 9 else [txt]
        if kind == "commitment_hours":
            L["commitment"], L["hours"] = "all_in", 6
        elif kind == "onsite_remote_text":
            L["remote"], L["location_override"] = "onsite", "Remote / überall"
        elif kind == "headline_role":
            L["headline_override"] = "CTO & Co-Founder"
            L["own"] = ["marketing"]
        else:
            L["stage"] = "no_idea_open_to_join"
    NOISE.append(register(L))
    L["partners"].append(T_id)

# ---------------------------------------------------------------------------
# 6) Rohdaten bauen, CONNECT-Eintraege und Probleme
# ---------------------------------------------------------------------------
for pid in ORDER:
    finalize_raw(pid)

def base_listings(pid):
    L = P[pid]["ref"]
    if not L["connect_active"] or L.get("sparse") or L["scenario"] == "specialist":
        return
    n = wchoice([(0, 25), (1, 40), (2, 25), (3, 10)])
    for _ in range(n):
        if len(L["listings"]) >= 3:
            break
        if R.random() < 0.5:
            t = R.choice([x for x in TOP if x not in NICHE])
            add_listing(pid, "seeking", R.choice(["expertise", "cooperation", "sparring", "investment"]), [t])
        else:
            add_listing(pid, "offering", R.choice(["expertise", "sparring", "cooperation"]), L["topics"][:2] or [R.choice(list(TOP)[:19])])
    if R.random() < 0.18 and L["topics"]:
        add_problem(pid, L["topics"][:1], R.choice(AUTHOR_INTENT))

for pid in ORDER:
    base_listings(pid)

# Statusvielfalt
for pid in ORDER:
    for lst in P[pid]["ref"]["listings"]:
        if R.random() < 0.12:
            st = R.choice(["paused", "draft", "completed"])
            lst["status"] = st
            next(x for x in P[pid]["raw"]["connect_listings"] if x["id"] == lst["id"])["status"] = st

connect_ids = [x for x in ORDER if P[x]["ref"]["connect_active"] and not P[x]["ref"].get("sparse") and x not in SPEC]

def room(pid):
    return len(P[pid]["ref"]["listings"]) < 3

def designed_connect(cls, n):
    made = 0
    tries = 0
    while made < n and tries < 400:
        tries += 1
        a, b = R.sample(connect_ids, 2)
        if not (room(a) and room(b)):
            continue
        A, B = P[a]["ref"], P[b]["ref"]
        topic = R.choice([x for x in TOP if x not in NICHE])
        cat = R.choice(["expertise", "sparring", "cooperation"])
        ind = A["industries"][:1]
        loc_a, loc_b = [A["location"]], [B["location"]]
        if cls == "excellent_candidate":
            sl = add_listing(a, "seeking", cat, [topic], ind, loc_a, scope="germany", remote="flexible")
            ol = add_listing(b, "offering", cat, [topic], ind, loc_b, scope="germany", remote="flexible")
            why = f"A sucht {topic} ({cat}), B bietet genau das in derselben Kategorie und Branche; überregional/remote-fähig."
        elif cls == "promising":
            other_cat = R.choice([c for c in ["expertise", "sparring", "cooperation"] if c != cat])
            sl = add_listing(a, "seeking", cat, [topic], ind, loc_a, scope="germany", remote="remote")
            ol = add_listing(b, "offering", other_cat, [topic], [R.choice(list(IND))], loc_b, scope="europe", remote="flexible")
            why = f"Gleiches Thema ({topic}), aber B bietet es als {other_cat} statt {cat} an – passt teilweise."
        elif cls == "low_relevance":
            t2 = R.choice([x for x in TOP if x not in NICHE and x != topic])
            sl = add_listing(a, "seeking", cat, [topic], ind, loc_a)
            ol = add_listing(b, "offering", cat, [t2], None, loc_b)
            why = f"A sucht {topic}, B bietet {t2} – kein inhaltlicher Bezug."
        else:  # exclude
            if R.random() < 0.5:
                l2 = R.choice([x for x in LOC if x not in (A["location"], B["location"], "anywhere_dach")])
                sl = add_listing(a, "seeking", "expertise", [topic], ind, [A["location"]], scope="regional", remote="onsite")
                ol = add_listing(b, "offering", "expertise", [topic], ind, [l2], scope="regional", remote="onsite")
                why = f"Inhaltlich passend ({topic}), aber beide Einträge sind regional vor Ort an verschiedenen Orten."
            else:
                sl = add_listing(a, "seeking", cat, [topic], ind, loc_a, scope="germany", remote="flexible")
                pub = NOW - dt.timedelta(days=75)
                ol = add_listing(b, "offering", cat, [topic], ind, loc_b, scope="germany", remote="flexible", published=pub)
                why = f"Inhaltlich passend ({topic}), aber B's Angebot ist seit {(pub + dt.timedelta(days=60)).isoformat()} abgelaufen."
        p = dict(a=a, b=b, ctx="connect", a_listing=sl["id"], b_listing=ol["id"])
        if consistent(cls, annotate_pair(p), "connect"):
            add_pair(a, b, cls, "connect", "designed_connect_listing", why, sl["id"], ol["id"])
            made += 1
        else:
            for pid_, lid in ((a, sl["id"]), (b, ol["id"])):
                P[pid_]["ref"]["listings"] = [x for x in P[pid_]["ref"]["listings"] if x["id"] != lid]
                P[pid_]["raw"]["connect_listings"] = [x for x in P[pid_]["raw"]["connect_listings"] if x["id"] != lid]
    return made

designed_connect("excellent_candidate", 28)
designed_connect("promising", 24)
designed_connect("low_relevance", 26)
designed_connect("exclude", 14)

# Spezialistinnen: je ein Nischenangebot + passende Suche bei einer anderen Person
for sid in SPEC:
    S = P[sid]["ref"]
    niche = S["niche"]
    ol = add_listing(sid, "offering", "expertise", [niche], [NICHE_IND[niche]], [S["location"]], scope="global", remote="remote")
    seekers = [x for x in connect_ids if room(x) and completeness(P[x]["ref"]) != "low" and NICHE_IND[niche] in P[x]["ref"]["industries"]] or \
              [x for x in connect_ids if room(x) and completeness(P[x]["ref"]) != "low"]
    t = R.choice(seekers)
    sl = add_listing(t, "seeking", "expertise", [niche], [NICHE_IND[niche]], [P[t]["ref"]["location"]], scope="germany", remote="flexible")
    add_pair(t, sid, "excellent_candidate", "connect", "designed_specialist",
             f"Nische: A sucht ausdrücklich {niche}; B ist eine der wenigen mit tiefer, eigener Erfahrung genau darin (Stufe 5, own).", sl["id"], ol["id"])
    others = [x for x in connect_ids if x not in SPEC and x != t and any(l_["direction"] == "seeking" and not set(l_["c_topics"]) & {niche}
                                                                          for l_ in P[x]["ref"]["listings"])]
    for o in R.sample(others, 3):
        sl2 = next(l_ for l_ in P[o]["ref"]["listings"] if l_["direction"] == "seeking" and niche not in l_["c_topics"])
        p = dict(a=o, b=sid, ctx="connect", a_listing=sl2["id"], b_listing=ol["id"])
        if consistent("low_relevance", annotate_pair(p), "connect"):
            add_pair(o, sid, "low_relevance", "connect", "designed_specialist",
                     f"A sucht {', '.join(sl2['c_topics'])}; B ist hochspezialisiert auf {niche}. Tiefe ohne Bezug ist kein Treffer.",
                     sl2["id"], ol["id"])

# Sparse CONNECT-Eintraege
for sid in SPARSE:
    S = P[sid]["ref"]
    if S["connect_active"]:
        add_listing(sid, "seeking", R.choice(["expertise", "sparring"]), [], [], [], sparse=True)

for pid in ORDER:
    for lst in P[pid]["raw"]["connect_listings"]:
        assert lst["id"].startswith("syn-l")

# ---------------------------------------------------------------------------
# 7) Weitere FIND-Paare aus den Sondergruppen
# ---------------------------------------------------------------------------
in_find_pair = {x for p in PAIRS if p["ctx"] == "find" for x in (p["a"], p["b"])} | set(NOISE) | {P[n]["ref"]["partners"][0] for n in NOISE}
_free = [x for x in ORDER if x not in in_find_pair and P[x]["ref"]["scenario"] in ("normal", "specialist") and P[x]["ref"]["find_active"]]
R.shuffle(_free)
for x in _free[:max(0, len(_free) - 8)]:
    L = P[x]["ref"]
    if R.random() < 0.65:
        L["find_active"] = None
        P[x]["raw"]["find_profile"] = None
    else:
        L["find_active"] = False
        P[x]["raw"]["find_profile"]["status"] = R.choice(["draft", "paused"])
find_active = [x for x in ORDER if P[x]["ref"]["find_active"] and not P[x]["ref"].get("sparse")]

# Konflikt-Profile auch gegen eine passende Person (zeigt: nicht global schlecht)
for cid in CONF:
    C = P[cid]["ref"]
    for o in R.sample(find_active, len(find_active)):
        if o in (cid, *C["partners"]):
            continue
        if ok_pair(cid, o, "promising"):
            add_pair(cid, o, "promising", "find", "designed_constraint_counterpart",
                     "Dasselbe Konfliktprofil passt hier: Die harte Bedingung von A ist bei B erfüllt, und beide ergänzen sich zumindest in einer Richtung klar.")
            break

for sid in SPARSE:
    S = P[sid]["ref"]
    pool = [x for x in find_active if x != sid]
    if S["find_active"]:
        for o in R.sample(pool, 4):
            add_pair(sid, o, "insufficient_data", "find", "designed_sparse",
                     "A hat nur die Pflichtfelder: keine Bereiche, keine Branche, keinen Suchstand. Eine fachliche Einschätzung ist nicht möglich.")
    else:
        sl = next((l_ for l_ in S["listings"]), None)
        offers_ = [(x, l_) for x in connect_ids for l_ in P[x]["ref"]["listings"] if l_["direction"] == "offering" and l_["status"] == "active"]
        if sl:
            for x, l_ in R.sample(offers_, 4):
                add_pair(sid, x, "insufficient_data", "connect", "designed_sparse",
                         "Der Sucheintrag von A hat weder Themen noch Branche noch Ort ('Hilfe gesucht'). Ohne Inhalt keine Einschätzung.",
                         sl["id"], l_["id"])

for gid in GEN:
    made = {"worth_exploring": 0, "low_relevance": 0, "promising": 0}
    for o in R.sample(find_active, len(find_active)):
        if o == gid:
            continue
        for cls in ("promising", "worth_exploring", "low_relevance"):
            if made[cls] < (1 if cls == "promising" else 2) and ok_pair(gid, o, cls):
                txt = {"promising": "Breites Profil trifft auf jemanden, der genau die eine eigene Stärke von A sucht und Technik mitbringt.",
                       "worth_exploring": "Beide finden beim anderen etwas, aber nur teilweise: A ist breit ohne Tiefe, und Feld oder Zeitrahmen passen nicht ganz.",
                       "low_relevance": "A ist breit, aber ohne Tiefe dort, wo B sucht; B bringt nicht mit, was A sucht."}[cls]
                add_pair(gid, o, cls, "find", "designed_generalist", txt)
                made[cls] += 1
                break
        if all(v >= (1 if k == "promising" else 2) for k, v in made.items()):
            break

for nid in NOISE:
    N = P[nid]["ref"]
    T_id = N["partners"][0]
    if N["contradictions"]:
        cls = "insufficient_data" if len(N["contradictions"]) > 1 else "worth_exploring"
    else:
        cls = "excellent_candidate"
    if not ok_pair(nid, T_id, cls):
        cls = "promising" if ok_pair(nid, T_id, "promising") else ("worth_exploring" if ok_pair(nid, T_id, "worth_exploring") else None)
    if cls:
        add_pair(nid, T_id, cls, "find", "designed_noise",
                 ("Fachlich als Ergänzung gebaut, aber in der anderen Sprache und mit Synonymen/Schreibvarianten erfasst – "
                  "kaum ein Begriff stimmt wörtlich überein." if not N["contradictions"] else
                  "Ergänzung, aber das Profil von A widerspricht sich selbst (" + "; ".join(N["contradictions"]) + "). Daten nur eingeschränkt belastbar."))

# Kontrastpaare (gezielt ausgewaehlt): gleiche Rolle, unverbundene Felder -> low_relevance; harte Konflikte unter Normalen -> exclude
def contrast(cls, n, pool, text):
    made, tries = 0, 0
    seen = {(p["a"], p["b"]) for p in PAIRS} | {(p["b"], p["a"]) for p in PAIRS}
    while made < n and tries < 6000:
        tries += 1
        a, b = R.sample(pool, 2)
        if (a, b) in seen:
            continue
        if ok_pair(a, b, cls):
            add_pair(a, b, cls, "find", "contrast_selection", text(P[a]["ref"], P[b]["ref"]))
            seen |= {(a, b), (b, a)}
            made += 1
    return made

contrast("low_relevance", 35, find_active, lambda A, B: rel_text("low_relevance", A, B).split(". ")[0] + ". Keine Seite sucht, was die andere mitbringt.")
contrast("exclude", 25, find_active, lambda A, B: "Ausgewählt als Ausschluss: " + "; ".join(hard_find(A, B)[0]) + ".")
contrast("promising", 25, find_active, lambda A, B: rel_text("promising", A, B))
contrast("worth_exploring", 35, find_active, lambda A, B: rel_text("worth_exploring", A, B))
contrast("asymmetric", 15, find_active, lambda A, B: rel_text("asymmetric", A, B) if find_need_offer(A, B) != "none" else
         rel_text("asymmetric", B, A).replace("A braucht", "B braucht").replace("B findet bei A", "A findet bei B"))

# ---------------------------------------------------------------------------
# 8) Endgueltige Annotation + Konsistenz
# ---------------------------------------------------------------------------
final_pairs, dropped = [], []
seen = set()
for p in PAIRS:
    key = tuple(sorted((p["a"], p["b"]))) + (p["ctx"], p.get("a_listing"), p.get("b_listing"))
    if key in seen:
        continue
    seen.add(key)
    d = annotate_pair(p)
    if not consistent(p["cls"], d, p["ctx"]):
        dropped.append((p, d))
        continue
    final_pairs.append((p, d))

# ---------------------------------------------------------------------------
# 9) Workstyle (getrennter Strom, nie in Klassen/Dimensionen gelesen)
# ---------------------------------------------------------------------------
workstyle = {}
for pid in ORDER:
    tend = {area: RW.uniform(1.6, 4.4) for area in ("EVI", "EXP", "EL", "VOICE", "AMB", "ORG")}
    ans = {}
    for it in CORE_ITEMS:
        if RW.random() < 0.03:
            ans[it["item_key"]] = dict(value=None, missing_code="cannot_assess")
            continue
        mu = tend[it["area_key"]]
        if it["response_format"] == "comparative":
            x = mu + RW.gauss(0, 0.9)
            opt = "strong_a" if x < 2 else "lean_a" if x < 3 else "lean_b" if x < 4 else "strong_b"
            ans[it["item_key"]] = dict(value={"optionId": opt}, missing_code=None)
        else:
            ans[it["item_key"]] = dict(value={"scale": int(clamp(round(mu + RW.gauss(0, 0.8)), 1, 5))}, missing_code=None)
    workstyle[pid] = dict(instrument_id="founder-workstyle-pretest-8-5a-v3", manifest_version="3.0.0",
                          item_version="8.4-v0.4", answers=ans)

# ---------------------------------------------------------------------------
# 10) Ausgabe
# ---------------------------------------------------------------------------
def strip_ref(L):
    return dict(
        primary_scenario=L["scenario"],
        synthetic_archetype=L["archetype"],
        designed_match_cluster=L["designed_cluster"],
        designed_partners=L["partners"],
        canonical_industries=L["industries"],
        canonical_topics=L["topics"],
        canonical_location=L["location"],
        canonical_capabilities=dict(
            covers_own_level3plus=sorted(covers(L)),
            offers_own_or_contribute_level3plus=sorted(offers(L)),
            hands_over=sorted(handovers(L)),
            grow_into=sorted(c["area_id"] for c in L["caps"] if c["ownership_wish"] == "grow_into"),
        ),
        canonical_own_roles=L["own"], canonical_seeking_roles=L["seek"],
        canonical_listings=[dict(id=x["id"], direction=x["direction"], category=x["category"], topics=x["c_topics"],
                                 industries=x["c_industries"], locations=x["c_locations"]) for x in L["listings"]],
        canonical_problems=[dict(id=x["id"], topics=x["c_topics"]) for x in L["problems"]],
        known_constraints={k: v for k, v in L["must"].items() if k not in ("desiredLocationRegion",)},
        conflict_kind=L.get("conflict_kind"),
        niche=L.get("niche"),
        contradictions=L["contradictions"],
        data_completeness=completeness(L),
        surface_noise_level=L["noise"],
        locale=L["locale"],
    )

profiles = [P[pid]["raw"] for pid in ORDER]
annotations = {pid: strip_ref(P[pid]["ref"]) for pid in ORDER}

def raw_overlap(a, b):
    ra, rb = P[a]["raw"]["person_core"], P[b]["raw"]["person_core"]
    sa = {x.lower().strip() for x in ra["industries"] + ra["expertise"]}
    sb = {x.lower().strip() for x in rb["industries"] + rb["expertise"]}
    return sorted(sa & sb)

pairs_out = []
for n, (p, d) in enumerate(final_pairs, 1):
    pairs_out.append(dict(
        pair_id=f"syn-pair{n:04d}", context=p["ctx"], a=p["a"], b=p["b"],
        a_listing=p.get("a_listing"), b_listing=p.get("b_listing"),
        reference_class=p["cls"], source=p["source"],
        dimensions={k: v for k, v in d.items() if k != "hard_constraint_reasons"},
        hard_constraint_reasons=d["hard_constraint_reasons"],
        rationale=p["rationale"],
        diagnostic_raw_string_overlap=raw_overlap(p["a"], p["b"]),
    ))

meta = dict(generated_on=NOW.isoformat(), seed_profiles=20261013, seed_workstyle=9029,
            note="Vollständig synthetisch. Keine echten Personen, E-Mails oder IDs. Nicht in eine Datenbank einspielen.")
json.dump(dict(meta=meta, profiles=profiles), open(os.path.join(OUT, "profiles.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(dict(meta=dict(meta, note=meta["note"] + " NUR Testannotation – nicht Teil des Produktprofils, nicht als Matching-Eingabe verwenden."),
               annotations=annotations), open(os.path.join(OUT, "reference_annotations.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(dict(meta=dict(meta, note=meta["note"] + " Workstyle-Kernantworten, getrennt von Ranking-Daten. Nur für Erklärungen."),
               workstyle=workstyle), open(os.path.join(OUT, "workstyle_core.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump(dict(meta=meta, pairs=pairs_out), open(os.path.join(OUT, "reference_pairs.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

with open(os.path.join(OUT, "profiles.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, lineterminator="\n")
    w.writerow(["id", "primary_scenario", "locale", "display_name", "location_region", "remote_mode", "industries", "expertise",
                "capability_count", "find_status", "own_roles", "seeking_roles", "hours", "commitment", "venture_stage", "venture_goal",
                "search_intent", "start_horizon", "must_have_keys", "connect_active", "listings", "problems"])
    for pr in profiles:
        fp = pr["find_profile"] or {}
        w.writerow([pr["id"], annotations[pr["id"]]["primary_scenario"], pr["person_core"]["locale"], pr["person_core"]["display_name"],
                    pr["person_core"]["location_region"], pr["person_core"]["remote_mode"], " | ".join(pr["person_core"]["industries"]),
                    " | ".join(pr["person_core"]["expertise"]), len(pr["capability_entries"]), fp.get("status"),
                    " ".join(fp.get("own_roles", [])), " ".join(fp.get("seeking_roles", [])), fp.get("availability_hours_per_week"),
                    fp.get("commitment_level"), fp.get("venture_stage"), fp.get("venture_goal"), fp.get("search_intent"), fp.get("start_horizon"),
                    " ".join(sorted((fp.get("must_haves") or {}).keys())), bool(pr["connect_profile"]), len(pr["connect_listings"]),
                    len(pr["connect_problems"])])
with open(os.path.join(OUT, "reference_pairs.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f, lineterminator="\n")
    dims = list(pairs_out[0]["dimensions"].keys())
    w.writerow(["pair_id", "context", "a", "b", "a_listing", "b_listing", "reference_class", "source"] + dims + ["hard_constraint_reasons", "rationale"])
    for p in pairs_out:
        w.writerow([p["pair_id"], p["context"], p["a"], p["b"], p["a_listing"], p["b_listing"], p["reference_class"], p["source"]]
                   + [p["dimensions"][k] for k in dims] + [" | ".join(p["hard_constraint_reasons"]), p["rationale"]])

for p, d in dropped:
    print(f"VERWORFEN {p['source']} {p['cls']} {p['a']}-{p['b']}: {d}", file=sys.stderr)
print("profiles", len(profiles), "pairs", len(pairs_out), "dropped", len(dropped))
print(Counter(p["reference_class"] for p in pairs_out))
print(Counter((p["context"], p["reference_class"]) for p in pairs_out))
print(Counter(annotations[x]["primary_scenario"] for x in annotations))
