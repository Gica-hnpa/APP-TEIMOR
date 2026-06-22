/* TEIMOR · Gestor de pressupostos v08
   App estàtica: les dades importades d'Excel/ZIP es llegeixen al navegador i es guarden localment.
*/
const STORE_KEY = 'teimor_gestor_pressupostos_v08';
const LEGACY_STORE_KEY = ''; // No carreguem automàticament dades antigues per evitar arrossegar imports bruts de prova.
const AUTH_KEY = 'teimor_auth_v08';
const LEGACY_AUTH_KEY = ''; // V08 força login en cada càrrega
const DB_NAME = 'teimor_attachments_v08';
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
    meta:{version:'8.0.0',createdAt:today(),updatedAt:today()},
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
  document.querySelectorAll('#tabs button').forEach(btn=>btn.addEventListener('click',()=>{ state.view=btn.dataset.view; render(); }));
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
