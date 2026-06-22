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
  setHeader('Inici','Resum de clients, pressupostos, llibreria, factures, rendiment i importació local. La pestanya Feines s’ha integrat dins Pressupostos per evitar repeticions.');
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
