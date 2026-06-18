const STORE_KEY = 'teimor_gestor_v01';
const DB_NAME = 'teimor_files_v01';
const DB_STORE = 'files';

const defaultData = () => ({
  clients: [
    {id:'CLI-TEIMOR', name:'TEIMOR / Teixidor & Mora S.L.', nif:'B55271159', contact:'Alfons Mora / Albert Teixidor / Joan Bachs', phone:'620988264 / 675520117 / 609036162', email:'info@teimor.com', address:'C/ Marçal de la Trinxeria, 48, esc. A, planta 5, àtic 4', city:'17200 Palafrugell (Girona)', status:'Actiu', notes:'Client contractista.'},
    {id:'CLI-VALENTINA', name:'Comunitat de Propietaris Valentina Mar', nif:'', contact:'', phone:'', email:'', address:'Avda. Torre Valentina, 11', city:'17251 Calonge (Girona)', status:'Actiu', notes:'Client final del pressupost històric aportat.'}
  ],
  jobs: [
    {id:'F-2016-001', year:2016, clientId:'CLI-VALENTINA', title:'Garatges Valentina Mar - impermeabilització terrassa no transitable', address:'Avda. Torre Valentina, 11', city:'Calonge', status:'Finalitzada', start:'2016-07-05', end:'', mainBudgetId:'P-2016-001', notes:'Pressupost històric aportat.'},
    {id:'F-2026-001', year:2026, clientId:'CLI-TEIMOR', title:'Base de dades pressupostos TEIMOR', address:'Palafrugell / Baix Empordà', city:'Palafrugell', status:'En curs', start:'2026-06-18', end:'', mainBudgetId:'P-2026-001', notes:'Feina interna per preparar plantilla, app i llibreria.'}
  ],
  library: [
    {code:'IMP-001', chapter:'Impermeabilització', unit:'m²', concept:'Impermeabilització de terrassa no transitable', desc:'Neteja del suport, imprimació, regates puntuals i col·locació de làmina bituminosa SBS 50/G FP autoprotegida, incloent remats, solapaments i mitjans auxiliars manuals.', unitPrice:28.95, origin:'Valentina Mar 2016', status:'Revisar'},
    {code:'DEM-001', chapter:'Treballs previs', unit:'m²', concept:'Retirada de graveta solta i transport a deixalleria', desc:'Retirada manual de graveta solta existent, càrrega, transport interior i gestió a deixalleria o contenidor segons obra.', unitPrice:0, origin:'Valentina Mar 2016', status:'Pendent'},
    {code:'REG-001', chapter:'Paleteria impermeabilització', unit:'ml', concept:'Obertura de regates per entrega de làmina', desc:'Obertura de regata en paraments verticals per encaix i remat superior de làmina impermeable.', unitPrice:0, origin:'Valentina Mar 2016', status:'Pendent'},
    {code:'NET-001', chapter:'Preparació suport', unit:'m²', concept:'Rascar i netejar superfície', desc:'Raspat, neteja i preparació de suport abans d’impermeabilització, incloent retirada de petites restes.', unitPrice:0, origin:'Valentina Mar 2016', status:'Pendent'},
    {code:'LAM-001', chapter:'Impermeabilització', unit:'m²', concept:'Làmina LBM SBS 50/G FP autoprotegida', desc:'Subministrament i col·locació de làmina polimèrica de 5 kg/m² autoprotegida amb pissarreta/mineral gris.', unitPrice:0, origin:'Valentina Mar 2016', status:'Pendent'}
  ],
  budgets: [
    {id:'P-2016-001', date:'2016-07-05', jobId:'F-2016-001', clientId:'CLI-VALENTINA', status:'Tancat', vat:21, notes:'Pressupost històric Valentina Mar.', lines:[
      {id:'LIN-1', code:'IMP-001', chapter:'Impermeabilització', unit:'m²', concept:'Impermeabilització de terrassa no transitable', desc:'Paquet històric: neteja, imprimació, regates puntuals i làmina LBM SBS 50/G FP autoprotegida.', qty:255.60, unitPrice:28.95, origin:'Llibreria'}
    ]},
    {id:'P-2026-001', date:'2026-06-18', jobId:'F-2026-001', clientId:'CLI-TEIMOR', status:'Esborrany', vat:21, notes:'Pressupost actiu de treball.', lines:[]}
  ],
  invoices: [
    {id:'FAC-001', date:'2026-06-18', budgetId:'P-2026-001', jobId:'F-2026-001', provider:'Exemple proveïdor', number:'S/N', concept:'Factura exemple per validar rendiment', base:0, vat:21, paid:false, notes:''}
  ],
  attachments: []
});

let data = loadData();
let currentView = 'inici';
let editing = {client:null, job:null, library:null, invoice:null};
let selectedBudgetId = data.budgets[0]?.id || '';

function loadData(){
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || defaultData(); }
  catch(e){ return defaultData(); }
}
function saveData(){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function uid(prefix){ return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6).toUpperCase()}`; }
function esc(v){ return String(v ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s])); }
function n(v){ const x = Number(String(v ?? '').replace(',','.')); return isNaN(x) ? 0 : x; }
function money(v){ return new Intl.NumberFormat('ca-ES',{style:'currency',currency:'EUR'}).format(n(v)); }
function pct(v){ return `${(n(v)*100).toFixed(1)}%`; }
function byId(arr,id){ return arr.find(x=>x.id===id); }
function clientName(id){ return byId(data.clients,id)?.name || id || ''; }
function jobName(id){ return byId(data.jobs,id)?.title || id || ''; }
function budgetBase(b){ return (b?.lines || []).reduce((s,l)=>s+n(l.qty)*n(l.unitPrice),0); }
function budgetVat(b){ return budgetBase(b)*(n(b?.vat)/100); }
function budgetTotal(b){ return budgetBase(b)+budgetVat(b); }
function invoiceBase(i){ return n(i.base); }
function invoiceTotal(i){ return n(i.base)*(1+n(i.vat)/100); }
function jobBudgets(jobId){ return data.budgets.filter(b=>b.jobId===jobId); }
function jobBudgetBase(jobId){ return jobBudgets(jobId).reduce((s,b)=>s+budgetBase(b),0); }
function jobInvoices(jobId){ return data.invoices.filter(i=>i.jobId===jobId); }
function jobInvoiceTotal(jobId){ return jobInvoices(jobId).reduce((s,i)=>s+invoiceTotal(i),0); }
function options(arr, selected, getId=x=>x.id, getLabel=x=>x.name || x.title || x.id){ return arr.map(x=>`<option value="${esc(getId(x))}" ${getId(x)===selected?'selected':''}>${esc(getLabel(x))}</option>`).join(''); }

function setView(view){ currentView=view; document.querySelectorAll('#tabs button').forEach(b=>b.classList.toggle('active', b.dataset.view===view)); render(); }
document.querySelectorAll('#tabs button').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
document.getElementById('resetDemo').onclick=()=>{ if(confirm('Vols restaurar les dades demo? Se substituiran les dades locals.')){ data=defaultData(); saveData(); render(); }};
document.getElementById('exportData').onclick=()=>{
  const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`teimor_backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);
};
document.getElementById('importData').onchange=async(e)=>{
  const file=e.target.files[0]; if(!file) return;
  const text=await file.text();
  try { data=JSON.parse(text); saveData(); render(); alert('Dades importades correctament.'); }
  catch(err){ alert('No s’ha pogut importar el JSON.'); }
  e.target.value='';
};

function viewHeader(title, subtitle){ document.getElementById('viewTitle').textContent=title; document.getElementById('viewSubtitle').textContent=subtitle; }
function content(html){ document.getElementById('content').innerHTML=html; bindAfterRender(); }
function render(){
  const views={inici:renderInici, clients:renderClients, feines:renderFeines, llibreria:renderLlibreria, pressupostos:renderPressupostos, factures:renderFactures, rendiment:renderRendiment, arxius:renderArxius};
  (views[currentView]||renderInici)();
}

function renderInici(){
  viewHeader('Inici', 'Resum ràpid de clients, feines, pressupostos, factures i rendiment.');
  const totalBudget=data.budgets.reduce((s,b)=>s+budgetBase(b),0);
  const totalInvoices=data.invoices.reduce((s,i)=>s+invoiceTotal(i),0);
  const margin=totalBudget-totalInvoices;
  content(`
    <div class="grid four">
      <div class="kpi"><span>Clients</span><strong>${data.clients.length}</strong></div>
      <div class="kpi"><span>Feines</span><strong>${data.jobs.length}</strong></div>
      <div class="kpi"><span>Total pressupostat base</span><strong>${money(totalBudget)}</strong></div>
      <div class="kpi ${margin>=0?'good':'bad'}"><span>Rendiment global</span><strong>${money(margin)}</strong></div>
    </div>
    <div class="card notice">Aquesta app és local: treballa al navegador i guarda les dades en aquest dispositiu. Fes servir “Exportar còpia JSON” sovint.</div>
    <div class="grid two">
      <div class="card"><h2>Flux de treball</h2><ol><li>Crear client o seleccionar TEIMOR.</li><li>Crear feina/obra classificada per any.</li><li>Crear pressupost i afegir partides de la llibreria o noves.</li><li>Associar factures i arxius/albarans.</li><li>Revisar rendiment per obra.</li></ol></div>
      <div class="card"><h2>Últimes feines</h2>${jobsTable(data.jobs.slice(-6).reverse(), true)}</div>
    </div>
  `);
}

function renderClients(){
  viewHeader('Clients', 'Alta i manteniment de clients del contractista.');
  const item = editing.client ? byId(data.clients, editing.client) : {};
  content(`
    <div class="card"><h2>${editing.client?'Editar client':'Nou client'}</h2>
      <form id="clientForm" class="form-grid">
        <label>Codi<input name="id" value="${esc(item.id || uid('CLI'))}" ${editing.client?'readonly':''}></label>
        <label class="wide">Client / empresa<input name="name" value="${esc(item.name||'')}"></label>
        <label>NIF/CIF<input name="nif" value="${esc(item.nif||'')}"></label>
        <label class="wide">Contacte<input name="contact" value="${esc(item.contact||'')}"></label>
        <label>Telèfon<input name="phone" value="${esc(item.phone||'')}"></label>
        <label>Email<input name="email" value="${esc(item.email||'')}"></label>
        <label class="wide">Adreça<input name="address" value="${esc(item.address||'')}"></label>
        <label>Municipi<input name="city" value="${esc(item.city||'')}"></label>
        <label>Estat<select name="status"><option ${item.status==='Actiu'?'selected':''}>Actiu</option><option ${item.status==='Inactiu'?'selected':''}>Inactiu</option><option ${item.status==='Potencial'?'selected':''}>Potencial</option></select></label>
        <label class="full">Notes<textarea name="notes">${esc(item.notes||'')}</textarea></label>
        <div class="actions full"><button class="primary">Guardar client</button>${editing.client?'<button type="button" class="ghost" data-action="cancelEdit">Cancel·lar</button>':''}</div>
      </form>
    </div>
    <div class="card"><h2>Llistat de clients</h2>${clientsTable()}</div>
  `);
}
function clientsTable(){ if(!data.clients.length) return empty(); return `<div class="table-wrap"><table><thead><tr><th>Codi</th><th>Client</th><th>Contacte</th><th>Telèfon</th><th>Email</th><th>Estat</th><th>Accions</th></tr></thead><tbody>${data.clients.map(c=>`<tr><td>${esc(c.id)}</td><td><strong>${esc(c.name)}</strong><br><span class="muted">${esc(c.city)}</span></td><td>${esc(c.contact)}</td><td>${esc(c.phone)}</td><td>${esc(c.email)}</td><td><span class="pill">${esc(c.status)}</span></td><td><button class="ghost small" data-edit-client="${esc(c.id)}">Editar</button> <button class="ghost small danger" data-delete-client="${esc(c.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`; }

function renderFeines(){
  viewHeader('Feines / anys', 'Obres i feines classificades per any, client i estat.');
  const item = editing.job ? byId(data.jobs, editing.job) : {};
  const years=[...new Set(data.jobs.map(j=>j.year))].sort((a,b)=>b-a);
  content(`
    <div class="card"><h2>${editing.job?'Editar feina':'Nova feina'}</h2>
      <form id="jobForm" class="form-grid">
        <label>Codi feina<input name="id" value="${esc(item.id || uid('F'))}" ${editing.job?'readonly':''}></label>
        <label>Any<input name="year" type="number" value="${esc(item.year || new Date().getFullYear())}"></label>
        <label class="wide">Client<select name="clientId">${options(data.clients,item.clientId)}</select></label>
        <label class="wide">Nom obra / feina<input name="title" value="${esc(item.title||'')}"></label>
        <label class="wide">Adreça obra<input name="address" value="${esc(item.address||'')}"></label>
        <label>Municipi<input name="city" value="${esc(item.city||'')}"></label>
        <label>Estat<select name="status">${['Pendent','En curs','Finalitzada','Tancada'].map(s=>`<option ${item.status===s?'selected':''}>${s}</option>`).join('')}</select></label>
        <label>Data inici<input name="start" type="date" value="${esc(item.start||'')}"></label>
        <label>Data final<input name="end" type="date" value="${esc(item.end||'')}"></label>
        <label>Pressupost principal<input name="mainBudgetId" value="${esc(item.mainBudgetId||'')}"></label>
        <label class="full">Observacions<textarea name="notes">${esc(item.notes||'')}</textarea></label>
        <div class="actions full"><button class="primary">Guardar feina</button>${editing.job?'<button type="button" class="ghost" data-action="cancelEdit">Cancel·lar</button>':''}</div>
      </form>
    </div>
    <div class="card"><div class="toolbar"><h2>Llistat de feines</h2><label>Filtrar any<select id="yearFilter"><option value="">Tots</option>${years.map(y=>`<option>${y}</option>`).join('')}</select></label></div><div id="jobsTableWrap">${jobsTable(data.jobs)}</div></div>
  `);
}
function jobsTable(rows, compact=false){ if(!rows.length) return empty(); return `<div class="table-wrap"><table><thead><tr><th>Any</th><th>Codi</th><th>Client</th><th>Obra</th><th>Estat</th><th>Pressupost</th>${compact?'':'<th>Rendiment</th><th>Accions</th>'}</tr></thead><tbody>${rows.map(j=>{ const base=jobBudgetBase(j.id), inv=jobInvoiceTotal(j.id), margin=base-inv; return `<tr><td>${esc(j.year)}</td><td>${esc(j.id)}</td><td>${esc(clientName(j.clientId))}</td><td><strong>${esc(j.title)}</strong><br><span class="muted">${esc(j.address)} · ${esc(j.city)}</span></td><td><span class="pill">${esc(j.status)}</span></td><td>${esc(j.mainBudgetId||'')}</td>${compact?'':`<td class="num">${money(margin)}</td><td><button class="ghost small" data-edit-job="${esc(j.id)}">Editar</button> <button class="ghost small danger" data-delete-job="${esc(j.id)}">Eliminar</button></td>`}</tr>`}).join('')}</tbody></table></div>`; }

function renderLlibreria(){
  viewHeader('Llibreria de partides', 'Partides tipus per reutilitzar en pressupostos.');
  const item = editing.library ? data.library.find(x=>x.code===editing.library) : {};
  content(`
    <div class="card"><h2>${editing.library?'Editar partida':'Nova partida tipus'}</h2>
      <form id="libraryForm" class="form-grid">
        <label>Codi<input name="code" value="${esc(item.code || uid('PAR'))}" ${editing.library?'readonly':''}></label>
        <label>Capítol/ofici<input name="chapter" value="${esc(item.chapter||'')}"></label>
        <label>Unitat<input name="unit" value="${esc(item.unit||'m²')}"></label>
        <label>PU venda<input name="unitPrice" type="number" step="0.01" value="${esc(item.unitPrice ?? 0)}"></label>
        <label class="wide">Concepte<input name="concept" value="${esc(item.concept||'')}"></label>
        <label>Origen/ref.<input name="origin" value="${esc(item.origin||'')}"></label>
        <label>Estat<select name="status">${['Actualitzat','Revisar','Pendent','Informatiu'].map(s=>`<option ${item.status===s?'selected':''}>${s}</option>`).join('')}</select></label>
        <label class="full">Descripció tècnica<textarea name="desc">${esc(item.desc||'')}</textarea></label>
        <div class="actions full"><button class="primary">Guardar partida</button>${editing.library?'<button type="button" class="ghost" data-action="cancelEdit">Cancel·lar</button>':''}</div>
      </form>
    </div>
    <div class="card"><div class="toolbar"><h2>Llistat de partides</h2><input id="librarySearch" placeholder="Filtrar per codi, concepte o capítol"></div><div id="libraryTableWrap">${libraryTable(data.library)}</div></div>
  `);
}
function libraryTable(rows){ if(!rows.length) return empty(); return `<div class="table-wrap"><table><thead><tr><th>Codi</th><th>Capítol</th><th>Ut</th><th>Partida</th><th>PU</th><th>Estat</th><th>Accions</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${esc(p.code)}</td><td>${esc(p.chapter)}</td><td>${esc(p.unit)}</td><td><strong>${esc(p.concept)}</strong><br><span class="muted">${esc(p.desc)}</span></td><td class="num">${money(p.unitPrice)}</td><td><span class="pill">${esc(p.status)}</span></td><td><button class="ghost small" data-edit-library="${esc(p.code)}">Editar</button> <button class="ghost small" data-add-lib-line="${esc(p.code)}">Afegir a pressupost</button> <button class="ghost small danger" data-delete-library="${esc(p.code)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`; }

function renderPressupostos(){
  viewHeader('Pressupostos', 'Crear pressupostos amb partides de llibreria o línies noves.');
  if(!selectedBudgetId && data.budgets[0]) selectedBudgetId=data.budgets[0].id;
  const b=byId(data.budgets, selectedBudgetId) || data.budgets[0];
  const libOptions = data.library.map(p=>`<option value="${esc(p.code)}">${esc(p.code)} · ${esc(p.concept)}</option>`).join('');
  content(`
    <div class="grid two">
      <div class="card"><h2>Crear pressupost</h2>
        <form id="budgetForm" class="form-grid">
          <label>Codi<input name="id" value="${esc(uid('P'))}"></label>
          <label>Data<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
          <label class="wide">Feina<select name="jobId">${options(data.jobs,'',x=>x.id,x=>`${x.id} · ${x.title}`)}</select></label>
          <label>Estat<select name="status"><option>Esborrany</option><option>Enviat</option><option>Acceptat</option><option>Rebutjat</option><option>Tancat</option></select></label>
          <label>IVA %<input name="vat" type="number" step="0.01" value="21"></label>
          <label class="wide">Notes<input name="notes"></label>
          <div class="actions full"><button class="primary">Crear pressupost</button></div>
        </form>
      </div>
      <div class="card"><h2>Seleccionar pressupost</h2><label>Pressupost actiu<select id="budgetSelect">${options(data.budgets,b?.id,x=>x.id,x=>`${x.id} · ${jobName(x.jobId)} · ${money(budgetBase(x))}`)}</select></label>${b?`<p class="muted">Client: ${esc(clientName(b.clientId))}<br>Feina: ${esc(jobName(b.jobId))}<br>Estat: ${esc(b.status)}</p>`:''}</div>
    </div>
    ${b ? `<div class="card"><div class="toolbar"><div><h2>Editor: ${esc(b.id)}</h2><span class="muted">Base ${money(budgetBase(b))} · IVA ${money(budgetVat(b))} · Total ${money(budgetTotal(b))}</span></div><div class="right"><button class="ghost" data-action="deleteBudget">Eliminar pressupost</button></div></div>
      <div class="grid two">
        <form id="addLibraryLineForm" class="card"><h2>Afegir des de llibreria</h2><label>Partida<select name="code">${libOptions}</select></label><label>Quantitat<input name="qty" type="number" step="0.01" value="1"></label><div class="actions"><button class="primary">Afegir partida</button></div></form>
        <form id="addManualLineForm" class="card"><h2>Afegir línia nova</h2><div class="form-grid"><label>Codi<input name="code" value="${esc(uid('NOVA'))}"></label><label>Capítol<input name="chapter"></label><label>Ut<input name="unit" value="ut"></label><label>PU<input name="unitPrice" type="number" step="0.01" value="0"></label><label class="wide">Concepte<input name="concept"></label><label>Quantitat<input name="qty" type="number" step="0.01" value="1"></label><label class="full">Descripció<textarea name="desc"></textarea></label></div><div class="actions"><button class="primary">Afegir línia manual</button></div></form>
      </div>
      ${budgetLinesTable(b)}
    </div>` : `<div class="empty">Crea un pressupost per començar.</div>`}
  `);
}
function budgetLinesTable(b){ return `<div class="table-wrap budget-lines"><table><thead><tr><th>#</th><th>Codi</th><th>Capítol</th><th>Ut</th><th>Concepte</th><th>Quantitat</th><th>Preu/Ut</th><th>Total</th><th>Accions</th></tr></thead><tbody>${(b.lines||[]).map((l,i)=>`<tr><td>${i+1}</td><td>${esc(l.code)}</td><td><input data-line-field="chapter" data-line-id="${esc(l.id)}" value="${esc(l.chapter)}"></td><td><input data-line-field="unit" data-line-id="${esc(l.id)}" value="${esc(l.unit)}"></td><td><input data-line-field="concept" data-line-id="${esc(l.id)}" value="${esc(l.concept)}"><br><span class="muted">${esc(l.desc||'')}</span></td><td><input class="num" type="number" step="0.01" data-line-field="qty" data-line-id="${esc(l.id)}" value="${esc(l.qty)}"></td><td><input class="num" type="number" step="0.01" data-line-field="unitPrice" data-line-id="${esc(l.id)}" value="${esc(l.unitPrice)}"></td><td class="num"><strong>${money(n(l.qty)*n(l.unitPrice))}</strong></td><td><button class="ghost small danger" data-delete-line="${esc(l.id)}">Eliminar</button></td></tr>`).join('') || `<tr><td colspan="9" class="muted">Encara no hi ha partides.</td></tr>`}</tbody></table></div><div class="budget-total"><span>Base: <strong>${money(budgetBase(b))}</strong></span><span>IVA: <strong>${money(budgetVat(b))}</strong></span><span>Total: <strong>${money(budgetTotal(b))}</strong></span></div>`; }

function renderFactures(){
  viewHeader('Factures', 'Factures i despeses associades a pressupostos i feines.');
  const item = editing.invoice ? byId(data.invoices, editing.invoice) : {};
  content(`
    <div class="card"><h2>${editing.invoice?'Editar factura':'Nova factura'}</h2>
      <form id="invoiceForm" class="form-grid">
        <label>ID factura<input name="id" value="${esc(item.id || uid('FAC'))}" ${editing.invoice?'readonly':''}></label>
        <label>Data<input name="date" type="date" value="${esc(item.date || new Date().toISOString().slice(0,10))}"></label>
        <label class="wide">Pressupost<select name="budgetId">${options(data.budgets,item.budgetId,x=>x.id,x=>`${x.id} · ${jobName(x.jobId)}`)}</select></label>
        <label class="wide">Proveïdor<input name="provider" value="${esc(item.provider||'')}"></label>
        <label>Núm. factura<input name="number" value="${esc(item.number||'')}"></label>
        <label>Base<input name="base" type="number" step="0.01" value="${esc(item.base ?? 0)}"></label>
        <label>IVA %<input name="vat" type="number" step="0.01" value="${esc(item.vat ?? 21)}"></label>
        <label>Pagada?<select name="paid"><option value="false" ${!item.paid?'selected':''}>No</option><option value="true" ${item.paid?'selected':''}>Sí</option></select></label>
        <label class="wide">Concepte<input name="concept" value="${esc(item.concept||'')}"></label>
        <label class="full">Notes<textarea name="notes">${esc(item.notes||'')}</textarea></label>
        <div class="actions full"><button class="primary">Guardar factura</button>${editing.invoice?'<button type="button" class="ghost" data-action="cancelEdit">Cancel·lar</button>':''}</div>
      </form>
    </div>
    <div class="card"><h2>Llistat factures</h2>${invoicesTable()}</div>
  `);
}
function invoicesTable(){ if(!data.invoices.length) return empty(); return `<div class="table-wrap"><table><thead><tr><th>ID</th><th>Data</th><th>Pressupost</th><th>Feina</th><th>Proveïdor</th><th>Factura</th><th>Base</th><th>Total</th><th>Pagada</th><th>Accions</th></tr></thead><tbody>${data.invoices.map(i=>`<tr><td>${esc(i.id)}</td><td>${esc(i.date)}</td><td>${esc(i.budgetId)}</td><td>${esc(i.jobId || byId(data.budgets,i.budgetId)?.jobId || '')}</td><td>${esc(i.provider)}</td><td>${esc(i.number)}</td><td class="num">${money(invoiceBase(i))}</td><td class="num"><strong>${money(invoiceTotal(i))}</strong></td><td>${i.paid?'Sí':'No'}</td><td><button class="ghost small" data-edit-invoice="${esc(i.id)}">Editar</button> <button class="ghost small danger" data-delete-invoice="${esc(i.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`; }

function renderRendiment(){
  viewHeader('Rendiment', 'Comparativa per obra: pressupostat, factures/despeses i marge.');
  const rows=data.jobs.map(j=>{ const base=jobBudgetBase(j.id), inv=jobInvoiceTotal(j.id), margin=base-inv, ratio=base?margin/base:0; return {j,base,inv,margin,ratio}; });
  const totalBudget=rows.reduce((s,r)=>s+r.base,0), totalInv=rows.reduce((s,r)=>s+r.inv,0), totalMargin=totalBudget-totalInv;
  content(`
    <div class="grid four"><div class="kpi"><span>Total pressupostat</span><strong>${money(totalBudget)}</strong></div><div class="kpi"><span>Total factures/despeses</span><strong>${money(totalInv)}</strong></div><div class="kpi ${totalMargin>=0?'good':'bad'}"><span>Rendiment €</span><strong>${money(totalMargin)}</strong></div><div class="kpi"><span>Rendiment %</span><strong>${pct(totalBudget?totalMargin/totalBudget:0)}</strong></div></div>
    <div class="card"><h2>Rendiment per feina</h2><div class="table-wrap"><table><thead><tr><th>Any</th><th>Feina</th><th>Pressupostat</th><th>Factures</th><th>Rendiment</th><th>%</th><th>Visual</th></tr></thead><tbody>${rows.map(r=>{ const width=Math.max(0,Math.min(100,r.ratio*100)); return `<tr><td>${esc(r.j.year)}</td><td><strong>${esc(r.j.title)}</strong><br><span class="muted">${esc(r.j.id)} · ${esc(clientName(r.j.clientId))}</span></td><td class="num">${money(r.base)}</td><td class="num">${money(r.inv)}</td><td class="num"><strong>${money(r.margin)}</strong></td><td class="num">${pct(r.ratio)}</td><td><div class="bar ${r.margin<0?'red':''}"><span style="width:${width}%"></span></div></td></tr>`}).join('')}</tbody></table></div></div>
  `);
}

function renderArxius(){
  viewHeader('Arxius / albarans', 'Annexa albarans, PDFs, fotos i documents vinculats a feina o pressupost.');
  content(`
    <div class="card"><h2>Afegir arxiu</h2>
      <form id="fileForm" class="form-grid">
        <label>Data<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
        <label class="wide">Feina<select name="jobId">${options(data.jobs,'',x=>x.id,x=>`${x.id} · ${x.title}`)}</select></label>
        <label>Pressupost<select name="budgetId"><option value="">—</option>${options(data.budgets,'',x=>x.id,x=>x.id)}</select></label>
        <label>Tipus<select name="type"><option>Albarà</option><option>Factura</option><option>Pressupost</option><option>Foto</option><option>PDF tècnic</option><option>Altres</option></select></label>
        <label>Proveïdor / origen<input name="provider"></label>
        <label>Núm. doc.<input name="docNumber"></label>
        <label>Import<input name="amount" type="number" step="0.01" value="0"></label>
        <label class="full dropzone">Selecciona arxiu<input name="file" type="file"></label>
        <label class="full">Notes<textarea name="notes"></textarea></label>
        <div class="actions full"><button class="primary">Guardar arxiu</button></div>
      </form>
    </div>
    <div class="card"><h2>Documents guardats</h2><div id="attachmentsTable">${attachmentsTable()}</div></div>
  `);
}
function attachmentsTable(){ if(!data.attachments.length) return empty(); return `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Feina</th><th>Pressupost</th><th>Tipus</th><th>Origen</th><th>Fitxer</th><th>Import</th><th>Accions</th></tr></thead><tbody>${data.attachments.map(a=>`<tr><td>${esc(a.date)}</td><td>${esc(a.jobId)}</td><td>${esc(a.budgetId||'')}</td><td><span class="pill">${esc(a.type)}</span></td><td>${esc(a.provider||'')}</td><td>${esc(a.fileName||'')}</td><td class="num">${money(a.amount)}</td><td>${a.fileId?`<button class="ghost small" data-download-file="${esc(a.fileId)}">Descarregar</button>`:''} <button class="ghost small danger" data-delete-attachment="${esc(a.id)}">Eliminar</button></td></tr>`).join('')}</tbody></table></div>`; }

function empty(){ return document.getElementById('emptyState').innerHTML; }

async function openFileDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(DB_STORE,{keyPath:'id'});
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function putFile(id,file){ const db=await openFileDb(); return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).put({id,name:file.name,type:file.type,blob:file}); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); }); }
async function getFile(id){ const db=await openFileDb(); return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readonly'); const req=tx.objectStore(DB_STORE).get(id); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
async function deleteFile(id){ const db=await openFileDb(); return new Promise((resolve,reject)=>{ const tx=db.transaction(DB_STORE,'readwrite'); tx.objectStore(DB_STORE).delete(id); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); }); }

function bindAfterRender(){
  document.querySelector('[data-action="cancelEdit"]')?.addEventListener('click',()=>{ editing={client:null,job:null,library:null,invoice:null}; render(); });

  document.getElementById('clientForm')?.addEventListener('submit',e=>{ e.preventDefault(); const f=new FormData(e.target); const obj=Object.fromEntries(f); const idx=data.clients.findIndex(x=>x.id===obj.id); if(idx>=0) data.clients[idx]=obj; else data.clients.push(obj); editing.client=null; saveData(); render(); });
  document.querySelectorAll('[data-edit-client]').forEach(b=>b.onclick=()=>{editing.client=b.dataset.editClient; render();});
  document.querySelectorAll('[data-delete-client]').forEach(b=>b.onclick=()=>{ if(confirm('Eliminar client?')){ data.clients=data.clients.filter(x=>x.id!==b.dataset.deleteClient); saveData(); render(); }});

  document.getElementById('jobForm')?.addEventListener('submit',e=>{ e.preventDefault(); const f=new FormData(e.target); const obj=Object.fromEntries(f); obj.year=n(obj.year); const idx=data.jobs.findIndex(x=>x.id===obj.id); if(idx>=0) data.jobs[idx]=obj; else data.jobs.push(obj); editing.job=null; saveData(); render(); });
  document.querySelectorAll('[data-edit-job]').forEach(b=>b.onclick=()=>{editing.job=b.dataset.editJob; render();});
  document.querySelectorAll('[data-delete-job]').forEach(b=>b.onclick=()=>{ if(confirm('Eliminar feina?')){ data.jobs=data.jobs.filter(x=>x.id!==b.dataset.deleteJob); saveData(); render(); }});
  document.getElementById('yearFilter')?.addEventListener('change',e=>{ const year=e.target.value; const rows=year?data.jobs.filter(j=>String(j.year)===year):data.jobs; document.getElementById('jobsTableWrap').innerHTML=jobsTable(rows); bindAfterRender(); });

  document.getElementById('libraryForm')?.addEventListener('submit',e=>{ e.preventDefault(); const f=new FormData(e.target); const obj=Object.fromEntries(f); obj.unitPrice=n(obj.unitPrice); const idx=data.library.findIndex(x=>x.code===obj.code); if(idx>=0) data.library[idx]=obj; else data.library.push(obj); editing.library=null; saveData(); render(); });
  document.querySelectorAll('[data-edit-library]').forEach(b=>b.onclick=()=>{editing.library=b.dataset.editLibrary; render();});
  document.querySelectorAll('[data-delete-library]').forEach(b=>b.onclick=()=>{ if(confirm('Eliminar partida de la llibreria?')){ data.library=data.library.filter(x=>x.code!==b.dataset.deleteLibrary); saveData(); render(); }});
  document.getElementById('librarySearch')?.addEventListener('input',e=>{ const q=e.target.value.toLowerCase(); const rows=data.library.filter(p=>[p.code,p.chapter,p.concept,p.desc].join(' ').toLowerCase().includes(q)); document.getElementById('libraryTableWrap').innerHTML=libraryTable(rows); bindAfterRender(); });
  document.querySelectorAll('[data-add-lib-line]').forEach(b=>b.onclick=()=>{ currentView='pressupostos'; render(); setTimeout(()=>{ const sel=document.querySelector('#addLibraryLineForm select[name="code"]'); if(sel) sel.value=b.dataset.addLibLine; },0); });

  document.getElementById('budgetForm')?.addEventListener('submit',e=>{ e.preventDefault(); const f=new FormData(e.target); const obj=Object.fromEntries(f); const job=byId(data.jobs,obj.jobId); obj.clientId=job?.clientId||''; obj.vat=n(obj.vat); obj.lines=[]; data.budgets.push(obj); if(job) job.mainBudgetId=obj.id; selectedBudgetId=obj.id; saveData(); render(); });
  document.getElementById('budgetSelect')?.addEventListener('change',e=>{ selectedBudgetId=e.target.value; render(); });
  document.querySelector('[data-action="deleteBudget"]')?.addEventListener('click',()=>{ if(confirm('Eliminar pressupost actiu?')){ data.budgets=data.budgets.filter(b=>b.id!==selectedBudgetId); selectedBudgetId=data.budgets[0]?.id||''; saveData(); render(); }});
  document.getElementById('addLibraryLineForm')?.addEventListener('submit',e=>{ e.preventDefault(); const f=new FormData(e.target); const p=data.library.find(x=>x.code===f.get('code')); const b=byId(data.budgets,selectedBudgetId); if(p&&b){ b.lines.push({id:uid('LIN'), code:p.code, chapter:p.chapter, unit:p.unit, concept:p.concept, desc:p.desc, qty:n(f.get('qty')), unitPrice:n(p.unitPrice), origin:'Llibreria'}); saveData(); render(); }});
  document.getElementById('addManualLineForm')?.addEventListener('submit',e=>{ e.preventDefault(); const f=new FormData(e.target); const b=byId(data.budgets,selectedBudgetId); if(b){ b.lines.push({id:uid('LIN'), code:f.get('code'), chapter:f.get('chapter'), unit:f.get('unit'), concept:f.get('concept'), desc:f.get('desc'), qty:n(f.get('qty')), unitPrice:n(f.get('unitPrice')), origin:'Manual'}); saveData(); render(); }});
  document.querySelectorAll('[data-line-field]').forEach(inp=>inp.addEventListener('change',e=>{ const b=byId(data.budgets,selectedBudgetId); const line=b?.lines.find(l=>l.id===e.target.dataset.lineId); if(line){ const field=e.target.dataset.lineField; line[field]=['qty','unitPrice'].includes(field)?n(e.target.value):e.target.value; saveData(); render(); }}));
  document.querySelectorAll('[data-delete-line]').forEach(btn=>btn.onclick=()=>{ const b=byId(data.budgets,selectedBudgetId); if(b){ b.lines=b.lines.filter(l=>l.id!==btn.dataset.deleteLine); saveData(); render(); }});

  document.getElementById('invoiceForm')?.addEventListener('submit',e=>{ e.preventDefault(); const f=new FormData(e.target); const obj=Object.fromEntries(f); const bud=byId(data.budgets,obj.budgetId); obj.jobId=bud?.jobId||''; obj.base=n(obj.base); obj.vat=n(obj.vat); obj.paid=obj.paid==='true'; const idx=data.invoices.findIndex(x=>x.id===obj.id); if(idx>=0) data.invoices[idx]=obj; else data.invoices.push(obj); editing.invoice=null; saveData(); render(); });
  document.querySelectorAll('[data-edit-invoice]').forEach(b=>b.onclick=()=>{editing.invoice=b.dataset.editInvoice; render();});
  document.querySelectorAll('[data-delete-invoice]').forEach(b=>b.onclick=()=>{ if(confirm('Eliminar factura?')){ data.invoices=data.invoices.filter(x=>x.id!==b.dataset.deleteInvoice); saveData(); render(); }});

  document.getElementById('fileForm')?.addEventListener('submit',async e=>{ e.preventDefault(); const f=new FormData(e.target); const file=f.get('file'); let fileId=''; if(file && file.name){ fileId=uid('FILE'); await putFile(fileId,file); } const obj={id:uid('ARX'), date:f.get('date'), jobId:f.get('jobId'), budgetId:f.get('budgetId'), type:f.get('type'), provider:f.get('provider'), docNumber:f.get('docNumber'), amount:n(f.get('amount')), notes:f.get('notes'), fileName:file?.name||'', fileId}; data.attachments.push(obj); saveData(); render(); });
  document.querySelectorAll('[data-download-file]').forEach(b=>b.onclick=async()=>{ const rec=await getFile(b.dataset.downloadFile); if(!rec){alert('No s’ha trobat el fitxer al navegador.'); return;} const a=document.createElement('a'); a.href=URL.createObjectURL(rec.blob); a.download=rec.name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); });
  document.querySelectorAll('[data-delete-attachment]').forEach(b=>b.onclick=async()=>{ if(confirm('Eliminar arxiu del registre?')){ const a=data.attachments.find(x=>x.id===b.dataset.deleteAttachment); if(a?.fileId) await deleteFile(a.fileId); data.attachments=data.attachments.filter(x=>x.id!==b.dataset.deleteAttachment); saveData(); render(); }});
}

render();
