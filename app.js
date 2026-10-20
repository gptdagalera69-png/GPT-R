// Central do Mestre — D&D 5.5e / SRD 5.2.1
// Dados SRD © Wizards of the Coast LLC, CC BY 4.0. Compilação: adkinn / Open5e.
import { initializeCloud, cloudStatus, cloudForm, handleCloudAction, queueCloudSave } from './sync.js';
const STORE='central-mestre-state-v2';
const CR_XP={'0':10,'1/8':25,'1/4':50,'1/2':100,'1':200,'2':450,'3':700,'4':1100,'5':1800,'6':2300,'7':2900,'8':3900,'9':5000,'10':5900,'11':7200,'12':8400,'13':10000,'14':11500,'15':13000,'16':15000,'17':18000,'18':20000,'19':22000,'20':25000,'21':33000,'22':41000,'23':50000,'24':62000,'25':75000,'26':90000,'27':105000,'28':120000,'29':135000,'30':155000};
const BUDGET=[[50,75,100],[100,150,200],[150,225,400],[250,375,500],[500,750,1100],[600,1000,1400],[750,1300,1700],[1000,1700,2100],[1300,2000,2600],[1600,2300,3100],[1900,2900,4100],[2200,3700,4700],[2600,4200,5400],[2900,4900,6200],[3300,5400,7800],[3800,6100,9800],[4500,7200,11700],[5000,8700,14200],[5500,10700,17200],[6400,13200,22000]];
const TYPE={aberration:'Aberração',beast:'Besta',celestial:'Celestial',construct:'Constructo',dragon:'Dragão',elemental:'Elemental',fey:'Fada',fiend:'Ínfero',giant:'Gigante',humanoid:'Humanoide',monstrosity:'Monstruosidade',ooze:'Limo',plant:'Planta',undead:'Morto-vivo'};
const SIZE={Tiny:'Miúdo',Small:'Pequeno',Medium:'Médio',Large:'Grande',Huge:'Enorme',Gargantuan:'Imenso'};
const NAME_PT={Goblin:'Goblin',Ogre:'Ogro',Wolf:'Lobo',DireWolf:'Lobo Atroz',Skeleton:'Esqueleto',Zombie:'Zumbi',Troll:'Troll',Vampire:'Vampiro',Lich:'Lich',Bugbear:'Bugbear',Orc:'Orc',Giant:'Gigante',Dragon:'Dragão',Ghost:'Fantasma',Banshee:'Banshee',Ghoul:'Carniçal',Hydra:'Hidra',Bandit:'Bandido',Tiger:'Tigre',Bear:'Urso',GiantSpider:'Aranha Gigante',BlackPudding:'Pudim Negro',Wight:'Inumano',Mimic:'Mímico',Imp:'Diabrete',Owlbear:'Urso-Coruja',Wraith:'Aparição',Gargoyle:'Gárgula',Gnoll:'Gnoll',Harpy:'Harpia',Manticore:'Mantícora',Medusa:'Medusa',Minotaur:'Minotauro',Pegasus:'Pégaso',Pseudodragon:'Pseudodragão',Specter:'Espectro',Worg:'Worg',Wyvern:'Wyvern'};
const CONDITIONS=['Agarrado','Amedrontado','Atordoado','Caído','Cego','Contido','Enfeitiçado','Ensurdecido','Envenenado','Exaustão','Incapacitado','Invisível','Paralisado','Petrificado','Inconsciente'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const fmt=n=>new Intl.NumberFormat('pt-BR').format(n||0);
const FIELD_PT={str:'Força',dex:'Destreza',con:'Constituição',int:'Inteligência',wis:'Sabedoria',cha:'Carisma',
  passive_perception:'Percepção passiva',darkvision:'Visão no escuro',blindsight:'Percepção às cegas',
  tremorsense:'Sismopercepção',truesight:'Visão verdadeira',acrobatic:'Acrobacia',acrobatics:'Acrobacia',
  animal_handling:'Adestrar Animais',arcana:'Arcanismo',athletics:'Atletismo',deception:'Enganação',
  history:'História',insight:'Intuição',intimidation:'Intimidação',investigation:'Investigação',
  medicine:'Medicina',nature:'Natureza',perception:'Percepção',performance:'Atuação',
  persuasion:'Persuasão',religion:'Religião',sleight_of_hand:'Prestidigitação',
  stealth:'Furtividade',survival:'Sobrevivência'};
function translateField(k){return FIELD_PT[k]||String(k).replaceAll('_',' ')}

const uid=()=>crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const roll=(s=20)=>Math.floor(Math.random()*s)+1;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number(v)||0));
const modifier=n=>{const a=Math.floor((Number(n||10)-10)/2);return a>=0?'+'+a:String(a)};
const sign=n=>{const v=Number(n);return Number.isFinite(v)?(v>=0?'+'+v:String(v)):'+0'};
const emptyState=()=>({party:[5,5,5,5],difficulty:'moderate',encounter:[],savedEncounters:[],combat:{list:[],round:1,turn:0},campaigns:[],campaignId:null,customMonsters:[],creatureImages:{},favorites:[],campaignRecords:{}});
function migrate(data){
 const base=emptyState();if(!data||typeof data!=='object')return base;const s={...base,...data};
 s.party=Array.isArray(s.party)?s.party.map(l=>clamp(l,1,20)).slice(0,12):base.party;
 s.encounter=Array.isArray(s.encounter)?s.encounter.filter(x=>x&&typeof x.id==='string').map(x=>({id:x.id,qty:clamp(x.qty,1,35)})):[];
 s.savedEncounters=Array.isArray(s.savedEncounters)?s.savedEncounters:[];
 s.campaigns=Array.isArray(s.campaigns)?s.campaigns:[];
 s.customMonsters=Array.isArray(s.customMonsters)?s.customMonsters:[];
 s.creatureImages=s.creatureImages&&typeof s.creatureImages==='object'?s.creatureImages:{};
 s.favorites=Array.isArray(s.favorites)?s.favorites:[];
 s.campaignRecords=s.campaignRecords&&typeof s.campaignRecords==='object'?s.campaignRecords:{};
 s.combat={...base.combat,...(s.combat&&typeof s.combat==='object'?s.combat:{})};
 const raw=Array.isArray(s.combat.list)?s.combat.list:[];
 s.combat.list=raw.filter(f=>f&&f.id&&f.name).map(f=>{const maxHp=Math.max(1,Number(f.maxHp)||1);return {...f,name:String(f.name).slice(0,100),maxHp,hp:clamp(f.hp,0,maxHp),tempHp:clamp(f.tempHp,0,99999),initiative:Number(f.initiative)||0,conditions:Array.isArray(f.conditions)?f.conditions.filter(c=>CONDITIONS.includes(c)):[],effects:Array.isArray(f.effects)?f.effects.filter(e=>e&&e.id&&e.name).map(e=>({...e,name:String(e.name).slice(0,80),remaining:e.remaining==null?null:clamp(e.remaining,0,999)})):[],notes:String(f.notes||'').slice(0,3000),concentrating:!!f.concentrating,isPlayer:!!f.isPlayer};});
 s.combat.round=Math.max(1,Number(s.combat.round)||1);
 s.combat.turn=s.combat.list.length?clamp(s.combat.turn,0,s.combat.list.length-1):0;
 s.combat.log=Array.isArray(s.combat.log)?s.combat.log.slice(0,120):[];
 return s;
}
let state;try{state=migrate(JSON.parse(localStorage.getItem(STORE)||'null'))}catch{state=emptyState()}
let favoritesOnly=false;let monsters=[],monsterById=new Map(),view='dashboard',selectedId=null,filter={q:'',cr:'',type:'',sort:'cr',page:1},builderFilter={q:'',type:'',cr:''},ui={};
const el=id=>document.getElementById(id);
const localSave=()=>{localStorage.setItem(STORE,JSON.stringify(state));queueCloudSave(state)};
function overwriteState(x){state=migrate(x);localStorage.setItem(STORE,JSON.stringify(state));render()}
function save(){localSave();render()}
function toast(t,error=false){const x=document.createElement('div');x.className='toast'+(error?' error':'');x.textContent=t;el('toastRoot').appendChild(x);setTimeout(()=>x.remove(),3800)}
function allMonsters(){return monsters.concat(state.customMonsters)}
function getMonster(id){return monsterById.get(id)||state.customMonsters.find(m=>m.id===id)}
function xp(m){return CR_XP[m?.cr]??0}
function titleOf(m){return m?.name||'Criatura'}
function pseudoPT(m){if(!m)return '';const p=m.name.replace(/[^A-Za-z]/g,'');return m.name+' '+(m.name_en||'')+' '+(NAME_PT[p]||'')}
function speed(m){const sp=m?.stat_block_json?.speed||{};return Object.entries(sp).filter(([k,v])=>typeof v==='number').map(([k,v])=>({walk:'Andar',fly:'Voo',swim:'Natação',climb:'Escalada',burrow:'Escavação'}[k]||k)+': '+Math.round(v*.3*10)/10+' m').join(' • ')||'—'}
function budget(){return [0,1,2].map(i=>state.party.reduce((sum,lv)=>sum+BUDGET[lv-1][i],0))}
function groupXp(){return state.encounter.reduce((sum,x)=>sum+xp(getMonster(x.id))*x.qty,0)}
function difficulty(x,b=budget()){return x<=0?'Sem criaturas':x<=b[0]?'Baixa':x<=b[1]?'Moderada':x<=b[2]?'Alta':'Acima de alta'}

function setMenu(open){
 const nav=el('sideNav'),backdrop=el('navBackdrop');
 if(!nav||!backdrop)return;
 nav.classList.toggle('mobile-open',!!open);
 backdrop.hidden=!open;
 document.body?.classList?.toggle('nav-open',!!open);
}
function go(to){if(!['dashboard','bestiary','builder','combat','campaigns','settings'].includes(to))return;setMenu(false);view=to;filter.page=1;window.scrollTo({top:0,behavior:'instant'});render()}
function pageHeader(kicker,title,subtitle,buttons=''){return `<div class="eyebrow">${esc(kicker)}</div><div class="section-header" style="margin-top:0"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="actions">${buttons}</div></div>`}
function footer(){return `<div class="footnote">D&D System Reference Document 5.2.1 © Wizards of the Coast LLC — <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a>. Dados estruturados republicados via <a href="https://github.com/adkinn/srd-5.2.1" target="_blank" rel="noopener">Open5e/adkinn</a>. Interface e fichas disponíveis em PT-BR após preparação estática do bestiário. Tradução não oficial, sem serviços de tradução no navegador. <a href="https://www.dndbeyond.com/sources/dnd/srd-5.2.1" target="_blank" rel="noopener">Fonte oficial</a>. Balanceamento é uma estimativa, não uma garantia.</div>`}
function navbar(){if(document.body)document.body.dataset.section=view;const names={dashboard:'Visão geral',bestiary:'Bestiário',builder:'Criador de encontros',combat:'Mesa de combate',campaigns:'Campanhas',settings:'Configurações'};el('currentCrumb').textContent=names[view];document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));el('countMonsters').textContent=allMonsters().length;cloudStatus();}
function render(){navbar();const content={dashboard:dashboard,bestiary:bestiary,builder:builder,combat:combat,campaigns:campaigns,settings:settings};el('view').innerHTML=(content[view]||dashboard)()+footer();}

function uiIcon(key){
 const name=['home','beast','swords','dice','book','gear','search','shield','people','arrow'].includes(key)?key:'shield';
 return '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="/assets/atlas-icons.svg#'+name+'"></use></svg>';
}
function dashboard(){
 const camps=state.campaigns.length;
 const active=state.combat.list.length;
 const qty=state.encounter.reduce((x,i)=>x+i.qty,0);
 const specs=[
  {type:'creatures',target:'bestiary',icon:'beast',label:'CRIATURAS DISPONÍVEIS',value:fmt(allMonsters().length),meta:'Fichas SRD + personalizadas'},
  {type:'encounters',target:'builder',icon:'swords',label:'ENCONTRO PREPARADO',value:fmt(qty),meta:'Criaturas na sua seleção'},
  {type:'battle',target:'combat',icon:'dice',label:'EM COMBATE',value:fmt(active),meta:'Combatentes na iniciativa'},
  {type:'stories',target:'campaigns',icon:'book',label:'SUAS CAMPANHAS',value:fmt(camps),meta:'Mundos e aventuras'}
 ];
 const feature=(target,icon,title,summary,button)=>`<div class="atlas-feature">
   <div class="feature-symbol">${uiIcon(icon)}</div>
   <div class="feature-content"><b>${esc(title)}</b><small>${esc(summary)}</small></div>
   <button class="btn sm feature-button" type="button" data-view="${target}">${esc(button)} ${uiIcon('arrow')}</button>
 </div>`;
 return `<div class="atlas-home">
   <section class="atlas-hero" aria-labelledby="atlas-hero-title">
     <div class="hero-scene" aria-hidden="true"></div>
     <div class="hero-copy">
      <div class="atlas-kicker"><span class="ornament">✣</span><span>CENTRAL DO MESTRE</span><span class="kicker-line"></span></div>
      <h1 id="atlas-hero-title">Bem-vindo à sua<br><span>Central do Mestre.</span></h1>
      <p>Crie mundos, encontre criaturas e conduza aventuras inesquecíveis com suas ferramentas de mestre reunidas em um só lugar.</p>
      <div class="atlas-hero-actions">
       <button class="btn atlas-primary" data-view="bestiary" type="button">${uiIcon('beast')} Explorar bestiário ${uiIcon('arrow')}</button>
       <button class="btn atlas-secondary" data-view="builder" type="button">${uiIcon('swords')} Criar encontro</button>
      </div>
     </div>
     <div class="hero-quote" aria-hidden="true"><span>“Grandes histórias<br>começam com um<br>bom Mestre.”</span><small>✦ ━ ✦</small></div>
   </section>
   <div class="grid stats atlas-stats" aria-label="Resumo das ferramentas">
    ${specs.map(x=>`<button class="atlas-stat atlas-stat--${x.type}" type="button" data-view="${x.target}" aria-label="${esc(x.label+', '+x.value+'. Abrir '+x.target)}">
      <div class="atlas-stat-top"><span class="atlas-stat-glyph">${uiIcon(x.icon)}</span><small>${esc(x.label)}</small></div>
      <strong>${x.value}</strong>
      <div class="atlas-stat-bottom"><span>${esc(x.meta)}</span><span class="stat-arrow">${uiIcon('arrow')}</span></div>
    </button>`).join('')}
   </div>
   <div class="atlas-home-panels">
     <section class="atlas-panel atlas-continue">
       <div class="panel-title"><h2>Comece de onde parou</h2><span class="panel-line">✣</span></div>
       ${feature('bestiary','beast','Bestiário completo','Pesquise por nome, ND e tipo. Consulte atributos, ataques e resistências.','Abrir')}
       ${feature('builder','swords','Criador de encontros','Prepare desafios e compare orçamentos de XP do seu grupo.','Preparar')}
       ${feature('combat','dice','Mesa de combate','Controle iniciativas, PV, condições e rodadas em um só lugar.','Abrir')}
       ${feature('campaigns','book','Suas campanhas','Organize histórias e anotações para a próxima sessão.','Explorar')}
     </section>
     <section class="atlas-panel atlas-summary">
       <div class="panel-title"><h2>Resumo da sua mesa</h2><small>D&D 5.5e • SRD 5.2.1</small></div>
       <div class="summary-list">
         <p>Grupo atual: <strong>${state.party.length} aventureiros</strong>, níveis ${esc(state.party.join(', '))}.</p>
         <p>Encontro preparado: <strong>${fmt(groupXp())} XP</strong> <span class="pill gold">${difficulty(groupXp())}</span></p>
         <p>Rodada do combate: <strong>${state.combat.round}</strong></p>
       </div>
       <div class="summary-notice">${uiIcon('shield')}<p>As fichas são baseadas no SRD 5.2.1. Revise a dificuldade antes de iniciar um combate.</p></div>
       <div class="summary-actions">
        <button class="btn gold" data-view="combat">Retomar combate ${uiIcon('arrow')}</button>
        <button class="btn" data-action="backup">Exportar backup</button>
       </div>
       <div class="summary-license">Seu grimório de mesa • Dados salvos automaticamente</div>
     </section>
   </div>
  </div>`;
}

const CREATURE_ICONS=['aberration','beast','celestial','construct','dragon','elemental','fey','fiend','giant','humanoid','monstrosity','ooze','plant','undead'];
function artworkURL(m){
  const raw=String((state.creatureImages||{})[m?.id]||m?.image_url||'').trim();
  try{const u=new URL(raw);return u.protocol==='https:'?u.href:''}catch{return ''}
}
function creaturePortrait(m){
  if(!m)return '';
  const key=CREATURE_ICONS.includes(m.type)?m.type:'monstrosity',url=artworkURL(m);
  return `<div class="creature-portrait ${url?'with-image':''}" data-type="${esc(key)}" role="img" aria-label="${esc(url?'Imagem associada à criatura '+m.name:'Ilustração temática de '+(TYPE[key]||key))}">
    <svg class="art-sigil" viewBox="0 0 240 240" aria-hidden="true"><use href="/assets/creature-symbols.svg#${esc(key)}"></use></svg>
    ${url?`<img class="creature-img" src="${esc(url)}" loading="lazy" alt="${esc('Arte associada a '+m.name)}" referrerpolicy="no-referrer">`:''}
    <div class="portrait-label"><strong>${esc(m.name)}</strong><span>${url?'IMAGEM ASSOCIADA PELO MESTRE':'SÍMBOLO ORIGINAL • '+esc(TYPE[key]||'Criatura')}</span></div>
  </div>`;
}
function percentHP(f){return clamp(Math.round(Number(f?.hp||0)/Math.max(1,Number(f?.maxHp||1))*100),0,100)}
function hpLevel(f){const p=percentHP(f);return p<=25?'low':p<=55?'mid':''}
function healthBar(f){return `<div class="hpbar" role="progressbar" aria-label="Pontos de vida" aria-valuemin="0" aria-valuemax="${Number(f.maxHp)||1}" aria-valuenow="${Number(f.hp)||0}"><span class="${hpLevel(f)}" style="width:${percentHP(f)}%"></span></div>`}
function applyHitPointDelta(f,difference){
  if(!f||!Number.isFinite(difference))return;
  if(difference<0){
    let remaining=-difference,temporary=Math.max(0,Number(f.tempHp)||0);
    const absorbed=Math.min(remaining,temporary);
    f.tempHp=temporary-absorbed;remaining-=absorbed;
    f.hp=clamp((Number(f.hp)||0)-remaining,0,Math.max(1,Number(f.maxHp)||1));
  }else{
    f.hp=clamp((Number(f.hp)||0)+difference,0,Math.max(1,Number(f.maxHp)||1));
  }
}
function changeHitPoints(f,difference){
  if(!f||!Number.isFinite(difference))return;
  ui.lastHp={fighterId:f.id,hp:Number(f.hp)||0,tempHp:Number(f.tempHp)||0};
  applyHitPointDelta(f,difference);
  addCombatLog(f.name+' '+(difference<0?'sofreu '+(-difference)+' de dano':'recuperou '+difference+' PV')+'.');selectedId=f.id;save();
}
function combatOpenIds(){
  const valid=new Set(state.combat.list.map(f=>f.id));
  ui.combatOpenIds=Array.isArray(ui.combatOpenIds)?ui.combatOpenIds.filter(id=>valid.has(id)):[];
  return ui.combatOpenIds;
}
function combatTargetIds(){
  const valid=new Set(state.combat.list.map(f=>f.id));
  ui.combatTargetIds=Array.isArray(ui.combatTargetIds)?ui.combatTargetIds.filter(id=>valid.has(id)):[];
  return ui.combatTargetIds;
}
function setCombatOpen(id,on){
  const set=new Set(combatOpenIds());on?set.add(id):set.delete(id);ui.combatOpenIds=[...set];
}
function setCombatTarget(id,on){
  const set=new Set(combatTargetIds());on?set.add(id):set.delete(id);ui.combatTargetIds=[...set];
}
function batchHitPoints(difference,label){
  const ids=combatTargetIds(),fighters=ids.map(id=>state.combat.list.find(f=>f.id===id)).filter(Boolean);
  if(!fighters.length){toast('Selecione ao menos um alvo no painel tático.',true);return}
  if(!Number.isFinite(difference)||difference===0)return;
  ui.lastBatchHp=fighters.map(f=>({id:f.id,hp:Number(f.hp)||0,tempHp:Number(f.tempHp)||0}));
  fighters.forEach(f=>applyHitPointDelta(f,difference));
  addCombatLog(label+': '+fighters.length+' alvo(s), '+Math.abs(difference)+' PV por alvo.');
  localSave();render();toast(label+' aplicado em '+fighters.length+' alvo(s)');
}

function monsterCard(m){return `<article class="monster-card"><div class="atlas-monster-art">${creaturePortrait(m)}</div><div class="card-top"><div><div class="monster-meta"><div><div class="eyebrow">${esc(TYPE[m.type]||m.type)}</div><h3>${esc(titleOf(m))}</h3><p>${esc(SIZE[m.size]||m.size)}</p></div></div></div><span class="pill gold">ND ${esc(m.cr)}</span></div><div class="facts"><div><b>${esc(m.armor_class)}</b><small>CA</small></div><div><b>${esc(m.hp_max)}</b><small>PV</small></div><div><b>${fmt(xp(m))}</b><small>XP</small></div></div><div class="card-actions"><button class="btn sm" data-action="details" data-id="${esc(m.id)}">Ficha e imagem</button><button class="btn sm gold" data-action="add-encounter" data-id="${esc(m.id)}">+ Encontro</button></div></article>`}
function sortedFiltered(q='',cr='',type='',sort='cr'){const query=norm(q);let ms=allMonsters().filter(m=>(!query||norm(m.name+' '+(m.name_en||'')+' '+pseudoPT(m)).includes(query))&&(!cr||m.cr===cr)&&(!type||m.type===type));return ms.sort((a,b)=>sort==='name'?a.name.localeCompare(b.name):sort==='hp'?b.hp_max-a.hp_max:(a.cr_numeric-b.cr_numeric)||a.name.localeCompare(b.name))}
function cardsMarkup(){const ms=sortedFiltered(filter.q,filter.cr,filter.type,filter.sort);return `<div class="split" style="margin:15px 0"><span class="result-info">${fmt(ms.length)} resultados • ${Math.min(ms.length,filter.page*36)} exibidos</span><button class="btn sm outline" data-action="new-monster">+ Criar monstro</button></div>${ms.length?`<div class="grid monster-grid">${ms.slice(0,filter.page*36).map(monsterCard).join('')}</div>${ms.length>filter.page*36?'<div style="text-align:center;margin:20px"><button class="btn" data-action="more-monsters">Carregar mais criaturas ↓</button></div>':''}`:`<div class="empty"><div class="symbol">♜</div><h3>Nenhuma criatura encontrada</h3><p>Altere os filtros ou cadastre sua própria criatura.</p><button class="btn" data-action="clear-filter">Limpar filtros</button></div>`}`}
function bestiary(){const types=[...new Set(allMonsters().map(m=>m.type))].sort();const crs=[...new Set(allMonsters().map(m=>m.cr))].sort((a,b)=>(CR_XP[a]||0)-(CR_XP[b]||0));return pageHeader('ARQUIVO DAS CRIATURAS','Bestiário','Fichas detalhadas do SRD 5.2.1, com filtros rápidos por nome, desafio e tipo.',`<button class="btn outline" data-action="new-monster">+ Monstro personalizado</button>`)+`<div class="filter-bar"><input class="field search" id="monsterSearch" aria-label="Buscar criatura" placeholder="⌕ Buscar por nome (português ou inglês)..." value="${esc(filter.q)}"><select class="select" id="monsterCR" aria-label="Filtrar por ND"><option value="">Todos os NDs</option>${crs.map(c=>`<option value="${esc(c)}" ${filter.cr===c?'selected':''}>ND ${esc(c)}</option>`).join('')}</select><select class="select" id="monsterType"><option value="">Todos os tipos</option>${types.map(t=>`<option value="${esc(t)}" ${filter.type===t?'selected':''}>${esc(TYPE[t]||t)}</option>`).join('')}</select><select class="select" id="monsterSort"><option value="cr" ${filter.sort==='cr'?'selected':''}>Menor ND</option><option value="name" ${filter.sort==='name'?'selected':''}>Nome A–Z</option><option value="hp" ${filter.sort==='hp'?'selected':''}>Mais PV</option></select></div><div id="monsterCards">${cardsMarkup()}</div>`}
function updateCards(){if(el('monsterCards'))el('monsterCards').innerHTML=cardsMarkup()}
function propLine(k,v){if(!v||(Array.isArray(v)&&!v.length)||(typeof v==='object'&&!Object.keys(v).length))return '';let val=Array.isArray(v)?v.join(', '):typeof v==='object'?Object.entries(v).map(([a,b])=>translateField(a)+': '+((typeof b==='number')?sign(b):String(b))).join(' • '):String(v);return `<div><b>${esc(k)}:</b> ${esc(val)}</div>`}
function rollActions(m){
 const actions=m?.stat_block_json?.actions||[];
 return '<section class="entry-group"><h4>Rolagens rápidas da criatura</h4><div class="atlas-roll-actions">'+actions.map((a,i)=>{
 const text=String(a.description||'');
 const damage=text.match(/(\d{1,2}d\d{1,3}(?:\s*[+-]\s*\d{1,3})?)/i);
 return damage?'<button class="btn sm outline" data-action="roll-monster-damage" data-id="'+esc(m.id)+'" data-index="'+i+'">🎲 '+esc(a.name)+' — '+esc(damage[1])+'</button>':'';
 }).join('')+'</div></section>';
}
function statBlock(m){if(!m)return '<p>Criatura não encontrada.</p>';const sb=m.stat_block_json||{};const attr=sb.ability_scores||{};const pairs=[['FOR','str'],['DES','dex'],['CON','con'],['INT','int'],['SAB','wis'],['CAR','cha']];
const entries=(label,items)=>Array.isArray(items)&&items.length?`<section class="entry-group"><h4>${esc(label)}</h4>${items.map(x=>`<p class="entry"><b>${esc(x.name)}.</b> ${esc(x.description)}</p>`).join('')}</section>`:'';
let legends='';if(sb.legendary_actions?.actions?.length){legends=entries('Ações lendárias',sb.legendary_actions.actions)+`<p class="caption">${esc(sb.legendary_actions.description||'')}</p>`}
return `<div class="statblock"><div class="eyebrow">${esc(m.source==='personalizado'?'CRIATURA PERSONALIZADA':'D&D SRD 5.2.1')}</div><h2>${esc(m.name)}</h2><div class="subline">${esc((SIZE[m.size]||m.size)+' '+(TYPE[m.type]||m.type))} • ND ${esc(m.cr)} (${fmt(xp(m))} XP)</div><div class="basicstats"><div><small>CLASSE DE ARMADURA</small><b>${esc(m.armor_class)}</b></div><div><small>PONTOS DE VIDA</small><b>${esc(m.hp_max)}</b><small>${esc(m.hp_formula||'')}</small></div><div><small>INICIATIVA</small><b>${sign(m.initiative_modifier)}</b></div></div>
<div class="abilities">${pairs.map(([l,k])=>`<div><b>${l}</b><strong>${esc(attr[k]??10)}</strong><small>${modifier(attr[k]??10)}</small></div>`).join('')}</div>
<div class="properties">${propLine('Deslocamento',speed(m))}${propLine('Testes de resistência',sb.saving_throws)}${propLine('Perícias',sb.skills)}${propLine('Vulnerabilidades',sb.damage_vulnerabilities)}${propLine('Resistências',sb.damage_resistances)}${propLine('Imunidades a dano',sb.damage_immunities)}${propLine('Imunidades a condições',sb.condition_immunities)}${propLine('Sentidos',sb.senses)}${propLine('Idiomas',sb.languages)}</div>
${rollActions(m)}${entries('Características',sb.traits)}${entries('Ações',sb.actions)}${entries('Ações bônus',sb.bonus_actions)}${entries('Reações',sb.reactions)}${legends}
<div class="footnote">Fonte: ${esc(m.source||'SRD 5.2.1')} • ${esc(m.attribution||'Criação própria')}. Tradução brasileira da base SRD elaborada previamente; confira CDs, dados e termos técnicos na fonte original. Não é uma tradução oficial.</div></div>`}
function openModal(body,drawer=true,extra=''){el('modalRoot').innerHTML=`<div class="modal-backdrop" data-close="1"><div class="${drawer?'drawer':'dialog'} ${esc(extra)}" role="dialog" aria-modal="true">${body}</div></div>`}
function closeModal(){el('modalRoot').innerHTML=''}

function monsterModal(id){
 const m=getMonster(id);if(!m)return;
 const hasArt=!!artworkURL(m);
 openModal(`<div class="sheet-top">
   <div><div class="eyebrow">PÁGINA DO BESTIÁRIO</div><span class="pill gold">ND ${esc(m.cr)} • ${esc(TYPE[m.type]||m.type)}</span></div>
   <button class="close" data-action="close" aria-label="Fechar ficha">×</button>
  </div>
  <div class="sheet-layout">
   <aside class="sheet-aside">
     ${creaturePortrait(m)}
     <div class="side-facts"><div><small>CA</small><b>${esc(m.armor_class)}</b></div><div><small>PV</small><b>${esc(m.hp_max)}</b></div><div><small>ND</small><b>${esc(m.cr)}</b></div></div>
     <div class="sheet-memo"><button class="btn outline" data-action="toggle-favorite" data-id="${esc(m.id)}">${state.favorites.includes(m.id)?"★ Favorito":"☆ Adicionar aos favoritos"}</button>
       <div class="eyebrow">ADICIONAR À MESA</div>
       <h3>${esc(m.name)}</h3>
       <p>${esc(speed(m))}</p>
       <div class="actions">
         <button class="btn gold" data-action="add-encounter" data-id="${esc(m.id)}">+ Encontro</button>
         <button class="btn outline" data-action="add-combat" data-id="${esc(m.id)}">⚔ Combate</button>
       </div>
       <button class="btn" data-action="set-monster-image" data-id="${esc(m.id)}">▧ ${hasArt?'Trocar imagem':'Adicionar imagem da criatura'}</button>
       ${hasArt?`<button class="btn ghost" data-action="remove-monster-image" data-id="${esc(m.id)}">Remover imagem associada</button>`:''}
       <p class="caption">Imagens adicionadas pelo mestre precisam ter permissão de uso. Quando não há imagem, usamos um símbolo original para o tipo de criatura.</p>
     </div>
   </aside>
   <div class="sheet-book">${statBlock(m)}</div>
  </div>`,true,'sheet-drawer');
}

function builder(){
 const budgets=budget(),total=groupXp(),sel=state.encounter;
 const creatureCount=sel.reduce((n,x)=>n+Number(x.qty||0),0);
 const chosen=sel.map(x=>({item:x,monster:getMonster(x.id)})).filter(x=>x.monster);
 const summary=`<div class="encounter-summary">
   <div><small>GRUPO</small><strong>${state.party.length}</strong><span>personagens</span></div>
   <div><small>INIMIGOS</small><strong>${creatureCount}</strong><span>criaturas</span></div>
   <div><small>XP DO ENCONTRO</small><strong>${fmt(total)}</strong><span>pontos de experiência</span></div>
   <div><small>DIFICULDADE</small><strong>${difficulty(total,budgets)}</strong><span>estimativa atual</span></div>
 </div>`;
 return pageHeader('PREPARAÇÃO DE AVENTURAS','Criador de encontros','Monte o grupo e as criaturas em uma área maior, com controles rápidos para preparar a batalha.',`<button class="btn encounter-big-btn outline" data-action="save-encounter" ${!sel.length?'disabled':''}>Salvar encontro</button><button class="btn encounter-big-btn gold" data-action="start-combat" ${!sel.length?'disabled':''}>⚔ Iniciar combate</button>`)+summary+`
 <div class="encounter-command">
  <section class="panel encounter-party-panel">
   <div class="encounter-panel-head"><div><div class="eyebrow">1 · GRUPO</div><h2>Aventureiros</h2></div><span class="pill blue">${state.party.length} jogadores</span></div>
   <p class="caption">Ajuste os níveis para calcular os limites de XP e a dificuldade.</p>
   <div class="encounter-party-tools"><button class="btn encounter-square-btn" data-action="party-remove" ${state.party.length<=1?'disabled':''} aria-label="Remover personagem">−</button><div class="levels encounter-levels">${state.party.map((l,i)=>`<label><span>P${i+1}</span><input aria-label="Nível personagem ${i+1}" type="number" min="1" max="20" value="${l}" data-party-index="${i}"></label>`).join('')}</div><button class="btn encounter-square-btn gold" data-action="party-add" ${state.party.length>=12?'disabled':''} aria-label="Adicionar personagem">+</button></div>
   <label class="form-label" for="difficulty">Dificuldade desejada</label>
   <select id="difficulty" class="select encounter-select"><option value="low" ${state.difficulty==='low'?'selected':''}>Baixa</option><option value="moderate" ${state.difficulty==='moderate'?'selected':''}>Moderada</option><option value="high" ${state.difficulty==='high'?'selected':''}>Alta</option></select>
   <div class="hr"></div>
   <div class="encounter-budget-title"><h3>Orçamento de XP</h3><span class="pill gold">${difficulty(total,budgets)}</span></div>
   <div class="xp-grid encounter-xp-grid">${['Baixa','Moderada','Alta'].map((x,i)=>`<div><small>${x}</small><b>${fmt(budgets[i])}</b></div>`).join('')}</div>
   <div class="meter encounter-meter"><div style="width:${Math.min(100,Math.round(total/Math.max(budgets[2],1)*100))}%"></div></div>
   <div class="split"><span class="caption">XP selecionado</span><strong>${fmt(total)} XP</strong></div>
   <button class="btn gold full encounter-big-btn" data-action="generate-suggestions">✧ Recomendar criaturas</button>
  </section>

  <section class="panel encounter-selection-panel">
   <div class="encounter-panel-head"><div><div class="eyebrow">2 · COMPOSIÇÃO</div><h2>Criaturas escolhidas</h2></div><button class="btn ghost encounter-big-btn" data-action="clear-encounter" ${!sel.length?'disabled':''}>Limpar</button></div>
   <div id="encounterList" class="encounter-list-large">${chosen.length?chosen.map(({item:x,monster:m})=>`
    <article class="encounter-creature-row">
      <div class="encounter-creature-main"><div class="encounter-mini-art">${creaturePortrait(m)}</div><div><b>${esc(m.name)}</b><small>ND ${esc(m.cr)} · ${fmt(xp(m))} XP cada · ${fmt(xp(m)*x.qty)} XP total</small></div></div>
      <div class="counter encounter-counter"><button data-action="dec-encounter" data-id="${esc(m.id)}" aria-label="Remover uma criatura">−</button><b>${x.qty}</b><button data-action="add-encounter" data-id="${esc(m.id)}" aria-label="Adicionar uma criatura">+</button></div>
      <button class="btn encounter-row-btn" data-action="details" data-id="${esc(m.id)}">Ver ficha</button>
    </article>`).join(''):`<div class="empty encounter-empty"><div class="symbol">⚔</div><h3>Nenhum monstro selecionado</h3><p>Escolha criaturas no Bestiário ou use as recomendações abaixo.</p><button class="btn gold encounter-big-btn" data-view="bestiary">Abrir bestiário</button></div>`}</div>
   ${total?warningMarkup(total):''}
   <div class="encounter-primary-actions"><button class="btn gold encounter-big-btn" data-action="start-combat" ${!sel.length?'disabled':''}>⚔ Levar para o combate</button><button class="btn outline encounter-big-btn" data-action="save-encounter" ${!sel.length?'disabled':''}>Salvar composição</button></div>
  </section>
 </div>

 <section class="panel encounter-recommend-panel">
   <div class="encounter-panel-head"><div><div class="eyebrow">3 · RECOMENDAÇÕES</div><h2>Encontrar criaturas</h2></div><span class="caption">Baseado no XP e nos filtros</span></div>
   <div class="filter-bar encounter-filters"><input id="builderQuery" class="field search" value="${esc(builderFilter.q)}" placeholder="Buscar criatura específica"><select class="select" id="builderType"><option value="">Qualquer tipo</option>${Object.entries(TYPE).map(([k,v])=>`<option value="${esc(k)}" ${builderFilter.type===k?'selected':''}>${esc(v)}</option>`).join('')}</select><select class="select" id="builderCR"><option value="">Todos os NDs</option>${Object.keys(CR_XP).map(k=>`<option value="${k}" ${builderFilter.cr===k?'selected':''}>ND ${k}</option>`).join('')}</select></div>
   <div id="suggestionContainer" class="encounter-suggestions">${suggestionsMarkup()}</div>
 </section>
 ${state.savedEncounters.length?`<section class="panel encounter-saved-panel"><div class="encounter-panel-head"><div><div class="eyebrow">ARQUIVO</div><h2>Encontros salvos</h2></div><span class="pill blue">${state.savedEncounters.length}</span></div><div class="encounter-saved-grid">${state.savedEncounters.slice(-12).reverse().map(x=>`<article class="encounter-saved-card"><div><b>${esc(x.name)}</b><small>${fmt(x.xp)} XP · ${esc(x.date||'—')}</small></div><div class="actions"><button class="btn gold encounter-row-btn" data-action="load-encounter" data-id="${esc(x.id)}">Carregar</button><button class="btn danger encounter-row-btn" data-action="delete-encounter" data-id="${esc(x.id)}">Excluir</button></div></article>`).join('')}</div></section>`:''}
 `;
}
function warningMarkup(total){const n=state.encounter.reduce((a,b)=>a+b.qty,0);let msgs=[];if(total>budget()[2])msgs.push('Encontro acima do orçamento alto. Revise com cuidado.');if(n>state.party.length*2)msgs.push('Muitos oponentes: a economia de ações pode favorecer os monstros.');if(state.encounter.some(x=>getMonster(x.id)?.cr_numeric>=Math.min(...state.party)))msgs.push('Ao menos um inimigo possui ND igual ou maior que o nível do aventureiro menos experiente. Revise efeitos de incapacitação, dano por rodada e resistências.');return msgs.length?`<div class="notice" style="margin:17px 0"><b>⚠ Avisos táticos</b><br>${msgs.map(esc).join('<br>')}</div>`:''}
function suggestCore(){const target=budget()[{low:0,moderate:1,high:2}[state.difficulty]??1];const matches=allMonsters().filter(m=>xp(m)>0&&xp(m)<=target*1.05&&(!builderFilter.type||m.type===builderFilter.type)&&(!builderFilter.cr||m.cr===builderFilter.cr)&&(!builderFilter.q||norm(m.name+' '+(m.name_en||'')+' '+pseudoPT(m)).includes(norm(builderFilter.q))));const min=Math.min(...state.party),maxN=state.party.length*2;let proposals=[];for(const m of matches){for(let qty=1;qty<=Math.min(maxN,8);qty++){const cost=xp(m)*qty;const delta=Math.abs(cost-target);if(cost<=target*1.09&&cost>=target*.35){proposals.push({id:m.id,qty,cost,delta,score:delta+Math.max(0,m.cr_numeric-min)*target*.3})}}}
return proposals.sort((a,b)=>a.score-b.score).slice(0,8)}
function suggestionsMarkup(){const arr=suggestCore();return arr.length?arr.map(x=>{const m=getMonster(x.id);return `<div class="feature"><span>♜</span><div><b>${x.qty} × ${esc(m.name)}</b><small>ND ${esc(m.cr)} • ${fmt(x.cost)} XP • ${difficulty(x.cost)}</small></div><button class="btn sm outline" data-action="apply-suggestion" data-id="${esc(x.id)}" data-qty="${x.qty}">Usar</button></div>`}).join(''):'<div class="empty"><p>Nenhuma opção atende aos filtros e ao orçamento. Ajuste o tipo ou a dificuldade.</p></div>'}
function sortFighters(){state.combat.list.sort((a,b)=>Number(b.initiative)-Number(a.initiative)||a.name.localeCompare(b.name))}
function addFighter(m){const activeId=state.combat.list[state.combat.turn]?.id;const init=roll()+Number(m.initiative_modifier||0);const existing=state.combat.list.filter(x=>x.monsterId===m.id).length;state.combat.list.push({id:uid(),monsterId:m.id,name:m.name+(existing?' '+(existing+1):''),hp:m.hp_max,maxHp:m.hp_max,tempHp:0,initiative:init,conditions:[],effects:[],concentrating:false,notes:'',isPlayer:false});sortFighters();if(activeId){const next=state.combat.list.findIndex(x=>x.id===activeId);if(next>=0)state.combat.turn=next}toast('Criatura adicionada ao combate: '+m.name)}

function advanceEffects(f){
 if(!f||!Array.isArray(f.effects))return;
 const expired=[];
 f.effects=f.effects.filter(e=>{
  if(e.remaining==null)return true;
  e.remaining=Math.max(0,Number(e.remaining)-1);
  if(e.remaining===0){expired.push(e.name);return false}
  return true;
 });
 expired.forEach(name=>addCombatLog(f.name+': efeito '+name+' terminou.'));
}
function combatControl(f,active){
 if(!f)return '';
 const pct=percentHP(f),temp=Math.max(0,Number(f.tempHp)||0),numberConditions=f.conditions?.length||0;
 const conditionStatus=pct<=0?'Sem PV':pct<=25?'Crítico':pct<=55?'Ferido':'Estável';
 const statusColor=pct<=25?'#ffa199':pct<=55?'#ffd08f':'#a7e6bd';
 const buttons=(values,positive)=>values.map(n=>
  '<button type="button" data-action="quick-hp" data-amount="'+(positive?n:-n)+'" aria-label="'+(positive?'Curar ':'Aplicar ')+n+(positive?' pontos de vida':' pontos de dano')+'">'+(positive?'+':'−')+n+'</button>').join('');
 const tiles=CONDITIONS.map(c=>{
  const on=f.conditions?.includes(c)||false;
  return '<button type="button" class="condition-tile'+(on?' on':'')+'" data-action="toggle-condition" data-condition="'+esc(c)+'" aria-pressed="'+on+'"><span class="condition-indicator" aria-hidden="true">'+(on?'✓':'')+'</span>'+esc(c)+'</button>';
 }).join('');
 return [
  '<section class="panel tight combat-control" aria-label="Controle de combate">',
  '<div class="split"><h3 style="margin:0">Controle de combate</h3><span class="pill '+(f.id===active?.id?'red':'blue')+'">'+(f.id===active?.id?'Turno atual':'Selecionado')+'</span></div>',
  '<label class="form-label" for="fighterName">Participante</label>',
  '<input id="fighterName" class="field wide" autocomplete="off" value="'+esc(f.name)+'">',
  '<div class="hp-console">',
    '<div class="split"><span class="hp-title">PONTOS DE VIDA</span><span class="hp-status" style="color:'+statusColor+'">'+conditionStatus+'</span></div>',
    '<div class="hp-count" aria-live="polite"><strong>'+esc(f.hp)+'</strong><small>/ '+esc(f.maxHp)+' PV</small></div>',
    healthBar(f),
    '<div class="split" style="margin-top:9px"><span class="caption">Vida restante</span><strong class="caption">'+pct+'%</strong></div>',
    '<div class="tempbar" aria-label="Pontos de vida temporários"><span style="width:'+clamp(Math.round(100*temp/Math.max(1,f.maxHp)),0,100)+'%"></span></div>',
    '<span class="caption">PV temporários: <b style="color:#c5ddff">'+temp+'</b> — absorvem dano primeiro</span>',
  '</div>',
  '<div class="control-subtitle">Aplicar dano rápido</div>',
  '<div class="hp-quick" role="group" aria-label="Dano rápido">'+buttons([1,5,10,20],false)+'</div>',
  '<div class="control-subtitle">Aplicar cura rápida</div>',
  '<div class="hp-quick heal" role="group" aria-label="Cura rápida">'+buttons([1,5,10,20],true)+'</div>',
  '<label class="form-label" for="damageAmount">Valor personalizado</label>',
  '<div class="manual-hp">',
    '<input id="damageAmount" class="field" type="number" inputmode="numeric" min="0" max="99999" value="5" aria-label="Valor personalizado">',
    '<button class="btn danger" data-action="damage">− Dano</button>',
    '<button class="btn gold" data-action="heal">+ Cura</button>',
  '</div>',
  '<div class="actions" style="margin-top:9px"><button class="btn sm ghost" data-action="undo-hp" '+(ui.lastHp?.fighterId===f.id?'':'disabled')+'>↶ Desfazer alteração de PV</button></div>',
  '<div class="hr"></div>',
  '<div class="control-subtitle">Efeitos com duração</div>',
  '<div class="atlas-effects">'+(f.effects||[]).map(e=>'<div class="atlas-effect"><b>'+esc(e.name)+'</b><small>'+(e.remaining==null?'Indefinido':e.remaining+' turno(s)')+'</small><button class="btn sm ghost" data-action="remove-effect" data-effect="'+esc(e.id)+'">×</button></div>').join('')+'</div>',
  '<div class="manual-hp"><input id="effectName" class="field" placeholder="Nome do efeito"><input id="effectTurns" class="field" type="number" min="0" max="999" value="1" aria-label="Duração em turnos, zero indefinido"><button class="btn gold" data-action="add-effect">Adicionar</button></div>',
  '<button class="btn sm outline" data-action="toggle-concentration">'+(f.concentrating?'✓ Encerrar concentração':'◇ Iniciar concentração')+'</button>',
  '<p class="caption">A duração diminui ao terminar o turno do participante. Ajuste conforme a regra do efeito.</p>',
  '<div class="small-fields">',
    '<label>PV atuais<input class="field" id="fighterHP" type="number" min="0" inputmode="numeric" value="'+esc(f.hp)+'"></label>',
    '<label>PV máximos<input class="field" id="fighterMaxHP" type="number" min="1" inputmode="numeric" value="'+esc(f.maxHp)+'"></label>',
    '<label>PV temporários<input class="field" id="fighterTempHP" type="number" min="0" inputmode="numeric" value="'+temp+'"></label>',
    '<label>Iniciativa<input class="field" id="fighterInit" type="number" inputmode="numeric" value="'+esc(f.initiative)+'"></label>',
  '</div>',
  '<div class="action-row" style="margin-top:10px"><button class="btn" data-action="roll-fighter">🎲 Rolar iniciativa</button><button class="btn gold" data-action="save-fighter">Salvar valores</button></div>',
  '<div class="hr"></div>',
  '<div class="split"><h3 style="margin:0">Condições</h3><span class="pill '+(numberConditions?'red':'green')+'">'+numberConditions+' ativas</span></div>',
  '<p class="caption" style="margin:9px 0">Toque para marcar ou remover. As durações continuam sob controle do mestre.</p>',
  '<div class="conditions conditions-grid">'+tiles+'</div>',
  '<div class="condition-counter" aria-live="polite">'+(numberConditions?'Condições aplicadas: '+esc(f.conditions.join(', ')):'Sem condições registradas.')+'</div>',
  '<label class="form-label" for="fighterNotes">Anotações do mestre</label>',
  '<textarea class="textarea" id="fighterNotes" placeholder="Concentração, recargas, efeitos...">'+esc(f.notes||'')+'</textarea>',
  '<div class="action-row" style="margin-top:9px"><button class="btn gold" data-action="save-fighter">Salvar anotações</button><button class="btn danger" data-action="remove-fighter">Remover participante</button></div>',
  '</section>'
 ].join('');
}


function diceRoll(expression){
 const match=String(expression).trim().match(/^(\d{1,2})d(\d{1,3})(?:\s*([+-])\s*(\d{1,4}))?$/i);
 if(!match)return null;
 const count=Number(match[1]),sides=Number(match[2]),bonus=(match[3]==='-'?-1:1)*Number(match[4]||0);
 if(count<1||count>40||sides<2||sides>100)return null;
 const results=Array.from({length:count},()=>Math.floor(Math.random()*sides)+1);
 return {total:results.reduce((a,b)=>a+b,0)+bonus,results,bonus};
}
function addCombatLog(message){
 if(!Array.isArray(state.combat.log))state.combat.log=[];
 state.combat.log.unshift({id:uid(),eventVersion:1,round:state.combat.round,at:new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),message:String(message).slice(0,280)});
 state.combat.log=state.combat.log.slice(0,120);
}
function diceTools(){
 return '<section class="panel atlas-dice"><div class="split"><h3>Dados do Mestre</h3><span class="pill gold">Rolagens locais</span></div><div class="dice-buttons">'+[4,6,8,10,12,20,100].map(n=>'<button class="btn outline" data-action="roll-die" data-sides="'+n+'">d'+n+'</button>').join('')+'</div><div class="manual-hp"><input id="diceExpression" class="field" aria-label="Expressão de dados" placeholder="Ex.: 2d8+4" value="1d20"><button class="btn gold" data-action="roll-expression">Rolar</button></div><p class="caption">Resultados registrados no histórico do combate.</p></section>';
}
function combatHistory(){
 const log=Array.isArray(state.combat.log)?state.combat.log:[];
 return '<section class="panel atlas-history"><div class="split"><h3>Histórico da sessão</h3><button class="btn sm ghost" data-action="clear-log">Limpar</button></div>'+(log.length?'<ol class="combat-log">'+log.slice(0,30).map(x=>'<li><small>R'+esc(x.round)+' • '+esc(x.at)+'</small><span>'+esc(x.message)+'</span></li>').join('')+'</ol>':'<p class="caption">Danos, curas, turnos e rolagens aparecerão aqui.</p>')+'</section>';
}

function tacticalFighterCard(f,i,active){
 const open=combatOpenIds().includes(f.id),targeted=combatTargetIds().includes(f.id),m=f.monsterId?getMonster(f.monsterId):null;
 const temp=Math.max(0,Number(f.tempHp)||0);
 const stateLabel=percentHP(f)<=0?'Sem PV':percentHP(f)<=25?'Crítico':percentHP(f)<=55?'Ferido':'Estável';
 return `<article class="tactical-fighter ${open?'is-open':''} ${targeted?'is-targeted':''} ${f.id===active?.id?'is-current':''}" data-fighter-id="${esc(f.id)}">
   <div class="tactical-fighter-head">
    <button class="tactical-target-toggle ${targeted?'on':''}" data-action="toggle-batch-target" data-id="${esc(f.id)}" aria-pressed="${targeted}" title="Selecionar para alterações em grupo"><span>${targeted?'✓':'○'}</span><small>ALVO</small></button>
    <div class="tactical-avatar">${m?creaturePortrait(m):'<span class="avatar-player">⚔</span>'}</div>
    <button class="tactical-identity" data-action="focus-combat" data-id="${esc(f.id)}" aria-label="Editar ${esc(f.name)}">
      <span class="tactical-name">${f.id===active?.id?'▶ ':''}${esc(f.name)}</span>
      <span class="tactical-meta">INI ${esc(f.initiative)} · ${f.isPlayer?'Personagem':'ND '+esc(m?.cr||'—')} · ${stateLabel}</span>
      <span class="tactical-hp-line"><b>${f.hp}/${f.maxHp} PV</b>${temp?' · +'+temp+' temp':''}</span>
      ${healthBar(f)}
    </button>
    <div class="tactical-head-actions">
      <button class="btn tactical-open-btn ${open?'gold':'outline'}" data-action="toggle-combat-sheet" data-id="${esc(f.id)}">${open?'Recolher':'Abrir ficha'}</button>
      <button class="btn tactical-edit-btn" data-action="focus-combat" data-id="${esc(f.id)}">Controles</button>
    </div>
   </div>
   <div class="tactical-inline-hp" aria-label="Ajustes rápidos de pontos de vida">
    <button data-action="sheet-hp" data-id="${esc(f.id)}" data-amount="-10">−10</button>
    <button data-action="sheet-hp" data-id="${esc(f.id)}" data-amount="-5">−5</button>
    <button data-action="sheet-hp" data-id="${esc(f.id)}" data-amount="-1">−1</button>
    <button class="heal" data-action="sheet-hp" data-id="${esc(f.id)}" data-amount="1">+1</button>
    <button class="heal" data-action="sheet-hp" data-id="${esc(f.id)}" data-amount="5">+5</button>
    <button class="heal" data-action="sheet-hp" data-id="${esc(f.id)}" data-amount="10">+10</button>
   </div>
   ${open?`<div class="tactical-sheet-body"><div class="tactical-sheet-status"><span>PV <b>${f.hp}/${f.maxHp}</b></span><span>CA <b>${esc(m?.armor_class||'—')}</b></span><span>INI <b>${esc(f.initiative)}</b></span><span>Condições <b>${f.conditions?.length||0}</b></span></div>${f.isPlayer?playerBlock(f):statBlock(m)}</div>`:''}
  </article>`;
}
function combatBatchToolbar(fighters){
 const selected=combatTargetIds(),amount=Math.max(1,Number(ui.batchAmount)||8);
 const condition=ui.batchCondition&&CONDITIONS.includes(ui.batchCondition)?ui.batchCondition:CONDITIONS[0];
 return `<section class="panel tactical-batch-panel">
   <div class="tactical-batch-top"><div><div class="eyebrow">CONTROLE EM GRUPO</div><h3>Dano em área e alterações simultâneas</h3><p>Selecione os alvos nas fichas. Ex.: Bola de Fogo — aplique o dano total aos que falharam e metade aos que passaram.</p></div><span class="tactical-selected-count"><b>${selected.length}</b> selecionado(s)</span></div>
   <div class="tactical-batch-grid">
    <div class="tactical-batch-block"><label for="batchAmount">PV por alvo</label><input id="batchAmount" class="field" type="number" min="1" max="99999" inputmode="numeric" value="${amount}"><div class="tactical-batch-actions"><button class="btn danger" data-action="batch-damage" ${!selected.length?'disabled':''}>− Dano total</button><button class="btn danger outline" data-action="batch-half-damage" ${!selected.length?'disabled':''}>− Metade</button><button class="btn gold" data-action="batch-heal" ${!selected.length?'disabled':''}>+ Cura</button><button class="btn ghost" data-action="undo-batch-hp" ${ui.lastBatchHp?.length?'':'disabled'}>↶ Desfazer grupo</button></div></div>
    <div class="tactical-batch-block"><label for="batchCondition">Condição em grupo</label><select id="batchCondition" class="select">${CONDITIONS.map(c=>`<option value="${esc(c)}" ${condition===c?'selected':''}>${esc(c)}</option>`).join('')}</select><div class="tactical-batch-actions"><button class="btn outline" data-action="batch-add-condition" ${!selected.length?'disabled':''}>Aplicar condição</button><button class="btn ghost" data-action="batch-remove-condition" ${!selected.length?'disabled':''}>Remover condição</button></div></div>
   </div>
   <div class="tactical-batch-footer"><button class="btn ghost" data-action="batch-select-all">Selecionar todos</button><button class="btn ghost" data-action="batch-clear">Limpar seleção</button><button class="btn outline" data-action="batch-open-selected" ${!selected.length?'disabled':''}>Abrir fichas selecionadas</button><button class="btn outline" data-action="combat-open-all">Abrir todas</button><button class="btn ghost" data-action="combat-collapse-all">Recolher todas</button></div>
  </section>`;
}
function combat(){
 const fighters=state.combat.list,active=fighters[state.combat.turn];
 if(selectedId&&!fighters.some(f=>f.id===selectedId))selectedId=null;
 combatOpenIds();combatTargetIds();
 const focused=fighters.find(f=>f.id===selectedId)||null;
 return pageHeader('SESSÃO EM ANDAMENTO','Mesa de combate','Fichas compactas completas, múltiplas fichas abertas e alterações em grupo sem perder a visão da batalha.',`<button class="btn outline" data-action="add-player">+ Personagem</button><button class="btn" data-view="bestiary">+ Monstro</button>`)+`
 <div class="round-banner atlas-turn-bar tactical-turn-bar"><div><small>RODADA</small><br><strong>${state.combat.round}</strong></div><div class="grow"><small>TURNO ATUAL</small><br><b>${esc(active?.name||'Nenhum combate ativo')}</b></div><button class="btn" data-action="prev-turn" ${!fighters.length?'disabled':''}>← Anterior</button><button class="btn gold" data-action="next-turn" ${!fighters.length?'disabled':''}>Próximo turno →</button></div>
 ${fighters.length?`${combatBatchToolbar(fighters)}
 <div class="tactical-board-head"><div><div class="eyebrow">MAPA TÁTICO</div><h2>${fighters.length} participantes</h2></div><div class="actions"><button class="btn outline" data-action="roll-all">🎲 Rolar NPCs</button><button class="btn danger" data-action="clear-combat">Encerrar combate</button></div></div>
 <section class="tactical-board">${fighters.map((f,i)=>tacticalFighterCard(f,i,active)).join('')}</section>
 ${focused?`<section class="tactical-inspector"><div class="tactical-inspector-head"><div><div class="eyebrow">EDIÇÃO INDIVIDUAL</div><h2>${esc(focused.name)}</h2></div><button class="btn ghost" data-action="collapse-combat">✕ Fechar controles</button></div>${combatControl(focused,active)}</section>`:''}
 ${diceTools()}${combatHistory()}`:`<div class="empty"><div class="symbol">⚔</div><h3>Sua mesa aguarda os aventureiros</h3><p>Monte um encontro e envie os monstros para esta mesa, ou adicione personagens manualmente.</p><div class="actions" style="justify-content:center"><button class="btn gold" data-view="builder">Criar encontro</button><button class="btn outline" data-action="add-player">+ Personagem</button></div></div>`}
 `;
}
function playerBlock(f){return `<div class="statblock"><div class="eyebrow">PERSONAGEM DO GRUPO</div><h2>${esc(f.name)}</h2><div class="subline">Participante cadastrado manualmente</div><div class="basicstats"><div><small>INICIATIVA</small><b>${esc(f.initiative)}</b></div><div><small>PONTOS DE VIDA</small><b>${esc(f.hp)}</b></div><div><small>PV MÁXIMO</small><b>${esc(f.maxHp)}</b></div></div><p>É possível controlar a iniciativa e os PV dos personagens agora. As fichas completas dos jogadores ficarão para a próxima fase do aplicativo.</p></div>`}
function campaignNotebook(c){
 const records=state.campaignRecords[c.id]||[];
 const types=['Sessão','NPC','Local','Missão','Tesouro','Nota'];
 return '<section class="panel atlas-notebook"><div class="split"><h3>Diário: '+esc(c.name)+'</h3><button class="btn gold" data-action="new-record" data-id="'+esc(c.id)+'">+ Novo registro</button></div><p class="caption">Organize sessões, personagens, locais e missões da campanha.</p><div class="atlas-record-grid">'+records.map(r=>'<article class="atlas-record"><span class="pill gold">'+esc(r.type)+'</span><h4>'+esc(r.title)+'</h4><p>'+esc(r.body)+'</p><button class="btn sm danger" data-action="delete-record" data-id="'+esc(c.id)+'" data-record="'+esc(r.id)+'">Excluir</button></article>').join('')+'</div></section>';
}
function campaigns(){return (state.campaignId&&state.campaigns.some(c=>c.id===state.campaignId)?campaignNotebook(state.campaigns.find(c=>c.id===state.campaignId)):'')+pageHeader('SEU MUNDO','Campanhas','Organize aventuras, notas e encontros preparados.',`<button class="btn gold" data-action="new-campaign">+ Nova campanha</button>`)+`${state.campaigns.length?`<div class="grid campaign-grid">${state.campaigns.map(c=>`<article class="panel campaign-card"><span class="pill gold">${state.campaignId===c.id?'Atual':'Campanha'}</span><h3 style="margin-top:13px">${esc(c.name)}</h3><p>${esc(c.description||'Nenhuma descrição.')}</p><small>Atualizada: ${esc(c.date||'—')}</small><div class="actions"><button class="btn sm gold" data-action="edit-campaign" data-id="${esc(c.id)}">Abrir notas</button><button class="btn sm" data-action="select-campaign" data-id="${esc(c.id)}">Selecionar</button></div></article>`).join('')}</div>`:`<div class="empty"><div class="symbol">▦</div><h3>Crie sua primeira campanha</h3><p>Registre o nome, a premissa e anotações importantes da sua história. Os encontros salvos poderão ser associados a ela.</p><button class="btn gold" data-action="new-campaign">Criar campanha</button></div>`}`}
function settings(){return pageHeader('CONFIGURAÇÃO','Seu grimório','Gerencie cópias de segurança, dados personalizados e sincronização entre dispositivos.')+`<div class="cols2"><section class="panel"><h3>Salvamento e segurança</h3><p>O aplicativo guarda os dados neste navegador. Configure a nuvem para sincronizar com outros dispositivos.</p><div class="actions"><button class="btn gold" data-action="backup">↓ Exportar backup JSON</button><button class="btn" data-action="import-backup">↑ Importar backup</button><input id="backupFile" type="file" accept=".json,application/json" hidden></div><div class="hr"></div><h3>Dados do bestiário</h3><p>${monsters.length} criaturas SRD, ${state.customMonsters.length} personalizadas. 322 nomes em português; descrições SRD originais ainda em inglês. Filtros e interface em português.</p><button class="btn outline" data-action="new-monster">+ Criar criatura personalizada</button><div class="hr"></div><h3>Instalar em dispositivo</h3><p>Se o navegador oferecer “Instalar aplicativo” ou “Adicionar à tela inicial”, você poderá utilizar a Central como um app. Depois do primeiro acesso, as telas principais e os dados baixados ficam disponíveis offline.</p></section><section class="panel"><h3>Sincronização Supabase</h3>${cloudForm()}<div class="hr"></div><p class="caption">As chaves públicas do Supabase não são senhas. A segurança depende das políticas de Row Level Security (RLS). Nunca coloque a service_role key aqui.</p></section></div>`}
function importStateFile(file){if(!file)return;file.text().then(t=>{let d;try{d=JSON.parse(t)}catch{toast('Arquivo JSON inválido',true);return}if(!confirm('Substituir suas campanhas, encontros e combates pelos dados do backup?'))return;overwriteState(d);localSave();toast('Backup importado com sucesso')})}
function newMonsterModal(){openModal(`<div class="modal-top"><div><div class="eyebrow">CONTEÚDO PERSONALIZADO</div><h2>Novo monstro</h2></div><button class="close" data-action="close">×</button></div><form id="monsterForm"><div class="form-grid"><label>Nome da criatura<input name="name" class="field" required maxlength="100"></label><label>Tipo<select name="type" class="select" style="width:100%">${Object.entries(TYPE).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Tamanho<select name="size" class="select" style="width:100%">${Object.entries(SIZE).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Nível de Desafio<select name="cr" class="select" style="width:100%">${Object.keys(CR_XP).map(k=>`<option value="${k}">${k}</option>`).join('')}</select></label><label>Classe de Armadura<input name="ac" class="field" type="number" value="13" min="0" required></label><label>Pontos de Vida<input name="hp" class="field" type="number" value="30" min="1" required></label><label>Iniciativa<input name="initiative" class="field" type="number" value="1"></label><label>Deslocamento em metros<input name="speed" class="field" type="number" value="9" min="0"></label></div><div class="form-label">Atributos (FOR, DES, CON, INT, SAB, CAR)</div><div class="form-grid">${['str','dex','con','int','wis','cha'].map(x=>`<label>${x.toUpperCase()}<input type="number" class="field" name="${x}" value="10"></label>`).join('')}</div><label class="form-label">Características — uma por linha (Nome: descrição)</label><textarea name="traits" class="textarea"></textarea><label class="form-label">Ações — uma por linha (Nome: descrição)</label><textarea name="actions" class="textarea"></textarea><div class="actions" style="margin-top:16px"><button type="submit" class="btn gold">Salvar monstro</button><button type="button" class="btn" data-action="close">Cancelar</button></div></form>`,false)}
function campaignModal(id=null){const c=state.campaigns.find(x=>x.id===id);openModal(`<div class="modal-top"><h2>${c?'Editar campanha':'Nova campanha'}</h2><button class="close" data-action="close">×</button></div><form id="campaignForm"><input type="hidden" name="cid" value="${esc(c?.id||'')}"><label class="form-label">Nome</label><input class="field wide" maxlength="100" name="name" required value="${esc(c?.name||'')}"><label class="form-label">Descrição da campanha</label><textarea class="textarea" name="description">${esc(c?.description||'')}</textarea><label class="form-label">Notas do mestre (privadas)</label><textarea class="textarea" style="height:200px" name="notes">${esc(c?.notes||'')}</textarea><div class="actions" style="margin-top:15px"><button class="btn gold" type="submit">Salvar campanha</button>${c?`<button class="btn danger" type="button" data-action="delete-campaign" data-id="${esc(c.id)}">Excluir</button>`:''}</div></form>`,false)}
function playerModal(){openModal(`<div class="modal-top"><h2>Adicionar personagem</h2><button class="close" data-action="close">×</button></div><p>Cadastre os dados de combate do aventureiro. Fichas completas estarão disponíveis numa próxima etapa.</p><form id="playerForm"><div class="form-grid"><label>Nome<input class="field" name="name" required maxlength="90"></label><label>Iniciativa<input class="field" name="initiative" type="number" value="10"></label><label>PV máximo<input class="field" name="maxHp" type="number" min="1" value="30"></label><label>PV atual<input class="field" name="hp" type="number" min="0" value="30"></label></div><button type="submit" class="btn gold" style="margin-top:17px">Adicionar à iniciativa</button></form>`,false)}
function parseEntries(t){return String(t||'').split('\n').map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf(':');return {name:i>=0?x.slice(0,i).trim():'Especial',description:i>=0?x.slice(i+1).trim():x}})}
function action(name,id,button){switch(name){
case 'roll-die':case 'roll-expression':{
 const expr=name==='roll-die'?'1d'+Number(button?.dataset?.sides):String(el('diceExpression')?.value||'1d20');
 const result=diceRoll(expr);
 if(!result){toast('Expressão inválida. Use NdN+B, por exemplo 2d8+4.',true);return}
 addCombatLog('Rolagem '+expr+': '+result.results.join(' + ')+(result.bonus?' + '+result.bonus:'')+' = '+result.total);
 save();toast(expr+' → '+result.total);return;
}
case 'new-record':{
 const type=prompt('Tipo de registro: Sessão, NPC, Local, Missão, Tesouro ou Nota','Sessão');
 if(type===null)return;
 const title=prompt('Título do registro:');if(!title?.trim())return;
 const body=prompt('Descrição ou anotações:','');if(body===null)return;
 (state.campaignRecords[id]??=[]).push({id:uid(),type:String(type).slice(0,35),title:title.trim().slice(0,120),body:String(body).slice(0,5000)});
 save();return;
}
case 'delete-record':{
 if(!confirm('Excluir este registro da campanha?'))return;
 state.campaignRecords[id]=(state.campaignRecords[id]||[]).filter(r=>r.id!==button?.dataset?.record);save();return;
}
case 'toggle-favorite':{
 const set=new Set(state.favorites);set.has(id)?set.delete(id):set.add(id);state.favorites=[...set];localSave();monsterModal(id);return;
}
case 'roll-monster-damage':{
 const m=getMonster(id),index=Number(button?.dataset?.index);
 const entry=m?.stat_block_json?.actions?.[index];
 const expression=String(entry?.description||'').match(/(\d{1,2}d\d{1,3}(?:\s*[+-]\s*\d{1,3})?)/i)?.[1];
 const result=expression&&diceRoll(expression);
 if(!result){toast('Não foi possível identificar os dados deste ataque.',true);return}
 addCombatLog(m.name+' — '+entry.name+': '+expression+' = '+result.total);
 localSave();toast('🎲 '+entry.name+': '+result.total+' de dano');return;
}
case 'clear-log':if(confirm('Limpar o histórico deste combate?')){state.combat.log=[];save()}return;
case 'toggle-menu':{
 const nav=el('sideNav');
 setMenu(!nav?.classList?.contains?.('mobile-open'));return;
}
case 'close':closeModal();return;
case 'details':monsterModal(id);return;
case 'set-monster-image':{
 const m=getMonster(id);if(!m)return;
 const raw=prompt('Cole um endereço HTTPS de imagem da criatura (somente arte com permissão de uso):',artworkURL(m));
 if(raw===null)return;
 const value=String(raw).trim();
 if(value&&!value.startsWith('https://')){toast('Informe uma URL HTTPS para a imagem.',true);return}
 state.creatureImages[id]=value;
 localSave();monsterModal(id);toast(value?'Imagem associada à criatura':'Imagem removida');return;
}
case 'remove-monster-image':{
 delete state.creatureImages[id];localSave();monsterModal(id);toast('Imagem removida');return;
}

case 'add-encounter':{const old=state.encounter.find(x=>x.id===id);if(old)old.qty+=1;else state.encounter.push({id,qty:1});localSave();toast(getMonster(id)?.name+' adicionado ao encontro');if(view==='builder')render();return;}
case 'dec-encounter':{const it=state.encounter.find(x=>x.id===id);if(it){it.qty--;if(it.qty<=0)state.encounter=state.encounter.filter(x=>x.id!==id)}save();return;}
case 'clear-encounter':if(confirm('Limpar todas as criaturas do encontro?')){state.encounter=[];save()}return;
case 'apply-suggestion':{const qty=clamp(button.dataset.qty,1,12);state.encounter=[{id,qty}];save();toast('Sugestão aplicada');return;}
case 'more-monsters':filter.page++;updateCards();return;
case 'clear-filter':filter={q:'',cr:'',type:'',sort:'cr',page:1};render();return;
case 'new-monster':newMonsterModal();return;
case 'add-combat':{const m=getMonster(id);if(m){addFighter(m);localSave();closeModal();go('combat')}return;}
case 'save-encounter':{if(!state.encounter.length){toast('Adicione criaturas primeiro',true);return}const name=prompt('Nome deste encontro:', 'Encontro '+(state.savedEncounters.length+1));if(!name?.trim())return;state.savedEncounters.push({id:uid(),name:name.trim().slice(0,100),party:[...state.party],monsters:structuredClone(state.encounter),xp:groupXp(),campaignId:state.campaignId,date:new Date().toLocaleDateString('pt-BR')});save();toast('Encontro salvo');return;}
case 'load-encounter':{const it=state.savedEncounters.find(x=>x.id===id);if(it){state.party=[...it.party];state.encounter=structuredClone(it.monsters);save();toast('Encontro carregado')}return;}
case 'delete-encounter':if(confirm('Excluir o encontro salvo?')){state.savedEncounters=state.savedEncounters.filter(x=>x.id!==id);save()}return;
case 'party-add':if(state.party.length<12){state.party.push(state.party.at(-1)||1);save()}return;
case 'party-remove':if(state.party.length>1){state.party.pop();save()}return;
case 'generate-suggestions':if(el('suggestionContainer'))el('suggestionContainer').innerHTML=suggestionsMarkup();return;
case 'start-combat':{const valid=state.encounter.filter(x=>getMonster(x.id));let amount=valid.reduce((n,x)=>n+x.qty,0);if(!amount){toast('Adicione criaturas válidas ao encontro',true);return}if(amount>35){toast('Máximo de 35 participantes por envio',true);return}const hadCombat=state.combat.list.length>0;if(hadCombat&&!confirm('Adicionar os novos monstros ao combate atual?'))return;for(const x of valid){const m=getMonster(x.id);for(let i=0;i<x.qty;i++)addFighter(m)}selectedId=null;if(!hadCombat){state.combat.turn=0;state.combat.round=1}localSave();closeModal();go('combat');return}
case 'focus-combat':selectedId=id;render();return;
case 'collapse-combat':selectedId=null;render();return;
case 'add-player':playerModal();return;
case 'next-turn':{if(!state.combat.list.length)return;advanceEffects(state.combat.list[state.combat.turn]);addCombatLog('Fim do turno de '+state.combat.list[state.combat.turn]?.name+'.');state.combat.turn++;if(state.combat.turn>=state.combat.list.length){state.combat.turn=0;state.combat.round++}selectedId=null;save();return}
case 'prev-turn':{if(!state.combat.list.length)return;state.combat.turn--;if(state.combat.turn<0){state.combat.turn=state.combat.list.length-1;state.combat.round=Math.max(1,state.combat.round-1)}selectedId=null;save();return}
case 'clear-combat':if(confirm('Encerrar o combate e remover todos os participantes?')){state.combat={list:[],round:1,turn:0};selectedId=null;save()}return;
case 'roll-all':{const active=state.combat.list[state.combat.turn]?.id;state.combat.list.forEach(f=>{if(!f.isPlayer){f.initiative=roll()+Number(getMonster(f.monsterId)?.initiative_modifier||0)}});sortFighters();state.combat.turn=Math.max(0,state.combat.list.findIndex(x=>x.id===active));save();return}
case 'roll-fighter':{const f=currentFighter();if(f){f.initiative=roll()+Number(f.isPlayer?0:getMonster(f.monsterId)?.initiative_modifier||0);selectedId=f.id;const active=state.combat.list[state.combat.turn]?.id;sortFighters();state.combat.turn=Math.max(0,state.combat.list.findIndex(x=>x.id===active));save()}return}
case 'save-fighter':{
 const f=currentFighter();if(!f)return;
 const active=state.combat.list[state.combat.turn]?.id;
 f.name=el('fighterName').value.trim().slice(0,100)||f.name;
 f.maxHp=Math.max(1,Number(el('fighterMaxHP').value)||1);
 f.hp=clamp(el('fighterHP').value,0,f.maxHp);
 f.tempHp=clamp(el('fighterTempHP').value,0,99999);
 f.initiative=Number(el('fighterInit').value)||0;
 f.notes=el('fighterNotes').value.slice(0,3000);
 selectedId=f.id;sortFighters();
 state.combat.turn=Math.max(0,state.combat.list.findIndex(x=>x.id===active));
 save();toast('Participante atualizado');return;
}
case 'quick-hp':{
 const f=currentFighter();if(!f)return;
 const amount=Number(button?.dataset?.amount);
 if(!Number.isFinite(amount)||amount===0||Math.abs(amount)>1000)return;
 changeHitPoints(f,amount);return;
}
case 'undo-hp':{
 const f=currentFighter(),previous=ui.lastHp;
 if(!f||!previous||previous.fighterId!==f.id)return;
 f.hp=previous.hp;f.tempHp=previous.tempHp;ui.lastHp=null;selectedId=f.id;save();return;
}
case 'damage':case 'heal':{
 const f=currentFighter();if(!f)return;
 const n=clamp(el('damageAmount').value,0,99999);if(!n)return;
 changeHitPoints(f,name==='damage'?-n:n);return;
}
case 'add-effect':{
 const f=currentFighter(),effectName=String(el('effectName')?.value||'').trim().slice(0,80);
 if(!f||!effectName)return;
 const turns=clamp(el('effectTurns')?.value,0,999);
 (f.effects??=[]).push({id:uid(),name:effectName,remaining:turns||null});
 addCombatLog(f.name+': efeito '+effectName+' aplicado.');selectedId=f.id;save();return;
}
case 'remove-effect':{
 const f=currentFighter();if(!f)return;
 f.effects=(f.effects||[]).filter(e=>e.id!==button?.dataset?.effect);save();return;
}
case 'toggle-concentration':{
 const f=currentFighter();if(!f)return;
 f.concentrating=!f.concentrating;addCombatLog(f.name+(f.concentrating?' iniciou':' encerrou')+' concentração.');save();return;
}
case 'toggle-condition':{const f=currentFighter(),c=button.dataset.condition;if(!f||!CONDITIONS.includes(c))return;if(f.conditions.includes(c))f.conditions=f.conditions.filter(x=>x!==c);else f.conditions.push(c);addCombatLog(f.name+': condição '+c+' '+(f.conditions.includes(c)?'aplicada':'removida')+'.');selectedId=f.id;save();return}
case 'remove-fighter':{const f=currentFighter();if(f&&confirm('Remover '+f.name+' do combate?')){const active=state.combat.list[state.combat.turn]?.id;state.combat.list=state.combat.list.filter(x=>x.id!==f.id);state.combat.turn=Math.max(0,state.combat.list.findIndex(x=>x.id===active));selectedId=null;save()}return}
case 'new-campaign':campaignModal();return;
case 'edit-campaign':campaignModal(id);return;
case 'select-campaign':state.campaignId=id;save();toast('Campanha selecionada');return;
case 'delete-campaign':if(confirm('Excluir a campanha e suas anotações? Os encontros salvos serão mantidos.')){state.campaigns=state.campaigns.filter(x=>x.id!==id);if(state.campaignId===id)state.campaignId=null;closeModal();save()}return;
case 'backup':{const file=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const u=URL.createObjectURL(file);const a=document.createElement('a');a.href=u;a.download='central-mestre-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);toast('Backup exportado');return}
case 'import-backup':el('backupFile')?.click();return;
}}
function currentFighter(){return state.combat.list.find(x=>x.id===selectedId)||state.combat.list[state.combat.turn]}
document.addEventListener('click',async e=>{const viewBtn=e.target.closest('[data-view]');if(viewBtn){go(viewBtn.dataset.view);return}const actionBtn=e.target.closest('[data-action]');if(actionBtn){action(actionBtn.dataset.action,actionBtn.dataset.id,actionBtn);return}if(e.target.matches('[data-close]'))closeModal()});
document.addEventListener('input',e=>{if(e.target.id==='monsterSearch'){filter.q=e.target.value;filter.page=1;updateCards()}if(e.target.id==='builderQuery'){builderFilter.q=e.target.value;const container=el('suggestionContainer');if(container)container.innerHTML=suggestionsMarkup()}});
document.addEventListener('change',async e=>{const t=e.target;if(t.id==='monsterCR'||t.id==='monsterType'||t.id==='monsterSort'){filter.cr=el('monsterCR').value;filter.type=el('monsterType').value;filter.sort=el('monsterSort').value;filter.page=1;updateCards()}if(t.dataset.partyIndex!==undefined){state.party[Number(t.dataset.partyIndex)]=clamp(t.value,1,20);save()}if(t.id==='difficulty'){state.difficulty=t.value;save()}if(t.id==='builderType'){builderFilter.type=t.value;el('suggestionContainer').innerHTML=suggestionsMarkup()}if(t.id==='builderCR'){builderFilter.cr=t.value;el('suggestionContainer').innerHTML=suggestionsMarkup()}if(t.id==='backupFile')importStateFile(t.files[0])});
document.addEventListener('submit',async e=>{const t=e.target;if(!['monsterForm','campaignForm','playerForm','cloudForm'].includes(t.id))return;e.preventDefault();
if(t.id==='cloudForm'){await handleCloudAction(t,new FormData(t),{toast,render,overwriteState,saveState:()=>state});return}
const d=new FormData(t);
if(t.id==='campaignForm'){let c=state.campaigns.find(x=>x.id===d.get('cid'));if(!c){c={id:uid()};state.campaigns.push(c)}c.name=String(d.get('name')||'').trim().slice(0,100);c.description=String(d.get('description')||'').slice(0,2500);c.notes=String(d.get('notes')||'').slice(0,30000);c.date=new Date().toLocaleDateString('pt-BR');state.campaignId=c.id;closeModal();save();toast('Campanha salva');return}
if(t.id==='playerForm'){const f={id:uid(),monsterId:null,name:String(d.get('name')).trim().slice(0,100),initiative:Number(d.get('initiative'))||0,maxHp:Math.max(1,Number(d.get('maxHp'))||1),hp:Math.max(0,Number(d.get('hp'))||0),conditions:[],notes:'',isPlayer:true};f.hp=Math.min(f.hp,f.maxHp);state.combat.list.push(f);sortFighters();selectedId=f.id;closeModal();localSave();go('combat');toast('Personagem na iniciativa');return}
if(t.id==='monsterForm'){const s={};for(const k of ['str','dex','con','int','wis','cha'])s[k]=clamp(d.get(k),1,30);const cr=String(d.get('cr'));const hp=Math.max(1,Number(d.get('hp'))||1);const ms={id:'custom:'+uid(),name:String(d.get('name')).trim().slice(0,100),size:String(d.get('size')),type:String(d.get('type')),cr,cr_numeric:cr.includes('/')?Number(cr.split('/')[0])/Number(cr.split('/')[1]):Number(cr),hp_max:hp,hp_formula:'—',armor_class:Number(d.get('ac'))||10,initiative_modifier:Number(d.get('initiative'))||0,source:'personalizado',attribution:'Criatura personalizada pelo Mestre',stat_block_json:{schema_version:1,ability_scores:s,speed:{walk:Math.round(Number(d.get('speed'))/0.3)||30},traits:parseEntries(d.get('traits')),actions:parseEntries(d.get('actions'))}};state.customMonsters.push(ms);closeModal();save();toast('Monstro personalizado criado');return}});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){closeModal();setMenu(false)}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();const field=el('globalSearch');if(field?.focus)field.focus();else{go('bestiary');el('monsterSearch')?.focus?.()}}
});
document.addEventListener('submit',e=>{
 if(e.target?.id!=='globalSearchForm')return;
 e.preventDefault();
 filter.q=String(el('globalSearch')?.value||'').trim().slice(0,110);
 filter.page=1;go('bestiary');
});

async function boot(){try{
    const orig=await fetch('/data/monsters.json',{cache:'no-cache'});
    if(!orig.ok)throw Error('Arquivo de monstros indisponível');
    const d=await orig.json();
    try{
      const resp=await fetch('/data/nomes-pt-BR.json',{cache:'no-cache'});
      if(resp.ok){
        const names=await resp.json();
        d.monsters.forEach(m=>{m.name_en=m.name;m.name=names[m.name]||m.name});
      }
    }catch(e){console.warn('Não foi possível carregar os nomes em português:',e)}
    monsters=Array.isArray(d.monsters)?d.monsters:[];
    monsterById=new Map(monsters.map(m=>[m.id,m]));
    render();
    await initializeCloud({toast,render,overwriteState,saveState:()=>state});
    if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }catch(err){
    el('view').innerHTML=`<div class="empty"><h2>Não foi possível carregar o bestiário</h2><p>${esc(err.message)}</p><button class="btn" onclick="location.reload()">Tentar novamente</button></div>`;
    console.error(err);
  }}
boot();
