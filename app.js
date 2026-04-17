// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════
const S = {
  items: [],
  outfits: {},       // { 'YYYY-MM-DD': [id,...] }
  view: 'closet',    // 'closet' | 'calendar'
  filter: 'all',
  calDate: new Date(),
  detailId: null,
  ootdDate: null,
  ootdPicked: new Set(),
  imgDataUrl: null,
  imgBlob: null,
  formCat: '',
};

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE
// ═══════════════════════════════════════════════════════════════
function persist() {
  try {
    localStorage.setItem('wrd_items', JSON.stringify(S.items));
    localStorage.setItem('wrd_outfits', JSON.stringify(S.outfits));
  } catch { toast('Storage full'); }
}

function hydrate() {
  try {
    const i = localStorage.getItem('wrd_items');
    const o = localStorage.getItem('wrd_outfits');
    if (i) S.items = JSON.parse(i);
    if (o) S.outfits = JSON.parse(o);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
const fmtDate = s => s ? new Date(s + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtPrice = v => (v !== '' && v != null && v !== undefined) ? `$${Number(v).toFixed(2)}` : '—';

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2400);
}

function blobToDataUrl(blob) {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.readAsDataURL(blob);
  });
}

// ═══════════════════════════════════════════════════════════════
// SHEET HELPERS
// ═══════════════════════════════════════════════════════════════
function openSheet(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSheet(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

['ov-add', 'ov-detail', 'ov-ootd'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target === e.currentTarget) closeSheet(id);
  });
});
document.getElementById('add-close').addEventListener('click', () => closeSheet('ov-add'));
document.getElementById('detail-close').addEventListener('click', () => closeSheet('ov-detail'));
document.getElementById('ootd-close').addEventListener('click', () => closeSheet('ov-ootd'));

// ═══════════════════════════════════════════════════════════════
// RENDER CLOSET
// ═══════════════════════════════════════════════════════════════
function renderCloset() {
  const filtered = S.filter === 'all' ? S.items : S.items.filter(i => i.category === S.filter);
  const grid = document.getElementById('closet-grid');
  const empty = document.getElementById('empty-state');

  document.getElementById('header-count').textContent =
    `${S.items.length} item${S.items.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  grid.style.display = 'grid';
  empty.style.display = 'none';

  grid.innerHTML = filtered.map(item => `
    <div class="item-card" data-id="${item.id}">
      <div class="item-card-img-wrap">
        ${item.image
          ? `<img class="item-card-img" src="${item.image}" alt="${item.name}" loading="lazy">`
          : `<div class="item-card-img-placeholder">
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3">
                 <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H5v10a2 2 0 002 2h10a2 2 0 002-2V10h1.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/>
               </svg>
             </div>`
        }
      </div>
      <span class="item-cat-badge">${cap(item.category)}</span>
      <div class="item-card-info">
        <div class="item-card-name">${item.name || 'Unnamed'}</div>
        <div class="item-card-sub">${item.brand || ''}</div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.item-card').forEach(c =>
    c.addEventListener('click', () => openDetail(c.dataset.id))
  );
}

// ═══════════════════════════════════════════════════════════════
// DETAIL SHEET
// ═══════════════════════════════════════════════════════════════
function openDetail(id) {
  const item = S.items.find(i => i.id === id);
  if (!item) return;
  S.detailId = id;

  document.getElementById('detail-title').textContent = item.name || 'Item Details';

  const wrap = document.getElementById('detail-img-wrap');
  wrap.innerHTML = item.image
    ? `<img class="detail-img" src="${item.image}" alt="${item.name}">`
    : `<div class="detail-img-placeholder">
         <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" opacity="0.25">
           <path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H5v10a2 2 0 002 2h10a2 2 0 002-2V10h1.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/>
         </svg>
       </div>`;

  const mv = (elId, val) => {
    const el = document.getElementById(elId);
    el.textContent = val;
    el.className = 'meta-val' + (val === '—' ? ' empty' : '');
  };

  mv('d-brand', item.brand || '—');
  mv('d-cat', cap(item.category));
  mv('d-price', fmtPrice(item.price));
  mv('d-pdate', fmtDate(item.purchaseDate));
  mv('d-washed', fmtDate(item.lastWashed));
  mv('d-notes', item.notes || '—');

  openSheet('ov-detail');
}

document.getElementById('del-item').addEventListener('click', () => {
  if (!S.detailId) return;
  S.items = S.items.filter(i => i.id !== S.detailId);
  Object.keys(S.outfits).forEach(k => {
    S.outfits[k] = S.outfits[k].filter(id => id !== S.detailId);
    if (!S.outfits[k].length) delete S.outfits[k];
  });
  persist();
  renderCloset();
  if (S.view === 'calendar') renderCalendar();
  closeSheet('ov-detail');
  toast('Item deleted');
});

// ═══════════════════════════════════════════════════════════════
// CATEGORY FILTER
// ═══════════════════════════════════════════════════════════════
document.getElementById('cat-bar').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  document.querySelectorAll('#cat-bar .pill').forEach(p => p.classList.remove('active'));
  pill.classList.add('active');
  S.filter = pill.dataset.cat;
  renderCloset();
});

// ═══════════════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════════════
function setView(v) {
  S.view = v;
  const isCloset = v === 'closet';
  document.getElementById('view-closet').style.display = isCloset ? 'block' : 'none';
  document.getElementById('view-calendar').style.display = isCloset ? 'none' : 'block';
  document.getElementById('nav-closet').classList.toggle('active', isCloset);
  document.getElementById('nav-cal').classList.toggle('active', !isCloset);
  document.getElementById('cat-bar').style.display = isCloset ? 'flex' : 'none';

  requestAnimationFrame(() => {
    const h = document.getElementById('header').getBoundingClientRect().height;
    document.getElementById('main').style.paddingTop = (h + 10) + 'px';
  });

  if (!isCloset) renderCalendar();
}

document.getElementById('nav-closet').addEventListener('click', () => setView('closet'));
document.getElementById('nav-cal').addEventListener('click', () => setView('calendar'));

// ═══════════════════════════════════════════════════════════════
// ADD SHEET
// ═══════════════════════════════════════════════════════════════
document.getElementById('nav-add').addEventListener('click', () => {
  resetAddForm();
  openSheet('ov-add');
});

function resetAddForm() {
  S.imgDataUrl = null; S.imgBlob = null; S.formCat = '';
  ['i-name', 'i-brand', 'i-price', 'i-pdate', 'i-washed', 'i-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.querySelectorAll('#form-cats .cat-pill').forEach(p => p.classList.remove('on'));
  const area = document.getElementById('upload-area');
  const img = area.querySelector('img');
  if (img) img.remove();
  document.getElementById('upload-hint').style.display = 'flex';
  document.getElementById('rm-bg-btn').style.display = 'none';
  document.getElementById('proc-overlay').style.display = 'none';
  document.getElementById('bg-note').textContent = '';
}

// Form category pills
document.getElementById('form-cats').addEventListener('click', e => {
  const p = e.target.closest('.cat-pill');
  if (!p) return;
  document.querySelectorAll('#form-cats .cat-pill').forEach(x => x.classList.remove('on'));
  p.classList.add('on');
  S.formCat = p.dataset.cat;
});

// ── Image Upload ──────────────────────────────────────────────
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');

uploadArea.addEventListener('click', e => {
  if (e.target.closest('.proc-overlay')) return;
  fileInput.click();
});

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
  fileInput.value = '';
});

uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.style.borderColor = 'var(--accent)';
});
uploadArea.addEventListener('dragleave', () => {
  uploadArea.style.borderColor = '';
});
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.style.borderColor = '';
  const f = e.dataTransfer.files[0];
  if (f?.type.startsWith('image/')) handleFile(f);
});

document.addEventListener('paste', e => {
  if (!document.getElementById('ov-add').classList.contains('open')) return;
  const imgItem = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
  if (imgItem) handleFile(imgItem.getAsFile());
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = ev => {
    S.imgDataUrl = ev.target.result;
    S.imgBlob = file;
    setPreview(S.imgDataUrl);
    document.getElementById('rm-bg-btn').style.display = 'flex';
  };
  reader.readAsDataURL(file);
}

function setPreview(url) {
  document.getElementById('upload-hint').style.display = 'none';
  let img = uploadArea.querySelector('img');
  if (!img) { img = document.createElement('img'); uploadArea.appendChild(img); }
  img.src = url;
  img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;z-index:1';
}

// ── Background Removal ────────────────────────────────────────
let bgLib = null;
async function getBgLib() {
  if (bgLib) return bgLib;
  const m = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/background-removal.js');
  bgLib = m.removeBackground;
  return bgLib;
}

document.getElementById('rm-bg-btn').addEventListener('click', async () => {
  if (!S.imgBlob) return;
  const btn = document.getElementById('rm-bg-btn');
  const proc = document.getElementById('proc-overlay');
  const label = document.getElementById('proc-label');
  const bar = document.getElementById('prog-bar');
  const note = document.getElementById('bg-note');

  btn.disabled = true;
  proc.style.display = 'flex';
  label.textContent = 'Loading AI model…';
  note.textContent = 'First load downloads ~10MB of model data';
  bar.style.width = '0%';

  try {
    const removeBackground = await getBgLib();
    label.textContent = 'Removing background…';
    note.textContent = '';

    const result = await removeBackground(S.imgBlob, {
      publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.5/dist/',
      progress: (key, cur, total) => {
        if (total > 0) bar.style.width = Math.round((cur / total) * 100) + '%';
      },
    });

    S.imgDataUrl = await blobToDataUrl(result);
    S.imgBlob = result;
    setPreview(S.imgDataUrl);
    proc.style.display = 'none';
    note.textContent = '✓ Background removed';
    toast('Background removed!');
  } catch (err) {
    console.error(err);
    proc.style.display = 'none';
    note.textContent = 'Could not remove background – try another image';
    toast('Background removal failed');
  }
  btn.disabled = false;
});

// ── Save Item ─────────────────────────────────────────────────
document.getElementById('save-item').addEventListener('click', () => {
  const name = document.getElementById('i-name').value.trim();
  if (!name) { toast('Please enter a name'); document.getElementById('i-name').focus(); return; }
  if (!S.formCat) { toast('Please select a category'); return; }

  S.items.unshift({
    id: uid(),
    name,
    category: S.formCat,
    brand: document.getElementById('i-brand').value.trim(),
    price: document.getElementById('i-price').value,
    purchaseDate: document.getElementById('i-pdate').value,
    lastWashed: document.getElementById('i-washed').value,
    notes: document.getElementById('i-notes').value.trim(),
    image: S.imgDataUrl,
    added: new Date().toISOString(),
  });

  persist();
  renderCloset();
  closeSheet('ov-add');
  toast('Item added to closet!');
});

// ═══════════════════════════════════════════════════════════════
// CALENDAR
// ═══════════════════════════════════════════════════════════════
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function renderCalendar() {
  const d = S.calDate;
  const yr = d.getFullYear(), mo = d.getMonth();
  document.getElementById('cal-month').textContent = `${MONTHS[mo]} ${yr}`;

  const firstWd = new Date(yr, mo, 1).getDay();
  const days = new Date(yr, mo + 1, 0).getDate();
  const today = new Date();
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  for (let i = 0; i < firstWd; i++) {
    const e = document.createElement('div');
    e.className = 'cal-day empty';
    grid.appendChild(e);
  }

  for (let day = 1; day <= days; day++) {
    const key = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = today.getFullYear() === yr && today.getMonth() === mo && today.getDate() === day;
    const outfit = S.outfits[key];

    const el = document.createElement('div');
    el.className = 'cal-day' + (isToday ? ' today' : '');
    el.dataset.date = key;

    let thumb = '';
    if (outfit?.length) {
      const first = S.items.find(i => i.id === outfit[0]);
      if (first?.image) thumb = `<img class="day-thumb" src="${first.image}" alt="">`;
    }

    el.innerHTML = `<div class="day-num">${day}</div>${thumb}`;
    el.addEventListener('click', () => openOotd(key));
    grid.appendChild(el);
  }
}

document.getElementById('cal-prev').addEventListener('click', () => {
  const d = S.calDate;
  S.calDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
  const d = S.calDate;
  S.calDate = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  renderCalendar();
});

// ═══════════════════════════════════════════════════════════════
// OOTD SHEET
// ═══════════════════════════════════════════════════════════════
function openOotd(key) {
  S.ootdDate = key;
  S.ootdPicked = new Set(S.outfits[key] || []);

  const [yr, mo, dy] = key.split('-').map(Number);
  const d = new Date(yr, mo - 1, dy);
  document.getElementById('ootd-date-lbl').textContent = d.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  renderOotd();
  openSheet('ov-ootd');
}

function renderOotd() {
  const og = document.getElementById('ootd-outfit');
  const picked = [...S.ootdPicked].map(id => S.items.find(i => i.id === id)).filter(Boolean);

  og.innerHTML = picked.length
    ? picked.map(item => `
        <div class="ootd-item">
          ${item.image ? `<img src="${item.image}" alt="${item.name}">` : ''}
          <button class="ootd-rm" data-id="${item.id}">×</button>
        </div>
      `).join('')
    : `<div style="grid-column:1/-1;color:var(--text-3);font-size:13px;padding:8px 0">No items yet — pick from below</div>`;

  og.querySelectorAll('.ootd-rm').forEach(b =>
    b.addEventListener('click', () => { S.ootdPicked.delete(b.dataset.id); renderOotd(); })
  );

  const cg = document.getElementById('ootd-closet');
  cg.innerHTML = S.items.length
    ? S.items.map(item => `
        <div class="ootd-pick ${S.ootdPicked.has(item.id) ? 'on' : ''}" data-id="${item.id}">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" loading="lazy">` : ''}
        </div>
      `).join('')
    : `<div style="grid-column:1/-1;color:var(--text-3);font-size:13px;padding:8px 0">Add items to your closet first</div>`;

  cg.querySelectorAll('.ootd-pick').forEach(el =>
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      S.ootdPicked.has(id) ? S.ootdPicked.delete(id) : S.ootdPicked.add(id);
      renderOotd();
    })
  );
}

document.getElementById('save-ootd').addEventListener('click', () => {
  if (!S.ootdDate) return;
  const ids = [...S.ootdPicked];
  if (ids.length) S.outfits[S.ootdDate] = ids;
  else delete S.outfits[S.ootdDate];
  persist();
  renderCalendar();
  closeSheet('ov-ootd');
  toast(ids.length ? 'Outfit saved!' : 'Outfit cleared');
});

// ═══════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════
hydrate();
renderCloset();

requestAnimationFrame(() => {
  const h = document.getElementById('header').getBoundingClientRect().height;
  document.getElementById('main').style.paddingTop = (h + 10) + 'px';
});
