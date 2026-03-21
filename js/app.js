// app.js — HabiTrax main application logic

// ── State ──────────────────────────────────────────────
let data = { habits: [], log: {} };   // OneDrive data model
let viewDate = todayStr();            // currently viewed date (ISO string)
let currentView = 'today';            // 'today' | 'manage'
let isOnline = navigator.onLine;
let isSaving = false;
let editingHabitId = null;            // null = adding new, string = editing existing

// ── Utility ────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function dateStr(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(isoStr, n) {
  const d = new Date(isoStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

function formatDateLabel(isoStr) {
  const today = todayStr();
  const yesterday = addDays(today, -1);
  const d = new Date(isoStr + 'T00:00:00');
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthDay = `${months[d.getMonth()]} ${d.getDate()}`;
  if (isoStr === today)     return { main: `Today · ${monthDay}`,     sub: days[d.getDay()] };
  if (isoStr === yesterday) return { main: `Yesterday · ${monthDay}`, sub: days[d.getDay()] };
  return { main: `${days[d.getDay()]} · ${monthDay}`, sub: isoStr };
}

function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── Pressure logic ──────────────────────────────────────
function daysSinceLastDone(habitId, upToDate) {
  for (let i = 1; i <= 366; i++) {
    const ds = addDays(upToDate, -i);
    if (data.log[ds] && data.log[ds][habitId] === true) return i;
  }
  return 999;
}

function pressureState(habitId, forDate) {
  const habit = data.habits.find(h => h.id === habitId);
  if (!habit) return 'neutral';
  const dayLog = data.log[forDate] || {};
  if (dayLog[habitId] === true) return 'done';
  const days = daysSinceLastDone(habitId, forDate);
  if (days >= habit.pressureDays) return 'red';
  if (days >= Math.round(habit.pressureDays / 2)) return 'yellow';
  return 'neutral';
}

// ── Rendering ───────────────────────────────────────────
function renderTodayView() {
  const today = todayStr();
  const isToday = viewDate === today;
  const fmt = formatDateLabel(viewDate);
  const dayLog = data.log[viewDate] || {};

  document.getElementById('date-main').textContent = fmt.main;
  document.getElementById('date-sub').textContent = fmt.sub;
  document.getElementById('btn-next').disabled = isToday;

  const backBar = document.getElementById('back-today-bar');
  if (isToday) backBar.classList.remove('visible');
  else          backBar.classList.add('visible');

  // Score
  const total = data.habits.length;
  const done  = data.habits.filter(h => dayLog[h.id] === true).length;
  document.getElementById('score-display').innerHTML = `${done} <span>/ ${total}</span>`;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const fill = document.getElementById('score-bar');
  fill.style.width = pct + '%';
  fill.style.background = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--yellow)' : 'var(--red)';

  // Habit rows — preserve user-defined order
  const sorted = [...data.habits].sort((a, b) => a.order - b.order);

  const list = document.getElementById('habit-list');
  list.innerHTML = '';
  sorted.forEach(h => {
    const isDone = dayLog[h.id] === true;
    const state  = pressureState(h.id, viewDate);
    const days   = isDone ? 0 : daysSinceLastDone(h.id, viewDate);

    const barClass  = { done:'bar-green', yellow:'bar-yellow', red:'bar-red', neutral:'bar-neutral' }[state];
    const daysClass = state === 'red' ? 'overdue' : state === 'yellow' ? 'warn' : '';
    const daysLabel = isDone ? '—' : days > 99 ? 'new' : `${days}d`;

    const row = document.createElement('div');
    row.className = 'habit-row' + (isOnline ? '' : ' offline');
    row.innerHTML = `
      <div class="pressure-bar ${barClass}"></div>
      <div class="habit-name${isDone ? ' done' : ''}">${escHtml(h.name)}</div>
      <div class="habit-days ${daysClass}">${daysLabel}</div>
      <div class="toggle${isDone ? ' checked' : ''}">✓</div>
    `;
    if (isOnline) {
      row.addEventListener('click', () => toggleHabit(h.id));
    }
    list.appendChild(row);
  });
}

function renderManageView() {
  const formWrap = document.getElementById('edit-form-wrap');
  // Reset form if not currently editing
  if (!formWrap.classList.contains('open')) {
    formWrap.style.display = 'none';
  }

  const list = document.getElementById('mgmt-list');
  list.innerHTML = '';

  const sorted = [...data.habits].sort((a, b) => a.order - b.order);
  sorted.forEach((h, idx) => {
    const row = document.createElement('div');
    row.className = 'mgmt-row';
    row.dataset.id = h.id;
    row.draggable = true;
    row.innerHTML = `
      <div class="drag-handle" title="Drag to reorder">⠿</div>
      <div class="mgmt-info">
        <div class="mgmt-name">${escHtml(h.name)}</div>
        <div class="mgmt-meta">pressure: ${h.pressureDays} day${h.pressureDays !== 1 ? 's' : ''}</div>
      </div>
      <div class="mgmt-actions">
        <button class="mgmt-btn edit-btn">Edit</button>
        <button class="mgmt-btn del delete-btn">Delete</button>
      </div>
    `;
    row.querySelector('.edit-btn').addEventListener('click', () => openEditForm(h.id));
    row.querySelector('.delete-btn').addEventListener('click', () => confirmDelete(h.id));
    attachDragListeners(row);
    list.appendChild(row);
  });
}

function render() {
  renderTodayView();
  renderManageView();
}

// ── Toggle habit ────────────────────────────────────────
async function toggleHabit(habitId) {
  if (!isOnline) return;
  if (!data.log[viewDate]) data.log[viewDate] = {};
  const current = data.log[viewDate][habitId] === true;
  data.log[viewDate][habitId] = !current;
  renderTodayView();
  await persist();
}

// ── Date navigation ─────────────────────────────────────
function shiftDate(delta) {
  const next = addDays(viewDate, delta);
  if (next > todayStr()) return;
  viewDate = next;
  renderTodayView();
}

// ── Add / Edit habit ────────────────────────────────────
function openAddForm() {
  editingHabitId = null;
  document.getElementById('form-title').textContent = 'New Habit';
  document.getElementById('habit-name-input').value = '';
  document.getElementById('habit-pressure-input').value = '';
  showForm();
}

function openEditForm(id) {
  const h = data.habits.find(h => h.id === id);
  if (!h) return;
  editingHabitId = id;
  document.getElementById('form-title').textContent = 'Edit Habit';
  document.getElementById('habit-name-input').value = h.name;
  document.getElementById('habit-pressure-input').value = h.pressureDays;
  showForm();
}

function showForm() {
  const wrap = document.getElementById('edit-form-wrap');
  wrap.style.display = 'block';
  wrap.classList.add('open');
  document.getElementById('habit-name-input').focus();
}

function hideForm() {
  const wrap = document.getElementById('edit-form-wrap');
  wrap.style.display = 'none';
  wrap.classList.remove('open');
  editingHabitId = null;
}

async function saveHabitForm() {
  const name = document.getElementById('habit-name-input').value.trim();
  const pressureDays = parseInt(document.getElementById('habit-pressure-input').value, 10);
  if (!name) { showToast('Please enter a habit name'); return; }
  if (!pressureDays || pressureDays < 1) { showToast('Pressure window must be at least 1 day'); return; }

  if (editingHabitId) {
    const h = data.habits.find(h => h.id === editingHabitId);
    if (h) { h.name = name; h.pressureDays = pressureDays; }
  } else {
    const maxOrder = data.habits.reduce((m, h) => Math.max(m, h.order), -1);
    data.habits.push({
      id: uuid(),
      name,
      pressureDays,
      order: maxOrder + 1,
      createdAt: todayStr(),
    });
  }

  hideForm();
  render();
  await persist();
}

// ── Delete habit ────────────────────────────────────────
function confirmDelete(id) {
  const h = data.habits.find(h => h.id === id);
  if (!h) return;
  showConfirm(
    `Delete "${h.name}"?`,
    'This will remove the habit and all its log history. This cannot be undone.',
    async () => {
      data.habits = data.habits.filter(h => h.id !== id);
      // Remove log entries for this habit
      Object.keys(data.log).forEach(date => {
        delete data.log[date][id];
      });
      render();
      await persist();
    }
  );
}

// ── Drag-and-drop reorder ────────────────────────────────
let dragSrcId = null;

function attachDragListeners(row) {
  row.addEventListener('dragstart', e => {
    dragSrcId = row.dataset.id;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  row.addEventListener('dragend', () => {
    row.classList.remove('dragging');
    document.querySelectorAll('.mgmt-row').forEach(r => r.classList.remove('drag-over'));
  });
  row.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.mgmt-row').forEach(r => r.classList.remove('drag-over'));
    row.classList.add('drag-over');
  });
  row.addEventListener('drop', async e => {
    e.preventDefault();
    row.classList.remove('drag-over');
    if (!dragSrcId || dragSrcId === row.dataset.id) return;

    const fromIdx = data.habits.findIndex(h => h.id === dragSrcId);
    const toIdx   = data.habits.findIndex(h => h.id === row.dataset.id);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = data.habits.splice(fromIdx, 1);
    data.habits.splice(toIdx, 0, moved);
    data.habits.forEach((h, i) => { h.order = i; });

    renderManageView();
    await persist();
  });
}

// ── OneDrive persist ────────────────────────────────────
async function persist() {
  if (isSaving) return; // queue could be added, but for now last write wins
  isSaving = true;
  try {
    await window.graph.saveData(data);
  } catch (err) {
    showToast('Sync failed. Please try again.');
    console.error('saveData error:', err);
  } finally {
    isSaving = false;
  }
}

// ── UI helpers ──────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

let confirmCallback = null;
function showConfirm(title, msg, onOk) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-msg').textContent = msg;
  confirmCallback = onOk;
  document.getElementById('confirm-overlay').classList.add('visible');
}
function hideConfirm() {
  document.getElementById('confirm-overlay').classList.remove('visible');
  confirmCallback = null;
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.getElementById('nav-' + view).classList.add('active');
}

function setOnlineState(online) {
  isOnline = online;
  const banner = document.getElementById('offline-banner');
  if (online) banner.classList.remove('visible');
  else        banner.classList.add('visible');
  renderTodayView(); // re-render to enable/disable toggles
}

// ── Init ────────────────────────────────────────────────
async function init() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Online/offline listeners
  window.addEventListener('online',  () => setOnlineState(true));
  window.addEventListener('offline', () => setOnlineState(false));
  setOnlineState(navigator.onLine);

  // Wire up nav
  document.getElementById('nav-today').addEventListener('click',  () => switchView('today'));
  document.getElementById('nav-manage').addEventListener('click', () => switchView('manage'));

  // Wire up date nav
  document.getElementById('btn-prev').addEventListener('click', () => shiftDate(-1));
  document.getElementById('btn-next').addEventListener('click', () => shiftDate(1));
  document.getElementById('back-today-btn').addEventListener('click', () => {
    viewDate = todayStr();
    renderTodayView();
  });

  // Wire up manage
  document.getElementById('add-habit-btn').addEventListener('click', openAddForm);
  document.getElementById('form-save-btn').addEventListener('click', saveHabitForm);
  document.getElementById('form-cancel-btn').addEventListener('click', hideForm);

  // Wire up confirm dialog
  document.getElementById('confirm-cancel').addEventListener('click', hideConfirm);
  document.getElementById('confirm-ok').addEventListener('click', async () => {
    if (confirmCallback) await confirmCallback();
    hideConfirm();
  });

  // Auth init
  showScreen('loading');

  try {
    await window.auth.initAuth();
  } catch (err) {
    console.error('MSAL init failed:', err);
    showScreen('auth');
    return;
  }

  const account = window.auth.getAccount();
  if (!account) {
    showScreen('auth');
    document.getElementById('sign-in-btn').addEventListener('click', () => window.auth.signIn());
    return;
  }

  // Load data
  try {
    const raw = await window.graph.loadData();
    data = raw;
    // Ensure order field exists on all habits
    data.habits.forEach((h, i) => { if (h.order == null) h.order = i; });
  } catch (err) {
    if (err instanceof SyntaxError && err.message === 'malformed_json') {
      showMalformedJsonError();
      return;
    }
    console.error('loadData failed:', err);
    showScreen('error');
    document.getElementById('error-message').textContent = 'Could not load your habits from OneDrive. Check your connection and try again.';
    document.getElementById('error-retry-btn').onclick = () => init();
    return;
  }

  showScreen('main');
  render();
}

function showScreen(which) {
  const screens = ['loading', 'auth', 'main', 'error'];
  screens.forEach(s => {
    const el = document.getElementById(s + '-screen');
    if (!el) return;
    if (s === which) el.classList.add('visible');
    else             el.classList.remove('visible');
  });
  // 'main' uses display:flex via .visible
  if (which === 'main') {
    document.getElementById('main').classList.add('visible');
    document.getElementById('main').classList.remove('hidden');
  } else {
    document.getElementById('main').classList.remove('visible');
  }
}

function showMalformedJsonError() {
  showScreen('error');
  document.getElementById('error-message').textContent =
    'Your habits data file appears to be corrupted. You can reset it to start fresh (all data will be lost).';

  const actions = document.getElementById('error-actions');
  actions.innerHTML = '';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'err-btn danger';
  resetBtn.textContent = 'Reset Data';
  resetBtn.onclick = () => {
    showConfirm(
      'Reset all data?',
      'This will delete all your habits and history. This cannot be undone.',
      async () => {
        data = { habits: [], log: {} };
        await window.graph.saveData(data);
        showScreen('main');
        render();
      }
    );
  };

  const retryBtn = document.createElement('button');
  retryBtn.className = 'err-btn primary';
  retryBtn.textContent = 'Retry';
  retryBtn.onclick = () => init();

  actions.appendChild(retryBtn);
  actions.appendChild(resetBtn);
}

document.addEventListener('DOMContentLoaded', init);
