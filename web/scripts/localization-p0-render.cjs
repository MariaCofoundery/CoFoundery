/* Read-only renderer replay; run from repo root. Writes evidence only to /tmp. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
process.chdir(path.resolve(__dirname, '../..'));
const req = Module.createRequire(path.resolve('web/package.json'));
const ts = req('typescript');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(name, parent, ...rest) {
  if (name.startsWith('@/')) name = path.resolve('web/src', name.slice(2));
  return originalResolve.call(this, name, parent, ...rest);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (mod, file) => {
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true, target: ts.ScriptTarget.ES2022, resolveJsonModule: true},
    fileName: file,
  });
  mod._compile(out.outputText, file);
};
require.extensions['.css'] = () => {};
const React = req('react');
const {renderToStaticMarkup} = req('react-dom/server');
const {NextIntlClientProvider} = req('next-intl');
const {IndividualWorkstyle} = require(path.resolve('web/src/features/reporting/workstyle/IndividualWorkstyle.tsx'));
const {TeamWorkstyleReport} = require(path.resolve('web/src/features/reporting/workstyle/TeamWorkstyleReport.tsx'));
const {PRODUCT_ITEMS, validProductProfile, validProductTeam} = require(path.resolve('web/src/features/reporting/workstyle/model.ts'));
const member = (n, scale = 4) => ({person_id: String(n), name: `Person ${n}`, capabilities: [], alignment: null,
  workstyle: {person_id: String(n), assessment_id: `audit-${n}`, instrument_id: 'founder-workstyle-pretest-8-5a-v3',
    manifest_version: '3.0.0', item_version: '8.4-v0.4', completed_at: '2026-10-04',
    answers: PRODUCT_ITEMS.map(i => ({item_key: i.item_key, item_version: i.item_version,
      value: i.response_format === 'comparative' ? {optionId: scale < 3 ? 'lean_a' : 'lean_b'} : {scale}, missing_reason: null}))}});
const people = [member(1), member(2, 1)];
const team = {status: 'ready', team_id: 'audit-only', team_name: 'Audit fixture', team_context: 'existing_team',
  people, taxonomy: {areas: [], families: []}, setup: [], setup_available: false};
if (!validProductProfile(people[0].workstyle) || !validProductTeam(team)) throw new Error('Invalid fixture');
const messages = Object.fromEntries(fs.readdirSync('web/messages/en').filter(f => f.endsWith('.json'))
  .map(f => [f.slice(0,-5), JSON.parse(fs.readFileSync(`web/messages/en/${f}`, 'utf8'))]));
const results = [];
const {workstyleSessionItems} = require(path.resolve('web/src/features/instruments/workstyle/registry.ts'));
const {REVISED_RESEARCH_ITEMS} = require(path.resolve('web/src/features/instruments/workstyle/researchSets.ts'));
const {workstyleDisplayItem, workstyleDisplayOptions} = require(path.resolve('web/src/features/instruments/workstyle/display.ts'));
const {alignmentDisplayEntry, alignmentDisplayText, alignmentQuestionView} = require(path.resolve('web/src/features/instruments/align/display.ts'));
const {getItemsV22} = require(path.resolve('web/src/features/instruments/align/registries.ts'));
const {buildSections} = require(path.resolve('web/src/features/instruments/align/questionnaireData.ts'));
const {readAnswer} = require(path.resolve('web/src/features/instruments/v21/readoutV21.ts'));
const {individualNarratives, teamAreaFinding} = require(path.resolve('web/src/features/reporting/workstyle/narrative.ts'));
const german = /[äöüßÄÖÜ]|\b(?:oder|noch|von|zum|zur|wird|werden|sind|bitte|Deine|Dein|Euer|Eure|Antworten|Einwände|Bereich|Bereiche|keine|nicht|möchte|Frage|Fragen|Vorgehen|Erfahrung|Verantwortung|Unterschiedliche|Ähnliche|Vorhaben|Anliegen|Zusammenspiel)\b/;
const noGerman = (text, label) => assert.doesNotMatch(text, german, label);
for (const item of [...workstyleSessionItems('8.5a-v3', null), ...REVISED_RESEARCH_ITEMS]) {
  const before = JSON.stringify(item), en = workstyleDisplayItem(item, 'en');
  noGerman(en.prompt, item.item_key);
  en.alternatives?.forEach(a => noGerman(a.label, item.item_key));
  const deOptions = workstyleDisplayOptions(item, 'de'), options = workstyleDisplayOptions(item, 'en');
  assert.deepEqual(options.map(o => o.value), deOptions.map(o => o.value));
  assert.ok(options.length >= 4, item.item_key);
  options.forEach(o => noGerman(o.label, item.item_key));
  assert.equal(JSON.stringify(item), before);
}
for (const scope of ['founder_profile', 'venture_alignment']) {
  for (const group of buildSections(scope)) for (const item of group.items) {
    const display = alignmentQuestionView(item, 'en');
    noGerman(JSON.stringify([display.prompt, display.hint, display.groupPrompt, display.options, display.offeredMissing, display.concerns, display.paths, display.valueCase, display.followup]), scope + ':' + item.itemId);
    assert.deepEqual(display.options.map(o=>o.optionId), item.options.map(o=>o.optionId));
    assert.equal(display.unit, item.unit, 'stored unit stays unchanged');
  }
  for (const item of getItemsV22(scope)) {
    for (const option of item.options) {
      const entry = readAnswer({blockId:item.itemId,value:{optionId:option.optionId}}, [], item);
      if (entry?.value) noGerman(JSON.stringify(alignmentDisplayEntry(entry,'en')), item.itemId);
    }
    for (const missing of item.missing) {
      const entry = readAnswer({blockId:item.itemId,missingCode:missing.code}, [], item);
      noGerman(JSON.stringify(alignmentDisplayEntry(entry,'en')), item.itemId);
    }
  }
}
for (const scale of [1,2,3,4,5,null,'mixed']) {
  const p = member(1, scale === null ? 3 : scale).workstyle;
  if (scale === null) p.answers = p.answers.map(a=>({...a,value:null,missing_reason:'cannot_assess'}));
  if (scale === 'mixed') p.answers = p.answers.map((a,i)=>({...a,value:PRODUCT_ITEMS[i].response_format === 'comparative' ? {optionId:i%2?'lean_a':'lean_b'} : {scale:i%2?1:5}}));
  const de = individualNarratives(p,'de'), en = individualNarratives(p,'en');
  assert.deepEqual(en.map(n=>[n.narrative.claim,n.narrative.pattern]),de.map(n=>[n.narrative.claim,n.narrative.pattern]));
  for (const n of en) noGerman(JSON.stringify(n.narrative), 'narrative '+scale);
}
// Exercise embedded venture, skills and setup copy as well as empty states.
const populated = structuredClone(team);
populated.setup_available = true;
populated.setup = [{item_key:'roles_responsibilities',resolution_status:'documented',note:'Fixture agreement',confirmed_at:'2026-10-11T12:00:00Z'}];
populated.taxonomy.areas = [{area_id:'software_engineering',family_id:'technology_delivery',sort_order:1,sourcing:'internal_only'}];
populated.people.forEach((p,i) => {
  p.capabilities = [{id:'fixture-skill-'+i,evidence:[],area_id:'software_engineering',application_level:i?2:5,ownership_wish:i?'contribute':'own'}];
  p.alignment = [{item_key:'U04',value:{optionId: getItemsV22('venture_alignment').find(x=>x.itemId==='U04').options[i].optionId},missing_reason:null}];
});

for (const [name, element] of [
  ['individual', React.createElement(IndividualWorkstyle, {profile: people[0].workstyle, full: true, locale: "en"})],
  ['team', React.createElement(TeamWorkstyleReport, {team, full: true, locale: "en"})],
  ...[2,3,4].map(size => ['team-'+size, React.createElement(TeamWorkstyleReport,{team:{...populated,people:Array.from({length:size},(_,i)=>({...populated.people[i%2],person_id:String(i),name:'Person '+i,workstyle:member(i,i%2?1:5).workstyle}))},locale:'en',full:true})]),
  ['capability', React.createElement(require(path.resolve('web/src/features/reporting/workstyle/ComponentMatrix.tsx')).ComponentMatrix,{people:populated.people,areas:populated.taxonomy.areas,locale:'en'})],
  ['individual-short', React.createElement(IndividualWorkstyle,{profile:people[0].workstyle,locale:'en',full:false,name:'Person 1'})],
]) {
  const html = renderToStaticMarkup(React.createElement(NextIntlClientProvider,
    {locale: 'en', messages, timeZone: 'Europe/Berlin'}, element));
  noGerman(html.replace(/data-claim="[^"]*"/g, '').replace(/<[^>]*>/g,' '), name);
  assert.ok(!html.includes('lang="de"'));
  fs.writeFileSync(`/tmp/localization-${name}-en.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px/1.5 system-ui;max-width:1152px;margin:32px auto;padding:0 24px;overflow-wrap:anywhere}svg{max-width:100%}button,a{font:inherit}</style><style>${fs.readFileSync('web/src/features/reporting/workstyle/report.css','utf8')}</style></head><body>${html}</body></html>`);
  results.push({name, locale: 'en', fixture: true, valid: true, bytes: html.length,
    germanLang: html.includes('lang="de"'), germanSample: html.match(/(?:Deine Arbeitsweise auf einen Blick|Euer Zusammenspiel|Bereich für Bereich|So liest du das)/g)});
}
console.log(JSON.stringify(results, null, 2));

// Component rendering only: no session bypass, network calls or saved test data.
// Server request-locale/formatter and navigation boundaries are replaced with a
// fixed EN request. Any attempted action fails this regression run.
const originalLoad = Module._load;
Module._load = function(name, parent, ...rest) {
  if (name === '@/i18n/getLocale') return {getRequestLocale: async () => 'en'};
  if (name === 'next-intl/server') return {
    getTranslations: async namespace => req('next-intl').createTranslator({locale:'en',messages,namespace}),
    getFormatter: async () => req('next-intl').createFormatter({locale:'en',timeZone:'Europe/Berlin'}),
  };
  if (name === 'next/navigation') return {useRouter:()=>({refresh(){},push(){}})};
  if (/features\/instruments\/.*(?:\/actions|Actions|\/answerActions|\/ventureActions)/.test(name)) {
    return new Proxy({}, {get:() => () => {throw Error('Actions must not run in a rendering test');}});
  }
  return originalLoad.call(this,name,parent,...rest);
};
const render = (name, element) => {
  const html = renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale:'en',messages,timeZone:'Europe/Berlin'},element));
  noGerman(html.replace(/<[^>]*>/g,' '),name);
  assert.doesNotMatch(html,/workstyleFlow\.[a-z_]+/);
  fs.writeFileSync(`/tmp/localization-${name}-en.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`);
  return html;
};
async function ui() {
  const {WorkstyleProfileFlow} = require(path.resolve('web/src/features/instruments/workstyle/WorkstyleProfileFlow.tsx'));
  render('align-entry',React.createElement(WorkstyleProfileFlow,{initialSession:null}));
  // The research consent shown must be the versioned document for the locale, not message copy.
  const {ConsentDetails} = require(path.resolve('web/src/features/instruments/workstyle/WorkstyleProfileFlow.tsx'));
  const deMessages = Object.fromEntries(fs.readdirSync('web/messages/de').filter(f => f.endsWith('.json'))
    .map(f => [f.slice(0,-5), JSON.parse(fs.readFileSync(`web/messages/de/${f}`, 'utf8'))]));
  const consentDocs = {de: JSON.parse(fs.readFileSync('web/docs/founder-workstyle-research-consent-v3.json','utf8')),
    en: JSON.parse(fs.readFileSync('web/docs/founder-workstyle-research-consent-v3.en.json','utf8'))};
  const unescape = s => s.replace(/&quot;/g,'"').replace(/&#x27;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  for (const [locale, other] of [['de','en'],['en','de']]) {
    const html = renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale,messages:locale==='en'?messages:deMessages,timeZone:'Europe/Berlin'},
      React.createElement(ConsentDetails,{consent:false,onConsent(){}})));
    const text = unescape(html);
    const doc = consentDocs[locale];
    for (const part of [...doc.paragraphs, doc.confirmation]) assert.ok(text.includes(part), `${locale} consent shows its versioned document`);
    for (const part of [...consentDocs[other].paragraphs, consentDocs[other].confirmation]) assert.ok(!text.includes(part), `${locale} consent does not show the ${other} document`);
    assert.equal((html.match(/<details[\s\S]*?<\/details>/)[0].match(/<p>/g) || []).length, doc.paragraphs.length, `${locale} consent paragraph count`);
    assert.doesNotMatch(html, /workstyleFlow\.consent_/);
    if (locale === 'en') noGerman(text.replace(/<[^>]*>/g,' '),'consent-en');
  }
  console.log('Research consent DE/EN rendered from versioned documents.');
  const {AnswerFieldV21} = require(path.resolve('web/src/features/instruments/v21/AnswerFieldV21.tsx'));
  const {Questionnaire} = require(path.resolve('web/src/features/instruments/align/Questionnaire.tsx'));
  const {screenSet} = require(path.resolve('web/src/features/instruments/align/screens.ts'));
  const {ReportViewV21} = require(path.resolve('web/src/features/instruments/v21/ReportViewV21.tsx'));
  const {MarkV21} = require(path.resolve('web/src/features/instruments/v21/MarkV21.tsx'));
  render('mark',React.createElement(MarkV21,{itemId:'U04',initial:true}));
  for (const scope of ['founder_profile','venture_alignment']) {
    const sections = buildSections(scope);
    render(scope+'-entry',React.createElement(Questionnaire,{scope,sections,answerable:{},initialAnswers:{},submitted:false,screens:screenSet(scope,id=>getItemsV22(scope).some(i=>i.itemId===id))}));
    const items = sections.flatMap(s=>s.items);
    render(scope+'-fields',React.createElement('div',null,items.map(item=>React.createElement('section',{key:item.itemId},React.createElement(AnswerFieldV21,{item,draft:{},onChange(){}})))));
    const entries = getItemsV22(scope).flatMap(item=>item.missing.map(m=>readAnswer({blockId:item.itemId,missingCode:m.code},[],item))).filter(Boolean);
    const view = await ReportViewV21({sections:[{section:'Founder-Arbeitsprofil',entries}]});
    render(scope+'-readout',view);
  }
  const {getItemsV21} = require(path.resolve('web/src/features/instruments/v21/registryV21.ts'));
  const {ComparisonViewV21} = require(path.resolve('web/src/features/instruments/v21/ComparisonViewV21.tsx'));
  const {ConversationCardsView} = require(path.resolve('web/src/features/instruments/v21/ConversationCardsView.tsx'));
  const {ExpectationGapsView} = require(path.resolve('web/src/features/instruments/v21/ExpectationGapsView.tsx'));
  const {ConfirmVentureAnswers} = require(path.resolve('web/src/features/instruments/align/ConfirmVentureAnswers.tsx'));
  // Archived report labels are a different source from the current registries.
  const legacy = getItemsV21();
  const readouts = [];
  for (const item of legacy) {
    for (const option of item.options) {
      const entry = readAnswer({blockId:item.itemId,value:{optionId:option.optionId}},[],item);
      if (entry?.value) {noGerman(JSON.stringify(alignmentDisplayEntry(entry,'en')),'legacy '+item.itemId);readouts.push(entry);}
    }
    for (const missing of item.missing) {
      const entry = readAnswer({blockId:item.itemId,missingCode:missing.code},[],item);
      noGerman(JSON.stringify(alignmentDisplayEntry(entry,'en')),'legacy missing '+item.itemId);
      readouts.push(entry);
    }
  }
  render('historical-readout',await ReportViewV21({sections:[{section:legacy[0].section,entries:readouts}]}));
  const entry = readouts.find(x=>x?.value) || readouts[0];
  const states = ['same','different','partly_same','side_by_side'];
  const why = ['withheld_a','withheld_b','withheld_both','unanswered_a','unanswered_b','unanswered_both','no_common_ground'];
  const items = [...states.map((state,i)=>({itemId:String(i),section:entry.section,prompt:entry.prompt,state,a:entry,b:entry})),
    ...why.map((reason,i)=>({itemId:'missing-'+i,section:entry.section,prompt:entry.prompt,state:'no_basis',why:reason,a:null,b:null}))];
  for(const filled of [false,true]) {
    const comparison = {sections:[{section:entry.section,items:filled?items:[]}],agenda:filled?['marked','commitment','preference','shared'].map((kind,i)=>({kind,itemId:String(i),section:entry.section,prompt:entry.prompt})):[],notShared:[]};
    render('comparison-'+filled,await ComparisonViewV21({comparison,nameA:'Alex',nameB:'Sam'}));
  }
  render('discussion-empty',await ConversationCardsView({cards:[]}));
  const gaps={gaps:[{from:'a',recipientLabel:'Sam',unit:'Stunden pro Woche',expected:25,offered:12,shortfall:13}],unmatched:['several_entries','no_offer','different_unit'].map(why=>({from:'b',recipientLabel:'Alex',unit:'Stunden pro Woche',expected:20,why}))};
  render('expectations',await ExpectationGapsView({result:gaps,nameA:'Alex',nameB:'Sam'}));
  render('venture-confirmation',React.createElement(ConfirmVentureAnswers,{ventureName:null,partnerLabel:'Sam',answeredAt:'2026-10-11T12:00:00Z',ages:readouts.map(entry=>({itemId:entry.itemId,prompt:entry.prompt,entry})),keeps:[],onConfirm(){throw Error('No action');},editHref:'/founder-alignment/vorhaben'}));
  console.log('EN entry, all Founder/Venture field formats, missing readouts and discussion marks passed.');
}
ui().catch(e=>{console.error(e);process.exitCode=1;});
