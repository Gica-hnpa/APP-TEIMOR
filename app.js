/* TEIMOR · Gestor de pressupostos v09.1 NETA
   App estàtica: les dades importades d'Excel/ZIP es llegeixen al navegador i es guarden localment.
*/
const STORE_KEY = 'teimor_gestor_pressupostos_v09_1_neta';
const LEGACY_STORE_KEY = ''; // No carreguem automàticament dades antigues per evitar arrossegar imports bruts de prova.
const AUTH_KEY = 'teimor_auth_v09_1_neta';
const LEGACY_AUTH_KEY = ''; // V08 força login en cada càrrega
const DB_NAME = 'teimor_attachments_v09_1_neta';
const DB_STORE = 'files';
const DEFAULT_USER = 'admin';
const DEFAULT_PASS = 'teimor2026';

const today = () => new Date().toISOString().slice(0,10);
const uid = (prefix='ID') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
const esc = v => String(v ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
const strip = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const cleanText = s => String(s ?? '').replace(/\s+/g,' ').trim();
const cleanLongText = s => String(s ?? '').replace(/\r/g,'').split(/\n+/).map(x=>cleanText(x)).filter(Boolean).join('\n');
const money = v => new Intl.NumberFormat('ca-ES',{style:'currency',currency:'EUR'}).format(num(v));
function dateDisplay(v){
  const iso=parseDateValue(v);
  if(!iso) return esc(v||'');
  const [y,m,d]=iso.split('-');
  return `${d}/${m}/${y}`;
}
const num = v => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (v == null) return 0;
  let s = String(v).trim();
  if (!s) return 0;
  s = s.replace(/€/g,'').replace(/\s/g,'').replace(/[^0-9,.-]/g,'');
  if (!s || s === '-' || s === ',') return 0;
  const hasComma = s.includes(','), hasDot = s.includes('.');
  if (hasComma && hasDot) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g,'').replace(',','.');
    else s = s.replace(/,/g,'');
  } else if (hasComma) s = s.replace(',','.');
  else if ((s.match(/\./g)||[]).length > 1) s = s.replace(/\./g,'');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const pct = v => `${num(v).toFixed(2)}%`;
const byId = (arr,id) => arr.find(x => x.id === id);
const normKey = s => strip(s).replace(/[^a-z0-9]+/g,' ').trim();

function defaultData(){
  return {
    meta:{version:'9.1.0-neta',createdAt:today(),updatedAt:today()},
    settings:{
      appName:'TEIMOR · Base de dades de pressupostos',
      loginUser:DEFAULT_USER,
      passwordHash:'',
      defaultCI:3,
      defaultDGE:13,
      defaultBI:10,
      defaultIVA:21,
      contractista:{
        name:'TEIMOR / Teixidor & Mora S.L.',
        nif:'B55271159',
        address:'C/ Marçal de la Trinxeria, 48, esc. A, planta 5, àtic 4',
        city:'17200 Palafrugell (Girona)',
        phone:'620988264 / 675520117 / 609036162',
        email:'info@teimor.com'
      }
    },
    clients:[
      {id:'CLI-VALENTINA', name:'Comunitat de Propietaris Valentina Mar', nif:'', phone:'', email:'', contact:'', fiscalAddress:'', workAddress:'Avda. Torre Valentina, 11', city:'Calonge i Sant Antoni', status:'Actiu', notes:'Client final detectat al pressupost històric de prova.'}
    ],
    jobs:[
      {id:'F-2016-001', year:2016, clientId:'CLI-VALENTINA', title:'Garatges Valentina Mar - impermeabilització', address:'Avda. Torre Valentina, 11', city:'Calonge i Sant Antoni', status:'Històrica', mainBudgetId:'P-2016-001', notes:'Feina històrica de prova.'}
    ],
    library:[
      {id:'LIB-IMP-001', code:'IMP-001', chapter:'Impermeabilització', unit:'m²', concept:'Impermeabilització de terrassa no transitable', longDesc:'Neteja del suport, imprimació, regates puntuals i col·locació de làmina bituminosa SBS 50/G FP autoprotegida, incloent remats, solapaments i mitjans auxiliars manuals.', directCost:22.20, unitPrice:28.95, ci:3, dge:13, bi:10, origin:'Valentina Mar 2016', status:'Validada pendent revisió', decomp:[{type:'Material', name:'Làmina LBM SBS 50/G FP autoprotegida', unit:'m²', yield:1.12, price:10.80},{type:'Mà d’obra', name:'Oficial impermeabilitzador', unit:'h', yield:0.18, price:31},{type:'Mà d’obra', name:'Ajudant', unit:'h', yield:0.14, price:27}]}
    ],
    budgets:[
      {id:'P-2016-001', number:'2016-001', date:'2016-07-05', clientId:'CLI-VALENTINA', jobId:'F-2016-001', title:'Pressupost històric Valentina Mar', status:'Històric', ci:3, dge:13, bi:10, iva:21, notes:'Pressupost històric de prova.', lines:[
        {id:'LIN-1', libraryId:'LIB-IMP-001', code:'IMP-001', chapter:'Impermeabilització', unit:'m²', concept:'Impermeabilització de terrassa no transitable', longDesc:'Paquet històric: neteja, imprimació, regates i làmina autoprotegida.', qty:255.60, unitPrice:28.95, total:7402.62, status:'Importada amb amidament', origin:'Demo'}
      ]}
    ],
    invoices:[],
    attachments:[],
    importLogs:[]
  };
}

let data = loadData();
let state = {view:'dashboard', selectedBudgetId:data.budgets[0]?.id || '', selectedClientId:'', selectedJobId:'', selectedLibId:'', importDraft:null, draftLog:[]};

function loadData(){
  try {
    const current = localStorage.getItem(STORE_KEY);
    const parsed = JSON.parse(current || 'null');
    if(parsed){ parsed.meta = parsed.meta || {}; parsed.meta.version = parsed.meta.version || 'importada'; return parsed; }
    return defaultData();
  } catch { return defaultData(); }
}
function saveData(){ data.meta = data.meta || {}; data.meta.updatedAt = new Date().toISOString(); localStorage.setItem(STORE_KEY, JSON.stringify(data)); updateBadge(); }
function updateBadge(){ const b=document.getElementById('syncBadge'); if(b) b.textContent=`Mode local · ${new Date().toLocaleTimeString('ca-ES',{hour:'2-digit',minute:'2-digit'})}`; }
function hardReset(){ if(confirm('Vols esborrar les dades locals i tornar a la demo inicial?')){ data=defaultData(); saveData(); render(); }}

function clientName(id){ return byId(data.clients,id)?.name || id || ''; }
function jobName(id){ return byId(data.jobs,id)?.title || id || ''; }
function budgetName(id){ const b=byId(data.budgets,id); return b ? `${b.number || b.id} · ${b.title || ''}` : id || ''; }
function factor(ci,dge,bi){ return (1 + num(ci)/100) * (1 + (num(dge)+num(bi))/100); }
function decompCost(item){ return (item.decomp || []).reduce((s,l)=>s + num(l.yield) * num(l.price), 0); }
function libDirect(item){ return num(item.directCost) || decompCost(item); }
function libFinal(item, b){ const ci = b?.ci ?? item.ci ?? data.settings.defaultCI; const dge = b?.dge ?? item.dge ?? data.settings.defaultDGE; const bi = b?.bi ?? item.bi ?? data.settings.defaultBI; return libDirect(item) * factor(ci,dge,bi); }
function lineTotal(l){ return num(l.total) || num(l.qty) * num(l.unitPrice); }
function budgetLineSum(b){ return (b?.lines || []).reduce((s,l)=>s+lineTotal(l),0); }
function budgetBase(b){ const lineSum=budgetLineSum(b); const imported=num(b?.importedBase); return lineSum>0 ? lineSum : imported; }
function budgetIVA(b){ return budgetBase(b) * num(b?.iva)/100; }
function budgetTotal(b){ return budgetBase(b) + budgetIVA(b); }
function invoiceBase(i){ return num(i.base); }
function invoiceTotal(i){ return num(i.base) * (1 + num(i.iva)/100); }
function jobBudgets(jobId){ return data.budgets.filter(b=>b.jobId===jobId); }
function jobInvoices(jobId){ return data.invoices.filter(i=>i.jobId===jobId); }
function jobBudgetTotal(jobId){ return jobBudgets(jobId).reduce((s,b)=>s+budgetBase(b),0); }
function jobInvoiceTotal(jobId){ return jobInvoices(jobId).reduce((s,i)=>s+invoiceTotal(i),0); }
function options(arr, selected, labelFn=x=>x.name||x.title||x.id){ return arr.map(x=>`<option value="${esc(x.id)}" ${x.id===selected?'selected':''}>${esc(labelFn(x))}</option>`).join(''); }
function statusPill(status){
  const s=strip(status); let c='soft';
  if(s.includes('acceptat') || s.includes('cobrat') || s.includes('valid') || s.includes('fet')) c='green';
  else if(s.includes('enviat') || s.includes('pendent') || s.includes('revis') || s.includes('esborrany')) c='yellow';
  else if(s.includes('historic') || s.includes('històric')) c='purple';
  else if(s.includes('rebutjat') || s.includes('anul') || s.includes('sense') || s.includes('duplic')) c='red';
  return `<span class="pill ${c}">${esc(status||'')}</span>`;
}

async function sha256(text){
  const msg = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', msg);
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function checkLogin(user, pass){
  const expectedUser = data.settings.loginUser || DEFAULT_USER;
  if (user !== expectedUser) return false;
  if (!data.settings.passwordHash) return pass === DEFAULT_PASS;
  return await sha256(pass) === data.settings.passwordHash;
}
function showApp(logged){
  document.getElementById('loginScreen').classList.toggle('hidden', logged);
  document.getElementById('appShell').classList.toggle('hidden', !logged);
  if(logged) render();
}

function init(){
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const ok = await checkLogin(document.getElementById('loginUser').value.trim(), document.getElementById('loginPass').value);
    if(ok){ localStorage.setItem(AUTH_KEY,'1'); showApp(true); }
    else document.getElementById('loginMsg').textContent='Usuari o contrasenya incorrectes.';
  });
  document.getElementById('logout').onclick=()=>{ localStorage.removeItem(AUTH_KEY); showApp(false); };
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{ state.view=btn.dataset.view; render(); }));
  document.getElementById('modalClose').onclick=closeModal;
  document.getElementById('modal').addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); });
  document.getElementById('exportJson').onclick=()=>exportJson(true);
  const exportPackageBtn=document.getElementById('exportPackage'); if(exportPackageBtn) exportPackageBtn.onclick=exportPackageZip;
  document.getElementById('exportJsonClean').onclick=()=>exportJson(false);
  document.getElementById('importJson').onchange=importJson;
  localStorage.removeItem(AUTH_KEY);
  showApp(false);
}
window.addEventListener('DOMContentLoaded', init);

function setHeader(title, subtitle){ document.getElementById('viewTitle').textContent=title; document.getElementById('viewSubtitle').textContent=subtitle; }
function setContent(html){ document.getElementById('content').innerHTML=html; bindViewEvents(); }
function render(){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active', b.dataset.view===state.view));
  const views={dashboard:renderDashboard,clients:renderClients,library:renderLibrary,budgets:renderBudgets,invoices:renderInvoices,performance:renderPerformance,attachments:renderAttachments,importer:renderImporter,settings:renderSettings};
  (views[state.view]||renderDashboard)();
}
function empty(msg='Encara no hi ha dades.'){ return `<div class="empty">${esc(msg)}</div>`; }
function table(headers, rows){
  if(!rows || !rows.length) return empty();
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
function renderDashboard(){
  setHeader('Inici','Resum de clients, pressupostos, llibreria, factures, certificacions i traçabilitat local.');
  const totalB=data.budgets.reduce((sum,b)=>sum+budgetBase(b),0), totalI=data.invoices.reduce((sum,i)=>sum+invoiceTotal(i),0);
  const valid=data.library.filter(x=>strip(x.status).includes('valid')).length;
  const hist=data.library.filter(x=>strip(x.status).includes('historic') || strip(x.status).includes('sense')).length;
  const lastBudgets=[...data.budgets].sort((a,b)=>(String(b.date||'').localeCompare(String(a.date||'')) || String(b.number||'').localeCompare(String(a.number||'')))).slice(0,8);
  setContent(`
    <div class="grid four">
      <div class="kpi"><span>Clients finals</span><strong>${data.clients.length}</strong></div>
      <div class="kpi"><span>Pressupostos</span><strong>${data.budgets.length}</strong></div>
      <div class="kpi"><span>Partides llibreria</span><strong>${data.library.length}</strong></div>
      <div class="kpi ${totalB-totalI>=0?'good':'bad'}"><span>Diferència pressupostat s/IVA - facturat</span><strong>${money(totalB-totalI)}</strong></div>
    </div>
    <div class="card notice-blue"><strong>Funcionament de privacitat:</strong> quan importis Excel, carpeta o ZIP des d’aquesta app, el navegador els llegeix localment. Els originals no es pugen ni a Render ni a GitHub. Si exportes un JSON complet, aquest JSON sí que contindrà les dades que li vulguis passar a TEIMOR.</div>
    <div class="grid three">
      <div class="card"><h2>Pressupostos</h2><p>Llistat únic per any, client, obra, estat i imports.</p><button class="primary" data-go="budgets">Obrir pressupostos</button></div>
      <div class="card"><h2>Llibreria</h2><p><strong>${data.library.length}</strong> partides totals.</p><p>${valid} validades · ${hist} històriques/pendents.</p><button class="primary" data-go="library">Obrir llibreria</button></div>
      <div class="card"><h2>Importació massiva</h2><p>Pots seleccionar molts Excels, una carpeta o un ZIP amb pressupostos antics.</p><button class="primary" data-go="importer">Importar pressupostos</button></div>
    </div>
    <div class="card"><h2>Últims pressupostos</h2>${budgetsTable(lastBudgets)}</div>
  `);
}
function clientsTable(rows=data.clients){
  return table(['Sel.','Client','NIF/DNI/CIF','Contacte','Telèfon','Email','Adreça obra','Estat','Accions'], rows.map(c=>`
    <tr><td><input type="checkbox" class="select-client" value="${esc(c.id)}"></td><td><strong>${esc(c.name)}</strong><br><span class="muted">${esc(c.id)}</span></td><td>${esc(c.nif||'')}</td><td>${esc(c.contact||'')}</td><td>${esc(c.phone||'')}</td><td>${esc(c.email||'')}</td><td>${esc(c.workAddress||c.fiscalAddress||'')}</td><td>${statusPill(c.status||'Actiu')}</td><td class="nowrap"><button class="ghost small" data-edit-client="${esc(c.id)}">Editar</button> <button class="danger small" data-delete-client="${esc(c.id)}">Eliminar</button></td></tr>`));
}
function renderClients(editId=''){
  setHeader('Clients','Llistat principal de clients finals detectats al requadre del pressupost, amb filtres intel·ligents i fitxa editable.');
  const isForm = !!editId;
  const c = editId && editId !== '__new' ? byId(data.clients,editId) : {};
  if(isForm){
    setContent(`
      <div class="card"><div class="toolbar"><h2>${editId==='__new'?'Nou client final':'Editar client final'}</h2><button class="ghost" type="button" data-render-clients>← Tornar al llistat</button></div>
        <form id="clientForm" class="form-grid">
          <input type="hidden" name="editId" value="${esc(editId==='__new'?'':editId)}">
          <label>Codi<input name="id" value="${esc(c.id||uid('CLI'))}" ${editId !== '__new'?'readonly':''}></label>
          <label class="wide">Nom client / comunitat / empresa<input name="name" value="${esc(c.name||'')}" required autofocus></label>
          <label>NIF / DNI / CIF<input name="nif" value="${esc(c.nif||'')}"></label>
          <label>Telèfon<input name="phone" value="${esc(c.phone||'')}"></label>
          <label>Email<input name="email" value="${esc(c.email||'')}"></label>
          <label class="wide">Persona de contacte<input name="contact" value="${esc(c.contact||'')}"></label>
          <label class="wide">Adreça fiscal<input name="fiscalAddress" value="${esc(c.fiscalAddress||'')}"></label>
          <label class="wide">Adreça de l’obra habitual<input name="workAddress" value="${esc(c.workAddress||'')}"></label>
          <label>Municipi<input name="city" value="${esc(c.city||'')}"></label>
          <label>Estat<select name="status"><option ${c.status==='Actiu'?'selected':''}>Actiu</option><option ${c.status==='Històric'?'selected':''}>Històric</option><option ${c.status==='Inactiu'?'selected':''}>Inactiu</option></select></label>
          <label class="full">Observacions<textarea name="notes">${esc(c.notes||'')}</textarea></label>
          <div class="actions full"><button class="primary">Guardar client</button><button class="ghost" type="button" data-render-clients>Cancel·lar</button></div>
        </form>
      </div>
    `);
    return;
  }
  const years=[...new Set(data.jobs.map(j=>String(j.year)).filter(Boolean))].sort((a,b)=>Number(b)-Number(a));
  const cities=[...new Set(data.clients.map(c=>c.city).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  setContent(`
    <div class="grid four">
      <div class="kpi"><span>Clients finals</span><strong>${data.clients.length}</strong></div>
      <div class="kpi"><span>Amb NIF/DNI/CIF</span><strong>${data.clients.filter(c=>c.nif).length}</strong></div>
      <div class="kpi"><span>Amb telèfon/email</span><strong>${data.clients.filter(c=>c.phone||c.email).length}</strong></div>
      <div class="kpi"><span>Pressupostos vinculats</span><strong>${data.budgets.length}</strong></div>
    </div>
    <div class="card"><div class="toolbar">
      <div class="left"><h2>Llistat de clients</h2></div>
      <div class="right"><button class="ghost" id="selectAllClients">Seleccionar tot</button><button class="ghost" id="clearSelectedClients">Desmarcar</button><button class="danger" id="deleteSelectedClients">Eliminar seleccionats</button><button class="primary" id="newClientBtn">+ Nou client</button></div>
    </div>
    <div class="filter-grid">
      <label>Cerca intel·ligent<input id="clientSearch" placeholder="Escriu lletres del nom, NIF, telèfon, email, obra..."></label>
      <label>Any feina<select id="clientYearFilter"><option value="">Tots els anys</option>${years.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('')}</select></label>
      <label>Municipi<select id="clientCityFilter"><option value="">Tots els municipis</option>${cities.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></label>
      <label>Estat<select id="clientStatusFilter"><option value="">Tots</option><option>Actiu</option><option>Històric</option><option>Inactiu</option></select></label>
    </div>
    <div id="clientFilterInfo" class="small-text" style="margin:10px 0">Mostrant ${data.clients.length} clients.</div>
    <div id="clientsTable">${clientsTable(data.clients)}</div></div>
  `);
}
function filterClients(){
  const q=strip(document.getElementById('clientSearch')?.value||'');
  const year=document.getElementById('clientYearFilter')?.value||'';
  const city=strip(document.getElementById('clientCityFilter')?.value||'');
  const status=strip(document.getElementById('clientStatusFilter')?.value||'');
  let rows=data.clients.filter(c=>{
    const clientJobs=data.jobs.filter(j=>j.clientId===c.id);
    const yearOk=!year || clientJobs.some(j=>String(j.year)===String(year));
    const cityOk=!city || strip(c.city||c.workAddress||c.fiscalAddress).includes(city);
    const statusOk=!status || strip(c.status)===status;
    const blob=[c.id,c.name,c.nif,c.phone,c.email,c.contact,c.fiscalAddress,c.workAddress,c.city,c.notes, clientJobs.map(j=>`${j.year} ${j.title} ${j.address}`).join(' ')].join(' ');
    const qOk=!q || strip(blob).includes(q);
    return yearOk && cityOk && statusOk && qOk;
  });
  document.getElementById('clientsTable').innerHTML=clientsTable(rows);
  const info=document.getElementById('clientFilterInfo'); if(info) info.textContent=`Mostrant ${rows.length} de ${data.clients.length} clients.`;
  bindViewEvents();
}
function jobsTable(rows=data.jobs){
  return table(['Any','Feina / obra','Client','Adreça','Estat','Pressupostat','Factures','Accions'], rows.map(j=>`
    <tr><td>${esc(j.year)}</td><td><strong>${esc(j.title)}</strong><br><span class="muted">${esc(j.id)}</span></td><td>${esc(clientName(j.clientId))}</td><td>${esc(j.address||'')}</td><td>${statusPill(j.status||'')}</td><td class="num">${money(jobBudgetTotal(j.id))}</td><td class="num">${money(jobInvoiceTotal(j.id))}</td><td><button class="ghost small" data-edit-job="${esc(j.id)}">Editar</button></td></tr>`));
}
function renderJobs(editId=''){
  setHeader('Feines / anys','Obres classificades per any, associades a client final, pressupostos, factures i arxius.');
  const j = editId ? byId(data.jobs,editId) : {year:new Date().getFullYear()};
  const years=[...new Set(data.jobs.map(x=>x.year))].sort((a,b)=>b-a);
  const filterYear=state.yearFilter || '';
  const rows=filterYear?data.jobs.filter(x=>String(x.year)===String(filterYear)):data.jobs;
  setContent(`
    <div class="card"><h2>${editId?'Editar feina':'Nova feina / obra'}</h2>
      <form id="jobForm" class="form-grid">
        <input type="hidden" name="editId" value="${esc(editId)}">
        <label>Codi<input name="id" value="${esc(j.id||uid('F'))}" ${editId?'readonly':''}></label>
        <label>Any<input name="year" type="number" value="${esc(j.year||new Date().getFullYear())}"></label>
        <label class="wide">Client<select name="clientId" required><option value="">Selecciona client</option>${options(data.clients,j.clientId)}</select></label>
        <label class="wide">Títol feina / obra<input name="title" value="${esc(j.title||'')}" required></label>
        <label class="wide">Adreça obra<input name="address" value="${esc(j.address||'')}"></label>
        <label>Municipi<input name="city" value="${esc(j.city||'')}"></label>
        <label>Estat<select name="status"><option ${j.status==='En curs'?'selected':''}>En curs</option><option ${j.status==='Pendent'?'selected':''}>Pendent</option><option ${j.status==='Finalitzada'?'selected':''}>Finalitzada</option><option ${j.status==='Històrica'?'selected':''}>Històrica</option></select></label>
        <label class="full">Notes<textarea name="notes">${esc(j.notes||'')}</textarea></label>
        <div class="actions full"><button class="primary">Guardar feina</button>${editId?'<button class="ghost" type="button" data-render-jobs>Cancel·lar</button>':''}</div>
      </form>
    </div>
    <div class="card"><div class="toolbar"><h2>Llistat de feines</h2><select id="yearFilter"><option value="">Tots els anys</option>${years.map(y=>`<option value="${y}" ${String(y)===String(filterYear)?'selected':''}>${y}</option>`).join('')}</select></div><div id="jobsTable">${jobsTable(rows)}</div></div>
  `);
}
function renderLibrary(){
  setHeader('Llibreria de partides','Llibreria tipus BEDEC amb filtre per capítol. El llistat mostra text curt; clicant “Veure / editar” s’obre la fitxa completa i el descompost estructurat.');
  const q=state.libSearch || '';
  const filter=strip(q);
  const chapters=[...new Set(data.library.map(x=>x.chapter||'Sense capítol').filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const chapter=state.libChapterFilter || '';
  const rows=data.library.filter(x=>{
    const chapterOk=!chapter || (x.chapter||'Sense capítol')===chapter;
    const searchOk=!filter || strip([x.code,x.chapter,x.unit,x.concept,x.longDesc,x.status,x.origin].join(' ')).includes(filter);
    return chapterOk && searchOk;
  });
  setContent(`
    <div class="card">
      <div class="toolbar"><h2>Llibreria</h2><div class="right"><button class="ghost" id="selectAllLibrary">Seleccionar tot</button><button class="ghost" id="clearSelectedLibrary">Desmarcar</button><button class="danger" id="deleteSelectedLibrary">Eliminar seleccionades</button><button class="ghost" id="exportLibraryJson">Exportar llibreria</button><label class="ghost file-label">Importar llibreria<input id="importLibraryJson" type="file" accept="application/json" hidden></label><button class="primary" id="newLibItem">Nova partida</button></div></div>
      <div class="filter-grid">
        <label>Cerca<input id="libSearch" placeholder="Cercar partida, codi, origen..." value="${esc(q)}"></label>
        <label>Capítol<select id="libChapterFilter"><option value="">Tots els capítols</option>${chapters.map(c=>`<option value="${esc(c)}" ${c===chapter?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
        <label>Estat<select id="libStatusFilter"><option value="">Tots</option><option>Validada</option><option>Importada pendent de revisar</option><option>Històrica sense amidament</option><option>PA pendent amidament</option></select></label>
        <label>Resultats<input readonly value="${rows.length} de ${data.library.length}"></label>
      </div>
      <div id="libraryTable">${libraryTable(rows)}</div>
    </div>
  `);
}
function libraryTable(rows){
  const statusFilter=strip(document.getElementById('libStatusFilter')?.value || state.libStatusFilter || '');
  if(statusFilter) rows=rows.filter(x=>strip(x.status||'').includes(statusFilter));
  return table(['Sel.','Codi','Capítol','Ut','Descripció curta','PU final','Estat','Origen','Accions'], rows.map(item=>`
    <tr>
      <td><input type="checkbox" class="select-library" value="${esc(item.id)}"></td>
      <td><strong>${esc(item.code||'')}</strong></td>
      <td>${esc(item.chapter||'Sense capítol')}</td>
      <td>${esc(item.unit||'')}</td>
      <td><button class="linklike" data-view-lib="${esc(item.id)}"><strong>${esc(item.concept||'')}</strong></button></td>
      <td class="num">${money(item.unitPrice || libFinal(item))}</td>
      <td>${statusPill(item.status||'Pendent')}</td>
      <td>${esc(item.origin||'')}</td>
      <td class="nowrap"><button class="ghost small" data-view-lib="${esc(item.id)}">Veure / editar</button> <button class="danger small" data-delete-lib="${esc(item.id)}">Eliminar</button></td>
    </tr>`));
}
function decompSummary(lines=[]){ return (lines||[]).reduce((s,l)=>s+num(l.yield)*num(l.price),0); }
function decompBedecRows(lines=[]){
  const groups=['Mà d’obra','Material','Maquinària','Altres'];
  let html='';
  for(const g of groups){
    const rows=(lines||[]).filter(l=>(l.type||'Altres')===g);
    if(!rows.length) continue;
    const subtotal=rows.reduce((s,l)=>s+num(l.yield)*num(l.price),0);
    html+=`<tr class="group-row"><td colspan="6"><strong>${esc(g)}</strong></td><td class="num"><strong>${money(subtotal)}</strong></td><td></td></tr>`;
    html+=rows.map((l,idx)=>decompRow(l, `${g}_${idx}`)).join('');
  }
  return html;
}
function openLibModal(id=''){
  const item = id ? byId(data.library,id) : {id:uid('LIB'), ci:data.settings.defaultCI, dge:data.settings.defaultDGE, bi:data.settings.defaultBI, decomp:[], status:'Pendent de revisar'};
  const lines = item.decomp || [];
  const cd = libDirect(item);
  const final = item.unitPrice || libFinal(item);
  openModal(`
    <h2>${id?'Fitxa de partida':'Nova partida de llibreria'}</h2>
    <form id="libForm" class="form-grid lib-modal-form">
      <input type="hidden" name="editId" value="${esc(id)}"><input type="hidden" name="id" value="${esc(item.id)}">
      <div class="full tabs-small modal-tabs">
        <button type="button" class="active" data-modal-tab="fitxa">Fitxa</button>
        <button type="button" data-modal-tab="descripcio">Descripció llarga</button>
        <button type="button" data-modal-tab="descompost">Descompost BEDEC</button>
        <button type="button" data-modal-tab="historic">Històric</button>
      </div>
      <div class="full modal-panel active" data-modal-panel="fitxa">
        <div class="form-grid">
          <label>Codi<input name="code" value="${esc(item.code||'')}"></label>
          <label>Capítol<input name="chapter" value="${esc(item.chapter||'')}"></label>
          <label>Unitat<input name="unit" value="${esc(item.unit||'')}"></label>
          <label>Estat<select name="status">
            ${['Validada','Validada pendent revisió','Importada pendent de revisar','Històrica sense amidament','PA pendent amidament','Duplicada possible'].map(s=>`<option ${item.status===s?'selected':''}>${s}</option>`).join('')}
          </select></label>
          <label class="wide">Descripció curta<input name="concept" value="${esc(item.concept||'')}"></label>
          <label>Cost directe<input name="directCost" type="number" step="0.01" value="${esc(item.directCost||'')}"></label>
          <label>PU final històric<input name="unitPrice" type="number" step="0.01" value="${esc(item.unitPrice||'')}"></label>
          <label>CI %<input name="ci" type="number" step="0.01" value="${esc(item.ci ?? data.settings.defaultCI)}"></label>
          <label>DGE %<input name="dge" type="number" step="0.01" value="${esc(item.dge ?? data.settings.defaultDGE)}"></label>
          <label>BI %<input name="bi" type="number" step="0.01" value="${esc(item.bi ?? data.settings.defaultBI)}"></label>
          <label class="wide">Origen<input name="origin" value="${esc(item.origin||'Manual')}"></label>
        </div>
        <div class="grid three" style="margin-top:12px">
          <div class="kpi"><span>Cost directe calculat</span><strong>${money(cd)}</strong></div>
          <div class="kpi"><span>PU final / històric</span><strong>${money(final)}</strong></div>
          <div class="kpi"><span>Línies descompost</span><strong>${lines.length}</strong></div>
        </div>
      </div>
      <div class="full modal-panel" data-modal-panel="descripcio">
        <label class="full">Descripció llarga<textarea name="longDesc" class="large-textarea">${esc(item.longDesc||'')}</textarea></label>
      </div>
      <div class="full modal-panel" data-modal-panel="descompost">
        <div class="detail-box"><div class="toolbar"><h3>Descompost BEDEC estructurat</h3><button class="ghost small" type="button" id="addDecompLine">Afegir línia</button></div>
          <div class="table-wrap"><table id="decompTable" class="bedec-table"><thead><tr><th>Tipus</th><th>Recurs</th><th>Ut</th><th>Rendiment</th><th>Preu</th><th>Fórmula</th><th>Total CD</th><th></th></tr></thead><tbody>
            ${lines.length ? lines.map((l,i)=>decompRow(l,i)).join('') : ''}
          </tbody><tfoot><tr><td colspan="6" class="num"><strong>Cost directe</strong></td><td class="num"><strong>${money(decompSummary(lines))}</strong></td><td></td></tr></tfoot></table></div>
          <p class="small-text">El cost directe és rendiment × preu. Els percentatges CI, DGE i BI poden variar per pressupost.</p>
        </div>
      </div>
      <div class="full modal-panel" data-modal-panel="historic">
        ${libraryHistoryTable(item)}
      </div>
      <div class="actions full"><button class="primary">Guardar partida</button><button class="ghost" type="button" id="closeModalBtn">Cancel·lar</button></div>
    </form>
  `);
}
function libraryHistoryTable(item){
  const rows=item.history||[];
  if(!rows.length) return empty('Sense històric encara.');
  return table(['Data','Origen','Quantitat','PU','Total','Estat'], rows.map(h=>`<tr><td>${esc(h.date||'')}</td><td>${esc(h.origin||'')}</td><td class="num">${h.qty?num(h.qty).toFixed(3):''}</td><td class="num">${h.unitPrice?money(h.unitPrice):''}</td><td class="num">${h.total?money(h.total):''}</td><td>${statusPill(h.status||'')}</td></tr>`));
}
function decompRow(l={},i=0){
  const rowId=String(i).replace(/[^a-zA-Z0-9_]/g,'_');
  return `<tr data-decomp-row><td><select name="type_${rowId}">${['Mà d’obra','Material','Maquinària','Altres'].map(t=>`<option ${l.type===t?'selected':''}>${t}</option>`).join('')}</select></td><td><input name="name_${rowId}" value="${esc(l.name||'')}"></td><td><input name="unit_${rowId}" value="${esc(l.unit||'')}"></td><td><input name="yield_${rowId}" type="number" step="0.0001" value="${esc(l.yield||'')}"></td><td><input name="price_${rowId}" type="number" step="0.01" value="${esc(l.price||'')}"></td><td class="small-text">rend. × preu</td><td class="num">${money(num(l.yield)*num(l.price))}</td><td><button class="danger small" type="button" data-remove-decomp>×</button></td></tr>`;
}

function budgetStatusOptions(current=''){
  const statuses=['Esborrany','Enviat','Acceptat','Rebutjat','Acceptat i fet','Facturat','Cobrat','Històric importat','Anul·lat'];
  if(current && !statuses.includes(current)) statuses.push(current);
  return statuses.map(x=>`<option ${x===current?'selected':''}>${esc(x)}</option>`).join('');
}
function budgetYear(b){
  const d=parseDateValue(b.date); if(d) return Number(d.slice(0,4));
  const j=byId(data.jobs,b.jobId); if(j?.year) return Number(j.year);
  return '';
}
function budgetRowsFiltered(){
  const q=strip(document.getElementById('budgetSearch')?.value ?? state.budgetSearch ?? '');
  const year=document.getElementById('budgetYearFilter')?.value ?? state.budgetYearFilter ?? '';
  const status=strip(document.getElementById('budgetStatusFilter')?.value ?? state.budgetStatusFilter ?? '');
  const client=document.getElementById('budgetClientFilter')?.value ?? state.budgetClientFilter ?? '';
  return data.budgets.filter(b=>{
    const j=byId(data.jobs,b.jobId);
    const c=byId(data.clients,b.clientId);
    const blob=[b.id,b.number,b.date,b.title,b.status,b.source,b.notes,c?.name,c?.nif,c?.phone,c?.email,j?.title,j?.address,j?.city,budgetYear(b)].join(' ');
    return (!q || strip(blob).includes(q)) && (!year || String(budgetYear(b))===String(year)) && (!status || strip(b.status)===status) && (!client || b.clientId===client);
  }).sort((a,b)=>{
    const db=parseDateValue(b.date) || `${budgetYear(b)||0}-01-01`;
    const da=parseDateValue(a.date) || `${budgetYear(a)||0}-01-01`;
    return db.localeCompare(da) || String(b.number||'').localeCompare(String(a.number||''), 'ca', {numeric:true});
  });
}
function budgetsTable(rows){
  return table(['Sel.','Any','Data','Núm.','Client','Obra / feina','Estat','Import s/IVA','Total IVA incl.','Tipus import','Partides','Accions'], rows.map(b=>{
    const lineSum = budgetLineSum(b);
    const calcType = lineSum>0 ? 'Suma de partides' : (num(b.importedBase)>0 ? 'Total importat Excel' : 'Sense import');
    return `
    <tr class="clickable-row" data-open-budget="${esc(b.id)}">
      <td><input type="checkbox" class="select-budget" value="${esc(b.id)}" data-no-row-open></td>
      <td>${esc(budgetYear(b)||'')}</td>
      <td>${dateDisplay(b.date)}</td>
      <td><strong>${esc(b.number||b.id)}</strong><br><span class="muted">${esc(b.source||'')}</span></td>
      <td>${esc(clientName(b.clientId))}</td>
      <td><strong>${esc(b.title||jobName(b.jobId)||'')}</strong><br><span class="muted">${esc(byId(data.jobs,b.jobId)?.address||'')}</span></td>
      <td><select class="status-select" data-budget-status="${esc(b.id)}" data-no-row-open>${budgetStatusOptions(b.status||'Esborrany')}</select></td>
      <td class="num">${money(budgetBase(b))}</td>
      <td class="num"><strong>${money(budgetTotal(b))}</strong></td>
      <td>${esc(calcType)}</td>
      <td class="num">${(b.lines||[]).length}</td>
      <td class="nowrap"><button class="ghost small" data-edit-budget="${esc(b.id)}" data-no-row-open>Veure / editar</button> <button class="danger small" data-delete-budget="${esc(b.id)}" data-no-row-open>Eliminar</button></td>
    </tr>`}));
}
function renderBudgets(editId=''){
  setHeader('Pressupostos','Llistat complet de pressupostos importats o creats, amb any, client, feina, estat i partides.');
  if(editId) { state.editBudgetId=editId; state.selectedBudgetId=editId === '__new' ? '' : editId; }
  const years=[...new Set(data.budgets.map(b=>budgetYear(b)).filter(Boolean))].sort((a,b)=>b-a);
  const statuses=[...new Set(data.budgets.map(b=>b.status).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const rows=budgetRowsFiltered();
  const editing = state.editBudgetId === '__new' ? {id:'', lines:[], date:today(), ci:data.settings.defaultCI, dge:data.settings.defaultDGE, bi:data.settings.defaultBI, iva:data.settings.defaultIVA, status:'Esborrany'} : byId(data.budgets,state.editBudgetId);
  setContent(`
    <div class="grid four">
      <div class="kpi"><span>Pressupostos</span><strong>${data.budgets.length}</strong></div>
      <div class="kpi"><span>Total pressupostos s/IVA</span><strong>${money(data.budgets.reduce((s,b)=>s+budgetBase(b),0))}</strong></div>
      <div class="kpi"><span>Acceptats / fets</span><strong>${data.budgets.filter(b=>strip(b.status).includes('acceptat')||strip(b.status).includes('fet')).length}</strong></div>
      <div class="kpi"><span>Rebutjats / anul·lats</span><strong>${data.budgets.filter(b=>strip(b.status).includes('rebutjat')||strip(b.status).includes('anul')).length}</strong></div>
    </div>
    <div class="card"><div class="toolbar"><h2>Tots els pressupostos</h2><div class="right"><button class="ghost" id="selectAllBudgets">Seleccionar tot</button><button class="ghost" id="clearSelectedBudgets">Desmarcar</button><button class="danger" id="deleteSelectedBudgets">Eliminar seleccionats</button><button class="primary" id="newBudgetBtn">+ Nou pressupost</button><button class="ghost" id="exportBudgetCsv">Exportar CSV del seleccionat</button></div></div>
      <div class="filter-grid">
        <label>Cerca<input id="budgetSearch" placeholder="Client, obra, núm., adreça, any..." value="${esc(state.budgetSearch||'')}"></label>
        <label>Any<select id="budgetYearFilter"><option value="">Tots</option>${years.map(y=>`<option value="${y}" ${String(y)===String(state.budgetYearFilter||'')?'selected':''}>${y}</option>`).join('')}</select></label>
        <label>Client<select id="budgetClientFilter"><option value="">Tots</option>${options(data.clients,state.budgetClientFilter||'')}</select></label>
        <label>Estat<select id="budgetStatusFilter"><option value="">Tots</option>${statuses.map(x=>`<option ${strip(x)===strip(state.budgetStatusFilter||'')?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      </div>
      <div id="budgetFilterInfo" class="small-text" style="margin:10px 0">Mostrant ${rows.length} de ${data.budgets.length} pressupostos.</div>
      <div id="budgetsTable">${budgetsTable(rows)}</div>
    </div>
    <div class="empty">Clica sobre qualsevol pressupost o al botó “Veure / editar” per obrir-ne la fitxa completa en una finestra superior.</div>
  `);
}
function budgetFormCard(formBudget,isNew=false){
  return `<div class="card"><h2>${isNew?'Nou pressupost':'Editar pressupost'}</h2>
      <form id="budgetForm" class="form-grid">
        <input type="hidden" name="id" value="${esc(formBudget.id||uid('P'))}">
        <label>Número<input name="number" value="${esc(formBudget.number||'')}"></label>
        <label>Data<input name="date" type="date" value="${esc(formBudget.date||today())}"></label>
        <label class="wide">Client<select name="clientId" required><option value="">Selecciona client</option>${options(data.clients,formBudget.clientId)}</select></label>
        <label class="wide">Feina<select name="jobId"><option value="">Sense feina</option>${options(data.jobs,formBudget.jobId,x=>`${x.year} · ${x.title}`)}</select></label>
        <label class="wide">Títol pressupost<input name="title" value="${esc(formBudget.title||'')}"></label>
        <label>Estat<select name="status">${budgetStatusOptions(formBudget.status||'Esborrany')}</select></label>
        <label>CI %<input name="ci" type="number" step="0.01" value="${esc(formBudget.ci ?? data.settings.defaultCI)}"></label>
        <label>DGE %<input name="dge" type="number" step="0.01" value="${esc(formBudget.dge ?? data.settings.defaultDGE)}"></label>
        <label>BI %<input name="bi" type="number" step="0.01" value="${esc(formBudget.bi ?? data.settings.defaultBI)}"></label>
        <label>IVA %<input name="iva" type="number" step="0.01" value="${esc(formBudget.iva ?? data.settings.defaultIVA)}"></label>
        <label>Base importada s/IVA<input name="importedBase" type="number" step="0.01" value="${esc(formBudget.importedBase || '')}"></label>
        <label class="full">Notes<textarea name="notes">${esc(formBudget.notes||'')}</textarea></label>
        <div class="actions full"><button class="primary">Guardar pressupost</button><button class="ghost" type="button" data-render-budgets>Cancel·lar</button></div>
      </form>
    </div>`;
}
function filterBudgets(){
  state.budgetSearch=document.getElementById('budgetSearch')?.value||'';
  state.budgetYearFilter=document.getElementById('budgetYearFilter')?.value||'';
  state.budgetClientFilter=document.getElementById('budgetClientFilter')?.value||'';
  state.budgetStatusFilter=document.getElementById('budgetStatusFilter')?.value||'';
  const rows=budgetRowsFiltered();
  const tableEl=document.getElementById('budgetsTable'); if(tableEl) tableEl.innerHTML=budgetsTable(rows);
  const info=document.getElementById('budgetFilterInfo'); if(info) info.textContent=`Mostrant ${rows.length} de ${data.budgets.length} pressupostos.`;
  bindViewEvents();
}
function budgetLinesCard(b){
  return `<div class="card"><div class="toolbar"><h2>Partides del pressupost</h2><div class="right"><button class="ghost" id="selectAllBudgetLines">Seleccionar tot</button><button class="ghost" id="clearSelectedBudgetLines">Desmarcar</button><button class="danger" id="deleteSelectedBudgetLines">Eliminar línies seleccionades</button><button class="primary" id="addLineFromLibrary">Afegir de llibreria</button><button class="ghost" id="addManualLine">Afegir partida nova</button></div></div>
    <div class="table-wrap budget-lines"><table><thead><tr><th>Sel.</th><th>Codi</th><th>Ut</th><th>Concepte / descripció</th><th>Quantitat</th><th>Preu/ut</th><th>Total</th><th>Estat</th><th></th></tr></thead><tbody>${(b.lines||[]).map(l=>`
      <tr><td><input type="checkbox" class="select-budget-line" value="${esc(l.id)}"></td><td><input data-line-field="code" data-line-id="${esc(l.id)}" value="${esc(l.code||'')}"></td><td><input data-line-field="unit" data-line-id="${esc(l.id)}" value="${esc(l.unit||'')}"></td><td><input data-line-field="concept" data-line-id="${esc(l.id)}" value="${esc(l.concept||'')}"><div class="long muted">${esc(l.longDesc||'')}</div></td><td><input class="num" data-line-field="qty" data-line-id="${esc(l.id)}" type="number" step="0.0001" value="${esc(l.qty||'')}"></td><td><input class="num" data-line-field="unitPrice" data-line-id="${esc(l.id)}" type="number" step="0.01" value="${esc(l.unitPrice||'')}"></td><td class="num"><strong>${money(lineTotal(l))}</strong></td><td>${statusPill(l.status||'')}</td><td><button class="danger small" data-delete-line="${esc(l.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>
    <div class="budget-total"><div>Base: <strong>${money(budgetBase(b))}</strong></div><div>IVA: <strong>${money(budgetIVA(b))}</strong></div><div>Total: <strong>${money(budgetTotal(b))}</strong></div></div>
    ${budgetLineSum(b)===0 && num(b.importedBase)>0 ? `<div class="small-text" style="text-align:right;margin-top:6px">Base presa del total detectat a l’Excel original; les línies separades per * queden pendents de preu/amidament.</div>` : ''}
  </div>`;
}
function openBudgetModal(id=''){
  const isNew = id === '__new' || !id;
  const b = isNew ? {id:'', lines:[], date:today(), ci:data.settings.defaultCI, dge:data.settings.defaultDGE, bi:data.settings.defaultBI, iva:data.settings.defaultIVA, status:'Esborrany'} : byId(data.budgets,id);
  if(!b) return alert('No s’ha trobat aquest pressupost.');
  state.editBudgetId = isNew ? '__new' : b.id;
  state.selectedBudgetId = isNew ? '' : b.id;
  openModal(`
    <h2>${isNew?'Nou pressupost':'Pressupost · '+esc(b.number||b.id)}</h2>
    <div class="notice-blue card-tight">${isNew?'Primer guarda la capçalera del pressupost. Després podràs afegir partides de la llibreria o crear-ne de noves.':'Pots editar la capçalera i revisar les partides. Si un import prové del total de l’Excel, queda marcat com a total importat i no com a PU fiable.'}</div>
    ${budgetFormCard(b,isNew)}
    ${!isNew ? budgetLinesCard(b) : ''}
  `);
}
function renderInvoices(editId=''){
  setHeader('Factures','Factures associades a pressupostos i feines per calcular rendiment.');
  const i=editId ? byId(data.invoices,editId) : {date:today(), iva:data.settings.defaultIVA, paid:false};
  setContent(`
    <div class="card"><h2>${editId?'Editar factura':'Nova factura'}</h2>
      <form id="invoiceForm" class="form-grid">
        <input type="hidden" name="editId" value="${esc(editId)}"><input type="hidden" name="id" value="${esc(i.id||uid('FAC'))}">
        <label>Núm. factura<input name="number" value="${esc(i.number||'')}"></label>
        <label>Data<input name="date" type="date" value="${esc(i.date||today())}"></label>
        <label class="wide">Feina<select name="jobId"><option value="">Sense feina</option>${options(data.jobs,i.jobId,x=>`${x.year} · ${x.title}`)}</select></label>
        <label class="wide">Pressupost<select name="budgetId"><option value="">Sense pressupost</option>${options(data.budgets,i.budgetId,x=>`${x.number || x.id} · ${x.title || ''}`)}</select></label>
        <label>Tipus<select name="type"><option ${i.type==='Client'?'selected':''}>Client</option><option ${i.type==='Proveïdor'?'selected':''}>Proveïdor</option><option ${i.type==='Industrial'?'selected':''}>Industrial</option></select></label>
        <label class="wide">Concepte<input name="concept" value="${esc(i.concept||'')}"></label>
        <label>Base €<input name="base" type="number" step="0.01" value="${esc(i.base||'')}"></label>
        <label>IVA %<input name="iva" type="number" step="0.01" value="${esc(i.iva ?? data.settings.defaultIVA)}"></label>
        <label>Pagada<select name="paid"><option value="false" ${!i.paid?'selected':''}>No</option><option value="true" ${i.paid?'selected':''}>Sí</option></select></label>
        <label class="full">Notes<textarea name="notes">${esc(i.notes||'')}</textarea></label>
        <div class="actions full"><button class="primary">Guardar factura</button>${editId?'<button class="ghost" type="button" data-render-invoices>Cancel·lar</button>':''}</div>
      </form>
    </div>
    <div class="card"><h2>Llistat de factures</h2>${invoicesTable()}</div>
  `);
}
function invoicesTable(){
  return table(['Núm.','Data','Feina','Pressupost','Concepte','Base','Total IVA','Estat','Accions'], data.invoices.map(i=>`
    <tr><td>${esc(i.number||i.id)}</td><td>${esc(i.date||'')}</td><td>${esc(jobName(i.jobId))}</td><td>${esc(budgetName(i.budgetId))}</td><td>${esc(i.concept||'')}</td><td class="num">${money(invoiceBase(i))}</td><td class="num">${money(invoiceTotal(i))}</td><td>${statusPill(i.paid?'Pagada':'Pendent')}</td><td class="nowrap"><button class="ghost small" data-edit-invoice="${esc(i.id)}">Editar</button> <button class="danger small" data-delete-invoice="${esc(i.id)}">Eliminar</button></td></tr>`));
}
function renderPerformance(){
  setHeader('Rendiment','Comparativa per feina: pressupostat, facturat/despeses i marge.');
  const rows=data.jobs.map(j=>({j,b:jobBudgetTotal(j.id),i:jobInvoiceTotal(j.id)})).sort((a,b)=>b.b-a.b);
  const max=Math.max(1,...rows.map(r=>r.b));
  setContent(`
    <div class="grid four">
      <div class="kpi"><span>Total base pressupostos</span><strong>${money(data.budgets.reduce((s,b)=>s+budgetBase(b),0))}</strong></div>
      <div class="kpi"><span>Total factures IVA incl.</span><strong>${money(data.invoices.reduce((s,i)=>s+invoiceTotal(i),0))}</strong></div>
      <div class="kpi good"><span>Partides llibreria</span><strong>${data.library.length}</strong></div>
      <div class="kpi warn"><span>Pressupostos</span><strong>${data.budgets.length}</strong></div>
    </div>
    <div class="card"><h2>Gràfic ràpid de pressupost per feina</h2><div class="chart">${rows.slice(0,12).map(r=>`<div class="chart-bar" style="height:${Math.max(4,(r.b/max)*100)}%"><span>${money(r.b)}</span></div>`).join('')}</div><div class="chart-labels">${rows.slice(0,12).map(r=>`<span>${esc(r.j.year)} · ${esc(r.j.title.slice(0,28))}</span>`).join('')}</div></div>
    <div class="card"><h2>Rendiment per feina</h2>${table(['Any','Feina','Client','Pressupostat base','Factures','Marge','% marge'], rows.map(r=>{
      const m=r.b-r.i; const p=r.b?m/r.b*100:0;
      return `<tr><td>${esc(r.j.year)}</td><td>${esc(r.j.title)}</td><td>${esc(clientName(r.j.clientId))}</td><td class="num">${money(r.b)}</td><td class="num">${money(r.i)}</td><td class="num ${m>=0?'status-ok':'status-bad'}">${money(m)}</td><td class="num">${p.toFixed(1)}%</td></tr>`;}))}</div>
  `);
}
function renderAttachments(){
  setHeader('Arxius / albarans','Annexar PDF, imatges, albarans o factures escanejades a clients, feines o pressupostos.');
  setContent(`
    <div class="card"><h2>Nou arxiu</h2>
      <form id="attachmentForm" class="form-grid">
        <label class="wide">Arxiu<input name="file" type="file" required></label>
        <label>Categoria<select name="category"><option>Albarà</option><option>Factura</option><option>Pressupost original</option><option>Foto</option><option>Altres</option></select></label>
        <label>Incloure al JSON<select name="includeInJson"><option value="true">Sí, còpia transferible</option><option value="false">No, només referència</option></select></label>
        <label class="wide">Client<select name="clientId"><option value="">Sense client</option>${options(data.clients,'')}</select></label>
        <label class="wide">Feina<select name="jobId"><option value="">Sense feina</option>${options(data.jobs,'',x=>`${x.year} · ${x.title}`)}</select></label>
        <label class="wide">Pressupost<select name="budgetId"><option value="">Sense pressupost</option>${options(data.budgets,'',x=>`${x.number || x.id} · ${x.title || ''}`)}</select></label>
        <label class="full">Notes<textarea name="notes"></textarea></label>
        <div class="actions full"><button class="primary">Guardar arxiu</button></div>
      </form>
    </div>
    <div class="card"><h2>Arxius guardats</h2>${attachmentsTable()}</div>
  `);
}
function attachmentsTable(){
  return table(['Nom','Categoria','Client','Feina','Pressupost','Mida','JSON','Data','Accions'], data.attachments.map(a=>`
    <tr><td><strong>${esc(a.name)}</strong><br><span class="muted">${esc(a.type||'')}</span></td><td>${esc(a.category||'')}</td><td>${esc(clientName(a.clientId))}</td><td>${esc(jobName(a.jobId))}</td><td>${esc(budgetName(a.budgetId))}</td><td class="num">${((a.size||0)/1024).toFixed(1)} KB</td><td>${a.includeInJson?statusPill('Sí'):statusPill('No')}</td><td>${esc(a.createdAt||'')}</td><td><button class="ghost small" data-download-attachment="${esc(a.id)}">Obrir</button> <button class="danger small" data-delete-attachment="${esc(a.id)}">Eliminar</button></td></tr>`));
}
function renderImporter(){
  setHeader('Importar Excels / ZIP','Importació massiva local: clients del requadre, feines, pressupostos, partides i llibreria.');
  const ready = typeof XLSX !== 'undefined';
  setContent(`
    ${!ready?'<div class="card notice-red"><strong>Llibreria Excel no carregada.</strong> Comprova connexió o inclou SheetJS localment. Sense aquesta llibreria no es poden llegir .xls/.xlsx.</div>':''}
    <div class="card notice-blue"><strong>Criteri d’importació V08:</strong> el client guardat és el del requadre/destinatari del pressupost, no TEIMOR. Les obres es veuen integrades dins la pestanya Pressupostos. En pressupostos antics TEIMOR, l’app llegeix el requadre superior dret com a client, detecta la Data/Fecha adjacent, agafa la BASE IMPOSABLE o imports tipus “Materials i M.O.” com a total del pressupost i separa les línies de TREBALLS marcades amb * com a partides/subpartides pendents de revisar.</div>
    <div class="card"><div id="dropzone" class="dropzone">
      <h2>Importació massiva</h2><p>Arrossega aquí Excels o un ZIP, o fes servir els botons.</p>
      <div class="actions" style="justify-content:center">
        <label class="primary file-label">Seleccionar molts Excels<input id="excelInput" type="file" multiple accept=".xls,.xlsx,.xlsm,.csv" hidden></label>
        <label class="ghost file-label">Seleccionar carpeta<input id="folderInput" type="file" webkitdirectory directory multiple hidden></label>
        <label class="ghost file-label">Importar ZIP / detectar RAR<input id="zipInput" type="file" accept=".zip,.rar,application/x-rar-compressed,application/vnd.rar" hidden></label>
      </div>
    </div></div>
    <div id="importPreview">${state.importDraft ? importPreviewHtml(state.importDraft) : '<div class="empty">Encara no has importat cap fitxer en aquesta sessió.</div>'}</div>
  `);
}
function importPreviewHtml(d){
  return `<div class="card"><h2>Previsualització abans de confirmar</h2>
    <div class="import-summary">
      <div class="import-card"><span>Fitxers llegits</span><strong>${d.files.length}</strong></div>
      <div class="import-card"><span>Clients detectats</span><strong>${d.clients.length}</strong></div>
      <div class="import-card"><span>Obres internes</span><strong>${d.jobs.length}</strong></div>
      <div class="import-card"><span>Pressupostos</span><strong>${d.budgets.length}</strong></div>
      <div class="import-card"><span>Partides</span><strong>${d.items.length}</strong></div>
    </div>
    <div class="actions"><button class="primary" id="confirmImport">Confirmar importació</button><button class="ghost" id="discardImport">Descartar</button></div>
    <h3>Clients detectats</h3>${table(['Client','NIF/CIF','Telèfon','Email','Adreça obra','Origen'], d.clients.slice(0,30).map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.nif)}</td><td>${esc(c.phone)}</td><td>${esc(c.email)}</td><td>${esc(c.workAddress)}</td><td>${esc(c.source)}</td></tr>`))}
    <h3>Partides detectades</h3>${table(['Codi','Ut','Concepte','Quantitat','PU','Total','Estat','Origen'], d.items.slice(0,120).map(i=>`<tr><td>${esc(i.code)}</td><td>${esc(i.unit)}</td><td><strong>${esc(i.concept)}</strong><div class="long muted">${esc(i.longDesc)}</div></td><td class="num">${i.qty?num(i.qty).toFixed(3):''}</td><td class="num">${i.unitPrice?money(i.unitPrice):''}</td><td class="num">${i.total?money(i.total):''}</td><td>${statusPill(i.status)}</td><td>${esc(i.origin)}</td></tr>`))}
    <h3>Registre d’importació</h3><div class="log">${esc(d.log.join('\n'))}</div>
  </div>`;
}
function renderSettings(){
  setHeader('Configuració','Dades de TEIMOR, percentatges per defecte, usuari/contrasenya i manteniment local.');
  const s=data.settings;
  setContent(`
    <div class="card"><h2>Configuració general</h2>
      <form id="settingsForm" class="form-grid">
        <label class="wide">Nom app<input name="appName" value="${esc(s.appName||'')}"></label>
        <label>CI defecte %<input name="defaultCI" type="number" step="0.01" value="${esc(s.defaultCI)}"></label>
        <label>DGE defecte %<input name="defaultDGE" type="number" step="0.01" value="${esc(s.defaultDGE)}"></label>
        <label>BI defecte %<input name="defaultBI" type="number" step="0.01" value="${esc(s.defaultBI)}"></label>
        <label>IVA defecte %<input name="defaultIVA" type="number" step="0.01" value="${esc(s.defaultIVA)}"></label>
        <label class="wide">Empresa contractista<input name="contractista_name" value="${esc(s.contractista?.name||'')}"></label>
        <label>NIF TEIMOR<input name="contractista_nif" value="${esc(s.contractista?.nif||'')}"></label>
        <label>Telèfon TEIMOR<input name="contractista_phone" value="${esc(s.contractista?.phone||'')}"></label>
        <label class="wide">Email TEIMOR<input name="contractista_email" value="${esc(s.contractista?.email||'')}"></label>
        <label class="wide">Adreça TEIMOR<input name="contractista_address" value="${esc(s.contractista?.address||'')}"></label>
        <label>Municipi<input name="contractista_city" value="${esc(s.contractista?.city||'')}"></label>
        <div class="actions full"><button class="primary">Guardar configuració</button></div>
      </form>
    </div>
    <div class="card"><h2>Accés local</h2>
      <form id="passwordForm" class="form-grid">
        <label>Usuari<input name="loginUser" value="${esc(s.loginUser||DEFAULT_USER)}"></label>
        <label>Nova contrasenya<input name="newPass" type="password" placeholder="Deixa buit per no canviar"></label>
        <div class="actions full"><button class="primary">Guardar usuari / contrasenya</button></div>
      </form>
      <p class="muted">Aquesta protecció és d’accés visual local. Les dades reals viatgen quan exportes un JSON complet.</p>
    </div>
    <div class="card notice-red"><h2>Manteniment</h2><p>Esborrarà les dades locals d’aquest navegador.</p><button class="danger" id="hardReset">Restaurar demo / esborrar dades locals</button></div>
  `);
}
function bindViewEvents(){
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ state.view=b.dataset.go; render(); });
  const dashExport=document.getElementById('dashExport'); if(dashExport) dashExport.onclick=()=>exportJson(true);
  const clientForm=document.getElementById('clientForm'); if(clientForm) clientForm.onsubmit=saveClient;
  const newClientBtn=document.getElementById('newClientBtn'); if(newClientBtn) newClientBtn.onclick=()=>renderClients('__new');
  ['clientSearch','clientYearFilter','clientCityFilter','clientStatusFilter'].forEach(id=>{ const el=document.getElementById(id); if(el) el.oninput=filterClients; if(el) el.onchange=filterClients; });
  document.querySelectorAll('[data-edit-client]').forEach(b=>b.onclick=()=>renderClients(b.dataset.editClient));
  document.querySelectorAll('[data-delete-client]').forEach(b=>b.onclick=()=>deleteClient(b.dataset.deleteClient));
  const selAllClients=document.getElementById('selectAllClients'); if(selAllClients) selAllClients.onclick=()=>setChecked('.select-client',true);
  const clearClients=document.getElementById('clearSelectedClients'); if(clearClients) clearClients.onclick=()=>setChecked('.select-client',false);
  const delSelClients=document.getElementById('deleteSelectedClients'); if(delSelClients) delSelClients.onclick=deleteSelectedClients;
  document.querySelectorAll('[data-render-clients]').forEach(b=>b.onclick=()=>renderClients());

  const jobForm=document.getElementById('jobForm'); if(jobForm) jobForm.onsubmit=saveJob;
  const yearFilter=document.getElementById('yearFilter'); if(yearFilter) yearFilter.onchange=e=>{ state.yearFilter=e.target.value; renderJobs(); };
  document.querySelectorAll('[data-edit-job]').forEach(b=>b.onclick=()=>renderJobs(b.dataset.editJob));
  document.querySelectorAll('[data-delete-job]').forEach(b=>b.onclick=()=>deleteJob(b.dataset.deleteJob));
  document.querySelectorAll('[data-render-jobs]').forEach(b=>b.onclick=()=>renderJobs());

  const libSearch=document.getElementById('libSearch'); if(libSearch) libSearch.oninput=e=>{ state.libSearch=e.target.value; renderLibrary(); };
  const libChapter=document.getElementById('libChapterFilter'); if(libChapter) libChapter.onchange=e=>{ state.libChapterFilter=e.target.value; renderLibrary(); };
  const libStatus=document.getElementById('libStatusFilter'); if(libStatus) libStatus.onchange=e=>{ state.libStatusFilter=e.target.value; renderLibrary(); };
  const selAllLibrary=document.getElementById('selectAllLibrary'); if(selAllLibrary) selAllLibrary.onclick=()=>setChecked('.select-library',true);
  const clearLibrary=document.getElementById('clearSelectedLibrary'); if(clearLibrary) clearLibrary.onclick=()=>setChecked('.select-library',false);
  const delSelLib=document.getElementById('deleteSelectedLibrary'); if(delSelLib) delSelLib.onclick=deleteSelectedLibrary;
  const exportLib=document.getElementById('exportLibraryJson'); if(exportLib) exportLib.onclick=exportLibraryJson;
  const importLib=document.getElementById('importLibraryJson'); if(importLib) importLib.onchange=importLibraryJson;
  const newLib=document.getElementById('newLibItem'); if(newLib) newLib.onclick=()=>openLibModal('');
  document.querySelectorAll('[data-view-lib]').forEach(b=>b.onclick=()=>openLibModal(b.dataset.viewLib));
  document.querySelectorAll('[data-delete-lib]').forEach(b=>b.onclick=()=>deleteLibraryItem(b.dataset.deleteLib));

  const newBudget=document.getElementById('newBudgetBtn'); if(newBudget) newBudget.onclick=()=>openBudgetModal('__new');
  const budgetForm=document.getElementById('budgetForm'); if(budgetForm) budgetForm.onsubmit=saveBudget;
  document.querySelectorAll('[data-render-budgets]').forEach(b=>b.onclick=()=>{ closeModal(); state.editBudgetId=''; renderBudgets(); });
  ['budgetSearch','budgetYearFilter','budgetClientFilter','budgetStatusFilter'].forEach(id=>{ const el=document.getElementById(id); if(el) el.oninput=filterBudgets; if(el) el.onchange=filterBudgets; });
  document.querySelectorAll('[data-edit-budget]').forEach(b=>b.onclick=()=>openBudgetModal(b.dataset.editBudget));
  document.querySelectorAll('[data-open-budget]').forEach(row=>row.onclick=e=>{ if(e.target.closest('[data-no-row-open]') || e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) return; openBudgetModal(row.dataset.openBudget); });
  document.querySelectorAll('[data-delete-budget]').forEach(b=>b.onclick=()=>deleteBudget(b.dataset.deleteBudget));
  const selAllBudgets=document.getElementById('selectAllBudgets'); if(selAllBudgets) selAllBudgets.onclick=()=>setChecked('.select-budget',true);
  const clearBudgets=document.getElementById('clearSelectedBudgets'); if(clearBudgets) clearBudgets.onclick=()=>setChecked('.select-budget',false);
  const delSelBudgets=document.getElementById('deleteSelectedBudgets'); if(delSelBudgets) delSelBudgets.onclick=deleteSelectedBudgets;
  document.querySelectorAll('[data-budget-status]').forEach(sel=>sel.onchange=e=>updateBudgetStatus(e.target.dataset.budgetStatus,e.target.value));
  document.querySelectorAll('[data-render-budgets]').forEach(b=>b.onclick=()=>{ state.editBudgetId=''; renderBudgets(); });
  const addLib=document.getElementById('addLineFromLibrary'); if(addLib) addLib.onclick=openAddLineFromLibrary;
  const addManual=document.getElementById('addManualLine'); if(addManual) addManual.onclick=()=>addManualLine();
  const exportBudgetCsv=document.getElementById('exportBudgetCsv'); if(exportBudgetCsv) exportBudgetCsv.onclick=downloadBudgetCsv;
  document.querySelectorAll('[data-line-field]').forEach(inp=>inp.onchange=updateBudgetLine);
  document.querySelectorAll('[data-delete-line]').forEach(b=>b.onclick=()=>deleteBudgetLine(b.dataset.deleteLine));
  const selAllLines=document.getElementById('selectAllBudgetLines'); if(selAllLines) selAllLines.onclick=()=>setChecked('.select-budget-line',true);
  const clearLines=document.getElementById('clearSelectedBudgetLines'); if(clearLines) clearLines.onclick=()=>setChecked('.select-budget-line',false);
  const delSelLines=document.getElementById('deleteSelectedBudgetLines'); if(delSelLines) delSelLines.onclick=deleteSelectedBudgetLines;

  const invoiceForm=document.getElementById('invoiceForm'); if(invoiceForm) invoiceForm.onsubmit=saveInvoice;
  document.querySelectorAll('[data-edit-invoice]').forEach(b=>b.onclick=()=>renderInvoices(b.dataset.editInvoice));
  document.querySelectorAll('[data-delete-invoice]').forEach(b=>b.onclick=()=>deleteInvoice(b.dataset.deleteInvoice));
  document.querySelectorAll('[data-render-invoices]').forEach(b=>b.onclick=()=>renderInvoices());

  const attachForm=document.getElementById('attachmentForm'); if(attachForm) attachForm.onsubmit=saveAttachment;
  document.querySelectorAll('[data-download-attachment]').forEach(b=>b.onclick=()=>downloadAttachment(b.dataset.downloadAttachment));
  document.querySelectorAll('[data-delete-attachment]').forEach(b=>b.onclick=()=>deleteAttachment(b.dataset.deleteAttachment));

  const dz=document.getElementById('dropzone');
  if(dz){
    ['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault(); dz.classList.add('drag');}));
    ['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault(); dz.classList.remove('drag');}));
    dz.addEventListener('drop',e=>handleImportFiles([...e.dataTransfer.files]));
  }
  const excelInput=document.getElementById('excelInput'); if(excelInput) excelInput.onchange=e=>handleImportFiles([...e.target.files]);
  const folderInput=document.getElementById('folderInput'); if(folderInput) folderInput.onchange=e=>handleImportFiles([...e.target.files]);
  const zipInput=document.getElementById('zipInput'); if(zipInput) zipInput.onchange=e=>handleImportFiles([...e.target.files]);
  const confirmImport=document.getElementById('confirmImport'); if(confirmImport) confirmImport.onclick=confirmDraftImport;
  const discardImport=document.getElementById('discardImport'); if(discardImport) discardImport.onclick=()=>{ state.importDraft=null; renderImporter(); };

  const settingsForm=document.getElementById('settingsForm'); if(settingsForm) settingsForm.onsubmit=saveSettings;
  const passwordForm=document.getElementById('passwordForm'); if(passwordForm) passwordForm.onsubmit=savePassword;
  const reset=document.getElementById('hardReset'); if(reset) reset.onclick=hardReset;
}
function formObj(form){ return Object.fromEntries(new FormData(form).entries()); }
function saveClient(e){ e.preventDefault(); const f=formObj(e.target); const c={id:f.id,name:f.name,nif:f.nif,phone:f.phone,email:f.email,contact:f.contact,fiscalAddress:f.fiscalAddress,workAddress:f.workAddress,city:f.city,status:f.status,notes:f.notes}; const idx=data.clients.findIndex(x=>x.id===f.editId || x.id===c.id); if(idx>=0) data.clients[idx]=c; else data.clients.push(c); saveData(); renderClients(); }
function deleteClient(id){ if(!confirm('Eliminar aquest client? Les feines i pressupostos vinculats quedaran sense client.')) return; data.clients=data.clients.filter(x=>x.id!==id); data.jobs.forEach(j=>{ if(j.clientId===id) j.clientId=''; }); data.budgets.forEach(b=>{ if(b.clientId===id) b.clientId=''; }); data.invoices.forEach(i=>{ if(i.clientId===id) i.clientId=''; }); saveData(); renderClients(); }
function selectedValues(selector){ return [...document.querySelectorAll(selector+':checked')].map(x=>x.value); }
function setChecked(selector, checked=true){ document.querySelectorAll(selector).forEach(x=>{ x.checked=checked; }); }
function isModalOpen(){ return !document.getElementById('modal')?.classList.contains('hidden'); }
function deleteSelectedClients(){ const ids=selectedValues('.select-client'); if(!ids.length) return alert('No has seleccionat cap client.'); if(!confirm(`Eliminar ${ids.length} client/s seleccionat/s? Les feines i pressupostos vinculats quedaran sense client.`)) return; data.clients=data.clients.filter(x=>!ids.includes(x.id)); data.jobs.forEach(j=>{ if(ids.includes(j.clientId)) j.clientId=''; }); data.budgets.forEach(b=>{ if(ids.includes(b.clientId)) b.clientId=''; }); data.invoices.forEach(i=>{ if(ids.includes(i.clientId)) i.clientId=''; }); saveData(); renderClients(); }

function saveJob(e){ e.preventDefault(); const f=formObj(e.target); const j={id:f.id,year:Number(f.year)||new Date().getFullYear(),clientId:f.clientId,title:f.title,address:f.address,city:f.city,status:f.status,notes:f.notes,mainBudgetId:byId(data.jobs,f.editId)?.mainBudgetId||''}; const idx=data.jobs.findIndex(x=>x.id===f.editId || x.id===j.id); if(idx>=0) data.jobs[idx]=j; else data.jobs.push(j); saveData(); renderJobs(); }
function deleteJob(id){ if(!confirm('Eliminar aquesta feina/obra? Els pressupostos vinculats quedaran sense feina.')) return; data.jobs=data.jobs.filter(x=>x.id!==id); data.budgets.forEach(b=>{ if(b.jobId===id) b.jobId=''; }); data.invoices.forEach(i=>{ if(i.jobId===id) i.jobId=''; }); saveData(); renderJobs(); }
function saveBudget(e){ e.preventDefault(); const f=formObj(e.target); const old=byId(data.budgets,f.id); const b={...(old||{}), id:f.id, number:f.number, date:f.date, clientId:f.clientId, jobId:f.jobId, title:f.title, status:f.status, ci:num(f.ci), dge:num(f.dge), bi:num(f.bi), iva:num(f.iva), importedBase:num(f.importedBase), notes:f.notes, lines:old?.lines||[]}; const idx=data.budgets.findIndex(x=>x.id===b.id); if(idx>=0) data.budgets[idx]=b; else data.budgets.push(b); state.selectedBudgetId=b.id; state.editBudgetId=''; const job=byId(data.jobs,b.jobId); if(job && !job.mainBudgetId) job.mainBudgetId=b.id; saveData(); if(isModalOpen()) closeModal(); renderBudgets(); }
function updateBudgetStatus(id,status){ const b=byId(data.budgets,id); if(!b) return; b.status=status; saveData(); filterBudgets(); }
function deleteBudget(id){ if(!confirm('Eliminar aquest pressupost i les seves partides?')) return; data.budgets=data.budgets.filter(x=>x.id!==id); data.jobs.forEach(j=>{ if(j.mainBudgetId===id) j.mainBudgetId=''; }); data.invoices.forEach(i=>{ if(i.budgetId===id) i.budgetId=''; }); if(state.selectedBudgetId===id) state.selectedBudgetId=''; if(state.editBudgetId===id) state.editBudgetId=''; saveData(); renderBudgets(); }
function deleteSelectedBudgets(){ const ids=selectedValues('.select-budget'); if(!ids.length) return alert('No has seleccionat cap pressupost.'); if(!confirm(`Eliminar ${ids.length} pressupost/os seleccionat/s?`)) return; data.budgets=data.budgets.filter(x=>!ids.includes(x.id)); data.jobs.forEach(j=>{ if(ids.includes(j.mainBudgetId)) j.mainBudgetId=''; }); data.invoices.forEach(i=>{ if(ids.includes(i.budgetId)) i.budgetId=''; }); if(ids.includes(state.selectedBudgetId)) state.selectedBudgetId=''; if(ids.includes(state.editBudgetId)) state.editBudgetId=''; saveData(); renderBudgets(); }

function updateBudgetLine(e){ const b=byId(data.budgets,state.selectedBudgetId); if(!b) return; const l=(b.lines||[]).find(x=>x.id===e.target.dataset.lineId); if(!l) return; const field=e.target.dataset.lineField; l[field]=['qty','unitPrice'].includes(field)?num(e.target.value):e.target.value; if(field==='qty' || field==='unitPrice') l.total=num(l.qty)*num(l.unitPrice); saveData(); if(isModalOpen()) openBudgetModal(b.id); else renderBudgets(); }
function deleteBudgetLine(id){ const b=byId(data.budgets,state.selectedBudgetId); if(!b) return; b.lines=(b.lines||[]).filter(x=>x.id!==id); saveData(); if(isModalOpen()) openBudgetModal(b.id); else renderBudgets(); }
function deleteSelectedBudgetLines(){ const ids=selectedValues('.select-budget-line'); if(!ids.length) return alert('No has seleccionat cap línia.'); const b=byId(data.budgets,state.selectedBudgetId); if(!b) return; if(!confirm(`Eliminar ${ids.length} línia/es seleccionada/es del pressupost?`)) return; b.lines=(b.lines||[]).filter(l=>!ids.includes(l.id)); saveData(); if(isModalOpen()) openBudgetModal(b.id); else renderBudgets(b.id); }

function addManualLine(){ const b=byId(data.budgets,state.selectedBudgetId); if(!b) return; b.lines=b.lines||[]; b.lines.push({id:uid('LIN'),code:'',chapter:'',unit:'',concept:'Nova partida',longDesc:'',qty:1,unitPrice:0,total:0,status:'Manual pendent revisar',origin:'Manual'}); saveData(); if(isModalOpen()) openBudgetModal(b.id); else renderBudgets(); }
function openAddLineFromLibrary(){
  const b=byId(data.budgets,state.selectedBudgetId); if(!b) return;
  openModal(`<h2>Afegir partida de llibreria</h2><div class="toolbar"><input id="addLibSearch" placeholder="Cercar partida..." style="max-width:420px"></div><div id="addLibResults">${addLibResultsHtml(data.library.slice(0,60), b)}</div>`);
  document.getElementById('addLibSearch').oninput=e=>{ const q=strip(e.target.value); const rows=data.library.filter(x=>strip([x.code,x.chapter,x.unit,x.concept,x.longDesc].join(' ')).includes(q)).slice(0,80); document.getElementById('addLibResults').innerHTML=addLibResultsHtml(rows,b); bindAddLibButtons(b); };
  bindAddLibButtons(b);
}
function addLibResultsHtml(rows,b){ return table(['Codi','Ut','Concepte','PU segons pressupost','Estat','Acció'], rows.map(x=>`<tr><td>${esc(x.code||'')}</td><td>${esc(x.unit||'')}</td><td><strong>${esc(x.concept||'')}</strong><div class="long muted">${esc(x.longDesc||'')}</div></td><td class="num">${money(x.unitPrice || libFinal(x,b))}</td><td>${statusPill(x.status||'')}</td><td><button class="primary small" data-add-lib-to-budget="${esc(x.id)}">Afegir</button></td></tr>`)); }
function bindAddLibButtons(b){ document.querySelectorAll('[data-add-lib-to-budget]').forEach(btn=>btn.onclick=()=>{ const x=byId(data.library,btn.dataset.addLibToBudget); b.lines=b.lines||[]; const pu=x.unitPrice || libFinal(x,b); b.lines.push({id:uid('LIN'),libraryId:x.id,code:x.code,chapter:x.chapter,unit:x.unit,concept:x.concept,longDesc:x.longDesc,qty:1,unitPrice:Number(pu.toFixed(2)),total:Number(pu.toFixed(2)),status:x.status||'De llibreria',origin:'Llibreria'}); saveData(); closeModal(); renderBudgets(); }); }
function downloadBudgetCsv(){ const b=byId(data.budgets,state.selectedBudgetId); if(!b) return alert('Selecciona un pressupost.'); const rows=[['Codi','Ut','Concepte','Descripcio llarga','Quantitat','Preu unitari','Total']].concat((b.lines||[]).map(l=>[l.code,l.unit,l.concept,l.longDesc,l.qty,l.unitPrice,lineTotal(l)])); downloadText(rows.map(r=>r.map(x=>`"${String(x??'').replace(/"/g,'""')}"`).join(';')).join('\n'), `pressupost_${b.number||b.id}.csv`, 'text/csv;charset=utf-8'); }
function saveInvoice(e){ e.preventDefault(); const f=formObj(e.target); const i={id:f.id,number:f.number,date:f.date,jobId:f.jobId,budgetId:f.budgetId,type:f.type,concept:f.concept,base:num(f.base),iva:num(f.iva),paid:f.paid==='true',notes:f.notes}; const idx=data.invoices.findIndex(x=>x.id===f.editId || x.id===i.id); if(idx>=0) data.invoices[idx]=i; else data.invoices.push(i); saveData(); renderInvoices(); }
function deleteInvoice(id){ if(!confirm('Eliminar aquesta factura?')) return; data.invoices=data.invoices.filter(x=>x.id!==id); saveData(); renderInvoices(); }
async function saveSettings(e){ e.preventDefault(); const f=formObj(e.target); data.settings.appName=f.appName; data.settings.defaultCI=num(f.defaultCI); data.settings.defaultDGE=num(f.defaultDGE); data.settings.defaultBI=num(f.defaultBI); data.settings.defaultIVA=num(f.defaultIVA); data.settings.contractista={name:f.contractista_name,nif:f.contractista_nif,phone:f.contractista_phone,email:f.contractista_email,address:f.contractista_address,city:f.contractista_city}; saveData(); alert('Configuració guardada.'); renderSettings(); }
async function savePassword(e){ e.preventDefault(); const f=formObj(e.target); data.settings.loginUser=f.loginUser || DEFAULT_USER; if(f.newPass) data.settings.passwordHash=await sha256(f.newPass); saveData(); alert('Usuari/contrasenya guardats.'); renderSettings(); }
function openModal(html){ document.getElementById('modalContent').innerHTML=html; document.getElementById('modal').classList.remove('hidden'); bindModalEvents(); }
function closeModal(){ document.getElementById('modal').classList.add('hidden'); document.getElementById('modalContent').innerHTML=''; }
function bindModalEvents(){
  const close=document.getElementById('closeModalBtn'); if(close) close.onclick=closeModal;
  document.querySelectorAll('[data-modal-tab]').forEach(btn=>btn.onclick=()=>{ const key=btn.dataset.modalTab; document.querySelectorAll('[data-modal-tab]').forEach(b=>b.classList.toggle('active', b===btn)); document.querySelectorAll('[data-modal-panel]').forEach(p=>p.classList.toggle('active', p.dataset.modalPanel===key)); });
  const libForm=document.getElementById('libForm'); if(libForm) libForm.onsubmit=saveLibraryItem;
  const budgetForm=document.getElementById('budgetForm'); if(budgetForm) budgetForm.onsubmit=saveBudget;
  document.querySelectorAll('[data-render-budgets]').forEach(b=>b.onclick=()=>{ closeModal(); state.editBudgetId=''; renderBudgets(); });
  document.querySelectorAll('[data-line-field]').forEach(inp=>inp.onchange=updateBudgetLine);
  document.querySelectorAll('[data-delete-line]').forEach(b=>b.onclick=()=>deleteBudgetLine(b.dataset.deleteLine));
  const selAllLines=document.getElementById('selectAllBudgetLines'); if(selAllLines) selAllLines.onclick=()=>setChecked('.select-budget-line',true);
  const clearLines=document.getElementById('clearSelectedBudgetLines'); if(clearLines) clearLines.onclick=()=>setChecked('.select-budget-line',false);
  const delSelLines=document.getElementById('deleteSelectedBudgetLines'); if(delSelLines) delSelLines.onclick=deleteSelectedBudgetLines;
  const addLib=document.getElementById('addLineFromLibrary'); if(addLib) addLib.onclick=openAddLineFromLibrary;
  const addManual=document.getElementById('addManualLine'); if(addManual) addManual.onclick=()=>addManualLine();
  const add=document.getElementById('addDecompLine'); if(add) add.onclick=()=>{ const tbody=document.querySelector('#decompTable tbody'); const i=tbody.querySelectorAll('[data-decomp-row]').length; tbody.insertAdjacentHTML('beforeend', decompRow({},i)); bindModalEvents(); };
  document.querySelectorAll('[data-remove-decomp]').forEach(b=>b.onclick=()=>b.closest('tr').remove());
}
function saveLibraryItem(e){
  e.preventDefault(); const f=formObj(e.target);
  const rows=[...document.querySelectorAll('#decompTable tbody tr')];
  const decomp=rows.map((tr,i)=>({type:tr.querySelector(`[name="type_${i}"]`)?.value||tr.querySelector('select')?.value||'Material', name:tr.querySelector(`[name="name_${i}"]`)?.value||tr.children[1]?.querySelector('input')?.value||'', unit:tr.querySelector(`[name="unit_${i}"]`)?.value||tr.children[2]?.querySelector('input')?.value||'', yield:num(tr.querySelector(`[name="yield_${i}"]`)?.value||tr.children[3]?.querySelector('input')?.value), price:num(tr.querySelector(`[name="price_${i}"]`)?.value||tr.children[4]?.querySelector('input')?.value)})).filter(x=>x.name || x.yield || x.price);
  const direct = num(f.directCost) || decomp.reduce((s,l)=>s+num(l.yield)*num(l.price),0);
  const final = num(f.unitPrice) || direct * factor(f.ci,f.dge,f.bi);
  const item={id:f.id,code:f.code,chapter:f.chapter,unit:f.unit,concept:f.concept,longDesc:f.longDesc,directCost:direct,unitPrice:final,ci:num(f.ci),dge:num(f.dge),bi:num(f.bi),origin:f.origin,status:f.status,decomp};
  const idx=data.library.findIndex(x=>x.id===f.editId || x.id===item.id);
  if(idx>=0) data.library[idx]=item; else data.library.push(item);
  saveData(); closeModal(); renderLibrary();
}
function deleteLibraryItem(id){ if(!confirm('Eliminar aquesta partida de la llibreria? Les línies ja inserides en pressupostos no s’esborraran.')) return; data.library=data.library.filter(x=>x.id!==id); saveData(); renderLibrary(); }
function deleteSelectedLibrary(){ const ids=selectedValues('.select-library'); if(!ids.length) return alert('No has seleccionat cap partida.'); if(!confirm(`Eliminar ${ids.length} partida/es de la llibreria? Les línies ja inserides en pressupostos no s’esborraran.`)) return; data.library=data.library.filter(x=>!ids.includes(x.id)); saveData(); renderLibrary(); }
function exportLibraryJson(){
  const payload={type:'TEIMOR_LIBRARY',version:data.meta?.version||'8.0.0',exportedAt:new Date().toISOString(),library:data.library||[]};
  downloadText(JSON.stringify(payload,null,2), `TEIMOR_llibreria_partides_${today()}.json`, 'application/json');
}
async function importLibraryJson(e){
  const file=e.target.files?.[0]; if(!file) return;
  try{
    const obj=JSON.parse(await file.text());
    const rows=Array.isArray(obj) ? obj : (obj.library || obj.partides || []);
    if(!rows.length) return alert('Aquest JSON no conté partides de llibreria.');
    let added=0, merged=0;
    for(const raw of rows){
      const item={...raw,id:raw.id||uid('LIB'),decomp:raw.decomp||[],history:raw.history||[]};
      const existing=findExistingLibraryItem(item) || data.library.find(x=>x.id===item.id);
      if(existing){ Object.assign(existing,{...existing,...item,id:existing.id}); merged++; }
      else { data.library.push(item); added++; }
    }
    saveData(); alert(`Llibreria importada. Noves: ${added}. Actualitzades/possibles duplicades: ${merged}.`); renderLibrary();
  }catch(err){ console.error(err); alert('No s’ha pogut importar la llibreria JSON.'); }
  e.target.value='';
}


function openIdb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=e=>{ e.target.result.createObjectStore(DB_STORE,{keyPath:'id'}); };
    req.onsuccess=e=>resolve(e.target.result); req.onerror=e=>reject(e.target.error);
  });
}
async function idbPut(record){ const db=await openIdb(); return new Promise((res,rej)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).put(record); tx.oncomplete=()=>res(); tx.onerror=e=>rej(e.target.error); }); }
async function idbGet(id){ const db=await openIdb(); return new Promise((res,rej)=>{ const req=db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).get(id); req.onsuccess=()=>res(req.result); req.onerror=e=>rej(e.target.error); }); }
async function idbDelete(id){ const db=await openIdb(); return new Promise((res,rej)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).delete(id); tx.oncomplete=()=>res(); tx.onerror=e=>rej(e.target.error); }); }
async function idbAll(){ const db=await openIdb(); return new Promise((res,rej)=>{ const req=db.transaction(DB_STORE,'readonly').objectStore(DB_STORE).getAll(); req.onsuccess=()=>res(req.result||[]); req.onerror=e=>rej(e.target.error); }); }
async function saveAttachment(e){
  e.preventDefault(); const f=formObj(e.target); const file=e.target.file.files[0]; if(!file) return;
  const id=uid('ARX'); const include=f.includeInJson==='true'; const meta={id,name:file.name,type:file.type,size:file.size,category:f.category,clientId:f.clientId,jobId:f.jobId,budgetId:f.budgetId,includeInJson:include,notes:f.notes,createdAt:new Date().toISOString()};
  const dataUrl=include ? await fileToDataUrl(file) : '';
  await idbPut({id,blob:file,dataUrl,meta}); data.attachments.push(meta); saveData(); renderAttachments();
}
function fileToDataUrl(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }
async function downloadAttachment(id){ const rec=await idbGet(id); if(!rec){ alert('No s’ha trobat el fitxer local. Potser s’ha importat només la referència.'); return; } const url=URL.createObjectURL(rec.blob); const a=document.createElement('a'); a.href=url; a.download=rec.meta?.name || 'arxiu'; a.click(); URL.revokeObjectURL(url); }
async function deleteAttachment(id){ if(!confirm('Eliminar arxiu local?')) return; data.attachments=data.attachments.filter(a=>a.id!==id); await idbDelete(id); saveData(); renderAttachments(); }
async function exportPackageZip(){
  if(typeof JSZip === 'undefined') return alert('No s’ha carregat JSZip. Prova exportar JSON complet o revisa la connexió.');
  const zip=new JSZip();
  const payload={...data, exportedAt:new Date().toISOString(), packageType:'TEIMOR_V08_COMPLET'};
  zip.file('teimor_dades_completes.json', JSON.stringify(payload,null,2));
  zip.file('README.txt', 'Paquet exportat des de TEIMOR Gestor. Aquest ZIP és compatible amb WinRAR. Per seguretat, pot contenir dades personals si has exportat la còpia completa.');
  const folder=zip.folder('arxius_incrustats');
  for(const a of data.attachments || []){
    if(a.includeInJson){
      const rec=await idbGet(a.id);
      if(rec?.blob) folder.file(a.name || `${a.id}.bin`, rec.blob);
    }
  }
  const blob=await zip.generateAsync({type:'blob'});
  downloadBlob(blob, `TEIMOR_copia_completa_WinRAR_${today()}.zip`);
}
async function exportJson(full){
  const copy=JSON.parse(JSON.stringify(data));
  copy.exportedAt=new Date().toISOString(); copy.exportMode=full?'complete':'demo_net';
  if(full){
    const all=await idbAll();
    copy.attachmentPayloads=all.filter(x=>x.meta?.includeInJson && x.dataUrl).map(x=>({id:x.id,dataUrl:x.dataUrl,meta:x.meta}));
  } else {
    copy.clients=copy.clients.map((c,i)=>({...c,name:`Client demo ${String(i+1).padStart(3,'0')}`,nif:'',phone:'',email:'',contact:'',fiscalAddress:'',workAddress:c.workAddress||'',notes:''}));
    copy.attachmentPayloads=[];
  }
  downloadText(JSON.stringify(copy,null,2), `TEIMOR_${full?'copia_completa':'demo_net'}_${today()}.json`, 'application/json');
}
async function importJson(e){
  const file=e.target.files[0]; if(!file) return; try{
    const obj=JSON.parse(await file.text());
    const payloads=obj.attachmentPayloads || [];
    delete obj.attachmentPayloads; delete obj.exportedAt; delete obj.exportMode;
    data=obj; saveData();
    for(const p of payloads){ if(p.dataUrl){ const blob=await (await fetch(p.dataUrl)).blob(); await idbPut({id:p.id,blob,dataUrl:p.dataUrl,meta:p.meta}); } }
    alert(`JSON importat correctament. Arxius incrustats restaurats: ${payloads.length}`); render();
  }catch(err){ console.error(err); alert('No s’ha pogut importar el JSON.'); }
  e.target.value='';
}
function downloadBlob(blob, filename){ const a=document.createElement('a'); const url=URL.createObjectURL(blob); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }
function downloadText(text, filename, type='text/plain'){ const blob=new Blob([text],{type}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href); }
async function handleImportFiles(files){
  if(typeof XLSX === 'undefined'){ alert('No s’ha carregat la llibreria per llegir Excel. Revisa connexió o instal·la SheetJS localment.'); return; }
  state.draftLog=[];
  const excelFiles=[];
  for(const file of files){
    const name=(file.webkitRelativePath || file.name || '').toLowerCase();
    if(name.endsWith('.rar')){
      state.draftLog.push(`RAR detectat: ${file.name}. Aquesta versió el detecta, però no pot descomprimir RAR real dins el navegador sense mòdul extern. Descomprimeix-lo amb WinRAR i importa la carpeta, o crea un ZIP.`);
      continue;
    }
    if(name.endsWith('.zip')){
      if(typeof JSZip === 'undefined'){ state.draftLog.push(`ZIP ignorat perquè JSZip no està carregat: ${file.name}`); continue; }
      const zip=await JSZip.loadAsync(file);
      const entries=Object.values(zip.files).filter(x=>!x.dir && /\.(xls|xlsx|xlsm|csv)$/i.test(x.name));
      state.draftLog.push(`ZIP ${file.name}: ${entries.length} Excels detectats.`);
      for(const entry of entries){ excelFiles.push({name:entry.name, arrayBuffer:await entry.async('arraybuffer')}); }
    } else if(/\.(xls|xlsx|xlsm|csv)$/i.test(name)) {
      excelFiles.push({name:file.webkitRelativePath || file.name, arrayBuffer:await file.arrayBuffer()});
    }
  }
  const draft={files:[],clients:[],jobs:[],budgets:[],items:[],log:state.draftLog};
  for(const f of excelFiles){
    try{
      const parsed=parseWorkbook(f.name, f.arrayBuffer);
      draft.files.push(f.name);
      draft.clients.push(parsed.client);
      draft.jobs.push(parsed.job);
      draft.budgets.push(parsed.budget);
      draft.items.push(...parsed.items);
      draft.log.push(...parsed.warnings);
    }catch(err){ console.error(err); draft.log.push(`ERROR llegint ${f.name}: ${err.message}`); }
  }
  // Deduplicació lleugera de clients només per previsualització
  draft.clients = mergePreviewClients(draft.clients);
  state.importDraft=draft;
  renderImporter();
}
function parseWorkbook(fileName, arrayBuffer){
  const warnings=[];
  const wb = XLSX.read(arrayBuffer, {type:'array', cellDates:true, raw:false});
  const sheets = wb.SheetNames.map(name => ({name, aoa:XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1, defval:'', raw:false, blankrows:false})}));
  const flat=[];
  sheets.forEach(sh => sh.aoa.forEach((row,ri)=>flat.push({sheet:sh.name, rowIndex:ri, cells:row.map(v=>cleanText(v)).filter(v=>v!==''), raw:row})));
  warnings.push(`${fileName}: ${sheets.length} pestanya/es llegides.`);
  const client = detectClient(fileName, flat);
  const detectedDate = detectDate(flat);
  const year = detectedDate ? Number(detectedDate.slice(0,4)) : detectYear(fileName, flat);
  const parsedItems=[];
  const sheetTotals=[];
  sheets.forEach(sh => {
    const rows=sh.aoa.map(row=>row.map(v=>cleanText(v)));
    const t=findBestTotal(rows);
    if(t) sheetTotals.push(t);
    parsedItems.push(...detectItemsFromSheet(fileName, sh.name, sh.aoa));
  });
  const importedBase = sheetTotals.length ? Math.max(...sheetTotals) : 0;
  if(importedBase) warnings.push(`${fileName}: total/base imposable detectat: ${money(importedBase)}.`);
  const job = {id:uid('F'), year, clientTempKey:client.tempKey, title:detectJobTitle(fileName, flat), address:client.workAddress || detectAddress(flat), city:client.city || detectCity(flat), status:'Històrica', source:fileName, notes:'Importada automàticament des d’Excel antic.'};
  const budget = {id:uid('P'), number:detectBudgetNumber(fileName, flat), date:detectedDate || `${year}-01-01`, clientTempKey:client.tempKey, jobTempKey:job.id, title:job.title, status:'Històric importat', ci:data.settings.defaultCI, dge:data.settings.defaultDGE, bi:data.settings.defaultBI, iva:data.settings.defaultIVA, importedBase, source:fileName, notes:'Pressupost importat. Revisa partides sense amidament/preu.', lines:[]};
  budget.lines = parsedItems.map(it=>({...it,id:uid('LIN')}));
  const items = parsedItems.map(it=>({...it, origin:fileName, sourceBudget:budget.number || fileName}));
  if(!parsedItems.length) warnings.push(`${fileName}: no s’han detectat partides separades. Es guardarà només client/pressupost si confirmes.`);
  if(client.name==='Client pendent de revisar') warnings.push(`${fileName}: no s’ha trobat un nom de client segur al requadre; revisa el client abans de confirmar.`);
  return {client, job, budget, items, warnings};
}
function mergePreviewClients(clients){
  const map=new Map();
  for(const c of clients){
    const k=c.nif ? `nif:${normKey(c.nif)}` : c.email ? `email:${normKey(c.email)}` : c.phone ? `phone:${normKey(c.phone)}` : `name:${normKey(c.name)}|${normKey(c.workAddress)}`;
    if(!map.has(k)) map.set(k,c);
    else { const old=map.get(k); old.source=[old.source,c.source].filter(Boolean).join(' | '); old.notes=[old.notes,c.notes].filter(Boolean).join('\n'); }
  }
  return [...map.values()];
}
function detectClient(fileName, flat){
  const recipient = detectRecipientBlock(flat);
  const all = flat.map(r=>r.cells.join(' | ')).join('\n');
  const candidateText = recipient.text || all;
  const nif = firstRegex(candidateText, /\b(?!B55271159\b)([A-HJNP-SUVW][0-9]{7}[0-9A-J]|[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])\b/i) || '';
  const email = firstRegex(candidateText, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || '';
  const phone = detectPhone(candidateText);
  let name = recipient.name || findValueByLabels(flat, ['client','cliente','destinatari','destinatario','senyors','sres','promotor','propietari','propiedad','comunitat','comunidad']) || '';
  name = cleanClientName(name);
  if(name==='Client pendent de revisar'){
    const guessed=guessNameFromFile(fileName);
    // Només usem el nom del fitxer si sembla clarament un client/obra, no un càlcul ni un carrer.
    name = cleanClientName(guessed);
  }
  const workAddress = recipient.address || findValueByLabels(flat, ['obra','direccion obra','direcció obra','adreça obra','situada','situat','emplaçament','emplazamiento']) || detectAddress(flat);
  const city = recipient.city || detectCity(flat);
  return {id:uid('CLI'), tempKey:uid('TMPCLI'), name, nif, phone, email, contact:'', fiscalAddress:recipient.fiscalAddress||'', workAddress, city, status:'Actiu', source:fileName, notes:'Client detectat automàticament del requadre/destinatari. Revisar si cal.'};
}
function detectRecipientBlock(flat){
  // V08: el client TEIMOR és el bloc/requadre superior dret. No fem servir el cos del pressupost.
  // Ordre habitual dins el requadre: nom client → adreça → CP/població → província o NIF/DNI/CIF.
  const blocks=[];
  const bySheet={};
  for(const r of flat){ (bySheet[r.sheet]=bySheet[r.sheet]||[]).push(r); }
  Object.values(bySheet).forEach(rows=>{
    const markerRows=rows
      .filter(r=>r.rowIndex>4 && (r.raw||[]).some(c=>/^(\s*)?(obra|concepte|concepto|medici[oó]n?|treballs|trabajos|base imposable|base imponible)\b/i.test(cleanText(c))))
      .map(r=>r.rowIndex);
    const cutoff = markerRows.length ? Math.min(...markerRows) : 26;
    for(let col=1; col<=14; col++){
      const lines=[];
      for(const r of rows){
        if(r.rowIndex<=5 || r.rowIndex>=cutoff) continue;
        const raw=r.raw||[];
        const val=cleanText(raw[col]||'');
        if(!val) continue;
        if(isTeimorText(val) || isNonRecipientText(val) || looksLikeCalculationLine(val)) continue;
        if(/www\.|@teimor|pressupost|presupuesto|concepte|concepto|medici[oó]n?|treballs|trabajos|materials?\s*i\s*m\.?o\.?/i.test(val)) continue;
        // En el requadre real hi ha textos curts. Si és una frase llarga amb *, import, preu o descripció d'obra, no és client.
        if(val.length>90 || /^\*/.test(val) || /[€=]/.test(val)) continue;
        lines.push({row:r.rowIndex,col,text:val});
      }
      if(lines.length>=1){
        lines.sort((a,b)=>a.row-b.row);
        let chunk=[];
        const flush=()=>{
          if(chunk.length){
            const texts=chunk.map(x=>x.text).filter(Boolean);
            const hasName=texts.some(isProbablyClientName);
            const hasLocator=texts.some(looksLikeAddress) || texts.some(looksLikeCityLine) || texts.some(x=>/\b([A-HJNP-SUVW][0-9]{7}[0-9A-J]|[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])\b/i.test(x));
            if(hasName && (hasLocator || texts.length>=2)) blocks.push({col, lines:texts, rows:chunk.map(x=>x.row)});
          }
          chunk=[];
        };
        for(const l of lines){ if(chunk.length && l.row-chunk[chunk.length-1].row>2) flush(); chunk.push(l); }
        flush();
      }
    }
  });
  // També recollim blocs etiquetats, però només si el valor resultant no sembla carrer/càlcul/import.
  const labelled=findValueByLabels(flat, ['client','cliente','destinatari','destinatario','senyors','sres','promotor','propietari','propiedad','comunitat','comunidad']);
  if(labelled && isProbablyClientName(labelled)) blocks.push({col:99, rows:[0], lines:[labelled]});
  if(!blocks.length) return {name:'',address:'',city:'',fiscalAddress:'',text:''};
  const scored=blocks.map(b=>({...b, score:recipientBlockScore(b.lines)})).sort((a,b)=>b.score-a.score);
  const best=scored[0];
  const lines=best.lines.map(cleanText).filter(Boolean).filter(x=>!looksLikeCalculationLine(x) && !isNonRecipientText(x));
  let name='';
  for(const l of lines){ if(isProbablyClientName(l)){ name=l; break; } }
  const address = lines.find(looksLikeAddress) || '';
  const cityLine = lines.find(looksLikeCityLine) || '';
  const fiscalAddress = lines.filter(l=>l && l!==name).join('\n');
  return {name, address, city:extractCityFromLine(cityLine), fiscalAddress, text:lines.join('\n')};
}
function recipientBlockScore(lines){
  if(!lines || !lines.length) return -999;
  let score=0;
  const clean=lines.map(cleanText).filter(Boolean);
  const first=clean[0]||'';
  if(clean.some(looksLikeCalculationLine) || clean.some(isNonRecipientText)) score-=400;
  if(isProbablyClientName(first)) score+=160;
  if(looksLikeAddress(first) || looksLikeCalculationLine(first)) score-=180;
  if(clean.some(looksLikeAddress)) score+=55;
  if(clean.some(looksLikeCityLine)) score+=45;
  if(clean.some(x=>/\b([A-HJNP-SUVW][0-9]{7}[0-9A-J]|[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])\b/i.test(x))) score+=35;
  if(clean.some(isTeimorText)) score-=250;
  if(clean.length>=2 && clean.length<=6) score+=25;
  if(!clean.some(isProbablyClientName)) score-=250;
  return score;
}
function looksLikeCalculationLine(s){
  const t=cleanText(s);
  if(!t) return false;
  if(/[€=]/.test(t) && /\d/.test(t)) return true;
  if(/\b(materials?\s*i\s*m\.?o\.?|m\.?o\.?|unitat|base imposable|base imponible|import total|total pressupost|subtotal|iva)\b/i.test(t) && /\d|=|€/i.test(t)) return true;
  if(/^\s*\d+[\d.,]*\s*(m2|m²|m3|m³|ml|m|ut|ud|u|kg)?\s*[x×]\s*\d+[\d.,]*\s*€?\s*=?/i.test(t)) return true;
  return false;
}
function isNonRecipientText(s){
  const t=cleanText(s);
  return looksLikeCalculationLine(t) || /^(data|fecha|date|pressupost|presupuesto|n[úu]m\.?|num\.?|numero|número|obra|concepte|concepto|medicio|medició|medición|medicion|treballs|trabajos|base imposable|base imponible|materials?\s*i\s*m\.?o\.?|unitat|iva|exclos|excl[oò]s|total|subtotal)$/i.test(t);
}
function looksLikeAddress(s){ return /\b(c\/|c\.|carrer|calle|avinguda|avenida|av\.?|avda\.?|passeig|pg\.?|plaza|plaça|rambla|carretera|ctra\.?|urbanitzaci[oó]|urb\.?|travessera|cam[ií]|n[ºo]|núm|num\.?|número|numero|bloc|bloque|esc\.?|escala|baixos|pis|portal|local|edifici\s+[^a-z]*$)\b/i.test(String(s)); }
function looksLikeCityLine(s){ return /\b(17\d{3}|08\d{3}|Girona|Barcelona|Palafrugell|Palam[oó]s|Calonge|Sant Antoni|Begur|Pals|Sant Feliu de Gu[ií]xols|S.?Agar[oó])\b/i.test(String(s)); }
function isProvinceOnly(s){ return /^\(?\s*(girona|barcelona|tarragona|lleida|gerona)\s*\)?$/i.test(cleanText(s)); }
function isProbablyClientName(s){
  const t=cleanText(s);
  if(!t || t.length<3) return false;
  if(looksLikeAddress(t) || looksLikeCityLine(t) || isProvinceOnly(t) || isTeimorText(t) || isNonRecipientText(t) || looksLikeCalculationLine(t)) return false;
  if(/@|\b(tel|telefono|telèfon|nif|dni|cif|cp|codi postal|materials?|unitat|base|import|total|iva|preu|precio|amidament|medici[oó]n?)\b/i.test(t)) return false;
  if(/^[0-9\s.,()\/€=x×-]+$/i.test(t)) return false;
  if(/\d+[\d.,]*\s*(m2|m²|m3|m³|ml|m|ut|ud|kg)\b/i.test(t) && /[€=x×]/.test(t)) return false;
  return true;
}
function badClientName(s){ const t=cleanText(s); return !isProbablyClientName(t); }
function clientLineScore(s){ const t=cleanText(s); if(badClientName(t)) return -100; let score=Math.min(t.length,80); if(/com\.?\s*de\s*prop|comunitat|comunidad|propietaris|propietarios|s\.?l\.?|s\.?a\.?|scp|cb|riart/i.test(t)) score+=80; if(/^[A-ZÀ-Ý0-9 .&()'-]+$/.test(t)) score+=10; if(/@|\d{8}[A-Z]|[A-Z]\d{7}/i.test(t)) score-=40; return score; }
function extractCityFromLine(s){ const m=String(s||'').match(/(Palafrugell|Palam[oó]s|Calonge(?: i Sant Antoni)?|Sant Antoni|Begur|Pals|Sant Feliu de Gu[ií]xols|S.?Agar[oó]|Girona|Barcelona)/i); return m?m[0]:cleanText(s||''); }
function cleanClientName(s){
  s=cleanText(s).replace(/^(client|cliente|destinatari|destinatario|senyors|sres|promotor|propietari|propiedad)\s*[:\-]?\s*/i,'').trim();
  if(!isProbablyClientName(s)) return 'Client pendent de revisar';
  return s;
}
function guessNameFromFile(file){
  let base=file.split('/').pop().replace(/\.(xls|xlsx|xlsm|csv)$/i,'').replace(/[_-]+/g,' ');
  base=base.replace(/^\d+\s*/,'').replace(/pressupost|presupuesto|obra/ig,'').trim();
  return badClientName(base) ? 'Client pendent de revisar' : (base || 'Client pendent de revisar');
}
function isTeimorText(s){ return /teimor|teixidor|mora|marçal|trinxeria|b55271159|info@teimor|www\.teimor|620988264|675520117|609036162/i.test(s); }
function findValueByLabels(flat, labels){
  const labs=labels.map(strip);
  for(const r of flat){
    const cells=r.raw.map(v=>cleanText(v));
    for(let i=0;i<cells.length;i++){
      const c=cells[i]; const sc=strip(c);
      if(!c) continue;
      if(labs.some(l=>sc === l || sc.startsWith(l+':') || sc.includes(l+':'))){
        let v='';
        if(c.includes(':')) v=c.split(':').slice(1).join(':').trim();
        if(!v) v=cells.slice(i+1).find(x=>x && !isTeimorText(x) && strip(x)!==sc && !isNonRecipientText(x) && !looksLikeCalculationLine(x)) || '';
        if(v && !isTeimorText(v) && v.length>2 && !looksLikeCalculationLine(v) && !looksLikeAddress(v)) return v;
      }
    }
  }
  return '';
}
function firstRegex(text, regex){ const m=String(text).match(regex); return m ? (m[1]||m[0]).trim() : ''; }
function detectPhone(text){
  const matches=String(text).match(/(?:\+34\s*)?(?:[679]\d[\s.-]?\d{3}[\s.-]?\d{3}|[679]\d{8})/g) || [];
  const filtered=matches.map(x=>x.trim()).filter(x=>!x.includes('620988264') && !x.includes('675520117') && !x.includes('609036162'));
  return filtered[0] || '';
}
function detectAddress(flat){
  const v=findValueByLabels(flat,['adreça','dirección','domicilio','domicili','direccio','direccion']);
  if(v && !isTeimorText(v)) return v;
  const row=flat.find(r=>r.cells.some(c=>looksLikeAddress(c)) && !r.cells.some(isTeimorText));
  return row ? row.cells.filter(c=>!isNonRecipientText(c)).join(' ') : '';
}
function detectCity(flat){ const text=flat.map(r=>r.cells.join(' ')).join('\n'); const m=text.match(/\b(Palafrugell|Palam[oó]s|Calonge(?: i Sant Antoni)?|Sant Antoni|Begur|Pals|Sant Feliu de Gu[ií]xols|S.?Agar[oó]|Girona|Barcelona)\b/i); return m?m[0]:''; }
function detectYear(fileName, flat){
  const d=detectDate(flat); if(d){ const y=Number(d.slice(0,4)); if(y) return y; }
  const text=[fileName, ...flat.slice(0,120).map(r=>r.cells.join(' '))].join(' ');
  const m=text.match(/\b(20\d{2}|19\d{2})\b/); return m?Number(m[1]):new Date().getFullYear();
}
function dateIso(d){
  if(!(d instanceof Date) || isNaN(d)) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function parseDateValue(v){
  if(v == null || v === '') return '';
  if(v instanceof Date) return dateIso(v);
  if(typeof v === 'number' && v > 20000 && v < 70000){ return dateIso(new Date(Math.round((v - 25569) * 86400 * 1000))); }
  let s=cleanText(v).replace(/^[A-Za-zÀ-ÿ]+:\s*/,'').trim();
  if(!s) return '';
  let m=s.match(/\b(20\d{2}|19\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
  if(m) return `${m[1]}-${String(m[2]).padStart(2,'0')}-${String(m[3]).padStart(2,'0')}`;
  m=s.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|20\d{2}|19\d{2})\b/);
  if(m){ let y=Number(m[3]); if(y<100) y+=2000; return `${y}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`; }
  // Dates textuals que a vegades entrega SheetJS amb cellDates/raw false
  const d=new Date(s); if(!isNaN(d) && /\d{4}/.test(s)) return dateIso(d);
  return '';
}
function detectDate(flat){
  // 1) Primer busquem la cel·la Data/Fecha i el valor adjacent, que és el patró dels Excels TEIMOR.
  for(let ri=0; ri<Math.min(flat.length,140); ri++){
    const r=flat[ri]; const cells=r.raw || [];
    for(let i=0;i<cells.length;i++){
      const label=strip(cells[i]).replace(/:$/,'');
      if(label==='data' || label==='fecha' || label==='date'){
        const own=parseDateValue(cells[i]); if(own) return own;
        for(let j=i+1;j<Math.min(cells.length,i+6);j++){ const d=parseDateValue(cells[j]); if(d) return d; }
        const next=flat[ri+1]?.raw || [];
        for(let j=i;j<Math.min(next.length,i+4);j++){ const d=parseDateValue(next[j]); if(d) return d; }
      }
    }
  }
  // 2) Si no hi ha etiqueta, escanegem totes les cel·les superiors.
  for(const r of flat.slice(0,160)){
    for(const c of (r.raw||[])){ const d=parseDateValue(c); if(d) return d; }
  }
  return '';
}
function detectBudgetNumber(fileName, flat){ return findValueByLabels(flat,['pressupost','presupuesto','num','nº','numero','número']) || fileName.split('/').pop().replace(/\.(xls|xlsx|xlsm|csv)$/i,''); }
function detectJobTitle(fileName, flat){ return findValueByLabels(flat,['obra','treball','trabajo','feina']) || guessNameFromFile(fileName); }
function detectItemsFromSheet(fileName, sheetName, aoa){
  const rows=aoa.map(row=>row.map(v=>cleanText(v)));
  const single=parseTeimorSingleConcept(rows,fileName,sheetName);
  if(single.length) return single;
  const mapped = parseWithHeader(rows, fileName, sheetName);
  if(mapped.length) return mapped;
  return parseFallback(rows, fileName, sheetName);
}
function findLabelRow(rows, labels){
  const labs=labels.map(strip);
  for(let i=0;i<rows.length;i++){
    const hit=rows[i].find(c=>labs.includes(strip(c).replace(/:$/,'')) || labs.some(l=>strip(c).startsWith(l+':')));
    if(hit) return i;
  }
  return -1;
}
function rowValueAfterLabel(row, labels){
  const labs=labels.map(strip);
  for(let i=0;i<row.length;i++){
    const c=row[i]; const sc=strip(c).replace(/:$/,'');
    if(labs.includes(sc) || labs.some(l=>strip(c).startsWith(l+':'))){
      if(String(c).includes(':')){ const v=String(c).split(':').slice(1).join(':').trim(); if(v) return v; }
      return row.slice(i+1).find(x=>cleanText(x)) || '';
    }
  }
  return '';
}
function numericValues(row){ return (row||[]).map(num).filter(v=>Number.isFinite(v) && Math.abs(v)>0 && Math.abs(v)!==21 && Math.abs(v)!==10 && Math.abs(v)!==3 && Math.abs(v)!==13); }
function labelHit(joined, lab){
  const escLab=lab.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  if(lab==='total') return new RegExp('(^|\\s)total($|\\s|:)', 'i').test(joined);
  return new RegExp('(^|\\s)'+escLab+'($|\\s|:)', 'i').test(joined) || joined.includes(lab+':');
}
function extractMoneyAmounts(text){
  const s=String(text||'');
  const out=[];
  const moneyRe=/(?:€\s*)?([0-9]{1,3}(?:[.,][0-9]{3})+(?:[.,][0-9]{2})|[0-9]+(?:[.,][0-9]{2}))(?:\s*€)?/g;
  let m;
  while((m=moneyRe.exec(s))){ const n=num(m[1]); if(n>0.01 && n<100000000) out.push(n); }
  return out;
}
function findAmountByLabels(rows, labels){
  const labs=labels.map(strip);
  for(let i=0;i<rows.length;i++){
    const row=rows[i]||[]; const joined=strip(row.join(' '));
    const hit=labs.some(l=>labelHit(joined,l));
    if(!hit) continue;
    if(/iva/.test(joined) && !/base|import|importe|total|imposable|imponible/.test(joined)) continue;
    let nums=numericValues(row);
    if(nums.length) return Math.max(...nums.map(Math.abs));
    let amounts=extractMoneyAmounts(row.join(' '));
    if(amounts.length) return Math.max(...amounts);
    for(let j=i+1;j<=Math.min(rows.length-1,i+5);j++){
      nums=numericValues(rows[j]||[]);
      if(nums.length) return Math.max(...nums.map(Math.abs));
      amounts=extractMoneyAmounts((rows[j]||[]).join(' '));
      if(amounts.length) return Math.max(...amounts);
    }
  }
  return 0;
}
function findBestTotal(rows){
  const labelled = findAmountByLabels(rows,['base imposable','base imponible','import total','importe total','total pressupost','total presupuesto','total obra','materials i m.o','materials i mo','materiales y m.o','materiales y mo','materials i mà d’obra','materials i ma d obra','total']);
  if(labelled) return labelled;
  // Fallback específic: alguns pressupostos antics tenen el total dins el text: “Materials i M.O. = 3.276,00 €”.
  const text=rows.map(r=>r.join(' ')).join('\n');
  const m=text.match(/materials?\s*(?:i|y)?\s*(?:m\.?o\.?|ma d'?obra|mà d’obra)[^0-9]{0,20}([0-9.,]+)\s*€?/i);
  if(m) return num(m[1]);
  return 0;
}
function nonEmptyAfterLabel(rows, labels){
  const labs=labels.map(strip);
  for(const row of rows){
    for(let i=0;i<row.length;i++){
      const s=strip(row[i]).replace(/:$/,'');
      if(labs.includes(s) || labs.some(l=>s.startsWith(l+':'))){
        const v=rowValueAfterLabel(row, labels);
        if(v) return v;
      }
    }
  }
  return '';
}
function parseMeasurement(text){
  const s=String(text||'');
  const m=s.match(/([0-9]+(?:[\.,][0-9]+)?)\s*(m²|m2|m³|m3|ml|m|ut|ud|uds|kg|pa|h|dia|dies)/i);
  if(!m) return {qty:'', unit:''};
  return {qty:num(m[1]), unit:m[2].replace('m2','m²').replace('m3','m³')};
}
function parseTeimorSingleConcept(rows,fileName,sheetName){
  const conceptRow=findLabelRow(rows,['concepte','concepto','descripcio','descripción','descripcion']);
  const medRow=findLabelRow(rows,['medicio','medición','medicion','medició','amidament','medicion total','medició total']);
  const worksRow=findLabelRow(rows,['treballs','trabajos','descripcio treballs','descripción trabajos','detall','detalle']);
  const hasOneConceptPattern = conceptRow>=0 || worksRow>=0 || medRow>=0;
  const totalRow = rows.findIndex(r=>/(base imposable|base imponible|import total|importe total|total pressupost|total presupuesto|total obra|^\s*total\s*$|materials\s*i\s*m\.?o\.?)\b/i.test(r.join(' ')));
  const total = findBestTotal(rows);
  if(!hasOneConceptPattern && !total) return [];
  if(!hasOneConceptPattern && total && !rows.some(r=>r.join(' ').length>30)) return [];
  const parentConcept = (conceptRow>=0 ? rowValueAfterLabel(rows[conceptRow],['concepte','concepto','descripcio','descripción','descripcion']) : '') || nonEmptyAfterLabel(rows,['obra','treball','trabajo']) || longestText(rows[conceptRow]||[]) || guessNameFromFile(fileName) || 'Pressupost importat TEIMOR';
  let medText=medRow>=0 ? rowValueAfterLabel(rows[medRow],['medicio','medición','medicion','medició','amidament','medicion total','medició total']) || rows[medRow].join(' ') : '';
  if(!medText && parentConcept) medText=parentConcept;
  const parentMeasure=parseMeasurement(medText);
  let workTexts=[];
  if(worksRow>=0){
    const firstWork = rowValueAfterLabel(rows[worksRow],['treballs','trabajos','descripcio treballs','descripción trabajos','detall','detalle']);
    if(firstWork) workTexts.push(firstWork);
    const end = totalRow>worksRow ? totalRow : Math.min(rows.length, worksRow+80);
    for(let i=worksRow+1;i<end;i++){
      const row=rows[i].filter(Boolean);
      let text=row.filter(c=>!isNonRecipientText(c) && !isTeimorText(c) && !/(base imposable|base imponible|iva|total pressupost|total presupuesto|materials\s*i\s*m\.?o\.?|aigua|llum|permisos)/i.test(c)).join(' ').trim();
      if(text) workTexts.push(text);
    }
  } else {
    for(const row of rows.slice(12, totalRow>0 ? totalRow : 80)){
      const text=row.filter(Boolean).filter(c=>!isNonItemLine(c) && !isTeimorText(c) && !looksLikeAddress(c) && !looksLikeCityLine(c)).join(' ').trim();
      if(text.length>25) workTexts.push(text);
    }
  }
  const bullets=splitStarItems(workTexts);
  if(bullets.length){
    return bullets.map((txt,idx)=>{
      const m=parseMeasurement(txt);
      const amounts=extractMoneyAmounts(txt).filter(x=>!String(txt).includes('50/G') || x!==50);
      const lineTotal=amounts.length ? Math.max(...amounts) : 0;
      const unit=m.unit || '';
      const qty=m.qty || '';
      const pu=(qty && lineTotal) ? lineTotal/qty : 0;
      const status = lineTotal && qty ? 'Subpartida detectada per * amb import pendent validar' : 'Subpartida detectada per * pendent de preu/amidament';
      return makeItem({code:'',chapter:parentConcept||'Històric importat',unit,desc:shortenBullet(txt),qty,pu,total:lineTotal,status,fileName,sheetName,longDescOverride:txt});
    });
  }
  const {qty,unit}=parentMeasure;
  let pu = qty && total ? total/qty : 0;
  const status = unit && qty && pu ? 'PU calculat des de amidament + total pendent validar' : (total ? 'Històrica sense amidament' : 'Importada pendent de revisar');
  return [makeItem({code:'',chapter:'Històric importat',unit,desc:parentConcept||'Partida importada TEIMOR',qty,pu,total:total||0,status,fileName,sheetName,longDescOverride:workTexts.join('\n') || parentConcept})];
}
function splitStarItems(lines){
  const items=[]; let cur='';
  for(const raw of lines){
    const parts=String(raw||'').split(/(?=\*)/g).map(x=>x.trim()).filter(Boolean);
    const list=parts.length ? parts : [raw];
    for(let part of list){
      part=cleanText(part);
      if(!part) continue;
      if(part.startsWith('*')){ if(cur) items.push(cur.trim()); cur=part.replace(/^\*+\s*/,''); }
      else if(cur){ cur += ' ' + part; }
      else if(part.length>15){ cur=part; }
    }
  }
  if(cur) items.push(cur.trim());
  return items.map(x=>cleanText(x)).filter(x=>x.length>8 && !/^(treballs|trabajos)$/i.test(x) && !/(base imposable|iva|materials\s*i\s*m\.?o\.?|aigua|llum|permisos)/i.test(x));
}
function shortenBullet(txt){
  let s=cleanText(txt).replace(/^[-•*]+\s*/,'');
  s=s.replace(/\s*\([^)]{0,50}\)\s*$/,'').trim();
  return s.length>120 ? s.slice(0,117)+'...' : s;
}
function headerMap(row){
  const map={};
  row.forEach((c,i)=>{ const s=strip(c); if(!s) return;
    if(/^(codi|codigo|cod|partida|item)$/.test(s)) map.code=i;
    if(/(concepte|concepto|descripcio|descripcion|partida|detalle)/.test(s)) map.desc=i;
    if(/^(ut|ud|uds|unitat|unidad|u\.?m\.?)$/.test(s)) map.unit=i;
    if(/(quantitat|cantidad|amidament|medicio|medicion|med\.?)/.test(s) || /^(quantitat|cantidad|amidament|medicio|medicion)$/.test(s)) map.qty=i;
    if(/(preu|precio).*(ut|unit|unitari|unitario)|p\.?u\.?|pu|preu\/ut|precio\/ud/.test(s)) map.pu=i;
    if(/^(import|importe|total|subtotal)$/.test(s) || /(import|importe|total)/.test(s)) map.total=i;
    if(/capitol|capitulo|chapter/.test(s)) map.chapter=i;
  });
  return map;
}
function isNonItemLine(line){
  const sl=strip(line);
  return !sl || /teimor|teixidor|mora|marçal|trinxeria|www\.teimor|info@teimor|base imposable|base imponible|iva|exclos|excl[oò]s|forma de pago|condicions|condiciones|data:?|fecha:?|pressupost$|presupuesto$|obra$|concepte$|concepto$|medicio$|medición$|medicion$|treballs$|trabajos$/.test(sl);
}
function parseWithHeader(rows,fileName,sheetName){
  let start=-1, map={};
  for(let i=0;i<Math.min(rows.length,100);i++){
    const m=headerMap(rows[i]);
    const score=['desc','unit','qty','pu','total'].filter(k=>m[k]!==undefined).length;
    if(score>=3 && (m.desc!==undefined || m.total!==undefined)){ start=i+1; map=m; break; }
  }
  if(start<0) return [];
  const items=[]; let chapter='';
  for(let i=start;i<rows.length;i++){
    const row=rows[i]; if(!row.some(Boolean)) continue;
    const lineText=row.join(' '); const sline=strip(lineText);
    if(isNonItemLine(lineText)) continue;
    const desc=cell(row,map.desc) || longestText(row);
    if(!desc || desc.length<3 || isTeimorText(desc) || looksLikeAddress(desc) || looksLikeCityLine(desc)) continue;
    const unit=cell(row,map.unit) || detectUnit(row);
    const qty=num(cell(row,map.qty)); let pu=num(cell(row,map.pu)); let total=num(cell(row,map.total));
    const code=cell(row,map.code) || '';
    const numbers=row.map(num).filter(x=>x!==0);
    if(numbers.length===0 && lineText.length>3){ chapter=cleanText(lineText); continue; }
    if(!pu && qty && total){ pu=total/qty; }
    if(!total && qty && pu){ total=qty*pu; }
    const status = classifyItem(unit, qty, pu, total, desc);
    if(total || pu || qty || (unit && desc.length>10)) items.push(makeItem({code,chapter:cell(row,map.chapter)||chapter,unit,desc,qty,pu,total,status,fileName,sheetName}));
  }
  return items;
}
function parseFallback(rows,fileName,sheetName){
  const items=[]; let chapter='';
  for(let i=0;i<rows.length;i++){
    const row=rows[i].filter(Boolean); if(!row.length) continue;
    const line=row.join(' '); const sl=strip(line);
    if(isNonItemLine(line) || row.some(isTeimorText)) continue;
    const unit=detectUnit(row);
    const numericCells=row.map((c,idx)=>({idx,value:num(c),raw:c})).filter(x=>x.value!==0 && !/[a-zA-ZÀ-ÿ]{3,}/.test(String(x.raw)) && !/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/.test(String(x.raw)));
    const textCells=row.filter(c=>strip(c) && num(c)===0 && !isNonRecipientText(c));
    if(numericCells.length===0 && textCells.length && line.length<80 && line===line.toUpperCase()){ chapter=line; continue; }
    if(!textCells.length && numericCells.length<1) continue;
    if(!unit && (looksLikeAddress(line) || looksLikeCityLine(line) || /@|tel[èe]fon|telefono|nif|dni|cif/i.test(line))) continue;
    let desc=longestText(row); if(!desc || desc.length<8 || looksLikeAddress(desc)) continue;
    // Només acceptem fallback si hi ha unitat explícita o prou informació econòmica, evitant clients/contactes.
    if(!unit && numericCells.length<2) continue;
    let qty=0, pu=0, total=0;
    const nums=numericCells.map(x=>x.value);
    if(nums.length>=3){ qty=nums[nums.length-3]; pu=nums[nums.length-2]; total=nums[nums.length-1]; }
    else if(nums.length===2 && unit){ qty=nums[0]; total=nums[1]; pu=qty?total/qty:0; }
    else if(nums.length===2){ pu=nums[0]; total=nums[1]; }
    else if(nums.length===1){ total=nums[0]; }
    const code = /^[0-9]{1,3}(\.[0-9]{1,3})*$/.test(row[0]) ? row[0] : '';
    const status=classifyItem(unit,qty,pu,total,desc);
    if(total || pu || qty) items.push(makeItem({code,chapter,unit,desc,qty,pu,total,status,fileName,sheetName}));
  }
  return items;
}
function cell(row,idx){ return idx===undefined ? '' : cleanText(row[idx]); }
function longestText(row){ return row.filter(c=>cleanText(c) && num(c)===0 && !/^(ut|ud|m2|m²|ml|kg|pa)$/i.test(c)).sort((a,b)=>String(b).length-String(a).length)[0] || ''; }
function detectUnit(row){ const u=row.map(c=>cleanText(c)).find(c=>/^(m2|m²|m²\.|m2\.|m3|m³|ml|m|ut|ud|uds|kg|pa|h|dia|dies|jornal)$/i.test(c)); return u || ''; }
function classifyItem(unit,qty,pu,total,desc){
  if(unit && qty && pu) return 'Importada amb amidament i PU pendent validar';
  if(unit && qty && total && !pu) return 'PU calculat pendent validar';
  if(total && (!unit || !qty)) return 'Històrica sense amidament';
  if(/preu alçat|precio alzado|pa\b/i.test(desc)) return 'PA pendent amidament';
  return 'Importada pendent de revisar';
}
function makeItem({code,chapter,unit,desc,qty,pu,total,status,fileName,sheetName,longDescOverride}){
  const longDesc=cleanLongText(longDescOverride || desc);
  const shortDesc=cleanText(desc || longDesc);
  const concept=shortDesc.length>140 ? shortDesc.slice(0,137)+'...' : shortDesc;
  return {code:code||'',chapter:chapter||'',unit:unit||'',concept,longDesc,qty:qty||'',unitPrice:pu||'',total:total||'',status,origin:`${fileName} · ${sheetName}`,source:fileName,decomp:[]};
}
function confirmDraftImport(){
  const d=state.importDraft; if(!d) return;
  const clientIdByTemp=new Map();
  for(const c of d.clients){ const existing=findExistingClient(c); const id=existing?.id || c.id || uid('CLI'); for(const tk of (c._tempKeys || [c.tempKey]).filter(Boolean)) clientIdByTemp.set(tk,id); if(existing){ Object.assign(existing, mergeClient(existing,c)); } else { const copy={...c,id}; delete copy._tempKeys; data.clients.push(copy); } }
  for(const b of d.budgets){ const c=d.clients.find(x=>x.tempKey===b.clientTempKey); const clientId=c ? (clientIdByTemp.get(c.tempKey) || findExistingClient(c)?.id) : ''; const job=d.jobs.find(j=>j.id===b.jobTempKey) || d.jobs.find(j=>j.clientTempKey===b.clientTempKey); let jobId=''; if(job){ job.clientId=clientId; const existingJob=findExistingJob(job,clientId); jobId=existingJob?.id || job.id; if(existingJob) Object.assign(existingJob, {...job,id:existingJob.id,clientId}); else data.jobs.push({...job,id:jobId,clientId}); }
    const budget={...b, clientId, jobId}; delete budget.clientTempKey; delete budget.jobTempKey; budget.lines=(budget.lines||[]).map(l=>({...l,id:l.id||uid('LIN')})); data.budgets.push(budget); if(jobId){ const j=byId(data.jobs,jobId); if(j && !j.mainBudgetId) j.mainBudgetId=budget.id; }
  }
  let added=0, skipped=0;
  for(const item of d.items){ const existing=findExistingLibraryItem(item); if(existing){ existing.history=existing.history||[]; existing.history.push({origin:item.origin,unitPrice:item.unitPrice,total:item.total,qty:item.qty,status:item.status,date:today()}); skipped++; }
    else { data.library.push({id:uid('LIB'),code:item.code || makeAutoCode(item),chapter:item.chapter,unit:item.unit,concept:item.concept,longDesc:item.longDesc,directCost:'',unitPrice:item.unitPrice || '',ci:data.settings.defaultCI,dge:data.settings.defaultDGE,bi:data.settings.defaultBI,origin:item.origin,status:item.status,decomp:[],history:[{origin:item.origin,unitPrice:item.unitPrice,total:item.total,qty:item.qty,status:item.status,date:today()}]}); added++; }
  }
  data.importLogs.push({id:uid('IMP'),date:new Date().toISOString(),files:d.files,countClients:d.clients.length,countBudgets:d.budgets.length,countItems:d.items.length,libraryAdded:added,libraryDuplicated:skipped});
  state.importDraft=null; saveData(); alert(`Importació confirmada. Partides noves a llibreria: ${added}. Possibles repetides agrupades: ${skipped}.`); state.view='dashboard'; render();
}
function findExistingClient(c){ const keyN=normKey(c.nif); if(keyN) return data.clients.find(x=>normKey(x.nif)===keyN); const keyE=normKey(c.email); if(keyE) return data.clients.find(x=>normKey(x.email)===keyE); const keyP=normKey(c.phone); if(keyP) return data.clients.find(x=>normKey(x.phone)===keyP); const k=normKey(c.name), a=normKey(c.workAddress); return data.clients.find(x=>normKey(x.name)===k && (!a || normKey(x.workAddress)===a)); }
function mergeClient(old,c){ return {...old, name:old.name||c.name, nif:old.nif||c.nif, phone:old.phone||c.phone, email:old.email||c.email, contact:old.contact||c.contact, fiscalAddress:old.fiscalAddress||c.fiscalAddress, workAddress:old.workAddress||c.workAddress, city:old.city||c.city, notes:[old.notes,c.notes].filter(Boolean).join('\n')}; }
function findExistingJob(j,clientId){ return data.jobs.find(x=>x.clientId===clientId && normKey(x.title)===normKey(j.title) && String(x.year)===String(j.year)); }
function findExistingLibraryItem(item){ const k=normKey(item.concept || item.longDesc); const u=normKey(item.unit); if(!k) return null; return data.library.find(x=>normKey(x.unit)===u && similarity(normKey(x.concept),k)>0.92); }
function similarity(a,b){ if(!a||!b) return 0; if(a===b) return 1; const shorter=a.length<b.length?a:b, longer=a.length>=b.length?a:b; return longer.includes(shorter) ? shorter.length/longer.length : 0; }
function makeAutoCode(item){ const base=(strip(item.chapter||'PART').slice(0,3)||'PAR').toUpperCase(); return `${base}-${String(data.library.length+1).padStart(4,'0')}`; }


/* =========================
   V09.1 NETA overrides: lectura TEIMOR més estricta, UI neta i previsualització A4
   ========================= */

function init(){
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const ok = await checkLogin(document.getElementById('loginUser').value.trim(), document.getElementById('loginPass').value);
    if(ok){ localStorage.setItem(AUTH_KEY,'1'); showApp(true); }
    else document.getElementById('loginMsg').textContent='Usuari o contrasenya incorrectes.';
  });
  document.getElementById('logout').onclick=()=>{ localStorage.removeItem(AUTH_KEY); showApp(false); };
  document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{ state.view=btn.dataset.view; render(); }));
  document.getElementById('modalClose').onclick=closeModal;
  document.getElementById('modal').addEventListener('click', e=>{ if(e.target.id==='modal') closeModal(); });
  localStorage.removeItem(AUTH_KEY);
  showApp(false);
}

function render(){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active', b.dataset.view===state.view));
  const views={dashboard:renderDashboard,clients:renderClients,library:renderLibrary,budgets:renderBudgets,invoices:renderInvoices,performance:renderPerformance,attachments:renderAttachments,importer:renderImporter,backup:renderBackup,settings:renderSettings};
  (views[state.view]||renderDashboard)();
}

function renderBackup(){
  setHeader('Còpies / JSON','Exportació, importació i manteniment de còpies. L’app continua guardant les dades localment al navegador.');
  setContent(`
    <div class="grid two">
      <div class="card notice-blue"><h2>Còpia completa transferible</h2><p>Inclou clients, NIF/DNI/CIF, telèfons, emails, pressupostos, partides, factures i arxius incrustats si els has marcat per incloure al JSON.</p><div class="actions"><button class="primary" id="exportJsonFullPage">Exportar JSON complet</button><button class="ghost" id="exportPackagePage">Exportar paquet ZIP compatible WinRAR</button></div></div>
      <div class="card"><h2>Importar còpia</h2><p>Carrega un JSON exportat des d’aquesta app per veure la mateixa base de dades en un altre ordinador.</p><label class="primary file-label">Importar JSON<input id="importJsonPage" type="file" accept="application/json" hidden></label></div>
    </div>
    <div class="grid two">
      <div class="card"><h2>Versió demo/neta</h2><p>Exporta una còpia sense dades personals per fer proves o passar una demo.</p><button class="ghost" id="exportJsonCleanPage">Exportar demo/net</button></div>
      <div class="card notice-red"><h2>Depuració de proves</h2><p>Marca com a “Client pendent de revisar” els clients que clarament són imports, fórmules o carrers detectats per error, sense eliminar pressupostos.</p><button class="danger" id="cleanBadClients">Depurar clients no vàlids</button></div>
    </div>
  `);
}

function bindViewEvents(){
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{ state.view=b.dataset.go; render(); });
  const dashExport=document.getElementById('dashExport'); if(dashExport) dashExport.onclick=()=>exportJson(true);

  const clientForm=document.getElementById('clientForm'); if(clientForm) clientForm.onsubmit=saveClient;
  const newClientBtn=document.getElementById('newClientBtn'); if(newClientBtn) newClientBtn.onclick=()=>renderClients('__new');
  ['clientSearch','clientYearFilter','clientCityFilter','clientStatusFilter'].forEach(id=>{ const el=document.getElementById(id); if(el) el.oninput=filterClients; if(el) el.onchange=filterClients; });
  document.querySelectorAll('[data-edit-client]').forEach(b=>b.onclick=()=>renderClients(b.dataset.editClient));
  document.querySelectorAll('[data-delete-client]').forEach(b=>b.onclick=()=>deleteClient(b.dataset.deleteClient));
  const selAllClients=document.getElementById('selectAllClients'); if(selAllClients) selAllClients.onclick=()=>setChecked('.select-client',true);
  const clearClients=document.getElementById('clearSelectedClients'); if(clearClients) clearClients.onclick=()=>setChecked('.select-client',false);
  const delSelClients=document.getElementById('deleteSelectedClients'); if(delSelClients) delSelClients.onclick=deleteSelectedClients;
  document.querySelectorAll('[data-render-clients]').forEach(b=>b.onclick=()=>renderClients());

  const libSearch=document.getElementById('libSearch'); if(libSearch) libSearch.oninput=e=>{ state.libSearch=e.target.value; renderLibrary(); };
  const libChapter=document.getElementById('libChapterFilter'); if(libChapter) libChapter.onchange=e=>{ state.libChapterFilter=e.target.value; renderLibrary(); };
  const libStatus=document.getElementById('libStatusFilter'); if(libStatus) libStatus.onchange=e=>{ state.libStatusFilter=e.target.value; renderLibrary(); };
  const selAllLibrary=document.getElementById('selectAllLibrary'); if(selAllLibrary) selAllLibrary.onclick=()=>setChecked('.select-library',true);
  const clearLibrary=document.getElementById('clearSelectedLibrary'); if(clearLibrary) clearLibrary.onclick=()=>setChecked('.select-library',false);
  const delSelLib=document.getElementById('deleteSelectedLibrary'); if(delSelLib) delSelLib.onclick=deleteSelectedLibrary;
  const exportLib=document.getElementById('exportLibraryJson'); if(exportLib) exportLib.onclick=exportLibraryJson;
  const importLib=document.getElementById('importLibraryJson'); if(importLib) importLib.onchange=importLibraryJson;
  const newLib=document.getElementById('newLibItem'); if(newLib) newLib.onclick=()=>openLibModal('');
  document.querySelectorAll('[data-view-lib]').forEach(b=>b.onclick=()=>openLibModal(b.dataset.viewLib));
  document.querySelectorAll('[data-delete-lib]').forEach(b=>b.onclick=()=>deleteLibraryItem(b.dataset.deleteLib));

  const newBudget=document.getElementById('newBudgetBtn'); if(newBudget) newBudget.onclick=()=>openBudgetModal('__new');
  const budgetForm=document.getElementById('budgetForm'); if(budgetForm) budgetForm.onsubmit=saveBudget;
  document.querySelectorAll('[data-render-budgets]').forEach(b=>b.onclick=()=>{ closeModal(); state.editBudgetId=''; renderBudgets(); });
  ['budgetSearch','budgetYearFilter','budgetClientFilter','budgetStatusFilter'].forEach(id=>{ const el=document.getElementById(id); if(el) el.oninput=filterBudgets; if(el) el.onchange=filterBudgets; });
  document.querySelectorAll('[data-edit-budget]').forEach(b=>b.onclick=()=>openBudgetModal(b.dataset.editBudget));
  document.querySelectorAll('[data-preview-budget]').forEach(b=>b.onclick=()=>openBudgetPreview(b.dataset.previewBudget));
  document.querySelectorAll('[data-open-budget]').forEach(row=>row.onclick=e=>{ if(e.target.closest('[data-no-row-open]') || e.target.closest('button') || e.target.closest('select') || e.target.closest('input')) return; openBudgetModal(row.dataset.openBudget); });
  document.querySelectorAll('[data-delete-budget]').forEach(b=>b.onclick=()=>deleteBudget(b.dataset.deleteBudget));
  const selAllBudgets=document.getElementById('selectAllBudgets'); if(selAllBudgets) selAllBudgets.onclick=()=>setChecked('.select-budget',true);
  const clearBudgets=document.getElementById('clearSelectedBudgets'); if(clearBudgets) clearBudgets.onclick=()=>setChecked('.select-budget',false);
  const delSelBudgets=document.getElementById('deleteSelectedBudgets'); if(delSelBudgets) delSelBudgets.onclick=deleteSelectedBudgets;
  document.querySelectorAll('[data-budget-status]').forEach(sel=>sel.onchange=e=>updateBudgetStatus(e.target.dataset.budgetStatus,e.target.value));
  const exportBudgetCsv=document.getElementById('exportBudgetCsv'); if(exportBudgetCsv) exportBudgetCsv.onclick=downloadBudgetCsv;

  const invoiceForm=document.getElementById('invoiceForm'); if(invoiceForm) invoiceForm.onsubmit=saveInvoice;
  document.querySelectorAll('[data-edit-invoice]').forEach(b=>b.onclick=()=>renderInvoices(b.dataset.editInvoice));
  document.querySelectorAll('[data-delete-invoice]').forEach(b=>b.onclick=()=>deleteInvoice(b.dataset.deleteInvoice));
  document.querySelectorAll('[data-render-invoices]').forEach(b=>b.onclick=()=>renderInvoices());

  const attachmentForm=document.getElementById('attachmentForm'); if(attachmentForm) attachmentForm.onsubmit=saveAttachment;
  document.querySelectorAll('[data-download-attachment]').forEach(b=>b.onclick=()=>downloadAttachment(b.dataset.downloadAttachment));
  document.querySelectorAll('[data-delete-attachment]').forEach(b=>b.onclick=()=>deleteAttachment(b.dataset.deleteAttachment));

  const settingsForm=document.getElementById('settingsForm'); if(settingsForm) settingsForm.onsubmit=saveSettings;
  const passwordForm=document.getElementById('passwordForm'); if(passwordForm) passwordForm.onsubmit=savePassword;
  const hard=document.getElementById('hardReset'); if(hard) hard.onclick=hardReset;

  const ex1=document.getElementById('exportJsonFullPage'); if(ex1) ex1.onclick=()=>exportJson(true);
  const ex2=document.getElementById('exportPackagePage'); if(ex2) ex2.onclick=exportPackageZip;
  const ex3=document.getElementById('exportJsonCleanPage'); if(ex3) ex3.onclick=()=>exportJson(false);
  const im1=document.getElementById('importJsonPage'); if(im1) im1.onchange=importJson;
  const clean=document.getElementById('cleanBadClients'); if(clean) clean.onclick=cleanBadClients;

  const dz=document.getElementById('dropzone');
  const excel=document.getElementById('excelInput'); if(excel) excel.onchange=e=>handleImportFiles(e.target.files);
  const folder=document.getElementById('folderInput'); if(folder) folder.onchange=e=>handleImportFiles(e.target.files);
  const zip=document.getElementById('zipInput'); if(zip) zip.onchange=e=>handleImportFiles(e.target.files);
  if(dz){ dz.ondragover=e=>{e.preventDefault(); dz.classList.add('drag')}; dz.ondragleave=()=>dz.classList.remove('drag'); dz.ondrop=e=>{e.preventDefault(); dz.classList.remove('drag'); handleImportFiles(e.dataTransfer.files);}; }
  const confirmImport=document.getElementById('confirmImport'); if(confirmImport) confirmImport.onclick=confirmDraftImport;
  const discardImport=document.getElementById('discardImport'); if(discardImport) discardImport.onclick=()=>{ state.importDraft=null; renderImporter(); };
}

function cleanBadClients(){
  let n=0;
  for(const c of data.clients){
    if(c.name && (looksLikeCalculationLine(c.name) || looksLikeAddress(c.name) || isNonRecipientText(c.name) || /^[0-9\s.,€=x×m²mmlutudkg-]+$/i.test(c.name))){
      c.notes=[c.notes,`Nom depurat automàticament el ${today()}: ${c.name}`].filter(Boolean).join('\n');
      c.name='Client pendent de revisar';
      n++;
    }
  }
  saveData(); alert(`Clients depurats: ${n}.`); renderClients();
}

function clientsTable(rows){
  return table(['Sel.','Client','NIF/DNI/CIF','Contacte','Telèfon','Email','Adreça obra','Estat','Accions'], rows.map(c=>`
    <tr><td><input type="checkbox" class="select-client" value="${esc(c.id)}"></td><td><strong>${esc(c.name)}</strong></td><td>${esc(c.nif||'')}</td><td>${esc(c.contact||'')}</td><td>${esc(c.phone||'')}</td><td>${esc(c.email||'')}</td><td>${esc(c.workAddress||'')}</td><td>${statusPill(c.status||'')}</td><td class="nowrap"><button class="ghost small" data-edit-client="${esc(c.id)}">Editar</button> <button class="danger small" data-delete-client="${esc(c.id)}">Eliminar</button></td></tr>`));
}

function parseDateValue(v){
  if(v == null || v === '') return '';
  if(v instanceof Date) return dateIso(v);
  if(typeof v === 'number' && v > 20000 && v < 70000){ return dateIso(new Date(Math.round((v - 25569) * 86400 * 1000))); }
  let s=cleanText(v).replace(/^[A-Za-zÀ-ÿ]+:\s*/,'').trim();
  if(!s) return '';
  let m=s.match(/\b(20\d{2}|19\d{2})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
  if(m) return validIso(Number(m[1]),Number(m[2]),Number(m[3]));
  m=s.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|20\d{2}|19\d{2})\b/);
  if(m){
    let a=Number(m[1]), b=Number(m[2]), y=Number(m[3]); if(y<100) y+=2000;
    // Si el segon camp és >12, segur que el format és mm/dd/yyyy.
    if(b>12 && a<=12) return validIso(y,a,b);
    // Si el primer camp és >12, segur que és dd/mm/yyyy.
    if(a>12 && b<=12) return validIso(y,b,a);
    // En els .xls TEIMOR importats per SheetJS sovint les dates d'Excel surten com mm/dd/yyyy.
    return validIso(y,a,b) || validIso(y,b,a);
  }
  const d=new Date(s); if(!isNaN(d) && /\d{4}/.test(s)) return dateIso(d);
  return '';
}
function validIso(y,m,d){
  if(!y || !m || !d || m<1 || m>12 || d<1 || d>31) return '';
  const dt=new Date(Date.UTC(y,m-1,d));
  if(dt.getUTCFullYear()!==y || dt.getUTCMonth()!==m-1 || dt.getUTCDate()!==d) return '';
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function parseWorkbook(fileName, arrayBuffer){
  const warnings=[];
  const wb = XLSX.read(arrayBuffer, {type:'array', cellDates:true, raw:true});
  const sheets = wb.SheetNames.map(name => ({name, aoa:XLSX.utils.sheet_to_json(wb.Sheets[name], {header:1, defval:'', raw:true, blankrows:false})}));
  const flat=[];
  sheets.forEach(sh => sh.aoa.forEach((row,ri)=>flat.push({sheet:sh.name, rowIndex:ri, cells:row.map(v=>cleanText(v)).filter(v=>v!==''), raw:row})));
  warnings.push(`${fileName}: ${sheets.length} pestanya/es llegides.`);
  const client = detectClient(fileName, flat);
  const detectedDate = detectDate(flat);
  const year = detectedDate ? Number(detectedDate.slice(0,4)) : detectYear(fileName, flat);
  const parsedItems=[];
  const sheetTotals=[];
  sheets.forEach(sh => {
    const rows=sh.aoa.map(row=>row.map(v=>cleanText(v)));
    const t=findBestTotal(rows);
    if(t) sheetTotals.push(t);
    parsedItems.push(...detectItemsFromSheet(fileName, sh.name, sh.aoa));
  });
  const importedBase = sheetTotals.length ? Math.max(...sheetTotals) : 0;
  if(importedBase) warnings.push(`${fileName}: total/base imposable detectat: ${money(importedBase)}.`);
  const number = detectBudgetNumber(fileName, flat);
  const title = detectBudgetConcept(fileName, flat) || detectJobTitle(fileName, flat);
  const job = {id:uid('F'), year, clientTempKey:client.tempKey, title, address:client.workAddress || detectAddress(flat), city:client.city || detectCity(flat), status:'Històrica', source:fileName, notes:'Importada automàticament des d’Excel antic.'};
  const budget = {id:uid('P'), number, date:detectedDate || `${year}-01-01`, clientTempKey:client.tempKey, jobTempKey:job.id, title, status:'Històric importat', ci:data.settings.defaultCI, dge:data.settings.defaultDGE, bi:data.settings.defaultBI, iva:data.settings.defaultIVA, importedBase, source:fileName, notes:'Pressupost importat. Revisa partides sense amidament/preu.', lines:[]};
  budget.lines = parsedItems.map(it=>({...it,id:uid('LIN')}));
  const items = parsedItems.map(it=>({...it, origin:fileName, sourceBudget:budget.number || fileName}));
  if(!parsedItems.length) warnings.push(`${fileName}: no s’han detectat partides separades. Es guardarà només client/pressupost si confirmes.`);
  if(client.name==='Client pendent de revisar') warnings.push(`${fileName}: no s’ha trobat un nom de client segur al requadre; revisa el client abans de confirmar.`);
  return {client, job, budget, items, warnings};
}

function detectRecipientBlock(flat){
  const blocks=[];
  const bySheet={};
  for(const r of flat){ (bySheet[r.sheet]=bySheet[r.sheet]||[]).push(r); }
  Object.values(bySheet).forEach(rows=>{
    const dataRows=rows.filter(r=>(r.raw||[]).some(c=>/^\s*(data|fecha)\s*:?\s*$/i.test(cleanText(c)))).map(r=>r.rowIndex);
    const pressupostRows=rows.filter(r=>(r.raw||[]).some(c=>/^\s*(pressupost|presupuesto)\s*:?\s*$/i.test(cleanText(c)))).map(r=>r.rowIndex);
    const firstBody = rows.filter(r=>r.rowIndex>5 && (r.raw||[]).some(c=>/^\s*(obra|concepte|concepto|medici[oó]n?|treballs|trabajos)\s*:?\s*$/i.test(cleanText(c)))).map(r=>r.rowIndex)[0] || 30;
    const anchorStart = dataRows.length ? Math.max(0, Math.min(...dataRows)-3) : 6;
    const anchorEnd = pressupostRows.length ? Math.min(firstBody, Math.max(...pressupostRows)+2) : Math.min(firstBody, anchorStart+8);
    for(let col=2; col<=16; col++){
      const lines=[];
      for(const r of rows){
        if(r.rowIndex<anchorStart || r.rowIndex>anchorEnd || r.rowIndex>=firstBody) continue;
        const val=cleanText((r.raw||[])[col]||'');
        if(!val) continue;
        if(isTeimorText(val) || isNonRecipientText(val) || looksLikeCalculationLine(val) || /[€=]/.test(val)) continue;
        if(/^\*|materials?\s*i\s*m\.?o\.?|base imposable|iva|total|concepte|treballs/i.test(val)) continue;
        if(val.length>100) continue;
        lines.push({row:r.rowIndex,col,text:val});
      }
      if(lines.length){
        lines.sort((a,b)=>a.row-b.row);
        const texts=lines.map(x=>x.text);
        const hasName=texts.some(isProbablyClientName);
        const hasLocator=texts.some(looksLikeAddress) || texts.some(looksLikeCityLine) || texts.some(x=>/\b([A-HJNP-SUVW][0-9]{7}[0-9A-J]|[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])\b/i.test(x));
        if(hasName && (hasLocator || texts.length>=2)) blocks.push({col, lines:texts, rows:lines.map(x=>x.row), anchor:true});
      }
    }
    // Fallback: qualsevol bloc superior abans del cos, però amb penalització.
    for(let col=2; col<=16; col++){
      let chunk=[];
      const flush=()=>{ if(chunk.length){ const texts=chunk.map(x=>x.text); const hasName=texts.some(isProbablyClientName); const hasLocator=texts.some(looksLikeAddress)||texts.some(looksLikeCityLine); if(hasName && (hasLocator || texts.length>=2)) blocks.push({col, lines:texts, rows:chunk.map(x=>x.row), anchor:false}); } chunk=[]; };
      for(const r of rows){
        if(r.rowIndex<=5 || r.rowIndex>=firstBody) continue;
        const val=cleanText((r.raw||[])[col]||'');
        if(!val || isTeimorText(val) || isNonRecipientText(val) || looksLikeCalculationLine(val) || /[€=]/.test(val) || val.length>100) continue;
        if(chunk.length && r.rowIndex-chunk[chunk.length-1].row>2) flush();
        chunk.push({row:r.rowIndex,col,text:val});
      }
      flush();
    }
  });
  const labelled=findValueByLabels(flat, ['client','cliente','destinatari','destinatario','senyors','sres','promotor','propietari','propiedad','comunitat','comunidad']);
  if(labelled && isProbablyClientName(labelled)) blocks.push({col:99, rows:[0], lines:[labelled], anchor:false});
  if(!blocks.length) return {name:'',address:'',city:'',fiscalAddress:'',text:''};
  const scored=blocks.map(b=>({...b, score:recipientBlockScore(b.lines) + (b.anchor?80:0) + (b.col>=4?35:0)})).sort((a,b)=>b.score-a.score);
  const best=scored[0];
  const lines=best.lines.map(cleanText).filter(Boolean).filter(x=>!looksLikeCalculationLine(x) && !isNonRecipientText(x));
  let name='';
  for(const l of lines){ if(isProbablyClientName(l)){ name=l; break; } }
  const address = lines.find(looksLikeAddress) || '';
  const cityLine = lines.find(looksLikeCityLine) || '';
  const fiscalAddress = lines.filter(l=>l && l!==name).join('\n');
  return {name, address, city:extractCityFromLine(cityLine), fiscalAddress, text:lines.join('\n')};
}

function detectClient(fileName, flat){
  const recipient = detectRecipientBlock(flat);
  const all = flat.map(r=>r.cells.join(' | ')).join('\n');
  const candidateText = recipient.text || all;
  const nif = firstRegex(candidateText, /\b(?!B55271159\b)([A-HJNP-SUVW][0-9]{7}[0-9A-J]|[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])\b/i) || '';
  const email = firstRegex(candidateText, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || '';
  const phone = detectPhone(candidateText);
  let name = recipient.name || findValueByLabels(flat, ['client','cliente','destinatari','destinatario','senyors','sres','promotor','propietari','propiedad','comunitat','comunidad']) || '';
  name = cleanClientName(name);
  if(name==='Client pendent de revisar'){
    const guessed=guessNameFromFile(fileName);
    if(isProbablyClientName(guessed) && !looksLikeAddress(guessed)) name=cleanClientName(guessed);
  }
  const workAddress = recipient.address || findValueByLabels(flat, ['obra','direccion obra','direcció obra','adreça obra','situada','situat','emplaçament','emplazamiento']) || detectAddress(flat);
  const city = recipient.city || detectCity(flat);
  return {id:uid('CLI'), tempKey:uid('TMPCLI'), name, nif, phone, email, contact:'', fiscalAddress:recipient.fiscalAddress||'', workAddress, city, status:'Actiu', source:fileName, notes:'Client detectat automàticament del requadre/destinatari. Revisar si cal.'};
}

function detectDate(flat){
  const labels=['data','fecha','date'];
  for(let ri=0; ri<Math.min(flat.length,120); ri++){
    const r=flat[ri]; const cells=r.raw || [];
    for(let i=0;i<cells.length;i++){
      const label=strip(cells[i]).replace(/:$/,'');
      if(labels.includes(label)){
        for(let j=i+1;j<Math.min(cells.length,i+5);j++){ const d=parseDateValue(cells[j]); if(d) return d; }
        const own=parseDateValue(cells[i]); if(own) return own;
        const next=flat[ri+1]?.raw || [];
        for(let j=i;j<Math.min(next.length,i+4);j++){ const d=parseDateValue(next[j]); if(d) return d; }
      }
    }
  }
  for(const r of flat.slice(0,80)) for(const c of (r.raw||[])){ const d=parseDateValue(c); if(d) return d; }
  return '';
}

function detectBudgetNumber(fileName, flat){
  for(const r of flat.slice(0,120)){
    const cells=r.raw||[];
    for(let i=0;i<cells.length;i++){
      const s=strip(cells[i]).replace(/:$/,'');
      if(s==='pressupost' || s==='presupuesto' || s==='nº pressupost' || s==='n pressupost' || s==='numero pressupost' || s==='número pressupost'){
        for(let j=i+1;j<Math.min(cells.length,i+5);j++){
          const v=cleanText(cells[j]);
          if(v && !parseDateValue(cells[j]) && !isTeimorText(v) && !isNonRecipientText(v)) return v;
        }
      }
    }
  }
  const p=fileName.split('/').pop().replace(/\.(xls|xlsx|xlsm|csv)$/i,'');
  const m=p.match(/^\s*(\d{1,5})\b/);
  return m ? m[1] : p;
}
function detectBudgetConcept(fileName, flat){
  const concept=findValueStrictLabel(flat,['concepte','concepto','descripcio','descripción','descripcion']);
  if(concept) return concept;
  const obra=findValueStrictLabel(flat,['obra','treball','trabajo','feina']);
  if(obra) return obra;
  return guessNameFromFile(fileName);
}
function detectJobTitle(fileName, flat){ return detectBudgetConcept(fileName, flat); }
function findValueStrictLabel(flat, labels){
  const labs=labels.map(strip);
  for(const r of flat.slice(0,180)){
    const cells=r.raw.map(v=>cleanText(v));
    for(let i=0;i<cells.length;i++){
      const s=strip(cells[i]).replace(/:$/,'');
      if(labs.includes(s)){
        const v=cells.slice(i+1).find(x=>x && !isTeimorText(x) && !isNonRecipientText(x) && !looksLikeCalculationLine(x));
        if(v && !looksLikeAddress(v) && v.length>1) return v;
      }
    }
  }
  return '';
}

function budgetRowsFiltered(){
  const q=strip(document.getElementById('budgetSearch')?.value ?? state.budgetSearch ?? '');
  const year=document.getElementById('budgetYearFilter')?.value ?? state.budgetYearFilter ?? '';
  const status=strip(document.getElementById('budgetStatusFilter')?.value ?? state.budgetStatusFilter ?? '');
  const client=document.getElementById('budgetClientFilter')?.value ?? state.budgetClientFilter ?? '';
  return data.budgets.filter(b=>{
    const j=byId(data.jobs,b.jobId);
    const c=byId(data.clients,b.clientId);
    const blob=[b.id,b.number,b.date,b.title,b.status,b.source,b.notes,c?.name,c?.nif,c?.phone,c?.email,j?.title,j?.address,j?.city,budgetYear(b)].join(' ');
    return (!q || strip(blob).includes(q)) && (!year || String(budgetYear(b))===String(year)) && (!status || strip(b.status)===status) && (!client || b.clientId===client);
  }).sort((a,b)=>{
    const da=parseDateValue(a.date) || `${budgetYear(a)||0}-01-01`;
    const db=parseDateValue(b.date) || `${budgetYear(b)||0}-01-01`;
    return db.localeCompare(da) || String(a.number||'').localeCompare(String(b.number||''), 'ca', {numeric:true});
  });
}

function budgetsTable(rows){
  return table(['Sel.','Any','Data','Núm.','Client','Concepte / obra','Estat','Base s/IVA','Total IVA incl.','Tipus import','Partides','Accions'], rows.map(b=>{
    const lineSum = budgetLineSum(b);
    const calcType = lineSum>0 ? 'Suma de partides' : (num(b.importedBase)>0 ? 'Total importat Excel' : 'Sense import');
    const job=byId(data.jobs,b.jobId);
    const title=cleanText(b.title || job?.title || '');
    const addr=cleanText(job?.address || '');
    return `
    <tr class="clickable-row" data-open-budget="${esc(b.id)}">
      <td><input type="checkbox" class="select-budget" value="${esc(b.id)}" data-no-row-open></td>
      <td>${esc(budgetYear(b)||'')}</td>
      <td>${dateDisplay(b.date)}</td>
      <td><strong>${esc(b.number||b.id)}</strong></td>
      <td>${esc(clientName(b.clientId))}</td>
      <td><strong>${esc(title)}</strong>${addr && strip(addr)!==strip(title)?`<br><span class="muted">${esc(addr)}</span>`:''}</td>
      <td><select class="status-select" data-budget-status="${esc(b.id)}" data-no-row-open>${budgetStatusOptions(b.status||'Esborrany')}</select></td>
      <td class="num">${money(budgetBase(b))}</td>
      <td class="num"><strong>${money(budgetTotal(b))}</strong></td>
      <td>${esc(calcType)}</td>
      <td class="num">${(b.lines||[]).length}</td>
      <td class="nowrap"><button class="ghost small" data-edit-budget="${esc(b.id)}" data-no-row-open>Veure / editar</button> <button class="ghost small" data-preview-budget="${esc(b.id)}" data-no-row-open>Previsualitzar A4</button> <button class="danger small" data-delete-budget="${esc(b.id)}" data-no-row-open>Eliminar</button></td>
    </tr>`}));
}

function openBudgetModal(id=''){
  const isNew = id === '__new' || !id;
  const b = isNew ? {id:'', lines:[], date:today(), ci:data.settings.defaultCI, dge:data.settings.defaultDGE, bi:data.settings.defaultBI, iva:data.settings.defaultIVA, status:'Esborrany'} : byId(data.budgets,id);
  if(!b) return alert('No s’ha trobat aquest pressupost.');
  state.editBudgetId = isNew ? '__new' : b.id;
  state.selectedBudgetId = isNew ? '' : b.id;
  openModal(`
    <h2>${isNew?'Nou pressupost':'Pressupost · '+esc(b.number||b.id)}</h2>
    <div class="notice-blue card-tight">${isNew?'Primer guarda la capçalera del pressupost. Després podràs afegir partides de la llibreria o crear-ne de noves.':'Pots editar la capçalera, revisar partides i obrir una previsualització A4 per imprimir o guardar en PDF.'}</div>
    <div class="actions" style="margin:0 0 12px">${!isNew?`<button class="ghost" type="button" data-preview-budget-modal="${esc(b.id)}">Vista preliminar A4 / PDF</button>`:''}</div>
    ${budgetFormCard(b,isNew)}
    ${!isNew ? budgetLinesCard(b) : ''}
  `);
  document.querySelectorAll('[data-preview-budget-modal]').forEach(btn=>btn.onclick=()=>openBudgetPreview(btn.dataset.previewBudgetModal));
}

function openBudgetPreview(id){
  const b=byId(data.budgets,id); if(!b) return alert('No s’ha trobat el pressupost.');
  const c=byId(data.clients,b.clientId)||{}; const j=byId(data.jobs,b.jobId)||{}; const s=data.settings.contractista||{};
  const rows=(b.lines||[]).map((l,idx)=>`<tr><td>${idx+1}</td><td>${esc(l.unit||'')}</td><td><strong>${esc(l.concept||'')}</strong>${l.longDesc?`<div class="preview-desc">${esc(l.longDesc)}</div>`:''}</td><td class="num">${l.qty?num(l.qty).toLocaleString('ca-ES'):''}</td><td class="num">${l.unitPrice?money(l.unitPrice):''}</td><td class="num">${money(lineTotal(l))}</td></tr>`).join('');
  const html=`<div class="preview-toolbar actions"><button class="primary" onclick="window.print()">Imprimir / guardar PDF</button><button class="ghost" onclick="window.close()">Tancar</button></div>
    <div class="a4-sheet">
      <div class="preview-header"><div><h1>${esc(s.name||'TEIMOR')}</h1><p>${esc(s.nif||'')}<br>${esc(s.address||'')}<br>${esc(s.city||'')}<br>${esc(s.phone||'')}</p></div><div class="client-box"><strong>${esc(c.name||'Client pendent de revisar')}</strong><br>${esc(c.nif||'')}<br>${esc(c.workAddress||j.address||'')}<br>${esc(c.city||'')}</div></div>
      <div class="preview-meta"><div><strong>Data:</strong> ${dateDisplay(b.date)}</div><div><strong>Pressupost núm.:</strong> ${esc(b.number||'')}</div></div>
      <h2>${esc(b.title||j.title||'Pressupost')}</h2>
      ${j.address?`<p><strong>Obra:</strong> ${esc(j.address)}</p>`:''}
      <table class="preview-table"><thead><tr><th>Part.</th><th>Ut</th><th>Concepte / descripció</th><th>Quantitat</th><th>Preu/ut</th><th>Total</th></tr></thead><tbody>${rows || `<tr><td colspan="6">Sense línies detallades. Import detectat de l’Excel original.</td></tr>`}</tbody></table>
      <div class="preview-totals"><div>Base s/IVA: <strong>${money(budgetBase(b))}</strong></div><div>IVA ${num(b.iva)}%: <strong>${money(budgetIVA(b))}</strong></div><div>Total: <strong>${money(budgetTotal(b))}</strong></div></div>
      <div class="preview-notes">${esc(b.notes||'')}</div>
    </div>`;
  const w=window.open('', '_blank');
  if(!w) return alert('El navegador ha bloquejat la finestra de previsualització. Permet pop-ups per aquesta app.');
  w.document.write(`<!doctype html><html lang="ca"><head><meta charset="utf-8"><title>Pressupost ${esc(b.number||'')}</title><style>${previewCss()}</style></head><body>${html}</body></html>`);
  w.document.close();
}
function previewCss(){ return `body{font-family:Arial,sans-serif;background:#e5e7eb;margin:0;padding:18px;color:#111827}.preview-toolbar{max-width:210mm;margin:0 auto 12px}.preview-toolbar button{border:1px solid #ddd;border-radius:8px;padding:8px 12px;margin-right:8px}.preview-toolbar .primary{background:#c2410c;color:white}.a4-sheet{width:210mm;min-height:297mm;margin:auto;background:white;padding:16mm;box-shadow:0 8px 30px rgba(0,0,0,.18)}.preview-header{display:grid;grid-template-columns:1fr 75mm;gap:12mm;align-items:start}.preview-header h1{font-size:22px;margin:0 0 5px}.preview-header p{font-size:12px;line-height:1.35}.client-box{border:1px solid #222;padding:8px;min-height:34mm;font-size:12px;line-height:1.45}.preview-meta{display:flex;gap:30mm;border-top:1px solid #222;border-bottom:1px solid #222;padding:7px 0;margin:8mm 0;font-size:13px}h2{font-size:16px;margin:0 0 5mm}.preview-table{width:100%;border-collapse:collapse;font-size:11px}.preview-table th,.preview-table td{border:1px solid #333;padding:5px;vertical-align:top}.preview-table th{background:#f3f4f6}.num{text-align:right;white-space:nowrap}.preview-desc{font-size:10px;margin-top:3px;white-space:pre-wrap;line-height:1.25;color:#374151}.preview-totals{margin-top:8mm;margin-left:auto;width:80mm;font-size:13px}.preview-totals div{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:4px}.preview-notes{margin-top:10mm;font-size:10px;color:#555}@media print{body{background:white;padding:0}.preview-toolbar{display:none}.a4-sheet{box-shadow:none;margin:0;width:auto;min-height:auto;padding:12mm}@page{size:A4;margin:0}}`; }

function importPreviewHtml(d){
  return `<div class="card"><h2>Previsualització abans de confirmar</h2>
    <div class="import-summary">
      <div class="import-card"><span>Fitxers llegits</span><strong>${d.files.length}</strong></div>
      <div class="import-card"><span>Clients detectats</span><strong>${d.clients.length}</strong></div>
      <div class="import-card"><span>Obres internes</span><strong>${d.jobs.length}</strong></div>
      <div class="import-card"><span>Pressupostos</span><strong>${d.budgets.length}</strong></div>
      <div class="import-card"><span>Partides</span><strong>${d.items.length}</strong></div>
    </div>
    <div class="actions"><button class="primary" id="confirmImport">Confirmar importació</button><button class="ghost" id="discardImport">Descartar</button></div>
    <h3>Pressupostos detectats</h3>${table(['Data','Núm.','Client','Concepte/obra','Base detectada','Partides','Origen'], d.budgets.slice(0,80).map(b=>{const c=d.clients.find(x=>x.tempKey===b.clientTempKey)||{};return `<tr><td>${dateDisplay(b.date)}</td><td>${esc(b.number||'')}</td><td>${esc(c.name||'')}</td><td>${esc(b.title||'')}</td><td class="num">${money(b.importedBase||0)}</td><td class="num">${(b.lines||[]).length}</td><td>${esc(b.source||'')}</td></tr>`}))}
    <h3>Clients detectats</h3>${table(['Client','NIF/CIF','Telèfon','Email','Adreça obra','Origen'], d.clients.slice(0,30).map(c=>`<tr><td>${esc(c.name)}</td><td>${esc(c.nif)}</td><td>${esc(c.phone)}</td><td>${esc(c.email)}</td><td>${esc(c.workAddress)}</td><td>${esc(c.source)}</td></tr>`))}
    <h3>Partides detectades</h3>${table(['Codi','Ut','Concepte','Quantitat','PU','Total','Estat','Origen'], d.items.slice(0,120).map(i=>`<tr><td>${esc(i.code)}</td><td>${esc(i.unit)}</td><td><strong>${esc(i.concept)}</strong><div class="long muted">${esc(i.longDesc)}</div></td><td class="num">${i.qty?num(i.qty).toFixed(3):''}</td><td class="num">${i.unitPrice?money(i.unitPrice):''}</td><td class="num">${i.total?money(i.total):''}</td><td>${statusPill(i.status)}</td><td>${esc(i.origin)}</td></tr>`))}
    <h3>Registre d’importació</h3><div class="log">${esc(d.log.join('\n'))}</div>
  </div>`;
}

/* =========================
   V09.2 overrides: ordre columnes, llibreria agrupada i alta de pressupostos més còmoda
   ========================= */
(function(){
  // Marquem la versió visual sense canviar la clau local, perquè l'usuari mantingui les dades importades.
  if(data && data.meta){ data.meta.version = '9.2.0-ordre-llibreria'; }
})();

function sortIcon(kind, key){
  const field = state[`${kind}SortField`] || (kind==='budget'?'date':kind==='client'?'name':'chapter');
  const dir = state[`${kind}SortDir`] || (kind==='budget'?'desc':'asc');
  if(field !== key) return '↕';
  return dir === 'asc' ? '↑' : '↓';
}
function sortableTh(label, kind, key){
  return `<th><button class="sort-th" type="button" data-sort-kind="${esc(kind)}" data-sort-key="${esc(key)}">${esc(label)} <span>${sortIcon(kind,key)}</span></button></th>`;
}
function compareMixed(a,b,dir='asc'){
  const mult = dir === 'desc' ? -1 : 1;
  const an = num(a), bn = num(b);
  if((an || bn) && String(a??'').match(/[0-9]/) && String(b??'').match(/[0-9]/)) return (an-bn)*mult;
  return String(a??'').localeCompare(String(b??''), 'ca', {numeric:true, sensitivity:'base'}) * mult;
}
function nextBudgetNumber(date=today()){
  const year = Number((parseDateValue(date)||today()).slice(0,4));
  const nums = data.budgets
    .filter(b => Number(budgetYear(b)) === year)
    .map(b => {
      const m = String(b.number||'').match(/\d+/);
      return m ? Number(m[0]) : 0;
    })
    .filter(Boolean);
  const allNums = data.budgets.map(b=>{ const m=String(b.number||'').match(/\d+/); return m?Number(m[0]):0; }).filter(Boolean);
  const next = (nums.length ? Math.max(...nums) : (allNums.length ? Math.max(...allNums) : 0)) + 1;
  return String(next);
}
function sortByBudgetField(rows){
  const field = state.budgetSortField || 'date';
  const dir = state.budgetSortDir || 'desc';
  const val = b => {
    const j=byId(data.jobs,b.jobId)||{}; const c=byId(data.clients,b.clientId)||{};
    if(field==='year') return budgetYear(b)||'';
    if(field==='date') return parseDateValue(b.date)||'';
    if(field==='number') return b.number||'';
    if(field==='client') return c.name||'';
    if(field==='title') return b.title||j.title||'';
    if(field==='status') return b.status||'';
    if(field==='base') return budgetBase(b);
    if(field==='total') return budgetTotal(b);
    if(field==='type') return budgetLineSum(b)>0 ? 'Suma de partides' : (num(b.importedBase)>0 ? 'Total importat Excel' : 'Sense import');
    if(field==='lines') return (b.lines||[]).length;
    return b.date||'';
  };
  return [...rows].sort((a,b)=> compareMixed(val(a), val(b), dir) || compareMixed(a.number,b.number,'asc'));
}
function sortByClientField(rows){
  const field=state.clientSortField||'name'; const dir=state.clientSortDir||'asc';
  const val=c=> field==='nif'?c.nif:field==='phone'?c.phone:field==='email'?c.email:field==='address'?c.workAddress:field==='city'?c.city:field==='status'?c.status:c.name;
  return [...rows].sort((a,b)=>compareMixed(val(a),val(b),dir));
}
function sortByLibraryField(rows){
  const field=state.librarySortField||'concept'; const dir=state.librarySortDir||'asc';
  const val=x=> field==='code'?x.code:field==='unit'?x.unit:field==='pu'?(x.unitPrice||libFinal(x)):field==='status'?x.status:field==='origin'?x.origin:field==='chapter'?x.chapter:x.concept;
  return [...rows].sort((a,b)=>compareMixed(val(a),val(b),dir));
}

function clientsTable(rows=data.clients){
  rows=sortByClientField(rows);
  const headers = [
    '<th>Sel.</th>',
    sortableTh('Client','client','name'),
    sortableTh('NIF/DNI/CIF','client','nif'),
    '<th>Contacte</th>',
    sortableTh('Telèfon','client','phone'),
    sortableTh('Email','client','email'),
    sortableTh('Adreça obra','client','address'),
    sortableTh('Estat','client','status'),
    '<th>Accions</th>'
  ].join('');
  if(!rows.length) return empty();
  return `<div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${rows.map(c=>`
    <tr><td><input type="checkbox" class="select-client" value="${esc(c.id)}"></td><td><strong>${esc(c.name)}</strong></td><td>${esc(c.nif||'')}</td><td>${esc(c.contact||'')}</td><td>${esc(c.phone||'')}</td><td>${esc(c.email||'')}</td><td>${esc(c.workAddress||'')}</td><td>${statusPill(c.status||'')}</td><td class="nowrap"><button class="ghost small" data-edit-client="${esc(c.id)}">Editar</button> <button class="danger small" data-delete-client="${esc(c.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`;
}

function renderLibrary(){
  setHeader('Llibreria de partides','Partides agrupades per capítol. Pots filtrar, ordenar i obrir cada partida per veure la fitxa, descripció llarga i descompost BEDEC.');
  const q=state.libSearch || '';
  const filter=strip(q);
  const chapters=[...new Set(data.library.map(x=>x.chapter||'Sense capítol').filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const chapter=state.libChapterFilter || '';
  const statusFilter=strip(state.libStatusFilter || '');
  let rows=data.library.filter(x=>{
    const chapterOk=!chapter || (x.chapter||'Sense capítol')===chapter;
    const statusOk=!statusFilter || strip(x.status||'').includes(statusFilter);
    const searchOk=!filter || strip([x.code,x.chapter,x.unit,x.concept,x.longDesc,x.status,x.origin].join(' ')).includes(filter);
    return chapterOk && statusOk && searchOk;
  });
  rows=sortByLibraryField(rows);
  setContent(`
    <div class="card">
      <div class="toolbar"><h2>Llibreria per capítols</h2><div class="right"><button class="ghost" id="selectAllLibrary">Seleccionar tot</button><button class="ghost" id="clearSelectedLibrary">Desmarcar</button><button class="danger" id="deleteSelectedLibrary">Eliminar seleccionades</button><button class="ghost" id="exportLibraryJson">Exportar llibreria</button><label class="ghost file-label">Importar llibreria<input id="importLibraryJson" type="file" accept="application/json" hidden></label><button class="primary" id="newLibItem">Nova partida</button></div></div>
      <div class="filter-grid">
        <label>Cerca<input id="libSearch" placeholder="Cercar partida, codi, origen..." value="${esc(q)}"></label>
        <label>Capítol<select id="libChapterFilter"><option value="">Tots els capítols</option>${chapters.map(c=>`<option value="${esc(c)}" ${c===chapter?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
        <label>Estat<select id="libStatusFilter"><option value="">Tots</option>${['Validada','Validada pendent revisió','Importada pendent de revisar','Històrica sense amidament','PA pendent amidament','Duplicada possible'].map(s=>`<option ${strip(s)===statusFilter?'selected':''}>${esc(s)}</option>`).join('')}</select></label>
        <label>Resultats<input readonly value="${rows.length} de ${data.library.length}"></label>
      </div>
      <div class="sort-bar small-text">Ordenar llibreria: ${sortableInline('Codi','library','code')} ${sortableInline('Capítol','library','chapter')} ${sortableInline('Concepte','library','concept')} ${sortableInline('PU','library','pu')} ${sortableInline('Estat','library','status')}</div>
      <div id="libraryTable">${libraryGroupedTable(rows)}</div>
    </div>
  `);
}
function sortableInline(label, kind, key){ return `<button class="sort-chip" type="button" data-sort-kind="${esc(kind)}" data-sort-key="${esc(key)}">${esc(label)} ${sortIcon(kind,key)}</button>`; }
function libraryGroupedTable(rows){
  if(!rows.length) return empty();
  const grouped={};
  for(const item of rows){ const ch=item.chapter||'Sense capítol'; (grouped[ch] ||= []).push(item); }
  return Object.keys(grouped).sort((a,b)=>a.localeCompare(b,'ca',{numeric:true})).map(ch=>`
    <details class="chapter-group" open>
      <summary><strong>${esc(ch)}</strong><span>${grouped[ch].length} partida/es</span></summary>
      ${libraryTable(grouped[ch])}
    </details>`).join('');
}
function libraryTable(rows){
  if(!rows.length) return empty();
  return `<div class="table-wrap library-mini-table"><table><thead><tr><th>Sel.</th>${sortableTh('Codi','library','code')}<th>Ut</th>${sortableTh('Descripció curta','library','concept')}${sortableTh('PU final','library','pu')}<th>Estat</th><th>Origen</th><th>Accions</th></tr></thead><tbody>${rows.map(item=>`
    <tr>
      <td><input type="checkbox" class="select-library" value="${esc(item.id)}"></td>
      <td><strong>${esc(item.code||'')}</strong></td>
      <td>${esc(item.unit||'')}</td>
      <td><button class="linklike" data-view-lib="${esc(item.id)}"><strong>${esc(item.concept||'')}</strong></button></td>
      <td class="num">${money(item.unitPrice || libFinal(item))}</td>
      <td>${statusPill(item.status||'Pendent')}</td>
      <td>${esc(item.origin||'')}</td>
      <td class="nowrap"><button class="ghost small" data-view-lib="${esc(item.id)}">Veure / editar</button> <button class="danger small" data-delete-lib="${esc(item.id)}">Eliminar</button></td>
    </tr>`).join('')}</tbody></table></div>`;
}

function budgetRowsFiltered(){
  const q=strip(document.getElementById('budgetSearch')?.value ?? state.budgetSearch ?? '');
  const year=document.getElementById('budgetYearFilter')?.value ?? state.budgetYearFilter ?? '';
  const status=strip(document.getElementById('budgetStatusFilter')?.value ?? state.budgetStatusFilter ?? '');
  const client=document.getElementById('budgetClientFilter')?.value ?? state.budgetClientFilter ?? '';
  const rows=data.budgets.filter(b=>{
    const j=byId(data.jobs,b.jobId);
    const c=byId(data.clients,b.clientId);
    const blob=[b.id,b.number,b.date,b.title,b.status,b.source,b.notes,c?.name,c?.nif,c?.phone,c?.email,j?.title,j?.address,j?.city,budgetYear(b)].join(' ');
    return (!q || strip(blob).includes(q)) && (!year || String(budgetYear(b))===String(year)) && (!status || strip(b.status)===status) && (!client || b.clientId===client);
  });
  return sortByBudgetField(rows);
}
function budgetsTable(rows){
  if(!rows.length) return empty();
  const headers=[
    '<th>Sel.</th>', sortableTh('Any','budget','year'), sortableTh('Data','budget','date'), sortableTh('Núm.','budget','number'), sortableTh('Client','budget','client'), sortableTh('Concepte / obra','budget','title'), sortableTh('Estat','budget','status'), sortableTh('Base s/IVA','budget','base'), sortableTh('Total IVA incl.','budget','total'), sortableTh('Tipus import','budget','type'), sortableTh('Partides','budget','lines'), '<th>Accions</th>'
  ].join('');
  return `<div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${rows.map(b=>{
    const lineSum = budgetLineSum(b);
    const calcType = lineSum>0 ? 'Suma de partides' : (num(b.importedBase)>0 ? 'Total importat Excel' : 'Sense import');
    const job=byId(data.jobs,b.jobId);
    const title=cleanText(b.title || job?.title || '');
    const addr=cleanText(job?.address || '');
    return `<tr class="clickable-row" data-open-budget="${esc(b.id)}">
      <td><input type="checkbox" class="select-budget" value="${esc(b.id)}" data-no-row-open></td>
      <td>${esc(budgetYear(b)||'')}</td>
      <td>${dateDisplay(b.date)}</td>
      <td><strong>${esc(b.number||b.id)}</strong></td>
      <td>${esc(clientName(b.clientId))}</td>
      <td><strong>${esc(title)}</strong>${addr && strip(addr)!==strip(title)?`<br><span class="muted">${esc(addr)}</span>`:''}</td>
      <td><select class="status-select" data-budget-status="${esc(b.id)}" data-no-row-open>${budgetStatusOptions(b.status||'Esborrany')}</select></td>
      <td class="num">${money(budgetBase(b))}</td>
      <td class="num"><strong>${money(budgetTotal(b))}</strong></td>
      <td>${esc(calcType)}</td>
      <td class="num">${(b.lines||[]).length}</td>
      <td class="nowrap"><button class="ghost small" data-edit-budget="${esc(b.id)}" data-no-row-open>Veure / editar</button> <button class="ghost small" data-preview-budget="${esc(b.id)}" data-no-row-open>Previsualitzar A4</button> <button class="danger small" data-delete-budget="${esc(b.id)}" data-no-row-open>Eliminar</button></td>
    </tr>`;}).join('')}</tbody></table></div>`;
}
function renderBudgets(editId=''){
  setHeader('Pressupostos','Llistat complet ordenable. Clica les capçaleres per ordenar de més antic a més nou, de nou a antic o per qualsevol columna.');
  if(editId) { state.editBudgetId=editId; state.selectedBudgetId=editId === '__new' ? '' : editId; }
  const years=[...new Set(data.budgets.map(b=>budgetYear(b)).filter(Boolean))].sort((a,b)=>b-a);
  const statuses=[...new Set(data.budgets.map(b=>b.status).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const rows=budgetRowsFiltered();
  setContent(`
    <div class="grid four">
      <div class="kpi"><span>Pressupostos</span><strong>${data.budgets.length}</strong></div>
      <div class="kpi"><span>Total pressupostos s/IVA</span><strong>${money(data.budgets.reduce((s,b)=>s+budgetBase(b),0))}</strong></div>
      <div class="kpi"><span>Acceptats / fets</span><strong>${data.budgets.filter(b=>strip(b.status).includes('acceptat')||strip(b.status).includes('fet')).length}</strong></div>
      <div class="kpi"><span>Rebutjats / anul·lats</span><strong>${data.budgets.filter(b=>strip(b.status).includes('rebutjat')||strip(b.status).includes('anul')).length}</strong></div>
    </div>
    <div class="card"><div class="toolbar"><h2>Tots els pressupostos</h2><div class="right"><button class="ghost" id="selectAllBudgets">Seleccionar tot</button><button class="ghost" id="clearSelectedBudgets">Desmarcar</button><button class="danger" id="deleteSelectedBudgets">Eliminar seleccionats</button><button class="primary" id="newBudgetBtn">+ Nou pressupost</button><button class="ghost" id="exportBudgetCsv">Exportar CSV del seleccionat</button></div></div>
      <div class="filter-grid">
        <label>Cerca<input id="budgetSearch" placeholder="Client, obra, núm., adreça, any..." value="${esc(state.budgetSearch||'')}"></label>
        <label>Any<select id="budgetYearFilter"><option value="">Tots</option>${years.map(y=>`<option value="${y}" ${String(y)===String(state.budgetYearFilter||'')?'selected':''}>${y}</option>`).join('')}</select></label>
        <label>Client<select id="budgetClientFilter"><option value="">Tots</option>${options(data.clients,state.budgetClientFilter||'')}</select></label>
        <label>Estat<select id="budgetStatusFilter"><option value="">Tots</option>${statuses.map(x=>`<option ${strip(x)===strip(state.budgetStatusFilter||'')?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      </div>
      <div class="sort-help small-text">Ordre actual: <strong>${esc(state.budgetSortField||'data')}</strong> ${esc(state.budgetSortDir==='asc'?'ascendent':'descendent')} · prem una capçalera per canviar.</div>
      <div id="budgetFilterInfo" class="small-text" style="margin:10px 0">Mostrant ${rows.length} de ${data.budgets.length} pressupostos.</div>
      <div id="budgetsTable">${budgetsTable(rows)}</div>
    </div>
    <div class="empty">Clica sobre qualsevol pressupost o al botó “Veure / editar” per obrir-ne la fitxa completa en una finestra superior.</div>
  `);
}
function budgetFormCard(formBudget,isNew=false){
  const autoNumber = isNew ? nextBudgetNumber(formBudget.date || today()) : (formBudget.number||'');
  return `<div class="card"><h2>${isNew?'Nou pressupost':'Editar pressupost'}</h2>
      <form id="budgetForm" class="form-grid budget-form-wide">
        <input type="hidden" name="id" value="${esc(formBudget.id||uid('P'))}">
        <label>Número<input name="number" id="budgetNumberInput" value="${esc(autoNumber)}" data-auto-number="${isNew?'1':'0'}"></label>
        <label>Data<input name="date" id="budgetDateInput" type="date" value="${esc(formBudget.date||today())}"></label>
        <label class="wide">Client<select name="clientId" required><option value="">Selecciona client</option>${options(data.clients,formBudget.clientId)}</select></label>
        <label class="wide">Feina<select name="jobId"><option value="">Sense feina</option>${options(data.jobs,formBudget.jobId,x=>`${x.year} · ${x.title}`)}</select></label>
        <label class="full concept-field">Títol / concepte del pressupost<input name="title" value="${esc(formBudget.title||'')}" placeholder="Concepte principal del pressupost"></label>
        <label>Estat<select name="status">${budgetStatusOptions(formBudget.status||'Esborrany')}</select></label>
        <label>CI %<input name="ci" type="number" step="0.01" value="${esc(formBudget.ci ?? data.settings.defaultCI)}"></label>
        <label>DGE %<input name="dge" type="number" step="0.01" value="${esc(formBudget.dge ?? data.settings.defaultDGE)}"></label>
        <label>BI %<input name="bi" type="number" step="0.01" value="${esc(formBudget.bi ?? data.settings.defaultBI)}"></label>
        <label>IVA %<input name="iva" type="number" step="0.01" value="${esc(formBudget.iva ?? data.settings.defaultIVA)}"></label>
        <label>Base importada s/IVA<input name="importedBase" type="number" step="0.01" value="${esc(formBudget.importedBase || '')}"></label>
        <label class="full">Notes<textarea name="notes">${esc(formBudget.notes||'')}</textarea></label>
        <div class="actions full"><button class="primary">Guardar pressupost</button><button class="ghost" type="button" data-render-budgets>Cancel·lar</button></div>
      </form>
    </div>`;
}
function openBudgetModal(id=''){
  const isNew = id === '__new' || !id;
  const b = isNew ? {id:'', number:nextBudgetNumber(today()), lines:[], date:today(), ci:data.settings.defaultCI, dge:data.settings.defaultDGE, bi:data.settings.defaultBI, iva:data.settings.defaultIVA, status:'Esborrany'} : byId(data.budgets,id);
  if(!b) return alert('No s’ha trobat aquest pressupost.');
  state.editBudgetId = isNew ? '__new' : b.id;
  state.selectedBudgetId = isNew ? '' : b.id;
  openModal(`
    <h2>${isNew?'Nou pressupost':'Pressupost · '+esc(b.number||b.id)}</h2>
    <div class="notice-blue card-tight">${isNew?'El número es genera automàticament segons l’ordre dels pressupostos existents. Pots canviar-lo manualment si cal. Primer guarda la capçalera; després podràs afegir partides de la llibreria o crear-ne de noves.':'Pots editar la capçalera, revisar partides i obrir una previsualització A4 per imprimir o guardar en PDF.'}</div>
    <div class="actions" style="margin:0 0 12px">${!isNew?`<button class="ghost" type="button" data-preview-budget-modal="${esc(b.id)}">Vista preliminar A4 / PDF</button>`:''}</div>
    ${budgetFormCard(b,isNew)}
    ${!isNew ? budgetLinesCard(b) : ''}
  `);
  document.querySelectorAll('[data-preview-budget-modal]').forEach(btn=>btn.onclick=()=>openBudgetPreview(btn.dataset.previewBudgetModal));
}
function budgetLinesCard(b){
  return `<div class="card"><div class="toolbar"><h2>Partides del pressupost</h2><div class="right"><button class="ghost" id="selectAllBudgetLines">Seleccionar tot</button><button class="ghost" id="clearSelectedBudgetLines">Desmarcar</button><button class="danger" id="deleteSelectedBudgetLines">Eliminar línies seleccionades</button><button class="primary" id="addLineFromLibrary">Afegir de llibreria</button><button class="ghost" id="addManualLine">Afegir partida nova</button></div></div>
    <div class="table-wrap budget-lines"><table><thead><tr><th>Sel.</th><th>Codi</th><th>Ut</th><th class="concept-col">Concepte / descripció</th><th>Quantitat</th><th>Preu/ut</th><th>Total</th><th>Estat</th><th></th></tr></thead><tbody>${(b.lines||[]).map(l=>`
      <tr><td><input type="checkbox" class="select-budget-line" value="${esc(l.id)}"></td><td><input data-line-field="code" data-line-id="${esc(l.id)}" value="${esc(l.code||'')}"></td><td><input data-line-field="unit" data-line-id="${esc(l.id)}" value="${esc(l.unit||'')}"></td><td class="concept-cell"><textarea data-line-field="concept" data-line-id="${esc(l.id)}" class="line-concept">${esc(l.concept||'')}</textarea>${l.longDesc?`<div class="long muted">${esc(l.longDesc||'')}</div>`:''}</td><td><input class="num" data-line-field="qty" data-line-id="${esc(l.id)}" type="number" step="0.0001" value="${esc(l.qty||'')}"></td><td><input class="num" data-line-field="unitPrice" data-line-id="${esc(l.id)}" type="number" step="0.01" value="${esc(l.unitPrice||'')}"></td><td class="num"><strong>${money(lineTotal(l))}</strong></td><td>${statusPill(l.status||'')}</td><td><button class="danger small" data-delete-line="${esc(l.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>
    <div class="budget-total"><div>Base: <strong>${money(budgetBase(b))}</strong></div><div>IVA: <strong>${money(budgetIVA(b))}</strong></div><div>Total: <strong>${money(budgetTotal(b))}</strong></div></div>
    ${budgetLineSum(b)===0 && num(b.importedBase)>0 ? `<div class="small-text" style="text-align:right;margin-top:6px">Base presa del total detectat a l’Excel original; les línies separades per * queden pendents de preu/amidament.</div>` : ''}
  </div>`;
}
function openAddLineFromLibrary(){
  const b=byId(data.budgets,state.selectedBudgetId); if(!b) return;
  const html=`<h2>Afegir partida de llibreria</h2><div class="toolbar"><input id="addLibSearch" placeholder="Cercar partida, capítol, codi..." style="max-width:620px"></div><div id="addLibResults">${addLibResultsHtml(data.library.slice(0,120), b)}</div>`;
  openModal(html);
  document.getElementById('addLibSearch').oninput=e=>{ const q=strip(e.target.value); const rows=data.library.filter(x=>strip([x.code,x.chapter,x.unit,x.concept,x.longDesc].join(' ')).includes(q)).slice(0,180); document.getElementById('addLibResults').innerHTML=addLibResultsHtml(rows,b); bindAddLibButtons(b); };
  bindAddLibButtons(b);
}
function addLibResultsHtml(rows,b){
  rows=sortByLibraryField(rows);
  if(!rows.length) return empty('No hi ha partides que coincideixin amb la cerca.');
  const grouped={}; rows.forEach(x=>{ const ch=x.chapter||'Sense capítol'; (grouped[ch] ||= []).push(x); });
  return Object.keys(grouped).sort((a,b)=>a.localeCompare(b,'ca',{numeric:true})).map(ch=>`
    <details class="chapter-group" open><summary><strong>${esc(ch)}</strong><span>${grouped[ch].length} partida/es</span></summary>
    <div class="table-wrap"><table><thead><tr><th>Codi</th><th>Ut</th><th class="concept-col">Concepte</th><th>PU segons pressupost</th><th>Estat</th><th>Acció</th></tr></thead><tbody>${grouped[ch].map(x=>`<tr><td>${esc(x.code||'')}</td><td>${esc(x.unit||'')}</td><td><strong>${esc(x.concept||'')}</strong><div class="long muted">${esc(x.longDesc||'')}</div></td><td class="num">${money(x.unitPrice || libFinal(x,b))}</td><td>${statusPill(x.status||'')}</td><td><button class="primary small" data-add-lib-to-budget="${esc(x.id)}">Afegir</button></td></tr>`).join('')}</tbody></table></div></details>`).join('');
}

const __teimorBaseBindViewEvents_V092 = bindViewEvents;
bindViewEvents = function(){
  __teimorBaseBindViewEvents_V092();
  document.querySelectorAll('[data-sort-kind][data-sort-key]').forEach(btn=>{
    btn.onclick=()=>{
      const kind=btn.dataset.sortKind, key=btn.dataset.sortKey;
      const f=`${kind}SortField`, d=`${kind}SortDir`;
      if(state[f]===key) state[d] = state[d]==='asc' ? 'desc' : 'asc';
      else { state[f]=key; state[d]=(key==='date'||key==='base'||key==='total'||key==='year'||key==='lines')?'desc':'asc'; }
      if(kind==='budget') filterBudgets();
      else if(kind==='client') filterClients();
      else if(kind==='library') renderLibrary();
    };
  });
};
const __teimorBaseBindModalEvents_V092 = bindModalEvents;
bindModalEvents = function(){
  __teimorBaseBindModalEvents_V092();
  const dateInput=document.getElementById('budgetDateInput');
  const numberInput=document.getElementById('budgetNumberInput');
  if(dateInput && numberInput && numberInput.dataset.autoNumber==='1'){
    numberInput.addEventListener('input',()=>{ numberInput.dataset.autoNumber='0'; });
    dateInput.addEventListener('change',()=>{ if(numberInput.dataset.autoNumber==='1') numberInput.value=nextBudgetNumber(dateInput.value); });
  }
};

/* =========================
   V09.3 overrides: rendiment clicable, any actiu, agenda i edició de capítols
   ========================= */
(function(){
  data.meta = data.meta || {};
  data.meta.version = '9.3.0-rendiment-agenda';
  data.agenda = Array.isArray(data.agenda) ? data.agenda : [];
  data.jobs = Array.isArray(data.jobs) ? data.jobs : [];
  data.budgets = Array.isArray(data.budgets) ? data.budgets : [];
  data.library = Array.isArray(data.library) ? data.library : [];
  state.agendaMonth = state.agendaMonth || today().slice(0,7);
})();

function render(){
  document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active', b.dataset.view===state.view));
  const views={dashboard:renderDashboard,clients:renderClients,library:renderLibrary,budgets:renderBudgets,invoices:renderInvoices,performance:renderPerformance,agenda:renderAgenda,attachments:renderAttachments,importer:renderImporter,backup:renderBackup,settings:renderSettings};
  (views[state.view]||renderDashboard)();
}

function availableBudgetYears(){
  return [...new Set(data.budgets.map(b=>budgetYear(b)).filter(Boolean))].sort((a,b)=>b-a);
}
function activeYear(kind='budget'){
  const years=availableBudgetYears();
  const key=kind==='performance'?'performanceYearFilter':'budgetYearFilter';
  if(state[key] === 'all') return 'all';
  if(state[key] && years.includes(Number(state[key]))) return Number(state[key]);
  return years[0] || new Date().getFullYear();
}
function yearSelectorHtml(current, target='budget'){
  const years=availableBudgetYears();
  if(!years.length) return '';
  return `<div class="year-strip"><span>Any actiu:</span>${years.map(y=>`<button class="year-chip ${String(current)===String(y)?'active':''}" data-year-target="${esc(target)}" data-year="${y}">${y}</button>`).join('')}<button class="year-chip ${current==='all'?'active':''}" data-year-target="${esc(target)}" data-year="all">Tots</button></div>`;
}
function bindYearSelectors(){
  document.querySelectorAll('[data-year-target][data-year]').forEach(btn=>btn.onclick=()=>{
    const target=btn.dataset.yearTarget;
    const value=btn.dataset.year;
    if(target==='performance') { state.performanceYearFilter=value; renderPerformance(); }
    else { state.budgetYearFilter=value; renderBudgets(); }
  });
}

function budgetRowsFiltered(){
  const q=strip(document.getElementById('budgetSearch')?.value ?? state.budgetSearch ?? '');
  const yearState=state.budgetYearFilter ?? activeYear('budget');
  const status=strip(document.getElementById('budgetStatusFilter')?.value ?? state.budgetStatusFilter ?? '');
  const client=document.getElementById('budgetClientFilter')?.value ?? state.budgetClientFilter ?? '';
  const rows=data.budgets.filter(b=>{
    const j=byId(data.jobs,b.jobId);
    const c=byId(data.clients,b.clientId);
    const blob=[b.id,b.number,b.date,b.title,b.status,b.source,b.notes,c?.name,c?.nif,c?.phone,c?.email,j?.title,j?.address,j?.city,budgetYear(b)].join(' ');
    const yearOk = !yearState || yearState==='all' || String(budgetYear(b))===String(yearState);
    return (!q || strip(blob).includes(q)) && yearOk && (!status || strip(b.status)===status) && (!client || b.clientId===client);
  });
  return sortByBudgetField(rows);
}

function renderBudgets(editId=''){
  setHeader('Pressupostos','Llistat complet agrupable per any. Clica les capçaleres per ordenar en sentit ascendent o descendent.');
  if(editId) { state.editBudgetId=editId; state.selectedBudgetId=editId === '__new' ? '' : editId; }
  const currentYear=activeYear('budget');
  const statuses=[...new Set(data.budgets.map(b=>b.status).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const rows=budgetRowsFiltered();
  setContent(`
    <div class="grid four">
      <div class="kpi"><span>Pressupostos</span><strong>${rows.length}</strong></div>
      <div class="kpi"><span>Total s/IVA any actiu</span><strong>${money(rows.reduce((s,b)=>s+budgetBase(b),0))}</strong></div>
      <div class="kpi"><span>Acceptats / fets</span><strong>${rows.filter(b=>strip(b.status).includes('acceptat')||strip(b.status).includes('fet')).length}</strong></div>
      <div class="kpi"><span>Rebutjats / anul·lats</span><strong>${rows.filter(b=>strip(b.status).includes('rebutjat')||strip(b.status).includes('anul')).length}</strong></div>
    </div>
    <div class="card">
      <div class="toolbar"><h2>Pressupostos ${currentYear==='all'?'· tots els anys':'· '+esc(currentYear)}</h2><div class="right"><button class="ghost" id="selectAllBudgets">Seleccionar tot</button><button class="ghost" id="clearSelectedBudgets">Desmarcar</button><button class="danger" id="deleteSelectedBudgets">Eliminar seleccionats</button><button class="primary" id="newBudgetBtn">+ Nou pressupost</button><button class="ghost" id="exportBudgetCsv">Exportar CSV del seleccionat</button></div></div>
      ${yearSelectorHtml(currentYear,'budget')}
      <div class="filter-grid compact-filters">
        <label>Cerca<input id="budgetSearch" placeholder="Client, obra, núm., adreça, any..." value="${esc(state.budgetSearch||'')}"></label>
        <label>Client<select id="budgetClientFilter"><option value="">Tots</option>${options(data.clients,state.budgetClientFilter||'')}</select></label>
        <label>Estat<select id="budgetStatusFilter"><option value="">Tots</option>${statuses.map(x=>`<option ${strip(x)===strip(state.budgetStatusFilter||'')?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      </div>
      <div class="sort-help small-text">Ordre actual: <strong>${esc(state.budgetSortField||'data')}</strong> ${esc(state.budgetSortDir==='asc'?'ascendent':'descendent')} · prem una capçalera per canviar.</div>
      <div id="budgetFilterInfo" class="small-text" style="margin:10px 0">Mostrant ${rows.length} de ${data.budgets.length} pressupostos.</div>
      <div id="budgetsTable">${currentYear==='all' ? budgetsGroupedByYear(rows) : budgetsTable(rows)}</div>
    </div>
  `);
}
function budgetsGroupedByYear(rows){
  const grouped={}; rows.forEach(b=>{ const y=budgetYear(b)||'Sense any'; (grouped[y] ||= []).push(b); });
  return Object.keys(grouped).sort((a,b)=>compareMixed(a,b,'desc')).map(y=>`<details class="chapter-group" open><summary><strong>Any ${esc(y)}</strong><span>${grouped[y].length} pressupost/os</span></summary>${budgetsTable(grouped[y])}</details>`).join('') || empty();
}

function renderPerformance(){
  setHeader('Rendiment','Rendiment per pressupost/obra, agrupable per any i clicable per obrir directament la fitxa del pressupost.');
  const currentYear=activeYear('performance');
  const rows=sortByBudgetField(data.budgets.filter(b=> currentYear==='all' || String(budgetYear(b))===String(currentYear)));
  const rowData=rows.map(b=>{
    const inv=data.invoices.filter(i=>i.budgetId===b.id || (b.jobId && i.jobId===b.jobId));
    const fact=inv.reduce((s,i)=>s+invoiceTotal(i),0);
    const base=budgetBase(b);
    return {b,base,fact,margin:base-fact, invoices:inv.length};
  });
  const max=Math.max(1,...rowData.map(r=>r.base));
  setContent(`
    <div class="grid four">
      <div class="kpi"><span>Pressupostat base</span><strong>${money(rowData.reduce((s,r)=>s+r.base,0))}</strong></div>
      <div class="kpi"><span>Facturat IVA incl.</span><strong>${money(rowData.reduce((s,r)=>s+r.fact,0))}</strong></div>
      <div class="kpi ${rowData.reduce((s,r)=>s+r.margin,0)>=0?'good':'warn'}"><span>Diferència</span><strong>${money(rowData.reduce((s,r)=>s+r.margin,0))}</strong></div>
      <div class="kpi"><span>Pressupostos any actiu</span><strong>${rowData.length}</strong></div>
    </div>
    <div class="card"><div class="toolbar"><h2>Rendiment ${currentYear==='all'?'· tots els anys':'· '+esc(currentYear)}</h2><div class="right"><button class="ghost" data-go="budgets">Anar a pressupostos</button></div></div>${yearSelectorHtml(currentYear,'performance')}
      <div class="chart">${rowData.slice(0,16).map(r=>`<div class="chart-bar" title="${esc(budgetName(r.b.id))}" style="height:${Math.max(4,(r.base/max)*100)}%"><span>${money(r.base)}</span></div>`).join('')}</div>
      <div class="chart-labels">${rowData.slice(0,16).map(r=>`<span>${esc((r.b.number||'')+' · '+clientName(r.b.clientId)).slice(0,32)}</span>`).join('')}</div>
    </div>
    <div class="card"><h2>Rendiment per pressupost / obra</h2>${performanceTable(rowData)}</div>
  `);
}
function performanceTable(rowData){
  if(!rowData.length) return empty('No hi ha pressupostos per aquest any.');
  const rows=rowData.map(r=>{
    const b=r.b; const j=byId(data.jobs,b.jobId)||{}; const m=r.margin; const p=r.base?m/r.base*100:0;
    return `<tr class="clickable-row" data-open-budget="${esc(b.id)}"><td>${esc(budgetYear(b)||'')}</td><td>${dateDisplay(b.date)}</td><td><strong>${esc(b.number||'')}</strong></td><td>${esc(clientName(b.clientId))}</td><td><strong>${esc(b.title||j.title||'')}</strong>${j.address?`<br><span class="muted">${esc(j.address)}</span>`:''}</td><td>${statusPill(b.status||'')}</td><td class="num">${money(r.base)}</td><td class="num">${money(r.fact)}</td><td class="num ${m>=0?'status-ok':'status-bad'}">${money(m)}</td><td class="num">${p.toFixed(1)}%</td><td><button class="ghost small" data-edit-budget="${esc(b.id)}" data-no-row-open>Obrir</button></td></tr>`;
  });
  return `<div class="table-wrap"><table><thead><tr><th>Any</th><th>Data</th><th>Núm.</th><th>Client</th><th>Obra / concepte</th><th>Estat</th><th>Pressupostat base</th><th>Factures</th><th>Diferència</th><th>%</th><th>Acció</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

function renderLibrary(){
  setHeader('Llibreria de partides','Partides agrupades per capítol. Pots filtrar, ordenar, editar capítols i obrir cada partida.');
  const q=state.libSearch || '';
  const filter=strip(q);
  const chapters=[...new Set(data.library.map(x=>x.chapter||'Sense capítol').filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const chapter=state.libChapterFilter || '';
  const statusFilter=strip(state.libStatusFilter || '');
  let rows=data.library.filter(x=>{
    const chapterOk=!chapter || (x.chapter||'Sense capítol')===chapter;
    const statusOk=!statusFilter || strip(x.status||'').includes(statusFilter);
    const searchOk=!filter || strip([x.code,x.chapter,x.unit,x.concept,x.longDesc,x.status,x.origin].join(' ')).includes(filter);
    return chapterOk && statusOk && searchOk;
  });
  rows=sortByLibraryField(rows);
  setContent(`
    <div class="card">
      <div class="toolbar"><h2>Llibreria per capítols</h2><div class="right"><button class="ghost" id="selectAllLibrary">Seleccionar tot</button><button class="ghost" id="clearSelectedLibrary">Desmarcar</button><button class="danger" id="deleteSelectedLibrary">Eliminar seleccionades</button><button class="ghost" id="exportLibraryJson">Exportar llibreria</button><label class="ghost file-label">Importar llibreria<input id="importLibraryJson" type="file" accept="application/json" hidden></label><button class="primary" id="newLibItem">Nova partida</button></div></div>
      <div class="filter-grid">
        <label>Cerca<input id="libSearch" placeholder="Cercar partida, codi, origen..." value="${esc(q)}"></label>
        <label>Capítol<select id="libChapterFilter"><option value="">Tots els capítols</option>${chapters.map(c=>`<option value="${esc(c)}" ${c===chapter?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
        <label>Estat<select id="libStatusFilter"><option value="">Tots</option>${['Validada','Validada pendent revisió','Importada pendent de revisar','Històrica sense amidament','PA pendent amidament','Duplicada possible'].map(s=>`<option ${strip(s)===statusFilter?'selected':''}>${esc(s)}</option>`).join('')}</select></label>
        <label>Resultats<input readonly value="${rows.length} de ${data.library.length}"></label>
      </div>
      <div class="sort-bar small-text">Ordenar llibreria: ${sortableInline('Codi','library','code')} ${sortableInline('Capítol','library','chapter')} ${sortableInline('Concepte','library','concept')} ${sortableInline('PU','library','pu')} ${sortableInline('Estat','library','status')}</div>
      <div id="libraryTable">${libraryGroupedTable(rows)}</div>
    </div>
  `);
}
function libraryGroupedTable(rows){
  if(!rows.length) return empty();
  const grouped={};
  for(const item of rows){ const ch=item.chapter||'Sense capítol'; (grouped[ch] ||= []).push(item); }
  return Object.keys(grouped).sort((a,b)=>a.localeCompare(b,'ca',{numeric:true})).map(ch=>`
    <details class="chapter-group" open>
      <summary><strong>${esc(ch)}</strong><span>${grouped[ch].length} partida/es</span><button class="ghost mini" data-rename-chapter="${esc(ch)}" type="button">Editar capítol</button></summary>
      ${libraryTable(grouped[ch])}
    </details>`).join('');
}
function openRenameChapterModal(oldChapter){
  openModal(`<h2>Editar nom de capítol</h2><div class="card"><form id="renameChapterForm" class="form-grid"><input type="hidden" name="oldChapter" value="${esc(oldChapter)}"><label class="full">Nom actual<input readonly value="${esc(oldChapter)}"></label><label class="full">Nou nom<input name="newChapter" required value="${esc(oldChapter)}"></label><div class="actions full"><button class="primary">Guardar canvi</button></div></form><p class="small-text">El canvi s’aplicarà a totes les partides de la llibreria i també a les línies de pressupostos que tinguin exactament aquest capítol.</p></div>`);
}
function saveRenameChapter(e){
  e.preventDefault();
  const f=formObj(e.target); const old=f.oldChapter||'Sense capítol'; const neu=cleanText(f.newChapter)||'Sense capítol';
  data.library.forEach(x=>{ if((x.chapter||'Sense capítol')===old) x.chapter=neu; });
  data.budgets.forEach(b=>(b.lines||[]).forEach(l=>{ if((l.chapter||'Sense capítol')===old) l.chapter=neu; }));
  saveData(); closeModal(); renderLibrary();
}

function budgetLinesCard(b){
  return `<div class="card"><div class="toolbar"><h2>Partides del pressupost</h2><div class="right"><button class="ghost" id="selectAllBudgetLines">Seleccionar tot</button><button class="ghost" id="clearSelectedBudgetLines">Desmarcar</button><button class="danger" id="deleteSelectedBudgetLines">Eliminar línies seleccionades</button><button class="primary" id="addLineFromLibrary">Afegir de llibreria</button><button class="ghost" id="addManualLine">Afegir partida nova</button></div></div>
    <div class="table-wrap budget-lines"><table><thead><tr><th>Sel.</th><th>Codi</th><th>Capítol</th><th>Ut</th><th class="concept-col">Concepte / descripció</th><th>Quantitat</th><th>Preu/ut</th><th>Total</th><th>Estat</th><th></th></tr></thead><tbody>${(b.lines||[]).map(l=>`
      <tr><td><input type="checkbox" class="select-budget-line" value="${esc(l.id)}"></td><td><input data-line-field="code" data-line-id="${esc(l.id)}" value="${esc(l.code||'')}"></td><td><input data-line-field="chapter" data-line-id="${esc(l.id)}" value="${esc(l.chapter||'')}"></td><td><input data-line-field="unit" data-line-id="${esc(l.id)}" value="${esc(l.unit||'')}"></td><td class="concept-cell"><textarea data-line-field="concept" data-line-id="${esc(l.id)}" class="line-concept">${esc(l.concept||'')}</textarea>${l.longDesc?`<div class="long muted">${esc(l.longDesc||'')}</div>`:''}</td><td><input class="num" data-line-field="qty" data-line-id="${esc(l.id)}" type="number" step="0.0001" value="${esc(l.qty||'')}"></td><td><input class="num" data-line-field="unitPrice" data-line-id="${esc(l.id)}" type="number" step="0.01" value="${esc(l.unitPrice||'')}"></td><td class="num"><strong>${money(lineTotal(l))}</strong></td><td>${statusPill(l.status||'')}</td><td><button class="danger small" data-delete-line="${esc(l.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>
    <div class="budget-total"><div>Base: <strong>${money(budgetBase(b))}</strong></div><div>IVA: <strong>${money(budgetIVA(b))}</strong></div><div>Total: <strong>${money(budgetTotal(b))}</strong></div></div>
    ${budgetLineSum(b)===0 && num(b.importedBase)>0 ? `<div class="small-text" style="text-align:right;margin-top:6px">Base presa del total detectat a l’Excel original; les línies separades per * queden pendents de preu/amidament.</div>` : ''}
  </div>`;
}

function monthLabel(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Date(y,m-1,1).toLocaleDateString('ca-ES',{month:'long',year:'numeric'});
}
function shiftMonth(ym,delta){
  const [y,m]=ym.split('-').map(Number); const d=new Date(y,m-1+delta,1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function agendaEventsForDate(date){ return (data.agenda||[]).filter(e=>e.date===date).sort((a,b)=>String(a.time||'').localeCompare(String(b.time||''))); }
function renderAgenda(){
  setHeader('Agenda','Calendari tipus Google Calendar per cites, notes i seguiments vinculats a client, obra o pressupost.');
  data.agenda = Array.isArray(data.agenda) ? data.agenda : [];
  const ym=state.agendaMonth || today().slice(0,7);
  const [y,m]=ym.split('-').map(Number);
  const first=new Date(y,m-1,1); const last=new Date(y,m,0).getDate();
  const offset=(first.getDay()+6)%7; // dilluns com a primer dia
  const cells=[];
  for(let i=0;i<offset;i++) cells.push('<div class="calendar-cell muted-bg"></div>');
  for(let d=1; d<=last; d++){
    const date=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const events=agendaEventsForDate(date);
    cells.push(`<div class="calendar-cell ${date===today()?'today':''}" data-new-agenda-date="${date}"><div class="day-num">${d}</div>${events.slice(0,3).map(ev=>`<button class="calendar-event" data-agenda-id="${esc(ev.id)}" data-no-day-open>${esc((ev.time?ev.time+' · ':'')+(ev.title||clientName(ev.clientId)||'Nota'))}</button>`).join('')}${events.length>3?`<div class="more-events">+${events.length-3} més</div>`:''}</div>`);
  }
  const upcoming=[...(data.agenda||[])].filter(e=>e.date>=today()).sort((a,b)=>String(a.date+a.time).localeCompare(String(b.date+b.time))).slice(0,12);
  setContent(`
    <div class="grid two agenda-layout">
      <div class="card"><div class="toolbar"><h2>${esc(monthLabel(ym))}</h2><div class="right"><button class="ghost" id="agendaPrev">‹ Mes anterior</button><button class="ghost" id="agendaToday">Avui</button><button class="ghost" id="agendaNext">Mes següent ›</button><button class="primary" id="newAgendaEvent">+ Nova cita / nota</button></div></div>
        <div class="calendar-weekdays"><span>Dl</span><span>Dt</span><span>Dc</span><span>Dj</span><span>Dv</span><span>Ds</span><span>Dg</span></div>
        <div class="calendar-grid">${cells.join('')}</div>
      </div>
      <div class="card"><h2>Properes cites i notes</h2>${agendaList(upcoming)}</div>
    </div>
  `);
}
function agendaList(rows){
  if(!rows.length) return empty('No hi ha cites pendents.');
  return `<div class="agenda-list">${rows.map(e=>`<div class="agenda-item"><div><strong>${dateDisplay(e.date)} ${esc(e.time||'')}</strong><br><span>${esc(e.title||'Nota')}</span><br><span class="muted">${esc(clientName(e.clientId))}${e.budgetId?' · '+esc(budgetName(e.budgetId)):''}${e.jobId?' · '+esc(jobName(e.jobId)):''}</span></div><div class="actions"><button class="ghost small" data-agenda-id="${esc(e.id)}">Editar</button><button class="danger small" data-delete-agenda="${esc(e.id)}">Eliminar</button></div></div>`).join('')}</div>`;
}
function openAgendaModal(id='', presetDate=''){
  const isNew=!id; const e=isNew ? {id:'', date:presetDate||today(), time:'09:00', type:'Cita', status:'Pendent'} : (data.agenda||[]).find(x=>x.id===id);
  if(!e) return alert('No s’ha trobat aquesta cita.');
  openModal(`<h2>${isNew?'Nova cita / nota':'Editar cita / nota'}</h2><div class="card"><form id="agendaForm" class="form-grid agenda-form"><input type="hidden" name="id" value="${esc(e.id||uid('AG'))}"><input type="hidden" name="editId" value="${esc(e.id||'')}">
    <label>Data<input name="date" type="date" required value="${esc(e.date||today())}"></label><label>Hora<input name="time" type="time" value="${esc(e.time||'')}"></label>
    <label>Tipus<select name="type">${['Cita obra','Trucada','Visita','Recordatori','Nota','Entrega pressupost','Seguiment factura'].map(x=>`<option ${x===(e.type||'')?'selected':''}>${x}</option>`).join('')}</select></label>
    <label>Estat<select name="status">${['Pendent','Fet','Ajornat','Cancel·lat'].map(x=>`<option ${x===(e.status||'')?'selected':''}>${x}</option>`).join('')}</select></label>
    <label class="wide">Client<select name="clientId"><option value="">Sense client</option>${options(data.clients,e.clientId||'')}</select></label>
    <label class="wide">Pressupost / obra activa<select name="budgetId"><option value="">Sense pressupost</option>${options(data.budgets,e.budgetId||'',x=>`${x.number||''} · ${clientName(x.clientId)} · ${x.title||''}`)}</select></label>
    <label class="wide">Feina existent<select name="jobId"><option value="">Sense feina</option>${options(data.jobs,e.jobId||'',x=>`${x.year} · ${clientName(x.clientId)} · ${x.title}`)}</select></label>
    <label class="wide">Crear obra nova si cal<input name="newJobTitle" placeholder="Nom de nova obra / feina"></label>
    <label class="full">Títol / nota curta<input name="title" required value="${esc(e.title||'')}"></label>
    <label class="full">Notes<textarea name="notes">${esc(e.notes||'')}</textarea></label>
    <div class="actions full"><button class="primary">Guardar</button></div></form></div>`);
}
function saveAgendaEvent(e){
  e.preventDefault(); const f=formObj(e.target);
  let jobId=f.jobId||'';
  if(!jobId && f.newJobTitle && f.clientId){
    const year=Number((parseDateValue(f.date)||today()).slice(0,4));
    const j={id:uid('F'),year,clientId:f.clientId,title:cleanText(f.newJobTitle),address:byId(data.clients,f.clientId)?.workAddress||'',city:byId(data.clients,f.clientId)?.city||'',status:'Activa',notes:'Creada des de l’agenda.'};
    data.jobs.push(j); jobId=j.id;
  }
  if(!f.clientId && f.budgetId) f.clientId=byId(data.budgets,f.budgetId)?.clientId||'';
  const ev={id:f.id, date:parseDateValue(f.date)||f.date, time:f.time, type:f.type, status:f.status, clientId:f.clientId, budgetId:f.budgetId, jobId, title:f.title, notes:f.notes};
  const idx=data.agenda.findIndex(x=>x.id===f.editId || x.id===ev.id);
  if(idx>=0) data.agenda[idx]=ev; else data.agenda.push(ev);
  saveData(); closeModal(); renderAgenda();
}
function deleteAgendaEvent(id){
  if(!confirm('Eliminar aquesta cita/nota?')) return;
  data.agenda=data.agenda.filter(x=>x.id!==id); saveData(); renderAgenda();
}

const __teimorBaseBindViewEvents_V093 = bindViewEvents;
bindViewEvents = function(){
  __teimorBaseBindViewEvents_V093();
  bindYearSelectors();
  document.querySelectorAll('[data-open-budget]').forEach(row=>{
    row.onclick=e=>{ if(e.target.closest('[data-no-row-open],button,input,select,textarea,a')) return; openBudgetModal(row.dataset.openBudget); };
  });
  document.querySelectorAll('[data-rename-chapter]').forEach(btn=>btn.onclick=e=>{ e.preventDefault(); e.stopPropagation(); openRenameChapterModal(btn.dataset.renameChapter); });
  const agendaPrev=document.getElementById('agendaPrev'); if(agendaPrev) agendaPrev.onclick=()=>{ state.agendaMonth=shiftMonth(state.agendaMonth||today().slice(0,7),-1); renderAgenda(); };
  const agendaNext=document.getElementById('agendaNext'); if(agendaNext) agendaNext.onclick=()=>{ state.agendaMonth=shiftMonth(state.agendaMonth||today().slice(0,7),1); renderAgenda(); };
  const agendaToday=document.getElementById('agendaToday'); if(agendaToday) agendaToday.onclick=()=>{ state.agendaMonth=today().slice(0,7); renderAgenda(); };
  const newAgendaEvent=document.getElementById('newAgendaEvent'); if(newAgendaEvent) newAgendaEvent.onclick=()=>openAgendaModal('', today());
  document.querySelectorAll('[data-agenda-id]').forEach(btn=>btn.onclick=e=>{ e.preventDefault(); e.stopPropagation(); openAgendaModal(btn.dataset.agendaId); });
  document.querySelectorAll('[data-delete-agenda]').forEach(btn=>btn.onclick=()=>deleteAgendaEvent(btn.dataset.deleteAgenda));
  document.querySelectorAll('[data-new-agenda-date]').forEach(cell=>cell.onclick=e=>{ if(e.target.closest('[data-no-day-open],button')) return; openAgendaModal('', cell.dataset.newAgendaDate); });
};

const __teimorBaseBindModalEvents_V093 = bindModalEvents;
bindModalEvents = function(){
  __teimorBaseBindModalEvents_V093();
  const renameForm=document.getElementById('renameChapterForm'); if(renameForm) renameForm.onsubmit=saveRenameChapter;
  const agendaForm=document.getElementById('agendaForm'); if(agendaForm) agendaForm.onsubmit=saveAgendaEvent;
};


/* =========================
   TEIMOR V09.4 · DEPURADOR INTEL·LIGENT DE LLIBRERIA
   Agrupa partides importades per paraules clau/família i conserva una partida tipus.
   ========================= */
(function(){
  if(data && data.meta){ data.meta.version = '9.4.0-depurador-llibreria'; saveData?.(); }
})();

function normalizeForGrouping(text){
  return strip(text || '')
    .replace(/€/g,' eur ')
    .replace(/[ºª]/g,' ')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\b(de|del|la|las|los|el|els|les|i|y|amb|con|para|per|en|al|a|un|una|dels|dela|m2|m²|ml|ut|uds|ud)\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function libraryItemText(item){ return [item.code,item.chapter,item.unit,item.concept,item.longDesc,item.origin].filter(Boolean).join(' '); }
function isProbablyNotPartida(item){
  const c=strip(item.concept || item.longDesc || '');
  if(!c) return true;
  if(c.length < 3) return true;
  const bad=[
    /^(data|fecha|pressupost|presupuesto|client|cliente|nif|dni|cif|telefono|telèfon|email|correu|base imposable|iva|total|subtotal)$/,
    /(materials?\s+i\s+m\.?o\.?|materiales?\s+y\s+m\.?o\.?).*(unitat|unidad)?\s*=/,
    /\d+[\.,]?\d*\s*(m|m2|m²|ml|ut)?\s*x\s*\d+[\.,]?\d*\s*€?\s*=/,
    /^(carrer|calle|avda|avinguda|avenida|plaça|plaza|passeig|passatge|carretera)\b/,
    /^(cp|c\.p\.|codi postal)\b/,
    /^\d{5}\s+[a-z]/,
    /^\d+[\.,]?\d*\s*€?$/
  ];
  return bad.some(rx=>rx.test(c));
}
function unitBucket(unit){
  const u=strip(unit||'');
  if(/m2|m²|metre quadrat|metro cuadrado/.test(u)) return 'm2';
  if(/ml|m lineal|metre lineal|metro lineal/.test(u)) return 'ml';
  if(/ut|ud|unitat|unidad/.test(u)) return 'ut';
  if(/kg/.test(u)) return 'kg';
  if(/h|hora/.test(u)) return 'h';
  if(/pa|partida alçada|partida alzada/.test(u)) return 'pa';
  return u || 'sense-ut';
}
function detectSubtype(text, family){
  const t=normalizeForGrouping(text);
  const parts=[];
  if(family==='lamines-asfaltiques'){
    const kg=(t.match(/\b([345])\s*kg\b/)||t.match(/\blbm\s*([345]0)\b/)||[])[1];
    if(kg) parts.push(String(kg).length===2 ? String(Number(kg)/10)+'kg' : kg+'kg');
    if(/doble|dues capes|dos capes|2 capes|bicapa/.test(t)) parts.push('doble');
    if(/autoproteg|mineral|pissarra|alumini/.test(t)) parts.push('autoprotegida');
    if(/sbs/.test(t)) parts.push('sbs');
    if(/app/.test(t)) parts.push('app');
  }
  if(family==='geotextil'){
    const gr=(t.match(/\b(100|125|150|180|200|250|300|500)\s*(gr|g)\b/)||[])[1];
    if(gr) parts.push(gr+'g');
  }
  if(family==='pintura'){
    if(/fa[cç]ana|exterior/.test(t)) parts.push('facana');
    if(/interior|escala|garatge|parking|aparcament/.test(t)) parts.push('interior-garatge');
    if(/barana|metall|ferro|reixa/.test(t)) parts.push('metall');
  }
  if(family==='reparacio-formigo'){
    if(/armadur|oxid|passiv|ferro/.test(t)) parts.push('armadures');
    if(/r3/.test(t)) parts.push('r3');
    if(/r4/.test(t)) parts.push('r4');
    if(/fissur|esquerda|grieta/.test(t)) parts.push('fissures');
  }
  if(family==='paviments-revestiments'){
    if(/gres|ceramic|rajol|baldosa|panot/.test(t)) parts.push('ceramic');
    if(/socol|rodapie/.test(t)) parts.push('socol');
    if(/terrassa|balco|balcon/.test(t)) parts.push('terrassa');
  }
  if(family==='baranes-inox'){
    if(/inox|aisi|316/.test(t)) parts.push('inox');
    if(/passama|pasamano/.test(t)) parts.push('passama');
  }
  if(family==='canalons-baixants'){
    if(/canalo|canalon/.test(t)) parts.push('canalo');
    if(/baixant|bajante/.test(t)) parts.push('baixant');
  }
  if(parts.length) return [...new Set(parts)].join('-');
  return '';
}
function classifyLibraryFamily(item){
  const text=libraryItemText(item);
  const t=normalizeForGrouping(text);
  if(isProbablyNotPartida(item)) return {chapter:'Descartades / no partides', family:'no-partida', label:'No partida evident', key:'trash:'+t.slice(0,40), trash:true};
  const rules=[
    ['Geotèxtil','geotextil',/\bgeot[eè]xtil\b|\bgeotextil\b/],
    ['Làmines asfàltiques','lamines-asfaltiques',/lamina|l[aà]mina|asfalt|asf[aà]ltic|bitumin|sbs|app|lbm|tela asfaltica|tela asf[aà]ltica/],
    ['Impermeabilització líquida','impermeabilitzacio-liquida',/poliureta|poliuret[aà]|resina|membrana liquida|sikalastic|mapelastic|cautxu|caucho|impermeabilitzant liquid|impermeabilizante liquido/],
    ['Imprimacions i ponts d’unió','imprimacions',/imprimaci|imprimacion|primer|pont d unio|puente de union|fixador|fijador/],
    ['Segellats i juntes','segellats-juntes',/segell|sellad|silicona|massilla|masilla|junta|poliuretano|poliuret[aà]|sikaflex/],
    ['Pintura i revestiments','pintura',/pintur|pintat|pintado|revestiment|revestimiento|jotashield|webertene|acrylic|acrilic|acrilico|esmalte/],
    ['Reparació de formigó','reparacio-formigo',/formigo|hormigon|armadur|oxid|passiv|monotop|weberrep|morter r3|morter r4|reparacio|reparacion|cantell|canto forjat|canto de forjado|despreniment|desconch/],
    ['Neteja i sanejat','neteja-sanejat',/neteja|limpieza|sanejat|saneado|repicat|picat|hidro|pressio|presion|decapat|raspat|rascado/],
    ['Morters i regularitzacions','morters',/morter|mortero|regularitz|regulariz|arreboss|enfosc|rebossat|remolinat|maestrejat|capa base|recreixement/],
    ['Paviments i revestiments','paviments-revestiments',/paviment|rajol|baldosa|gres|ceramic|cer[aà]mic|enrajolat|alicatat|alicatado|socol|zocalo|rodapie|gresite|panot/],
    ['Bastides i mitjans auxiliars','bastides',/bastida|andami|plataforma|elevadora|pem|mitjans auxiliars|medios auxiliares/],
    ['Treballs verticals','treballs-verticals',/treball vertical|trabajo vertical|corda|cuerda|rapel|rappel|arnes|arn[eé]s/],
    ['Residus, contenidors i transport','residus-transport',/residu|run[aà]|runa|contenidor|container|transport|abocador|vertedero|sac|big bag|retirada/],
    ['Canalons i baixants','canalons-baixants',/canal[oó]|canalon|baixant|bajante|pluvial|desgu[aà]s|desague|g[uü]atera|canaleta/],
    ['Baranes i inox','baranes-inox',/barana|barandilla|passama|pasamano|inox|acer inoxidable|acero inoxidable|aisi|316/],
    ['Enderrocs i desmuntatges','enderrocs',/enderroc|derribo|demolicio|demolicion|desmuntatge|desmontaje|arrencada|arranque|retirar|desmuntar/],
    ['Aïllaments','aillaments',/aillament|aislamiento|xps|eps|llana mineral|lana mineral|poliestire|poliestireno|rockwool/],
    ['Cobertes i teules','cobertes',/coberta|cubierta|teula|teja|carener|cumbrera|lluerna|claraboia/],
    ['Drenatges','drenatges',/dren|drenatge|drenaje|tub dren|grava|geodren/],
    ['Formigons i soleres','formigons-soleres',/solera|formigonat|hormigonado|ha 25|ha25|ha 30|ha30|mallazo|malla electrosoldada|armat/],
    ['Paleteria','paleteria',/paleta|ma[oó]|ladrillo|gero|totxana|tabic|env[aà]|pared|paret|muret|bloc formigo|bloque hormigon/],
    ['Fusteria, portes i tancaments','fusteria-tancaments',/porta|puerta|finestra|ventana|fusteria|carpinteria|alumini|aluminio|persiana|reixa|valla/],
    ['Instal·lacions','instal-lacions',/instal lac|instalacion|electric|fontaner|lampist|aigua|agua|desgu[aà]s|clima|aire condicionat|calefacc/],
    ['Seguretat i salut','seguretat-salut',/seguretat|seguridad|salut|salud|epis|proteccions|protecciones/],
    ['Neteja final','neteja-final',/neteja final|limpieza final|entrega obra|final obra/]
  ];
  for(const [chapter,family,rx] of rules){
    if(rx.test(t)){
      const sub=detectSubtype(text,family);
      return {chapter,family,label:chapter, subtype:sub, key:`${family}:${sub||'general'}:${unitBucket(item.unit)}`};
    }
  }
  // Agrupació genèrica per paraules fortes quan no entra a cap família.
  const tokens=t.split(' ').filter(w=>w.length>4 && !/^\d+$/.test(w)).slice(0,8);
  const keyTokens=[...new Set(tokens)].slice(0,4).join('-') || t.slice(0,30) || 'sense-text';
  const ch=cleanText(item.chapter||'Altres / revisar') || 'Altres / revisar';
  return {chapter:ch, family:'altres', label:ch, key:`altres:${strip(ch)}:${keyTokens}:${unitBucket(item.unit)}`};
}
function libraryRepresentativeScore(item){
  let score=0;
  if(num(item.unitPrice)>0) score+=45;
  if(num(item.directCost)>0) score+=15;
  if(Array.isArray(item.decomp) && item.decomp.length) score+=35;
  const st=strip(item.status||'');
  if(st.includes('valid')) score+=35;
  if(st.includes('pendent')) score-=5;
  if(st.includes('historic') || st.includes('històric')) score-=10;
  const conceptLen=cleanText(item.concept||'').length;
  const longLen=cleanText(item.longDesc||'').length;
  if(conceptLen>12 && conceptLen<180) score+=20;
  if(longLen>30) score+=10;
  if(isProbablyNotPartida(item)) score-=1000;
  return score;
}
function buildLibraryCleanupPlan(mode='strong'){
  const groups=new Map();
  const trash=[];
  for(const item of data.library||[]){
    const cls=classifyLibraryFamily(item);
    if(cls.trash){ trash.push({item,cls}); continue; }
    let key=cls.key;
    if(mode==='conservative') key = `${cls.family}:${cls.subtype||'general'}:${unitBucket(item.unit)}:${normalizeForGrouping(item.concept||'').slice(0,18)}`;
    if(!groups.has(key)) groups.set(key,{key, cls, items:[]});
    groups.get(key).items.push(item);
  }
  const rows=[...groups.values()].map(g=>{
    const sorted=[...g.items].sort((a,b)=>libraryRepresentativeScore(b)-libraryRepresentativeScore(a));
    const rep=sorted[0];
    return {...g, representative:rep, duplicates:sorted.slice(1)};
  }).sort((a,b)=>String(a.cls.chapter).localeCompare(String(b.cls.chapter),'ca',{numeric:true}) || b.items.length-a.items.length);
  const duplicates=rows.reduce((s,g)=>s+g.duplicates.length,0);
  return {mode, rows, trash, before:(data.library||[]).length, after:rows.length, duplicates, trashCount:trash.length};
}
function cleanupPlanSummaryHtml(plan){
  const preview=plan.rows.filter(g=>g.items.length>1).slice(0,90);
  return `
    <div class="grid four">
      <div class="kpi"><span>Partides actuals</span><strong>${plan.before}</strong></div>
      <div class="kpi good"><span>Partides tipus resultants</span><strong>${plan.after}</strong></div>
      <div class="kpi"><span>Duplicades agrupables</span><strong>${plan.duplicates}</strong></div>
      <div class="kpi ${plan.trashCount?'bad':'good'}"><span>No partides evidents</span><strong>${plan.trashCount}</strong></div>
    </div>
    <div class="card notice-blue"><strong>Criteri:</strong> l’app agrupa per paraules clau i unitat. Per exemple, geotèxtil queda dins Geotèxtil; làmina asfàltica, SBS, LBM, 3 kg, 4 kg, doble làmina o autoprotegida queden dins Làmines asfàltiques amb subtipus quan es detecta. Abans d’aplicar, exporta un JSON complet si vols una còpia externa.</div>
    ${preview.length?`<div class="table-wrap"><table><thead><tr><th>Capítol proposat</th><th>Grup</th><th>Es conserven</th><th>S’agrupen</th><th>Representant</th></tr></thead><tbody>${preview.map(g=>`<tr><td>${esc(g.cls.chapter)}</td><td>${esc((g.cls.subtype?g.cls.subtype+' · ':'')+g.key)}</td><td>1</td><td>${g.duplicates.length}</td><td><strong>${esc(g.representative.concept||'')}</strong><br><span class="muted">${esc(g.representative.unit||'')} · ${money(g.representative.unitPrice||libFinal(g.representative))}</span></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">No hi ha grups duplicats segons el criteri actual.</div>`}
    ${plan.trashCount?`<details class="chapter-group"><summary><strong>Textos que es descartarien com a no partides</strong><span>${plan.trashCount}</span></summary><div class="small-text">${plan.trash.slice(0,80).map(x=>esc(x.item.concept||x.item.longDesc||x.item.code||'')).join('<br>')}</div></details>`:''}
  `;
}
function openLibraryCleanupModal(){
  const plan=buildLibraryCleanupPlan('strong');
  openModal(`<h2>Depurar llibreria importada</h2>
    <div class="card">
      <p>Aquesta eina serveix després d’importar molts Excels: redueix la llibreria a partides tipus i evita tenir 20 o 30 variants repetides del mateix concepte.</p>
      <div class="form-grid">
        <label>Mode de depuració<select id="cleanupMode"><option value="strong" selected>Fort recomanat · base 50-100 partides</option><option value="conservative">Conservador · separa més variants</option></select></label>
        <label>Resultat estimat<input id="cleanupEstimate" readonly value="${plan.before} → ${plan.after} partides tipus"></label>
      </div>
      <div id="cleanupPreview">${cleanupPlanSummaryHtml(plan)}</div>
      <div class="actions"><button class="primary" id="applyLibraryCleanup">Aplicar depuració i conservar representants</button><button class="ghost" id="refreshCleanupPreview">Recalcular previsualització</button>${(data.libraryCleanupBackups||[]).length?'<button class="ghost" id="restoreLibraryCleanup">Restaurar última depuració</button>':''}</div>
    </div>`);
}
function refreshCleanupPreview(){
  const mode=document.getElementById('cleanupMode')?.value || 'strong';
  const plan=buildLibraryCleanupPlan(mode);
  const est=document.getElementById('cleanupEstimate'); if(est) est.value=`${plan.before} → ${plan.after} partides tipus`;
  const prev=document.getElementById('cleanupPreview'); if(prev) prev.innerHTML=cleanupPlanSummaryHtml(plan);
}
function applyLibraryCleanup(){
  const mode=document.getElementById('cleanupMode')?.value || 'strong';
  const plan=buildLibraryCleanupPlan(mode);
  if(!confirm(`Aplicar depuració?\n\nPartides actuals: ${plan.before}\nPartides resultants: ${plan.after}\nDuplicades agrupades: ${plan.duplicates}\nNo partides descartades: ${plan.trashCount}\n\nEs guardarà una còpia interna per poder restaurar.`)) return;
  data.libraryCleanupBackups = Array.isArray(data.libraryCleanupBackups) ? data.libraryCleanupBackups : [];
  data.libraryCleanupBackups.push({id:uid('LIBBACK'), date:new Date().toISOString(), mode, before:data.library, note:`Depuració ${plan.before} → ${plan.after}`});
  if(data.libraryCleanupBackups.length>3) data.libraryCleanupBackups=data.libraryCleanupBackups.slice(-3);
  const idMap={};
  const next=[];
  for(const g of plan.rows){
    const rep={...g.representative};
    rep.chapter=g.cls.chapter || rep.chapter || 'Altres / revisar';
    rep.status=strip(rep.status).includes('valid') ? rep.status : 'Partida tipus agrupada';
    const origins=[rep.origin, ...g.duplicates.map(x=>x.origin)].filter(Boolean);
    rep.origin=[...new Set(origins)].slice(0,8).join(' · ');
    rep.groupKey=g.key;
    rep.groupedCount=g.items.length;
    rep.aliases=[...new Set(g.items.map(x=>cleanText(x.concept||'')).filter(Boolean))].slice(0,30);
    rep.history=[...(rep.history||[])];
    for(const dup of g.duplicates){
      idMap[dup.id]=rep.id;
      rep.history.push({origin:dup.origin||'Agrupada', concept:dup.concept, unit:dup.unit, unitPrice:dup.unitPrice, total:dup.total, status:dup.status, date:today()});
    }
    next.push(rep);
  }
  // Actualitza línies de pressupost que apuntaven a una partida duplicada.
  for(const b of data.budgets||[]){
    for(const l of (b.lines||[])){
      if(l.libraryId && idMap[l.libraryId]) l.libraryId=idMap[l.libraryId];
    }
  }
  data.library=next.sort((a,b)=>String(a.chapter||'').localeCompare(String(b.chapter||''),'ca',{numeric:true}) || String(a.concept||'').localeCompare(String(b.concept||''),'ca',{numeric:true}));
  data.importLogs=data.importLogs||[];
  data.importLogs.push({id:uid('CLEAN'),date:new Date().toISOString(),type:'Depuració llibreria',before:plan.before,after:plan.after,duplicates:plan.duplicates,trash:plan.trashCount,mode});
  saveData(); closeModal(); state.libChapterFilter=''; state.libSearch=''; renderLibrary();
}
function restoreLastLibraryCleanup(){
  data.libraryCleanupBackups = Array.isArray(data.libraryCleanupBackups) ? data.libraryCleanupBackups : [];
  const last=data.libraryCleanupBackups.pop();
  if(!last) return alert('No hi ha cap còpia interna de depuració per restaurar.');
  if(!confirm(`Restaurar la llibreria anterior a la depuració?\n${last.note||''}`)) { data.libraryCleanupBackups.push(last); return; }
  data.library=last.before || data.library;
  saveData(); closeModal(); renderLibrary();
}

const __teimorBaseBindViewEvents_V094 = bindViewEvents;
bindViewEvents = function(){
  __teimorBaseBindViewEvents_V094();
  if(state.view==='library'){
    const right=document.querySelector('#content .card .toolbar .right');
    if(right && !document.getElementById('smartCleanLibrary')){
      right.insertAdjacentHTML('afterbegin','<button class="primary" id="smartCleanLibrary">Depurar similars</button>');
    }
    const smart=document.getElementById('smartCleanLibrary'); if(smart) smart.onclick=openLibraryCleanupModal;
  }
};
const __teimorBaseBindModalEvents_V094 = bindModalEvents;
bindModalEvents = function(){
  __teimorBaseBindModalEvents_V094();
  const mode=document.getElementById('cleanupMode'); if(mode) mode.onchange=refreshCleanupPreview;
  const refresh=document.getElementById('refreshCleanupPreview'); if(refresh) refresh.onclick=refreshCleanupPreview;
  const apply=document.getElementById('applyLibraryCleanup'); if(apply) apply.onclick=applyLibraryCleanup;
  const restore=document.getElementById('restoreLibraryCleanup'); if(restore) restore.onclick=restoreLastLibraryCleanup;
};

/* ============================================================
   TEIMOR V09.5 · Depurador tècnic de llibreria
   Correcció clau: NO classificar per capítol/origen antic de l'Excel.
   Només es mira concepte + descripció llarga + unitat/codi.
   ============================================================ */
(function(){
  if(data && data.meta){ data.meta.version = '9.5.0-depurador-tecnic-llibreria'; try{ saveData?.(); }catch(e){} }
})();

function technicalText(item){
  return [item.concept, item.longDesc, item.unit, item.code].filter(Boolean).join(' ');
}
function technicalNorm(text){
  return strip(text || '')
    .replace(/col3/g,'col')
    .replace(/l\s*\.\s*b\s*\.\s*m/g,' lbm ')
    .replace(/m\s*\.\s*o\s*\./g,' ma obra ')
    .replace(/€/g,' eur ')
    .replace(/[ºª]/g,' ')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\b(de|del|la|las|los|el|els|les|i|y|amb|con|para|per|en|al|a|un|una|uns|unes|dels|dela|m2|m²|ml|ut|uds|ud|aprox|similar|existent|existents|tots|totes|cada|zona|part|tot|tota)\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function isTrashLibraryConceptV095(item){
  const c=strip(item.concept || item.longDesc || '');
  if(!c || c.length < 3) return true;
  const bad=[
    /^(data|fecha|pressupost|presupuesto|client|cliente|nif|dni|cif|telefono|telèfon|email|correu|base imposable|iva|total|subtotal)$/,
    /(materials?\s+i\s+m\.?o\.?|materiales?\s+y\s+m\.?o\?).*(unitat|unidad)?\s*=/,
    /\d+[\.,]?\d*\s*(m|m2|m²|ml|ut)?\s*x\s*\d+[\.,]?\d*\s*€?\s*=/,
    /^(carrer|calle|avda|avinguda|avenida|plaça|plaza|passeig|passatge|carretera)\b/,
    /^(cp|c\.p\.|codi postal)\b/,
    /^\d{5}\s+[a-z]/,
    /^\d+[\.,]?\d*\s*€?$/
  ];
  return bad.some(rx=>rx.test(c));
}
function shortKeyWords(text, max=4){
  const stop='obra obres treball treballs realitzar realitzacio execucio subministrament col locacio colocacio inclou inclos inclosa segons sobre sota amb dels dela totes tots fins zona existent existents'.split(' ');
  const t=technicalNorm(text).split(' ').filter(w=>w.length>3 && !/^\d+$/.test(w) && !stop.includes(w));
  return [...new Set(t)].slice(0,max).join('-') || technicalNorm(text).slice(0,30) || 'sense-text';
}
function subtypeLaminesV095(t){
  const parts=[];
  const kg=(t.match(/\b([345])\s*kg\b/)||t.match(/\b([345])\s*kilos?\b/)||[])[1];
  if(kg) parts.push(kg+'kg');
  if(/lbm\s*30|30\s*g|30g/.test(t)) parts.push('lbm30');
  if(/lbm\s*40|40\s*g|40g/.test(t)) parts.push('lbm40');
  if(/lbm\s*50|50\s*g|50g|50 g/.test(t)) parts.push('lbm50');
  if(/doble|dues capes|dos capes|2 capes|bicapa/.test(t)) parts.push('doble');
  if(/autoproteg|mineral|pissarra|alumini|protegida/.test(t)) parts.push('autoprotegida');
  if(/sbs/.test(t)) parts.push('sbs');
  if(/app/.test(t)) parts.push('app');
  return [...new Set(parts)].join('-') || 'general';
}
function subtypeGeotextilV095(t){
  const gr=(t.match(/\b(80|100|120|125|150|180|200|250|300|400|500)\s*(gr|g|g m2|gr m2)\b/)||[])[1];
  return gr ? gr+'g' : 'general';
}
function subtypePavimentV095(t){
  if(/socol|zocalo|rodapie/.test(t)) return 'socol';
  if(/gresite|mosaic/.test(t)) return 'gresite';
  if(/gres|ceramic|baldosa|rajol|panot|porcelanic/.test(t)) return 'ceramic';
  if(/junta|rejunt/.test(t)) return 'rejuntat';
  return 'general';
}
function classifyLibraryFamily(item){
  // V09.5: classificació tècnica només pel text de la partida.
  const text=technicalText(item);
  const t=technicalNorm(text);
  if(isTrashLibraryConceptV095(item)) return {chapter:'Descartades / no partides', family:'no-partida', label:'No partida evident', key:'trash:'+t.slice(0,40), trash:true};

  const rules=[
    // Preparació / proteccions / mitjans abans d'impermeabilitzar
    ['Proteccions d’obra','proteccions-obra',/prote(gir|ccio|cció|ccion)|cartro|carton|pl[aà]stic|cinta proteccio|tapar|protegir pas|protecciones/,'general'],
    ['Mitjans auxiliars i lloguers','mitjans-lloguers',/lloguer|alquiler|camio grua|camion grua|grua|elevadora|plataforma|pem|muntacargues|andami|bastida|mitjans auxiliars|medios auxiliares/,'general'],
    ['Residus i runes','residus-runes',/runa|runes|residu|residuos|contenidor|container|abocador|vertedero|retirada|transport|sac|big bag|carrega|carga|desc[aà]rrega/,'general'],
    ['Neteja i sanejat','neteja-sanejat',/neteja|limpieza|sanejat|saneado|repicat|picat|raspat|rascado|decapat|hidro|pressio|presion|desbross|netejar|eliminar bruticia/,'general'],
    ['Enderrocs i arrencades','enderrocs-arrencades',/enderroc|derribo|demolicio|demolicion|arrencad|arranque|desmuntatge|desmontaje|treure gespa|retirar gespa|gespa artificial|retirada gespa|extreure|picar paviment/,'general'],

    // Impermeabilització detallada per capes/operacions
    ['Geotèxtil','geotextil',/geot[eè]xtil|geotextil|feltre separador/,(txt)=>subtypeGeotextilV095(txt)],
    ['Imprimacions','imprimacions',/imprimaci|imprimacion|primer|emulsi[oó] bituminosa|pont d unio|puente de union|fixador|fijador|preparador suport/,'general'],
    ['Làmines asfàltiques','lamines-asfaltiques',/l[aà]mina|lamina|asfalt|asf[aà]ltic|bitumin|sbs|app|lbm|tela asfaltica|tela asf[aà]ltica|bet[uú]n|betun/,(txt)=>subtypeLaminesV095(txt)],
    ['Impermeabilització líquida','impermeabilitzacio-liquida',/poliureta|poliuret[aà]|resina|membrana liquida|sikalastic|mapelastic|cautxu|caucho|impermeabilitzant liquid|impermeabilizante liquido|cautx[uú]/,'general'],
    ['Mitges canyes','mitges-canyes',/mitja canya|mitges canyes|media caña|medias cañas|canya perimetral|canyes contorns|contorns amb morter/,'general'],
    ['Formació de pendents','formacio-pendents',/pendent|pendents|pendiente|pendientes|formaci[oó] pendent|regularitzar pendent|modificar pendent|conduir aig[uü]es|evacuaci[oó] aig[uü]es|mestrejat pendent/,'general'],
    ['Proves d’estanqueïtat','proves-estanqueitat',/estanqueitat|estanqueidad|prova d aigua|prueba de agua|inundaci[oó]|48 h|24 h/,'general'],
    ['Regates i obertures','regates-obertures',/regata|regates|roza|rozas|obrir regata|obertura|forat|taladre|perforaci[oó]|xemeneia|chimenea/,'general'],
    ['Remats i peces especials','remats-peces',/remat|rematar|pe[cç]a|pieza|gra[oó]|esgra[oó]|escal[oó]|cantonera|entrega|trobada|coronament|bord[oó]|perfil/,'general'],
    ['Segellats i juntes','segellats-juntes',/segell|sellad|silicona|massilla|masilla|junta|poliuretano|poliuret[aà]|sikaflex|reomplir junta|juntes perimetrals/,'general'],

    // Cobertes / planxa / teula
    ['Cobertes de planxa','cobertes-planxa',/planxa|chapa|coberta de planxa|cubierta de chapa|cargol|cargols|tornill|sobreeixidor|rebosadero|carena|carenes|cumbrera|pissarra mineral|fibres|fibra/,'general'],
    ['Cobertes i teules','cobertes-teules',/coberta|cubierta|teula|teja|teulat|tejado|lluerna|claraboia/,'general'],

    // Acabats i rehabilitació
    ['Paviments i enrajolats','paviments-enrajolats',/paviment|rajol|rajola|baldosa|gres|ceramic|cer[aà]mic|enrajolat|alicatat|alicatado|socol|zocalo|rodapie|gresite|panot|porcelanic|rejunt/,(txt)=>subtypePavimentV095(txt)],
    ['Pintura i revestiments','pintura-revestiments',/pintur|pintat|pintado|revestiment|revestimiento|jotashield|webertene|acrylic|acrilic|acrilico|esmalte|veladura/,'general'],
    ['Reparació de formigó','reparacio-formigo',/formig[oó]|hormigon|armadur|oxid|passiv|monotop|weberrep|morter r3|morter r4|reparacio|reparacion|cantell|canto forjat|canto de forjado|despreniment|desconch|fissur|esquerda|grieta/,'general'],
    ['Morters i regularitzacions','morters-regularitzacions',/morter|mortero|regularitz|regulariz|arreboss|enfosc|rebossat|remolinat|maestrejat|capa base|recreixement/,'general'],

    // Altres famílies habituals
    ['Canalons i baixants','canalons-baixants',/canal[oó]|canalon|baixant|bajante|pluvial|desgu[aà]s|desague|g[uü]atera|canaleta/,'general'],
    ['Baranes i inox','baranes-inox',/barana|barandilla|passama|pasamano|inox|acer inoxidable|acero inoxidable|aisi|316/,'general'],
    ['Aïllaments','aillaments',/aillament|aislamiento|xps|eps|llana mineral|lana mineral|poliestire|poliestireno|rockwool/,'general'],
    ['Drenatges','drenatges',/dren|drenatge|drenaje|tub dren|grava|geodren/,'general'],
    ['Formigons i soleres','formigons-soleres',/solera|formigonat|hormigonado|ha 25|ha25|ha 30|ha30|mallazo|malla electrosoldada|armat/,'general'],
    ['Paleteria','paleteria',/paleta|ma[oó]|ladrillo|gero|totxana|tabic|env[aà]|pared|paret|muret|bloc formigo|bloque hormigon/,'general'],
    ['Fusteria, portes i tancaments','fusteria-tancaments',/porta|puerta|finestra|ventana|fusteria|carpinteria|alumini|aluminio|persiana|reixa|valla/,'general'],
    ['Instal·lacions','instal-lacions',/instal lac|instalacion|electric|fontaner|lampist|aigua|agua|desgu[aà]s|clima|aire condicionat|calefacc/,'general'],
    ['Seguretat i salut','seguretat-salut',/seguretat|seguridad|salut|salud|epis|proteccions col lectives|protecciones colectivas/,'general'],
    ['Neteja final','neteja-final',/neteja final|limpieza final|entrega obra|final obra/,'general']
  ];
  for(const [chapter,family,rx,subdef] of rules){
    if(rx.test(t)){
      const sub = typeof subdef === 'function' ? subdef(t) : subdef;
      return {chapter,family,label:chapter, subtype:sub||'general', key:`${family}:${sub||'general'}:${unitBucket(item.unit)}`};
    }
  }

  const k=shortKeyWords(text,3);
  return {chapter:'Altres / revisar', family:'altres', label:'Altres / revisar', subtype:k, key:`altres:${k}:${unitBucket(item.unit)}`};
}
function libraryRepresentativeScore(item){
  let score=0;
  const c=cleanText(item.concept||'');
  const l=cleanText(item.longDesc||'');
  if(num(item.unitPrice)>0) score+=45;
  if(num(item.directCost)>0) score+=15;
  if(Array.isArray(item.decomp) && item.decomp.length) score+=40;
  const st=strip(item.status||'');
  if(st.includes('valid')) score+=35;
  if(st.includes('tipus')) score+=18;
  if(st.includes('pendent')) score-=5;
  if(st.includes('historic') || st.includes('històric')) score-=10;
  if(c.length>8 && c.length<120) score+=25;
  if(c.length>160) score-=10;
  if(l.length>25) score+=8;
  if(/\b(client|pressupost|base imposable|materials i m o|\d+\s*x\s*\d+)/i.test(c)) score-=500;
  if(isTrashLibraryConceptV095(item)) score-=1000;
  return score;
}
function buildLibraryCleanupPlan(mode='strong'){
  const groups=new Map();
  const trash=[];
  for(const item of data.library||[]){
    const cls=classifyLibraryFamily(item);
    if(cls.trash){ trash.push({item,cls}); continue; }
    let key=cls.key;
    if(mode==='superstrong') key = `${cls.family}:${cls.subtype||'general'}`;
    if(mode==='strong') key = `${cls.family}:${cls.subtype||'general'}:${unitBucket(item.unit)}`;
    if(mode==='conservative') key = `${cls.family}:${cls.subtype||'general'}:${unitBucket(item.unit)}:${shortKeyWords(technicalText(item),2)}`;
    if(!groups.has(key)) groups.set(key,{key, cls, items:[]});
    groups.get(key).items.push(item);
  }
  const rows=[...groups.values()].map(g=>{
    const sorted=[...g.items].sort((a,b)=>libraryRepresentativeScore(b)-libraryRepresentativeScore(a));
    return {...g, representative:sorted[0], duplicates:sorted.slice(1)};
  }).sort((a,b)=>String(a.cls.chapter).localeCompare(String(b.cls.chapter),'ca',{numeric:true}) || String(a.cls.subtype||'').localeCompare(String(b.cls.subtype||''),'ca',{numeric:true}) || b.items.length-a.items.length);
  const duplicates=rows.reduce((s,g)=>s+g.duplicates.length,0);
  return {mode, rows, trash, before:(data.library||[]).length, after:rows.length, duplicates, trashCount:trash.length};
}
function cleanupPlanSummaryHtml(plan){
  const preview=plan.rows.filter(g=>g.items.length>1).slice(0,120);
  const byChapter={}; plan.rows.forEach(g=>{ const ch=g.cls.chapter||'Altres / revisar'; (byChapter[ch] ||= []).push(g); });
  const chapterSummary=Object.keys(byChapter).sort((a,b)=>a.localeCompare(b,'ca',{numeric:true})).map(ch=>`<tr><td><strong>${esc(ch)}</strong></td><td>${byChapter[ch].length}</td><td>${byChapter[ch].reduce((s,g)=>s+g.items.length,0)}</td></tr>`).join('');
  return `
    <div class="grid four">
      <div class="kpi"><span>Partides actuals</span><strong>${plan.before}</strong></div>
      <div class="kpi good"><span>Partides tipus resultants</span><strong>${plan.after}</strong></div>
      <div class="kpi"><span>Duplicades agrupables</span><strong>${plan.duplicates}</strong></div>
      <div class="kpi ${plan.trashCount?'bad':'good'}"><span>No partides evidents</span><strong>${plan.trashCount}</strong></div>
    </div>
    <div class="card notice-blue"><strong>V09.5:</strong> la classificació ja no utilitza el capítol/origen antic de l’Excel. Només llegeix el text real de la partida. Això evita que feines com “protegir amb cartrons”, “lloguer de camió grua” o “formació d’esgraons” acabin dins “Impermeabilització de la terrassa”.</div>
    <details class="chapter-group" open><summary><strong>Resum de capítols proposats</strong><span>${Object.keys(byChapter).length}</span></summary><div class="table-wrap"><table><thead><tr><th>Capítol tècnic</th><th>Partides tipus</th><th>Originals agrupades</th></tr></thead><tbody>${chapterSummary}</tbody></table></div></details>
    ${preview.length?`<div class="table-wrap"><table><thead><tr><th>Capítol proposat</th><th>Subgrup</th><th>Es conserva</th><th>S’agrupen</th><th>Representant</th></tr></thead><tbody>${preview.map(g=>`<tr><td>${esc(g.cls.chapter)}</td><td>${esc(g.cls.subtype||g.key)}</td><td>1</td><td>${g.duplicates.length}</td><td><strong>${esc(g.representative.concept||'')}</strong><br><span class="muted">${esc(g.representative.unit||'')} · ${money(g.representative.unitPrice||libFinal(g.representative))}</span></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">No hi ha grups duplicats segons el criteri actual.</div>`}
    ${plan.trashCount?`<details class="chapter-group"><summary><strong>Textos que es descartarien com a no partides</strong><span>${plan.trashCount}</span></summary><div class="small-text">${plan.trash.slice(0,100).map(x=>esc(x.item.concept||x.item.longDesc||x.item.code||'')).join('<br>')}</div></details>`:''}
  `;
}
function openLibraryCleanupModal(){
  const plan=buildLibraryCleanupPlan('strong');
  openModal(`<h2>Depurar llibreria per capítols tècnics</h2>
    <div class="card">
      <p>Aquesta eina recapitula les partides importades i agrupa similars. El criteri ara és per feina real: geotèxtil, làmines asfàltiques, formació de pendents, mitges canyes, paviments, runes, mitjans auxiliars, etc.</p>
      <div class="form-grid">
        <label>Mode de depuració<select id="cleanupMode"><option value="strong" selected>Fort recomanat · separa subtipus principals</option><option value="superstrong">Molt fort · menys partides tipus</option><option value="conservative">Conservador · separa més variants</option></select></label>
        <label>Resultat estimat<input id="cleanupEstimate" readonly value="${plan.before} → ${plan.after} partides tipus"></label>
      </div>
      <div id="cleanupPreview">${cleanupPlanSummaryHtml(plan)}</div>
      <div class="actions"><button class="primary" id="applyLibraryCleanup">Aplicar depuració tècnica</button><button class="ghost" id="refreshCleanupPreview">Recalcular previsualització</button>${(data.libraryCleanupBackups||[]).length?'<button class="ghost" id="restoreLibraryCleanup">Restaurar última depuració</button>':''}</div>
    </div>`);
}
function applyLibraryCleanup(){
  const mode=document.getElementById('cleanupMode')?.value || 'strong';
  const plan=buildLibraryCleanupPlan(mode);
  if(!confirm(`Aplicar depuració tècnica?\n\nPartides actuals: ${plan.before}\nPartides resultants: ${plan.after}\nDuplicades agrupades: ${plan.duplicates}\nNo partides descartades: ${plan.trashCount}\n\nEs guardarà una còpia interna per poder restaurar.`)) return;
  data.libraryCleanupBackups = Array.isArray(data.libraryCleanupBackups) ? data.libraryCleanupBackups : [];
  data.libraryCleanupBackups.push({id:uid('LIBBACK'), date:new Date().toISOString(), mode, before:JSON.parse(JSON.stringify(data.library)), note:`Depuració tècnica ${plan.before} → ${plan.after}`});
  if(data.libraryCleanupBackups.length>3) data.libraryCleanupBackups=data.libraryCleanupBackups.slice(-3);
  const idMap={};
  const next=[];
  for(const g of plan.rows){
    const rep={...g.representative};
    rep.chapter=g.cls.chapter || rep.chapter || 'Altres / revisar';
    rep.status=strip(rep.status).includes('valid') ? rep.status : 'Partida tipus agrupada';
    const origins=[rep.origin, ...g.duplicates.map(x=>x.origin)].filter(Boolean);
    rep.origin=[...new Set(origins)].slice(0,10).join(' · ');
    rep.groupKey=g.key;
    rep.groupSubtype=g.cls.subtype || '';
    rep.groupedCount=g.items.length;
    rep.aliases=[...new Set(g.items.map(x=>cleanText(x.concept||'')).filter(Boolean))].slice(0,50);
    rep.history=[...(rep.history||[])];
    for(const dup of g.duplicates){
      idMap[dup.id]=rep.id;
      rep.history.push({origin:dup.origin||'Agrupada', concept:dup.concept, unit:dup.unit, unitPrice:dup.unitPrice, total:dup.total, status:dup.status, chapterBefore:dup.chapter, date:today()});
    }
    next.push(rep);
  }
  for(const b of data.budgets||[]){
    for(const l of (b.lines||[])){
      const cls=classifyLibraryFamily(l);
      if(cls && !cls.trash && (!l.chapter || l.chapter==='Històric importat' || /impermeabilitzaci[oó] de la terrassa/i.test(l.chapter||''))) l.chapter=cls.chapter;
      if(l.libraryId && idMap[l.libraryId]) l.libraryId=idMap[l.libraryId];
    }
  }
  data.library=next.sort((a,b)=>String(a.chapter||'').localeCompare(String(b.chapter||''),'ca',{numeric:true}) || String(a.concept||'').localeCompare(String(b.concept||''),'ca',{numeric:true}));
  data.importLogs=data.importLogs||[];
  data.importLogs.push({id:uid('CLEAN'),date:new Date().toISOString(),type:'Depuració tècnica llibreria V09.5',before:plan.before,after:plan.after,duplicates:plan.duplicates,trash:plan.trashCount,mode});
  saveData(); closeModal(); state.libChapterFilter=''; state.libSearch=''; renderLibrary();
}

// Afegeix també un botó explícit de recategoritzar a la llibreria.
const __teimorBaseBindViewEvents_V095 = bindViewEvents;
bindViewEvents = function(){
  __teimorBaseBindViewEvents_V095();
  if(state.view==='library'){
    const right=document.querySelector('#content .card .toolbar .right');
    if(right && !document.getElementById('smartCleanLibraryV095')){
      right.insertAdjacentHTML('afterbegin','<button class="primary" id="smartCleanLibraryV095">Depurar per capítols tècnics</button>');
    }
    const smart=document.getElementById('smartCleanLibraryV095'); if(smart) smart.onclick=openLibraryCleanupModal;
    const old=document.getElementById('smartCleanLibrary'); if(old) old.remove();
  }
};

/* =========================
   TEIMOR V09.6 · DEPURADOR PER CONCEPTES + UI FITXA/PDF
   ========================= */
(function(){
  if(data && data.meta){ data.meta.version = '9.6.0-depurador-conceptes-ui'; try{ saveData?.(); }catch(e){} }
})();

const TEIMOR_CHAPTERS_V096 = [
  'Geotèxtil','Làmines asfàltiques','Imprimacions','Mitges canyes','Formació de pendents','Proves d’estanqueïtat','Regates i obertures','Remats i peces especials','Segellats i juntes','Cobertes de planxa','Cobertes i teules','Impermeabilització líquida','Paviments i enrajolats','Residus i runes','Proteccions d’obra','Mitjans auxiliars i lloguers','Neteja i sanejat','Enderrocs i arrencades','Pintura i revestiments','Reparació de formigó','Morters i regularitzacions','Canalons i baixants','Baranes i inox','Aïllaments','Drenatges','Formigons i soleres','Paleteria','Fusteria, portes i tancaments','Instal·lacions','Seguretat i salut','Neteja final','Altres / revisar'
];
function conceptTextV096(item){ return cleanText([item?.concept,item?.longDesc,item?.unit,item?.code].filter(Boolean).join(' ')); }
function normConceptV096(text){
  return strip(text||'')
    .replace(/col3/g,'col').replace(/l\s*\.\s*b\s*\.\s*m/g,' lbm ').replace(/m\s*\.\s*o\s*\./g,' ma obra ')
    .replace(/\b(aproximadament|aproximado|aprox|similar|existent|existents|todos|todas|tots|totes|zona|part|tota|tot)\b/g,' ')
    .replace(/\b\d+[\.,]?\d*\s*(m2|m²|m|ml|kg|h|hores|ut|ud|uds|mm|cm|cm2|%)\b/g,' ')
    .replace(/\b\d+[\.,]?\d*\s*(eur|euros|€)\b/g,' ')
    .replace(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g,' ')
    .replace(/[^a-z0-9]+/g,' ')
    .replace(/\b(de|del|dels|dela|la|las|los|el|els|les|i|y|amb|con|para|per|en|al|a|un|una|uns|unes|sobre|sota|fins|fins a|m2|ml|ut|ud|pa)\b/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function isTrashLibraryConceptV096(item){
  const raw=conceptTextV096(item);
  const s=strip(raw);
  if(!s || s.length<3) return true;
  const badAnywhere=[
    /\biva\b/,/base\s+imposable/,/import\s+total/,/total\s+pressupost/,/subtotal/,/pressupost\s*n[uú]m/,/presupuesto/,/fecha\b/,/\bdata\b/,/client(e)?\b/,/nif|dni|cif/,/tel[eè]fon|telefono|email|correu/,/forma\s+de\s+pagament/,/venciment|vencimiento/,/compte\s+bancari|iban/,/teixidor|teimor/,/materials?\s+i\s+m\.?\s*o\.?\s*(unitat)?\s*=/,/materiales?\s+y\s+m\.?\s*o\.?\s*(unidad)?\s*=/
  ];
  if(badAnywhere.some(rx=>rx.test(s))) return true;
  const badStart=[
    /^(carrer|calle|avda|avinguda|avenida|pla[cç]a|plaza|passeig|passatge|carretera|ctra|ronda)\b/,
    /^(cp|c\.p\.|codi postal|codigo postal)\b/,
    /^\d{5}\s+[a-z]/,
    /^\d+[\.,]?\d*\s*(m|m2|m²|ml|ut|ud|kg|h)?\s*x\s*\d+[\.,]?\d*\s*(€|eur)?\s*=/,
    /^\d+[\.,]?\d*\s*(€|eur)?$/,
    /^\(?\s*\d+\s*%\s*\)?$/
  ];
  if(badStart.some(rx=>rx.test(s))) return true;
  if(/[=€]/.test(raw) && !/(subministrament|col|exec|paviment|lamina|l[aà]mina|geot[eè]xtil|morter|pintur|formig|segell|baixant|canal|barana|impermeabil)/i.test(raw)) return true;
  return false;
}
function subtypeV096(t,family){
  const s=normConceptV096(t);
  if(family==='lamines-asfaltiques'){
    const tags=[];
    if(/doble|2 capes|dues capes|bicapa/.test(s)) tags.push('doble-làmina');
    if(/autoproteg|pissarra|mineral|alumini/.test(s)) tags.push('autoprotegida');
    if(/sbs/.test(s)) tags.push('SBS');
    if(/app/.test(s)) tags.push('APP');
    if(/3\s*kg|lbm\s*30|30\s*g|3kg/.test(s)) tags.push('3kg');
    if(/4\s*kg|lbm\s*40|40\s*g|4kg/.test(s)) tags.push('4kg');
    if(/50\s*g|5\s*kg|5kg|50 g/.test(s)) tags.push('5kg');
    return tags.join('+') || 'general';
  }
  if(family==='paviments-enrajolats'){
    if(/socol|zocalo|rodapie/.test(s)) return 'sòcol';
    if(/gres|ceramic|porcelanic|baldosa|rajol|rajola|panot/.test(s)) return 'paviment';
    if(/rejunt/.test(s)) return 'rejuntat';
    return 'general';
  }
  if(family==='geotextil'){
    if(/300/.test(s)) return '300g'; if(/200/.test(s)) return '200g'; if(/150/.test(s)) return '150g'; return 'general';
  }
  if(family==='formacio-pendents'){
    if(/morter|mortero/.test(s)) return 'morter';
    if(/formig|hormig/.test(s)) return 'formigó';
    return 'general';
  }
  if(family==='mitjans-lloguers'){
    if(/camio|camion|grua/.test(s)) return 'camió-grua';
    if(/bastida|andami/.test(s)) return 'bastida';
    if(/plataforma|elevadora|pem/.test(s)) return 'plataforma';
    return 'general';
  }
  return 'general';
}
function classifyLibraryFamily(item){
  const text=conceptTextV096(item);
  const t=normConceptV096(text);
  if(isTrashLibraryConceptV096(item)) return {chapter:'Descartades / no partides', family:'no-partida', label:'No partida evident', subtype:'trash', key:'trash:'+t.slice(0,50), trash:true};
  const rules=[
    ['Geotèxtil','geotextil',/geot[eè]xtil|geotextil|feltre separador/],
    ['Làmines asfàltiques','lamines-asfaltiques',/l[aà]mina|lamina|asfalt|asf[aà]ltic|bitumin|sbs|app|lbm|tela asfaltica|tela asf[aà]ltica|bet[uú]n|betun/],
    ['Imprimacions','imprimacions',/imprimaci|imprimacion|primer|emulsi[oó] bituminosa|pont d unio|puente de union|fixador|fijador|preparador suport/],
    ['Mitges canyes','mitges-canyes',/mitja canya|mitges canyes|media caña|medias cañas|canya perimetral|canyes contorns|contorns amb morter/],
    ['Formació de pendents','formacio-pendents',/pendent|pendents|pendiente|pendientes|formaci[oó] pendent|regularitzar pendent|modificar pendent|conduir aig[uü]es|evacuaci[oó] aig[uü]es|mestrejat pendent/],
    ['Proves d’estanqueïtat','proves-estanqueitat',/estanqueitat|estanqueidad|prova d aigua|prueba de agua|inundaci[oó]|48 h|24 h/],
    ['Regates i obertures','regates-obertures',/regata|regates|roza|rozas|obrir regata|obertura|forat|taladre|perforaci[oó]|xemeneia|chimenea/],
    ['Remats i peces especials','remats-peces',/remat|rematar|pe[cç]a|pieza|gra[oó]|esgra[oó]|escal[oó]|cantonera|entrega|trobada|coronament|bord[oó]|perfil/],
    ['Segellats i juntes','segellats-juntes',/segell|sellad|silicona|massilla|masilla|junta|poliuretano|poliuret[aà]|sikaflex|reomplir junta|juntes perimetrals/],
    ['Impermeabilització líquida','impermeabilitzacio-liquida',/poliureta|poliuret[aà]|resina|membrana liquida|sikalastic|mapelastic|cautxu|caucho|impermeabilitzant liquid|impermeabilizante liquido|cautx[uú]/],
    ['Cobertes de planxa','cobertes-planxa',/planxa|chapa|coberta de planxa|cubierta de chapa|cargol|cargols|tornill|sobreeixidor|rebosadero|carena|carenes|cumbrera|pissarra mineral|fibres|fibra/],
    ['Cobertes i teules','cobertes-teules',/coberta|cubierta|teula|teja|teulat|tejado|lluerna|claraboia/],
    ['Paviments i enrajolats','paviments-enrajolats',/paviment|rajol|rajola|baldosa|gres|ceramic|cer[aà]mic|enrajolat|alicatat|alicatado|socol|zocalo|rodapie|gresite|panot|porcelanic|rejunt/],
    ['Residus i runes','residus-runes',/runa|runes|residu|residuos|contenidor|container|abocador|vertedero|retirada|transport|sac|big bag|carrega|carga|desc[aà]rrega/],
    ['Proteccions d’obra','proteccions-obra',/prote(gir|ccio|cció|ccion)|cartro|carton|pl[aà]stic|cinta proteccio|tapar|protegir pas|protecciones/],
    ['Mitjans auxiliars i lloguers','mitjans-lloguers',/lloguer|alquiler|camio grua|camion grua|grua|elevadora|plataforma|pem|muntacargues|andami|bastida|mitjans auxiliars|medios auxiliares/],
    ['Neteja i sanejat','neteja-sanejat',/neteja|limpieza|sanejat|saneado|repicat|picat|raspat|rascado|decapat|hidro|pressio|presion|desbross|netejar|eliminar bruticia/],
    ['Enderrocs i arrencades','enderrocs-arrencades',/enderroc|derribo|demolicio|demolicion|arrencad|arranque|desmuntatge|desmontaje|treure gespa|retirar gespa|gespa artificial|retirada gespa|extreure|picar paviment/],
    ['Pintura i revestiments','pintura-revestiments',/pintur|pintat|pintado|revestiment|revestimiento|jotashield|webertene|acrylic|acrilic|acrilico|esmalte|veladura/],
    ['Reparació de formigó','reparacio-formigo',/formig[oó]|hormigon|armadur|oxid|passiv|monotop|weberrep|morter r3|morter r4|reparacio|reparacion|cantell|canto forjat|canto de forjado|despreniment|desconch|fissur|esquerda|grieta/],
    ['Morters i regularitzacions','morters-regularitzacions',/morter|mortero|regularitz|regulariz|arreboss|enfosc|rebossat|remolinat|maestrejat|capa base|recreixement/],
    ['Canalons i baixants','canalons-baixants',/canal[oó]|canalon|baixant|bajante|pluvial|desgu[aà]s|desague|g[uü]atera|canaleta/],
    ['Baranes i inox','baranes-inox',/barana|barandilla|passama|pasamano|inox|acer inoxidable|acero inoxidable|aisi|316/],
    ['Aïllaments','aillaments',/aillament|aislamiento|xps|eps|llana mineral|lana mineral|poliestire|poliestireno|rockwool/],
    ['Drenatges','drenatges',/dren|drenatge|drenaje|tub dren|grava|geodren/],
    ['Formigons i soleres','formigons-soleres',/solera|formigonat|hormigonado|ha 25|ha25|ha 30|ha30|mallazo|malla electrosoldada|armat/],
    ['Paleteria','paleteria',/paleta|ma[oó]|ladrillo|gero|totxana|tabic|env[aà]|pared|paret|muret|bloc formigo|bloque hormigon/],
    ['Fusteria, portes i tancaments','fusteria-tancaments',/porta|puerta|finestra|ventana|fusteria|carpinteria|alumini|aluminio|persiana|reixa|valla/],
    ['Instal·lacions','instal-lacions',/instal lac|instalacion|electric|fontaner|lampist|aigua|agua|desgu[aà]s|clima|aire condicionat|calefacc/],
    ['Seguretat i salut','seguretat-salut',/seguretat|seguridad|salut|salud|epis|proteccions col lectives|protecciones colectivas/],
    ['Neteja final','neteja-final',/neteja final|limpieza final|entrega obra|final obra/]
  ];
  for(const [chapter,family,rx] of rules){
    if(rx.test(t)){
      const sub=subtypeV096(text,family);
      return {chapter,family,label:chapter, subtype:sub, key:`${family}:${sub||'general'}:${unitBucket(item.unit)}`};
    }
  }
  const tokens=t.split(' ').filter(w=>w.length>4 && !/^\d+$/.test(w) && !/^(obra|obres|treball|treballs|realitzar|realitzacio|execucio|subministrament|col|colocacio|inclou|inclosa|segons)$/.test(w));
  const key=[...new Set(tokens)].slice(0,3).join('-') || 'general';
  return {chapter:'Altres / revisar', family:'altres', label:'Altres / revisar', subtype:key, key:`altres:${key}:${unitBucket(item.unit)}`};
}
function libraryRepresentativeScore(item){
  let score=0; const c=cleanText(item.concept||''); const l=cleanText(item.longDesc||''); const st=strip(item.status||'');
  if(isTrashLibraryConceptV096(item)) score-=2000;
  if(num(item.unitPrice)>0) score+=50;
  if(num(item.directCost)>0) score+=20;
  if(Array.isArray(item.decomp) && item.decomp.length) score+=60;
  if(st.includes('valid')) score+=45;
  if(st.includes('tipus')) score+=20;
  if(st.includes('pendent')) score-=8;
  if(st.includes('historic') || st.includes('històric')) score-=10;
  if(c.length>8 && c.length<125) score+=30;
  if(c.length>150) score-=25;
  if(l.length>30) score+=10;
  if(/[=€]/.test(c)) score-=500;
  return score;
}
function groupKeyV096(item, cls, mode){
  const unit = mode==='ultra' ? 'all' : unitBucket(item.unit);
  if(mode==='conservative') return `${cls.family}:${cls.subtype||'general'}:${unit}:${normConceptV096(item.concept||'').split(' ').slice(0,4).join('-')}`;
  if(mode==='strong') return `${cls.family}:${cls.subtype||'general'}:${unit}`;
  if(mode==='ultra') return cls.family==='lamines-asfaltiques' ? `${cls.family}:${cls.subtype||'general'}` : `${cls.family}`;
  // molt fort: conserva subtipus útils només en famílies tècniques que varien molt de preu.
  const keepSub=['lamines-asfaltiques','paviments-enrajolats','mitjans-lloguers','formacio-pendents','geotextil'];
  return keepSub.includes(cls.family) ? `${cls.family}:${cls.subtype||'general'}` : `${cls.family}`;
}
function buildLibraryCleanupPlan(mode='verystrong'){
  const groups=new Map(); const trash=[];
  for(const item of data.library||[]){
    const cls=classifyLibraryFamily(item);
    if(cls.trash){ trash.push({item,cls}); continue; }
    const key=groupKeyV096(item,cls,mode);
    if(!groups.has(key)) groups.set(key,{key,cls:{...cls,key},items:[]});
    groups.get(key).items.push(item);
  }
  const rows=[...groups.values()].map(g=>{
    const sorted=[...g.items].sort((a,b)=>libraryRepresentativeScore(b)-libraryRepresentativeScore(a));
    return {...g, representative:sorted[0], duplicates:sorted.slice(1)};
  }).sort((a,b)=>String(a.cls.chapter).localeCompare(String(b.cls.chapter),'ca',{numeric:true}) || String(a.cls.subtype||'').localeCompare(String(b.cls.subtype||''),'ca',{numeric:true}));
  const duplicates=rows.reduce((s,g)=>s+g.duplicates.length,0);
  return {mode, rows, trash, before:(data.library||[]).length, after:rows.length, duplicates, trashCount:trash.length};
}
function cleanupPlanSummaryHtml(plan){
  const byChapter={}; plan.rows.forEach(g=>{ const ch=g.cls.chapter||'Altres / revisar'; (byChapter[ch] ||= []).push(g); });
  const chapterSummary=Object.keys(byChapter).sort((a,b)=>a.localeCompare(b,'ca',{numeric:true})).map(ch=>`<tr><td><strong>${esc(ch)}</strong></td><td>${byChapter[ch].length}</td><td>${byChapter[ch].reduce((s,g)=>s+g.items.length,0)}</td></tr>`).join('');
  const preview=plan.rows.filter(g=>g.items.length>1).slice(0,120);
  return `
    <div class="grid four">
      <div class="kpi"><span>Partides actuals</span><strong>${plan.before}</strong></div>
      <div class="kpi good"><span>Partides tipus resultants</span><strong>${plan.after}</strong></div>
      <div class="kpi"><span>Duplicades agrupables</span><strong>${plan.duplicates}</strong></div>
      <div class="kpi ${plan.trashCount?'bad':'good'}"><span>No partides / textos descartats</span><strong>${plan.trashCount}</strong></div>
    </div>
    <div class="card notice-blue"><strong>V09.6:</strong> depura més per concepte. Descarta línies d’IVA, bases, totals, fórmules, dades de client i adreces, i agrupa variants repetides dins capítols tècnics reals.</div>
    <details class="chapter-group" open><summary><strong>Resum proposat per capítols</strong><span>${Object.keys(byChapter).length}</span></summary><div class="table-wrap"><table><thead><tr><th>Capítol tècnic</th><th>Partides tipus</th><th>Originals agrupades</th></tr></thead><tbody>${chapterSummary}</tbody></table></div></details>
    ${preview.length?`<div class="table-wrap"><table><thead><tr><th>Capítol</th><th>Grup</th><th>Es conserva</th><th>S’agrupen</th><th>Representant</th></tr></thead><tbody>${preview.map(g=>`<tr><td>${esc(g.cls.chapter)}</td><td>${esc(g.cls.subtype||g.key)}</td><td>1</td><td>${g.duplicates.length}</td><td><strong>${esc(g.representative.concept||'')}</strong><br><span class="muted">${esc(g.representative.unit||'')} · ${money(g.representative.unitPrice||libFinal(g.representative))}</span></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty">No hi ha grups duplicats segons el criteri actual.</div>`}
    ${plan.trashCount?`<details class="chapter-group"><summary><strong>Textos que es descartarien com a no partides</strong><span>${plan.trashCount}</span></summary><div class="small-text">${plan.trash.slice(0,150).map(x=>esc(x.item.concept||x.item.longDesc||x.item.code||'')).join('<br>')}</div></details>`:''}
  `;
}
function openLibraryCleanupModal(){
  const plan=buildLibraryCleanupPlan('verystrong');
  openModal(`<h2>Depurar llibreria per conceptes</h2>
    <div class="card">
      <p>Aquesta versió intenta reduir més la llibreria importada: conserva una partida tipus per grup tècnic i elimina textos que no són partides.</p>
      <div class="form-grid">
        <label>Mode de depuració<select id="cleanupMode"><option value="verystrong" selected>Molt fort recomanat · objectiu 50-100 partides tipus</option><option value="strong">Fort · conserva més subtipus i unitats</option><option value="ultra">Ultra · una partida tipus per família principal</option><option value="conservative">Conservador · separa més variants</option></select></label>
        <label>Resultat estimat<input id="cleanupEstimate" readonly value="${plan.before} → ${plan.after} partides tipus"></label>
      </div>
      <div id="cleanupPreview">${cleanupPlanSummaryHtml(plan)}</div>
      <div class="actions"><button class="primary" id="applyLibraryCleanup">Aplicar depuració per conceptes</button><button class="ghost" id="refreshCleanupPreview">Recalcular previsualització</button>${(data.libraryCleanupBackups||[]).length?'<button class="ghost" id="restoreLibraryCleanup">Restaurar última depuració</button>':''}</div>
    </div>`);
}
function refreshCleanupPreview(){
  const mode=document.getElementById('cleanupMode')?.value || 'verystrong';
  const plan=buildLibraryCleanupPlan(mode);
  const est=document.getElementById('cleanupEstimate'); if(est) est.value=`${plan.before} → ${plan.after} partides tipus`;
  const prev=document.getElementById('cleanupPreview'); if(prev) prev.innerHTML=cleanupPlanSummaryHtml(plan);
}
function applyLibraryCleanup(){
  const mode=document.getElementById('cleanupMode')?.value || 'verystrong';
  const plan=buildLibraryCleanupPlan(mode);
  if(!confirm(`Aplicar depuració per conceptes?\n\nPartides actuals: ${plan.before}\nPartides resultants: ${plan.after}\nDuplicades agrupades: ${plan.duplicates}\nTextos descartats: ${plan.trashCount}\n\nEs guardarà una còpia interna per poder restaurar.`)) return;
  data.libraryCleanupBackups = Array.isArray(data.libraryCleanupBackups) ? data.libraryCleanupBackups : [];
  data.libraryCleanupBackups.push({id:uid('LIBBACK'), date:new Date().toISOString(), mode, before:JSON.parse(JSON.stringify(data.library)), note:`Depuració V09.6 ${plan.before} → ${plan.after}`});
  if(data.libraryCleanupBackups.length>3) data.libraryCleanupBackups=data.libraryCleanupBackups.slice(-3);
  const idMap={}; const next=[];
  for(const g of plan.rows){
    const rep={...g.representative};
    rep.chapter=g.cls.chapter || rep.chapter || 'Altres / revisar';
    rep.status=strip(rep.status).includes('valid') ? rep.status : 'Partida tipus agrupada';
    const origins=[rep.origin, ...g.duplicates.map(x=>x.origin)].filter(Boolean);
    rep.origin=[...new Set(origins)].slice(0,12).join(' · ');
    rep.groupKey=g.key; rep.groupSubtype=g.cls.subtype || ''; rep.groupedCount=g.items.length;
    rep.aliases=[...new Set(g.items.map(x=>cleanText(x.concept||'')).filter(Boolean))].slice(0,80);
    rep.history=[...(rep.history||[])];
    for(const dup of g.duplicates){ idMap[dup.id]=rep.id; rep.history.push({origin:dup.origin||'Agrupada', concept:dup.concept, unit:dup.unit, unitPrice:dup.unitPrice, total:dup.total, status:dup.status, chapterBefore:dup.chapter, date:today()}); }
    next.push(rep);
  }
  for(const b of data.budgets||[]){ for(const l of (b.lines||[])){ const cls=classifyLibraryFamily(l); if(cls && !cls.trash) l.chapter=cls.chapter; if(l.libraryId && idMap[l.libraryId]) l.libraryId=idMap[l.libraryId]; } }
  data.library=next.sort((a,b)=>String(a.chapter||'').localeCompare(String(b.chapter||''),'ca',{numeric:true}) || String(a.concept||'').localeCompare(String(b.concept||''),'ca',{numeric:true}));
  data.importLogs=data.importLogs||[]; data.importLogs.push({id:uid('CLEAN'),date:new Date().toISOString(),type:'Depuració per conceptes V09.6',before:plan.before,after:plan.after,duplicates:plan.duplicates,trash:plan.trashCount,mode});
  saveData(); closeModal(); state.libChapterFilter=''; state.libSearch=''; renderLibrary();
}
function chapterOptionsV096(selected){
  const chapters=[...new Set([...(data.library||[]).map(x=>x.chapter).filter(Boolean), ...TEIMOR_CHAPTERS_V096])].sort((a,b)=>a.localeCompare(b,'ca',{numeric:true}));
  return chapters.map(c=>`<option value="${esc(c)}" ${c===selected?'selected':''}>${esc(c)}</option>`).join('');
}
function openLibModal(id=''){
  const item = id ? byId(data.library,id) : {id:uid('LIB'), ci:data.settings.defaultCI, dge:data.settings.defaultDGE, bi:data.settings.defaultBI, decomp:[], status:'Pendent de revisar', chapter:'Altres / revisar'};
  if(!item) return alert('No s’ha trobat aquesta partida.');
  const lines = item.decomp || []; const cd = libDirect(item); const final = item.unitPrice || libFinal(item);
  openModal(`
    <h2>${id?'Fitxa de partida':'Nova partida de llibreria'}</h2>
    <form id="libForm" class="form-grid lib-modal-form lib-modal-v096">
      <input type="hidden" name="editId" value="${esc(id)}"><input type="hidden" name="id" value="${esc(item.id)}">
      <div class="full tabs-small modal-tabs">
        <button type="button" class="active" data-modal-tab="fitxa">Fitxa</button>
        <button type="button" data-modal-tab="descripcio">Descripció llarga</button>
        <button type="button" data-modal-tab="descompost">Descompost BEDEC</button>
        <button type="button" data-modal-tab="historic">Històric</button>
      </div>
      <div class="full modal-panel active" data-modal-panel="fitxa">
        <div class="form-grid">
          <label>Codi<input name="code" value="${esc(item.code||'')}"></label>
          <label class="wide">Capítol tècnic<select name="chapter">${chapterOptionsV096(item.chapter||'Altres / revisar')}</select></label>
          <label>Unitat<input name="unit" value="${esc(item.unit||'')}"></label>
          <label>Estat<select name="status">
            ${['Validada','Validada pendent revisió','Partida tipus agrupada','Importada pendent de revisar','Històrica sense amidament','PA pendent amidament','Duplicada possible'].map(s=>`<option ${item.status===s?'selected':''}>${s}</option>`).join('')}
          </select></label>
          <label class="full">Descripció curta<input name="concept" value="${esc(item.concept||'')}"></label>
          <label>Cost directe<input name="directCost" type="number" step="0.01" value="${esc(item.directCost||'')}"></label>
          <label>PU final històric<input name="unitPrice" type="number" step="0.01" value="${esc(item.unitPrice||'')}"></label>
          <label>CI %<input name="ci" type="number" step="0.01" value="${esc(item.ci ?? data.settings.defaultCI)}"></label>
          <label>DGE %<input name="dge" type="number" step="0.01" value="${esc(item.dge ?? data.settings.defaultDGE)}"></label>
          <label>BI %<input name="bi" type="number" step="0.01" value="${esc(item.bi ?? data.settings.defaultBI)}"></label>
          <label class="full">Origen<input name="origin" value="${esc(item.origin||'Manual')}"></label>
        </div>
        <div class="grid three" style="margin-top:12px">
          <div class="kpi"><span>Cost directe calculat</span><strong>${money(cd)}</strong></div>
          <div class="kpi"><span>PU final / històric</span><strong>${money(final)}</strong></div>
          <div class="kpi"><span>Agrupades</span><strong>${esc(item.groupedCount||1)}</strong></div>
        </div>
      </div>
      <div class="full modal-panel" data-modal-panel="descripcio">
        <label class="full">Descripció llarga<textarea name="longDesc" class="large-textarea desc-big-v096">${esc(item.longDesc||'')}</textarea></label>
      </div>
      <div class="full modal-panel" data-modal-panel="descompost">
        <div class="detail-box"><div class="toolbar"><h3>Descompost BEDEC estructurat</h3><button class="ghost small" type="button" id="addDecompLine">Afegir línia</button></div>
          <div class="table-wrap"><table id="decompTable" class="bedec-table"><thead><tr><th>Tipus</th><th>Recurs</th><th>Ut</th><th>Rendiment</th><th>Preu</th><th>Fórmula</th><th>Total CD</th><th></th></tr></thead><tbody>
            ${lines.length ? lines.map((l,i)=>decompRow(l,i)).join('') : ''}
          </tbody><tfoot><tr><td colspan="6" class="num"><strong>Cost directe</strong></td><td class="num"><strong>${money(decompSummary(lines))}</strong></td><td></td></tr></tfoot></table></div>
          <p class="small-text">El cost directe és rendiment × preu. Els percentatges CI, DGE i BI poden variar per pressupost.</p>
        </div>
      </div>
      <div class="full modal-panel" data-modal-panel="historic">${libraryHistoryTable(item)}</div>
      <div class="actions full"><button class="primary">Guardar partida</button><button class="ghost" type="button" id="closeModalBtn">Cancel·lar</button></div>
    </form>
  `);
}
function saveLibraryItem(e){
  e.preventDefault(); const f=formObj(e.target);
  const old=byId(data.library,f.editId) || {};
  const rows=[...document.querySelectorAll('#decompTable tbody tr')];
  const decomp=rows.map((tr,i)=>({type:tr.querySelector(`[name="type_${i}"]`)?.value||tr.querySelector('select')?.value||'Material', name:tr.querySelector(`[name="name_${i}"]`)?.value||tr.children[1]?.querySelector('input')?.value||'', unit:tr.querySelector(`[name="unit_${i}"]`)?.value||tr.children[2]?.querySelector('input')?.value||'', yield:num(tr.querySelector(`[name="yield_${i}"]`)?.value||tr.children[3]?.querySelector('input')?.value), price:num(tr.querySelector(`[name="price_${i}"]`)?.value||tr.children[4]?.querySelector('input')?.value)})).filter(x=>x.name || x.yield || x.price);
  const direct = num(f.directCost) || decomp.reduce((s,l)=>s+num(l.yield)*num(l.price),0);
  const final = num(f.unitPrice) || direct * factor(f.ci,f.dge,f.bi);
  const item={...old,id:f.id,code:f.code,chapter:f.chapter,unit:f.unit,concept:f.concept,longDesc:f.longDesc,directCost:direct,unitPrice:final,ci:num(f.ci),dge:num(f.dge),bi:num(f.bi),origin:f.origin,status:f.status,decomp};
  const idx=data.library.findIndex(x=>x.id===f.editId || x.id===item.id);
  if(idx>=0) data.library[idx]=item; else data.library.push(item);
  saveData(); closeModal(); renderLibrary();
}
function previewCss(){ return `body{font-family:Arial,sans-serif;background:#e5e7eb;margin:0;padding:18px;color:#111827}.preview-toolbar{max-width:210mm;margin:0 auto 12px}.preview-toolbar button{border:1px solid #ddd;border-radius:8px;padding:8px 12px;margin-right:8px}.preview-toolbar .primary{background:#c2410c;color:white}.a4-sheet{width:210mm;min-height:297mm;margin:auto;background:white;padding:15mm;box-shadow:0 8px 30px rgba(0,0,0,.18);border-top:7px solid #c2410c}.preview-header{display:grid;grid-template-columns:1fr 76mm;gap:12mm;align-items:start}.preview-header h1{font-size:24px;margin:0 0 5px;color:#7c2d12;letter-spacing:.2px}.preview-header p{font-size:12px;line-height:1.35}.client-box{border:1px solid #fdba74;background:#fff7ed;padding:9px;min-height:34mm;font-size:12px;line-height:1.45}.preview-meta{display:flex;gap:24mm;background:#f8fafc;border-left:5px solid #c2410c;padding:8px 10px;margin:8mm 0;font-size:13px}h2{font-size:16px;margin:0 0 5mm;color:#7c2d12}.preview-table{width:100%;border-collapse:collapse;font-size:11px}.preview-table th,.preview-table td{border:1px solid #d1d5db;padding:5px;vertical-align:top}.preview-table th{background:#c2410c;color:#fff;text-align:left}.preview-table tbody tr:nth-child(even){background:#fff7ed}.num{text-align:right;white-space:nowrap}.preview-desc{font-size:10.5px;margin-top:4px;white-space:pre-wrap;line-height:1.32;color:#374151}.preview-totals{margin-top:8mm;margin-left:auto;width:86mm;font-size:13px;border-top:2px solid #c2410c}.preview-totals div{display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:5px}.preview-totals div:last-child{background:#fff7ed;color:#7c2d12;font-size:15px}.preview-notes{margin-top:10mm;font-size:10px;color:#555}@media print{body{background:white;padding:0}.preview-toolbar{display:none}.a4-sheet{box-shadow:none;margin:0;width:auto;min-height:auto;padding:12mm}@page{size:A4;margin:0}}`; }
const __teimorBaseBindModalEvents_V096 = bindModalEvents;
bindModalEvents = function(){
  __teimorBaseBindModalEvents_V096();
  const refresh=document.getElementById('refreshCleanupPreview'); if(refresh) refresh.onclick=refreshCleanupPreview;
  const apply=document.getElementById('applyLibraryCleanup'); if(apply) apply.onclick=applyLibraryCleanup;
  const restore=document.getElementById('restoreLibraryCleanup'); if(restore) restore.onclick=restoreLibraryCleanup;
};
const __teimorBaseBindViewEvents_V096 = bindViewEvents;
bindViewEvents = function(){
  __teimorBaseBindViewEvents_V096();
  if(state.view==='library'){
    const btn=document.getElementById('smartCleanLibraryV095') || document.getElementById('smartCleanLibrary');
    if(btn){ btn.textContent='Depurar més per conceptes'; btn.onclick=openLibraryCleanupModal; }
  }
};

/* =========================================================
   V09.7 · Depuració visible real
   - El depurador deixa la llibreria visible només amb representants.
   - Les partides agrupades queden dins l'històric del representant.
   - S'afegeix botó per finalitzar una depuració anterior si només havia quedat en previsualització.
   ========================================================= */

function libraryIsTrashV097(item){
  if(typeof isTrashLibraryConceptV096==='function' && isTrashLibraryConceptV096(item)) return true;
  const txt=strip([item?.concept,item?.longDesc,item?.origin,item?.chapter,item?.code].join(' '));
  if(!txt) return true;
  return /(^|\s)(iva|i\.v\.a|base imposable|subtotal|total pressupost|total factura|retencio|retención)(\s|$)/.test(txt) && !/(pintura|impermeabilitz|lamina|morter|paviment|canal|baixant|geotextil)/.test(txt);
}
function libraryVisibleRowsV097(){
  return (data.library||[]).filter(x=>{
    if(x.hiddenDuplicate || x.mergedInto || x.discardedAsTrash) return false;
    if(libraryIsTrashV097(x)) return false;
    return true;
  });
}
function finishLibraryCleanupV097(mode){
  mode = mode || document.getElementById('cleanupMode')?.value || 'verystrong';
  const plan = typeof buildLibraryCleanupPlan==='function' ? buildLibraryCleanupPlan(mode) : null;
  if(!plan) return alert('No s’ha pogut calcular la depuració.');
  if(!confirm(`Aplicar depuració visible definitiva?\n\nLa llibreria passarà de ${plan.before} registres a ${plan.after} partides tipus visibles.\nLes duplicades no es veuran al llistat, però quedaran guardades a l’històric de cada partida representant.\n\nTextos descartats com IVA, totals o fórmules: ${plan.trashCount}`)) return;

  data.libraryCleanupBackups = Array.isArray(data.libraryCleanupBackups) ? data.libraryCleanupBackups : [];
  data.libraryCleanupBackups.push({
    id:uid('LIBBACK'),
    date:new Date().toISOString(),
    mode,
    before:JSON.parse(JSON.stringify(data.library||[])),
    note:`V09.7 depuració visible ${plan.before} → ${plan.after}`
  });
  if(data.libraryCleanupBackups.length>5) data.libraryCleanupBackups=data.libraryCleanupBackups.slice(-5);

  const idMap={};
  const next=[];
  for(const g of plan.rows){
    const rep=JSON.parse(JSON.stringify(g.representative||{}));
    rep.chapter=g.cls?.chapter || rep.chapter || 'Altres / revisar';
    rep.status=strip(rep.status||'').includes('valid') ? rep.status : 'Partida tipus agrupada';
    rep.isTypeRepresentative=true;
    rep.hiddenDuplicate=false;
    rep.mergedInto='';
    rep.discardedAsTrash=false;
    rep.groupKey=g.key;
    rep.groupSubtype=g.cls?.subtype || '';
    rep.groupedCount=g.items?.length || 1;
    const origins=[rep.origin, ...(g.duplicates||[]).map(x=>x.origin)].filter(Boolean);
    rep.origin=[...new Set(origins)].slice(0,10).join(' · ');
    rep.aliases=[...new Set((g.items||[]).map(x=>cleanText(x.concept||'')).filter(Boolean))].slice(0,120);
    rep.history=[...(rep.history||[])];
    for(const dup of (g.duplicates||[])){
      idMap[dup.id]=rep.id;
      rep.history.push({
        origin:dup.origin||'Agrupada',
        concept:dup.concept,
        longDesc:dup.longDesc,
        unit:dup.unit,
        unitPrice:dup.unitPrice,
        total:dup.total,
        status:dup.status,
        chapterBefore:dup.chapter,
        date:today(),
        mergedInto:rep.id
      });
    }
    next.push(rep);
  }

  for(const b of data.budgets||[]){
    for(const l of (b.lines||[])){
      if(l.libraryId && idMap[l.libraryId]) l.libraryId=idMap[l.libraryId];
      const cls=typeof classifyLibraryFamily==='function' ? classifyLibraryFamily(l) : null;
      if(cls && !cls.trash) l.chapter=cls.chapter;
    }
  }

  data.library=next.sort((a,b)=>String(a.chapter||'').localeCompare(String(b.chapter||''),'ca',{numeric:true}) || String(a.concept||'').localeCompare(String(b.concept||''),'ca',{numeric:true}));
  data.importLogs=data.importLogs||[];
  data.importLogs.push({id:uid('CLEAN'),date:new Date().toISOString(),type:'Depuració visible V09.7',before:plan.before,after:plan.after,duplicates:plan.duplicates,trash:plan.trashCount,mode});
  state.libChapterFilter=''; state.libSearch=''; state.libStatusFilter=''; state.libShowAllOriginals=false;
  saveData(); closeModal(); renderLibrary();
}

function openLibraryCleanupModal(){
  const plan=buildLibraryCleanupPlan('verystrong');
  openModal(`<h2>Depurar llibreria i deixar només partides tipus visibles</h2>
    <div class="card">
      <p>Amb aquesta versió, quan apliques la depuració, el llistat visible queda només amb les partides tipus. Les partides originals agrupades no apareixen com a files repetides: queden dins l’històric de la partida representant.</p>
      <div class="form-grid">
        <label>Mode de depuració<select id="cleanupMode"><option value="verystrong" selected>Molt fort recomanat · objectiu 50-100 partides tipus</option><option value="ultra">Ultra · una partida tipus per família principal</option><option value="strong">Fort · conserva més subtipus i unitats</option><option value="conservative">Conservador · separa més variants</option></select></label>
        <label>Resultat estimat<input id="cleanupEstimate" readonly value="${plan.before} → ${plan.after} partides tipus visibles"></label>
      </div>
      <div id="cleanupPreview">${cleanupPlanSummaryHtml(plan)}</div>
      <div class="actions"><button class="primary" id="applyLibraryCleanup">Aplicar i deixar només partides tipus visibles</button><button class="ghost" id="refreshCleanupPreview">Recalcular previsualització</button>${(data.libraryCleanupBackups||[]).length?'<button class="ghost" id="restoreLibraryCleanup">Restaurar última depuració</button>':''}</div>
    </div>`);
}
function applyLibraryCleanup(){ finishLibraryCleanupV097(); }
function refreshCleanupPreview(){
  const mode=document.getElementById('cleanupMode')?.value || 'verystrong';
  const plan=buildLibraryCleanupPlan(mode);
  const est=document.getElementById('cleanupEstimate'); if(est) est.value=`${plan.before} → ${plan.after} partides tipus visibles`;
  const prev=document.getElementById('cleanupPreview'); if(prev) prev.innerHTML=cleanupPlanSummaryHtml(plan);
}

function cleanupPendingNoticeV097(){
  const logs=(data.importLogs||[]).filter(x=>String(x.type||'').includes('Depuració') && num(x.after)>0).slice(-1)[0];
  if(logs && (data.library||[]).length > num(logs.after)+3){
    return `<div class="card notice-red"><strong>Depuració pendent d’aplicar al llistat:</strong> l’última depuració indicava ${esc(logs.after)} partides tipus, però encara hi ha ${esc((data.library||[]).length)} files visibles/importades. Clica <strong>Finalitzar depuració visible</strong> per conservar només les partides tipus.</div>`;
  }
  return '';
}

function renderLibrary(){
  setHeader('Llibreria de partides · V09.7','Vista neta per capítols. La depuració visible conserva només una partida tipus per concepte i guarda les originals agrupades dins l’històric.');
  const q=state.libSearch || '';
  const filter=strip(q);
  const showAll=!!state.libShowAllOriginals;
  const baseRows=showAll ? (data.library||[]) : libraryVisibleRowsV097();
  const chapters=[...new Set(baseRows.map(x=>x.chapter||'Sense capítol').filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ca',{numeric:true}));
  const chapter=state.libChapterFilter || '';
  const statusFilter=strip(state.libStatusFilter || '');
  let rows=baseRows.filter(x=>{
    const chapterOk=!chapter || (x.chapter||'Sense capítol')===chapter;
    const statusOk=!statusFilter || strip(x.status||'').includes(statusFilter);
    const searchOk=!filter || strip([x.code,x.chapter,x.unit,x.concept,x.longDesc,x.status,x.origin,(x.aliases||[]).join(' ')].join(' ')).includes(filter);
    return chapterOk && statusOk && searchOk;
  });
  rows=sortByLibraryField(rows);
  setContent(`
    ${cleanupPendingNoticeV097()}
    <div class="card">
      <div class="toolbar"><h2>Llibreria per capítols</h2><div class="right"><button class="primary" id="smartCleanLibraryV097">Depurar / finalitzar vista</button><button class="ghost" id="finishCleanupVisible">Finalitzar depuració visible</button><button class="ghost" id="selectAllLibrary">Seleccionar tot</button><button class="ghost" id="clearSelectedLibrary">Desmarcar</button><button class="danger" id="deleteSelectedLibrary">Eliminar seleccionades</button><button class="ghost" id="exportLibraryJson">Exportar llibreria</button><label class="ghost file-label">Importar llibreria<input id="importLibraryJson" type="file" accept="application/json" hidden></label><button class="primary" id="newLibItem">Nova partida</button></div></div>
      <div class="grid four">
        <div class="kpi"><span>Partides visibles</span><strong>${rows.length}</strong></div>
        <div class="kpi"><span>Total guardades</span><strong>${(data.library||[]).length}</strong></div>
        <div class="kpi good"><span>Capítols visibles</span><strong>${chapters.length}</strong></div>
        <div class="kpi"><span>Vista</span><strong>${showAll?'Totes':'Neta'}</strong></div>
      </div>
      <div class="filter-grid" style="margin-top:12px">
        <label>Cerca<input id="libSearch" placeholder="Cercar partida, codi, origen..." value="${esc(q)}"></label>
        <label>Capítol<select id="libChapterFilter"><option value="">Tots els capítols</option>${chapters.map(c=>`<option value="${esc(c)}" ${c===chapter?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
        <label>Estat<select id="libStatusFilter"><option value="">Tots</option>${['Validada','Validada pendent revisió','Partida tipus agrupada','Importada pendent de revisar','Històrica sense amidament','PA pendent amidament','Duplicada possible'].map(s=>`<option ${strip(s)===statusFilter?'selected':''}>${esc(s)}</option>`).join('')}</select></label>
        <label>Vista<select id="libShowAllOriginals"><option value="0" ${!showAll?'selected':''}>Neta: només partides tipus</option><option value="1" ${showAll?'selected':''}>Totes les guardades</option></select></label>
      </div>
      <div class="sort-bar small-text">Ordenar llibreria: ${sortableInline('Codi','library','code')} ${sortableInline('Capítol','library','chapter')} ${sortableInline('Concepte','library','concept')} ${sortableInline('PU','library','pu')} ${sortableInline('Estat','library','status')}</div>
      <div id="libraryTable">${libraryGroupedTable(rows)}</div>
    </div>
  `);
}

const __teimorBindViewEvents_V097 = bindViewEvents;
bindViewEvents = function(){
  __teimorBindViewEvents_V097();
  if(state.view==='library'){
    const btn=document.getElementById('smartCleanLibraryV097'); if(btn) btn.onclick=openLibraryCleanupModal;
    const fin=document.getElementById('finishCleanupVisible'); if(fin) fin.onclick=()=>finishLibraryCleanupV097('verystrong');
    const show=document.getElementById('libShowAllOriginals'); if(show) show.onchange=e=>{ state.libShowAllOriginals=e.target.value==='1'; renderLibrary(); };
  }
};
const __teimorBindModalEvents_V097 = bindModalEvents;
bindModalEvents = function(){
  __teimorBindModalEvents_V097();
  const refresh=document.getElementById('refreshCleanupPreview'); if(refresh) refresh.onclick=refreshCleanupPreview;
  const apply=document.getElementById('applyLibraryCleanup'); if(apply) apply.onclick=applyLibraryCleanup;
  const restore=document.getElementById('restoreLibraryCleanup'); if(restore) restore.onclick=restoreLibraryCleanup;
};

/* ============================================================
   TEIMOR V09.8 · ordre per any + numeració seqüencial + depuració automàtica visible
   - Ordenar pressupostos no perd el filtre d'any actiu.
   - Es crea una numeració nova per any (1,2,3...) segons data ascendent.
   - Es conserva el número antic/importat de l'Excel en columna separada.
   - Si ja hi ha una depuració aplicada, la llibreria mostra automàticament només partides tipus.
   ============================================================ */
(function(){
  data.meta = data.meta || {};
  data.meta.version = '9.8.0-ordre-any-depuracio-auto';
  try{ saveData?.(); }catch(e){}
})();

function budgetOldNumberV098(b){
  return cleanText(b.oldNumber || b.originalNumber || b.excelNumber || b.importedNumber || b.sourceNumber || b.number || '');
}
function budgetSeqNumberV098(b){
  return b.seqNumber || b.yearSeq || b.internalNumber || '';
}
function normalizeBudgetSequentialNumbersV098(){
  if(!Array.isArray(data.budgets)) return;
  let changed=false;
  const byYear={};
  for(const b of data.budgets){
    const y = budgetYear(b) || Number((parseDateValue(b.date)||today()).slice(0,4));
    (byYear[y] ||= []).push(b);
    if(!b.oldNumber && b.number){ b.oldNumber=String(b.number); changed=true; }
  }
  for(const y of Object.keys(byYear)){
    byYear[y].sort((a,b)=>{
      const da=parseDateValue(a.date)||'9999-12-31';
      const db=parseDateValue(b.date)||'9999-12-31';
      return da.localeCompare(db) || String(budgetOldNumberV098(a)).localeCompare(String(budgetOldNumberV098(b)), 'ca', {numeric:true, sensitivity:'base'});
    });
    byYear[y].forEach((b,i)=>{
      const n=i+1;
      if(Number(b.seqNumber)!==n){ b.seqNumber=n; changed=true; }
      if(String(b.seqYear||'')!==String(y)){ b.seqYear=Number(y)||y; changed=true; }
    });
  }
  if(changed){ try{ saveData(); }catch(e){} }
}

function nextBudgetNumber(date=today()){
  normalizeBudgetSequentialNumbersV098();
  const year = Number((parseDateValue(date)||today()).slice(0,4));
  const nums = (data.budgets||[])
    .filter(b => Number(budgetYear(b)) === year)
    .map(b => Number(b.seqNumber || b.yearSeq || b.internalNumber || 0))
    .filter(Boolean);
  return String((nums.length ? Math.max(...nums) : 0) + 1);
}

function sortByBudgetField(rows){
  const field = state.budgetSortField || 'date';
  const dir = state.budgetSortDir || 'desc';
  const val = b => {
    const j=byId(data.jobs,b.jobId)||{}; const c=byId(data.clients,b.clientId)||{};
    if(field==='year') return budgetYear(b)||'';
    if(field==='date') return parseDateValue(b.date)||'';
    if(field==='number') return Number(budgetSeqNumberV098(b) || 0);
    if(field==='oldNumber') return budgetOldNumberV098(b);
    if(field==='client') return c.name||'';
    if(field==='title') return b.title||j.title||'';
    if(field==='status') return b.status||'';
    if(field==='base') return budgetBase(b);
    if(field==='total') return budgetTotal(b);
    if(field==='type') return budgetLineSum(b)>0 ? 'Suma de partides' : (num(b.importedBase)>0 ? 'Total importat Excel' : 'Sense import');
    if(field==='lines') return (b.lines||[]).length;
    return b.date||'';
  };
  return [...rows].sort((a,b)=> compareMixed(val(a), val(b), dir) || compareMixed(parseDateValue(a.date)||'',parseDateValue(b.date)||'','asc') || compareMixed(budgetOldNumberV098(a),budgetOldNumberV098(b),'asc'));
}

function budgetRowsFiltered(){
  const q=strip(document.getElementById('budgetSearch')?.value ?? state.budgetSearch ?? '');
  const yearState = (document.getElementById('budgetYearFilter')?.value ?? state.budgetYearFilter ?? activeYear?.('budget') ?? 'all');
  const status=strip(document.getElementById('budgetStatusFilter')?.value ?? state.budgetStatusFilter ?? '');
  const client=document.getElementById('budgetClientFilter')?.value ?? state.budgetClientFilter ?? '';
  const rows=(data.budgets||[]).filter(b=>{
    const j=byId(data.jobs,b.jobId);
    const c=byId(data.clients,b.clientId);
    const blob=[b.id,b.seqNumber,b.oldNumber,b.number,b.date,b.title,b.status,b.source,b.notes,c?.name,c?.nif,c?.phone,c?.email,j?.title,j?.address,j?.city,budgetYear(b)].join(' ');
    const yearOk = !yearState || yearState==='all' || String(budgetYear(b))===String(yearState);
    return (!q || strip(blob).includes(q)) && yearOk && (!status || strip(b.status)===status) && (!client || b.clientId===client);
  });
  return sortByBudgetField(rows);
}

function filterBudgets(){
  const searchEl=document.getElementById('budgetSearch'); if(searchEl) state.budgetSearch=searchEl.value||'';
  const yearEl=document.getElementById('budgetYearFilter'); if(yearEl) state.budgetYearFilter=yearEl.value||''; // en V09.8 normalment no existeix: es conserva el xip d'any actiu
  const clientEl=document.getElementById('budgetClientFilter'); if(clientEl) state.budgetClientFilter=clientEl.value||'';
  const statusEl=document.getElementById('budgetStatusFilter'); if(statusEl) state.budgetStatusFilter=statusEl.value||'';
  const rows=budgetRowsFiltered();
  const tableEl=document.getElementById('budgetsTable');
  const currentYear = (typeof activeYear==='function') ? activeYear('budget') : (state.budgetYearFilter||'all');
  if(tableEl) tableEl.innerHTML = currentYear==='all' ? budgetsGroupedByYear(rows) : budgetsTable(rows);
  const info=document.getElementById('budgetFilterInfo'); if(info) info.textContent=`Mostrant ${rows.length} de ${data.budgets.length} pressupostos.`;
  bindViewEvents();
}

function budgetsTable(rows){
  normalizeBudgetSequentialNumbersV098();
  if(!rows.length) return empty();
  const headers=[
    '<th>Sel.</th>', sortableTh('Any','budget','year'), sortableTh('Data','budget','date'), sortableTh('Núm. any','budget','number'), sortableTh('Núm. antic Excel','budget','oldNumber'), sortableTh('Client','budget','client'), sortableTh('Concepte / obra','budget','title'), sortableTh('Estat','budget','status'), sortableTh('Base s/IVA','budget','base'), sortableTh('Total IVA incl.','budget','total'), sortableTh('Tipus import','budget','type'), sortableTh('Partides','budget','lines'), '<th>Accions</th>'
  ].join('');
  return `<div class="table-wrap"><table><thead><tr>${headers}</tr></thead><tbody>${rows.map(b=>{
    const lineSum = budgetLineSum(b);
    const calcType = lineSum>0 ? 'Suma de partides' : (num(b.importedBase)>0 ? 'Total importat Excel' : 'Sense import');
    const job=byId(data.jobs,b.jobId);
    const title=cleanText(b.title || job?.title || '');
    const addr=cleanText(job?.address || '');
    return `<tr class="clickable-row" data-open-budget="${esc(b.id)}">
      <td><input type="checkbox" class="select-budget" value="${esc(b.id)}" data-no-row-open></td>
      <td>${esc(budgetYear(b)||'')}</td>
      <td>${dateDisplay(b.date)}</td>
      <td><strong>${esc(budgetSeqNumberV098(b)||'')}</strong></td>
      <td>${esc(budgetOldNumberV098(b)||'')}</td>
      <td>${esc(clientName(b.clientId))}</td>
      <td><strong>${esc(title)}</strong>${addr && strip(addr)!==strip(title)?`<br><span class="muted">${esc(addr)}</span>`:''}</td>
      <td><select class="status-select" data-budget-status="${esc(b.id)}" data-no-row-open>${budgetStatusOptions(b.status||'Esborrany')}</select></td>
      <td class="num">${money(budgetBase(b))}</td>
      <td class="num"><strong>${money(budgetTotal(b))}</strong></td>
      <td>${esc(calcType)}</td>
      <td class="num">${(b.lines||[]).length}</td>
      <td class="nowrap"><button class="ghost small" data-edit-budget="${esc(b.id)}" data-no-row-open>Veure / editar</button> <button class="ghost small" data-preview-budget="${esc(b.id)}" data-no-row-open>Previsualitzar A4</button> <button class="danger small" data-delete-budget="${esc(b.id)}" data-no-row-open>Eliminar</button></td>
    </tr>`;}).join('')}</tbody></table></div>`;
}

function renderBudgets(editId=''){
  normalizeBudgetSequentialNumbersV098();
  setHeader('Pressupostos','Llistat complet agrupable per any, amb numeració nova anual i número antic importat de l’Excel. Les fletxes ordenen sense perdre l’any actiu.');
  if(editId) { state.editBudgetId=editId; state.selectedBudgetId=editId === '__new' ? '' : editId; }
  const currentYear=activeYear('budget');
  const statuses=[...new Set((data.budgets||[]).map(b=>b.status).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const rows=budgetRowsFiltered();
  setContent(`
    <div class="grid four">
      <div class="kpi"><span>Pressupostos</span><strong>${rows.length}</strong></div>
      <div class="kpi"><span>Total s/IVA any actiu</span><strong>${money(rows.reduce((s,b)=>s+budgetBase(b),0))}</strong></div>
      <div class="kpi"><span>Acceptats / fets</span><strong>${rows.filter(b=>strip(b.status).includes('acceptat')||strip(b.status).includes('fet')).length}</strong></div>
      <div class="kpi"><span>Rebutjats / anul·lats</span><strong>${rows.filter(b=>strip(b.status).includes('rebutjat')||strip(b.status).includes('anul')).length}</strong></div>
    </div>
    <div class="card">
      <div class="toolbar"><h2>Pressupostos ${currentYear==='all'?'· tots els anys':'· '+esc(currentYear)}</h2><div class="right"><button class="ghost" id="renumberBudgetsByYear">Recalcular numeració anual</button><button class="ghost" id="selectAllBudgets">Seleccionar tot</button><button class="ghost" id="clearSelectedBudgets">Desmarcar</button><button class="danger" id="deleteSelectedBudgets">Eliminar seleccionats</button><button class="primary" id="newBudgetBtn">+ Nou pressupost</button><button class="ghost" id="exportBudgetCsv">Exportar CSV del seleccionat</button></div></div>
      ${yearSelectorHtml(currentYear,'budget')}
      <div class="filter-grid compact-filters">
        <label>Cerca<input id="budgetSearch" placeholder="Client, obra, núm. anual, núm. antic, adreça, any..." value="${esc(state.budgetSearch||'')}"></label>
        <label>Client<select id="budgetClientFilter"><option value="">Tots</option>${options(data.clients,state.budgetClientFilter||'')}</select></label>
        <label>Estat<select id="budgetStatusFilter"><option value="">Tots</option>${statuses.map(x=>`<option ${strip(x)===strip(state.budgetStatusFilter||'')?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
      </div>
      <div class="sort-help small-text">Ordre actual: <strong>${esc(state.budgetSortField||'data')}</strong> ${esc(state.budgetSortDir==='asc'?'ascendent':'descendent')} · prem una capçalera per canviar. La columna <strong>Núm. any</strong> és la numeració nova 1, 2, 3... dins de cada any segons data; <strong>Núm. antic Excel</strong> conserva el número detectat de l’arxiu original.</div>
      <div id="budgetFilterInfo" class="small-text" style="margin:10px 0">Mostrant ${rows.length} de ${data.budgets.length} pressupostos.</div>
      <div id="budgetsTable">${currentYear==='all' ? budgetsGroupedByYear(rows) : budgetsTable(rows)}</div>
    </div>
  `);
}

function budgetFormCard(formBudget,isNew=false){
  const d=formBudget.date||today();
  const autoSeq = isNew ? nextBudgetNumber(d) : (formBudget.seqNumber || formBudget.yearSeq || formBudget.internalNumber || nextBudgetNumber(d));
  const old = isNew ? '' : budgetOldNumberV098(formBudget);
  return `<div class="card"><h2>${isNew?'Nou pressupost':'Editar pressupost'}</h2>
      <form id="budgetForm" class="form-grid budget-form-wide">
        <input type="hidden" name="id" value="${esc(formBudget.id||uid('P'))}">
        <label>Núm. nou anual<input name="seqNumber" id="budgetNumberInput" value="${esc(autoSeq)}" data-auto-number="${isNew?'1':'0'}"></label>
        <label>Núm. antic / Excel<input name="oldNumber" value="${esc(old)}" placeholder="Número original detectat a l’Excel"></label>
        <label>Data<input name="date" id="budgetDateInput" type="date" value="${esc(d)}"></label>
        <label class="wide">Client<select name="clientId" required><option value="">Selecciona client</option>${options(data.clients,formBudget.clientId)}</select></label>
        <label class="wide">Feina<select name="jobId"><option value="">Sense feina</option>${options(data.jobs,formBudget.jobId,x=>`${x.year} · ${x.title}`)}</select></label>
        <label class="full concept-field">Títol / concepte del pressupost<input name="title" value="${esc(formBudget.title||'')}" placeholder="Concepte principal del pressupost"></label>
        <label>Estat<select name="status">${budgetStatusOptions(formBudget.status||'Esborrany')}</select></label>
        <label>CI %<input name="ci" type="number" step="0.01" value="${esc(formBudget.ci ?? data.settings.defaultCI)}"></label>
        <label>DGE %<input name="dge" type="number" step="0.01" value="${esc(formBudget.dge ?? data.settings.defaultDGE)}"></label>
        <label>BI %<input name="bi" type="number" step="0.01" value="${esc(formBudget.bi ?? data.settings.defaultBI)}"></label>
        <label>IVA %<input name="iva" type="number" step="0.01" value="${esc(formBudget.iva ?? data.settings.defaultIVA)}"></label>
        <label>Base importada s/IVA<input name="importedBase" type="number" step="0.01" value="${esc(formBudget.importedBase || '')}"></label>
        <label class="full">Notes<textarea name="notes">${esc(formBudget.notes||'')}</textarea></label>
        <div class="actions full"><button class="primary">Guardar pressupost</button><button class="ghost" type="button" data-render-budgets>Cancel·lar</button></div>
      </form>
    </div>`;
}

function saveBudget(e){
  e.preventDefault();
  const f=formObj(e.target);
  const old=byId(data.budgets,f.id);
  const b={...(old||{}), id:f.id, seqNumber:num(f.seqNumber)||num(old?.seqNumber)||0, oldNumber:f.oldNumber || old?.oldNumber || old?.number || '', number:f.oldNumber || old?.number || '', date:f.date, clientId:f.clientId, jobId:f.jobId, title:f.title, status:f.status, ci:num(f.ci), dge:num(f.dge), bi:num(f.bi), iva:num(f.iva), importedBase:num(f.importedBase), notes:f.notes, lines:old?.lines||[]};
  const idx=data.budgets.findIndex(x=>x.id===b.id);
  if(idx>=0) data.budgets[idx]=b; else data.budgets.push(b);
  state.selectedBudgetId=b.id; state.editBudgetId='';
  const job=byId(data.jobs,b.jobId); if(job && !job.mainBudgetId) job.mainBudgetId=b.id;
  normalizeBudgetSequentialNumbersV098();
  saveData(); if(isModalOpen()) closeModal(); renderBudgets();
}

function openBudgetModal(id=''){
  normalizeBudgetSequentialNumbersV098();
  const isNew = id === '__new' || !id;
  const b = isNew ? {id:'', seqNumber:nextBudgetNumber(today()), oldNumber:'', number:'', lines:[], date:today(), ci:data.settings.defaultCI, dge:data.settings.defaultDGE, bi:data.settings.defaultBI, iva:data.settings.defaultIVA, status:'Esborrany'} : byId(data.budgets,id);
  if(!b) return alert('No s’ha trobat aquest pressupost.');
  state.editBudgetId = isNew ? '__new' : b.id;
  state.selectedBudgetId = isNew ? '' : b.id;
  openModal(`
    <h2>${isNew?'Nou pressupost':'Pressupost · núm. any '+esc(budgetSeqNumberV098(b)||'')}${!isNew && budgetOldNumberV098(b)?' · antic '+esc(budgetOldNumberV098(b)):''}</h2>
    <div class="notice-blue card-tight">${isNew?'El número anual es genera automàticament segons la data i l’ordre dels pressupostos existents. Pots canviar-lo manualment si cal.':'El número anual és el nou ordre intern per any; el número antic conserva el valor importat de l’Excel.'}</div>
    <div class="actions" style="margin:0 0 12px">${!isNew?`<button class="ghost" type="button" data-preview-budget-modal="${esc(b.id)}">Vista preliminar A4 / PDF</button>`:''}</div>
    ${budgetFormCard(b,isNew)}
    ${!isNew ? budgetLinesCard(b) : ''}
  `);
  document.querySelectorAll('[data-preview-budget-modal]').forEach(btn=>btn.onclick=()=>openBudgetPreview(btn.dataset.previewBudgetModal));
}

function openBudgetPreview(id){
  const b=byId(data.budgets,id); if(!b) return alert('No s’ha trobat el pressupost.');
  const c=byId(data.clients,b.clientId)||{}; const j=byId(data.jobs,b.jobId)||{}; const s=data.settings.contractista||{};
  const rows=(b.lines||[]).map((l,idx)=>`<tr><td>${idx+1}</td><td>${esc(l.unit||'')}</td><td><strong>${esc(l.concept||'')}</strong>${l.longDesc?`<div class="preview-desc">${esc(l.longDesc)}</div>`:''}</td><td class="num">${l.qty?num(l.qty).toLocaleString('ca-ES'):''}</td><td class="num">${l.unitPrice?money(l.unitPrice):''}</td><td class="num">${money(lineTotal(l))}</td></tr>`).join('');
  const html=`<div class="preview-toolbar actions"><button class="primary" onclick="window.print()">Imprimir / guardar PDF</button><button class="ghost" onclick="window.close()">Tancar</button></div>
    <div class="a4-sheet">
      <div class="preview-colorbar"></div>
      <div class="preview-header"><div><h1>${esc(s.name||'TEIMOR')}</h1><p>${esc(s.nif||'')}<br>${esc(s.address||'')}<br>${esc(s.city||'')}<br>${esc(s.phone||'')}</p></div><div class="client-box"><span>Client</span><strong>${esc(c.name||'Client pendent de revisar')}</strong><br>${esc(c.nif||'')}<br>${esc(c.workAddress||j.address||'')}<br>${esc(c.city||'')}</div></div>
      <div class="preview-meta"><div><strong>Data:</strong> ${dateDisplay(b.date)}</div><div><strong>Núm. any:</strong> ${esc(budgetSeqNumberV098(b)||'')}</div>${budgetOldNumberV098(b)?`<div><strong>Núm. antic:</strong> ${esc(budgetOldNumberV098(b))}</div>`:''}</div>
      <h2>${esc(b.title||j.title||'Pressupost')}</h2>
      ${j.address?`<p><strong>Obra:</strong> ${esc(j.address)}</p>`:''}
      <table class="preview-table"><thead><tr><th>Part.</th><th>Ut</th><th>Concepte / descripció</th><th>Quantitat</th><th>Preu/ut</th><th>Total</th></tr></thead><tbody>${rows || `<tr><td colspan="6">Sense línies detallades. Import detectat de l’Excel original.</td></tr>`}</tbody></table>
      <div class="preview-totals"><div>Base s/IVA: <strong>${money(budgetBase(b))}</strong></div><div>IVA ${num(b.iva)}%: <strong>${money(budgetIVA(b))}</strong></div><div>Total: <strong>${money(budgetTotal(b))}</strong></div></div>
      <div class="preview-notes">${esc(b.notes||'')}</div>
    </div>`;
  const w=window.open('', '_blank');
  if(!w) return alert('El navegador ha bloquejat la finestra de previsualització. Permet pop-ups per aquesta app.');
  w.document.write(`<!doctype html><html lang="ca"><head><meta charset="utf-8"><title>Pressupost ${esc(budgetSeqNumberV098(b)||budgetOldNumberV098(b)||'')}</title><style>${previewCss()}</style></head><body>${html}</body></html>`);
  w.document.close();
}
function previewCss(){ return `body{font-family:Arial,sans-serif;background:#e5e7eb;margin:0;padding:18px;color:#111827}.preview-toolbar{max-width:210mm;margin:0 auto 12px}.preview-toolbar button{border:1px solid #ddd;border-radius:8px;padding:8px 12px;margin-right:8px}.preview-toolbar .primary{background:#b45309;color:white}.a4-sheet{width:210mm;min-height:297mm;margin:auto;background:white;padding:14mm 16mm 16mm;box-shadow:0 8px 30px rgba(0,0,0,.18);position:relative}.preview-colorbar{height:7mm;background:linear-gradient(90deg,#7c2d12,#c2410c,#f59e0b);margin:-14mm -16mm 12mm}.preview-header{display:grid;grid-template-columns:1fr 78mm;gap:12mm;align-items:start}.preview-header h1{font-size:24px;margin:0 0 5px;color:#7c2d12;letter-spacing:.02em}.preview-header p{font-size:12px;line-height:1.35}.client-box{border:1.5px solid #c2410c;border-radius:6px;padding:9px;min-height:34mm;font-size:12px;line-height:1.45;background:#fff7ed}.client-box span{text-transform:uppercase;font-size:9px;color:#9a3412;letter-spacing:.08em}.client-box strong{display:block;margin:2px 0 5px;font-size:13px}.preview-meta{display:flex;gap:15mm;flex-wrap:wrap;border-top:2px solid #7c2d12;border-bottom:1px solid #fed7aa;padding:8px 0;margin:8mm 0;font-size:13px}h2{font-size:17px;margin:0 0 5mm;color:#111827}.preview-table{width:100%;border-collapse:collapse;font-size:11px}.preview-table th,.preview-table td{border:1px solid #d1d5db;padding:6px;vertical-align:top}.preview-table th{background:#7c2d12;color:white}.preview-table tbody tr:nth-child(even){background:#fff7ed}.num{text-align:right;white-space:nowrap}.preview-desc{font-size:10.5px;margin-top:4px;white-space:pre-wrap;line-height:1.3;color:#374151}.preview-totals{margin-top:8mm;margin-left:auto;width:84mm;font-size:13px;border-top:2px solid #7c2d12}.preview-totals div{display:flex;justify-content:space-between;border-bottom:1px solid #fed7aa;padding:5px}.preview-totals div:last-child{font-size:15px;background:#fff7ed}.preview-notes{margin-top:10mm;font-size:10px;color:#555;white-space:pre-wrap}@media print{body{background:white;padding:0}.preview-toolbar{display:none}.a4-sheet{box-shadow:none;margin:0;width:auto;min-height:auto;padding:12mm}.preview-colorbar{margin:-12mm -12mm 10mm}@page{size:A4;margin:0}}`; }

function libraryRowsCleanAutoV098(){
  const lib=data.library||[];
  const reps=lib.filter(x=>x.isTypeRepresentative && !x.hiddenDuplicate && !x.mergedInto && !x.discardedAsTrash && !libraryIsTrashV097(x));
  if(reps.length) return reps;
  return lib.filter(x=>{
    if(x.hiddenDuplicate || x.mergedInto || x.discardedAsTrash) return false;
    if(libraryIsTrashV097(x)) return false;
    return true;
  });
}
function autoFinalizeLibraryIfNeededV098(){
  if(!Array.isArray(data.library) || !data.library.length) return;
  const reps=data.library.filter(x=>x.isTypeRepresentative && !x.hiddenDuplicate && !x.mergedInto && !x.discardedAsTrash && !libraryIsTrashV097(x));
  if(reps.length && data.library.length>reps.length+3){
    data.library=reps.sort((a,b)=>String(a.chapter||'').localeCompare(String(b.chapter||''),'ca',{numeric:true}) || String(a.concept||'').localeCompare(String(b.concept||''),'ca',{numeric:true}));
    state.libShowAllOriginals=false;
    data.importLogs=data.importLogs||[];
    data.importLogs.push({id:uid('CLEAN'),date:new Date().toISOString(),type:'Auto finalització vista neta V09.8',before:data.library.length,after:reps.length});
    try{ saveData(); }catch(e){}
    return;
  }
  const last=(data.importLogs||[]).filter(x=>String(x.type||'').includes('Depuració') && num(x.after)>0).slice(-1)[0];
  if(last && data.library.length>num(last.after)+5 && typeof buildLibraryCleanupPlan==='function'){
    const plan=buildLibraryCleanupPlan(last.mode || 'verystrong');
    if(plan && plan.after<=num(last.after)+8 && plan.after<data.library.length){
      // Aplica el mateix criteri de forma automàtica, sense demanar confirmació, perquè l'usuari ja havia depurat.
      const idMap={}; const next=[];
      for(const g of plan.rows){
        const rep=JSON.parse(JSON.stringify(g.representative||{}));
        rep.chapter=g.cls?.chapter || rep.chapter || 'Altres / revisar';
        rep.status=strip(rep.status||'').includes('valid') ? rep.status : 'Partida tipus agrupada';
        rep.isTypeRepresentative=true; rep.hiddenDuplicate=false; rep.mergedInto=''; rep.discardedAsTrash=false;
        rep.groupKey=g.key; rep.groupSubtype=g.cls?.subtype || ''; rep.groupedCount=g.items?.length || 1;
        const origins=[rep.origin, ...(g.duplicates||[]).map(x=>x.origin)].filter(Boolean);
        rep.origin=[...new Set(origins)].slice(0,10).join(' · ');
        rep.aliases=[...new Set((g.items||[]).map(x=>cleanText(x.concept||'')).filter(Boolean))].slice(0,120);
        rep.history=[...(rep.history||[])];
        for(const dup of (g.duplicates||[])){ idMap[dup.id]=rep.id; rep.history.push({origin:dup.origin||'Agrupada', concept:dup.concept, longDesc:dup.longDesc, unit:dup.unit, unitPrice:dup.unitPrice, total:dup.total, status:dup.status, chapterBefore:dup.chapter, date:today(), mergedInto:rep.id}); }
        next.push(rep);
      }
      for(const b of data.budgets||[]) for(const l of (b.lines||[])) if(l.libraryId && idMap[l.libraryId]) l.libraryId=idMap[l.libraryId];
      data.library=next.sort((a,b)=>String(a.chapter||'').localeCompare(String(b.chapter||''),'ca',{numeric:true}) || String(a.concept||'').localeCompare(String(b.concept||''),'ca',{numeric:true}));
      state.libShowAllOriginals=false;
      data.importLogs.push({id:uid('CLEAN'),date:new Date().toISOString(),type:'Auto finalització vista neta V09.8',before:plan.before,after:plan.after,duplicates:plan.duplicates,trash:plan.trashCount,mode:plan.mode});
      try{ saveData(); }catch(e){}
    }
  }
}

function renderLibrary(){
  autoFinalizeLibraryIfNeededV098();
  setHeader('Llibreria de partides · V09.8','Vista neta automàtica per capítols. Un cop depurada, només es veuen les partides tipus representatives.');
  const q=state.libSearch || '';
  const filter=strip(q);
  const showAll=!!state.libShowAllOriginals;
  const baseRows=showAll ? (data.library||[]) : libraryRowsCleanAutoV098();
  const chapters=[...new Set(baseRows.map(x=>x.chapter||'Sense capítol').filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ca',{numeric:true}));
  const chapter=state.libChapterFilter || '';
  const statusFilter=strip(state.libStatusFilter || '');
  let rows=baseRows.filter(x=>{
    const chapterOk=!chapter || (x.chapter||'Sense capítol')===chapter;
    const statusOk=!statusFilter || strip(x.status||'').includes(statusFilter);
    const searchOk=!filter || strip([x.code,x.chapter,x.unit,x.concept,x.longDesc,x.status,x.origin,(x.aliases||[]).join(' ')].join(' ')).includes(filter);
    return chapterOk && statusOk && searchOk;
  });
  rows=sortByLibraryField(rows);
  setContent(`
    <div class="card">
      <div class="toolbar"><h2>Llibreria per capítols</h2><div class="right"><button class="primary" id="smartCleanLibraryV097">Depurar per conceptes</button><button class="ghost" id="selectAllLibrary">Seleccionar tot</button><button class="ghost" id="clearSelectedLibrary">Desmarcar</button><button class="danger" id="deleteSelectedLibrary">Eliminar seleccionades</button><button class="ghost" id="exportLibraryJson">Exportar llibreria</button><label class="ghost file-label">Importar llibreria<input id="importLibraryJson" type="file" accept="application/json" hidden></label><button class="primary" id="newLibItem">Nova partida</button></div></div>
      <div class="grid four">
        <div class="kpi"><span>Partides visibles</span><strong>${rows.length}</strong></div>
        <div class="kpi"><span>Total guardades</span><strong>${(data.library||[]).length}</strong></div>
        <div class="kpi good"><span>Capítols visibles</span><strong>${chapters.length}</strong></div>
        <div class="kpi"><span>Vista</span><strong>${showAll?'Totes':'Neta'}</strong></div>
      </div>
      <div class="filter-grid" style="margin-top:12px">
        <label>Cerca<input id="libSearch" placeholder="Cercar partida, codi, origen..." value="${esc(q)}"></label>
        <label>Capítol<select id="libChapterFilter"><option value="">Tots els capítols</option>${chapters.map(c=>`<option value="${esc(c)}" ${c===chapter?'selected':''}>${esc(c)}</option>`).join('')}</select></label>
        <label>Estat<select id="libStatusFilter"><option value="">Tots</option>${['Validada','Validada pendent revisió','Partida tipus agrupada','Importada pendent de revisar','Històrica sense amidament','PA pendent amidament','Duplicada possible'].map(s=>`<option ${strip(s)===statusFilter?'selected':''}>${esc(s)}</option>`).join('')}</select></label>
        <label>Vista<select id="libShowAllOriginals"><option value="0" ${!showAll?'selected':''}>Neta: només partides tipus</option><option value="1" ${showAll?'selected':''}>Totes les guardades</option></select></label>
      </div>
      <div class="sort-bar small-text">Ordenar llibreria: ${sortableInline('Codi','library','code')} ${sortableInline('Capítol','library','chapter')} ${sortableInline('Concepte','library','concept')} ${sortableInline('PU','library','pu')} ${sortableInline('Estat','library','status')}</div>
      <div id="libraryTable">${libraryGroupedTable(rows)}</div>
    </div>
  `);
}

const __teimorBindViewEvents_V098 = bindViewEvents;
bindViewEvents = function(){
  __teimorBindViewEvents_V098();
  const ren=document.getElementById('renumberBudgetsByYear'); if(ren) ren.onclick=()=>{ normalizeBudgetSequentialNumbersV098(); alert('Numeració anual recalculada segons data.'); renderBudgets(); };
  if(state.view==='library'){
    const show=document.getElementById('libShowAllOriginals'); if(show) show.onchange=e=>{ state.libShowAllOriginals=e.target.value==='1'; renderLibrary(); };
  }
};

const __teimorBindModalEvents_V098 = bindModalEvents;
bindModalEvents = function(){
  __teimorBindModalEvents_V098();
  const dateInput=document.getElementById('budgetDateInput');
  const numberInput=document.getElementById('budgetNumberInput');
  if(dateInput && numberInput && numberInput.dataset.autoNumber==='1'){
    numberInput.addEventListener('input',()=>{ numberInput.dataset.autoNumber='0'; });
    dateInput.addEventListener('change',()=>{ if(numberInput.dataset.autoNumber==='1') numberInput.value=nextBudgetNumber(dateInput.value); });
  }
};

/* =========================================================
   TEIMOR V09.9 · IMPORTACIÓ I DEPURACIÓ CONTROLADA
   - Lectura més robusta de cel·les, dates i etiquetes amb valor inline.
   - No endevina el client a partir del nom del fitxer.
   - Conserva variants de client perquè es validin abans de fusionar-les.
   - Permet canviar el capítol de cada partida sense limitar-se al select.
   ========================================================= */

data.meta = data.meta || {};
data.meta.version = '9.9.0-importacio-clients-capitols';

function teimor099CellText(value){
  if(value == null || value === '') return '';
  if(value instanceof Date) return dateIso(value);
  return cleanText(value);
}
function teimor099LabelNorm(value){
  return strip(value)
    .replace(/[ºª]/g,' ')
    .replace(/[：:;=]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function teimor099EscapeRegExp(value){
  return String(value||'').replace(/[.*+?^$()|[\]\\]/g,'\\$&');
}
function teimor099Aliases(aliases){
  return [...new Set((aliases||[]).map(x=>cleanText(x)).filter(Boolean))]
    .sort((a,b)=>b.length-a.length);
}
function teimor099InlineValue(text, aliases){
  const source=cleanText(text);
  if(!source) return '';
  for(const alias of teimor099Aliases(aliases)){
    const pattern=teimor099EscapeRegExp(alias).replace(/\s+/g,'\\s+');
    const re=new RegExp('^\\s*'+pattern+'\\s*(?:[:=]|[-–—])\\s*(.+?)\\s*$','i');
    const match=source.match(re);
    if(match && cleanText(match[1])) return cleanText(match[1]);
  }
  return '';
}
function teimor099IsExactLabel(text, aliases){
  const normalized=teimor099LabelNorm(text);
  return teimor099Aliases(aliases).some(alias=>{
    const a=teimor099LabelNorm(alias);
    return normalized===a || normalized===a+' / empresa' || normalized===a+' / client';
  });
}
function teimor099AcceptValue(value, validator){
  const v=cleanText(value);
  return v && !isTeimorText(v) && !isNonRecipientText(v) && !looksLikeCalculationLine(v) && (!validator || validator(v)) ? v : '';
}
function teimor099FindValue(flat, aliases, validator){
  const list=teimor099Aliases(aliases);
  for(const record of flat||[]){
    const row=record.raw||[];
    for(let i=0;i<row.length;i++){
      const text=teimor099CellText(row[i]);
      if(!text) continue;
      const inline=teimor099AcceptValue(teimor099InlineValue(text,list),validator);
      if(inline) return inline;
      if(!teimor099IsExactLabel(text,list)) continue;
      const sameRow=row.slice(i+1).map(teimor099CellText).map(v=>teimor099AcceptValue(v,validator)).find(Boolean);
      if(sameRow) return sameRow;
      for(const next of (flat||[])){
        if(next.sheet!==record.sheet || next.rowIndex<=record.rowIndex || next.rowIndex>record.rowIndex+4) continue;
        const sameColumn=teimor099AcceptValue(teimor099CellText((next.raw||[])[i]),validator);
        if(sameColumn) return sameColumn;
        const anyCell=(next.raw||[]).map(teimor099CellText).map(v=>teimor099AcceptValue(v,validator)).find(Boolean);
        if(anyCell) return anyCell;
      }
    }
  }
  return '';
}
function teimor099IsDateLabel(text){
  return /^(data|fecha|date|data pressupost|fecha presupuesto)$/i.test(teimor099LabelNorm(text));
}
function parseDateValueV099(value){
  if(value == null || value === '') return '';
  if(value instanceof Date && !isNaN(value)) return validIso(value.getFullYear(),value.getMonth()+1,value.getDate());
  if(typeof value==='number' && value>20000 && value<70000){
    const dt=new Date(Date.UTC(1899,11,30)+Math.round(value*86400000));
    return validIso(dt.getUTCFullYear(),dt.getUTCMonth()+1,dt.getUTCDate());
  }
  let source=cleanText(value).replace(/^[A-Za-zÀ-ÿ]+\s*[:=]\s*/,'').trim();
  if(!source) return '';
  let match=source.match(/\b(20\d{2}|19\d{2})[\/\.\-](\d{1,2})[\/\.\-](\d{1,2})\b/);
  if(match) return validIso(Number(match[1]),Number(match[2]),Number(match[3]));
  match=source.match(/\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2}|20\d{2}|19\d{2})\b/);
  if(match){
    const first=Number(match[1]), second=Number(match[2]);
    let year=Number(match[3]); if(year<100) year+=2000;
    if(second>12 && first<=12) return validIso(year,first,second);
    if(first>12 && second<=12) return validIso(year,second,first);
    return validIso(year,second,first);
  }
  const parsed=new Date(source);
  return !isNaN(parsed) && /\b(19|20)\d{2}\b/.test(source) ? validIso(parsed.getFullYear(),parsed.getMonth()+1,parsed.getDate()) : '';
}
parseDateValue = parseDateValueV099;

function findLabelRowV099(rows, labels){
  const list=teimor099Aliases(labels);
  for(let i=0;i<(rows||[]).length;i++){
    if((rows[i]||[]).some(cell=>teimor099IsExactLabel(cell,list) || teimor099InlineValue(cell,list))) return i;
  }
  return -1;
}
findLabelRow = findLabelRowV099;
function rowValueAfterLabelV099(row, labels){
  const list=teimor099Aliases(labels);
  for(let i=0;i<(row||[]).length;i++){
    const cell=teimor099CellText(row[i]);
    const inline=teimor099InlineValue(cell,list);
    if(inline) return inline;
    if(teimor099IsExactLabel(cell,list)){
      const value=(row||[]).slice(i+1).map(teimor099CellText).find(v=>v && !isTeimorText(v) && !isNonRecipientText(v) && !looksLikeCalculationLine(v));
      if(value) return value;
    }
  }
  return '';
}
rowValueAfterLabel = rowValueAfterLabelV099;

function detectDateV099(flat){
  for(const record of (flat||[]).slice(0,180)){
    const row=record.raw||[];
    for(let i=0;i<row.length;i++){
      const cell=teimor099CellText(row[i]);
      if(teimor099IsDateLabel(cell)){
        const own=parseDateValueV099(cell); if(own) return own;
        for(const next of row.slice(i+1,i+7)){ const found=parseDateValueV099(next); if(found) return found; }
        for(const next of (flat||[])){
          if(next.sheet!==record.sheet || next.rowIndex<=record.rowIndex || next.rowIndex>record.rowIndex+4) continue;
          const sameColumn=parseDateValueV099((next.raw||[])[i]); if(sameColumn) return sameColumn;
          const any=(next.raw||[]).map(parseDateValueV099).find(Boolean); if(any) return any;
        }
      }
    }
  }
  for(const record of (flat||[]).slice(0,180)){
    for(const cell of (record.raw||[])){
      const found=parseDateValueV099(cell);
      if(found) return found;
    }
  }
  return '';
}
detectDate = detectDateV099;

function detectBudgetNumberV099(fileName, flat){
  const value=teimor099FindValue(flat,['nº pressupost','n pressupost','numero pressupost','número pressupost','pressupost núm.','presupuesto nº','presupuesto numero'],v=>!parseDateValueV099(v));
  if(value) return value;
  const base=fileName.split('/').pop().replace(/\.(xls|xlsx|xlsm|csv)$/i,'');
  const match=base.match(/^\s*(\d{1,8})\b/);
  return match ? match[1] : base;
}
detectBudgetNumber = detectBudgetNumberV099;

function detectBudgetConceptV099(fileName, flat){
  const aliases=[
    'concepte principal','concepto principal','concepte / descripció','concepto / descripción',
    'concepte','concepto','descripció','descripción','descripcion','obra','treball','trabajo','feina'
  ];
  const value=teimor099FindValue(flat,aliases,v=>v.length>1 && !isTeimorText(v));
  return value || guessNameFromFile(fileName);
}
detectBudgetConcept = detectBudgetConceptV099;

function detectClientV099(fileName, flat){
  const recipient=detectRecipientBlock(flat);
  const explicitName=teimor099FindValue(flat,[
    'client / empresa','client','cliente','destinatari','destinatario','senyors','sres',
    'promotor','propietari','propiedad','comunitat','comunidad'
  ],v=>isProbablyClientName(v) && !isTeimorText(v));
  let name=explicitName || (isProbablyClientName(recipient.name) ? recipient.name : '');
  name=cleanClientName(name);
  if(name==='Client pendent de revisar') name='Client pendent de revisar';
  const context=[recipient.text,explicitName,recipient.fiscalAddress].filter(Boolean).join('\n');
  const nif=firstRegex(context,/\b(?!B55271159\b)([A-HJNP-SUVW][0-9]{7}[0-9A-J]|[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])\b/i) || teimor099FindValue(flat,['nif','dni','cif'],v=>!isTeimorText(v));
  const email=firstRegex(context,/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || teimor099FindValue(flat,['email','e-mail','correo'],v=>/@/.test(v));
  const phone=detectPhone(context) || teimor099FindValue(flat,['telèfon','telefono','tel','mòbil','movil'],v=>/\d{8,}/.test(v));
  const workAddress=recipient.address || teimor099FindValue(flat,['adreça obra','direcció obra','direccion obra','emplaçament','emplazamiento','domicili','domicilio'],v=>!isTeimorText(v)) || '';
  const city=recipient.city || teimor099FindValue(flat,['municipi','municipio','població','poblacion','localitat','localidad'],v=>!isTeimorText(v)) || extractCityFromLine(workAddress);
  const reviewIssues=[];
  if(name==='Client pendent de revisar') reviewIssues.push('No s’ha detectat un nom de client segur.');
  if(!workAddress) reviewIssues.push('No s’ha detectat l’adreça de l’obra.');
  return {
    id:uid('CLI'), tempKey:uid('TMPCLI'), name, nif:nif||'', phone:phone||'', email:email||'',
    contact:'', fiscalAddress:recipient.fiscalAddress||'', workAddress, city:city||'',
    status:'Actiu', source:fileName, sourceFiles:[fileName], reviewIssues,
    needsReview:reviewIssues.length>0, notes:'Client detectat automàticament. Validar la fitxa abans de donar-lo per bo.'
  };
}
detectClient = detectClientV099;

function headerMapV099(row){
  const map={};
  (row||[]).forEach((cell,index)=>{
    const s=teimor099LabelNorm(cell);
    if(!s) return;
    if(/^(codi|codigo|cod|partida|item|n[úu]m|numero)$/.test(s)) map.code=index;
    if(/(concepte|concepto|descripcio|descripción|descripcion|detall|detalle)/.test(s)) map.desc=index;
    if(/^(ut|ud|uds|unitat|unidad|u\.?m\.?)$/.test(s)) map.unit=index;
    if(/(quantitat|cantidad|amidament|medicio|medicion|rendiment|rendimiento)/.test(s)) map.qty=index;
    if(/(preu|precio).*(ut|unit|unitari|unitario)|^p\.?u\.?$|preu unitari|precio unitario|preu\/ut|precio\/ud/.test(s)) map.pu=index;
    if(/^(import|importe|total|subtotal|preu total|precio total)$/.test(s) || /(import|importe|total)/.test(s)) map.total=index;
    if(/capitol|capitulo|chapter/.test(s)) map.chapter=index;
  });
  return map;
}
headerMap = headerMapV099;

function parseWorkbookV099(fileName, arrayBuffer){
  const warnings=[];
  const wb=XLSX.read(arrayBuffer,{type:'array',cellDates:true,raw:true,cellNF:true,cellText:true});
  const sheets=wb.SheetNames.map(name=>({
    name,
    aoa:XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:true,blankrows:false})
  }));
  const flat=[];
  sheets.forEach(sheet=>sheet.aoa.forEach((row,rowIndex)=>{
    flat.push({sheet:sheet.name,rowIndex,cells:(row||[]).map(teimor099CellText).filter(Boolean),raw:row||[]});
  }));
  warnings.push(fileName+': '+sheets.length+' pestanya/es llegides.');
  const client=detectClientV099(fileName,flat);
  const detectedDate=detectDateV099(flat);
  const year=detectedDate ? Number(detectedDate.slice(0,4)) : detectYear(fileName,flat);
  const parsedItems=[];
  const sheetTotals=[];
  sheets.forEach(sheet=>{
    const rows=sheet.aoa.map(row=>(row||[]).map(teimor099CellText));
    const total=findBestTotal(rows);
    if(total) sheetTotals.push(total);
    parsedItems.push(...detectItemsFromSheet(fileName,sheet.name,sheet.aoa));
  });
  const importedBase=sheetTotals.length ? Math.max(...sheetTotals) : 0;
  if(importedBase) warnings.push(fileName+': total/base imposable detectat: '+money(importedBase)+'.');
  if(client.reviewIssues?.length) warnings.push(fileName+': '+client.reviewIssues.join(' '));
  if(!detectedDate) warnings.push(fileName+': data no detectada amb seguretat; s’ha utilitzat l’any del fitxer o l’any actual.');
  const number=detectBudgetNumberV099(fileName,flat);
  const title=detectBudgetConceptV099(fileName,flat) || detectJobTitle(fileName,flat);
  const job={id:uid('F'),year,clientTempKey:client.tempKey,title,address:client.workAddress||detectAddress(flat),city:client.city||'',status:'Històrica',source:fileName,notes:'Importada automàticament des d’Excel antic.'};
  const budget={id:uid('P'),number,date:detectedDate||String(year)+'-01-01',clientTempKey:client.tempKey,jobTempKey:job.id,title,status:'Històric importat',ci:data.settings.defaultCI,dge:data.settings.defaultDGE,bi:data.settings.defaultBI,iva:data.settings.defaultIVA,importedBase,source:fileName,notes:'Pressupost importat. Revisa clients, data, concepte i partides abans de confirmar.',lines:[]};
  budget.lines=parsedItems.map(item=>({...item,id:uid('LIN')}));
  const items=parsedItems.map(item=>({...item,origin:fileName,sourceBudget:budget.number||fileName}));
  if(!title || title===guessNameFromFile(fileName)) warnings.push(fileName+': concepte principal no identificat amb una etiqueta clara.');
  if(!parsedItems.length) warnings.push(fileName+': no s’han detectat partides separades.');
  return {client,job,budget,items,warnings};
}
parseWorkbook = parseWorkbookV099;

function teimor099MeaningfulClientName(client){
  const name=cleanText(client?.name);
  return !!name && !/^client pendent de revisar$/i.test(name) && isProbablyClientName(name);
}
function teimor099StrongClientKeys(client){
  const keys=[];
  const nif=normKey(client?.nif).replace(/\s+/g,'');
  const email=strip(client?.email);
  const phone=String(client?.phone||'').replace(/\D/g,'');
  if(nif) keys.push('nif:'+nif);
  if(email) keys.push('email:'+email);
  if(phone.length>=8) keys.push('phone:'+phone.slice(-9));
  return keys;
}
function teimor099PotentialClientMatch(a,b){
  if(teimor099StrongClientKeys(a).some(key=>teimor099StrongClientKeys(b).includes(key))) return true;
  const na=normKey(a?.name), nb=normKey(b?.name);
  return teimor099MeaningfulClientName(a) && teimor099MeaningfulClientName(b) && na===nb;
}
function teimor099ClientConflicts(a,b){
  const fields=[
    ['name',x=>normKey(x?.name),teimor099MeaningfulClientName],
    ['nif',x=>normKey(x?.nif),x=>!!normKey(x?.nif)],
    ['email',x=>strip(x?.email),x=>!!strip(x?.email)],
    ['phone',x=>String(x?.phone||'').replace(/\D/g,''),x=>String(x?.phone||'').replace(/\D/g,'').length>=8],
    ['workAddress',x=>normKey(x?.workAddress),x=>!!normKey(x?.workAddress)],
    ['city',x=>normKey(x?.city),x=>!!normKey(x?.city)]
  ];
  return fields.filter(([,normal,has])=>has(a)&&has(b)&&normal(a)!==normal(b)).map(([name])=>name);
}
function teimor099CanMergeClients(a,b){
  const strong=teimor099StrongClientKeys(a).some(key=>teimor099StrongClientKeys(b).includes(key));
  const sameName=teimor099MeaningfulClientName(a)&&teimor099MeaningfulClientName(b)&&normKey(a.name)===normKey(b.name);
  if(!strong && !sameName) return false;
  const conflicts=teimor099ClientConflicts(a,b);
  if(conflicts.some(field=>['name','workAddress','city'].includes(field))) return false;
  return true;
}
function teimor099MergeClientData(target,source){
  const merged={...target};
  for(const key of ['name','nif','phone','email','contact','fiscalAddress','workAddress','city','status']){
    if(!merged[key] || /^client pendent/i.test(merged[key])) merged[key]=source[key]||merged[key];
  }
  merged.sourceFiles=[...new Set([...(merged.sourceFiles||[]),...(source.sourceFiles||[source.source]).filter(Boolean)])];
  merged.source=merged.sourceFiles.join(' | ');
  merged.reviewIssues=[...new Set([...(merged.reviewIssues||[]),...(source.reviewIssues||[])])];
  merged.needsReview=!!(merged.needsReview || source.needsReview);
  merged.notes=[merged.notes,source.notes].filter(Boolean).join('\n');
  return merged;
}
function mergePreviewClientsV099(clients){
  const output=[];
  for(const raw of clients||[]){
    const client={...raw,reviewIssues:[...(raw.reviewIssues||[])]};
    const matches=output.filter(existing=>teimor099PotentialClientMatch(existing,client));
    const mergeTarget=matches.find(existing=>teimor099CanMergeClients(existing,client));
    if(mergeTarget){
      mergeTarget._tempKeys=[...(mergeTarget._tempKeys||[mergeTarget.tempKey]),client.tempKey].filter(Boolean);
      Object.assign(mergeTarget,teimor099MergeClientData(mergeTarget,client));
      continue;
    }
    if(matches.length){
      const candidates=matches.map(existing=>existing.tempKey).filter(Boolean);
      client.duplicateReview='pendent';
      client.duplicateCandidateTempKeys=candidates;
      client.reviewIssues=[...new Set([...(client.reviewIssues||[]),'Possible duplicat respecte un altre client importat.'])];
      for(const existing of matches){
        existing.duplicateReview='pendent';
        existing.duplicateCandidateTempKeys=[...(existing.duplicateCandidateTempKeys||[]),client.tempKey].filter(Boolean);
        existing.reviewIssues=[...new Set([...(existing.reviewIssues||[]),'Possible duplicat respecte una altra variant importada.'])];
      }
    }
    output.push(client);
  }
  return output;
}
mergePreviewClients = mergePreviewClientsV099;

function teimor099DiagnosticKeys(client){
  const keys=teimor099StrongClientKeys(client);
  const name=normKey(client?.name);
  if(teimor099MeaningfulClientName(client) && name) keys.push('name:'+name);
  return [...new Set(keys)];
}
function teimor099DuplicateGroups(list){
  const items=(list||[]).filter(Boolean);
  const parent=new Map(items.map((item,index)=>[item.id||item.tempKey||String(index),item.id||item.tempKey||String(index)]));
  const keyOf=item=>item.id||item.tempKey;
  const findRoot=id=>{
    let root=id;
    while(parent.get(root) && parent.get(root)!==root) root=parent.get(root);
    let current=id;
    while(parent.get(current) && parent.get(current)!==current){ const next=parent.get(current); parent.set(current,root); current=next; }
    return root;
  };
  const union=(a,b)=>{
    const ra=findRoot(a), rb=findRoot(b);
    if(ra!==rb) parent.set(rb,ra);
  };
  const owners=new Map();
  for(const item of items){
    for(const key of teimor099DiagnosticKeys(item)){
      if(owners.has(key)) union(keyOf(item),owners.get(key));
      else owners.set(key,keyOf(item));
    }
  }
  const grouped=new Map();
  for(const item of items){
    const root=findRoot(keyOf(item));
    if(!grouped.has(root)) grouped.set(root,[]);
    grouped.get(root).push(item);
  }
  return [...grouped.values()].filter(group=>group.length>1).map((members,index)=>{
    const ids=members.map(x=>keyOf(x)).sort();
    return {key:ids.join('|')||'group-'+index,members,reason:teimor099DuplicateReason(members)};
  });
}
function teimor099DuplicateReason(members){
  const same=(getter,normalize=normKey)=>{
    const values=members.map(getter).map(normalize).filter(Boolean);
    return values.length>1 && new Set(values).size===1;
  };
  if(same(x=>x.nif)) return 'Mateix NIF/DNI/CIF';
  if(same(x=>x.email,strip)) return 'Mateix email';
  if(same(x=>x.phone,x=>String(x||'').replace(/\D/g,''))) return 'Mateix telèfon';
  if(same(x=>x.name)) {
    const addresses=members.map(x=>normKey(x.workAddress)).filter(Boolean);
    if(addresses.length>1 && new Set(addresses).size===1) return 'Mateix nom i adreça';
    return 'Mateix nom de client';
  }
  return 'Dades d’identificació coincidents';
}
function teimor099ClientSource(client){
  return (client?.sourceFiles||[client?.source]).filter(Boolean).join(' | ');
}
function teimor099ClientNeedsReview(client){
  return !teimor099MeaningfulClientName(client) || client?.duplicateReview==='pendent' || (client?.reviewIssues||[]).length>0;
}
function teimor099ClientReviewLabel(client){
  if(!teimor099MeaningfulClientName(client)) return 'Sense nom';
  if(client?.duplicateReview==='pendent') return 'Duplicat possible';
  if((client?.reviewIssues||[]).length) return 'Revisar';
  if(client?.duplicateReview==='validat') return 'Validat';
  return 'Correcte';
}
function teimor099ClientReviewPill(client){
  const label=teimor099ClientReviewLabel(client);
  return statusPill(label);
}
function teimor099ClientBudgetCount(clientId){
  return (data.budgets||[]).filter(b=>b.clientId===clientId).length;
}

clientsTable = function(rows=data.clients){
  rows=sortByClientField(rows);
  if(!rows.length) return empty();
  const headers=['Sel.','Client','NIF/DNI/CIF','Contacte','Telèfon','Email','Adreça obra','Revisió','Origen','Accions'];
  return table(headers,rows.map(c=>'<tr>'+
    '<td><input type="checkbox" class="select-client" value="'+esc(c.id)+'"></td>'+
    '<td><strong>'+esc(c.name||'Client pendent de revisar')+'</strong><br><span class="muted">'+esc(c.id||'')+'</span></td>'+
    '<td>'+esc(c.nif||'')+'</td>'+
    '<td>'+esc(c.contact||'')+'</td>'+
    '<td>'+esc(c.phone||'')+'</td>'+
    '<td>'+esc(c.email||'')+'</td>'+
    '<td>'+esc(c.workAddress||c.fiscalAddress||'')+'</td>'+
    '<td>'+teimor099ClientReviewPill(c)+'</td>'+
    '<td><span class="small-text">'+esc(teimor099ClientSource(c))+'</span></td>'+
    '<td class="nowrap"><button class="ghost small" data-edit-client="'+esc(c.id)+'">Editar</button> <button class="danger small" data-delete-client="'+esc(c.id)+'">Eliminar</button></td>'+
  '</tr>'));
};

function teimor099ClientDiagnosticsHtml(){
  const allGroups=teimor099DuplicateGroups(data.clients||[]);
  const groups=allGroups.filter(group=>group.members.some(client=>client.duplicateReview!=='validat'));
  const unnamed=(data.clients||[]).filter(client=>!teimor099MeaningfulClientName(client));
  const flagged=(data.clients||[]).filter(client=>teimor099ClientNeedsReview(client)).length;
  if(!groups.length && !unnamed.length){
    return '<div class="card notice-green"><strong>Depuració de clients:</strong> no hi ha duplicats ni clients sense nom detectats automàticament.</div>';
  }
  let html='<div class="card notice-red" id="clientDiagnostics"><div class="toolbar"><div><h2>Depuració de clients</h2><p>He detectat '+flagged+' fitxa/es que convé revisar. No s’elimina ni es fusiona cap client automàticament.</p></div><button class="ghost small" data-refresh-client-diagnostics>Actualitzar revisió</button></div>';
  if(groups.length){
    html+='<h3>Possibles clients repetits</h3>';
    groups.forEach((group,index)=>{
      html+='<div class="detail-box client-duplicate-group"><div class="toolbar"><div><strong>Grup '+(index+1)+'</strong><br><span class="small-text">'+esc(group.reason)+'</span></div><button class="ghost small" data-client-review-group="'+esc(group.key)+'">Marcar grup com a validat</button></div>';
      html+=table(['Client','Identificació','Adreça / municipi','Pressupostos','Origen','Acció'],group.members.map(client=>'<tr>'+
        '<td><strong>'+esc(client.name||'Client pendent de revisar')+'</strong></td>'+
        '<td>'+esc(client.nif||client.email||client.phone||'Sense identificador')+'</td>'+
        '<td>'+esc([client.workAddress,client.city].filter(Boolean).join(' · '))+'</td>'+
        '<td class="num">'+teimor099ClientBudgetCount(client.id)+'</td>'+
        '<td><span class="small-text">'+esc(teimor099ClientSource(client))+'</span></td>'+
        '<td><button class="ghost small" data-client-diagnostic-edit="'+esc(client.id)+'">Editar / validar</button></td>'+
      '</tr>'));
      html+='</div>';
    });
  }
  if(unnamed.length){
    html+='<h3>Clients sense nom segur</h3>';
    html+=table(['Client actual','Adreça / municipi','Pressupostos','Origen','Acció'],unnamed.map(client=>'<tr>'+
      '<td>'+esc(client.name||'Client pendent de revisar')+'</td>'+
      '<td>'+esc([client.workAddress,client.city].filter(Boolean).join(' · '))+'</td>'+
      '<td class="num">'+teimor099ClientBudgetCount(client.id)+'</td>'+
      '<td><span class="small-text">'+esc(teimor099ClientSource(client))+'</span></td>'+
      '<td><button class="ghost small" data-client-diagnostic-edit="'+esc(client.id)+'">Editar nom</button></td>'+
    '</tr>'));
  }
  return html+'</div>';
}
function teimor099BindClientDiagnosticEvents(){
  document.querySelectorAll('[data-client-diagnostic-edit]').forEach(button=>button.onclick=()=>renderClients(button.dataset.clientDiagnosticEdit));
  document.querySelectorAll('[data-refresh-client-diagnostics]').forEach(button=>button.onclick=()=>renderClients());
  document.querySelectorAll('[data-client-review-group]').forEach(button=>button.onclick=()=>{
    const group=teimor099DuplicateGroups(data.clients||[]).find(item=>item.key===button.dataset.clientReviewGroup);
    if(!group) return;
    group.members.forEach(client=>{
      client.duplicateReview='validat';
      client.duplicateReviewDate=today();
      client.notes=[client.notes,'Duplicat revisat i validat manualment el '+today()+'.'].filter(Boolean).join('\n');
    });
    saveData();
    renderClients();
  });
}
const __teimorBaseRenderClientsV099=renderClients;
renderClients=function(editId=''){
  if(editId) return __teimorBaseRenderClientsV099(editId);
  __teimorBaseRenderClientsV099();
  const tableElement=document.getElementById('clientsTable');
  if(tableElement) tableElement.insertAdjacentHTML('beforebegin',teimor099ClientDiagnosticsHtml());
  teimor099BindClientDiagnosticEvents();
};

function teimor099FindExistingClients(client){
  return (data.clients||[]).filter(existing=>teimor099PotentialClientMatch(existing,client));
}
function teimor099AppendDuplicateLink(client,otherId){
  client.duplicateReview='pendent';
  client.duplicateCandidateIds=[...(client.duplicateCandidateIds||[]),otherId].filter(Boolean);
  client.notes=[client.notes,'Possible duplicat pendent de validar.'].filter(Boolean).join('\n');
}
function confirmDraftImportV099(){
  const draft=state.importDraft;
  if(!draft) return;
  const clientIdByTemp=new Map();
  const clientByTemp=new Map();
  let duplicateCount=0;
  for(const client of draft.clients||[]){
    let matches=teimor099FindExistingClients(client);
    const reusable=matches.find(existing=>teimor099CanMergeClients(existing,client) && client.duplicateReview!=='pendent');
    let id='';
    if(reusable){
      Object.assign(reusable,teimor099MergeClientData(reusable,client));
      id=reusable.id;
    } else {
      const copy={...client,id:client.id||uid('CLI')};
      delete copy._tempKeys;
      delete copy.tempKey;
      copy.sourceFiles=copy.sourceFiles||[copy.source].filter(Boolean);
      copy.source=copy.sourceFiles.join(' | ');
      if(matches.length || copy.duplicateReview==='pendent'){
        copy.duplicateReview='pendent';
        duplicateCount++;
        const ids=matches.map(existing=>existing.id).filter(Boolean);
        copy.duplicateCandidateIds=[...(copy.duplicateCandidateIds||[]),...ids].filter(Boolean);
        matches.forEach(existing=>teimor099AppendDuplicateLink(existing,copy.id));
      }
      data.clients.push(copy);
      id=copy.id;
    }
    const aliases=(client._tempKeys||[client.tempKey]).filter(Boolean);
    aliases.forEach(temp=>{ clientIdByTemp.set(temp,id); clientByTemp.set(temp,client); });
  }
  // Les variants que ja venien marcades al previsualitzar també queden vinculades.
  for(const client of draft.clients||[]){
    const id=clientIdByTemp.get(client.tempKey);
    const record=byId(data.clients,id);
    if(!record) continue;
    for(const temp of client.duplicateCandidateTempKeys||[]){
      const otherId=clientIdByTemp.get(temp);
      if(otherId && otherId!==record.id) teimor099AppendDuplicateLink(record,otherId);
    }
  }
  for(const job of draft.jobs||[]){
    const clientId=clientIdByTemp.get(job.clientTempKey)||'';
    const existingJob=findExistingJob(job,clientId);
    if(existingJob){
      Object.assign(existingJob,{...job,id:existingJob.id,clientId});
    } else {
      data.jobs.push({...job,id:job.id||uid('F'),clientId});
    }
  }
  let added=0, skipped=0;
  for(const budgetDraft of draft.budgets||[]){
    const clientId=clientIdByTemp.get(budgetDraft.clientTempKey)||'';
    const jobDraft=(draft.jobs||[]).find(job=>job.id===budgetDraft.jobTempKey);
    let jobId='';
    if(jobDraft){
      const jobExisting=findExistingJob(jobDraft,clientId);
      jobId=jobExisting?.id || jobDraft.id;
    }
    const budget={...budgetDraft,clientId,jobId};
    delete budget.clientTempKey;
    delete budget.jobTempKey;
    budget.lines=(budget.lines||[]).map(line=>({...line,id:line.id||uid('LIN')}));
    data.budgets.push(budget);
    if(jobId){
      const job=byId(data.jobs,jobId);
      if(job && !job.mainBudgetId) job.mainBudgetId=budget.id;
    }
  }
  for(const item of draft.items||[]){
    const existing=findExistingLibraryItem(item);
    if(existing){
      existing.history=existing.history||[];
      existing.history.push({origin:item.origin,unitPrice:item.unitPrice,total:item.total,qty:item.qty,status:item.status,date:today()});
      skipped++;
    } else {
      data.library.push({id:uid('LIB'),code:item.code||makeAutoCode(item),chapter:item.chapter,unit:item.unit,concept:item.concept,longDesc:item.longDesc,directCost:'',unitPrice:item.unitPrice||'',ci:data.settings.defaultCI,dge:data.settings.defaultDGE,bi:data.settings.defaultBI,origin:item.origin,status:item.status,decomp:[],history:[{origin:item.origin,unitPrice:item.unitPrice,total:item.total,qty:item.qty,status:item.status,date:today()}]});
      added++;
    }
  }
  const reviewCount=(data.clients||[]).filter(teimor099ClientNeedsReview).length;
  data.importLogs=data.importLogs||[];
  data.importLogs.push({id:uid('IMP'),date:new Date().toISOString(),files:draft.files,countClients:draft.clients?.length||0,countBudgets:draft.budgets?.length||0,countItems:draft.items?.length||0,libraryAdded:added,libraryDuplicated:skipped,clientDuplicates:duplicateCount});
  state.importDraft=null;
  saveData();
  alert('Importació confirmada. Partides noves: '+added+'. Possibles repetits de llibreria: '+skipped+'. Clients pendents de revisar: '+reviewCount+'.');
  state.view='clients';
  render();
}
confirmDraftImport=confirmDraftImportV099;

const __teimorBaseImportPreviewHtmlV099=importPreviewHtml;
importPreviewHtml=function(d){
  const groups=teimor099DuplicateGroups(d.clients||[]);
  const reviewCount=(d.clients||[]).filter(teimor099ClientNeedsReview).length;
  const issueBox='<div class="card notice-red"><strong>Revisió abans de confirmar:</strong> '+reviewCount+' client/s tenen dades incompletes o dubtoses i '+groups.length+' grup/s poden estar repetits. Després de confirmar, ho podràs validar dins la pestanya Clients; no es fusionaran variants conflictives automàticament.</div>';
  let duplicateBox='';
  if(groups.length){
    duplicateBox='<div class="card notice-red"><h3>Possibles duplicats detectats a la importació</h3>'+groups.map((group,index)=>'<p><strong>Grup '+(index+1)+':</strong> '+esc(group.reason)+' · '+group.members.map(client=>esc(client.name||'Client pendent de revisar')).join(' / ')+'</p>').join('')+'</div>';
  }
  return __teimorBaseImportPreviewHtmlV099(d)
    .replace('<div class="import-summary">',issueBox+'<div class="import-summary">')
    .replace('<h3>Clients detectats</h3>',duplicateBox+'<h3>Clients detectats</h3>');
};

function teimor099ChapterList(){
  const fixed=typeof TEIMOR_CHAPTERS_V096!=='undefined' ? TEIMOR_CHAPTERS_V096 : [];
  return [...new Set([...(data.library||[]).map(item=>item.chapter).filter(Boolean),...fixed])]
    .sort((a,b)=>String(a).localeCompare(String(b),'ca',{numeric:true}));
}
function teimor099ChapterDatalist(selected){
  return '<datalist id="teimorChapterSuggestions">'+teimor099ChapterList().map(ch=>'<option value="'+esc(ch)+'"></option>').join('')+'</datalist>';
}
function openChangeLibraryChapterModal(id){
  const item=byId(data.library,id);
  if(!item) return alert('No s’ha trobat aquesta partida.');
  openModal('<h2>Canviar capítol de la partida</h2>'+
    '<form id="libraryChapterForm" class="form-grid">'+
      '<input type="hidden" name="id" value="'+esc(id)+'">'+
      '<label class="full">Partida<input readonly value="'+esc(item.code||'')+' · '+esc(item.concept||'')+'"></label>'+
      '<label class="full">Capítol actual<input readonly value="'+esc(item.chapter||'Sense capítol')+'"></label>'+
      '<label class="full">Nou capítol<input name="chapter" list="teimorChapterSuggestions" required value="'+esc(item.chapter||'Altres / revisar')+'">'+teimor099ChapterDatalist(item.chapter)+'</label>'+
      '<div class="actions full"><button class="primary">Guardar capítol</button><button class="ghost" type="button" id="closeModalBtn">Cancel·lar</button></div>'+
    '</form>'+
    '<p class="small-text">També s’actualitzarà el capítol de les línies de pressupost que utilitzen aquesta partida de llibreria.</p>');
}
function saveLibraryChapterV099(e){
  e.preventDefault();
  const f=formObj(e.target);
  const item=byId(data.library,f.id);
  if(!item) return;
  const chapter=cleanText(f.chapter)||'Altres / revisar';
  const previous=item.chapter||'Sense capítol';
  item.chapter=chapter;
  for(const budget of data.budgets||[]){
    for(const line of budget.lines||[]){
      if(line.libraryId===item.id) line.chapter=chapter;
    }
  }
  data.importLogs=data.importLogs||[];
  data.importLogs.push({id:uid('EDIT'),date:new Date().toISOString(),type:'Canvi de capítol de llibreria',libraryId:item.id,from:previous,to:chapter});
  saveData();
  closeModal();
  renderLibrary();
}

const __teimorBaseOpenLibModalV099= openLibModal;
openLibModal=function(id=''){
  __teimorBaseOpenLibModalV099(id);
  const form=document.getElementById('libForm');
  const chapterControl=form?.querySelector('[name="chapter"]');
  if(chapterControl && chapterControl.tagName==='SELECT'){
    const input=document.createElement('input');
    input.name='chapter';
    input.value=chapterControl.value||'Altres / revisar';
    input.setAttribute('list','teimorChapterSuggestions');
    input.setAttribute('aria-label','Capítol de la partida');
    chapterControl.replaceWith(input);
    const label=input.closest('label');
    if(label) label.insertAdjacentHTML('beforeend',teimor099ChapterDatalist(input.value));
  }
};

const __teimorBaseSaveLibraryItemV099=saveLibraryItem;
saveLibraryItem=function(e){
  const form=e.target;
  const f=formObj(form);
  const old=byId(data.library,f.editId);
  if(old && f.chapter){
    const chapter=cleanText(f.chapter)||'Altres / revisar';
    for(const budget of data.budgets||[]){
      for(const line of budget.lines||[]){
        if(line.libraryId===old.id) line.chapter=chapter;
      }
    }
  }
  return __teimorBaseSaveLibraryItemV099(e);
};

libraryTable=function(rows){
  if(!rows.length) return empty();
  return '<div class="table-wrap library-mini-table"><table><thead><tr>'+
    '<th>Sel.</th>'+sortableTh('Codi','library','code')+'<th>Ut</th>'+sortableTh('Descripció curta','library','concept')+
    sortableTh('PU final','library','pu')+'<th>Estat</th><th>Origen</th><th>Accions</th>'+
    '</tr></thead><tbody>'+rows.map(item=>'<tr>'+
      '<td><input type="checkbox" class="select-library" value="'+esc(item.id)+'"></td>'+
      '<td><strong>'+esc(item.code||'')+'</strong></td>'+
      '<td>'+esc(item.unit||'')+'</td>'+
      '<td><button class="linklike" data-view-lib="'+esc(item.id)+'"><strong>'+esc(item.concept||'')+'</strong></button></td>'+
      '<td class="num">'+money(item.unitPrice||libFinal(item))+'</td>'+
      '<td>'+statusPill(item.status||'Pendent')+'</td>'+
      '<td>'+esc(item.origin||'')+'</td>'+
      '<td class="nowrap"><button class="ghost small" data-view-lib="'+esc(item.id)+'">Veure / editar</button> <button class="ghost small" data-change-lib-chapter="'+esc(item.id)+'">Canviar capítol</button> <button class="danger small" data-delete-lib="'+esc(item.id)+'">Eliminar</button></td>'+
    '</tr>').join('')+'</tbody></table></div>';
};

const __teimorBaseBindViewEventsV099=bindViewEvents;
bindViewEvents=function(){
  __teimorBaseBindViewEventsV099();
  document.querySelectorAll('[data-change-lib-chapter]').forEach(button=>button.onclick=()=>openChangeLibraryChapterModal(button.dataset.changeLibChapter));
  if(state.view==='clients') teimor099BindClientDiagnosticEvents();
};
const __teimorBaseBindModalEventsV099=bindModalEvents;
bindModalEvents=function(){
  __teimorBaseBindModalEventsV099();
  const chapterForm=document.getElementById('libraryChapterForm');
  if(chapterForm) chapterForm.onsubmit=saveLibraryChapterV099;
};

/* =========================================================
   TEIMOR V09.10 · FUSIÓ CONTROLADA DE CLIENTS I IMPORTACIÓ NETA
   - Fusiona duplicats segurs mantenint una única fitxa de client.
   - Reassigna obres, pressupostos, factures i adjunts sense perdre dades.
   - Conserva totes les adreces d’obra i els fitxers d’origen.
   - No incorpora files sense preu ni línies de mesurament com a partides.
   - Evita duplicar partides quan el mateix Excel té pestanyes repetides.
   ========================================================= */

data.meta = data.meta || {};
data.meta.version = '9.10.0-fusio-clients-importacio-neta';
data.clientMergeBackups = Array.isArray(data.clientMergeBackups) ? data.clientMergeBackups : [];

function teimor0910Clone(value){
  return JSON.parse(JSON.stringify(value));
}
function teimor0910MeaningfulName(client){
  const name=cleanText(client?.name);
  return !!name && !/^client pendent de revisar$/i.test(name) && (typeof teimor099MeaningfulClientName==='function' ? teimor099MeaningfulClientName(client) : name.length>2);
}
function teimor0910Nif(client){
  const source=cleanText(client?.nif || client?.fiscalAddress || '');
  const match=source.match(/\b(?!B55271159\b)([A-HJNP-SUVW][0-9]{7}[0-9A-J]|[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])\b/i);
  return (match ? match[0] : client?.nif || '').toUpperCase().replace(/[^A-Z0-9]/g,'');
}
function teimor0910Email(client){
  return strip(client?.email || '').replace(/\s+/g,'');
}
function teimor0910Phone(client){
  const value=String(client?.phone || '').replace(/\D/g,'');
  return value.length>=8 ? value.slice(-9) : '';
}
function teimor0910NormName(value){
  return normKey(value).replace(/\b(s\s*l\s*u|s\s*l|s\s*a|slu|sl|sa)\b/g,'').replace(/\s+/g,' ').trim();
}
function teimor0910NormAddress(value){
  return normKey(value).replace(/\b(puerta|porta|piso|planta|esc|escalera|escala)\b/g,'').replace(/\s+/g,' ').trim();
}
function teimor0910ClientIdentity(client){
  return {
    name:teimor0910NormName(client?.name),
    nif:teimor0910Nif(client),
    email:teimor0910Email(client),
    phone:teimor0910Phone(client),
    fiscal:teimor0910NormAddress(client?.fiscalAddress),
    work:teimor0910NormAddress(client?.workAddress),
    city:normKey(client?.city)
  };
}
function teimor0910ClientRelation(a,b){
  const left=teimor0910ClientIdentity(a), right=teimor0910ClientIdentity(b);
  if(left.nif && left.nif===right.nif) return 'Mateix NIF/CIF/DNI';
  if(left.email && left.email===right.email && (left.name===right.name || !left.name || !right.name)) return 'Mateix email i nom';
  if(left.phone && left.phone===right.phone && (left.name===right.name || !left.name || !right.name)) return 'Mateix telèfon i nom';
  if(left.name && left.name===right.name && left.fiscal && left.fiscal===right.fiscal) return 'Mateix nom i dades fiscals';
  if(left.name && left.name===right.name && left.work && left.work===right.work) return 'Mateix nom i adreça d’obra';
  return '';
}
function teimor0910DuplicateGroups(list){
  const items=(list||[]).filter(Boolean);
  const parent=items.map((_,index)=>index);
  const findRoot=index=>{
    let root=index;
    while(parent[root]!==root) root=parent[root];
    while(parent[index]!==index){ const next=parent[index]; parent[index]=root; index=next; }
    return root;
  };
  const union=(a,b)=>{
    const ra=findRoot(a), rb=findRoot(b);
    if(ra!==rb) parent[rb]=ra;
  };
  for(let i=0;i<items.length;i++){
    for(let j=i+1;j<items.length;j++){
      const reason=teimor0910ClientRelation(items[i],items[j]);
      if(!reason) continue;
      union(i,j);
    }
  }
  const grouped=new Map();
  items.forEach((item,index)=>{
    const root=findRoot(index);
    if(!grouped.has(root)) grouped.set(root,[]);
    grouped.get(root).push(item);
  });
  return [...grouped.entries()]
    .filter(([,members])=>members.length>1)
    .map(([,members])=>{
      const reasons=[];
      for(let i=0;i<members.length;i++) for(let j=i+1;j<members.length;j++){
        const reason=teimor0910ClientRelation(members[i],members[j]);
        if(reason && !reasons.includes(reason)) reasons.push(reason);
      }
      return {members,reason:(reasons.length?reasons:['Dades d’identificació coincidents']).join(' · ')};
    });
}
function teimor0910ClientScore(client){
  let score=0;
  if(teimor0910MeaningfulName(client)) score+=100;
  if(teimor0910Nif(client)) score+=50;
  if(teimor0910Email(client)) score+=25;
  if(teimor0910Phone(client)) score+=20;
  if(teimor0910NormAddress(client?.fiscalAddress)) score+=15;
  if(teimor0910NormAddress(client?.workAddress)) score+=5;
  score+=Math.min(20,(client?.sourceFiles||[]).length);
  score+=Math.min(20,(data.budgets||[]).filter(b=>b.clientId===client.id).length*2);
  return score;
}
function teimor0910MergeClientFields(target,source){
  const targetName=teimor0910MeaningfulName(target);
  const sourceName=teimor0910MeaningfulName(source);
  if(!targetName && sourceName) target.name=source.name;
  for(const field of ['nif','email','phone','contact','fiscalAddress','city','status']){
    if(!cleanText(target[field]) && cleanText(source[field])) target[field]=source[field];
  }
  const names=[...(target.alternateNames||[]),target.name,source.name].filter(name=>teimor0910MeaningfulName({name}));
  target.alternateNames=[...new Set(names.map(cleanText).filter(Boolean))];
  const workAddresses=[...(target.workAddresses||[]),target.workAddress,...(source.workAddresses||[]),source.workAddress].map(cleanText).filter(Boolean);
  target.workAddresses=[...new Set(workAddresses)];
  if(!target.workAddress) target.workAddress=target.workAddresses[0]||'';
  const fiscalAddresses=[...(target.fiscalAddresses||[]),target.fiscalAddress,...(source.fiscalAddresses||[]),source.fiscalAddress].map(cleanText).filter(Boolean);
  target.fiscalAddresses=[...new Set(fiscalAddresses)];
  if(!target.fiscalAddress) target.fiscalAddress=target.fiscalAddresses[0]||'';
  const sources=[...(target.sourceFiles||[]),target.source,...(source.sourceFiles||[]),source.source].filter(Boolean);
  target.sourceFiles=[...new Set(sources.flatMap(value=>String(value).split(' | ').map(cleanText).filter(Boolean)))];
  target.source=target.sourceFiles.join(' | ');
  target.notes=[target.notes,source.notes].filter(Boolean).join('\n');
  target.reviewIssues=[...new Set([...(target.reviewIssues||[]),...(source.reviewIssues||[])])];
  target.needsReview=!teimor0910MeaningfulName(target) || target.reviewIssues.length>0;
  target.duplicateReview='validat';
  target.duplicateReviewDate=today();
  target.mergedFromIds=[...new Set([...(target.mergedFromIds||[]),source.id].filter(Boolean))];
  return target;
}
function teimor0910ReferenceCollections(){
  return ['jobs','budgets','invoices','attachments','agenda','certifications','certificates','payments'];
}
function teimor0910SnapshotReferences(ids){
  const snapshot={};
  for(const collection of teimor0910ReferenceCollections()){
    if(!Array.isArray(data[collection])) continue;
    const affected=data[collection].filter(item=>ids.includes(item?.clientId));
    if(affected.length) snapshot[collection]=affected.map(item=>({id:item.id,data:teimor0910Clone(item)}));
  }
  return snapshot;
}
function teimor0910RepointReferences(ids,newId){
  for(const collection of teimor0910ReferenceCollections()){
    if(!Array.isArray(data[collection])) continue;
    data[collection].forEach(item=>{
      if(ids.includes(item?.clientId)) item.clientId=newId;
    });
  }
}
function teimor0910MergeGroup(group){
  const members=[...(group.members||[])].sort((a,b)=>teimor0910ClientScore(b)-teimor0910ClientScore(a));
  const canonical=members[0];
  const oldIds=members.slice(1).map(client=>client.id).filter(Boolean);
  members.slice(1).forEach(client=>teimor0910MergeClientFields(canonical,client));
  const workFromJobs=(data.jobs||[]).filter(job=>[canonical.id,...oldIds].includes(job.clientId)).map(job=>job.address).filter(Boolean);
  canonical.workAddresses=[...new Set([...(canonical.workAddresses||[]),...workFromJobs.map(cleanText).filter(Boolean)])];
  if(!canonical.workAddress) canonical.workAddress=canonical.workAddresses[0]||'';
  teimor0910RepointReferences(oldIds,canonical.id);
  data.clients=data.clients.filter(client=>!oldIds.includes(client.id));
  canonical.mergedDuplicateCount=(canonical.mergedDuplicateCount||0)+oldIds.length;
  canonical.mergeStatus='Fusionat automàticament';
  canonical.mergeGroupReason=group.reason;
  canonical.notes=[canonical.notes,'Clients duplicats fusionats automàticament el '+today()+'. Motiu: '+group.reason+'.'].filter(Boolean).join('\n');
  return {canonicalId:canonical.id,removedIds:oldIds};
}
function teimor0910MergeSafeDuplicateClients(){
  const groups=teimor0910DuplicateGroups(data.clients||[]);
  if(!groups.length) return alert('No hi ha duplicats segurs per fusionar.');
  data.clientMergeBackups=Array.isArray(data.clientMergeBackups) ? data.clientMergeBackups : [];
  const allIds=groups.flatMap(group=>group.members.map(client=>client.id)).filter(Boolean);
  const backup={
    id:uid('CLIBACK'),
    date:new Date().toISOString(),
    beforeClients:teimor0910Clone(data.clients||[]),
    beforeReferences:teimor0910SnapshotReferences(allIds),
    groups:groups.map(group=>({reason:group.reason,ids:group.members.map(client=>client.id)}))
  };
  if(!confirm('Fusionar '+groups.length+' grup/s de clients i conservar una sola fitxa per client?\\n\\nNo es perdran pressupostos ni obres: es reassociaran a la fitxa principal.')) return;
  const result=groups.map(teimor0910MergeGroup);
  data.clientMergeBackups.push(backup);
  if(data.clientMergeBackups.length>5) data.clientMergeBackups=data.clientMergeBackups.slice(-5);
  data.importLogs=data.importLogs||[];
  data.importLogs.push({id:uid('CLIENTMERGE'),date:new Date().toISOString(),type:'Fusió automàtica de clients duplicats',groups:groups.length,removedClients:result.reduce((sum,item)=>sum+item.removedIds.length,0),reasons:groups.map(group=>group.reason)});
  state.selectedClientId='';
  saveData();
  alert('Depuració completada: '+result.reduce((sum,item)=>sum+item.removedIds.length,0)+' fitxes duplicades fusionades en '+groups.length+' client/s principals.');
  renderClients();
}
function teimor0910RestoreLastClientMerge(){
  const backup=data.clientMergeBackups?.[data.clientMergeBackups.length-1];
  if(!backup) return alert('No hi ha cap fusió de clients per restaurar.');
  if(!confirm('Restaurar la darrera fusió de clients? Es tornaran a crear les fitxes duplicades i es reassignaran els pressupostos al seu estat anterior.')) return;
  data.clients=teimor0910Clone(backup.beforeClients||[]);
  for(const [collection,items] of Object.entries(backup.beforeReferences||{})){
    if(!Array.isArray(data[collection])) continue;
    for(const snapshot of items){
      const index=data[collection].findIndex(item=>item.id===snapshot.id);
      if(index>=0) data[collection][index]=teimor0910Clone(snapshot.data);
      else data[collection].push(teimor0910Clone(snapshot.data));
    }
  }
  data.clientMergeBackups.pop();
  data.importLogs=data.importLogs||[];
  data.importLogs.push({id:uid('CLIENTRESTORE'),date:new Date().toISOString(),type:'Restauració de fusió de clients',backupId:backup.id});
  saveData();
  renderClients();
}

const __teimorBaseMergeClientDataV0910=teimor099MergeClientData;
teimor099CanMergeClients=function(a,b){
  return !!teimor0910ClientRelation(a,b);
};
teimor099MergeClientData=function(target,source){
  const merged={...target};
  return teimor0910MergeClientFields(merged,source);
};

const __teimorBaseClientDiagnosticsHtmlV0910=teimor099ClientDiagnosticsHtml;
teimor099ClientDiagnosticsHtml=function(){
  const groups=teimor0910DuplicateGroups(data.clients||[]);
  const restore=data.clientMergeBackups?.length ? '<button class="ghost small" data-restore-client-merge>Restaurar darrera fusió</button>' : '';
  const action=groups.length
    ? '<div class="card notice-blue"><strong>Depuració automàtica disponible:</strong> he trobat '+groups.length+' grup/s amb dades d’identificació coincidents. La fusió mantindrà totes les obres, pressupostos, orígens i adreces d’obra dins d’un únic client.<div class="actions"><button class="primary" data-merge-safe-clients>Fusionar duplicats segurs</button>'+restore+'</div></div>'
    : (restore ? '<div class="card notice-blue"><strong>Última depuració de clients guardada.</strong><div class="actions">'+restore+'</div></div>' : '');
  return action+__teimorBaseClientDiagnosticsHtmlV0910();
};
const __teimorBaseBindClientDiagnosticEventsV0910=teimor099BindClientDiagnosticEvents;
teimor099BindClientDiagnosticEvents=function(){
  __teimorBaseBindClientDiagnosticEventsV0910();
  document.querySelectorAll('[data-merge-safe-clients]').forEach(button=>button.onclick=teimor0910MergeSafeDuplicateClients);
  document.querySelectorAll('[data-restore-client-merge]').forEach(button=>button.onclick=teimor0910RestoreLastClientMerge);
};

const __teimorBaseDetectItemsFromSheetV0910=detectItemsFromSheet;
let teimor0910CurrentItemStats=null;
function teimor0910IsMeasurementSheet(sheetName){
  return /(amidament|amidaments|medicio|medició|medicion|mediciones|measurement|mesurament)/i.test(strip(sheetName));
}
function teimor0910IsSummaryItem(item){
  const concept=strip([item?.concept,item?.longDesc].filter(Boolean).join(' '));
  return /^(sub)?total\b|^base\s+(imposable|imponible)\b|^iva\b|^impostos?\b|^impuestos?\b|^resum\b/.test(concept) && !item?.unit && !num(item?.qty);
}
function teimor0910HasRealPrice(item){
  return num(item?.unitPrice)>0 || num(item?.total)>0;
}
function teimor0910LooksMeasurementOnly(item){
  const unit=strip(item?.unit);
  const qty=num(item?.qty), pu=num(item?.unitPrice), total=num(item?.total);
  const text=strip([item?.concept,item?.longDesc].filter(Boolean).join(' '));
  if(!unit) return false;
  if(!pu && !total) return true;
  if(!pu && /(amidament|medicio|medicion|measurement|mesurament)/.test(text)) return true;
  if(!pu && total && !qty && !/^pa$|^u$|^ud$|^ut$/.test(unit) && !/(€|preu|precio|import|total)/.test(text)) return true;
  return false;
}
function teimor0910HasStructuredHeader(aoa){
  const rows=(aoa||[]).slice(0,100).map(row=>(row||[]).map(teimor099CellText));
  return rows.some(row=>{
    const map=headerMapV099(row);
    const score=['desc','unit','qty','pu','total'].filter(key=>map[key]!==undefined).length;
    return score>=3 && (map.desc!==undefined || map.total!==undefined);
  });
}
function teimor0910DetectItemsFromSheet(fileName,sheetName,aoa){
  const rows=(aoa||[]).map(row=>(row||[]).map(teimor099CellText));
  const candidates=(teimor0910HasStructuredHeader(aoa) ? parseWithHeader(rows,fileName,sheetName) : __teimorBaseDetectItemsFromSheetV0910(fileName,sheetName,aoa))||[];
  const kept=[];
  for(const item of candidates){
    const enriched={...item,importSheet:sheetName};
    if(teimor0910CurrentItemStats) teimor0910CurrentItemStats.candidates++;
    const keep=teimor0910HasRealPrice(enriched) && !teimor0910IsSummaryItem(enriched) && !teimor0910LooksMeasurementOnly(enriched);
    if(keep) kept.push(enriched);
    else if(teimor0910CurrentItemStats){
      if(!teimor0910HasRealPrice(enriched)) teimor0910CurrentItemStats.ignoredNoPrice++;
      else if(teimor0910IsSummaryItem(enriched)) teimor0910CurrentItemStats.ignoredSummary++;
      else if(teimor0910LooksMeasurementOnly(enriched)) teimor0910CurrentItemStats.ignoredMeasurementRows++;
    }
  }
  if(teimor0910CurrentItemStats) teimor0910CurrentItemStats.accepted+=kept.length;
  return kept;
}
detectItemsFromSheet=teimor0910DetectItemsFromSheet;

const __teimorBaseParseWorkbookV0910=parseWorkbook;
function teimor0910MeasurementSheetNames(arrayBuffer){
  const names=new Set();
  const wb=XLSX.read(arrayBuffer,{type:'array',cellDates:true,raw:true,cellNF:true,cellText:true});
  for(const sheetName of wb.SheetNames||[]){
    if(teimor0910IsMeasurementSheet(sheetName)){ names.add(sheetName); continue; }
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:true,blankrows:false});
    const headerText=rows.slice(0,25).flat().map(teimor099CellText).join(' ');
    if(/(amidament|medicio|medicion|measurement|mesurament)/i.test(strip(headerText)) && !/\b(preu|precio|price|p\.?u\.?|import|importe|total)\b/i.test(strip(headerText))) names.add(sheetName);
  }
  return names;
}
parseWorkbook=function(fileName,arrayBuffer){
  const stats={candidates:0,accepted:0,ignoredNoPrice:0,ignoredSummary:0,ignoredMeasurementRows:0,ignoredMeasurementSheetItems:0,duplicatesAcrossSheets:0};
  const measurementSheetNames=teimor0910MeasurementSheetNames(arrayBuffer);
  teimor0910CurrentItemStats=stats;
  const parsed=__teimorBaseParseWorkbookV0910(fileName,arrayBuffer);
  teimor0910CurrentItemStats=null;
  let items=(parsed.items||[]).map(item=>({...item,importSheet:item.importSheet||''}));
  const isMeasurementItem=item=>measurementSheetNames.has(item.importSheet) || teimor0910IsMeasurementSheet(item.importSheet);
  const measurementItems=items.filter(isMeasurementItem);
  const normalItems=items.filter(item=>!isMeasurementItem(item));
  if(normalItems.length && measurementItems.length){
    stats.ignoredMeasurementSheetItems=measurementItems.length;
    items=normalItems;
  }
  const seen=new Set();
  const unique=[];
  for(const item of items){
    const key=[
      normKey(item.code||''),
      normKey(item.chapter||''),
      normKey(item.unit||''),
      normKey(item.concept||item.longDesc||''),
      num(item.qty).toFixed(4),
      num(item.unitPrice).toFixed(4),
      num(item.total).toFixed(4)
    ].join('|');
    if(seen.has(key)){
      stats.duplicatesAcrossSheets++;
      continue;
    }
    seen.add(key);
    unique.push(item);
  }
  parsed.items=unique;
  parsed.budget.lines=unique.map(item=>({...item,id:uid('LIN')}));
  parsed.parseStats=stats;
  parsed.budget.parseStats=stats;
  if(stats.ignoredNoPrice) parsed.warnings.push(fileName+': s’han ignorat '+stats.ignoredNoPrice+' línia/es sense preu o import.');
  if(stats.ignoredMeasurementRows || stats.ignoredMeasurementSheetItems) parsed.warnings.push(fileName+': s’han ignorat '+(stats.ignoredMeasurementRows+stats.ignoredMeasurementSheetItems)+' línia/es de mesurament.');
  if(stats.ignoredSummary) parsed.warnings.push(fileName+': s’han ignorat '+stats.ignoredSummary+' subtotal/s o línia/es de resum.');
  if(stats.duplicatesAcrossSheets) parsed.warnings.push(fileName+': s’han eliminat '+stats.duplicatesAcrossSheets+' duplicat/s detectat/s entre pestanyes.');
  return parsed;
};

const __teimorBaseImportPreviewHtmlV0910=importPreviewHtml;
importPreviewHtml=function(d){
  const stats=(d.budgets||[]).map(b=>b.parseStats).filter(Boolean);
  const totalStats=stats.reduce((acc,item)=>{
    for(const key of Object.keys(acc)) acc[key]+=num(item[key]);
    return acc;
  },{ignoredNoPrice:0,ignoredMeasurementRows:0,ignoredMeasurementSheetItems:0,ignoredSummary:0,duplicatesAcrossSheets:0});
  const notices=[];
  if(totalStats.ignoredNoPrice) notices.push('Files sense preu/import ignorades: '+totalStats.ignoredNoPrice);
  if(totalStats.ignoredMeasurementRows || totalStats.ignoredMeasurementSheetItems) notices.push('Línies de mesurament ignorades: '+(totalStats.ignoredMeasurementRows+totalStats.ignoredMeasurementSheetItems));
  if(totalStats.ignoredSummary) notices.push('Subtotals/resums ignorats: '+totalStats.ignoredSummary);
  if(totalStats.duplicatesAcrossSheets) notices.push('Duplicats entre pestanyes eliminats: '+totalStats.duplicatesAcrossSheets);
  const notice=notices.length ? '<div class="card notice-green"><strong>Neteja aplicada abans de confirmar:</strong><ul>'+notices.map(textValue=>'<li>'+esc(textValue)+'</li>').join('')+'</ul></div>' : '';
  return __teimorBaseImportPreviewHtmlV0910(d).replace('<div class="import-summary">',notice+'<div class="import-summary">');
};

/* =========================================================
   TEIMOR V09.11 · LECTURA ESTRICTA DEL QUADRE DEL CLIENT
   - Client, fiscal, població, CP i NIF/DNI només del quadre superior dret.
   - Concepte només de l’etiqueta exacta Concepte / Concepto.
   - Obra separada de les dades fiscals.
   - La importació no crea ni actualitza partides de la llibreria.
   ========================================================= */

data.meta = data.meta || {};
data.meta.version = '9.11.0-lectura-quadre-client-llibreria-manual';

function teimor0911CellRecords(flat){
  const out=[];
  for(const record of flat||[]){
    (record.raw||[]).forEach((value,col)=>{
      const text=teimor099CellText(value);
      if(text) out.push({sheet:record.sheet,rowIndex:record.rowIndex,col,text,raw:record.raw||[]});
    });
  }
  return out;
}
function teimor0911TopRightRecords(flat){
  const bySheet={};
  for(const record of flat||[]){ (bySheet[record.sheet] ||= []).push(record); }
  const out=[];
  for(const rows of Object.values(bySheet)){
    const maxCol=rows.reduce((max,record)=>Math.max(max,(record.raw||[]).length-1),0);
    const firstBody=rows.filter(record=>record.rowIndex>4 && (record.raw||[]).some(value=>/^\s*(codi|codigo|partida|concepte|concepto|unitat|unidad|quantitat|cantidad|preu|precio|total)\b/i.test(teimor099CellText(value)))).map(record=>record.rowIndex)[0] ?? 31;
    const lastRow=Math.min(31,firstBody-1);
    const rightStart=maxCol>=5 ? Math.max(1,Math.floor(maxCol*0.35)) : 0;
    for(const record of rows){
      if(record.rowIndex>lastRow) continue;
      (record.raw||[]).forEach((value,col)=>{
        if(col<rightStart && col<maxCol-6) return;
        const text=teimor099CellText(value);
        if(text) out.push({sheet:record.sheet,rowIndex:record.rowIndex,col,text,raw:record.raw||[]});
      });
    }
  }
  return out;
}
function teimor0911TableHeaderRow(record){
  const labels=(record?.raw||[]).map(teimor099LabelNorm);
  const hits=labels.filter(label=>/^(codi|codigo|partida|item|ut|ud|unitat|unidad|quantitat|cantidad|amidament|medicio|medicion|preu|precio|p\.?u\.?|import|importe|total)$/.test(label));
  return hits.length>=2;
}
function teimor0911Accept(value,validator){
  const text=cleanText(value);
  return text && !isTeimorText(text) && !looksLikeCalculationLine(text) && !isNonRecipientText(text) && (!validator || validator(text)) ? text : '';
}
function teimor0911LabelValue(records,aliases,validator){
  const list=teimor099Aliases(aliases);
  for(const record of records||[]){
    const cell=teimor099CellText(record.text);
    if(!cell || teimor0911TableHeaderRow(record)) continue;
    const inline=teimor0911Accept(teimor099InlineValue(cell,list),validator);
    if(inline) return inline;
    if(!teimor099IsExactLabel(cell,list)) continue;
    const rowValues=(records||[])
      .filter(other=>other.sheet===record.sheet && other.rowIndex===record.rowIndex && other.col>record.col)
      .sort((a,b)=>a.col-b.col)
      .map(other=>other.text);
    const sameRow=rowValues.map(value=>teimor0911Accept(value,validator)).find(Boolean);
    if(sameRow) return sameRow;
    for(const next of (records||[])){
      if(next.sheet!==record.sheet || next.rowIndex<=record.rowIndex || next.rowIndex>record.rowIndex+4) continue;
      if(next.col===record.col || next.col>record.col){
        const value=teimor0911Accept(next.text,validator);
        if(value) return value;
      }
    }
  }
  return '';
}
function teimor0911NifFromText(text){
  return firstRegex(text,/\b(?!B55271159\b)([A-HJNP-SUVW][0-9]{7}[0-9A-J]|[0-9]{8}[A-Z]|[XYZ][0-9]{7}[A-Z])\b/i);
}
function teimor0911PostalFromText(text){
  return firstRegex(text,/\b(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}\b/);
}
function teimor0911CityFromText(text,postalCode){
  const raw=cleanText(text);
  const labelled=raw.match(/\b(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}\s+([^,(]+)(?:\s*\([^)]*\))?/i);
  if(labelled) return cleanText(labelled[1]);
  const source=raw.replace(new RegExp('\\b'+(postalCode||'00000')+'\\b','i'),'').trim();
  const known=extractCityFromLine(source);
  return known && known!==source ? known : '';
}
function teimor0911BoxLines(records){
  const byColumn={};
  for(const record of records||[]){
    if(teimor0911TableHeaderRow(record) || isTeimorText(record.text) || looksLikeCalculationLine(record.text)) continue;
    (byColumn[record.col] ||= []).push(record);
  }
  const candidates=[];
  for(const [column,rows] of Object.entries(byColumn)){
    rows.sort((a,b)=>a.rowIndex-b.rowIndex);
    let chunk=[];
    const flush=()=>{
      if(!chunk.length) return;
      const lines=chunk.map(record=>cleanText(record.text)).filter(Boolean);
      const joined=lines.join('\n');
      const hasName=lines.some(line=>isProbablyClientName(line) && !/^client(?:e)?$/i.test(line));
      const hasAddress=lines.some(line=>looksLikeAddress(line));
      const hasId=!!teimor0911NifFromText(joined) || !!teimor0911PostalFromText(joined);
      const score=(hasName?100:0)+(hasAddress?45:0)+(hasId?35:0)+Math.min(lines.length,6)*3;
      if(hasName && (hasAddress || hasId || lines.length>=2)) candidates.push({column:Number(column),lines,score});
      chunk=[];
    };
    for(const row of rows){
      if(chunk.length && row.rowIndex-chunk[chunk.length-1].rowIndex>2) flush();
      chunk.push(row);
    }
    flush();
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0]?.lines || [];
}
function teimor0911RecipientBox(flat){
  const records=teimor0911TopRightRecords(flat);
  const name=teimor0911LabelValue(records,['client / empresa','client','cliente','destinatari','destinatario','senyors','sres','promotor','propietari','propiedad','comunitat','comunidad'],v=>isProbablyClientName(v) && !/^client(?:e)?$/i.test(v));
  const fiscalAddress=teimor0911LabelValue(records,['adreça fiscal','direcció fiscal','direccion fiscal','domicili fiscal','domicilio fiscal','adreça','direcció','direccion','domicili','domicilio'],v=>looksLikeAddress(v) || v.length>5);
  const postalCode=teimor0911LabelValue(records,['codi postal','codigo postal','cp','c.p.'],v=>/^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/.test(v.replace(/\s/g,''))) || '';
  const nif=teimor0911LabelValue(records,['nif','dni','cif','nif/cif','nif / cif','nif/dni','nif / dni','nif/dni/cif','nif / dni / cif','identificació fiscal','identificacion fiscal'],v=>!!teimor0911NifFromText(v)) || '';
  const city=teimor0911LabelValue(records,['població','poblacion','població / ciutat','poblacion / ciudad','municipi','municipio','localitat','localidad','ciutat','ciudad'],v=>!looksLikeAddress(v) && !/^\d{5}$/.test(v)) || '';
  const lines=teimor0911BoxLines(records);
  const joined=lines.join('\n');
  const finalPostal=postalCode || teimor0911PostalFromText(joined);
  const finalNif=nif ? teimor0911NifFromText(nif) : teimor0911NifFromText(joined);
  const finalName=name || cleanClientName(lines.find(line=>isProbablyClientName(line) && !/^client(?:e)?$/i.test(line) && !looksLikeAddress(line) && !looksLikeCityLine(line) && !teimor0911NifFromText(line) && !/^\d/.test(line)) || '');
  const finalAddress=fiscalAddress || lines.filter(line=>looksLikeAddress(line)).join(' · ');
  const cityFromBox=city ? (teimor0911CityFromText(city,finalPostal) || cleanText(city).replace(new RegExp('\\b'+(finalPostal||'00000')+'\\b','i'),'').trim()) : '';
  const finalCity=cityFromBox || teimor0911CityFromText(lines.find(line=>finalPostal && line.includes(finalPostal)) || joined,finalPostal);
  return {name:finalName==='Client pendent de revisar'?'':finalName,fiscalAddress:finalAddress,city:cleanText(finalCity),postalCode:finalPostal,nif:finalNif,lines};
}
function teimor0911FindWorkValue(flat,aliases,validator){
  return teimor0911LabelValue(teimor0911CellRecords(flat),aliases,validator);
}
function teimor0911StrictConcept(flat){
  const records=teimor0911CellRecords(flat);
  return teimor0911LabelValue(records,['concepte','concepto'],v=>v.length>1 && !isNonRecipientText(v));
}
function teimor0911WorkData(flat){
  const address=teimor0911FindWorkValue(flat,['adreça obra','adreça de l’obra',"adreça de l'obra",'adreça de la obra','direcció obra','direccion obra','dirección de la obra','emplaçament','emplazamiento','ubicació','ubicacion','domicili obra','domicilio obra'],v=>looksLikeAddress(v) || v.length>5)
    || teimor0911FindWorkValue(flat,['obra'],v=>looksLikeAddress(v));
  const postalCode=teimor0911FindWorkValue(flat,['codi postal obra','codigo postal obra','cp obra'],v=>/^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/.test(v.replace(/\s/g,''))) || teimor0911PostalFromText(address);
  const cityValue=teimor0911FindWorkValue(flat,['població obra','poblacion obra','municipi obra','municipio obra','localitat obra','localidad obra','ciutat obra','ciudad obra'],v=>!looksLikeAddress(v));
  const city=cityValue ? (teimor0911CityFromText(cityValue,postalCode) || cleanText(cityValue).replace(new RegExp('\\b'+(postalCode||'00000')+'\\b','i'),'').trim()) : teimor0911CityFromText(address,postalCode);
  return {address,city:cleanText(city),postalCode};
}
function detectClientV0911(fileName,flat){
  const box=teimor0911RecipientBox(flat);
  const work=teimor0911WorkData(flat);
  const name=cleanClientName(box.name||'');
  const reviewIssues=[];
  if(name==='Client pendent de revisar') reviewIssues.push('No s’ha detectat el nom dins del quadre superior dret.');
  if(!box.fiscalAddress) reviewIssues.push('No s’ha detectat l’adreça fiscal dins del quadre superior dret.');
  if(!box.city) reviewIssues.push('No s’ha detectat la població del client dins del quadre superior dret.');
  if(!box.postalCode) reviewIssues.push('No s’ha detectat el codi postal del client dins del quadre superior dret.');
  if(!box.nif) reviewIssues.push('No s’ha detectat NIF/DNI/CIF dins del quadre superior dret.');
  if(!work.address) reviewIssues.push('No s’ha detectat l’adreça de l’obra en un camp d’obra.');
  return {
    id:uid('CLI'),tempKey:uid('TMPCLI'),name,nif:box.nif||'',phone:'',email:'',contact:'',
    fiscalAddress:box.fiscalAddress||'',postalCode:box.postalCode||'',city:box.city||'',
    workAddress:work.address||'',workCity:work.city||'',workPostalCode:work.postalCode||'',
    status:'Actiu',source:fileName,sourceFiles:[fileName],reviewIssues,
    needsReview:reviewIssues.length>0,notes:'Client llegit exclusivament del quadre superior dret. Revisar els camps marcats si cal.'
  };
}
detectClientV099=detectClientV0911;
detectClient=detectClientV0911;
function detectBudgetConceptV0911(fileName,flat){
  return teimor0911StrictConcept(flat);
}
detectBudgetConceptV099=detectBudgetConceptV0911;
detectBudgetConcept=detectBudgetConceptV0911;
detectJobTitle=function(fileName,flat){ return teimor0911StrictConcept(flat); };

const __teimorBaseParseWorkbookV0911=parseWorkbook;
parseWorkbook=function(fileName,arrayBuffer){
  const parsed=__teimorBaseParseWorkbookV0911(fileName,arrayBuffer);
  const client=parsed.client||{};
  const title=parsed.budget?.title || parsed.job?.title || '';
  parsed.job.address=client.workAddress||'';
  parsed.job.city=client.workCity||'';
  parsed.job.postalCode=client.workPostalCode||'';
  if(!title){
    parsed.job.title='Concepte pendent de revisar';
    parsed.budget.title='Concepte pendent de revisar';
    parsed.warnings.push(fileName+': no s’ha trobat cap valor segur a la cel·la etiquetada Concepte/Concepto.');
  }
  if(client.reviewIssues?.length) parsed.warnings.push(fileName+': '+client.reviewIssues.join(' '));
  parsed.client=client;
  return parsed;
};

function confirmDraftImportV0911(){
  const draft=state.importDraft;
  if(!draft) return;
  const clientIdByTemp=new Map();
  let duplicateCount=0;
  for(const client of draft.clients||[]){
    const matches=teimor099FindExistingClients(client);
    const reusable=matches.find(existing=>teimor099CanMergeClients(existing,client) && client.duplicateReview!=='pendent');
    let id='';
    if(reusable){
      Object.assign(reusable,teimor099MergeClientData(reusable,client));
      id=reusable.id;
    }else{
      const copy={...client,id:client.id||uid('CLI')};
      delete copy._tempKeys;
      delete copy.tempKey;
      copy.sourceFiles=copy.sourceFiles||[copy.source].filter(Boolean);
      copy.source=copy.sourceFiles.join(' | ');
      if(matches.length || copy.duplicateReview==='pendent'){
        copy.duplicateReview='pendent';
        duplicateCount++;
        const ids=matches.map(existing=>existing.id).filter(Boolean);
        copy.duplicateCandidateIds=[...(copy.duplicateCandidateIds||[]),...ids].filter(Boolean);
        matches.forEach(existing=>teimor099AppendDuplicateLink(existing,copy.id));
      }
      data.clients.push(copy);
      id=copy.id;
    }
    for(const temp of (client._tempKeys||[client.tempKey]).filter(Boolean)) clientIdByTemp.set(temp,id);
  }
  for(const client of draft.clients||[]){
    const id=clientIdByTemp.get(client.tempKey);
    const record=byId(data.clients,id);
    if(!record) continue;
    for(const temp of client.duplicateCandidateTempKeys||[]){
      const otherId=clientIdByTemp.get(temp);
      if(otherId && otherId!==record.id) teimor099AppendDuplicateLink(record,otherId);
    }
  }
  for(const job of draft.jobs||[]){
    const clientId=clientIdByTemp.get(job.clientTempKey)||'';
    const existingJob=findExistingJob(job,clientId);
    if(existingJob) Object.assign(existingJob,{...job,id:existingJob.id,clientId});
    else data.jobs.push({...job,id:job.id||uid('F'),clientId});
  }
  for(const budgetDraft of draft.budgets||[]){
    const clientId=clientIdByTemp.get(budgetDraft.clientTempKey)||'';
    const jobDraft=(draft.jobs||[]).find(job=>job.id===budgetDraft.jobTempKey);
    let jobId='';
    if(jobDraft){
      const jobExisting=findExistingJob(jobDraft,clientId);
      jobId=jobExisting?.id || jobDraft.id;
    }
    const budget={...budgetDraft,clientId,jobId};
    delete budget.clientTempKey;
    delete budget.jobTempKey;
    budget.lines=(budget.lines||[]).map(line=>({...line,id:line.id||uid('LIN')}));
    data.budgets.push(budget);
    if(jobId){
      const job=byId(data.jobs,jobId);
      if(job && !job.mainBudgetId) job.mainBudgetId=budget.id;
    }
  }
  const reviewCount=(data.clients||[]).filter(teimor099ClientNeedsReview).length;
  data.importLogs=data.importLogs||[];
  data.importLogs.push({id:uid('IMP'),date:new Date().toISOString(),files:draft.files,countClients:draft.clients?.length||0,countBudgets:draft.budgets?.length||0,countItems:draft.items?.length||0,libraryAdded:0,libraryManualOnly:true,clientDuplicates:duplicateCount});
  state.importDraft=null;
  saveData();
  alert('Importació confirmada. Partides importades al pressupost: '+(draft.items?.length||0)+'. La llibreria no s’ha modificat. Clients pendents de revisar: '+reviewCount+'.');
  state.view='budgets';
  render();
}
confirmDraftImport=confirmDraftImportV0911;

const __teimorBaseImportPreviewHtmlV0911=importPreviewHtml;
importPreviewHtml=function(d){
  let html=__teimorBaseImportPreviewHtmlV0911(d);
  const manualNotice='<div class="card notice-blue"><strong>Llibreria manual:</strong> les partides llegides d’aquest Excel només entraran dins del pressupost. No s’afegirà cap partida a la llibreria automàticament.</div>';
  html=html.replace('<div class="import-summary">',manualNotice+'<div class="import-summary">');
  const start=html.indexOf('<h3>Clients detectats</h3>');
  const end=html.indexOf('<h3>Partides detectades</h3>');
  if(start>=0 && end>start){
    const clientsTable=table(['Client','Adreça fiscal','CP','Població','NIF/DNI/CIF','Adreça obra','Població obra','Origen'],(d.clients||[]).slice(0,50).map(client=>'<tr>'+
      '<td><strong>'+esc(client.name||'Client pendent de revisar')+'</strong></td>'+
      '<td>'+esc(client.fiscalAddress||'')+'</td>'+
      '<td>'+esc(client.postalCode||'')+'</td>'+
      '<td>'+esc(client.city||'')+'</td>'+
      '<td>'+esc(client.nif||'')+'</td>'+
      '<td>'+esc(client.workAddress||'')+'</td>'+
      '<td>'+esc(client.workCity||'')+'</td>'+
      '<td>'+esc(client.source||'')+'</td>'+
    '</tr>'));
    html=html.slice(0,start)+'<h3>Clients interpretats</h3>'+clientsTable+html.slice(end);
  }
  return html;
};

const __teimorBaseRenderImporterV0911=renderImporter;
renderImporter=function(){
  __teimorBaseRenderImporterV0911();
  const dropzone=document.getElementById('dropzone');
  const card=dropzone?.closest('.card');
  if(card) card.insertAdjacentHTML('beforebegin','<div class="card notice-blue" id="v0911ImportRule"><strong>Criteri V09.11:</strong> client i dades fiscals del quadre superior dret; concepte només de l’etiqueta Concepte/Concepto; obra separada; cap partida importada passa automàticament a la llibreria.</div>');
};

clientsTable=function(rows=data.clients){
  rows=sortByClientField(rows);
  if(!rows.length) return empty();
  return table(['Sel.','Client','NIF/DNI/CIF','Adreça fiscal','CP','Població','Adreça obra','Revisió','Origen','Accions'],rows.map(client=>'<tr>'+
    '<td><input type="checkbox" class="select-client" value="'+esc(client.id)+'"></td>'+
    '<td><strong>'+esc(client.name||'Client pendent de revisar')+'</strong><br><span class="muted">'+esc(client.id||'')+'</span></td>'+
    '<td>'+esc(client.nif||'')+'</td>'+
    '<td>'+esc(client.fiscalAddress||'')+'</td>'+
    '<td>'+esc(client.postalCode||'')+'</td>'+
    '<td>'+esc(client.city||'')+'</td>'+
    '<td>'+esc(client.workAddress||'')+(client.workPostalCode||client.workCity?'<br><span class="small-text">'+esc([client.workPostalCode,client.workCity].filter(Boolean).join(' · '))+'</span>':'')+'</td>'+
    '<td>'+teimor099ClientReviewPill(client)+'</td>'+
    '<td><span class="small-text">'+esc(teimor099ClientSource(client))+'</span></td>'+
    '<td class="nowrap"><button class="ghost small" data-edit-client="'+esc(client.id)+'">Editar</button> <button class="danger small" data-delete-client="'+esc(client.id)+'">Eliminar</button></td>'+
  '</tr>'));
};
saveClient=function(e){
  e.preventDefault();
  const f=formObj(e.target);
  const old=byId(data.clients,f.editId)||{};
  const client={...old,id:f.id,name:f.name,nif:f.nif,phone:f.phone,email:f.email,contact:f.contact,fiscalAddress:f.fiscalAddress,postalCode:f.postalCode,workAddress:f.workAddress,workPostalCode:f.workPostalCode,workCity:f.workCity,city:f.city,status:f.status,notes:f.notes};
  const index=data.clients.findIndex(item=>item.id===f.editId || item.id===client.id);
  if(index>=0) data.clients[index]=client; else data.clients.push(client);
  saveData();
  renderClients();
};

const __teimorBaseRenderClientsV0911=renderClients;
renderClients=function(editId=''){
  __teimorBaseRenderClientsV0911(editId);
  if(editId){
    const form=document.getElementById('clientForm');
    if(form && !form.querySelector('[name="postalCode"]')){
      const status=form.querySelector('[name="status"]')?.closest('label');
      const client=byId(data.clients,editId)||{};
      const field='<label>Codi postal fiscal<input name="postalCode" value="'+esc(client.postalCode||'')+'"></label>'+
        '<label>Codi postal obra<input name="workPostalCode" value="'+esc(client.workPostalCode||'')+'"></label>'+
        '<label>Població obra<input name="workCity" value="'+esc(client.workCity||'')+'"></label>';
      if(status) status.insertAdjacentHTML('beforebegin',field);
      else form.insertAdjacentHTML('beforeend',field);
    }
  }
};

const __teimorBaseOpenBudgetModalV0911=openBudgetModal;
openBudgetModal=function(id=''){
  __teimorBaseOpenBudgetModalV0911(id);
  const budget=id ? byId(data.budgets,id) : null;
  if(!budget) return;
  document.querySelectorAll('.budget-lines tbody tr').forEach(row=>{
    const lineInput=row.querySelector('[data-line-id]');
    const line=lineInput ? (budget.lines||[]).find(item=>item.id===lineInput.dataset.lineId) : null;
    const conceptCell=row.querySelector('.concept-cell');
    if(!line || !conceptCell || conceptCell.querySelector('[data-line-field="longDesc"]')) return;
    const detail=document.createElement('textarea');
    detail.className='line-longdesc';
    detail.dataset.lineField='longDesc';
    detail.dataset.lineId=line.id;
    detail.placeholder='Descripció llarga / abast de la partida';
    detail.value=line.longDesc||'';
    detail.onchange=updateBudgetLine;
    conceptCell.appendChild(detail);
  });
};

budgetLinesCard=function(b){
  return '<div class="card"><div class="toolbar"><h2>Partides del pressupost</h2><div class="right"><button class="ghost" id="selectAllBudgetLines">Seleccionar tot</button><button class="ghost" id="clearSelectedBudgetLines">Desmarcar</button><button class="danger" id="deleteSelectedBudgetLines">Eliminar línies seleccionades</button><button class="primary" id="addLineFromLibrary">Afegir de llibreria</button><button class="ghost" id="addManualLine">Afegir partida nova</button></div></div>'+
    '<div class="table-wrap budget-lines"><table><thead><tr><th>Sel.</th><th>Capítol</th><th>Codi</th><th>Ut</th><th class="concept-col">Concepte / descripció</th><th>Quantitat</th><th>Preu/ut</th><th>Total</th><th>Estat</th><th></th></tr></thead><tbody>'+
    (b.lines||[]).map(l=>'<tr><td><input type="checkbox" class="select-budget-line" value="'+esc(l.id)+'"></td><td><input data-line-field="chapter" data-line-id="'+esc(l.id)+'" value="'+esc(l.chapter||'')+'" placeholder="Capítol"></td><td><input data-line-field="code" data-line-id="'+esc(l.id)+'" value="'+esc(l.code||'')+'"></td><td><input data-line-field="unit" data-line-id="'+esc(l.id)+'" value="'+esc(l.unit||'')+'"></td><td class="concept-cell"><textarea data-line-field="concept" data-line-id="'+esc(l.id)+'" class="line-concept">'+esc(l.concept||'')+'</textarea><textarea data-line-field="longDesc" data-line-id="'+esc(l.id)+'" class="line-longdesc" placeholder="Descripció llarga / abast de la partida">'+esc(l.longDesc||'')+'</textarea></td><td><input class="num" data-line-field="qty" data-line-id="'+esc(l.id)+'" type="number" step="0.0001" value="'+esc(l.qty||'')+'"></td><td><input class="num" data-line-field="unitPrice" data-line-id="'+esc(l.id)+'" type="number" step="0.01" value="'+esc(l.unitPrice||'')+'"></td><td class="num"><strong>'+money(lineTotal(l))+'</strong></td><td>'+statusPill(l.status||'')+'</td><td><button class="danger small" data-delete-line="'+esc(l.id)+'">Eliminar</button></td></tr>').join('')+
    '</tbody></table></div><div class="budget-total"><div>Base: <strong>'+money(budgetBase(b))+'</strong></div><div>IVA: <strong>'+money(budgetIVA(b))+'</strong></div><div>Total: <strong>'+money(budgetTotal(b))+'</strong></div></div>'+((budgetLineSum(b)===0 && num(b.importedBase)>0)?'<div class="small-text" style="text-align:right;margin-top:6px">Base presa del total detectat a l’Excel original; les línies separades per * queden pendents de preu/amidament.</div>':'')+'</div>';
};

const __teimorBaseSaveLibraryItemV0911=saveLibraryItem;
saveLibraryItem=function(e){
  const f=formObj(e.target);
  const existing=!f.editId ? findExistingLibraryItem({concept:f.concept,longDesc:f.longDesc,unit:f.unit}) : null;
  if(existing && existing.id!==f.id){
    if(!confirm('Ja existeix una partida semblant a la llibreria: '+(existing.code||existing.concept)+'. No es crearà una duplicada.')) return;
    closeModal();
    openLibModal(existing.id);
    return;
  }
  return __teimorBaseSaveLibraryItemV0911(e);
};

/* =========================================================
   TEIMOR V09.12 · TREBALLS GENÈRICS PER PUNTS I CLIENT 2024
   - Els pressupostos antics amb un únic import global poden contenir un bloc
     TREBALLS amb frases iniciades per ., *, · o •.
   - Cada marcador obre un treball i les línies següents continuen el mateix
     treball fins al marcador següent.
   - El total/base del pressupost es conserva separat; no es reparteix entre
     treballs que no tenen preu individual.
   ========================================================= */

data.meta = data.meta || {};
data.meta.version = '9.12.0-treballs-generics-client-2024';

function teimor0912IsStructuredSheet(aoa){
  return typeof teimor0910HasStructuredHeader==='function' && teimor0910HasStructuredHeader(aoa);
}
function teimor0912WorkHeader(value){
  const label=strip(value).replace(/[：:;]+$/,'').trim();
  return /^(treballs|trabajos|descripcio treballs|descripció treballs|descripcion trabajos|descripción trabajos)$/.test(label);
}
function teimor0912InlineWorkHeader(value){
  const text=cleanText(value);
  const match=text.match(/^\s*(?:treballs|trabajos|descripcio treballs|descripció treballs|descripcion trabajos|descripción trabajos)\s*[:：\-–—]\s*(.+)$/i);
  return match ? cleanText(match[1]) : '';
}
function teimor0912RowFragments(row){
  const rawPieces=[];
  for(const cellValue of row||[]){
    const source=String(cellValue??'').replace(/\r/g,'');
    for(const rawLine of source.split(/\n+/)){
      const line=cleanText(rawLine);
      if(!line) continue;
      const split=line.split(/\s+(?=[.*•·]\s*)/g).map(cleanText).filter(Boolean);
      rawPieces.push(...(split.length?split:[line]));
    }
  }
  const fragments=[];
  let markerOnly='';
  for(const piece of rawPieces){
    if(/^[.*•·]\s*$/.test(piece)){
      markerOnly=piece;
      continue;
    }
    if(markerOnly){ fragments.push(markerOnly+' '+piece); markerOnly=''; }
    else fragments.push(piece);
  }
  if(markerOnly) fragments.push(markerOnly);
  return fragments;
}
function teimor0912MarkerText(value){
  const text=cleanText(value);
  const match=text.match(/^[.*•·]\s*(.*)$/);
  return match ? cleanText(match[1]) : null;
}
function teimor0912IsStopRow(row){
  const text=strip((row||[]).map(teimor099CellText).filter(Boolean).join(' '));
  if(!text) return false;
  if(teimor0912MarkerText(text)!==null) return false;
  return /(^|\s)(base imposable|base imponible|materials?\s+i\s+m\.?o\.?|materiales?\s+y\s+m\.?o\.?|import total|importe total|total pressupost|total presupuesto|forma de pago|forma de pagament|condicions|condiciones|observacions|observaciones|signatura|firma|iva)\b/i.test(text)
    || /(^|\s)total\s*[:=]/i.test(text);
}
function teimor0912IsWorkNoise(text){
  const value=cleanText(text);
  if(!value) return true;
  if(isTeimorText(value) || looksLikeCalculationLine(value)) return true;
  return /^(treballs|trabajos|base imposable|base imponible|materials?\s+i\s+m\.?o\.?|materiales?\s+y\s+m\.?o\.?|iva|total|subtotal)$/i.test(value);
}
function teimor0912GenericWorkItems(fileName,sheetName,aoa){
  if(teimor0912IsStructuredSheet(aoa)) return [];
  const rows=(aoa||[]).map(row=>(row||[]).map(teimor099CellText));
  let headerRow=-1;
  let headerCol=-1;
  let inlineFirst='';
  for(let rowIndex=0;rowIndex<Math.min(rows.length,120);rowIndex++){
    const row=rows[rowIndex]||[];
    const found=row.findIndex(teimor0912WorkHeader);
    if(found>=0){ headerRow=rowIndex; headerCol=found; break; }
    const inline=row.findIndex(value=>!!teimor0912InlineWorkHeader(value));
    if(inline>=0){ headerRow=rowIndex; headerCol=inline; inlineFirst=teimor0912InlineWorkHeader(row[inline]); break; }
  }
  if(headerRow<0) return [];
  const texts=[];
  let current='';
  const flush=()=>{
    const value=cleanLongText(current);
    if(value && value.length>4 && !teimor0912IsWorkNoise(value)) texts.push(value);
    current='';
  };
  const consume=(fragment)=>{
    const value=cleanText(fragment);
    if(!value || teimor0912IsWorkNoise(value)) return;
    const marker=teimor0912MarkerText(value);
    if(marker!==null){
      flush();
      if(marker && !teimor0912IsWorkNoise(marker)) current=marker;
      return;
    }
    if(current) current=cleanText(current+' '+value);
  };
  if(inlineFirst) consume(inlineFirst);
  const headerRemainder=headerRow>=0 ? (rows[headerRow]||[]).slice(headerCol+1) : [];
  for(const fragment of teimor0912RowFragments(headerRemainder)) consume(fragment);
  for(let rowIndex=headerRow+1;rowIndex<rows.length;rowIndex++){
    const row=rows[rowIndex]||[];
    if(teimor0912IsStopRow(row)) break;
    for(const fragment of teimor0912RowFragments(row)) consume(fragment);
  }
  flush();
  return texts.map((text,index)=>{
    const item=makeItem({
      code:'TR-'+String(index+1).padStart(2,'0'),
      chapter:'Treballs',
      unit:'',
      desc:shortenBullet(text),
      qty:'',
      pu:'',
      total:'',
      status:'Treball genèric importat · preu global del pressupost',
      fileName,
      sheetName,
      longDescOverride:text
    });
    item.genericWork=true;
    item.genericWorkIndex=index+1;
    return item;
  });
}

const __teimorBaseDetectItemsFromSheetV0912=detectItemsFromSheet;
detectItemsFromSheet=function(fileName,sheetName,aoa){
  const generic=teimor0912GenericWorkItems(fileName,sheetName,aoa);
  if(generic.length){
    if(typeof teimor0910CurrentItemStats!=='undefined' && teimor0910CurrentItemStats){
      teimor0910CurrentItemStats.candidates += generic.length;
      teimor0910CurrentItemStats.accepted += generic.length;
    }
    return generic;
  }
  return __teimorBaseDetectItemsFromSheetV0912(fileName,sheetName,aoa);
};

const __teimorBaseParseWorkbookV0912=parseWorkbook;
parseWorkbook=function(fileName,arrayBuffer){
  const parsed=__teimorBaseParseWorkbookV0912(fileName,arrayBuffer);
  const genericItems=(parsed.items||[]).filter(item=>item.genericWork);
  if(genericItems.length){
    parsed.budget.workItemsMode='generic-dot-lines';
    parsed.budget.workItemsCount=genericItems.length;
    parsed.budget.notes=[parsed.budget.notes,'Treballs separats per marcador; el preu es conserva com a import global del pressupost.'].filter(Boolean).join('\n');
    parsed.parseStats=parsed.parseStats||{};
    parsed.parseStats.genericWorkItems=genericItems.length;
    parsed.budget.parseStats=parsed.parseStats;
    parsed.warnings.push(fileName+': s’han separat '+genericItems.length+' treball/s genèric/s del bloc Treballs.');
  }
  return parsed;
};

const __teimorBaseImportPreviewHtmlV0912=importPreviewHtml;
importPreviewHtml=function(d){
  const generic=(d.items||[]).filter(item=>item.genericWork).length;
  const notice=generic ? '<div class="card notice-green"><strong>Treballs genèrics separats:</strong> '+generic+' treball/s detectat/s. No tenen preu individual perquè l’Excel només porta un import total; aquest total queda conservat en el pressupost.</div>' : '';
  return __teimorBaseImportPreviewHtmlV0912(d).replace('<div class="import-summary">',notice+'<div class="import-summary">');
};

const __teimorBaseRenderImporterV0912=renderImporter;
renderImporter=function(){
  __teimorBaseRenderImporterV0912();
  const rule=document.getElementById('v0911ImportRule');
  if(rule) rule.innerHTML='<strong>Criteri V09.12:</strong> client i dades fiscals del quadre superior dret; concepte només de l’etiqueta Concepte/Concepto; Treballs separats pels punts, asteriscs o vinyetes inicials; cap partida importada passa automàticament a la llibreria.';
  const dropzone=document.getElementById('dropzone');
  const card=dropzone?.closest('.card');
  if(card) card.insertAdjacentHTML('afterbegin','<div class="small-text" style="margin-bottom:10px"><strong>Pressupostos amb Treballs:</strong> les línies iniciades per punt, asterisc o vinyeta es separen com a treballs; les línies següents continuen el mateix treball fins al marcador següent.</div>');
};

/* =========================================================
   TEIMOR V09.13 · FACTURES, CERTIFICACIONS I TRAÇABILITAT
   - Importa factures i certificacions des d'Excel/CSV/ZIP.
   - Busca coincidències amb clients, obres i pressupostos, però conserva
     els casos dubtosos com a pendents de validar.
   - No importa cap partida a la llibreria: la llibreria continua sent manual.
   - Centralitza la relació obra → pressupostos → factures → certificacions.
   ========================================================= */

data.meta = data.meta || {};
data.meta.version = '9.13.0-factures-certificacions-tracabilitat';
data.certifications = Array.isArray(data.certifications) ? data.certifications : [];
data.importLogs = Array.isArray(data.importLogs) ? data.importLogs : [];
state.financialDraft = state.financialDraft || null;

const __teimorBaseLooksLikeAddressV0913 = looksLikeAddress;
looksLikeAddress = function(value){
  return /(^|\s)(?:c\s*\/|c\.\s*|carrer|calle|avinguda|avenida|av\.?|avda\.?|passeig|pg\.?|pla[cç]a|plaza|rambla|carretera|ctra\.?|urbanitzaci[oó]|urb\.?|travessera|cam[ií])/i.test(String(value||'')) || __teimorBaseLooksLikeAddressV0913(value);
};

function teimor0913EnsureData(){
  data.clients = Array.isArray(data.clients) ? data.clients : [];
  data.jobs = Array.isArray(data.jobs) ? data.jobs : [];
  data.budgets = Array.isArray(data.budgets) ? data.budgets : [];
  data.invoices = Array.isArray(data.invoices) ? data.invoices : [];
  data.certifications = Array.isArray(data.certifications) ? data.certifications : [];
  data.attachments = Array.isArray(data.attachments) ? data.attachments : [];
  data.importLogs = Array.isArray(data.importLogs) ? data.importLogs : [];
}

const __teimorBaseSaveDataV0913 = saveData;
saveData = function(){
  teimor0913EnsureData();
  return __teimorBaseSaveDataV0913();
};

const __teimorBaseInvoiceTotalV0913 = invoiceTotal;
invoiceTotal = function(invoice){
  return num(invoice?.total)>0 ? num(invoice.total) : __teimorBaseInvoiceTotalV0913(invoice);
};

function teimor0913KindLabel(kind){ return kind === 'certificacio' ? 'Certificació' : 'Factura'; }
function teimor0913DocTypeLabel(doc){ return doc?.kind === 'certificacio' ? 'Certificació' : 'Factura'; }
function teimor0913DocTotal(doc){
  if(num(doc?.total)>0) return num(doc.total);
  return num(doc?.base) * (1 + num(doc?.iva)/100);
}
function teimor0913CertTotal(doc){ return teimor0913DocTotal(doc); }
function teimor0913Norm(value){
  return strip(value).replace(/[ºª]/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
}
function teimor0913Tokens(value){
  const stop=new Set(['de','del','la','las','los','el','els','les','i','y','amb','con','per','para','en','al','a','un','una','obra','pressupost','presupuesto','factura','certificacio','certificacion','numero','num','n']);
  return [...new Set(teimor0913Norm(value).split(' ').filter(x=>x.length>2 && !stop.has(x)))];
}
function teimor0913Overlap(a,b){
  const aa=new Set(teimor0913Tokens(a)); const bb=new Set(teimor0913Tokens(b));
  if(!aa.size || !bb.size) return 0;
  let hit=0; aa.forEach(x=>{ if(bb.has(x)) hit++; });
  return hit/Math.max(aa.size,bb.size);
}
function teimor0913Nif(value){ return cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g,''); }
function teimor0913NormId(value){ return teimor0913Norm(value).replace(/\s+/g,''); }
function teimor0913SourceName(fileName){ return String(fileName||'').split('/').pop(); }
function teimor0913Year(value){ const m=String(value||'').match(/\b(19|20)\d{2}\b/); return m ? Number(m[0]) : 0; }

function teimor0913FinancialRows(fileName,arrayBuffer){
  const wb=XLSX.read(arrayBuffer,{type:'array',cellDates:true,raw:false});
  const sheets=wb.SheetNames.map(name=>({name,aoa:XLSX.utils.sheet_to_json(wb.Sheets[name],{header:1,defval:'',raw:false,blankrows:false})}));
  const flat=[];
  sheets.forEach(sheet=>sheet.aoa.forEach((row,rowIndex)=>flat.push({sheet:sheet.name,rowIndex,cells:row.map(v=>cleanText(v)).filter(Boolean),raw:row})));
  return {wb,sheets,flat,text:flat.map(row=>row.cells.join(' | ')).join('\n')};
}

function teimor0913LabelMatch(text,aliases){
  const value=teimor0913Norm(text);
  return (aliases||[]).some(alias=>{
    const a=teimor0913Norm(alias);
    return a && (value===a || value.startsWith(a+' '));
  });
}
function teimor0913InlineValue(text,aliases){
  const source=cleanText(text);
  if(!source) return '';
  for(const alias of (aliases||[]).slice().sort((a,b)=>String(b).length-String(a).length)){
    const pattern=String(alias).replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\s+/g,'\\s+');
    const match=source.match(new RegExp('^\\s*'+pattern+'\\s*(?:[:=]|[-–—])\\s*(.+?)\\s*$','i'));
    if(match && cleanText(match[1])) return cleanText(match[1]);
  }
  return '';
}
function teimor0913FindLabelValue(flat,aliases,validator){
  if(typeof teimor099FindValue==='function'){
    const found=teimor099FindValue(flat,aliases,v=>!validator || validator(v));
    if(found) return found;
  }
  for(const record of flat||[]){
    const row=record.raw||[];
    for(let i=0;i<row.length;i++){
      const text=cleanText(row[i]);
      if(!teimor0913LabelMatch(text,aliases)) continue;
      const inline=teimor0913InlineValue(text,aliases);
      if(inline && (!validator || validator(inline))) return inline;
      const sameRow=row.slice(i+1).map(cleanText).find(value=>value && (!validator || validator(value)));
      if(sameRow) return sameRow;
      for(const next of flat||[]){
        if(next.sheet!==record.sheet || next.rowIndex<=record.rowIndex || next.rowIndex>record.rowIndex+3) continue;
        const value=cleanText((next.raw||[])[i]);
        if(value && (!validator || validator(value))) return value;
      }
    }
  }
  return '';
}
function teimor0913NumericValues(value){
  const text=cleanText(value);
  if(!text || /\b(19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/.test(text)) return [];
  const matches=text.match(/-?\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|-?\d+(?:[.,]\d+)?/g)||[];
  return matches.map(num).filter(value=>Number.isFinite(value));
}
function teimor0913FindAmount(flat,aliases){
  const hits=[];
  for(const record of flat||[]){
    const row=record.raw||[];
    for(let i=0;i<row.length;i++){
      const cell=cleanText(row[i]);
      if(!teimor0913LabelMatch(cell,aliases)) continue;
      const candidates=[];
      const inline=teimor0913InlineValue(cell,aliases);
      if(inline) candidates.push(...teimor0913NumericValues(inline));
      row.slice(i+1,i+7).forEach(value=>candidates.push(...teimor0913NumericValues(value)));
      if(candidates.length) hits.push(candidates[candidates.length-1]);
      for(const next of flat||[]){
        if(next.sheet!==record.sheet || next.rowIndex<=record.rowIndex || next.rowIndex>record.rowIndex+2) continue;
        const values=(next.raw||[]).flatMap(teimor0913NumericValues);
        if(values.length){ hits.push(values[values.length-1]); break; }
      }
    }
  }
  return hits.find(value=>value>0) || 0;
}
function teimor0913FindIvaRate(flat){
  for(const record of flat||[]){
    const row=record.raw||[];
    if(!row.some(cell=>/\biva\b|\bimpuesto\b|\bimpost\b/i.test(cleanText(cell)))) continue;
    const rowText=row.map(cleanText).join(' ');
    const percent=rowText.match(/(\d{1,2}(?:[.,]\d+)?)\s*%/);
    if(percent && num(percent[1])>=0 && num(percent[1])<=100) return num(percent[1]);
    const values=row.flatMap(teimor0913NumericValues).filter(value=>value>=0 && value<=100 && value!==new Date().getFullYear());
    if(values.length) return values[0];
  }
  return num(data.settings?.defaultIVA || 21);
}
function teimor0913FindCertificationPercent(flat){
  const aliases=['percentatge certificacio','porcentaje certificacion','percentatge certificat','porcentaje certificado','% certificat','% certificado'];
  const value=teimor0913FindAmount(flat,aliases);
  return value>0 && value<=100 ? value : 0;
}
function teimor0913FindDocumentNumber(flat,kind,fileName){
  const aliases=kind==='certificacio'
    ? ['numero certificacio','número certificació','nº certificacio','nº certificació','num certificacio','num certificació','certificacio nº','certificació nº','certificado nº','certificació']
    : ['numero factura','número factura','nº factura','num factura','factura nº','factura no','invoice number'];
  const source=flat.slice(0,180).map(row=>row.cells.join(' ')).join(' | ');
  const pattern=kind==='certificacio'
    ? /(?:certificaci[oó]n?|certificado)\s*(?:n[ºo°]?|num(?:ero)?|#)?\s*[:#\-]?\s*([A-Z0-9][A-Z0-9./_-]*)/i
    : /(?:factura|fra\.?|invoice)\s*(?:n[ºo°]?|num(?:ero)?|#)?\s*[:#\-]?\s*([A-Z0-9][A-Z0-9./_-]*)/i;
  const cells=(flat||[]).flatMap(record=>(record.raw||[]).map(cleanText)).filter(Boolean);
  for(const cell of cells){
    const direct=cell.match(pattern);
    if(direct && direct[1] && !/^(?:de|del|fecha|date|factura|certificaci[oó]|certificado|n|no)$/i.test(direct[1])) return direct[1];
  }
  for(const record of flat||[]){
    const row=record.raw||[];
    for(let i=0;i<row.length;i++){
      if(!aliases.some(alias=>teimor0913Norm(row[i])===teimor0913Norm(alias))) continue;
      const next=row.slice(i+1).map(cleanText).find(value=>value && !/^(data|fecha|date)$/i.test(value));
      if(next) return next;
    }
  }
  const match=source.match(pattern);
  if(match && match[1] && !/^(?:de|del|fecha|date|factura|certificaci[oó]|certificado|n|no)$/i.test(match[1])) return match[1];
  const base=teimor0913SourceName(fileName).replace(/\.(xls|xlsx|xlsm|csv)$/i,'').trim();
  return base || uid(kind==='certificacio'?'CERT':'FAC');
}
function teimor0913FindFallbackDate(fileName){
  const match=String(fileName||'').match(/\b(20\d{2}|19\d{2})[._-](\d{1,2})[._-](\d{1,2})\b|\b(\d{1,2})[._-](\d{1,2})[._-](20\d{2}|19\d{2})\b/);
  if(!match) return '';
  return parseDateValue(match[0].replace(/[._]/g,'/'));
}
function teimor0913FindConcept(flat,fileName){
  const strict=typeof teimor0911StrictConcept==='function' ? teimor0911StrictConcept(flat) : '';
  if(strict) return strict;
  return teimor0913FindLabelValue(flat,['concepte','concepto','descripcio','descripción','descripció','detall','detalle','obra','feina','trabajo'],v=>v.length>1 && !isNonRecipientText(v)) || '';
}
function teimor0913ParseFinancialWorkbook(fileName,arrayBuffer,kind){
  const parsed=teimor0913FinancialRows(fileName,arrayBuffer);
  const {flat,text,sheets}=parsed;
  const rawClient=(typeof detectClient==='function' ? detectClient(fileName,flat) : {}) || {};
  const client={...rawClient};
  if(client.name && (!isProbablyClientName(client.name) || looksLikeAddress(client.name) || /^\s*[A-ZÀ-Ý]\s*[/\\.]\s*/i.test(client.name))) client.name='';
  const detectedDate=(typeof detectDateV099==='function' ? detectDateV099(flat) : detectDate(flat)) || teimor0913FindFallbackDate(fileName);
  const iva=teimor0913FindIvaRate(flat);
  const explicitBase=teimor0913FindAmount(flat,['base imposable','base imponible','importe neto','subtotal','base']);
  const explicitTotal=teimor0913FindAmount(flat,kind==='certificacio'
    ? ['total certificacio','total certificación','importe certificacion','importe certificación','total a certificar','total']
    : ['total factura','importe total factura','total a pagar','importe total','total']);
  const base=explicitBase || (explicitTotal ? explicitTotal/(1+iva/100) : 0);
  const total=explicitTotal || base*(1+iva/100);
  const doc={
    id:uid(kind==='certificacio'?'CIMP':'FIMP'),
    kind,
    type:kind==='certificacio'?'Certificació':'Client',
    number:teimor0913FindDocumentNumber(flat,kind,fileName),
    date:detectedDate || '',
    clientId:'',
    clientSnapshot:{name:client.name||'',nif:client.nif||'',fiscalAddress:client.fiscalAddress||'',postalCode:client.postalCode||'',city:client.city||'',workAddress:client.workAddress||'',workCity:client.workCity||'',workPostalCode:client.workPostalCode||''},
    jobId:'',
    budgetId:'',
    concept:teimor0913FindConcept(flat,fileName),
    base:Number(base.toFixed(2)),
    iva:Number(iva.toFixed(2)),
    ivaAmount:Number((total-base).toFixed(2)),
    total:Number(total.toFixed(2)),
    percentage:kind==='certificacio'?teimor0913FindCertificationPercent(flat):0,
    paid:false,
    status:'Importada pendent de revisar',
    matchStatus:'pendent',
    matchConfidence:0,
    sourceFile:fileName,
    sourceSheets:sheets.map(sheet=>sheet.name),
    sourceText:text.slice(0,5000),
    notes:'Importada automàticament. Revisa la coincidència amb l’obra i el pressupost.'
  };
  teimor0913ApplyMatch(doc);
  const warnings=[];
  if(!doc.date) warnings.push(`${fileName}: no s’ha detectat una data segura.`);
  if(!doc.number) warnings.push(`${fileName}: no s’ha detectat número de document.`);
  if(!doc.clientSnapshot.name) warnings.push(`${fileName}: no s’ha detectat el client al quadre superior dret.`);
  if(!doc.concept) warnings.push(`${fileName}: no s’ha detectat el concepte.`);
  if(!base && !total) warnings.push(`${fileName}: no s’ha detectat base ni total.`);
  return {doc,warnings,sheetCount:sheets.length};
}

function teimor0913ClientCandidates(doc){
  const snap=doc.clientSnapshot||{};
  const snapNif=teimor0913Nif(snap.nif);
  const rows=(data.clients||[]).map(client=>{
    let score=0; const reasons=[];
    const nif=teimor0913Nif(client.nif);
    if(snapNif && nif && snapNif===nif){ score+=130; reasons.push('NIF exacte'); }
    const snapName=teimor0913Norm(snap.name), clientNameNorm=teimor0913Norm(client.name);
    if(snapName && clientNameNorm && snapName===clientNameNorm){ score+=90; reasons.push('nom exacte'); }
    else if(snapName && clientNameNorm && (snapName.includes(clientNameNorm) || clientNameNorm.includes(snapName))){ score+=55; reasons.push('nom semblant'); }
    const overlap=teimor0913Overlap(snap.name,client.name);
    if(overlap>0.35){ score+=Math.round(overlap*35); reasons.push('nom coincident'); }
    const addressOverlap=teimor0913Overlap([snap.fiscalAddress,snap.city,snap.postalCode].join(' '),[client.fiscalAddress,client.city,client.postalCode].join(' '));
    if(addressOverlap>0.25){ score+=Math.round(addressOverlap*25); reasons.push('dades fiscals semblants'); }
    return {id:client.id,score,reasons:reasons.join(', ')};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
  return rows;
}
function teimor0913BudgetCandidates(doc){
  const snap=doc.clientSnapshot||{};
  const docNumber=teimor0913NormId(doc.number);
  const sourceNorm=teimor0913NormId(doc.sourceText);
  const docYear=teimor0913Year(doc.date||doc.sourceFile);
  return (data.budgets||[]).map(budget=>{
    const job=byId(data.jobs,budget.jobId)||{};
    const client=byId(data.clients,budget.clientId)||{};
    let score=0; const reasons=[]; let exactNumber=false;
    const budgetNumbers=[budget.number,budget.originalNumber,budget.oldNumber,budget.id].filter(Boolean).map(teimor0913NormId);
    if(docNumber && budgetNumbers.includes(docNumber)){ score+=150; exactNumber=true; reasons.push('número coincident'); }
    else if(docNumber && budgetNumbers.some(value=>value && (docNumber.includes(value)||value.includes(docNumber)))){ score+=80; reasons.push('número semblant'); }
    if(sourceNorm && budgetNumbers.some(value=>value && sourceNorm.includes(value))){ score+=55; reasons.push('número al document'); }
    const snapNif=teimor0913Nif(snap.nif), clientNif=teimor0913Nif(client.nif);
    if(snapNif && clientNif && snapNif===clientNif){ score+=65; reasons.push('NIF del client'); }
    if(snap.name && client.name && teimor0913Norm(snap.name)===teimor0913Norm(client.name)){ score+=45; reasons.push('client exacte'); }
    else if(snap.name && client.name && teimor0913Overlap(snap.name,client.name)>0.4){ score+=25; reasons.push('client semblant'); }
    const concept=doc.concept||'';
    const workText=[budget.title,job.title,job.address,job.city].join(' ');
    const conceptOverlap=teimor0913Overlap(concept,workText);
    if(conceptOverlap>0.25){ score+=Math.round(conceptOverlap*65); reasons.push('concepte/obra'); }
    const addressOverlap=teimor0913Overlap([snap.workAddress,snap.workCity,snap.workPostalCode].join(' '),[job.address,job.city].join(' '));
    if(addressOverlap>0.25){ score+=Math.round(addressOverlap*45); reasons.push('adreça d’obra'); }
    if(docYear && Number(budget.date||job.year||0)===docYear){ score+=8; reasons.push('mateix any'); }
    return {id:budget.id,score,exactNumber,reasons:reasons.join(', '),jobId:budget.jobId||'',clientId:budget.clientId||''};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
}
function teimor0913JobCandidates(doc,clientId){
  const snap=doc.clientSnapshot||{}; const docYear=teimor0913Year(doc.date||doc.sourceFile);
  return (data.jobs||[]).map(job=>{
    let score=0; const reasons=[];
    if(clientId && job.clientId===clientId){ score+=55; reasons.push('client'); }
    const overlap=teimor0913Overlap(doc.concept,[job.title,job.address,job.city].join(' '));
    if(overlap>0.25){ score+=Math.round(overlap*75); reasons.push('concepte/obra'); }
    const addressOverlap=teimor0913Overlap([snap.workAddress,snap.workCity,snap.workPostalCode].join(' '),[job.address,job.city].join(' '));
    if(addressOverlap>0.25){ score+=Math.round(addressOverlap*55); reasons.push('adreça'); }
    if(docYear && Number(job.year)===docYear){ score+=8; reasons.push('mateix any'); }
    return {id:job.id,score,reasons:reasons.join(', '),clientId:job.clientId||''};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
}
function teimor0913ApplyMatch(doc){
  const clients=teimor0913ClientCandidates(doc);
  const topClient=clients[0], secondClient=clients[1];
  const clientSafe=!!topClient && topClient.score>=65 && (!secondClient || topClient.score-secondClient.score>=12);
  if(clientSafe) doc.clientId=topClient.id;
  const budgets=teimor0913BudgetCandidates(doc);
  const topBudget=budgets[0], secondBudget=budgets[1];
  const budgetSafe=!!topBudget && topBudget.score>=72 && (!secondBudget || topBudget.score-secondBudget.score>=12);
  const budgetAutomatic=budgetSafe && (topBudget.exactNumber || topBudget.score>=125);
  if(budgetSafe){
    doc.budgetId=topBudget.id;
    doc.jobId=topBudget.jobId||'';
    if(!doc.clientId) doc.clientId=topBudget.clientId||'';
  }else{
    const jobs=teimor0913JobCandidates(doc,doc.clientId);
    const topJob=jobs[0], secondJob=jobs[1];
    if(topJob && topJob.score>=65 && (!secondJob || topJob.score-secondJob.score>=12)) doc.jobId=topJob.id;
    doc.candidateJobIds=jobs.slice(0,5).map(row=>row.id);
  }
  doc.candidateClientIds=clients.slice(0,5).map(row=>row.id);
  doc.candidateBudgetIds=budgets.slice(0,5).map(row=>row.id);
  if(budgetAutomatic){
    doc.matchStatus='automatica';
    doc.matchConfidence=Math.min(100,Math.round(topBudget.score/1.5));
  }else if(budgetSafe || clientSafe || doc.jobId){
    doc.matchStatus='suggerida';
    doc.matchConfidence=Math.min(95,Math.round(Math.max(topBudget?.score||0,topClient?.score||0)/1.5));
  }else{
    doc.matchStatus='pendent';
    doc.matchConfidence=0;
  }
  doc.matchReason=[topBudget?.reasons,topClient?.reasons].filter(Boolean).join(' · ') || 'Sense coincidència segura';
}
function teimor0913MatchPill(doc){
  const label=doc.matchStatus==='automatica'?'Coincidència automàtica':doc.matchStatus==='suggerida'?'Coincidència suggerida':'Pendent de validar';
  return statusPill(label);
}

async function handleFinancialImportV0913(files){
  teimor0913EnsureData();
  if(typeof XLSX==='undefined'){ alert('No s’ha carregat la llibreria per llegir Excel. Revisa la connexió.'); return; }
  const kind=document.getElementById('v0913FinancialKind')?.value || 'factura';
  const draft={kind,files:[],documents:[],warnings:[]};
  const spreadsheetFiles=[];
  for(const file of files||[]){
    const name=(file.webkitRelativePath || file.name || '').toLowerCase();
    if(name.endsWith('.rar')){ draft.warnings.push(`RAR detectat: ${file.name}. Descomprimeix-lo amb WinRAR i importa la carpeta, o crea un ZIP.`); continue; }
    if(name.endsWith('.zip')){
      if(typeof JSZip==='undefined'){ draft.warnings.push(`ZIP ignorat perquè JSZip no està carregat: ${file.name}`); continue; }
      const zip=await JSZip.loadAsync(file);
      const entries=Object.values(zip.files).filter(entry=>!entry.dir && /\.(xls|xlsx|xlsm|csv)$/i.test(entry.name));
      draft.warnings.push(`ZIP ${file.name}: ${entries.length} documents Excel detectats.`);
      for(const entry of entries) spreadsheetFiles.push({name:entry.name,arrayBuffer:await entry.async('arraybuffer')});
    }else if(/\.(xls|xlsx|xlsm|csv)$/i.test(name)){
      spreadsheetFiles.push({name:file.webkitRelativePath || file.name,arrayBuffer:await file.arrayBuffer()});
    }
  }
  for(const file of spreadsheetFiles){
    try{
      const parsed=teimor0913ParseFinancialWorkbook(file.name,file.arrayBuffer,kind);
      draft.files.push(file.name);
      draft.documents.push(parsed.doc);
      draft.warnings.push(...parsed.warnings);
    }catch(error){
      console.error(error);
      draft.warnings.push(`ERROR llegint ${file.name}: ${error.message}`);
    }
  }
  state.financialDraft=draft;
  renderImporter();
}

function teimor0913FinancialOptions(kind,selected){
  if(kind==='clientId') return '<option value="">Pendent de validar</option>'+options(data.clients,selected,c=>c.name||c.id);
  if(kind==='jobId') return '<option value="">Pendent de validar</option>'+options(data.jobs,selected,j=>`${j.year||''} · ${j.title||j.id}`);
  return '<option value="">Pendent de validar</option>'+options(data.budgets,selected,b=>`${b.number||b.id} · ${b.title||''}`);
}
function teimor0913FinancialPreviewHtml(draft){
  const docs=draft?.documents||[];
  if(!docs.length && !(draft?.warnings||[]).length) return '<div class="empty">No s’han detectat documents.</div>';
  const rows=docs.map(doc=>`<tr>
    <td><strong>${esc(teimor0913DocTypeLabel(doc))}</strong><br>${esc(doc.number||'Sense número')}<br><span class="muted">${esc(dateDisplay(doc.date))}</span></td>
    <td>${esc(doc.clientSnapshot?.name||'Client no detectat')}<br><span class="small-text">${esc(doc.clientSnapshot?.nif||'')}</span></td>
    <td>${esc(doc.concept||'Concepte pendent')}</td>
    <td class="num">${money(doc.base)}</td><td class="num">${num(doc.iva).toFixed(2)}%</td><td class="num"><strong>${money(teimor0913DocTotal(doc))}</strong></td>
    <td>${teimor0913MatchPill(doc)}<br><span class="small-text">${esc(doc.matchReason||'')}</span></td>
    <td>${esc(teimor0913SourceName(doc.sourceFile))}</td>
  </tr>
  <tr class="financial-review-row"><td colspan="8">
    <div class="small-text"><strong>Validació manual de ${esc(doc.number||doc.id)}:</strong> si la coincidència és suggerida o pendent, tria el client, l’obra i el pressupost correctes. El pressupost seleccionat estableix automàticament l’obra i el client.</div>
    <div class="filter-grid">
      <label>Client<select data-v0913-financial-field="clientId" data-v0913-financial-id="${esc(doc.id)}">${teimor0913FinancialOptions('clientId',doc.clientId)}</select></label>
      <label>Obra<select data-v0913-financial-field="jobId" data-v0913-financial-id="${esc(doc.id)}">${teimor0913FinancialOptions('jobId',doc.jobId)}</select></label>
      <label class="wide">Pressupost<select data-v0913-financial-field="budgetId" data-v0913-financial-id="${esc(doc.id)}">${teimor0913FinancialOptions('budgetId',doc.budgetId)}</select></label>
    </div>
  </td></tr>`).join('');
  const auto=docs.filter(doc=>doc.matchStatus==='automatica').length;
  const suggested=docs.filter(doc=>doc.matchStatus==='suggerida').length;
  const pending=docs.filter(doc=>doc.matchStatus==='pendent').length;
  return `<div class="card" id="v0913FinancialPreviewCard"><h2>Previsualització de ${esc(teimor0913KindLabel(draft.kind))}</h2>
    <div class="card notice-blue"><strong>Llibreria manual:</strong> aquests documents no creen ni dupliquen partides de la llibreria. Només es guarden com a factures/certificacions relacionades amb clients, obres i pressupostos.</div>
    <div class="import-summary"><div class="import-card"><span>Fitxers</span><strong>${draft.files?.length||0}</strong></div><div class="import-card"><span>Documents</span><strong>${docs.length}</strong></div><div class="import-card"><span>Automàtiques</span><strong>${auto}</strong></div><div class="import-card"><span>Suggerides</span><strong>${suggested}</strong></div><div class="import-card"><span>Pendents</span><strong>${pending}</strong></div></div>
    <div class="actions"><button class="primary" id="v0913ConfirmFinancialImport">Confirmar ${esc(teimor0913KindLabel(draft.kind).toLowerCase())}</button><button class="ghost" id="v0913DiscardFinancialImport">Descartar</button><button class="ghost" data-go="obres">Veure obres</button></div>
    ${docs.length ? table(['Tipus / número','Client llegit','Concepte','Base','IVA','Total','Coincidència','Origen'],rows) : ''}
    ${draft.warnings?.length ? `<h3>Registre de lectura</h3><div class="log">${esc(draft.warnings.join('\n'))}</div>`:''}
  </div>`;
}
function teimor0913FinancialImporterCard(){
  return `<div class="card" id="v0913FinancialImporter"><div class="toolbar"><div><h2>Importar factures i certificacions</h2><p class="muted">Llegeix Excel, CSV, carpeta o ZIP i proposa la relació amb les obres i pressupostos ja existents.</p></div></div>
    <div class="filter-grid"><label>Tipus de documents<select id="v0913FinancialKind"><option value="factura" ${state.financialDraft?.kind!=='certificacio'?'selected':''}>Factures</option><option value="certificacio" ${state.financialDraft?.kind==='certificacio'?'selected':''}>Certificacions</option></select></label></div>
    <div id="v0913FinancialDropzone" class="dropzone"><p>Selecciona els documents del tipus triat. Pots fer blocs de 50, com amb els pressupostos.</p><div class="actions" style="justify-content:center"><label class="primary file-label">Seleccionar documents<input id="v0913FinancialInput" type="file" multiple accept=".xls,.xlsx,.xlsm,.csv,.zip,.rar" hidden></label><label class="ghost file-label">Seleccionar carpeta<input id="v0913FinancialFolder" type="file" webkitdirectory directory multiple hidden></label></div></div>
    <div id="v0913FinancialPreview">${state.financialDraft ? teimor0913FinancialPreviewHtml(state.financialDraft) : '<div class="empty">Encara no has analitzat cap factura o certificació en aquesta sessió.</div>'}</div>
  </div>`;
}

function confirmFinancialImportV0913(){
  teimor0913EnsureData();
  const draft=state.financialDraft;
  if(!draft || !(draft.documents||[]).length) return alert('No hi ha documents financers per confirmar.');
  const target=draft.kind==='certificacio' ? data.certifications : data.invoices;
  let added=0,duplicates=0,pending=0;
  for(const source of draft.documents){
    const duplicate=target.find(existing=>{
      const sameKind=(existing.kind||draft.kind)===draft.kind;
      const sameNumber=source.number && existing.number && teimor0913NormId(source.number)===teimor0913NormId(existing.number);
      const sameDate=!source.date || !existing.date || source.date===existing.date;
      const sameSource=source.sourceFile && existing.sourceFile===source.sourceFile && (!source.number || source.number===existing.number);
      return sameKind && ((sameNumber && sameDate) || sameSource);
    });
    if(duplicate){ duplicates++; continue; }
    const item={...source,id:uid(draft.kind==='certificacio'?'CERT':'FAC'),importedAt:new Date().toISOString(),sourceFiles:[source.sourceFile].filter(Boolean),status:source.matchStatus==='automatica'?'Importada · vinculada':'Importada · pendent de revisar'};
    if(item.budgetId){ const budget=byId(data.budgets,item.budgetId); if(budget){ item.jobId=budget.jobId||item.jobId; item.clientId=budget.clientId||item.clientId; } }
    if(item.matchStatus!=='automatica') pending++;
    target.push(item); added++;
  }
  data.importLogs.push({id:uid('IMP'),date:new Date().toISOString(),files:draft.files||[],kind:draft.kind,countDocuments:draft.documents.length,added,duplicates,pendingMatches:pending,libraryAdded:0,libraryManualOnly:true});
  state.financialDraft=null;
  saveData();
  alert(`${teimor0913KindLabel(draft.kind)} importada. Documents nous: ${added}. Repetits omesos: ${duplicates}. Pendents de vincular/revisar: ${pending}.`);
  state.view='obres';
  render();
}
function discardFinancialImportV0913(){ state.financialDraft=null; renderImporter(); }
function updateFinancialDraftFieldV0913(event){
  const draft=state.financialDraft; if(!draft) return;
  const doc=draft.documents.find(item=>item.id===event.target.dataset.v0913FinancialId); if(!doc) return;
  const field=event.target.dataset.v0913FinancialField;
  doc[field]=event.target.value;
  if(field==='budgetId'){
    const budget=byId(data.budgets,doc.budgetId);
    if(budget){ doc.jobId=budget.jobId||''; doc.clientId=budget.clientId||''; }
  }else if(field==='jobId'){
    const job=byId(data.jobs,doc.jobId);
    if(job){ doc.clientId=job.clientId||doc.clientId; if(doc.budgetId && byId(data.budgets,doc.budgetId)?.jobId!==doc.jobId) doc.budgetId=''; }
  }else if(field==='clientId'){
    const budget=byId(data.budgets,doc.budgetId);
    if(budget && budget.clientId!==doc.clientId) doc.budgetId='';
    const job=byId(data.jobs,doc.jobId);
    if(job && job.clientId!==doc.clientId) doc.jobId='';
  }
  doc.matchStatus='manual'; doc.matchConfidence=100; doc.matchReason='Relació validada manualment a la previsualització.';
  renderImporter();
}

function teimor0913TraceBudgetHtml(budgets){
  if(!budgets.length) return empty('Aquesta obra encara no té pressupostos vinculats.');
  return table(['Data','Número','Concepte','Base','Total','Estat','Acció'],budgets.map(b=>`<tr><td>${esc(dateDisplay(b.date))}</td><td>${esc(b.number||b.id)}</td><td>${esc(b.title||'')}</td><td class="num">${money(budgetBase(b))}</td><td class="num">${money(budgetTotal(b))}</td><td>${statusPill(b.status||'')}</td><td><button class="ghost small" data-open-budget="${esc(b.id)}">Obrir pressupost</button></td></tr>`));
}
function teimor0913TraceInvoiceHtml(invoices){
  if(!invoices.length) return empty('Aquesta obra encara no té factures vinculades.');
  return table(['Data','Número','Concepte','Pressupost','Base','Total','Estat','Acció'],invoices.map(i=>`<tr><td>${esc(dateDisplay(i.date))}</td><td>${esc(i.number||i.id)}</td><td>${esc(i.concept||'')}</td><td>${esc(budgetName(i.budgetId)||'Sense pressupost')}</td><td class="num">${money(invoiceBase(i))}</td><td class="num">${money(invoiceTotal(i))}</td><td>${statusPill(i.paid?'Pagada':(i.status||'Pendent'))}</td><td><button class="ghost small" data-edit-invoice="${esc(i.id)}">Obrir factura</button></td></tr>`));
}
function teimor0913TraceCertificationHtml(certifications){
  if(!certifications.length) return empty('Aquesta obra encara no té certificacions vinculades.');
  return table(['Data','Número','Concepte','Pressupost','%','Base','Total','Estat'],certifications.map(c=>`<tr><td>${esc(dateDisplay(c.date))}</td><td>${esc(c.number||c.id)}</td><td>${esc(c.concept||'')}</td><td>${esc(budgetName(c.budgetId)||'Sense pressupost')}</td><td class="num">${c.percentage?num(c.percentage).toFixed(2)+'%':'—'}</td><td class="num">${money(c.base)}</td><td class="num">${money(teimor0913CertTotal(c))}</td><td>${teimor0913MatchPill(c)}</td></tr>`));
}
function teimor0913FindExistingDocument(id,kind){
  const list=kind==='certificacio' ? data.certifications : data.invoices;
  return list.find(doc=>doc.id===id);
}
function teimor0913SaveExistingRelation(id,kind){
  const doc=teimor0913FindExistingDocument(id,kind); if(!doc) return;
  if(doc.budgetId){
    const budget=byId(data.budgets,doc.budgetId);
    if(budget){ doc.jobId=budget.jobId||''; doc.clientId=budget.clientId||doc.clientId||''; }
  }else if(doc.jobId){
    const job=byId(data.jobs,doc.jobId);
    if(job) doc.clientId=job.clientId||doc.clientId||'';
  }
  doc.matchStatus=doc.jobId?'manual':'pendent';
  doc.matchConfidence=doc.jobId?100:0;
  doc.matchReason=doc.jobId?'Relació corregida manualment des d’Obres / traçabilitat.':'Encara sense obra vinculada.';
  doc.status=doc.jobId?'Importada · vinculada':'Importada · pendent de revisar';
  saveData(); renderObresV0913();
}
function updateExistingFinancialFieldV0913(event){
  const kind=event.target.dataset.v0913ExistingKind;
  const doc=teimor0913FindExistingDocument(event.target.dataset.v0913ExistingId,kind); if(!doc) return;
  const field=event.target.dataset.v0913ExistingField;
  doc[field]=event.target.value;
  if(field==='budgetId'){
    const budget=byId(data.budgets,doc.budgetId);
    if(budget){ doc.jobId=budget.jobId||''; doc.clientId=budget.clientId||doc.clientId||''; }
  }
}
function teimor0913UnmatchedHtml(){
  const docs=[...(data.invoices||[]).map(doc=>({...doc,__kind:'factura'})),...(data.certifications||[]).map(doc=>({...doc,__kind:'certificacio'}))].filter(doc=>!doc.jobId);
  if(!docs.length) return '<div class="notice-green">No hi ha factures ni certificacions pendents de relacionar amb una obra.</div>';
  const rows=[];
  docs.forEach(doc=>{
    rows.push(`<tr><td>${esc(teimor0913DocTypeLabel(doc))}</td><td>${esc(doc.number||doc.id)}</td><td>${esc(byId(data.clients,doc.clientId)?.name||doc.clientSnapshot?.name||'Client pendent')}</td><td>${esc(dateDisplay(doc.date))}</td><td class="num">${money(teimor0913DocTotal(doc))}</td><td>${esc(budgetName(doc.budgetId)||'Sense pressupost')}</td><td>${esc(teimor0913SourceName(doc.sourceFile||''))}</td><td><button class="ghost small" data-go="importer">Revisar importació</button></td></tr>`);
    rows.push(`<tr class="financial-review-row"><td colspan="8"><div class="small-text"><strong>Vincular ${esc(doc.number||doc.id)}:</strong> pots fer-ho ara sense tornar a importar el fitxer.</div><div class="filter-grid"><label>Client<select data-v0913-existing-field="clientId" data-v0913-existing-id="${esc(doc.id)}" data-v0913-existing-kind="${esc(doc.__kind)}">${teimor0913FinancialOptions('clientId',doc.clientId)}</select></label><label>Obra<select data-v0913-existing-field="jobId" data-v0913-existing-id="${esc(doc.id)}" data-v0913-existing-kind="${esc(doc.__kind)}">${teimor0913FinancialOptions('jobId',doc.jobId)}</select></label><label class="wide">Pressupost<select data-v0913-existing-field="budgetId" data-v0913-existing-id="${esc(doc.id)}" data-v0913-existing-kind="${esc(doc.__kind)}">${teimor0913FinancialOptions('budgetId',doc.budgetId)}</select></label></div><button class="primary small" data-v0913-save-existing="${esc(doc.id)}" data-v0913-existing-kind="${esc(doc.__kind)}">Guardar relació</button></td></tr>`);
  });
  return table(['Tipus','Número','Client llegit','Data','Total','Pressupost','Origen','Acció'],rows);
}
function renderObresV0913(){
  teimor0913EnsureData();
  setHeader('Obres / traçabilitat','Vista central de cada obra amb els pressupostos, factures i certificacions relacionats.');
  const jobs=[...data.jobs].sort((a,b)=>Number(b.year||0)-Number(a.year||0) || String(a.title||'').localeCompare(String(b.title||'')));
  const selected=byId(data.jobs,state.selectedJobId) || jobs[0] || null;
  const allDocs=[...(data.invoices||[]),...(data.certifications||[])];
  const selectedBudgets=selected?jobBudgets(selected.id):[];
  const selectedInvoices=selected?jobInvoices(selected.id):[];
  const selectedCertifications=selected?data.certifications.filter(doc=>doc.jobId===selected.id):[];
  const totalBudget=jobs.reduce((sum,job)=>sum+jobBudgetTotal(job.id),0);
  const totalInvoices=data.invoices.reduce((sum,doc)=>sum+invoiceTotal(doc),0);
  const totalCertifications=data.certifications.reduce((sum,doc)=>sum+teimor0913CertTotal(doc),0);
  setContent(`<div class="grid four"><div class="kpi"><span>Obres</span><strong>${jobs.length}</strong></div><div class="kpi"><span>Pressupostos</span><strong>${data.budgets.length}</strong></div><div class="kpi"><span>Factures</span><strong>${data.invoices.length}</strong></div><div class="kpi"><span>Certificacions</span><strong>${data.certifications.length}</strong></div></div>
    <div class="card"><div class="toolbar"><div><h2>Relació per obra</h2><p class="muted">Pressupostat: ${money(totalBudget)} · Facturat: ${money(totalInvoices)} · Certificat: ${money(totalCertifications)}</p></div><button class="primary" data-go="importer">Importar factures / certificacions</button></div>${table(['Any','Obra','Client','Adreça','Pressupostos','Factures','Certificacions','Pressupostat','Facturat','Certificat','Acció'],jobs.map(job=>{ const bs=jobBudgets(job.id),is=jobInvoices(job.id),cs=data.certifications.filter(doc=>doc.jobId===job.id); return `<tr><td>${esc(job.year||'')}</td><td><strong>${esc(job.title||'Obra sense nom')}</strong></td><td>${esc(clientName(job.clientId))}</td><td>${esc(job.address||'')}</td><td class="num">${bs.length}</td><td class="num">${is.length}</td><td class="num">${cs.length}</td><td class="num">${money(jobBudgetTotal(job.id))}</td><td class="num">${money(jobInvoiceTotal(job.id))}</td><td class="num">${money(cs.reduce((sum,doc)=>sum+teimor0913CertTotal(doc),0))}</td><td class="nowrap"><button class="primary small" data-v0913-trace-job="${esc(job.id)}">Veure traçabilitat</button> <button class="ghost small" data-edit-job="${esc(job.id)}">Editar obra</button></td></tr>`;}))}</div>
    ${selected?`<div class="card"><div class="toolbar"><div><h2>${esc(selected.title||'Obra sense nom')}</h2><p>${esc(clientName(selected.clientId)||'Client pendent')} · ${esc(selected.address||'')}${selected.city?' · '+esc(selected.city):''}</p></div><button class="ghost" data-edit-job="${esc(selected.id)}">Editar obra</button></div><div class="grid four"><div class="kpi"><span>Pressupostos</span><strong>${selectedBudgets.length}</strong></div><div class="kpi"><span>Factures</span><strong>${selectedInvoices.length}</strong></div><div class="kpi"><span>Certificacions</span><strong>${selectedCertifications.length}</strong></div><div class="kpi"><span>Pressupostat / facturat</span><strong>${money(jobBudgetTotal(selected.id)-jobInvoiceTotal(selected.id))}</strong></div></div><div class="grid two"><div class="card"><h3>Pressupostos</h3>${teimor0913TraceBudgetHtml(selectedBudgets)}</div><div class="card"><h3>Factures</h3>${teimor0913TraceInvoiceHtml(selectedInvoices)}</div><div class="card"><h3>Certificacions</h3>${teimor0913TraceCertificationHtml(selectedCertifications)}</div></div></div>`:'<div class="card">'+empty('Encara no hi ha obres. Importa pressupostos o crea una obra per començar la traçabilitat.')+'</div>'}
    <div class="card"><h2>Documents pendents de vincular a una obra</h2>${teimor0913UnmatchedHtml()}</div>`);
}

const __teimorBaseRenderV0913=render;
render=function(){
  teimor0913EnsureData();
  if(state.view==='obres') return renderObresV0913();
  return __teimorBaseRenderV0913();
};

const __teimorBaseBindViewEventsV0913=bindViewEvents;
bindViewEvents=function(){
  __teimorBaseBindViewEventsV0913();
  document.querySelectorAll('[data-v0913-trace-job]').forEach(button=>button.onclick=()=>{ state.selectedJobId=button.dataset.v0913TraceJob; renderObresV0913(); });
  document.querySelectorAll('[data-v0913-financial-field]').forEach(field=>field.onchange=updateFinancialDraftFieldV0913);
  const financialInput=document.getElementById('v0913FinancialInput'); if(financialInput) financialInput.onchange=e=>handleFinancialImportV0913([...e.target.files]);
  const financialFolder=document.getElementById('v0913FinancialFolder'); if(financialFolder) financialFolder.onchange=e=>handleFinancialImportV0913([...e.target.files]);
  const financialDropzone=document.getElementById('v0913FinancialDropzone');
  if(financialDropzone){
    financialDropzone.ondragover=e=>{e.preventDefault(); financialDropzone.classList.add('drag');};
    financialDropzone.ondragleave=()=>financialDropzone.classList.remove('drag');
    financialDropzone.ondrop=e=>{e.preventDefault(); financialDropzone.classList.remove('drag'); handleFinancialImportV0913([...e.dataTransfer.files]);};
  }
  const confirmFinancial=document.getElementById('v0913ConfirmFinancialImport'); if(confirmFinancial) confirmFinancial.onclick=confirmFinancialImportV0913;
  const discardFinancial=document.getElementById('v0913DiscardFinancialImport'); if(discardFinancial) discardFinancial.onclick=discardFinancialImportV0913;
  document.querySelectorAll('[data-edit-invoice]').forEach(button=>button.onclick=()=>renderInvoices(button.dataset.editInvoice));
  document.querySelectorAll('[data-v0913-existing-field]').forEach(field=>field.onchange=updateExistingFinancialFieldV0913);
  document.querySelectorAll('[data-v0913-save-existing]').forEach(button=>button.onclick=()=>teimor0913SaveExistingRelation(button.dataset.v0913SaveExisting,button.dataset.v0913ExistingKind));
};

const __teimorBaseRenderImporterV0913=renderImporter;
renderImporter=function(){
  __teimorBaseRenderImporterV0913();
  const content=document.getElementById('content');
  if(content) content.insertAdjacentHTML('beforeend',teimor0913FinancialImporterCard());
  bindViewEvents();
};

const __teimorBaseRenderInvoicesV0913=renderInvoices;
renderInvoices=function(editId=''){
  __teimorBaseRenderInvoicesV0913(editId);
  const content=document.getElementById('content');
  if(!content) return;
  const card=`<div class="card"><div class="toolbar"><h2>Certificacions importades</h2><button class="ghost" data-go="obres">Veure per obra</button></div>${teimor0913TraceCertificationHtml(data.certifications||[])}</div>`;
  content.insertAdjacentHTML('beforeend',card);
  bindViewEvents();
};

saveInvoice=function(event){
  event.preventDefault();
  const fields=formObj(event.target);
  const old=byId(data.invoices,fields.editId)||{};
  const base=num(fields.base), iva=num(fields.iva);
  const invoice={...old,id:fields.id,number:fields.number,date:fields.date,jobId:fields.jobId,budgetId:fields.budgetId,type:fields.type,concept:fields.concept,base,iva,total:Number((base*(1+iva/100)).toFixed(2)),paid:fields.paid==='true',notes:fields.notes};
  const budget=byId(data.budgets,invoice.budgetId);
  const job=byId(data.jobs,invoice.jobId || budget?.jobId);
  if(!invoice.jobId && budget?.jobId) invoice.jobId=budget.jobId;
  if(!invoice.clientId) invoice.clientId=budget?.clientId || job?.clientId || '';
  const index=data.invoices.findIndex(item=>item.id===fields.editId || item.id===invoice.id);
  if(index>=0) data.invoices[index]=invoice; else data.invoices.push(invoice);
  saveData(); renderInvoices();
};

const __teimorBaseDeleteClientV0913=deleteClient;
deleteClient=function(id){
  const affected=(data.certifications||[]).filter(doc=>doc.clientId===id).map(doc=>({doc,clientId:doc.clientId}));
  const result=__teimorBaseDeleteClientV0913(id);
  if(data.clients.some(client=>client.id===id)) affected.forEach(item=>{ item.doc.clientId=item.clientId; });
  else affected.forEach(item=>{ item.doc.clientId=''; });
  return result;
};
const __teimorBaseDeleteJobV0913=deleteJob;
deleteJob=function(id){
  const affected=(data.certifications||[]).filter(doc=>doc.jobId===id).map(doc=>({doc,jobId:doc.jobId}));
  const result=__teimorBaseDeleteJobV0913(id);
  if(data.jobs.some(job=>job.id===id)) affected.forEach(item=>{ item.doc.jobId=item.jobId; });
  else affected.forEach(item=>{ item.doc.jobId=''; });
  return result;
};
const __teimorBaseDeleteBudgetV0913=deleteBudget;
deleteBudget=function(id){
  const affected=(data.certifications||[]).filter(doc=>doc.budgetId===id).map(doc=>({doc,budgetId:doc.budgetId}));
  const result=__teimorBaseDeleteBudgetV0913(id);
  if(data.budgets.some(budget=>budget.id===id)) affected.forEach(item=>{ item.doc.budgetId=item.budgetId; });
  else affected.forEach(item=>{ item.doc.budgetId=''; });
  return result;
};

/* =========================================================
   TEIMOR V09.13.1 · IDENTIFICACIÓ D'OBRA I RECUPERACIÓ
   - Paraula clau/concepte i adreça d'obra són camps independents.
   - L'adreça d'obra només s'accepta des d'un camp d'obra explícit.
   - Les dades de la versió anterior es poden recuperar i fusionar.
   ========================================================= */

data.meta = data.meta || {};
data.meta.version = '9.13.1-identificacio-obra-recuperacio';

function teimor0913v2Clean(value){
  return cleanText(String(value == null ? '' : value).replace(/\u00a0/g,' '));
}

function teimor0913v2LooksLikeLabel(value){
  const t=strip(value);
  return /^(?:client(?:e)?|client\s*\/\s*empresa|destinatari|destinatario|senyors|sres|promotor|propietari|propiedad|nif|dni|cif|nif\s*\/\s*(?:dni|cif)|codi postal|codigo postal|cp|c\.p\.|poblacio|poblacion|municipi|municipio|localitat|localidad|ciutat|ciudad|adre[cç]a|direccio|direccion|domicili|domicilio|concepte|concepto|obra|feina|treball|trabajo|unitat|unidad|quantitat|cantidad|amidament|medicio|medicion|preu|precio|import|importe|total|subtotal|observacions|observaciones|notes|notas)$/i.test(t);
}

function teimor0913v2LooksLikeLineItem(value){
  const t=teimor0913v2Clean(value);
  if(!t) return false;
  if(/^\s*[·•*]\s*/.test(t)) return true;
  if(/^(?:partida|cap[ií]tol|concepte|concepto|treballs?|trabajos?|unitat|unidad|quantitat|cantidad|amidament|medici[oó]n?|preu|precio|import|importe|total|subtotal|descripci[oó]n|descripció)\b/i.test(t)) return true;
  if(/(?:m²|m2|m3|m³|ml|kg|ud|ut|h)\b/i.test(t) && /(?:€|=|x|×|\d+[.,]\d+)/i.test(t)) return true;
  if(/\b(?:subministrament|suministro|col\.?locaci[oó]|colocaci[oó]n|retirada|neteja|limpieza|impermeabilitzaci[oó]|impermeabilizaci[oó]n|revestiment|revestimiento|enderroc|demolici[oó]|reparaci[oó]|muntatge|montaje)\b/i.test(t) && !looksLikeAddress(t)) return true;
  return false;
}

function teimor0913v2Accept(value,kind,sameRow){
  const t=teimor0913v2Clean(value);
  if(!t || teimor0913v2LooksLikeLabel(t) || isTeimorText(t) || looksLikeCalculationLine(t)) return '';
  if(kind==='name') return isProbablyClientName(t) ? t : '';
  if(kind==='postal') return /^(?:0[1-9]|[1-4][0-9]|5[0-2])[0-9]{3}$/.test(t.replace(/\s/g,'')) ? t.replace(/\s/g,'') : '';
  if(kind==='nif') return teimor0911NifFromText(t) || '';
  if(kind==='city') return !looksLikeAddress(t) && !/^\d{5}$/.test(t) && t.length<=100 && !teimor0913v2LooksLikeLineItem(t) ? t : '';
  if(kind==='concept'){
    return t.length>1 && t.length<=240 && !teimor0913v2LooksLikeLineItem(t) ? t : '';
  }
  if(kind==='address'){
    if(t.length>180 || teimor0913v2LooksLikeLineItem(t)) return '';
    if(sameRow) return t;
    return looksLikeAddress(t) || /\b\d{1,5}\b/.test(t) || looksLikeCityLine(t) ? t : '';
  }
  return t;
}

function teimor0913v2StrictFieldValue(records,aliases,kind,allowNextRow){
  const list=teimor099Aliases(aliases);
  const source=records||[];
  for(const record of source){
    const cell=teimor099CellText(record.text);
    if(!cell || teimor0911TableHeaderRow(record)) continue;
    const inline=teimor099InlineValue(cell,list);
    const inlineValue=teimor0913v2Accept(inline,kind,true);
    if(inlineValue) return inlineValue;
    if(!teimor099IsExactLabel(cell,list)) continue;
    const row=record.raw||[];
    for(let col=record.col+1;col<row.length;col++){
      const candidate=teimor099CellText(row[col]);
      if(!candidate || teimor099IsExactLabel(candidate,list)) continue;
      const value=teimor0913v2Accept(candidate,kind,true);
      if(value) return value;
    }
    if(record.col>0){
      const candidate=teimor099CellText(row[record.col-1]);
      const value=teimor0913v2Accept(candidate,kind,true);
      if(value) return value;
    }
    if(allowNextRow!==false){
      for(const next of source){
        if(next.sheet!==record.sheet || next.rowIndex!==record.rowIndex+1 || next.col!==record.col) continue;
        const value=teimor0913v2Accept(next.text,kind,false);
        if(value) return value;
      }
    }
  }
  return '';
}

const TEIMOR0913V2_CLIENT_NAME_LABELS=[
  'client / empresa','client','cliente','destinatari','destinatario','senyors','sres',
  'promotor','propietari','propiedad','comunitat','comunidad'
];
const TEIMOR0913V2_FISCAL_ADDRESS_LABELS=[
  'adreça fiscal','adressa fiscal','direcció fiscal','direccion fiscal','domicili fiscal',
  'domicilio fiscal','adreça','adressa','direcció','direccion','domicili','domicilio'
];
const TEIMOR0913V2_POSTAL_LABELS=['codi postal','codigo postal','cp','c.p.'];
const TEIMOR0913V2_NIF_LABELS=[
  'nif','dni','cif','nif/cif','nif / cif','nif/dni','nif / dni','nif/dni/cif',
  'nif / dni / cif','identificació fiscal','identificacion fiscal'
];
const TEIMOR0913V2_CITY_LABELS=[
  'població','poblacion','població / ciutat','poblacion / ciudad','municipi',
  'municipio','localitat','localidad','ciutat','ciudad'
];
const TEIMOR0913V2_WORK_ADDRESS_LABELS=[
  'adreça obra','adressa obra','adreça de l’obra',"adreça de l'obra",'adressa de lobra',
  'adreça de la obra','direcció obra','direccio obra','direccion obra','dirección de la obra',
  'emplaçament','emplazamiento','ubicació obra','ubicacio obra','ubicacion obra',
  'localització obra','localitzacio obra','localización obra','situació obra','situacio obra',
  'situacion obra','lloc de l’obra',"lloc de l'obra",'lugar de la obra','domicili obra',
  'domicilio obra','domicili de l’obra',"domicili de l'obra",'domicilio de la obra',
  'adreça feina','adressa feina','direcció feina','direccio feina','direccion trabajo',
  'adreça del treball','adressa del treball'
];
const TEIMOR0913V2_WORK_POSTAL_LABELS=['codi postal obra','codigo postal obra','cp obra','postal obra'];
const TEIMOR0913V2_WORK_CITY_LABELS=[
  'població obra','poblacion obra','municipi obra','municipio obra','localitat obra',
  'localidad obra','ciutat obra','ciudad obra','població de l’obra',"població de l'obra",
  'municipi de l’obra',"municipi de l'obra",'municipio de la obra','ciutat obra'
];

function teimor0913v2ReadFlat(arrayBuffer){
  const wb=XLSX.read(arrayBuffer,{type:'array',cellDates:true,raw:true,cellNF:true,cellText:true});
  const flat=[];
  for(const sheetName of wb.SheetNames||[]){
    const rows=XLSX.utils.sheet_to_json(wb.Sheets[sheetName],{header:1,defval:'',raw:true,blankrows:false});
    rows.forEach((row,rowIndex)=>flat.push({sheet:sheetName,rowIndex,cells:(row||[]).map(teimor099CellText).filter(Boolean),raw:row||[]}));
  }
  return flat;
}

function teimor0913v2RecipientBox(flat){
  const records=teimor0911TopRightRecords(flat);
  const name=teimor0913v2StrictFieldValue(records,TEIMOR0913V2_CLIENT_NAME_LABELS,'name',true);
  const fiscalAddress=teimor0913v2StrictFieldValue(records,TEIMOR0913V2_FISCAL_ADDRESS_LABELS,'address',true);
  const postalCode=teimor0913v2StrictFieldValue(records,TEIMOR0913V2_POSTAL_LABELS,'postal',true);
  const nif=teimor0913v2StrictFieldValue(records,TEIMOR0913V2_NIF_LABELS,'nif',true);
  const city=teimor0913v2StrictFieldValue(records,TEIMOR0913V2_CITY_LABELS,'city',true);
  const lines=(teimor0911BoxLines(records)||[]).map(teimor0913v2Clean).filter(line=>line && !teimor0913v2LooksLikeLineItem(line));
  const joined=lines.join('\n');
  const finalPostal=postalCode || teimor0911PostalFromText(joined);
  const finalNif=nif || teimor0911NifFromText(joined);
  const fallbackName=lines.find(line=>isProbablyClientName(line) && !looksLikeAddress(line) && !looksLikeCityLine(line) && !teimor0911NifFromText(line) && !/^\d/.test(line)) || '';
  const finalName=cleanClientName(name || fallbackName);
  const fallbackAddress=lines.find(line=>looksLikeAddress(line)) || '';
  const finalAddress=fiscalAddress || fallbackAddress;
  const cityFromLabel=city ? (teimor0911CityFromText(city,finalPostal) || city.replace(new RegExp('\\b'+(finalPostal||'00000')+'\\b','i'),'').trim()) : '';
  const cityFromPostal=finalPostal ? teimor0911CityFromText(lines.find(line=>line.includes(finalPostal))||joined,finalPostal) : '';
  const finalCity=cityFromLabel || cityFromPostal || (lines.find(line=>looksLikeCityLine(line) && !looksLikeAddress(line))||'');
  return {
    name:finalName==='Client pendent de revisar'?'':finalName,
    fiscalAddress:finalAddress,
    postalCode:finalPostal,
    nif:finalNif,
    city:teimor0913v2Clean(finalCity),
    phone:detectPhone(joined)||'',
    email:firstRegex(joined,/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)||'',
    lines
  };
}

function teimor0913v2GenericWorkAddress(flat,records){
  const topRight=teimor0911TopRightRecords(flat);
  const isTopRight=record=>topRight.some(item=>item.sheet===record.sheet && item.rowIndex===record.rowIndex && item.col===record.col);
  const genericLabels=['adreça','adressa','direcció','direccio','direccion','domicili','domicilio','ubicació','ubicacio','ubicacion'];
  for(const record of records||[]){
    if(isTopRight(record) || !teimor099IsExactLabel(record.text,teimor099Aliases(genericLabels))) continue;
    const context=(flat||[]).filter(row=>row.sheet===record.sheet && Math.abs(row.rowIndex-record.rowIndex)<=2)
      .flatMap(row=>(row.raw||[]).map(teimor099CellText)).join(' ');
    if(!/\b(?:obra|feina|treball|trabajo|emplaçament|emplazamiento|ubicaci[oó]n)\b/i.test(context)) continue;
    const value=teimor0913v2StrictFieldValue([record,...(records||[])],genericLabels,'address',true);
    if(value && (looksLikeAddress(value) || /\b\d{1,5}\b/.test(value) || looksLikeCityLine(value))) return value;
  }
  return '';
}

function teimor0913v2WorkData(flat){
  const records=teimor0911CellRecords(flat);
  const address=teimor0913v2StrictFieldValue(records,TEIMOR0913V2_WORK_ADDRESS_LABELS,'address',true)
    || teimor0913v2GenericWorkAddress(flat,records);
  const postalCode=teimor0913v2StrictFieldValue(records,TEIMOR0913V2_WORK_POSTAL_LABELS,'postal',true)
    || teimor0911PostalFromText(address);
  const cityValue=teimor0913v2StrictFieldValue(records,TEIMOR0913V2_WORK_CITY_LABELS,'city',true);
  const city=cityValue
    ? (teimor0911CityFromText(cityValue,postalCode)||teimor0913v2Clean(cityValue).replace(new RegExp('\\b'+(postalCode||'00000')+'\\b','i'),'').trim())
    : teimor0911CityFromText(address,postalCode);
  return {address:teimor0913v2Clean(address),city:teimor0913v2Clean(city),postalCode};
}

function teimor0913v2Concept(flat){
  return teimor0913v2StrictFieldValue(teimor0911CellRecords(flat),['concepte','concepto'],'concept',false);
}

function teimor0913v2Client(fileName,flat){
  const box=teimor0913v2RecipientBox(flat);
  const work=teimor0913v2WorkData(flat);
  const name=cleanClientName(box.name||'');
  const reviewIssues=[];
  if(name==='Client pendent de revisar') reviewIssues.push('No s’ha detectat el nom dins del quadre superior dret.');
  if(!box.fiscalAddress) reviewIssues.push('No s’ha detectat l’adreça fiscal dins del quadre superior dret.');
  if(!box.city) reviewIssues.push('No s’ha detectat la població del client dins del quadre superior dret.');
  if(!box.postalCode) reviewIssues.push('No s’ha detectat el codi postal del client dins del quadre superior dret.');
  if(!box.nif) reviewIssues.push('No s’ha detectat NIF/DNI/CIF dins del quadre superior dret.');
  if(!work.address) reviewIssues.push('No s’ha detectat l’adreça de l’obra en un camp explícit d’obra.');
  return {
    id:uid('CLI'),tempKey:uid('TMPCLI'),name,nif:box.nif||'',phone:box.phone||'',email:box.email||'',contact:'',
    fiscalAddress:box.fiscalAddress||'',postalCode:box.postalCode||'',city:box.city||'',
    workAddress:work.address||'',workCity:work.city||'',workPostalCode:work.postalCode||'',
    status:'Actiu',source:fileName,sourceFiles:[fileName],reviewIssues,
    needsReview:reviewIssues.length>0,notes:'Client llegit exclusivament del quadre superior dret. L’obra es llegeix en camps separats.'
  };
}

function teimor0913v2Context(fileName,arrayBuffer){
  const flat=teimor0913v2ReadFlat(arrayBuffer);
  return {flat,client:teimor0913v2Client(fileName,flat),work:teimor0913v2WorkData(flat),concept:teimor0913v2Concept(flat)};
}

detectClientV099=function(fileName,flat){ return teimor0913v2Client(fileName,flat); };
detectClient=detectClientV099;
detectBudgetConceptV099=function(fileName,flat){ return teimor0913v2Concept(flat); };
detectBudgetConcept=detectBudgetConceptV099;
detectJobTitle=function(fileName,flat){ return teimor0913v2Concept(flat); };

const __teimorBaseParseWorkbookV0913V2=parseWorkbook;
parseWorkbook=function(fileName,arrayBuffer){
  const parsed=__teimorBaseParseWorkbookV0913V2(fileName,arrayBuffer);
  let context=null;
  try{ context=teimor0913v2Context(fileName,arrayBuffer); }catch(error){ console.warn('No s’ha pogut aplicar la lectura estricta de camps:',error); }
  if(!context) return parsed;
  const client=context.client||{};
  const work=context.work||{};
  const keyword=teimor0913v2Clean(context.concept||'');
  const safeKeyword=keyword || 'Concepte pendent de revisar';
  parsed.client={...(parsed.client||{}),...client};
  parsed.job={...(parsed.job||{}),
    title:safeKeyword,keyword:keyword,clientTempKey:client.tempKey,
    address:work.address||'',workAddress:work.address||'',city:work.city||'',
    workCity:work.city||'',postalCode:work.postalCode||'',workPostalCode:work.postalCode||''
  };
  parsed.budget={...(parsed.budget||{}),
    title:safeKeyword,keyword:keyword,clientTempKey:client.tempKey,jobTempKey:parsed.job.id,
    workAddress:work.address||'',workCity:work.city||'',workPostalCode:work.postalCode||''
  };
  parsed.warnings=Array.isArray(parsed.warnings) ? parsed.warnings : [];
  if(!keyword) parsed.warnings.push(fileName+': no s’ha trobat una paraula clau segura a l’etiqueta Concepte/Concepto.');
  if(client.reviewIssues?.length) parsed.warnings.push(fileName+': '+client.reviewIssues.join(' '));
  parsed.warnings=[...new Set(parsed.warnings)];
  return parsed;
};

function teimor0913v2BudgetKeyword(budget){
  return teimor0913v2Clean(budget?.keyword||budget?.workKeyword||budget?.title||'');
}
function teimor0913v2JobKeyword(job){
  return teimor0913v2Clean(job?.keyword||job?.workKeyword||job?.title||'');
}
function teimor0913v2JobAddress(job){
  return teimor0913v2Clean(job?.workAddress||job?.address||'');
}
function teimor0913v2JobCity(job){
  return teimor0913v2Clean(job?.workCity||job?.city||'');
}
function teimor0913v2BudgetAddress(budget){
  return teimor0913v2Clean(budget?.workAddress||budget?.address||'');
}
function teimor0913v2Overlap(a,b){
  const aa=new Set(teimor0913Tokens(a)),bb=new Set(teimor0913Tokens(b));
  if(!aa.size || !bb.size) return 0;
  let hits=0; aa.forEach(token=>{ if(bb.has(token)) hits++; });
  return hits/Math.max(aa.size,bb.size);
}

function teimor0913v2ResolveBudgetJob(budget){
  if(budget?.jobId && byId(data.jobs,budget.jobId)) return byId(data.jobs,budget.jobId);
  const clientId=budget?.clientId||'';
  const keyword=teimor0913v2BudgetKeyword(budget);
  const address=teimor0913v2BudgetAddress(budget);
  const year=budgetYear(budget);
  const candidates=(data.jobs||[]).filter(job=>!clientId || job.clientId===clientId).map(job=>{
    let score=0;
    if(job.mainBudgetId===budget.id) score+=200;
    if(clientId && job.clientId===clientId) score+=20;
    if(year && Number(job.year)===Number(year)) score+=10;
    const jobKeyword=teimor0913v2JobKeyword(job);
    const jobAddress=teimor0913v2JobAddress(job);
    if(address && jobAddress && strip(address)===strip(jobAddress)) score+=120;
    else if(address && jobAddress) score+=teimor0913v2Overlap(address,jobAddress)*70;
    if(keyword && jobKeyword && strip(keyword)===strip(jobKeyword)) score+=120;
    else if(keyword && jobKeyword) score+=teimor0913v2Overlap(keyword,jobKeyword)*80;
    return {job,score};
  }).sort((a,b)=>b.score-a.score);
  if(candidates.length && candidates[0].score>=120 && (!candidates[1] || candidates[0].score>candidates[1].score+15)) return candidates[0].job;
  return null;
}

function teimor0913v2NormalizeData(){
  __teimorBaseEnsureDataV0913V2();
  data.clients.forEach(client=>{
    client.name=teimor0913v2Clean(client.name);
    client.nif=teimor0913v2Clean(client.nif).toUpperCase();
    client.fiscalAddress=teimor0913v2Clean(client.fiscalAddress);
    client.postalCode=teimor0913v2Clean(client.postalCode);
    client.city=teimor0913v2Clean(client.city);
    client.workAddress=teimor0913v2Clean(client.workAddress);
    client.workCity=teimor0913v2Clean(client.workCity);
    client.workPostalCode=teimor0913v2Clean(client.workPostalCode);
  });
  data.jobs.forEach(job=>{
    job.keyword=teimor0913v2JobKeyword(job);
    job.title=teimor0913v2Clean(job.title||job.keyword||'');
    if(!job.keyword) job.keyword=job.title;
    job.workAddress=teimor0913v2JobAddress(job);
    job.address=job.workAddress;
    job.workCity=teimor0913v2JobCity(job);
    job.city=job.workCity;
    job.workPostalCode=teimor0913v2Clean(job.workPostalCode||job.postalCode||'');
    job.postalCode=job.workPostalCode;
    if(!job.year && job.date) job.year=Number(String(job.date).slice(0,4))||0;
  });
  data.budgets.forEach(budget=>{
    budget.keyword=teimor0913v2BudgetKeyword(budget);
    budget.workAddress=teimor0913v2BudgetAddress(budget);
    budget.workCity=teimor0913v2Clean(budget.workCity||'');
    budget.workPostalCode=teimor0913v2Clean(budget.workPostalCode||'');
    const job=budget.jobId ? byId(data.jobs,budget.jobId) : null;
    if(job){
      if(!budget.keyword) budget.keyword=teimor0913v2JobKeyword(job);
      if(!budget.workAddress) budget.workAddress=teimor0913v2JobAddress(job);
      if(!budget.workCity) budget.workCity=teimor0913v2JobCity(job);
      if(!budget.workPostalCode) budget.workPostalCode=teimor0913v2Clean(job.workPostalCode||'');
    }
  });
  data.budgets.forEach(budget=>{
    const job=teimor0913v2ResolveBudgetJob(budget);
    if(job && (!budget.jobId || !byId(data.jobs,budget.jobId))) budget.jobId=job.id;
  });
  data.budgets.forEach(budget=>{
    const job=budget.jobId ? byId(data.jobs,budget.jobId) : null;
    if(job){
      if(!job.mainBudgetId) job.mainBudgetId=budget.id;
      if(!job.keyword && budget.keyword) job.keyword=budget.keyword;
      if(!job.title && budget.keyword) job.title=budget.keyword;
      if(!job.workAddress && budget.workAddress){ job.workAddress=budget.workAddress; job.address=budget.workAddress; }
      if(!job.workCity && budget.workCity){ job.workCity=budget.workCity; job.city=budget.workCity; }
    }
  });
}

const __teimorBaseEnsureDataV0913V2=teimor0913EnsureData;
teimor0913EnsureData=function(){
  __teimorBaseEnsureDataV0913V2();
  data.library=Array.isArray(data.library) ? data.library : [];
  data.settings=data.settings || defaultData().settings;
  teimor0913v2NormalizeData();
};

function teimor0913v2LooksLikeSeed(source){
  const budgets=Array.isArray(source?.budgets) ? source.budgets : [];
  const jobs=Array.isArray(source?.jobs) ? source.jobs : [];
  const clients=Array.isArray(source?.clients) ? source.clients : [];
  return !budgets.length || (budgets.length===1 && budgets[0]?.id==='P-2016-001' && jobs.length<=1 && clients.length<=1);
}

function teimor0913v2RecoverLocalStorage(){
  try{
    if(!window.localStorage || !teimor0913v2LooksLikeSeed(data)) return false;
    const candidates=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(!key || key===STORE_KEY || !/teimor|pressupost|gestor/i.test(key)) continue;
      try{
        const value=JSON.parse(localStorage.getItem(key)||'null');
        if(value && Array.isArray(value.budgets) && value.budgets.length>data.budgets.length) candidates.push({key,value});
      }catch(error){}
    }
    candidates.sort((a,b)=>((b.value.budgets?.length||0)+(b.value.jobs?.length||0)+(b.value.clients?.length||0))-((a.value.budgets?.length||0)+(a.value.jobs?.length||0)+(a.value.clients?.length||0)));
    if(!candidates.length) return false;
    data=candidates[0].value;
    data.meta=data.meta||{};
    data.meta.recoveredFromLocalStorageKey=candidates[0].key;
    state.selectedBudgetId=data.budgets?.[0]?.id||'';
    teimor0913v2NormalizeData();
    saveData();
    return true;
  }catch(error){
    console.warn('No s’han pogut recuperar dades locals antigues:',error);
    return false;
  }
}

function teimor0913v2MergeRecord(existing,incoming){
  const out={...(existing||{})};
  Object.entries(incoming||{}).forEach(([key,value])=>{
    if(key==='id' || value===undefined || value===null || value==='') return;
    if(Array.isArray(value)){ if(value.length) out[key]=value; }
    else out[key]=value;
  });
  return out;
}

function teimor0913v2SameText(a,b){
  return !!a && !!b && strip(a)===strip(b);
}

function teimor0913v2MergePreviousData(source){
  const incoming=source&&typeof source==='object' ? source : {};
  teimor0913EnsureData();
  const clientMap=new Map(),jobMap=new Map(),budgetMap=new Map();
  let addedClients=0,updatedClients=0,addedJobs=0,updatedJobs=0,addedBudgets=0,updatedBudgets=0;
  const incomingClients=Array.isArray(incoming.clients)?incoming.clients:[];
  for(const raw of incomingClients){
    const client={...raw};
    const nif=teimor0913v2Clean(client.nif).toUpperCase();
    const name=teimor0913v2Clean(client.name);
    let existing=client.id ? byId(data.clients,client.id) : null;
    if(!existing && nif) existing=data.clients.find(item=>teimor0913v2Clean(item.nif).toUpperCase()===nif);
    if(!existing && name) existing=data.clients.find(item=>teimor0913v2SameText(item.name,name) && teimor0913v2SameText(item.fiscalAddress,client.fiscalAddress));
    if(existing){
      Object.assign(existing,teimor0913v2MergeRecord(existing,client));
      clientMap.set(client.id,existing.id); updatedClients++;
    }else{
      const id=client.id||uid('CLI');
      data.clients.push({...client,id});
      clientMap.set(client.id,id); addedClients++;
    }
  }
  const incomingJobs=Array.isArray(incoming.jobs)?incoming.jobs:[];
  for(const raw of incomingJobs){
    const job={...raw};
    const clientId=clientMap.get(job.clientId)||job.clientId||'';
    let existing=job.id ? byId(data.jobs,job.id) : null;
    if(!existing) existing=data.jobs.find(item=>item.clientId===clientId && Number(item.year||0)===Number(job.year||0) && teimor0913v2Overlap(teimor0913v2JobKeyword(item),teimor0913v2JobKeyword(job))>=0.75 && (!teimor0913v2JobAddress(job)||!teimor0913v2JobAddress(item)||teimor0913v2SameText(teimor0913v2JobAddress(item),teimor0913v2JobAddress(job))));
    const merged=teimor0913v2MergeRecord(existing,{...job,clientId});
    if(existing){ Object.assign(existing,merged); jobMap.set(job.id,existing.id); updatedJobs++; }
    else { const id=job.id||uid('F'); data.jobs.push({...merged,id}); jobMap.set(job.id,id); addedJobs++; }
  }
  const incomingBudgets=Array.isArray(incoming.budgets)?incoming.budgets:[];
  for(const raw of incomingBudgets){
    const budget={...raw};
    const clientId=clientMap.get(budget.clientId)||budget.clientId||'';
    const jobId=jobMap.get(budget.jobId)||budget.jobId||'';
    let existing=budget.id ? byId(data.budgets,budget.id) : null;
    if(!existing && budget.number) existing=data.budgets.find(item=>teimor0913v2SameText(item.number,budget.number) && (!budget.date || !item.date || String(item.date)===String(budget.date)));
    const merged=teimor0913v2MergeRecord(existing,{...budget,clientId,jobId});
    if(Array.isArray(budget.lines) && budget.lines.length) merged.lines=budget.lines;
    if(existing){ Object.assign(existing,merged); budgetMap.set(budget.id,existing.id); updatedBudgets++; }
    else { const id=budget.id||uid('P'); data.budgets.push({...merged,id}); budgetMap.set(budget.id,id); addedBudgets++; }
  }
  const mergeDocs=(collectionName)=>{
    const incomingDocs=Array.isArray(incoming[collectionName])?incoming[collectionName]:[];
    const target=data[collectionName]=Array.isArray(data[collectionName])?data[collectionName]:[];
    for(const raw of incomingDocs){
      const doc={...raw,clientId:clientMap.get(raw.clientId)||raw.clientId||'',jobId:jobMap.get(raw.jobId)||raw.jobId||'',budgetId:budgetMap.get(raw.budgetId)||raw.budgetId||''};
      let existing=doc.id ? byId(target,doc.id) : null;
      if(!existing && doc.number) existing=target.find(item=>teimor0913v2SameText(item.number,doc.number) && (!doc.date || !item.date || String(item.date)===String(doc.date)));
      if(existing) Object.assign(existing,teimor0913v2MergeRecord(existing,doc));
      else target.push({...doc,id:doc.id||uid(collectionName==='certifications'?'CERT':'INV')});
    }
  };
  mergeDocs('invoices');
  mergeDocs('certifications');
  if(Array.isArray(incoming.library)){
    data.library=Array.isArray(data.library)?data.library:[];
    incoming.library.forEach(raw=>{
      const existing=raw.id ? byId(data.library,raw.id) : data.library.find(item=>raw.code && item.code===raw.code);
      if(existing) Object.assign(existing,teimor0913v2MergeRecord(existing,raw));
      else data.library.push({...raw,id:raw.id||uid('LIB')});
    });
  }
  if(Array.isArray(incoming.attachments)){
    data.attachments=Array.isArray(data.attachments)?data.attachments:[];
    incoming.attachments.forEach(raw=>{
      const existing=raw.id ? byId(data.attachments,raw.id) : null;
      if(existing) Object.assign(existing,teimor0913v2MergeRecord(existing,raw));
      else data.attachments.push({...raw,id:raw.id||uid('ATT')});
    });
  }
  if(Array.isArray(incoming.importLogs)){
    data.importLogs=Array.isArray(data.importLogs)?data.importLogs:[];
    incoming.importLogs.forEach(raw=>{ if(!raw.id || !data.importLogs.some(item=>item.id===raw.id)) data.importLogs.push({...raw,id:raw.id||uid('IMP')}); });
  }
  teimor0913v2NormalizeData();
  return {addedClients,updatedClients,addedJobs,updatedJobs,addedBudgets,updatedBudgets};
}

async function importPreviousJsonV0913(e){
  const file=e.target.files?.[0];
  if(!file) return;
  try{
    const source=JSON.parse(await file.text());
    const result=teimor0913v2MergePreviousData(source);
    const payloads=Array.isArray(source.attachmentPayloads)?source.attachmentPayloads:[];
    for(const payload of payloads){
      if(payload.dataUrl){ const blob=await (await fetch(payload.dataUrl)).blob(); await idbPut({id:payload.id,blob,dataUrl:payload.dataUrl,meta:payload.meta}); }
    }
    saveData();
    state.selectedBudgetId=data.budgets?.[0]?.id||state.selectedBudgetId;
    alert('Dades fusionades: '+result.addedBudgets+' pressupost/os nous i '+result.updatedBudgets+' actualitzat/s. S’han conservat les factures i certificacions actuals.');
    render();
  }catch(error){
    console.error(error);
    alert('No s’ha pogut fusionar la còpia anterior. Comprova que sigui un JSON complet exportat des de TEIMOR.');
  }
  e.target.value='';
}

const __teimorBaseRenderBackupV0913V2=renderBackup;
renderBackup=function(){
  __teimorBaseRenderBackupV0913V2();
  const content=document.getElementById('content');
  if(!content) return;
  content.insertAdjacentHTML('afterbegin','<div class="card notice-blue"><h2>Recuperar dades de la versió anterior</h2><p>Si la V09.13 s’ha obert en un altre origen del navegador, les dades de la V09.12 no apareixen soles. Exporta un JSON complet des de la versió anterior i aquí el fusionarem, conservant el que ja tinguis a la V09.13.</p><label class="primary file-label">Importar i fusionar còpia anterior<input id="importPreviousJsonPage" type="file" accept="application/json" hidden></label></div>');
  bindViewEvents();
};

const __teimorBaseBindViewEventsV0913V2=bindViewEvents;
bindViewEvents=function(){
  __teimorBaseBindViewEventsV0913V2();
  const previous=document.getElementById('importPreviousJsonPage');
  if(previous) previous.onchange=importPreviousJsonV0913;
  document.querySelectorAll('[data-v0913-open-budget]').forEach(button=>button.onclick=()=>{
    state.view='budgets';
    state.selectedBudgetId=button.dataset.v0913OpenBudget;
    render();
    openBudgetModal(button.dataset.v0913OpenBudget);
  });
};

function teimor0913v2IdentificationHtml(keyword,address,city){
  const title=keyword||'Paraula clau pendent de revisar';
  const place=[address,city].filter(Boolean).join(' · ');
  return '<strong>'+esc(title)+'</strong><br><span class="muted">'+(place?'Adreça obra: '+esc(place):'Adreça obra pendent de revisar')+'</span>';
}

function teimor0913v2OrphanBudgets(){
  return data.budgets.filter(budget=>!byId(data.jobs,budget.jobId));
}

renderObresV0913=function(){
  teimor0913EnsureData();
  setHeader('Obres / traçabilitat','Identificació de l’obra per paraula clau i adreça real, amb pressupostos, factures i certificacions relacionats.');
  const jobs=[...data.jobs].sort((a,b)=>Number(b.year||0)-Number(a.year||0) || teimor0913v2JobKeyword(a).localeCompare(teimor0913v2JobKeyword(b)));
  const selected=byId(data.jobs,state.selectedJobId) || jobs[0] || null;
  if(selected) state.selectedJobId=selected.id;
  const selectedBudgets=selected?jobBudgets(selected.id):[];
  const selectedInvoices=selected?jobInvoices(selected.id):[];
  const selectedCertifications=selected?data.certifications.filter(doc=>doc.jobId===selected.id):[];
  const orphanBudgets=teimor0913v2OrphanBudgets();
  const totalBudget=data.budgets.reduce((sum,budget)=>sum+budgetBase(budget),0);
  const totalInvoices=data.invoices.reduce((sum,doc)=>sum+invoiceTotal(doc),0);
  const totalCertifications=data.certifications.reduce((sum,doc)=>sum+teimor0913CertTotal(doc),0);
  const jobRows=jobs.map(job=>{
    const budgets=jobBudgets(job.id),invoices=jobInvoices(job.id),certifications=data.certifications.filter(doc=>doc.jobId===job.id);
    return '<tr><td>'+esc(job.year||'')+'</td><td>'+teimor0913v2IdentificationHtml(teimor0913v2JobKeyword(job),teimor0913v2JobAddress(job),teimor0913v2JobCity(job))+'</td><td>'+esc(clientName(job.clientId)||'Client pendent')+'</td><td class="num">'+budgets.length+'</td><td class="num">'+invoices.length+'</td><td class="num">'+certifications.length+'</td><td class="num">'+money(jobBudgetTotal(job.id))+'</td><td class="num">'+money(jobInvoiceTotal(job.id))+'</td><td class="num">'+money(certifications.reduce((sum,doc)=>sum+teimor0913CertTotal(doc),0))+'</td><td class="nowrap"><button class="primary small" data-v0913-trace-job="'+esc(job.id)+'">Veure traçabilitat</button> <button class="ghost small" data-edit-job="'+esc(job.id)+'">Editar obra</button></td></tr>';
  });
  const orphanRows=orphanBudgets.map(budget=>{
    const invoices=data.invoices.filter(doc=>doc.budgetId===budget.id),certifications=data.certifications.filter(doc=>doc.budgetId===budget.id);
    return '<tr><td>'+esc(budgetYear(budget)||'')+'</td><td>'+teimor0913v2IdentificationHtml(teimor0913v2BudgetKeyword(budget),teimor0913v2BudgetAddress(budget),budget.workCity||'')+'</td><td>'+esc(clientName(budget.clientId)||'Client pendent')+'</td><td class="num">1</td><td class="num">'+invoices.length+'</td><td class="num">'+certifications.length+'</td><td class="num">'+money(budgetBase(budget))+'</td><td class="num">'+money(invoices.reduce((sum,doc)=>sum+invoiceTotal(doc),0))+'</td><td class="num">'+money(certifications.reduce((sum,doc)=>sum+teimor0913CertTotal(doc),0))+'</td><td><button class="ghost small" data-v0913-open-budget="'+esc(budget.id)+'">Obrir pressupost</button></td></tr>';
  });
  const detail=selected
    ? '<div class="card"><div class="toolbar"><div><h2>'+esc(teimor0913v2JobKeyword(selected)||'Obra sense paraula clau')+'</h2><p><strong>Adreça de l’obra:</strong> '+esc(teimor0913v2JobAddress(selected)||'Pendent de revisar')+(teimor0913v2JobCity(selected)?' · '+esc(teimor0913v2JobCity(selected)):'')+'<br><strong>Client:</strong> '+esc(clientName(selected.clientId)||'Client pendent')+'</p></div><button class="ghost" data-edit-job="'+esc(selected.id)+'">Editar obra</button></div><div class="grid four"><div class="kpi"><span>Pressupostos</span><strong>'+selectedBudgets.length+'</strong></div><div class="kpi"><span>Factures</span><strong>'+selectedInvoices.length+'</strong></div><div class="kpi"><span>Certificacions</span><strong>'+selectedCertifications.length+'</strong></div><div class="kpi"><span>Pressupostat / facturat</span><strong>'+money(jobBudgetTotal(selected.id)-jobInvoiceTotal(selected.id))+'</strong></div></div><div class="grid two"><div class="card"><h3>Pressupostos</h3>'+teimor0913TraceBudgetHtml(selectedBudgets)+'</div><div class="card"><h3>Factures</h3>'+teimor0913TraceInvoiceHtml(selectedInvoices)+'</div><div class="card"><h3>Certificacions</h3>'+teimor0913TraceCertificationHtml(selectedCertifications)+'</div></div></div>'
    : '<div class="card">'+empty('No hi ha cap obra creada. Els pressupostos sense obra apareixen a la llista de recuperació inferior.')+'</div>';
  const orphanCard=orphanBudgets.length
    ? '<div class="card notice-blue"><h2>Pressupostos recuperats sense obra vinculada</h2><p>Es mostren aquí perquè no desapareguin de la traçabilitat. Obre cada pressupost i assigna-li una obra quan correspongui.</p>'+table(['Any','Identificació','Client','Pressupostos','Factures','Certificacions','Pressupostat','Facturat','Certificat','Acció'],orphanRows)+'</div>'
    : '';
  const visibleJobRows=jobRows.length ? jobRows : ['<tr><td colspan="10">'+empty('No hi ha obres creades.')+'</td></tr>'];
  setContent('<div class="grid four"><div class="kpi"><span>Obres</span><strong>'+jobs.length+'</strong></div><div class="kpi"><span>Pressupostos</span><strong>'+data.budgets.length+'</strong></div><div class="kpi"><span>Factures</span><strong>'+data.invoices.length+'</strong></div><div class="kpi"><span>Certificacions</span><strong>'+data.certifications.length+'</strong></div></div><div class="card"><div class="toolbar"><div><h2>Relació per obra</h2><p class="muted">Pressupostat: '+money(totalBudget)+' · Facturat: '+money(totalInvoices)+' · Certificat: '+money(totalCertifications)+'</p></div><button class="primary" data-go="importer">Importar factures / certificacions</button></div>'+table(['Any','Identificació de l’obra','Client','Pressupostos','Factures','Certificacions','Pressupostat','Facturat','Certificat','Acció'],visibleJobRows)+'</div>'+detail+orphanCard+'<div class="card"><h2>Documents pendents de vincular a una obra</h2>'+teimor0913UnmatchedHtml()+'</div>');
};

saveJob=function(event){
  event.preventDefault();
  const f=formObj(event.target);
  const old=byId(data.jobs,f.editId)||byId(data.jobs,f.id)||{};
  const title=teimor0913v2Clean(f.title);
  const address=teimor0913v2Clean(f.address);
  const city=teimor0913v2Clean(f.city);
  const job={...(old||{}),id:f.id,year:Number(f.year)||new Date().getFullYear(),clientId:f.clientId,title,keyword:title,address,workAddress:address,city,workCity:city,status:f.status,notes:f.notes,mainBudgetId:old.mainBudgetId||''};
  const index=data.jobs.findIndex(item=>item.id===f.editId || item.id===job.id);
  if(index>=0) data.jobs[index]=job; else data.jobs.push(job);
  data.budgets.filter(budget=>budget.jobId===job.id).forEach(budget=>{
    if(!budget.keyword || budget.keyword===old.keyword || budget.keyword===old.title) budget.keyword=title;
    if(!budget.workAddress) budget.workAddress=address;
    if(!budget.workCity) budget.workCity=city;
  });
  saveData();
  if(typeof renderJobs==='function') renderJobs();
  else renderObresV0913();
};

saveBudget=function(event){
  event.preventDefault();
  const f=formObj(event.target);
  const old=byId(data.budgets,f.id)||{};
  const b={...(old||{}),id:f.id,seqNumber:num(f.seqNumber)||num(old.seqNumber)||0,oldNumber:f.oldNumber||old.oldNumber||old.number||'',number:f.oldNumber||old.number||'',date:f.date,clientId:f.clientId,jobId:f.jobId,title:f.title,keyword:f.title, status:f.status,ci:num(f.ci),dge:num(f.dge),bi:num(f.bi),iva:num(f.iva),importedBase:num(f.importedBase),notes:f.notes,lines:old.lines||[]};
  const index=data.budgets.findIndex(item=>item.id===b.id);
  if(index>=0) data.budgets[index]=b; else data.budgets.push(b);
  state.selectedBudgetId=b.id;
  state.editBudgetId='';
  const job=byId(data.jobs,b.jobId);
  if(job){
    if(!job.mainBudgetId) job.mainBudgetId=b.id;
    if(!job.keyword || job.keyword===old.keyword || job.keyword===old.title) job.keyword=f.title;
    if(!job.title || job.title===old.title) job.title=f.title;
  }
  normalizeBudgetSequentialNumbersV098();
  saveData();
  if(isModalOpen()) closeModal();
  renderBudgets();
};

/* Intent de recuperació automàtica només quan la base actual encara és la demo inicial. */
teimor0913v2RecoverLocalStorage();
teimor0913v2NormalizeData();

/* =========================================================
   TEIMOR V09.13.2 · RELACIÓ CLIENT/ADREÇA I DESCÀRREGA
   - Fa la vista Obres tolerant de registres antics incomplets.
   - Compara explícitament client i adreça de l'obra.
   - Conserva el fitxer original de cada factura importada.
   - Mostra una acció visible "Descarregar factura".
   ========================================================= */

data.meta = data.meta || {};
data.meta.version = '9.13.2-factures-descàrrega-relacions';

function teimor09132SafeArray(value){
  return Array.isArray(value) ? value.filter(item=>item && typeof item==='object') : [];
}

function teimor09132SanitizeData(){
  ['clients','jobs','budgets','invoices','certifications','library','attachments','importLogs'].forEach(key=>{
    data[key]=teimor09132SafeArray(data[key]);
  });
  data.settings = data.settings && typeof data.settings==='object' ? data.settings : defaultData().settings;
}

/* Reutilitza la validació V09.13 sense entrar en la seva normalització recursiva. */
teimor0913EnsureData=function(){
  __teimorBaseEnsureDataV0913V2();
  teimor09132SanitizeData();
  try{ teimor0913v2NormalizeData(); }catch(error){ console.warn('Normalització de dades antigues ajornada:',error); }
};

function teimor09132AddressText(value){
  let text=teimor0913Norm(value);
  text=text.replace(/\b(?:c|cl|carrer|calle)\b/g,'carrer');
  text=text.replace(/\b(?:av|avda|avinguda|avenida)\b/g,'avinguda');
  text=text.replace(/\b(?:pg|passeig)\b/g,'passeig');
  text=text.replace(/\b(?:pl|pla[cç]a|plaza)\b/g,'plaça');
  return text.replace(/\s+/g,' ').trim();
}

function teimor09132AddressEvidence(left,right){
  const a=teimor09132AddressText(left), b=teimor09132AddressText(right);
  if(!a || !b) return {score:0,exact:false,label:'no disponible',available:!!(a||b)};
  if(a===b) return {score:1,exact:true,label:'exacta',available:true};
  const aNumbers=(a.match(/\b\d+[a-z]?\b/g)||[]), bNumbers=(b.match(/\b\d+[a-z]?\b/g)||[]);
  if(aNumbers.length && bNumbers.length && !aNumbers.some(number=>bNumbers.includes(number))){
    return {score:0.08,exact:false,label:'número diferent',available:true};
  }
  const overlap=teimor0913Overlap(a,b);
  const score=a.includes(b)||b.includes(a) ? 0.86 : overlap>=0.75 ? 0.74 : overlap>=0.45 ? 0.52 : overlap>=0.2 ? 0.28 : 0;
  return {score,exact:false,label:score>=0.7?'semblant':score>=0.4?'parcial':'no coincideix',available:true};
}

function teimor09132PlaceEvidence(snap,target){
  const left=teimor0913Norm([snap?.workCity,snap?.workPostalCode].filter(Boolean).join(' '));
  const right=teimor0913Norm([target?.city,target?.workCity,target?.postalCode,target?.workPostalCode].filter(Boolean).join(' '));
  if(!left || !right) return {score:0,exact:false,label:'no disponible'};
  if(left===right) return {score:0.92,exact:true,label:'població/codi exactes'};
  const overlap=teimor0913Overlap(left,right);
  return {score:overlap>=0.5?0.62:overlap>=0.25?0.32:0,exact:false,label:overlap>=0.5?'població/codi semblants':overlap>=0.25?'població/codi parcials':'població/codi no coincideixen'};
}

function teimor09132ClientEvidence(snap,client){
  const reasons=[];
  const snapNif=teimor0913Nif(snap?.nif), clientNif=teimor0913Nif(client?.nif);
  const nifExact=!!(snapNif && clientNif && snapNif===clientNif);
  if(nifExact) reasons.push('NIF exacte');
  const snapName=teimor0913Norm(snap?.name), clientNameNorm=teimor0913Norm(client?.name);
  const nameExact=!!(snapName && clientNameNorm && snapName===clientNameNorm);
  if(nameExact) reasons.push('nom exacte');
  const nameOverlap=teimor0913Overlap(snap?.name,client?.name);
  if(!nameExact && nameOverlap>0.35) reasons.push('nom semblant');
  const fiscalOverlap=teimor0913Overlap(
    [snap?.fiscalAddress,snap?.city,snap?.postalCode].filter(Boolean).join(' '),
    [client?.fiscalAddress,client?.city,client?.postalCode].filter(Boolean).join(' ')
  );
  if(fiscalOverlap>0.25) reasons.push('dades fiscals semblants');
  const score=(nifExact?130:0)+(nameExact?90:0)+(!nameExact?Math.round(nameOverlap*35):0)+Math.round(fiscalOverlap*25);
  return {score,nifExact,nameExact,strong:nifExact||nameExact,label:reasons.join(', ')||'sense coincidència segura'};
}

function teimor09132ExplicitWorkAddress(record){
  if(!record || typeof record!=='object') return '';
  if(Object.prototype.hasOwnProperty.call(record,'workAddress')) return record.workAddress||'';
  return record.address||'';
}

function teimor09132BestBudgetAddress(doc,budget,job){
  const snap=doc.clientSnapshot||{};
  const candidates=[
    ['pressupost',teimor09132ExplicitWorkAddress(budget)],
    ['obra',teimor09132ExplicitWorkAddress(job)]
  ].filter(item=>item[1]);
  let best={score:0,exact:false,label:'no disponible',source:'',available:!!(snap.workAddress||snap.workCity||snap.workPostalCode)};
  for(const [source,address] of candidates){
    const evidence=teimor09132AddressEvidence(snap.workAddress,address);
    if(evidence.score>best.score) best={...evidence,source};
  }
  const place=teimor09132PlaceEvidence(snap,{
    city:job?.city,
    workCity:job?.workCity||budget?.workCity,
    postalCode:job?.postalCode,
    workPostalCode:job?.workPostalCode||budget?.workPostalCode
  });
  if(place.score>best.score) best={...place,source:'població/codi',available:true};
  return best;
}

teimor0913ClientCandidates=function(doc){
  const snap=doc.clientSnapshot||{};
  return (data.clients||[]).map(client=>{
    const evidence=teimor09132ClientEvidence(snap,client);
    return {id:client.id,score:evidence.score,reasons:evidence.label,clientExact:evidence.nifExact||evidence.nameExact,clientStrong:evidence.strong};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
};

teimor0913BudgetCandidates=function(doc){
  const snap=doc.clientSnapshot||{};
  const docNumber=teimor0913NormId(doc.number);
  const sourceNorm=teimor0913NormId(doc.sourceText);
  const docYear=teimor0913Year(doc.date||doc.sourceFile);
  return (data.budgets||[]).map(budget=>{
    const job=byId(data.jobs,budget.jobId)||{};
    const client=byId(data.clients,budget.clientId||job.clientId)||{};
    const clientEvidence=teimor09132ClientEvidence(snap,client);
    const addressEvidence=teimor09132BestBudgetAddress(doc,budget,job);
    const reasons=[];
    let score=0, exactNumber=false;
    const budgetNumbers=[budget.number,budget.originalNumber,budget.oldNumber,budget.id].filter(Boolean).map(teimor0913NormId);
    if(docNumber && budgetNumbers.includes(docNumber)){ score+=150; exactNumber=true; reasons.push('número coincident'); }
    else if(docNumber && budgetNumbers.some(value=>value && (docNumber.includes(value)||value.includes(docNumber)))){ score+=80; reasons.push('número semblant'); }
    if(sourceNorm && budgetNumbers.some(value=>value && sourceNorm.includes(value))){ score+=55; reasons.push('número dins del document'); }
    if(clientEvidence.score){ score+=Math.min(145,clientEvidence.score); reasons.push('client: '+clientEvidence.label); }
    if(addressEvidence.score>=0.85){ score+=120; reasons.push('adreça obra exacta'); }
    else if(addressEvidence.score>=0.7){ score+=85; reasons.push('adreça obra semblant'); }
    else if(addressEvidence.score>=0.4){ score+=45; reasons.push('adreça obra parcial'); }
    const conceptOverlap=teimor0913Overlap(doc.concept,[budget.title,budget.keyword,job.title,job.keyword].filter(Boolean).join(' '));
    if(conceptOverlap>0.25){ score+=Math.round(conceptOverlap*65); reasons.push('concepte/obra'); }
    if(docYear && Number(budget.date||job.year||0)===docYear){ score+=8; reasons.push('mateix any'); }
    if(clientEvidence.strong && addressEvidence.exact){ score+=35; reasons.push('client + adreça exactes'); }
    return {
      id:budget.id,score,exactNumber,
      reasons:reasons.join(', '),
      jobId:budget.jobId||'',clientId:budget.clientId||job.clientId||'',
      clientStrong:clientEvidence.strong,clientExact:clientEvidence.nifExact||clientEvidence.nameExact,
      clientScore:clientEvidence.score,addressScore:addressEvidence.score,
      addressExact:addressEvidence.exact,addressAvailable:addressEvidence.available,
      addressLabel:addressEvidence.label
    };
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
};

teimor0913JobCandidates=function(doc,clientId){
  const snap=doc.clientSnapshot||{};
  const docYear=teimor0913Year(doc.date||doc.sourceFile);
  return (data.jobs||[]).map(job=>{
    const client=byId(data.clients,job.clientId)||{};
    const clientEvidence=teimor09132ClientEvidence(snap,client);
    const addressEvidence=teimor09132BestBudgetAddress(doc,{},job);
    let score=0; const reasons=[];
    if(clientId && job.clientId===clientId){ score+=55; reasons.push('client relacionat'); }
    else if(clientEvidence.strong){ score+=Math.min(90,clientEvidence.score); reasons.push('client: '+clientEvidence.label); }
    if(addressEvidence.score>=0.85){ score+=110; reasons.push('adreça exacta'); }
    else if(addressEvidence.score>=0.7){ score+=75; reasons.push('adreça semblant'); }
    else if(addressEvidence.score>=0.4){ score+=40; reasons.push('adreça parcial'); }
    const overlap=teimor0913Overlap(doc.concept,[job.title,job.keyword,job.address,job.workAddress,job.city,job.workCity].filter(Boolean).join(' '));
    if(overlap>0.25){ score+=Math.round(overlap*75); reasons.push('concepte/obra'); }
    if(docYear && Number(job.year)===docYear){ score+=8; reasons.push('mateix any'); }
    return {id:job.id,score,reasons:reasons.join(', '),clientId:job.clientId||'',addressScore:addressEvidence.score,addressExact:addressEvidence.exact,addressLabel:addressEvidence.label};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score);
};

teimor0913ApplyMatch=function(doc){
  const clients=teimor0913ClientCandidates(doc);
  const topClient=clients[0], secondClient=clients[1];
  const clientSafe=!!topClient && topClient.score>=65 && (!secondClient || topClient.score-secondClient.score>=12);
  if(clientSafe) doc.clientId=topClient.id;
  const budgets=teimor0913BudgetCandidates(doc);
  const topBudget=budgets[0], secondBudget=budgets[1];
  const budgetSafe=!!topBudget && topBudget.score>=72 && (!secondBudget || topBudget.score-secondBudget.score>=12);
  const addressAvailable=!!(doc.clientSnapshot?.workAddress||doc.clientSnapshot?.workCity||doc.clientSnapshot?.workPostalCode);
  const addressConflict=!!(topBudget && addressAvailable && topBudget.addressScore<0.4);
  const budgetAutomatic=budgetSafe && (
    (topBudget.clientStrong && topBudget.addressExact) ||
    (topBudget.exactNumber && !addressConflict)
  );
  let topJob=null, secondJob=null;
  if(budgetSafe){
    doc.budgetId=topBudget.id;
    doc.jobId=topBudget.jobId||'';
    if(!doc.clientId) doc.clientId=topBudget.clientId||'';
  }else{
    const jobs=teimor0913JobCandidates(doc,doc.clientId);
    topJob=jobs[0]; secondJob=jobs[1];
    if(topJob && topJob.score>=65 && (!secondJob || topJob.score-secondJob.score>=12)) doc.jobId=topJob.id;
    doc.candidateJobIds=jobs.slice(0,5).map(row=>row.id);
  }
  doc.candidateClientIds=clients.slice(0,5).map(row=>row.id);
  doc.candidateBudgetIds=budgets.slice(0,5).map(row=>row.id);
  const evidenceClient=topClient?.reasons||'no trobat';
  const evidenceAddress=topBudget?.addressLabel || topJob?.addressLabel || (addressAvailable?'no coincideix':'no llegida');
  const evidenceBudget=topBudget ? (topBudget.exactNumber?'número coincident':topBudget.reasons||'pressupost suggerit') : 'no trobat';
  doc.matchEvidence={
    client:{id:topClient?.id||'',score:topClient?.score||0,label:evidenceClient},
    address:{score:topBudget?.addressScore||topJob?.addressScore||0,exact:!!(topBudget?.addressExact||topJob?.addressExact),label:evidenceAddress},
    budget:{id:topBudget?.id||'',score:topBudget?.score||0,label:evidenceBudget}
  };
  doc.matchReason=`Client: ${evidenceClient} · Adreça obra: ${evidenceAddress} · Pressupost: ${evidenceBudget}`;
  if(budgetAutomatic){
    doc.matchStatus='automatica';
    doc.matchConfidence=Math.min(100,Math.round((topBudget.score||0)/2));
  }else if(budgetSafe || clientSafe || doc.jobId){
    doc.matchStatus='suggerida';
    doc.matchConfidence=Math.min(95,Math.round(Math.max(topBudget?.score||0,topClient?.score||0,topJob?.score||0)/2));
  }else{
    doc.matchStatus='pendent';
    doc.matchConfidence=0;
  }
};

function teimor09132SourceMime(name){
  const value=String(name||'').toLowerCase();
  if(value.endsWith('.csv')) return 'text/csv';
  if(value.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if(value.endsWith('.xlsm')) return 'application/vnd.ms-excel.sheet.macroEnabled.12';
  if(value.endsWith('.xls')) return 'application/vnd.ms-excel';
  return 'application/octet-stream';
}

function teimor09132RememberSource(doc,file){
  if(!doc || !file?.blob) return;
  try{
    Object.defineProperty(doc,'__sourceBlob',{value:file.blob,writable:true,configurable:true,enumerable:false});
    Object.defineProperty(doc,'__sourceName',{value:file.name,writable:true,configurable:true,enumerable:false});
  }catch(error){
    doc.__sourceBlob=file.blob;
    doc.__sourceName=file.name;
  }
}

handleFinancialImportV0913=async function(files){
  teimor0913EnsureData();
  if(typeof XLSX==='undefined'){ alert('No s’ha carregat la llibreria per llegir Excel. Revisa la connexió.'); return; }
  const kind=document.getElementById('v0913FinancialKind')?.value || 'factura';
  const draft={kind,files:[],documents:[],warnings:[]};
  const spreadsheetFiles=[];
  for(const file of files||[]){
    const rawName=file.webkitRelativePath || file.name || '';
    const name=rawName.toLowerCase();
    if(name.endsWith('.rar')){ draft.warnings.push(`RAR detectat: ${file.name}. Descomprimeix-lo amb WinRAR i importa la carpeta, o crea un ZIP.`); continue; }
    if(name.endsWith('.zip')){
      if(typeof JSZip==='undefined'){ draft.warnings.push(`ZIP ignorat perquè JSZip no està carregat: ${file.name}`); continue; }
      const zip=await JSZip.loadAsync(file);
      const entries=Object.values(zip.files).filter(entry=>!entry.dir && /\.(xls|xlsx|xlsm|csv)$/i.test(entry.name));
      draft.warnings.push(`ZIP ${file.name}: ${entries.length} documents Excel detectats.`);
      for(const entry of entries){
        const buffer=await entry.async('arraybuffer');
        spreadsheetFiles.push({name:entry.name,arrayBuffer:buffer,blob:new Blob([buffer],{type:teimor09132SourceMime(entry.name)})});
      }
    }else if(/\.(xls|xlsx|xlsm|csv)$/i.test(name)){
      const buffer=await file.arrayBuffer();
      spreadsheetFiles.push({name:rawName,arrayBuffer:buffer,blob:file});
    }
  }
  for(const file of spreadsheetFiles){
    try{
      const parsed=teimor0913ParseFinancialWorkbook(file.name,file.arrayBuffer,kind);
      teimor09132RememberSource(parsed.doc,file);
      draft.files.push(file.name);
      draft.documents.push(parsed.doc);
      draft.warnings.push(...parsed.warnings);
    }catch(error){
      console.error(error);
      draft.warnings.push(`ERROR llegint ${file.name}: ${error.message}`);
    }
  }
  state.financialDraft=draft;
  renderImporter();
};

async function teimor09132StoreInvoiceSource(item,source,kind){
  const blob=source?.__sourceBlob;
  if(!blob) return {saved:false,reason:'Fitxer original no disponible'};
  const attachmentId=uid(kind==='certificacio'?'CERTFILE':'FACFILE');
  const sourceName=teimor0913SourceName(source.__sourceName || source.sourceFile);
  const meta={
    id:attachmentId,
    name:sourceName || `${item.id}.bin`,
    type:blob.type || teimor09132SourceMime(sourceName),
    size:blob.size||0,
    category:kind==='certificacio'?'Certificació importada':'Factura importada',
    invoiceId:kind==='factura'?item.id:'',
    certificationId:kind==='certificacio'?item.id:'',
    clientId:item.clientId||'',
    jobId:item.jobId||'',
    budgetId:item.budgetId||'',
    includeInJson:false,
    createdAt:new Date().toISOString()
  };
  await idbPut({id:attachmentId,blob,dataUrl:'',meta});
  item.attachmentId=attachmentId;
  item.sourceFileName=meta.name;
  item.sourceFileType=meta.type;
  item.fileStatus='Fitxer original guardat';
  return {saved:true};
}

confirmFinancialImportV0913=async function(){
  teimor0913EnsureData();
  const draft=state.financialDraft;
  if(!draft || !(draft.documents||[]).length) return alert('No hi ha documents financers per confirmar.');
  const target=draft.kind==='certificacio' ? data.certifications : data.invoices;
  let added=0,duplicates=0,pending=0,savedFiles=0,failedFiles=0;
  for(const source of draft.documents){
    const duplicate=target.find(existing=>{
      const sameKind=(existing.kind||draft.kind)===draft.kind;
      const sameNumber=source.number && existing.number && teimor0913NormId(source.number)===teimor0913NormId(existing.number);
      const sameDate=!source.date || !existing.date || source.date===existing.date;
      const sameSource=source.sourceFile && existing.sourceFile===source.sourceFile && (!source.number || source.number===existing.number);
      return sameKind && ((sameNumber && sameDate) || sameSource);
    });
    if(duplicate){ duplicates++; continue; }
    const item={...source,id:uid(draft.kind==='certificacio'?'CERT':'FAC'),importedAt:new Date().toISOString(),sourceFiles:[source.sourceFile].filter(Boolean),status:source.matchStatus==='automatica'?'Importada · vinculada':'Importada · pendent de revisar',fileStatus:'Fitxer original pendent de guardar'};
    if(item.budgetId){
      const budget=byId(data.budgets,item.budgetId);
      if(budget){ item.jobId=budget.jobId||item.jobId; item.clientId=budget.clientId||item.clientId; }
    }
    try{
      const stored=await teimor09132StoreInvoiceSource(item,source,draft.kind);
      if(stored.saved) savedFiles++; else failedFiles++;
    }catch(error){
      console.error('No s’ha pogut guardar el fitxer original:',error);
      item.fileStatus='Fitxer original no guardat';
      failedFiles++;
    }
    if(item.matchStatus!=='automatica') pending++;
    target.push(item); added++;
  }
  data.importLogs.push({id:uid('IMP'),date:new Date().toISOString(),files:draft.files||[],kind:draft.kind,countDocuments:draft.documents.length,added,duplicates,pendingMatches:pending,originalFilesSaved:savedFiles,originalFilesFailed:failedFiles,libraryAdded:0,libraryManualOnly:true});
  state.financialDraft=null;
  saveData();
  alert(`${teimor0913KindLabel(draft.kind)} importada. Documents nous: ${added}. Repetits omesos: ${duplicates}. Fitxers originals guardats: ${savedFiles}. Pendents de vincular/revisar: ${pending}.`);
  state.view='obres';
  render();
};

async function downloadInvoiceFileV09132(id){
  const invoice=byId(data.invoices,id);
  if(!invoice) return alert('No s’ha trobat la factura.');
  if(!invoice.attachmentId){
    return alert('Aquesta factura es va importar abans de guardar el fitxer original. Torna a importar l’Excel de la factura en aquesta versió i després podràs prémer «Descarregar factura».');
  }
  try{
    const record=await idbGet(invoice.attachmentId);
    if(!record?.blob) return alert('No s’ha trobat el fitxer original local. Cal tornar a importar la factura.');
    const url=URL.createObjectURL(record.blob);
    const link=document.createElement('a');
    link.href=url;
    link.download=record.meta?.name || invoice.sourceFileName || `factura_${invoice.number||invoice.id}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(error){
    console.error(error);
    alert('No s’ha pogut descarregar el fitxer original de la factura.');
  }
}

function teimor09132InvoiceDownloadHtml(){
  const invoices=data.invoices||[];
  if(!invoices.length) return empty('Encara no hi ha factures importades.');
  const rows=invoices.map(invoice=>{
    const name=invoice.sourceFileName || teimor0913SourceName(invoice.sourceFile||'');
    const status=invoice.attachmentId ? 'Fitxer original guardat' : 'Cal reimportar el fitxer original';
    return `<tr><td><strong>${esc(invoice.number||invoice.id)}</strong><br><span class="muted">${esc(dateDisplay(invoice.date))}</span></td><td>${esc(clientName(invoice.clientId)||invoice.clientSnapshot?.name||'Client pendent')}</td><td>${esc(invoice.concept||'Concepte pendent')}</td><td>${esc(budgetName(invoice.budgetId)||'Sense pressupost')}</td><td>${esc(name||'Origen no disponible')}</td><td>${statusPill(status)}</td><td><button class="primary small" data-v09132-download-invoice="${esc(invoice.id)}">Descarregar factura</button></td></tr>`;
  });
  return table(['Número','Client','Concepte','Pressupost','Fitxer original','Disponibilitat','Acció'],rows);
}

const __teimorBaseRenderInvoicesV09132=renderInvoices;
renderInvoices=function(editId=''){
  __teimorBaseRenderInvoicesV09132(editId);
  const content=document.getElementById('content');
  if(!content) return;
  content.insertAdjacentHTML('beforeend',`<div class="card"><div class="toolbar"><div><h2>Descarregar factura</h2><p class="muted">Cada factura importada conserva el fitxer original local quan es confirma la importació.</p></div><button class="ghost" data-go="obres">Veure per obra</button></div>${teimor09132InvoiceDownloadHtml()}</div>`);
  bindViewEvents();
};

function teimor09132RenderObresFallback(error){
  console.error('La vista Obres ha necessitat el mode segur:',error);
  teimor09132SanitizeData();
  setHeader('Obres / traçabilitat','Vista recuperada en mode segur. Revisa els registres antics incomplets.');
  const jobs=data.jobs||[];
  const rows=jobs.map(job=>{
    const jobId=String(job.id||'');
    const budgets=(data.budgets||[]).filter(item=>String(item.jobId||'')===jobId);
    const invoices=(data.invoices||[]).filter(item=>String(item.jobId||'')===jobId);
    return `<tr><td>${esc(job.year||'')}</td><td><strong>${esc(job.keyword||job.title||'Obra sense nom')}</strong><br><span class="muted">${esc(job.workAddress||job.address||'Adreça pendent')}</span></td><td>${esc(clientName(job.clientId)||'Client pendent')}</td><td class="num">${budgets.length}</td><td class="num">${invoices.length}</td><td><button class="ghost small" data-edit-job="${esc(job.id||'')}">Editar obra</button></td></tr>`;
  });
  const html=`<div class="card notice-blue"><h2>Obres</h2><p>La vista està oberta. S’han protegit registres antics incomplets perquè no bloquegin la pantalla. Els pressupostos i factures es poden revisar des de les pestanyes corresponents.</p>${table(['Any','Identificació / adreça','Client','Pressupostos','Factures','Acció'],rows)}</div>`;
  const content=document.getElementById('content');
  if(content){
    content.innerHTML=html;
    try{ bindViewEvents(); }catch(bindError){ console.warn('Alguns botons antics no s’han pogut activar:',bindError); }
  }
}

function teimor09132RenderObresSafe(){
  try{ renderObresV0913(); }
  catch(error){ teimor09132RenderObresFallback(error); }
}

const __teimorBaseRenderV09132=render;
render=function(){
  try{ teimor0913EnsureData(); }
  catch(error){
    if(state.view==='obres') return teimor09132RenderObresFallback(error);
    throw error;
  }
  document.querySelectorAll('#tabs button').forEach(button=>button.classList.toggle('active',button.dataset.view===state.view));
  if(state.view==='obres') return teimor09132RenderObresSafe();
  return __teimorBaseRenderV09132();
};

const __teimorBaseBindViewEventsV09132=bindViewEvents;
bindViewEvents=function(){
  try{ __teimorBaseBindViewEventsV09132(); }
  catch(error){ console.warn('Alguns esdeveniments de la vista no s’han pogut activar:',error); }
  document.querySelectorAll('[data-v0913-trace-job]').forEach(button=>button.onclick=()=>{
    state.selectedJobId=button.dataset.v0913TraceJob;
    teimor09132RenderObresSafe();
  });
  document.querySelectorAll('[data-v09132-download-invoice]').forEach(button=>button.onclick=()=>downloadInvoiceFileV09132(button.dataset.v09132DownloadInvoice));
};
