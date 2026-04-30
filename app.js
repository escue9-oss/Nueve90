// ═══════════════════════════════════════════════════════
//  NUEVE90 — app.js
// ═══════════════════════════════════════════════════════

// ── Paleta de marca (tomada del logo) ────────────────────
const C = {
  red:    '#c94120',  // rojo-naranja (columna 1 del logo)
  orange: '#f07820',  // naranja      (columna 2)
  teal:   '#3aacac',  // teal claro   (columna 3, aclarado para visibilidad)
  mint:   '#00c090',  // verde-teal   (columna 4)
  card:   '#222222',
  border: '#2e2e2e',
  text2:  '#777777',
};

const NAV_COLORS = {
  grilla: C.orange, caja: C.mint,
  borderaux: C.teal, pedidos: C.red, admin: C.orange,
};

// ── Firebase config ────────────────────────────────────────
// ⚠️  REEMPLAZAR con los valores de tu proyecto Firebase
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyAGIRQ86CJJTS9DXjN9X42MjqS3dnO-DuQ",
  authDomain:        "nueve90-32d0c.firebaseapp.com",
  databaseURL:       "https://nueve90-32d0c-default-rtdb.firebaseio.com",
  projectId:         "nueve90-32d0c",
  storageBucket:     "nueve90-32d0c.firebasestorage.app",
  messagingSenderId: "1014283468295",
  appId:             "1:1014283468295:web:cd782454c8bec23d8634a2"
};

let _db = null;
let _dbRef = null;
try {
  firebase.initializeApp(FIREBASE_CONFIG);
  _db    = firebase.database();
  _dbRef = _db.ref('nueve90');
} catch(e) {}

// ── Datos ─────────────────────────────────────────────────
const STORAGE_KEY = 'nueve90_v1';
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function defaultState() {
  return { events:[], transactions:[], borderaux:[], orders:[], tasks:[], contacts:[] };
}

function fixArrays(data) {
  ['events','transactions','borderaux','orders','tasks','contacts'].forEach(k => {
    if (!data[k]) { data[k] = []; return; }
    if (!Array.isArray(data[k])) data[k] = Object.values(data[k]);
  });
  return data;
}

let state = (() => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState(); }
  catch { return defaultState(); }
})();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  if (_dbRef) {
    showSync('syncing');
    _dbRef.set(state)
      .then(() => showSync('ok'))
      .catch(() => showSync('error'));
  }
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ── Indicador de sync ──────────────────────────────────────
let _syncTimer = null;
function showSync(status) {
  const el = document.getElementById('sync-indicator');
  const dot = document.getElementById('sync-dot');
  const txt = document.getElementById('sync-text');
  if (!el) return;
  const cfg = {
    syncing: { color:'#f07820', text:'SINCRONIZANDO' },
    ok:      { color:'#00c090', text:'SINCRONIZADO'  },
    error:   { color:'#c94120', text:'SIN CONEXIÓN'  },
  }[status];
  el.style.display = 'flex';
  dot.style.background = cfg.color;
  txt.textContent = cfg.text;
  txt.style.color = cfg.color;
  dot.style.color = cfg.color;
  clearTimeout(_syncTimer);
  if (status !== 'error') _syncTimer = setTimeout(() => { el.style.display = 'none'; }, 2500);
}

// ── Utilidades ────────────────────────────────────────────
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}
function pad(n) { return String(n).padStart(2,'0'); }
function money(n) { return '$' + Number(n).toLocaleString('es-AR',{minimumFractionDigits:0}); }
function fmtDate(s) { if (!s) return ''; const [y,m,d] = s.split('-'); return `${d}/${m}/${y}`; }
function currentYM() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}`; }

// ── Toast ─────────────────────────────────────────────────
let _tt = null;
function toast(msg, color = C.mint) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.style.color = color; el.style.display = 'block';
  clearTimeout(_tt);
  _tt = setTimeout(() => { el.style.display = 'none'; }, 2200);
}

// ── Modal ─────────────────────────────────────────────────
function openModal(title, html) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = html;
  document.getElementById('modal-bg').classList.add('open');
}
function closeModal() { document.getElementById('modal-bg').classList.remove('open'); }
function handleModalBgClick(e) {
  if (e.target === document.getElementById('modal-bg')) closeModal();
}

// ── Router ─────────────────────────────────────────────────
let currentView = 'grilla';

function renderCurrentView() {
  ({ grilla:renderGrilla, caja:renderCaja, borderaux:renderBorderaux,
     pedidos:renderPedidos, admin:renderAdmin })[currentView]?.();
}

function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(btn => {
    const on = btn.dataset.view === view;
    btn.classList.toggle('active', on);
    btn.style.color = on ? NAV_COLORS[view] : '';
  });
  currentView = view;
  ({ grilla:renderGrilla, caja:renderCaja, borderaux:renderBorderaux,
     pedidos:renderPedidos, admin:renderAdmin })[view]?.();
}

// ── Info row (modal) ──────────────────────────────────────
function infoRow(label, value) {
  return `<div style="background:${C.card};border-radius:10px;padding:12px 14px;">
    <p style="font-size:10px;color:#444;margin:0 0 3px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">${label}</p>
    <p style="margin:0;font-size:15px;font-weight:600;">${value}</p>
  </div>`;
}


// ═══════════════════════════════════════════════════════
//  GRILLA
// ═══════════════════════════════════════════════════════
const SC = { confirmado: C.mint, tentativo: C.orange, cancelado: C.red };

let gMonth = new Date().getMonth();
let gYear  = new Date().getFullYear();
let gSelected = today();

function renderGrilla() {
  const label = `${MONTHS[gMonth]} ${gYear}`;
  document.getElementById('grilla-month-label').textContent = label.toUpperCase();

  const todayStr = today();
  const evsByDate = {};
  state.events
    .filter(e => { const [y,m]=e.date.split('-'); return +y===gYear && +m===gMonth+1; })
    .forEach(e => { (evsByDate[e.date]||=[]).push(e); });

  const firstDow    = (new Date(gYear, gMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(gYear, gMonth+1, 0).getDate();
  const daysInPrev  = new Date(gYear, gMonth, 0).getDate();
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  let html = '';
  for (let i = 0; i < totalCells; i++) {
    let day, mo, yr, current;
    if (i < firstDow) { day=daysInPrev-firstDow+i+1; mo=gMonth-1; current=false; }
    else if (i >= firstDow+daysInMonth) { day=i-firstDow-daysInMonth+1; mo=gMonth+1; current=false; }
    else { day=i-firstDow+1; mo=gMonth; current=true; }
    yr = mo<0?gYear-1:(mo>11?gYear+1:gYear);
    mo = ((mo%12)+12)%12;
    const ds = `${yr}-${pad(mo+1)}-${pad(day)}`;

    let cls = 'cal-cell';
    if (!current) cls += ' other-month';
    if (ds === todayStr) cls += ' today';
    if (ds === gSelected && ds !== todayStr) cls += ' selected';

    const evs = current ? (evsByDate[ds]||[]) : [];
    const chips = evs.slice(0,2).map(ev => {
      const c = SC[ev.status]||C.orange;
      return `<span class="ev-chip" style="background:${c}33;color:${c};"
        onclick="event.stopPropagation();evDetail('${ev.id}')">${ev.title}</span>`;
    }).join('');
    const more = evs.length>2 ? `<span style="font-size:8px;color:#555;font-weight:800;padding-left:3px;">+${evs.length-2}</span>` : '';

    html += `<div class="${cls}" onclick="gSelect('${ds}')">
      <span class="cal-day-num">${day}</span>${chips}${more}
    </div>`;
  }
  document.getElementById('grilla-days').innerHTML = html;
  renderDayEvents(gSelected || todayStr);
}

function gSelect(ds) { gSelected = ds; renderGrilla(); }

function renderDayEvents(ds) {
  const [,m,d] = ds.split('-');
  document.getElementById('grilla-day-label').textContent = `${d} de ${MONTHS[parseInt(m)-1]}`;
  const evs = state.events.filter(e => e.date === ds);
  if (!evs.length) {
    document.getElementById('grilla-events-list').innerHTML =
      `<div style="text-align:center;color:#2e2e2e;padding:28px 0;font-size:14px;letter-spacing:.5px;">Sin eventos</div>`;
    return;
  }
  document.getElementById('grilla-events-list').innerHTML = evs.map(ev => {
    const c = SC[ev.status] || C.orange;
    return `<div onclick="evDetail('${ev.id}')"
      style="background:${C.card};border-radius:12px;padding:14px 16px;margin-bottom:8px;border-left:3px solid ${c};cursor:pointer;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
        <div style="flex:1;">
          <p style="font-size:16px;font-weight:700;margin:0 0 3px;">${ev.title}</p>
          <p style="font-size:12px;color:${C.text2};margin:0;">${ev.time||'Sin horario'} · ${ev.responsible||'Sin responsable'}</p>
          ${ev.notes?`<p style="font-size:12px;color:#555;margin:6px 0 0;">${ev.notes}</p>`:''}
        </div>
        <span class="badge" style="background:${c}22;color:${c};flex-shrink:0;">${ev.status}</span>
      </div>
    </div>`;
  }).join('');
}

function evDetail(id) {
  const ev = state.events.find(e=>e.id===id); if (!ev) return;
  const c = SC[ev.status] || C.orange;
  openModal('Evento', `
    <div style="margin-bottom:14px;padding-bottom:14px;border-bottom:1px solid ${C.border};">
      <p style="font-size:20px;font-weight:800;margin:0 0 4px;">${ev.title}</p>
      <p style="color:${C.text2};margin:0;">${fmtDate(ev.date)}${ev.time?' · '+ev.time:''}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
      ${infoRow('Responsable', ev.responsible||'—')}
      ${infoRow('Estado', `<span class="badge" style="background:${c}22;color:${c};">${ev.status}</span>`)}
      ${ev.notes?infoRow('Notas',ev.notes):''}
    </div>
    <div style="display:flex;gap:8px;">
      <button class="tap" onclick="openEvForm('${id}')"
        style="flex:1;background:${C.card};border:none;border-radius:12px;padding:14px;color:#fff;font-size:14px;font-weight:700;">Editar</button>
      <button class="tap" onclick="deleteEv('${id}')"
        style="flex:1;background:#2b0e0b;border:none;border-radius:12px;padding:14px;color:${C.red};font-size:14px;font-weight:700;">Eliminar</button>
    </div>`);
}

function openEvForm(id) {
  closeModal();
  const ev = id ? state.events.find(e=>e.id===id) : null;
  const d = ev || { title:'', date:gSelected||today(), time:'', responsible:'', status:'confirmado', notes:'' };
  setTimeout(() => openModal(ev?'Editar Evento':'Nuevo Evento', `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <input id="ef-title" class="field" type="text" placeholder="Nombre del evento *" value="${d.title}">
      <div style="display:flex;gap:10px;">
        <div style="flex:1;">
          <label style="font-size:10px;color:#444;display:block;margin-bottom:5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Fecha *</label>
          <input id="ef-date" class="field" type="date" value="${d.date}">
        </div>
        <div style="flex:1;">
          <label style="font-size:10px;color:#444;display:block;margin-bottom:5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Hora</label>
          <input id="ef-time" class="field" type="time" value="${d.time}">
        </div>
      </div>
      <select id="ef-resp" class="field">
        <option value="">Sin responsable</option>
        ${['Jose','Juli Rabitti','Juli Bragio'].map(p=>`<option ${d.responsible===p?'selected':''}>${p}</option>`).join('')}
      </select>
      <select id="ef-status" class="field">
        ${['confirmado','tentativo','cancelado'].map(s=>`<option value="${s}" ${d.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
      </select>
      <textarea id="ef-notes" class="field" rows="3" placeholder="Notas (opcional)">${d.notes}</textarea>
      <button class="tap" onclick="saveEv('${id||''}')"
        style="background:${C.orange};border:none;border-radius:12px;padding:15px;color:#fff;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">
        ${ev?'Guardar cambios':'Crear evento'}
      </button>
    </div>`), 120);
}

function saveEv(id) {
  const title = document.getElementById('ef-title').value.trim();
  const date  = document.getElementById('ef-date').value;
  if (!title||!date) { toast('Completá nombre y fecha', C.red); return; }
  const data = { title, date,
    time: document.getElementById('ef-time').value,
    responsible: document.getElementById('ef-resp').value,
    status: document.getElementById('ef-status').value,
    notes: document.getElementById('ef-notes').value.trim(),
  };
  if (id) { Object.assign(state.events.find(e=>e.id===id), data); }
  else { state.events.push({ id:uid(), ...data }); }
  save(); closeModal();
  const [y,m] = date.split('-');
  gYear=+y; gMonth=+m-1; gSelected=date;
  renderGrilla();
  toast(id?'Evento actualizado ✓':'Evento creado ✓');
}

function deleteEv(id) {
  state.events = state.events.filter(e=>e.id!==id);
  save(); closeModal(); renderGrilla();
  toast('Evento eliminado', C.red);
}

// ── Export: imagen con identidad visual nueve90 ───────────
async function exportGrilla() {
  const todayStr = today();

  // Build month events map: day → [events]
  const evMap = {};
  state.events
    .filter(e => { const [y,m]=e.date.split('-'); return +y===gYear && +m===gMonth+1; })
    .forEach(e => { const d=+e.date.split('-')[2]; (evMap[d]||=[]).push(e); });

  // Build calendar cells HTML
  const firstDow    = (new Date(gYear, gMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(gYear, gMonth+1, 0).getDate();
  const daysInPrev  = new Date(gYear, gMonth, 0).getDate();
  const totalCells  = Math.ceil((firstDow + daysInMonth) / 7) * 7;

  let cellsHTML = '';
  for (let i = 0; i < totalCells; i++) {
    let day, current;
    if (i < firstDow) { day=daysInPrev-firstDow+i+1; current=false; }
    else if (i >= firstDow+daysInMonth) { day=i-firstDow-daysInMonth+1; current=false; }
    else { day=i-firstDow+1; current=true; }

    const mo = gMonth; const yr = gYear;
    const ds = `${yr}-${pad(mo+1)}-${pad(day)}`;
    const isToday = ds === todayStr && current;
    const evs = current ? (evMap[day]||[]) : [];

    cellsHTML += `<div style="min-height:72px;padding:5px 4px;border:1px solid #2a2a2a;border-radius:5px;background:${isToday?'#f07820':'#1a1a1a'};">
      <div style="font-size:14px;font-weight:900;color:${!current?'#2e2e2e':isToday?'#fff':'#fff'};font-family:'Barlow Condensed',sans-serif;margin-bottom:3px;">${day}</div>
      ${evs.slice(0,2).map(e => {
        const ec = SC[e.status]||C.orange;
        return `<div style="font-size:9px;font-weight:700;color:${ec};background:${ec}22;border-radius:3px;padding:2px 4px;margin-bottom:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${e.title}</div>`;
      }).join('')}
      ${evs.length>2?`<div style="font-size:8px;color:#555;font-weight:700;">+${evs.length-2}</div>`:''}
    </div>`;
  }

  const stripe = `<div style="display:flex;height:10px;">
    <div style="flex:1;background:#c94120;"></div>
    <div style="flex:1;background:#f07820;"></div>
    <div style="flex:1;background:#1e6868;"></div>
    <div style="flex:1;background:#00c090;"></div>
  </div>`;

  const tpl = document.createElement('div');
  tpl.style.cssText = 'position:absolute;left:-9999px;top:0;width:700px;';
  tpl.innerHTML = `
    <div style="background:#111;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
      ${stripe}
      <!-- Header -->
      <div style="background:#1a1a1a;padding:20px 28px 16px;display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:14px;">
          <img src="logo.png.jpg" alt="nueve90" style="width:56px;height:56px;border-radius:50%;object-fit:cover;flex-shrink:0;">
          <div>
            <p style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-style:italic;font-size:40px;margin:0;color:#fff;line-height:1;letter-spacing:-1px;text-transform:uppercase;">nueve90</p>
            <p style="font-size:10px;color:#f07820;margin:3px 0 0;font-weight:800;letter-spacing:3px;text-transform:uppercase;">cooperativa cultural</p>
          </div>
        </div>
        <div style="text-align:right;">
          <p style="font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:28px;margin:0;color:#fff;text-transform:uppercase;letter-spacing:-1px;">${MONTHS[gMonth]}</p>
          <p style="font-size:15px;color:#555;margin:2px 0 0;font-weight:700;">${gYear}</p>
        </div>
      </div>
      <!-- Calendar -->
      <div style="padding:16px 20px 20px;background:#111;">
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:4px;">
          ${['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'].map(d=>`<div style="text-align:center;font-size:9px;font-weight:800;color:#3a3a3a;letter-spacing:1px;padding-bottom:4px;">${d}</div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;">${cellsHTML}</div>
      </div>
      ${stripe}
    </div>`;

  document.body.appendChild(tpl);
  try {
    await document.fonts.ready;
    const canvas = await html2canvas(tpl.firstElementChild, {
      backgroundColor: '#111', scale: 2.2, useCORS: true, logging: false,
    });
    const link = document.createElement('a');
    link.download = `nueve90-${MONTHS[gMonth].toLowerCase()}-${gYear}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Imagen descargada ✓');
  } catch(e) {
    toast('Error al exportar', C.red);
  } finally {
    document.body.removeChild(tpl);
  }
}


// ═══════════════════════════════════════════════════════
//  CAJA
// ═══════════════════════════════════════════════════════
let cajaYM = currentYM();

function renderCaja() {
  const sel = document.getElementById('caja-month-sel');
  const now = new Date();
  let opts = '';
  for (let i=5; i>=-2; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const ym = `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
    opts += `<option value="${ym}" ${ym===cajaYM?'selected':''}>${MONTHS[d.getMonth()]} ${d.getFullYear()}</option>`;
  }
  sel.innerHTML = opts;

  const txs = state.transactions.filter(t => t.date.startsWith(cajaYM));
  const ing = txs.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const egr = txs.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const sal = ing - egr;

  document.getElementById('sum-ingresos').textContent = money(ing);
  document.getElementById('sum-egresos').textContent = money(egr);
  const salEl = document.getElementById('sum-saldo');
  salEl.textContent = money(sal);
  salEl.style.color = sal >= 0 ? C.mint : C.red;

  if (!txs.length) {
    document.getElementById('caja-list').innerHTML =
      `<div style="text-align:center;color:#2e2e2e;padding:28px 0;font-size:14px;">Sin movimientos</div>`;
    return;
  }

  const byDay = {};
  [...txs].sort((a,b)=>b.date.localeCompare(a.date)).forEach(t => { (byDay[t.date]||=[]).push(t); });

  let html = '';
  for (const [date, list] of Object.entries(byDay)) {
    html += `<div class="sec-label">${fmtDate(date)}</div>`;
    html += list.map(t => {
      const isIn = t.type==='income';
      return `<div onclick="txDetail('${t.id}')"
        style="background:${C.card};border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;">
        <div>
          <p style="font-size:15px;font-weight:700;margin:0 0 2px;">${t.concept}</p>
          <p style="font-size:12px;color:${C.text2};margin:0;">${t.category}${t.responsible?' · '+t.responsible:''}</p>
        </div>
        <span style="font-size:17px;font-weight:900;color:${isIn?C.mint:C.red};">${isIn?'+':'-'}${money(t.amount)}</span>
      </div>`;
    }).join('');
  }
  document.getElementById('caja-list').innerHTML = html;
}

function txDetail(id) {
  const t = state.transactions.find(x=>x.id===id); if (!t) return;
  const isIn = t.type==='income';
  openModal('Movimiento', `
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
      ${infoRow('Concepto', t.concept)}
      <div style="display:flex;gap:8px;">
        <div style="flex:1;background:${C.card};border-radius:10px;padding:12px 14px;">
          <p style="font-size:10px;color:#444;margin:0 0 3px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Monto</p>
          <p style="margin:0;font-size:18px;font-weight:900;color:${isIn?C.mint:C.red};">${isIn?'+':'-'}${money(t.amount)}</p>
        </div>
        <div style="flex:1;background:${C.card};border-radius:10px;padding:12px 14px;">
          <p style="font-size:10px;color:#444;margin:0 0 3px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Fecha</p>
          <p style="margin:0;font-size:15px;font-weight:700;">${fmtDate(t.date)}</p>
        </div>
      </div>
      ${infoRow('Categoría', t.category)}
      ${t.responsible?infoRow('Responsable',t.responsible):''}
      ${t.notes?infoRow('Notas',t.notes):''}
    </div>
    <button class="tap" onclick="deleteTx('${id}')"
      style="width:100%;background:#2b0e0b;border:none;border-radius:12px;padding:14px;color:${C.red};font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">Eliminar</button>`);
}

let _txType = 'income';

function openTxForm() {
  _txType = 'income';
  openModal('Nuevo Movimiento', `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <div style="display:flex;gap:8px;">
        <button id="tx-in" onclick="setTxType('income')" class="tap"
          style="flex:1;background:#0b2b1a;border:2px solid ${C.mint};border-radius:12px;padding:12px;color:${C.mint};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">↑ Ingreso</button>
        <button id="tx-ex" onclick="setTxType('expense')" class="tap"
          style="flex:1;background:${C.card};border:2px solid transparent;border-radius:12px;padding:12px;color:${C.text2};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">↓ Egreso</button>
      </div>
      <input id="tx-concept" class="field" type="text" placeholder="Concepto *">
      <input id="tx-amount" class="field" type="number" placeholder="Monto *" inputmode="decimal" min="0">
      <input id="tx-date" class="field" type="date" value="${today()}">
      <input id="tx-cat" class="field" type="text" placeholder="Categoría (ej: Artistas, Bar, Técnica)">
      <select id="tx-resp" class="field">
        <option value="">Sin responsable</option>
        ${['Jose','Juli Rabitti','Juli Bragio'].map(p=>`<option>${p}</option>`).join('')}
      </select>
      <textarea id="tx-notes" class="field" rows="2" placeholder="Notas (opcional)"></textarea>
      <button class="tap" onclick="saveTx()"
        style="background:${C.mint};border:none;border-radius:12px;padding:15px;color:#111;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">Guardar</button>
    </div>`);
}

function setTxType(t) {
  _txType = t;
  const i = document.getElementById('tx-in');
  const e = document.getElementById('tx-ex');
  if (t==='income') {
    i.style.cssText = `flex:1;background:#0b2b1a;border:2px solid ${C.mint};border-radius:12px;padding:12px;color:${C.mint};font-size:13px;font-weight:800;text-transform:uppercase;cursor:pointer;`;
    e.style.cssText = `flex:1;background:${C.card};border:2px solid transparent;border-radius:12px;padding:12px;color:${C.text2};font-size:13px;font-weight:800;text-transform:uppercase;cursor:pointer;`;
  } else {
    e.style.cssText = `flex:1;background:#2b0e0b;border:2px solid ${C.red};border-radius:12px;padding:12px;color:${C.red};font-size:13px;font-weight:800;text-transform:uppercase;cursor:pointer;`;
    i.style.cssText = `flex:1;background:${C.card};border:2px solid transparent;border-radius:12px;padding:12px;color:${C.text2};font-size:13px;font-weight:800;text-transform:uppercase;cursor:pointer;`;
  }
}

function saveTx() {
  const concept = document.getElementById('tx-concept').value.trim();
  const amount  = parseFloat(document.getElementById('tx-amount').value);
  const date    = document.getElementById('tx-date').value;
  if (!concept||!amount||!date) { toast('Completá los campos requeridos', C.red); return; }
  state.transactions.push({
    id:uid(), type:_txType, concept, amount, date,
    category: document.getElementById('tx-cat').value.trim()||'General',
    responsible: document.getElementById('tx-resp').value,
    notes: document.getElementById('tx-notes').value.trim(),
  });
  save(); closeModal();
  cajaYM = date.slice(0,7); renderCaja();
  toast('Movimiento guardado ✓');
}

function deleteTx(id) {
  state.transactions = state.transactions.filter(t=>t.id!==id);
  save(); closeModal(); renderCaja();
  toast('Eliminado', C.red);
}


// ═══════════════════════════════════════════════════════
//  BORDERAUX
// ═══════════════════════════════════════════════════════
function renderBorderaux() {
  if (!state.borderaux.length) {
    document.getElementById('borderaux-list').innerHTML =
      `<div style="text-align:center;color:#2e2e2e;padding:28px 0;font-size:14px;">Sin liquidaciones</div>`;
    return;
  }
  document.getElementById('borderaux-list').innerHTML =
    [...state.borderaux].sort((a,b)=>b.date.localeCompare(a.date)).map(b => {
      const paid = b.status==='paid';
      return `<div style="background:${C.card};border-radius:12px;padding:16px;margin-bottom:10px;border-left:3px solid ${paid?C.mint:C.teal};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px;">
          <div style="flex:1;">
            <p style="font-size:16px;font-weight:800;margin:0 0 3px;">${b.recipient}</p>
            <p style="font-size:12px;color:${C.text2};margin:0 0 2px;">${b.eventName} · ${fmtDate(b.date)}</p>
            <p style="font-size:12px;color:#555;margin:0;">${b.concept}</p>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <p style="font-size:20px;font-weight:900;margin:0;">${money(b.amount)}</p>
            ${b.type==='percent'?`<p style="font-size:10px;color:#555;margin:2px 0 0;">${b.percent}%</p>`:''}
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="tap" onclick="toggleBx('${b.id}')"
            style="flex:1;background:${paid?'#0b2b1a':C.card};border:none;border-radius:10px;padding:10px;color:${paid?C.mint:C.text2};font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">
            ${paid?'✓ Pagado':'Marcar pagado'}
          </button>
          <button class="tap" onclick="deleteBx('${b.id}')"
            style="background:${C.card};border:none;border-radius:10px;padding:10px 14px;color:${C.red};font-size:15px;">✕</button>
        </div>
      </div>`;
    }).join('');
}

function toggleBx(id) {
  const b = state.borderaux.find(x=>x.id===id); if (!b) return;
  b.status = b.status==='paid'?'pending':'paid';
  save(); renderBorderaux();
}
function deleteBx(id) {
  state.borderaux = state.borderaux.filter(b=>b.id!==id);
  save(); renderBorderaux(); toast('Eliminado', C.red);
}

let _bxType = 'fixed';

function openBxForm() {
  _bxType = 'fixed';
  const evOpts = state.events.map(e=>`<option value="${e.title}">${e.title} (${fmtDate(e.date)})</option>`).join('');
  openModal('Nueva Liquidación', `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <input id="bx-rcpt" class="field" type="text" placeholder="Destinatario *">
      <input id="bx-ev" class="field" type="text" placeholder="Evento / Show" list="bx-ev-list">
      <datalist id="bx-ev-list">${evOpts}</datalist>
      <input id="bx-concept" class="field" type="text" placeholder="Concepto (ej: Caché, Sonido)">
      <div style="display:flex;gap:8px;">
        <button id="bxt-fixed" onclick="setBxType('fixed')" class="tap"
          style="flex:1;background:#0d2a2a;border:2px solid ${C.teal};border-radius:12px;padding:12px;color:${C.teal};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">$ Fijo</button>
        <button id="bxt-pct" onclick="setBxType('percent')" class="tap"
          style="flex:1;background:${C.card};border:2px solid transparent;border-radius:12px;padding:12px;color:${C.text2};font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">% Porc.</button>
      </div>
      <input id="bx-amount" class="field" type="number" placeholder="Monto *" inputmode="decimal" min="0">
      <input id="bx-base" class="field" type="number" placeholder="Base de cálculo (si es %)" inputmode="decimal" style="display:none;">
      <input id="bx-date" class="field" type="date" value="${today()}">
      <button class="tap" onclick="saveBx()"
        style="background:${C.teal};border:none;border-radius:12px;padding:15px;color:#111;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">Guardar</button>
    </div>`);
}

function setBxType(t) {
  _bxType = t;
  const fBtn = document.getElementById('bxt-fixed');
  const pBtn = document.getElementById('bxt-pct');
  const base = document.getElementById('bx-base');
  if (t==='fixed') {
    fBtn.style.cssText = `flex:1;background:#0d2a2a;border:2px solid ${C.teal};border-radius:12px;padding:12px;color:${C.teal};font-size:13px;font-weight:800;text-transform:uppercase;cursor:pointer;`;
    pBtn.style.cssText = `flex:1;background:${C.card};border:2px solid transparent;border-radius:12px;padding:12px;color:${C.text2};font-size:13px;font-weight:800;text-transform:uppercase;cursor:pointer;`;
    base.style.display = 'none';
  } else {
    pBtn.style.cssText = `flex:1;background:#0d2a2a;border:2px solid ${C.teal};border-radius:12px;padding:12px;color:${C.teal};font-size:13px;font-weight:800;text-transform:uppercase;cursor:pointer;`;
    fBtn.style.cssText = `flex:1;background:${C.card};border:2px solid transparent;border-radius:12px;padding:12px;color:${C.text2};font-size:13px;font-weight:800;text-transform:uppercase;cursor:pointer;`;
    base.style.display = 'block';
  }
}

function saveBx() {
  const rcpt   = document.getElementById('bx-rcpt').value.trim();
  const amount = parseFloat(document.getElementById('bx-amount').value);
  if (!rcpt||!amount) { toast('Completá los campos requeridos', C.red); return; }
  let final = amount;
  if (_bxType==='percent') { const b=parseFloat(document.getElementById('bx-base').value); if(b) final=b*amount/100; }
  state.borderaux.push({
    id:uid(), recipient:rcpt,
    eventName: document.getElementById('bx-ev').value.trim()||'Sin evento',
    concept: document.getElementById('bx-concept').value.trim()||'General',
    type:_bxType, amount:final,
    percent: _bxType==='percent'?amount:null,
    date: document.getElementById('bx-date').value,
    status:'pending',
  });
  save(); closeModal(); renderBorderaux();
  toast('Liquidación creada ✓');
}


// ═══════════════════════════════════════════════════════
//  PEDIDOS
// ═══════════════════════════════════════════════════════
const PC = { high:C.red, medium:C.orange, low:C.mint };
let pedidosFilter = 'all';

function setPedidosFilter(f) {
  pedidosFilter = f;
  document.querySelectorAll('.filter-chip').forEach(btn => {
    const on = btn.dataset.pf === f;
    btn.style.background = on ? C.red : C.card;
    btn.style.color = on ? '#fff' : C.text2;
  });
  renderPedidos();
}

function renderPedidos() {
  let orders = [...state.orders];
  if (pedidosFilter !== 'all') orders = orders.filter(o=>o.status===pedidosFilter);
  if (!orders.length) {
    document.getElementById('pedidos-list').innerHTML =
      `<div style="text-align:center;color:#2e2e2e;padding:28px 0;font-size:14px;">Sin pedidos</div>`;
    return;
  }
  document.getElementById('pedidos-list').innerHTML = orders.map(o => {
    const c = PC[o.priority]||C.text2;
    const done = o.status==='received';
    return `<div style="background:${C.card};border-radius:12px;padding:16px;margin-bottom:10px;border-left:3px solid ${c};${done?'opacity:.5;':''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:12px;">
        <div style="flex:1;">
          <p style="font-size:16px;font-weight:800;margin:0 0 3px;${done?'text-decoration:line-through;':''}">${o.item}</p>
          <p style="font-size:12px;color:${C.text2};margin:0 0 2px;">x${o.quantity}${o.supplier?' · '+o.supplier:''}</p>
          ${o.responsible?`<p style="font-size:11px;color:#444;margin:0;">${o.responsible}</p>`:''}
        </div>
        <span class="badge" style="background:${c}22;color:${c};flex-shrink:0;">${o.priority}</span>
      </div>
      <div style="display:flex;gap:8px;">
        ${!done
          ?`<button class="tap" onclick="advancePedido('${o.id}')"
              style="flex:1;background:#222;border:none;border-radius:10px;padding:10px;color:#fff;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">
              ${o.status==='pending'?'→ En gestión':'✓ Recibido'}
            </button>`
          :`<div style="flex:1;background:#0b2b1a;border-radius:10px;padding:10px;color:${C.mint};font-size:12px;font-weight:800;text-transform:uppercase;text-align:center;letter-spacing:.5px;">✓ Recibido</div>`
        }
        <button class="tap" onclick="deletePedido('${o.id}')"
          style="background:#222;border:none;border-radius:10px;padding:10px 14px;color:${C.red};font-size:15px;">✕</button>
      </div>
    </div>`;
  }).join('');
}

function advancePedido(id) {
  const o = state.orders.find(x=>x.id===id); if (!o) return;
  o.status = {pending:'in-progress','in-progress':'received'}[o.status]||o.status;
  save(); renderPedidos();
}
function deletePedido(id) {
  state.orders = state.orders.filter(o=>o.id!==id);
  save(); renderPedidos(); toast('Pedido eliminado', C.red);
}

let _pPriority = 'low';

function openPedidoForm() {
  _pPriority = 'low';
  openModal('Nuevo Pedido', `
    <div style="display:flex;flex-direction:column;gap:12px;">
      <input id="po-item" class="field" type="text" placeholder="Ítem / Producto *">
      <div style="display:flex;gap:10px;">
        <input id="po-qty" class="field" type="text" placeholder="Cantidad" style="flex:1;">
        <input id="po-supplier" class="field" type="text" placeholder="Proveedor" style="flex:2;">
      </div>
      <div>
        <label style="font-size:10px;color:#444;display:block;margin-bottom:6px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Prioridad</label>
        <div style="display:flex;gap:8px;">
          <button id="pp-low" onclick="setPPriority('low')" class="tap"
            style="flex:1;background:#0b2b1a;border:2px solid ${C.mint};border-radius:10px;padding:10px;color:${C.mint};font-size:12px;font-weight:800;text-transform:uppercase;">Baja</button>
          <button id="pp-medium" onclick="setPPriority('medium')" class="tap"
            style="flex:1;background:${C.card};border:2px solid transparent;border-radius:10px;padding:10px;color:${C.text2};font-size:12px;font-weight:800;text-transform:uppercase;">Media</button>
          <button id="pp-high" onclick="setPPriority('high')" class="tap"
            style="flex:1;background:${C.card};border:2px solid transparent;border-radius:10px;padding:10px;color:${C.text2};font-size:12px;font-weight:800;text-transform:uppercase;">Alta</button>
        </div>
      </div>
      <select id="po-resp" class="field">
        <option value="">Sin responsable</option>
        ${['Jose','Juli Rabitti','Juli Bragio'].map(p=>`<option>${p}</option>`).join('')}
      </select>
      <textarea id="po-notes" class="field" rows="2" placeholder="Notas (opcional)"></textarea>
      <button class="tap" onclick="savePedido()"
        style="background:${C.red};border:none;border-radius:12px;padding:15px;color:#fff;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">Guardar</button>
    </div>`);
}

function setPPriority(p) {
  _pPriority = p;
  const bg = { low:'#0b2b1a', medium:'#2a1a08', high:'#2b0e0b' };
  ['low','medium','high'].forEach(pr => {
    const btn = document.getElementById('pp-'+pr); if (!btn) return;
    const on = pr===p;
    btn.style.background = on ? bg[pr] : C.card;
    btn.style.borderColor = on ? PC[pr] : 'transparent';
    btn.style.color = on ? PC[pr] : C.text2;
  });
}

function savePedido() {
  const item = document.getElementById('po-item').value.trim();
  if (!item) { toast('Ingresá el ítem', C.red); return; }
  state.orders.push({
    id:uid(), item,
    quantity: document.getElementById('po-qty').value.trim()||'1',
    supplier: document.getElementById('po-supplier').value.trim(),
    priority: _pPriority,
    responsible: document.getElementById('po-resp').value,
    notes: document.getElementById('po-notes').value.trim(),
    status:'pending',
  });
  save(); closeModal(); renderPedidos(); toast('Pedido guardado ✓');
}


// ═══════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════
let adminTab = 'tasks';

function setAdminTab(t) {
  adminTab = t;
  document.getElementById('admin-tasks-pane').style.display = t==='tasks'?'block':'none';
  document.getElementById('admin-contacts-pane').style.display = t==='contacts'?'block':'none';
  const tBtn = document.getElementById('tab-tasks');
  const cBtn = document.getElementById('tab-contacts');
  tBtn.style.background = t==='tasks' ? C.orange : 'transparent';
  tBtn.style.color = t==='tasks' ? '#fff' : C.text2;
  cBtn.style.background = t==='contacts' ? C.orange : 'transparent';
  cBtn.style.color = t==='contacts' ? '#fff' : C.text2;
  t==='tasks' ? renderTasks() : renderContacts();
}
function renderAdmin() { setAdminTab(adminTab); }

function renderTasks() {
  const pending = state.tasks.filter(t=>!t.done);
  const done    = state.tasks.filter(t=>t.done);
  if (!state.tasks.length) {
    document.getElementById('admin-tasks-pane').innerHTML =
      `<div style="text-align:center;color:#2e2e2e;padding:28px 0;font-size:14px;">Sin tareas</div>`;
    return;
  }
  const taskCard = t => {
    const overdue = t.dueDate && !t.done && t.dueDate < today();
    return `<div style="background:${C.card};border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">
      <button onclick="toggleTask('${t.id}')" class="tap"
        style="width:26px;height:26px;border-radius:50%;border:2.5px solid ${t.done?C.mint:'#3a3a3a'};background:${t.done?C.mint:'transparent'};flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:14px;color:#111;">
        ${t.done?'✓':''}
      </button>
      <div style="flex:1;">
        <p style="font-size:15px;font-weight:${t.done?400:700};margin:0;${t.done?'text-decoration:line-through;color:#444;':''}">${t.title}</p>
        ${t.dueDate&&!t.done?`<p style="font-size:11px;color:${overdue?C.red:C.text2};margin:2px 0 0;font-weight:700;">${overdue?'Vencida: ':'Vence: '}${fmtDate(t.dueDate)}</p>`:''}
        ${t.notes?`<p style="font-size:11px;color:#444;margin:2px 0 0;">${t.notes}</p>`:''}
      </div>
      <button onclick="deleteTask('${t.id}')" class="tap" style="background:none;border:none;color:#3a3a3a;font-size:18px;padding:4px;">✕</button>
    </div>`;
  };
  let html = '';
  if (pending.length) html += `<div class="sec-label">Pendientes (${pending.length})</div>` + pending.map(taskCard).join('');
  if (done.length) html += `<div class="sec-label">Completadas (${done.length})</div>` + done.map(taskCard).join('');
  document.getElementById('admin-tasks-pane').innerHTML = html;
}

function toggleTask(id) {
  const t = state.tasks.find(x=>x.id===id); if (!t) return;
  t.done = !t.done; save(); renderTasks();
}
function deleteTask(id) {
  state.tasks = state.tasks.filter(t=>t.id!==id); save(); renderTasks();
}

function renderContacts() {
  if (!state.contacts.length) {
    document.getElementById('admin-contacts-pane').innerHTML =
      `<div style="text-align:center;color:#2e2e2e;padding:28px 0;font-size:14px;">Sin contactos</div>`;
    return;
  }
  document.getElementById('admin-contacts-pane').innerHTML =
    [...state.contacts].sort((a,b)=>a.name.localeCompare(b.name)).map(c => `
      <div onclick="contactDetail('${c.id}')"
        style="background:${C.card};border-radius:12px;padding:14px 16px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer;">
        <div style="width:42px;height:42px;border-radius:50%;background:${C.orange};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;flex-shrink:0;font-family:'Barlow Condensed',sans-serif;">
          ${c.name.charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;">
          <p style="font-size:15px;font-weight:700;margin:0;">${c.name}</p>
          <p style="font-size:12px;color:${C.text2};margin:2px 0 0;">${c.category||'Sin categoría'}${c.phone?' · '+c.phone:''}</p>
        </div>
        ${c.phone?`<a href="tel:${c.phone}" onclick="event.stopPropagation()"
          style="background:#0b2b1a;border-radius:8px;padding:7px 12px;color:${C.mint};font-size:12px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:.5px;">Llamar</a>`:''}
      </div>`).join('');
}

function contactDetail(id) {
  const c = state.contacts.find(x=>x.id===id); if (!c) return;
  openModal('Contacto', `
    <div style="text-align:center;padding:14px 0 18px;">
      <div style="width:64px;height:64px;border-radius:50%;background:${C.orange};display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;margin:0 auto 10px;font-family:'Barlow Condensed',sans-serif;">
        ${c.name.charAt(0).toUpperCase()}
      </div>
      <p style="font-size:22px;font-weight:800;margin:0;">${c.name}</p>
      <p style="color:${C.text2};margin:4px 0 0;">${c.category||''}</p>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:18px;">
      ${c.phone?`<a href="tel:${c.phone}"
        style="display:block;background:#0b2b1a;border-radius:12px;padding:14px;color:${C.mint};font-size:15px;font-weight:800;text-align:center;text-decoration:none;text-transform:uppercase;letter-spacing:.5px;">📞 ${c.phone}</a>`:''}
      ${c.notes?infoRow('Notas',c.notes):''}
    </div>
    <button class="tap" onclick="deleteContact('${id}')"
      style="width:100%;background:#2b0e0b;border:none;border-radius:12px;padding:14px;color:${C.red};font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">Eliminar contacto</button>`);
}

function deleteContact(id) {
  state.contacts = state.contacts.filter(c=>c.id!==id);
  save(); closeModal(); renderContacts(); toast('Contacto eliminado', C.red);
}

function openAdminForm() {
  if (adminTab==='tasks') {
    openModal('Nueva Tarea', `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <input id="ta-title" class="field" type="text" placeholder="Tarea *">
        <div>
          <label style="font-size:10px;color:#444;display:block;margin-bottom:5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Fecha límite (opcional)</label>
          <input id="ta-due" class="field" type="date">
        </div>
        <textarea id="ta-notes" class="field" rows="2" placeholder="Notas (opcional)"></textarea>
        <button class="tap" onclick="saveTask()"
          style="background:${C.orange};border:none;border-radius:12px;padding:15px;color:#fff;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">Guardar</button>
      </div>`);
  } else {
    openModal('Nuevo Contacto', `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <input id="co-name" class="field" type="text" placeholder="Nombre *">
        <input id="co-phone" class="field" type="tel" placeholder="Teléfono" inputmode="tel">
        <input id="co-cat" class="field" type="text" placeholder="Categoría (ej: Artista, Técnico, Proveedor)">
        <textarea id="co-notes" class="field" rows="2" placeholder="Notas (opcional)"></textarea>
        <button class="tap" onclick="saveContact()"
          style="background:${C.orange};border:none;border-radius:12px;padding:15px;color:#fff;font-size:15px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;">Guardar</button>
      </div>`);
  }
}

function saveTask() {
  const title = document.getElementById('ta-title').value.trim();
  if (!title) { toast('Ingresá la tarea', C.red); return; }
  state.tasks.push({ id:uid(), title, dueDate:document.getElementById('ta-due').value, notes:document.getElementById('ta-notes').value.trim(), done:false });
  save(); closeModal(); renderTasks(); toast('Tarea guardada ✓');
}

function saveContact() {
  const name = document.getElementById('co-name').value.trim();
  if (!name) { toast('Ingresá el nombre', C.red); return; }
  state.contacts.push({ id:uid(), name, phone:document.getElementById('co-phone').value.trim(), category:document.getElementById('co-cat').value.trim(), notes:document.getElementById('co-notes').value.trim() });
  save(); closeModal(); renderContacts(); toast('Contacto guardado ✓');
}


// ═══════════════════════════════════════════════════════
//  EVENTOS SEMILLA (WhatsApp — temporada 2026)
// ═══════════════════════════════════════════════════════
const SEED_EVENTS = [
  // ENERO
  {d:'2026-01-02',t:'Reservado'},{d:'2026-01-03',t:'Reservado'},
  {d:'2026-01-07',t:'Reservado'},{d:'2026-01-09',t:'Reservado'},
  {d:'2026-01-10',t:'Reservado'},{d:'2026-01-11',t:'Reservado'},
  {d:'2026-01-14',t:'Reservado'},{d:'2026-01-15',t:'Reservado'},
  {d:'2026-01-16',t:'Reservado'},{d:'2026-01-17',t:'Entusiasta'},
  {d:'2026-01-21',t:'La Ñata'},{d:'2026-01-23',t:'Reservado'},
  {d:'2026-01-24',t:'Logan'},{d:'2026-01-25',t:'Reservado'},
  {d:'2026-01-28',t:'Reservado'},{d:'2026-01-29',t:'Reservado'},
  {d:'2026-01-30',t:'Manu María'},{d:'2026-01-31',t:'Cumple Oli'},
  // FEBRERO
  {d:'2026-02-04',t:'Reservado'},{d:'2026-02-05',t:'Reservado'},
  {d:'2026-02-06',t:'Nico'},{d:'2026-02-07',t:'Apolónica'},
  {d:'2026-02-11',t:'Milonga'},{d:'2026-02-12',t:'Reservado'},
  {d:'2026-02-13',t:'Reservado'},{d:'2026-02-14',t:'Finde Carnaval'},
  {d:'2026-02-18',t:'Garúa'},{d:'2026-02-19',t:'Abuelos y Abuelas'},
  {d:'2026-02-20',t:'Reservado'},{d:'2026-02-21',t:'Eutanasia'},
  {d:'2026-02-22',t:'Reservado'},{d:'2026-02-25',t:'Milonga'},
  {d:'2026-02-26',t:'Mondo'},{d:'2026-02-27',t:'Peña'},
  {d:'2026-02-28',t:'Cumple Jose'},
  // MARZO
  {d:'2026-03-06',t:'Reservado'},{d:'2026-03-07',t:'PeCuiz'},
  {d:'2026-03-08',t:'Día de la Mujer'},
  {d:'2026-03-11',t:'Visita Ingresantes Arte'},{d:'2026-03-11',t:'Milonga'},
  {d:'2026-03-13',t:'Lucía'},{d:'2026-03-14',t:'Lucía'},
  {d:'2026-03-18',t:'Reservado'},{d:'2026-03-20',t:'Juan Olano'},
  {d:'2026-03-21',t:'Próspero'},{d:'2026-03-22',t:'Pañuelos — Casa Violeta'},
  {d:'2026-03-24',t:'Día de la Memoria'},{d:'2026-03-25',t:'Milonga'},
  {d:'2026-03-27',t:'El Síndrome'},{d:'2026-03-28',t:'Faca + Banda de Tres Arroyos'},
  {d:'2026-03-29',t:'Presentación Libro Javi'},
  // ABRIL
  {d:'2026-04-02',t:'Semana Santa'},{d:'2026-04-03',t:'Semana Santa'},
  {d:'2026-04-04',t:'Semana Santa'},{d:'2026-04-07',t:'Milonga'},
  {d:'2026-04-10',t:'Varieté — Osqui'},{d:'2026-04-11',t:'Hardcore — Valentina'},
  {d:'2026-04-12',t:'Negro Aguirre'},{d:'2026-04-17',t:'Lara'},
  {d:'2026-04-18',t:'Varieté — Memo'},{d:'2026-04-22',t:'Milonga'},
  {d:'2026-04-24',t:'Lauta Sotto'},{d:'2026-04-25',t:'Mato'},
  // MAYO
  {d:'2026-05-01',t:'Palo Santo'},{d:'2026-05-02',t:'Reservado'},
  {d:'2026-05-03',t:'La Ñata'},{d:'2026-05-06',t:'Milonga'},
  {d:'2026-05-08',t:'Luciana Jury'},{d:'2026-05-09',t:'Contrastes'},
  {d:'2026-05-10',t:'Posible Proyección',s:'tentativo'},
  {d:'2026-05-15',t:'César González'},{d:'2026-05-16',t:'V4 — Luciano'},
  {d:'2026-05-17',t:'Reservado'},{d:'2026-05-20',t:'Milonga'},
  {d:'2026-05-22',t:'Las Carelli'},{d:'2026-05-23',t:'Sofía Viola'},
  {d:'2026-05-24',t:'Marcos Abe + Ligas Menores'},
  {d:'2026-05-25',t:'Peña Lu — Mediodía'},
  {d:'2026-05-29',t:'Lucía'},{d:'2026-05-30',t:'Lucía'},{d:'2026-05-31',t:'Lucía'},
  // JUNIO
  {d:'2026-06-03',t:'Milonga'},{d:'2026-06-05',t:'El Viento de los Locos / Coie'},
  {d:'2026-06-06',t:'Zaino + Benito Malacalza'},{d:'2026-06-12',t:'Caverna'},
  {d:'2026-06-13',t:'Fruta'},{d:'2026-06-17',t:'Milonga'},
  {d:'2026-06-19',t:'Obra — Paulina'},{d:'2026-06-20',t:'Clara Bertolini'},
  {d:'2026-06-21',t:'Obra — Paulina'},{d:'2026-06-26',t:'Contrastes'},
  {d:'2026-06-27',t:'Pimienta Negra'},
  // JULIO
  {d:'2026-07-01',t:'Milonga'},{d:'2026-07-03',t:'Leandro Dadassio'},
  {d:'2026-07-04',t:'Abi González'},{d:'2026-07-09',t:'Peña — Mediodía'},
  {d:'2026-07-10',t:'NAda'},{d:'2026-07-11',t:'Hidromedusa'},
  {d:'2026-07-15',t:'Milonga'},{d:'2026-07-17',t:'Libre',s:'tentativo'},
  {d:'2026-07-18',t:'Bombonclat'},
  {d:'2026-07-24',t:'¿Cerramos?',s:'tentativo'},{d:'2026-07-25',t:'¿Cerramos?',s:'tentativo'},
  {d:'2026-07-27',t:'San Perico'},{d:'2026-07-28',t:'San Perico'},
  {d:'2026-07-29',t:'San Perico + Milonga'},{d:'2026-07-31',t:'Reservado'},
  // AGOSTO
  {d:'2026-08-01',t:'Reservado'},{d:'2026-08-07',t:'Reservado'},
  {d:'2026-08-08',t:'Reservado'},{d:'2026-08-14',t:'Reservado'},
  {d:'2026-08-15',t:'Reservado'},{d:'2026-08-21',t:'Reservado'},
  {d:'2026-08-22',t:'Reservado'},{d:'2026-08-28',t:'Reservado'},
  {d:'2026-08-29',t:'Reservado'},
  // SEPTIEMBRE
  {d:'2026-09-04',t:'Reservado'},{d:'2026-09-05',t:'Reservado'},
  {d:'2026-09-11',t:'Reservado'},{d:'2026-09-12',t:'Polonica'},
  {d:'2026-09-18',t:'Reservado'},{d:'2026-09-19',t:'Reservado'},
  {d:'2026-09-25',t:'Reservado'},{d:'2026-09-26',t:'Reservado'},
].map((e,i) => ({
  id: 'seed_'+i, title: e.t, date: e.d,
  status: e.s||'confirmado', time:'', responsible:'', notes:''
}));


// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-item').forEach(btn =>
    btn.addEventListener('click', () => navigate(btn.dataset.view))
  );

  document.getElementById('btn-add-event').addEventListener('click', () => openEvForm(''));
  document.getElementById('btn-add-tx').addEventListener('click', openTxForm);
  document.getElementById('btn-add-bx').addEventListener('click', openBxForm);
  document.getElementById('btn-add-pedido').addEventListener('click', openPedidoForm);
  document.getElementById('btn-add-admin').addEventListener('click', openAdminForm);

  document.getElementById('btn-prev-month').addEventListener('click', () => {
    gMonth--; if (gMonth<0) { gMonth=11; gYear--; } gSelected=null; renderGrilla();
  });
  document.getElementById('btn-next-month').addEventListener('click', () => {
    gMonth++; if (gMonth>11) { gMonth=0; gYear++; } gSelected=null; renderGrilla();
  });

  document.getElementById('btn-export').addEventListener('click', exportGrilla);
  document.getElementById('caja-month-sel').addEventListener('change', e => {
    cajaYM = e.target.value; renderCaja();
  });

  navigate('grilla');

  // ── Sync en tiempo real con Firebase ───────────────────
  if (_dbRef) {
    let _appReady = false;
    setTimeout(() => { _appReady = true; }, 300);

    _dbRef.on('value', snap => {
      const data = snap.val();
      if (data) {
        state = fixArrays({ ...defaultState(), ...data });
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
        if (_appReady) renderCurrentView();
      } else {
        // Firebase vacío → sembrar eventos y sincronizar
        state.events = SEED_EVENTS;
        save();
        renderCurrentView();
      }
    });

    // Indicador de conexión online/offline
    _db.ref('.info/connected').on('value', snap => {
      if (snap.val() === false) showSync('error');
    });
  } else {
    // Sin Firebase → sembrar localmente si no hay datos
    if (state.events.length === 0) {
      state.events = SEED_EVENTS;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
      renderCurrentView();
    }
  }
});
