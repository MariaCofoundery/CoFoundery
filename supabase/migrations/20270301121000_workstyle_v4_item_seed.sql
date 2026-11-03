-- Generated from the frozen Endfassung-29 source. No historical definition is updated.
begin;
insert into public.workstyle_item_versions(instrument_id,assessment_version,item_key,item_version,position,definition)
select 'founder-workstyle-pretest-8-5a-v4',item->>'assessment_version',item->>'item_key',item->>'item_version',position::integer,item
from jsonb_array_elements($workstyle$[
  {
    "item_key": "ORG-01",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Arbeitsorganisation & Selbststeuerung",
    "area_key": "ORG",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Bei einem größeren Vorhaben: Wie wahrscheinlich ist es, dass du dir zuerst die nächsten konkreten Schritte zurechtlegst, bevor du ins Machen kommst?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EXP-01",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Erfahrungsbasierte Urteilsnutzung",
    "area_key": "EXP",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Jemand schlägt euch ein neues Vorgehen vor. Du hast sofort das Gefühl: ‚Das kenne ich, so etwas habe ich schon einmal erlebt‘ – kannst es im Moment aber noch nicht genau begründen. Wie stark beeinflusst dieser erste Eindruck deine Einschätzung?",
    "stem": null,
    "response_format": "influence",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "VOICE-01",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Konstruktive Voice / sachlicher Dissens",
    "area_key": "VOICE",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Ihr seid euch bei einer Entscheidung im Team eigentlich schon einig. Dir fällt aber noch ein Punkt auf, der dagegen spricht. Wie wahrscheinlich ist es, dass du ihn trotzdem noch ansprichst?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "AMB-01",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Ambiguitätstoleranz",
    "area_key": "AMB",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Du bekommst zu einer neuen Idee unterschiedliche Rückmeldungen und kannst noch nicht einschätzen, welches Feedback relevanter ist. Wie unangenehm ist das für dich?",
    "stem": null,
    "response_format": "ambiguity_discomfort",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EL-01",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Experimentelles Lernen",
    "area_key": "EL",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Du schwankst zwischen zwei Wegen und beide lassen sich im Kleinen ausprobieren. Wie wahrscheinlich ist es, dass du erst etwas testest, bevor du dich festlegst?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EVI-01",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Evidenzorientierung",
    "area_key": "EVI",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Du hast drei Möglichkeiten vor dir und eine davon gefällt dir spontan am besten. Was beschreibt dich eher?",
    "stem": null,
    "response_format": "comparative",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [
      {
        "option_id": "strong_a",
        "label": "deutlich eher A"
      },
      {
        "option_id": "lean_a",
        "label": "eher A"
      },
      {
        "option_id": "lean_b",
        "label": "eher B"
      },
      {
        "option_id": "strong_b",
        "label": "deutlich eher B"
      }
    ],
    "alternatives": [
      {
        "option_id": "A",
        "label": "Ich suche vor der Festlegung gezielt nach Gegenargumenten, um Schwächen früh zu sehen."
      },
      {
        "option_id": "B",
        "label": "Ich starte mit meinem Favoriten, um voranzukommen, und achte unterwegs darauf, ob handfeste Gründe dagegen auftauchen."
      }
    ],
    "rendered_order": [
      "A",
      "B"
    ],
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EXP-02",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Erfahrungsbasierte Urteilsnutzung",
    "area_key": "EXP",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Ein Konzept wirkt auf dem Papier schlüssig, aber deine Erfahrung aus früheren Situationen lässt dich zögern. Wie stark beeinflusst diese Vorerfahrung dein Urteil über den Plan?",
    "stem": null,
    "response_format": "influence",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "ORG-03",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Arbeitsorganisation & Selbststeuerung",
    "area_key": "ORG",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Mehrere wichtige Aufgaben konkurrieren gleichzeitig um deine Aufmerksamkeit. Was beschreibt deine Arbeitsweise eher?",
    "stem": null,
    "response_format": "comparative",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [
      {
        "option_id": "strong_a",
        "label": "deutlich eher A"
      },
      {
        "option_id": "lean_a",
        "label": "eher A"
      },
      {
        "option_id": "lean_b",
        "label": "eher B"
      },
      {
        "option_id": "strong_b",
        "label": "deutlich eher B"
      }
    ],
    "alternatives": [
      {
        "option_id": "A",
        "label": "Ich halte mehrere Themen parallel in Bewegung, damit nichts ganz stehen bleibt."
      },
      {
        "option_id": "B",
        "label": "Ich konzentriere mich auf wenige Dinge und akzeptiere, dass anderes warten muss."
      }
    ],
    "rendered_order": [
      "A",
      "B"
    ],
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "AMB-02",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Ambiguitätstoleranz",
    "area_key": "AMB",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Ein Problem tritt auf und es gibt mehrere plausible Erklärungen, aber vorerst keine Möglichkeit herauszufinden, welche wirklich stimmt. Wie unangenehm ist diese Unklarheit für dich?",
    "stem": null,
    "response_format": "ambiguity_discomfort",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "VOICE-02",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Konstruktive Voice / sachlicher Dissens",
    "area_key": "VOICE",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Du erfährst etwas, das für eure gemeinsame Arbeit wichtig ist, aber die Stimmung im Team belasten könnte. Wie wahrscheinlich ist es, dass du es zeitnah zur Sprache bringst?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EVI-02",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Evidenzorientierung",
    "area_key": "EVI",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Euer nächster Schritt steht und fällt mit einer Vermutung, bei der ihr euch noch nicht sicher seid. Wie wahrscheinlich ist es, dass du sie gezielt überprüfst, bevor ihr euch festlegt?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EXP-03",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Erfahrungsbasierte Urteilsnutzung",
    "area_key": "EXP",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Zwei Optionen wirken rein sachlich gleich gut. Bei einer davon hast du jedoch ein starkes Wiedererkennen aus früheren Situationen. Wie stark gibt diese persönliche Erfahrung den Ausschlag für deine Wahl?",
    "stem": null,
    "response_format": "influence",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "AMB-04",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Ambiguitätstoleranz",
    "area_key": "AMB",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Ihr analysiert ein Problem, aber jede neue Information macht das Gesamtbild nur noch verworrener und wirft weitere Fragen auf. Wie unangenehm ist das für dich?",
    "stem": null,
    "response_format": "ambiguity_discomfort",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "ORG-04",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Arbeitsorganisation & Selbststeuerung",
    "area_key": "ORG",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Eine Aufgabe dauert deutlich länger als gedacht. Was beschreibt deine Arbeitsweise eher?",
    "stem": null,
    "response_format": "comparative",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [
      {
        "option_id": "strong_a",
        "label": "deutlich eher A"
      },
      {
        "option_id": "lean_a",
        "label": "eher A"
      },
      {
        "option_id": "lean_b",
        "label": "eher B"
      },
      {
        "option_id": "strong_b",
        "label": "deutlich eher B"
      }
    ],
    "alternatives": [
      {
        "option_id": "A",
        "label": "Ich ziehe die begonnene Aufgabe erst wie geplant zu Ende durch, bevor ich den Zeitplan neu sortiere."
      },
      {
        "option_id": "B",
        "label": "Ich passe meinen Zeitplan früh an die Verzögerung an, bevor ich weitermache."
      }
    ],
    "rendered_order": [
      "A",
      "B"
    ],
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EL-02",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Experimentelles Lernen",
    "area_key": "EL",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Ihr habt im Team zwei plausible Ansätze und kommt im Gespräch nicht wirklich weiter. Beide ließen sich mit wenig Aufwand ausprobieren. Wie wahrscheinlich ist es, dass du einen konkreten Test vorschlägst?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EXP-04",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Erfahrungsbasierte Urteilsnutzung",
    "area_key": "EXP",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Du stehst vor einer Herausforderung, die du in ähnlicher Form schon mehrfach erlebt hast. Wie stark greifst du auf diese Erfahrungen zurück, um einzuschätzen, worauf es diesmal ankommt?",
    "stem": null,
    "response_format": "influence",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "VOICE-03",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Konstruktive Voice / sachlicher Dissens",
    "area_key": "VOICE",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Ein schwieriges Thema wurde vertagt und danach nicht wieder aufgegriffen. Für dich ist aber noch etwas Wichtiges offen. Wie wahrscheinlich ist es, dass du das Thema selbst wieder auf den Tisch bringst?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EL-05",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Experimentelles Lernen",
    "area_key": "EL",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Ein erster Versuch bringt keine klare Antwort. Wie wahrscheinlich ist es, dass du gezielt einen Punkt veränderst und es noch einmal probierst?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "AMB-05",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Ambiguitätstoleranz",
    "area_key": "AMB",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Ihr müsst mit einem Thema weiterarbeiten, obwohl eine wichtige Frage noch offen ist. Wie unangenehm ist das für dich?",
    "stem": null,
    "response_format": "ambiguity_discomfort",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "ORG-02",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Arbeitsorganisation & Selbststeuerung",
    "area_key": "ORG",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Eine Aufgabe läuft über mehrere Wochen und niemand setzt dir Zwischentermine. Wie wahrscheinlich ist es, dass du dir selbst Zwischenziele setzt, an denen du prüfst, wo du stehst?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EVI-03",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Evidenzorientierung",
    "area_key": "EVI",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Du hast dich entschieden. Kurz darauf tauchen neue Informationen auf, die gegen deine Entscheidung sprechen. Was beschreibt dich eher?",
    "stem": null,
    "response_format": "comparative",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [
      {
        "option_id": "strong_a",
        "label": "deutlich eher A"
      },
      {
        "option_id": "lean_a",
        "label": "eher A"
      },
      {
        "option_id": "lean_b",
        "label": "eher B"
      },
      {
        "option_id": "strong_b",
        "label": "deutlich eher B"
      }
    ],
    "alternatives": [
      {
        "option_id": "A",
        "label": "Ich nehme die Entscheidung direkt wieder auf und prüfe, ob ich umsteuern sollte."
      },
      {
        "option_id": "B",
        "label": "Ich bleibe zunächst bei der Entscheidung und prüfe, ob die neuen Informationen schwer genug wiegen, um umzusteuern."
      }
    ],
    "rendered_order": [
      "A",
      "B"
    ],
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EL-04",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Experimentelles Lernen",
    "area_key": "EL",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Du bist unsicher, wie der Markt auf ein neues Feature oder Angebot reagiert. Wie wahrscheinlich ist es, dass du potenziellen Nutzern frühzeitig eine einfache erste Version zeigst (z. B. eine Skizze oder einen Dummy), anstatt es intern fertig auszuarbeiten?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "VOICE-04",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Konstruktive Voice / sachlicher Dissens",
    "area_key": "VOICE",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Eine Entscheidung wird getroffen, die du fachlich für falsch hältst. Wie wahrscheinlich ist es, dass du im Team sagst, dass du die Lage anders einschätzt?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EVI-05",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Evidenzorientierung",
    "area_key": "EVI",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Jemand im Team sieht eine Sache anders als du und bringt einen nachvollziehbaren Punkt ein. Was beschreibt dich eher?",
    "stem": null,
    "response_format": "comparative",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [
      {
        "option_id": "strong_a",
        "label": "deutlich eher A"
      },
      {
        "option_id": "lean_a",
        "label": "eher A"
      },
      {
        "option_id": "lean_b",
        "label": "eher B"
      },
      {
        "option_id": "strong_b",
        "label": "deutlich eher B"
      }
    ],
    "alternatives": [
      {
        "option_id": "A",
        "label": "Ich gehe den Punkt direkt durch und hinterfrage meine eigene Einschätzung."
      },
      {
        "option_id": "B",
        "label": "Ich bleibe zunächst bei meiner Einschätzung und suche nach weiteren Hinweisen, die den Punkt stützen oder entkräften."
      }
    ],
    "rendered_order": [
      "A",
      "B"
    ],
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EXP-06",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Erfahrungsbasierte Urteilsnutzung",
    "area_key": "EXP",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Ihr müsst eine Entscheidung treffen, für die euch noch einige Informationen fehlen. Du kennst das Themenfeld aber sehr gut. Wie stark stützt du dich bei deiner Wahl auf dein eigenes Erfahrungswissen?",
    "stem": null,
    "response_format": "influence",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "new",
    "source_status": "new",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "VOICE-05",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Konstruktive Voice / sachlicher Dissens",
    "area_key": "VOICE",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Die Runde möchte ein Thema abschließen, aber für dich ist ein wichtiger Punkt noch offen. Wie wahrscheinlich ist es, dass du sagst, dass du noch nicht so weit bist?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "adapted",
    "source_status": "adapted",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "ORG-07",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Arbeitsorganisation & Selbststeuerung",
    "area_key": "ORG",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Du arbeitest gerade konzentriert an einem wichtigen Thema und eine ebenfalls wichtige neue Anfrage kommt rein. Was beschreibt dich eher?",
    "stem": null,
    "response_format": "comparative",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [
      {
        "option_id": "strong_a",
        "label": "deutlich eher A"
      },
      {
        "option_id": "lean_a",
        "label": "eher A"
      },
      {
        "option_id": "lean_b",
        "label": "eher B"
      },
      {
        "option_id": "strong_b",
        "label": "deutlich eher B"
      }
    ],
    "alternatives": [
      {
        "option_id": "A",
        "label": "Ich unterbreche relativ schnell und kümmere mich direkt um das Neue."
      },
      {
        "option_id": "B",
        "label": "Ich halte erst an dem fest, woran ich gerade arbeite, und schiebe das Neue nach hinten."
      }
    ],
    "rendered_order": [
      "A",
      "B"
    ],
    "source_type": "new",
    "source_status": "new",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "EVI-06",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Evidenzorientierung",
    "area_key": "EVI",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Zwei Quellen, die du grundsätzlich für seriös hältst, widersprechen sich bei einer wichtigen Frage. Wie wahrscheinlich ist es, dass du genauer prüfst, woher der Unterschied kommt?",
    "stem": null,
    "response_format": "likelihood",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [],
    "alternatives": [],
    "rendered_order": null,
    "source_type": "new",
    "source_status": "new",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  },
  {
    "item_key": "ORG-08",
    "item_version": "v4.0",
    "assessment_version": "8.5a-v4",
    "construct": "Arbeitsorganisation & Selbststeuerung",
    "area_key": "ORG",
    "area_status": "development_area",
    "scientific_status": "core",
    "facet": null,
    "facet_status": "not_specified",
    "prompt": "Dein Plan funktioniert grundsätzlich noch, aber mehrere kleinere Dinge laufen anders als gedacht. Was beschreibt dich eher?",
    "stem": null,
    "response_format": "comparative",
    "missing_reasons": [
      "cannot_assess"
    ],
    "options": [
      {
        "option_id": "strong_a",
        "label": "deutlich eher A"
      },
      {
        "option_id": "lean_a",
        "label": "eher A"
      },
      {
        "option_id": "lean_b",
        "label": "eher B"
      },
      {
        "option_id": "strong_b",
        "label": "deutlich eher B"
      }
    ],
    "alternatives": [
      {
        "option_id": "A",
        "label": "Ich ändere meinen Plan erst, wenn die Abweichungen wirklich spürbar ins Gewicht fallen."
      },
      {
        "option_id": "B",
        "label": "Ich passe meinen Plan lieber schon bei kleineren Veränderungen laufend an."
      }
    ],
    "rendered_order": [
      "A",
      "B"
    ],
    "source_type": "new",
    "source_status": "new",
    "source_status_explicit": false,
    "source_note": "Endfassung 29 (abgestimmt 03.11.2026); eigene Fassung, keine versionenübergreifende Itemgleichsetzung",
    "development_status": "candidate_for_pretest",
    "usage": "core",
    "research_only": false,
    "product_status": "pretest_comparison_candidate",
    "form": null,
    "note": null
  }
]$workstyle$::jsonb) with ordinality as items(item,position);
commit;
