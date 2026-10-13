/**
 * Eingefrorenes Wörterbuch der Normalisierung `matching-normalization-v0.1`.
 *
 * Wörtlich übernommen aus docs/research/synthetic/experiments/normalization_v01.py
 * (SHA-256 44f55979…) und v02/normalization_v02.py (Stoppwörter, Ortsrauschen,
 * Platzhalter; SHA-256 3e505b0d…). Reihenfolge der Einträge unverändert: Kommt eine
 * Schreibweise zweimal vor, gilt wie im Original der spätere Eintrag.
 *
 * KEINE neuen Synonyme. Jede Änderung ist eine neue normalization_version (Spec §12).
 */
import { NORMALIZATION_VERSION } from "@/lib/matching/v01/version";

export const DICTIONARY_VERSION = NORMALIZATION_VERSION;

export const INDUSTRY_SYNONYMS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["ind:health", ["Digital Health", "HealthTech", "Health Tech", "Healthcare", "Health Care", "Gesundheitswesen",
    "Gesundheit", "Digitale Gesundheit", "E-Health", "eHealth", "MedTech", "Medizintechnik"]],
  ["ind:software", ["SaaS", "Software as a Service", "B2B SaaS", "Software", "B2B-Software", "Unternehmenssoftware",
    "Enterprise Software"]],
  ["ind:climate_energy", ["Climate Tech", "ClimateTech", "Cleantech", "Clean Tech", "Energy", "Energie",
    "Erneuerbare Energien", "Renewables", "Renewable Energy", "Klimaschutz", "Klima", "Energiewende"]],
  ["ind:education", ["Education", "EdTech", "Bildung", "Weiterbildung", "E-Learning", "Learning", "Lernen"]],
  ["ind:consumer", ["Consumer", "Consumer Goods", "Konsumgüter", "E-Commerce", "eCommerce", "D2C", "DTC", "Retail", "Handel"]],
  ["ind:deep_tech", ["Deep Tech", "DeepTech", "Robotics", "Robotik", "Materialforschung", "Materials Science",
    "Quantentechnologie", "Quantum Technology"]],
  ["ind:social_impact", ["Social Impact", "Impact", "Sozialunternehmen", "Social Entrepreneurship", "Gemeinwohl",
    "Gemeinwohlökonomie", "Non-Profit", "Nonprofit"]],
  ["ind:marketplace", ["Marketplace", "Marktplatz", "Marktplätze", "Platform", "Plattform", "Two-sided Marketplace"]],
  ["ind:media", ["Media", "Medien", "Creative Industries", "Kreativwirtschaft", "Content", "Creator Economy", "Medien & Kultur"]],
  ["ind:finance", ["FinTech", "Financial Services", "Finanzdienstleistungen", "Banking", "InsurTech"]],
  ["ind:mobility", ["Mobility", "Mobilität", "Logistics", "Logistik", "Transport", "Supply Chain"]],
  ["ind:food_agri", ["Food", "FoodTech", "Lebensmittel", "AgriTech", "Agrar", "Landwirtschaft"]],
  ["ind:real_estate", ["PropTech", "Real Estate", "Immobilien", "Construction", "ConTech", "Bauwirtschaft", "Bau"]],
  ["ind:work", ["HR", "HR Tech", "HRTech", "Personalwesen", "Future of Work", "New Work", "Arbeitswelt"]],
  ["ind:manufacturing", ["Manufacturing", "Industrie", "Industry 4.0", "Industrie 4.0", "Produktion", "Maschinenbau", "Industrial"]],
];

export const TOPIC_SYNONYMS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["top:software", ["Software Engineering", "Softwareentwicklung", "Backend", "Full-Stack", "Full Stack", "Programmierung",
    "Engineering", "Dev"]],
  ["top:ai", ["AI", "KI", "Künstliche Intelligenz", "Artificial Intelligence", "Machine Learning", "ML", "GenAI", "LLM",
    "LLMs", "KI / ML", "AI/ML"]],
  ["top:data", ["Data", "Data Analytics", "Datenanalyse", "Analytics", "BI", "Business Intelligence", "Data Science"]],
  ["top:hardware", ["Hardware", "Hardware-Entwicklung", "Elektronik", "Electronics", "IoT", "Embedded", "Prototyping"]],
  ["top:product", ["Product Discovery", "Discovery", "Produktentwicklung", "User Research", "Nutzerforschung", "Product",
    "Produktmanagement", "Product Management"]],
  ["top:design", ["UX", "UX Design", "UX-Design", "UI/UX", "UX/UI", "Design", "Produktdesign", "Gestaltung"]],
  ["top:sales", ["Go-to-Market", "GTM", "Markteintritt", "Sales", "Vertrieb", "B2B Sales", "B2B-Vertrieb", "Vertriebsaufbau"]],
  ["top:pilots", ["Pilot Customers", "Pilotkunden", "Erste Kunden", "Early Adopters", "Pilotprojekte", "Pilots"]],
  ["top:partnerships", ["Partnerships", "Partnerschaften", "Kooperationen", "Business Development", "BD", "BizDev"]],
  ["top:marketing", ["Marketing", "Branding", "Brand", "Brand Marketing", "Markenaufbau", "Content Marketing",
    "Performance Marketing"]],
  ["top:community", ["Community", "Community Building", "Community-Aufbau", "Communities", "Netzwerk", "Events"]],
  ["top:operations", ["Operations", "Ops", "Prozesse", "Prozessoptimierung", "Scaling", "Skalierung"]],
  ["top:hiring", ["Hiring", "Recruiting", "Teamaufbau", "Personalgewinnung", "Talent", "People"]],
  ["top:fundraising", ["Fundraising", "Finanzierung", "Investorensuche", "Seed Funding", "Seed-Runde", "VC", "Fundraise"]],
  ["top:finance_planning", ["Finanzplanung", "Financial Planning"]],
  ["top:pricing", ["Pricing", "Preisgestaltung", "Monetarisierung", "Monetization", "Preismodelle", "Revenue Model"]],
  ["top:regulatory", ["Regulatory", "Regulatorik", "Compliance", "Zulassung", "Zulassungen", "Regulatory Affairs"]],
  ["top:impact_measurement", ["Impact Measurement", "Wirkungsmessung", "SROI"]],
  ["top:sustainability", ["Sustainability", "Nachhaltigkeit", "ESG", "CO2-Bilanz", "Climate Reporting"]],
  ["top:legal", ["Legal", "Recht", "IP", "Patente", "Patent Law", "Gesellschaftsrecht"]],
  ["top:medical_device_regulation", ["MDR", "Medical Device Regulation", "MDR-Zulassung", "Medizinprodukterecht", "MDR/IVDR",
    "CE-Kennzeichnung Medizinprodukte"]],
  ["top:battery", ["Battery Chemistry", "Batteriechemie", "Zellchemie", "Cell Chemistry", "Li-Ion", "Batterietechnik"]],
  ["top:quantum_sensing", ["Quantum Sensing", "Quantensensorik"]],
  ["top:soil", ["Soil Science", "Bodenkunde", "Bodengesundheit", "Soil Health", "Regenerative Landwirtschaft", "Agronomy"]],
  ["top:public_procurement", ["Public Procurement", "Vergaberecht", "Öffentliche Beschaffung", "GovTech Sales",
    "Ausschreibungen", "Vergabe"]],
];

/** Metropolregion -> Schreibweisen. */
export const LOCATION_ALIASES: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["loc:berlin", ["Berlin", "Berlin-Brandenburg", "Großraum Berlin"]],
  ["loc:munich", ["München", "Munich", "Muenchen", "Bayern", "Bavaria"]],
  ["loc:hamburg", ["Hamburg", "HH"]],
  ["loc:cologne", ["Köln", "Cologne", "Koeln", "Köln/Bonn", "Rheinland"]],
  ["loc:frankfurt", ["Frankfurt", "Frankfurt am Main", "Rhein-Main", "FFM"]],
  ["loc:leipzig", ["Leipzig", "Mitteldeutschland", "Mitteldeutschland (Leipzig)"]],
  ["loc:stuttgart", ["Stuttgart", "Region Stuttgart"]],
  ["loc:ruhr", ["Ruhrgebiet", "Ruhr Area", "Essen", "Dortmund", "Essen / Ruhrgebiet"]],
  ["loc:vienna", ["Wien", "Vienna"]],
  ["loc:zurich", ["Zürich", "Zurich", "Zuerich"]],
];

/** Angaben, die keinen Ort festlegen: passen zu jedem Ort, sind aber kein Ort. */
export const LOCATION_WILDCARDS: readonly string[] = [
  "DACH", "Deutschland", "Germany", "bundesweit", "remote (DE)", "Remote", "Remote / überall", "überall",
];
/** Zusätze nach einem Ort, die nichts unterscheiden (als Regex-Alternativen, Reihenfolge wie im Original). */
export const LOCATION_SUFFIXES: readonly string[] = [
  "germany", "deutschland", "de", "bayern", "bavaria", "bw", "sachsen", "oesterreich", "austria", "und umgebung", "umgebung",
];

/** generic2: nur Funktionswörter, keine Fachbegriffe. */
export const STOPWORDS: ReadonlySet<string> = new Set([
  "und", "and", "or", "oder", "the", "der", "die", "das", "for", "fuer", "in", "im", "of", "von", "mit", "with",
  "to", "zu", "a", "an", "ein", "eine", "fur",
]);
/** generic2: generische Ortsbestandteile (keine Stadtnamen). */
export const LOCATION_NOISE: ReadonlySet<string> = new Set([
  "region", "grossraum", "area", "umgebung", "metropolregion", "stadt", "city", "raum", "und", "and",
  "germany", "deutschland", "de", "austria", "oesterreich", "at", "switzerland", "schweiz", "ch",
]);
/** generic2: Platzhalter ohne konkreten Ort. */
export const LOCATION_WILDCARD_TOKENS: ReadonlySet<string> = new Set([
  "dach", "deutschland", "germany", "bundesweit", "remote", "ueberall", "anywhere", "europe",
  "europa", "weltweit", "worldwide", "online", "de",
]);
