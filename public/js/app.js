/* =============================================
   SurveyTech | KLSWA Portal — Main SPA
   ============================================= */

const API = '/api';
let currentUser = null;
let authToken = null;
let currentView = 'dashboard';

// ─── AUTH ────────────────────────────────────
function getToken() { return authToken || localStorage.getItem('st_token'); }
function setToken(t) { authToken = t; localStorage.setItem('st_token', t); }
function clearToken() { authToken = null; localStorage.removeItem('st_token'); localStorage.removeItem('st_user'); }

async function apiFetch(path, opts = {}) {
  const token = getToken();
  const res = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (res.status === 401) { logout(); return null; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── ROLE CONFIG ─────────────────────────────
const ROLE_CONFIG = {
  // Government / Technical roles
  surveyor:          { label: 'Licensed Surveyor',       icon: '👨‍💼', color: '#4f46e5', group: 'govt',  nav: ['dashboard','surveys','survey-new','licenses','profile'] },
  taluk:             { label: 'Taluk Coordinator',        icon: '🏘️',  color: '#0891b2', group: 'govt',  nav: ['dashboard','surveys','licenses','users','reports','profile'] },
  district:          { label: 'District Officer',         icon: '📍',  color: '#059669', group: 'govt',  nav: ['dashboard','surveys','licenses','users','reports','profile'] },
  division:          { label: 'Division Head',            icon: '🗺️',  color: '#7c3aed', group: 'govt',  nav: ['dashboard','surveys','licenses','users','reports','profile'] },
  state:             { label: 'State Administrator',      icon: '🏛️',  color: '#dc2626', group: 'govt',  nav: ['dashboard','surveys','licenses','users','reports','profile'] },
  union:             { label: 'Union Representative',     icon: '🌐',  color: '#d97706', group: 'govt',  nav: ['dashboard','surveys','reports','profile'] },
  // KLSWA / ರಾಜ ಸಂಘ roles
  state_president:   { label: 'ರಾಜ್ಯ ಅಧ್ಯಕ್ಷ',           icon: '👑',  color: '#7c2d12', group: 'klswa', nav: ['dashboard','surveys','district-board','licenses','reports','profile'] },
  state_tech:        { label: 'State Technical Head',     icon: '⚙️',  color: '#1d4ed8', group: 'klswa', nav: ['dashboard','surveys','district-board','licenses','users','reports','profile'] },
  division_tech:     { label: 'Division Technical Head',  icon: '🔬',  color: '#6d28d9', group: 'klswa', nav: ['dashboard','surveys','licenses','users','reports','profile'] },
  district_president:{ label: 'ಜಿಲ್ಲಾ ಅಧ್ಯಕ್ಷ',           icon: '🎖️',  color: '#065f46', group: 'klswa', nav: ['dashboard','surveys','licenses','reports','profile'] },
  district_tech:     { label: 'District Technical Team',  icon: '🔧',  color: '#0e7490', group: 'klswa', nav: ['dashboard','surveys','licenses','users','reports','profile'] },
};

const NAV_ITEMS = {
  dashboard:       { icon: '📊', label: 'Dashboard' },
  surveys:         { icon: '📋', label: 'Surveys' },
  'survey-new':    { icon: '➕', label: 'New Survey' },
  'district-board':{ icon: '🗺️', label: 'District Board' },
  licenses:        { icon: '🪪', label: 'Licenses' },
  users:           { icon: '👥', label: 'Users' },
  reports:         { icon: '📈', label: 'Reports' },
  profile:         { icon: '⚙️', label: 'Profile' },
};

// Demo credentials by role
const DEMO_CREDS = {
  surveyor:          { email: 'demo@surveytech.in',        label: 'Surveyor' },
  taluk:             { email: 'taluk@surveytech.in',       label: 'Taluk' },
  district:          { email: 'district@surveytech.in',    label: 'District Officer' },
  division:          { email: 'division@surveytech.in',    label: 'Division Head' },
  state:             { email: 'state@surveytech.in',       label: 'State Admin' },
  state_president:   { email: 'stpres@klswa.in',           label: 'State President' },
  state_tech:        { email: 'sttech@klswa.in',           label: 'State Tech Head' },
  division_tech:     { email: 'divtech.mys@klswa.in',      label: 'Div Tech (Mysuru)' },
  district_president:{ email: 'pres.mysuru@klswa.in',      label: 'Dist President (Mysuru)' },
  district_tech:     { email: 'tech.mysuru@klswa.in',      label: 'Dist Tech (Mysuru)' },
};

// ─── LOGIN PAGE ───────────────────────────────
let selectedRole = 'surveyor';
let activeTab = 'govt';

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', (i===0) === (tab==='govt')));
  document.getElementById('tab-govt').classList.toggle('hidden', tab !== 'govt');
  document.getElementById('tab-klswa').classList.toggle('hidden', tab !== 'klswa');

  // Auto-select first chip in tab
  const chips = document.querySelectorAll(`#tab-${tab} .role-chip`);
  if (chips.length) { chips[0].click(); }

  renderDemoCreds(tab);
}

function renderDemoCreds(tab) {
  const roles = tab === 'govt'
    ? ['surveyor','taluk','district','division','state']
    : ['state_president','state_tech','division_tech','district_president','district_tech'];
  document.getElementById('demo-creds').innerHTML = roles.map(r => {
    const c = DEMO_CREDS[r];
    return `<div class="demo-cred-row">
      <span class="demo-cred-label">${c.label}</span>
      <span class="demo-cred-email">${c.email}</span>
      <button type="button" class="demo-fill-btn" onclick="fillCred('${c.email}')">Fill</button>
    </div>`;
  }).join('');
}

function fillCred(email) {
  document.getElementById('email').value = email;
  document.getElementById('password').value = 'demo123';
}

document.querySelectorAll('.role-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const parent = chip.closest('.role-grid');
    parent.querySelectorAll('.role-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    selectedRole = chip.dataset.role;
    const cred = DEMO_CREDS[selectedRole];
    if (cred) {
      document.getElementById('email').value = cred.email;
      document.getElementById('password').value = 'demo123';
    }
  });
});

function togglePw() {
  const p = document.getElementById('password');
  p.type = p.type === 'password' ? 'text' : 'password';
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errEl = document.getElementById('login-error');
  const btn = document.getElementById('login-btn');
  const text = document.getElementById('login-text');
  const spinner = document.getElementById('login-spinner');

  errEl.classList.add('hidden');
  btn.disabled = true; text.textContent = 'Signing in…'; spinner.classList.remove('hidden');

  try {
    const data = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    if (!data) throw new Error('Login failed');
    setToken(data.token);
    currentUser = data.user;
    localStorage.setItem('st_user', JSON.stringify(currentUser));
    initApp();
  } catch (err) {
    errEl.textContent = err.message || 'Invalid credentials';
    errEl.classList.remove('hidden');
    btn.disabled = false; text.textContent = 'Sign In'; spinner.classList.add('hidden');
  }
});

// ─── APP INIT ─────────────────────────────────
async function initApp() {
  const token = getToken();
  if (!token) { showPage('login-page'); return; }
  try {
    if (!currentUser) {
      const saved = localStorage.getItem('st_user');
      currentUser = saved ? JSON.parse(saved) : await apiFetch('/auth/me');
    }
    if (!currentUser) { logout(); return; }
    showPage('app-page');
    document.body.className = 'role-' + currentUser.role.replace(/_/g,'-');
    buildSidebar();
    buildTopbar();
    loadNotifications();
    navigate('dashboard');
  } catch { logout(); }
}

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─── SIDEBAR ──────────────────────────────────
function buildSidebar() {
  const rc = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.state;
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';

  const mainNav = rc.nav.filter(k => k !== 'profile');
  const s1 = document.createElement('div'); s1.className = 'nav-section';
  s1.textContent = rc.group === 'klswa' ? '🤝 ರಾಜ ಸಂಘ' : 'Main Menu';
  nav.appendChild(s1);

  mainNav.forEach(key => {
    const item = NAV_ITEMS[key]; if (!item) return;
    const el = document.createElement('div');
    el.className = 'nav-item'; el.dataset.view = key;
    el.innerHTML = `<span class="nav-icon">${item.icon}</span><span class="nav-label">${item.label}</span>`;
    el.addEventListener('click', () => navigate(key));
    nav.appendChild(el);
  });

  const s2 = document.createElement('div'); s2.className = 'nav-section'; s2.textContent = 'Account';
  nav.appendChild(s2);
  const profileEl = document.createElement('div');
  profileEl.className = 'nav-item'; profileEl.dataset.view = 'profile';
  profileEl.innerHTML = `<span class="nav-icon">⚙️</span><span class="nav-label">Profile</span>`;
  profileEl.addEventListener('click', () => navigate('profile'));
  nav.appendChild(profileEl);

  const sbUser = document.getElementById('sb-user');
  const initials = currentUser.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  sbUser.innerHTML = `
    <div class="sb-avatar" style="background:${rc.color}">${initials}</div>
    <div class="sb-info">
      <div class="sb-name">${currentUser.name}</div>
      <div class="sb-role">${rc.label}</div>
    </div>`;

  document.getElementById('sidebar-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });
}

function buildTopbar() {
  const rc = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.state;
  const initials = currentUser.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const av = document.getElementById('user-avatar');
  av.textContent = initials; av.style.background = rc.color;
  av.title = currentUser.name;
  av.addEventListener('click', () => navigate('profile'));

  const rb = document.getElementById('role-badge');
  rb.textContent = `${rc.icon} ${rc.label}`;
}

// ─── NAVIGATION ───────────────────────────────
function navigate(view, params = {}) {
  currentView = view;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  const viewId = 'view-' + view;
  const el = document.getElementById(viewId);
  if (el) el.classList.add('active');

  const titles = {
    dashboard: 'Dashboard', surveys: 'Survey Management', 'survey-new': 'New Survey',
    'survey-detail': 'Survey Details', 'district-board': 'District Board (31 Districts)',
    licenses: 'License Management', users: 'User Management',
    reports: 'Reports & Analytics', profile: 'Profile & Settings',
  };
  document.getElementById('page-title').textContent = titles[view] || view;
  document.getElementById('breadcrumb').textContent = 'Home › ' + (titles[view] || view);
  document.getElementById('notif-panel').classList.add('hidden');

  switch(view) {
    case 'dashboard':       loadDashboard(); break;
    case 'surveys':         loadSurveys(); break;
    case 'survey-new':      loadSurveyForm(); break;
    case 'survey-detail':   loadSurveyDetail(params.id); break;
    case 'district-board':  loadDistrictBoard(); break;
    case 'licenses':        loadLicenses(); break;
    case 'users':           loadUsers(); break;
    case 'reports':         loadReports(); break;
    case 'profile':         loadProfile(); break;
  }
}

// ─── NOTIFICATIONS ────────────────────────────
async function loadNotifications() {
  try {
    const data = await apiFetch('/notifications');
    if (!data) return;
    const badge = document.getElementById('notif-badge');
    badge.textContent = data.unread;
    badge.classList.toggle('hidden', data.unread === 0);
    const list = document.getElementById('notif-list');
    if (!data.notifications.length) {
      list.innerHTML = '<div class="empty-state" style="padding:30px"><div class="empty-icon">🔔</div><div class="empty-sub">No notifications</div></div>';
      return;
    }
    list.innerHTML = data.notifications.map(n => `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="readNotif(${n.id})">
        <div class="notif-dot"></div>
        <div>
          <div class="notif-title">${n.title}</div>
          <div class="notif-msg">${n.message}</div>
          <div class="notif-time">${timeAgo(n.created_at)}</div>
        </div>
      </div>`).join('');
  } catch {}
}
function toggleNotifications() { document.getElementById('notif-panel').classList.toggle('hidden'); }
async function markAllRead() { await apiFetch('/notifications/read-all', { method: 'PUT' }); loadNotifications(); }
async function readNotif(id) { await apiFetch(`/notifications/${id}/read`, { method: 'PUT' }); loadNotifications(); }

// ─── DASHBOARD ────────────────────────────────
async function loadDashboard() {
  const el = document.getElementById('view-dashboard');
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⌛</div><div class="empty-title">Loading…</div></div>';

  try {
    const rc = ROLE_CONFIG[currentUser.role] || ROLE_CONFIG.state;
    const [stats, licStats] = await Promise.all([apiFetch('/surveys/stats'), apiFetch('/licenses/stats')]);
    if (!stats) return;

    const isKlswa = rc.group === 'klswa';
    const headerBg = isKlswa
      ? `linear-gradient(135deg, ${rc.color}, ${rc.color}cc)`
      : 'linear-gradient(135deg, #1e1b4b, #312e81)';

    let jurisdictionBadge = '';
    if (currentUser.district) jurisdictionBadge = `<span style="opacity:.7;font-size:13px">📍 ${currentUser.district}</span>`;
    if (currentUser.division && !currentUser.district) jurisdictionBadge = `<span style="opacity:.7;font-size:13px">🗺️ ${currentUser.division}</span>`;
    if (['state','state_president','state_tech','union'].includes(currentUser.role)) jurisdictionBadge = `<span style="opacity:.7;font-size:13px">🏛️ Karnataka State</span>`;

    el.innerHTML = `
      <div style="background:${headerBg};color:white;padding:24px;border-radius:var(--radius);margin-bottom:24px;display:flex;align-items:center;gap:16px">
        <div style="font-size:48px">${rc.icon}</div>
        <div>
          <div style="font-size:22px;font-weight:800">ಸ್ವಾಗತ, ${currentUser.name.split(' ')[0]}! 👋</div>
          <div style="opacity:.7;font-size:13px;margin-top:4px">${rc.label} | ${currentUser.employee_id || ''} | ${new Date().toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</div>
          <div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap">${jurisdictionBadge}${isKlswa ? '<span style="background:rgba(255,255,255,.2);padding:3px 10px;border-radius:100px;font-size:12px;font-weight:600">🤝 ರಾಜ ಸಂಘ / KLSWA</span>' : ''}</div>
        </div>
      </div>

      <div class="grid-4 mb-6">
        <div class="stat-card primary"><div class="stat-icon">📋</div><div><div class="stat-value">${stats.total}</div><div class="stat-label">Total Surveys</div></div></div>
        <div class="stat-card success"><div class="stat-icon">✅</div><div><div class="stat-value">${stats.completed}</div><div class="stat-label">Completed</div><div class="stat-change up">${stats.total?Math.round(stats.completed/stats.total*100):0}% rate</div></div></div>
        <div class="stat-card warning"><div class="stat-icon">⚡</div><div><div class="stat-value">${stats.in_progress}</div><div class="stat-label">In Progress</div></div></div>
        <div class="stat-card info"><div class="stat-icon">⏳</div><div><div class="stat-value">${stats.pending}</div><div class="stat-label">Pending Review</div></div></div>
      </div>

      ${licStats ? `
      <div class="grid-4 mb-6">
        <div class="stat-card success"><div class="stat-icon">🪪</div><div><div class="stat-value">${licStats.active}</div><div class="stat-label">Active Licenses</div></div></div>
        <div class="stat-card danger"><div class="stat-icon">❌</div><div><div class="stat-value">${licStats.expired}</div><div class="stat-label">Expired</div></div></div>
        <div class="stat-card warning"><div class="stat-icon">🔄</div><div><div class="stat-value">${licStats.renewal_pending}</div><div class="stat-label">Renewal Pending</div></div></div>
        <div class="stat-card warning"><div class="stat-icon">⚠️</div><div><div class="stat-value">${licStats.expiring_soon}</div><div class="stat-label">Expiring in 90d</div></div></div>
      </div>` : ''}

      <div class="grid-2 mb-6">
        <div class="card"><div class="card-header"><div><div class="card-title">Survey Status Distribution</div></div></div>${buildStatusChart(stats.byStatus)}</div>
        <div class="card"><div class="card-header"><div><div class="card-title">Survey Types</div></div></div>${buildTypeChart(stats.byType)}</div>
      </div>

      ${stats.byDivision && stats.byDivision.length > 1 ? `
      <div class="card mb-6">
        <div class="card-header"><div class="card-title">Division-wise Surveys</div></div>
        ${buildDivisionChart(stats.byDivision)}
      </div>` : ''}

      ${stats.byDistrict && stats.byDistrict.length > 0 && ['state','state_president','state_tech','union'].includes(currentUser.role) ? `
      <div class="card mb-6">
        <div class="card-header"><div class="card-title">Top Districts by Survey Count</div><button class="btn btn-secondary btn-sm" onclick="navigate('district-board')">View All 31 Districts</button></div>
        ${buildDistrictChart(stats.byDistrict.slice(0,8))}
      </div>` : ''}
    `;

    const recent = await apiFetch('/surveys?limit=5');
    if (recent?.surveys.length) {
      el.innerHTML += `<div class="card"><div class="card-header"><div><div class="card-title">Recent Surveys</div></div><button class="btn btn-secondary btn-sm" onclick="navigate('surveys')">View All</button></div>${buildSurveyTable(recent.surveys, true)}</div>`;
    }

  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load dashboard</div><div class="empty-sub">${err.message}</div></div>`;
  }
}

function buildStatusChart(byStatus) {
  const colors = { submitted:'#94a3b8',taluk_review:'#38bdf8',taluk_approved:'#34d399',district_review:'#60a5fa',district_approved:'#4ade80',division_review:'#a78bfa',division_approved:'#818cf8',state_review:'#f472b6',approved:'#059669',in_progress:'#f59e0b',completed:'#10b981',rejected:'#ef4444' };
  const total = byStatus.reduce((s,b)=>s+b.cnt,0)||1;
  return `<div style="display:flex;flex-direction:column;gap:8px">${byStatus.slice(0,10).map(b=>`
    <div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="text-transform:capitalize">${b.status.replace(/_/g,' ')}</span><span style="font-weight:600">${b.cnt}</span></div>
      <div class="progress-bar" style="height:7px"><div class="progress-fill" style="width:${Math.round(b.cnt/total*100)}%;background:${colors[b.status]||'#94a3b8'}"></div></div>
    </div>`).join('')}</div>`;
}

function buildTypeChart(byType) {
  const colors = ['#4f46e5','#0891b2','#059669','#7c3aed','#dc2626','#d97706','#0e7490','#065f46'];
  const total = byType.reduce((s,b)=>s+b.cnt,0)||1;
  return `<div style="display:flex;flex-direction:column;gap:8px">${byType.map((b,i)=>`
    <div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>${b.survey_type}</span><span style="font-weight:600">${b.cnt} (${Math.round(b.cnt/total*100)}%)</span></div>
      <div class="progress-bar" style="height:7px"><div class="progress-fill" style="width:${Math.round(b.cnt/total*100)}%;background:${colors[i%colors.length]}"></div></div>
    </div>`).join('')}</div>`;
}

function buildDivisionChart(byDiv) {
  const colors = {'Bengaluru Division':'#4f46e5','Mysuru Division':'#059669','Belagavi Division':'#dc2626','Kalaburagi Division':'#d97706'};
  const total = byDiv.reduce((s,b)=>s+b.cnt,0)||1;
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">${byDiv.map(b=>`
    <div style="padding:14px;background:var(--c-bg);border-radius:10px;border-left:4px solid ${colors[b.division]||'#94a3b8'}">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px">${b.division}</div>
      <div style="font-size:24px;font-weight:800;color:${colors[b.division]||'#94a3b8'}">${b.cnt}</div>
      <div style="font-size:11px;color:var(--c-text3)">surveys (${Math.round(b.cnt/total*100)}%)</div>
    </div>`).join('')}</div>`;
}

function buildDistrictChart(byDist) {
  const total = byDist.reduce((s,b)=>s+b.cnt,0)||1;
  return `<div style="display:flex;flex-direction:column;gap:7px">${byDist.map(b=>`
    <div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span>${b.district}</span><span style="font-weight:600">${b.cnt}</span></div>
      <div class="progress-bar" style="height:7px"><div class="progress-fill" style="width:${Math.round(b.cnt/total*100)}%"></div></div>
    </div>`).join('')}</div>`;
}

// ─── DISTRICT BOARD ───────────────────────────
async function loadDistrictBoard() {
  const el = document.getElementById('view-district-board');
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⌛</div></div>';
  try {
    const presidents = await apiFetch('/users/district-presidents');
    if (!presidents) return;

    const divColors = {'Bengaluru Division':'#4f46e5','Mysuru Division':'#059669','Belagavi Division':'#dc2626','Kalaburagi Division':'#d97706'};

    // Group by division
    const byDiv = {};
    presidents.forEach(p => {
      const div = p.division || 'Other';
      if (!byDiv[div]) byDiv[div] = [];
      byDiv[div].push(p);
    });

    const totalDistricts = presidents.length;
    const totalSurveys = presidents.reduce((s,p)=>s+p.total_surveys,0);
    const totalCompleted = presidents.reduce((s,p)=>s+p.completed,0);

    el.innerHTML = `
      <div class="grid-3 mb-6">
        <div class="stat-card primary"><div class="stat-icon">📍</div><div><div class="stat-value">${totalDistricts}</div><div class="stat-label">Total Districts</div></div></div>
        <div class="stat-card info"><div class="stat-icon">📋</div><div><div class="stat-value">${totalSurveys}</div><div class="stat-label">Total Surveys</div></div></div>
        <div class="stat-card success"><div class="stat-icon">✅</div><div><div class="stat-value">${totalCompleted}</div><div class="stat-label">Completed</div></div></div>
      </div>

      ${Object.entries(byDiv).map(([div, pres]) => `
        <div class="mb-6">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <div style="width:4px;height:24px;background:${divColors[div]||'#94a3b8'};border-radius:2px"></div>
            <h3 style="font-size:16px;font-weight:700">${div}</h3>
            <span style="background:var(--c-bg);padding:2px 10px;border-radius:100px;font-size:12px;font-weight:600">${pres.length} districts</span>
          </div>
          <div class="district-grid">
            ${pres.map(p => {
              const initials = p.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
              const color = divColors[div] || '#065f46';
              return `<div class="district-card has-president">
                <div class="dc-name">📍 ${p.district}</div>
                <div class="dc-division">${p.division}</div>
                <div class="dc-president">
                  <div class="dc-avatar" style="background:${color}">${initials}</div>
                  <div>
                    <div class="dc-pname">${p.name}</div>
                    <div class="dc-pemail">${p.email}</div>
                  </div>
                </div>
                <div class="dc-stats">
                  <div class="dc-stat"><div class="dc-stat-val">${p.total_surveys}</div><div class="dc-stat-lbl">Total</div></div>
                  <div class="dc-stat"><div class="dc-stat-val" style="color:var(--c-success)">${p.completed}</div><div class="dc-stat-lbl">Done</div></div>
                  <div class="dc-stat"><div class="dc-stat-val" style="color:var(--c-warning)">${p.in_progress}</div><div class="dc-stat-lbl">Active</div></div>
                  <div class="dc-stat"><div class="dc-stat-val" style="color:var(--c-info)">${p.pending}</div><div class="dc-stat-lbl">Pending</div></div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`).join('')}`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">${err.message}</div></div>`;
  }
}

// ─── SURVEYS LIST ─────────────────────────────
let surveyFilters = { status: '', priority: '', search: '', page: 1 };

async function loadSurveys() {
  const el = document.getElementById('view-surveys');
  const role = currentUser.role;
  const isReadOnly = ['state_president','district_president'].includes(role);

  el.innerHTML = `
    <div class="filters-bar">
      <input type="search" class="search-input" placeholder="🔍 Search surveys…" value="${surveyFilters.search}" oninput="surveySearch(this.value)">
      <select class="filter-select" onchange="surveyFilter('status',this.value)">
        <option value="">All Status</option>
        <option value="submitted">Submitted</option><option value="taluk_review">Taluk Review</option>
        <option value="taluk_approved">Taluk Approved</option><option value="district_review">District Review</option>
        <option value="district_approved">District Approved</option><option value="division_review">Division Review</option>
        <option value="approved">Approved</option><option value="in_progress">In Progress</option>
        <option value="completed">Completed</option><option value="rejected">Rejected</option>
      </select>
      <select class="filter-select" onchange="surveyFilter('priority',this.value)">
        <option value="">All Priority</option>
        <option value="urgent">Urgent</option><option value="high">High</option>
        <option value="normal">Normal</option><option value="low">Low</option>
      </select>
      ${role === 'surveyor' ? `<button class="btn btn-primary" onclick="navigate('survey-new')">➕ New Survey</button>` : ''}
      ${isReadOnly ? `<span style="font-size:12px;color:var(--c-text3);padding:8px">👁 Read-only view</span>` : ''}
    </div>
    <div id="survey-list-content"></div>`;

  el.querySelectorAll('.filter-select')[0].value = surveyFilters.status;
  el.querySelectorAll('.filter-select')[1].value = surveyFilters.priority;
  await fetchSurveys();
}

let searchTimer;
function surveySearch(val) { clearTimeout(searchTimer); searchTimer = setTimeout(() => { surveyFilters.search = val; surveyFilters.page = 1; fetchSurveys(); }, 300); }
function surveyFilter(k, v) { surveyFilters[k] = v; surveyFilters.page = 1; fetchSurveys(); }

async function fetchSurveys() {
  const container = document.getElementById('survey-list-content');
  if (!container) return;
  try {
    const q = new URLSearchParams({ ...surveyFilters, limit: 15 });
    const data = await apiFetch('/surveys?' + q);
    if (!data) return;

    if (!data.surveys.length) {
      container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No surveys found</div></div>';
      return;
    }

    container.innerHTML = `
      <div class="card">
        <div class="card-header"><div><div class="card-title">Surveys</div><div class="card-sub">${data.total} total results</div></div></div>
        ${buildSurveyTable(data.surveys)}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:16px;border-top:1px solid var(--c-border)">
          <div style="font-size:13px;color:var(--c-text3)">Page ${data.page} of ${data.pages}</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="surveyPage(${data.page-1})" ${data.page<=1?'disabled':''}>← Prev</button>
            <button class="btn btn-secondary btn-sm" onclick="surveyPage(${data.page+1})" ${data.page>=data.pages?'disabled':''}>Next →</button>
          </div>
        </div>
      </div>`;
  } catch {}
}

function surveyPage(p) { if (p < 1) return; surveyFilters.page = p; fetchSurveys(); }

function buildSurveyTable(surveys, compact = false) {
  return `
    <div class="table-wrap"><table>
      <thead><tr>
        <th>Survey No</th><th>Title</th>
        ${!compact ? '<th>Location</th>' : ''}
        <th>Type</th><th>Status</th><th>Priority</th><th>Progress</th>
        ${!compact ? '<th>Due Date</th>' : ''}
        <th>Actions</th>
      </tr></thead>
      <tbody>${surveys.map(s => `
        <tr>
          <td><span style="font-family:monospace;font-size:12px;font-weight:600">${s.survey_no}</span></td>
          <td><div style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.title}</div>${s.surveyor_name?`<div class="text-sm text-muted">${s.surveyor_name}</div>`:''}</td>
          ${!compact ? `<td><span class="text-sm">${s.location}</span><div class="text-sm text-muted">${s.taluk}, ${s.district}</div></td>` : ''}
          <td><span class="text-sm">${s.survey_type}</span></td>
          <td><span class="badge badge-${s.status}">${s.status.replace(/_/g,' ')}</span></td>
          <td><span class="badge badge-${s.priority}">${s.priority}</span></td>
          <td><div class="progress-wrap"><div class="progress-bar"><div class="progress-fill ${s.progress>=100?'success':s.progress<30?'danger':''}" style="width:${s.progress}%"></div></div><span class="progress-pct">${s.progress}%</span></div></td>
          ${!compact ? `<td><span class="text-sm">${s.due_date ? formatDate(s.due_date) : '—'}</span></td>` : ''}
          <td><div class="td-actions">
            <button class="btn btn-secondary btn-sm" onclick="viewSurvey(${s.id})">View</button>
            ${canApprove(s) ? `<button class="btn btn-success btn-sm" onclick="approveSurvey(${s.id})">✓</button>` : ''}
            ${canReject(s)  ? `<button class="btn btn-danger btn-sm"  onclick="rejectSurvey(${s.id})">✗</button>` : ''}
            ${currentUser.role==='surveyor'&&s.status==='approved'     ? `<button class="btn btn-warning btn-sm" onclick="startSurvey(${s.id})">Start</button>` : ''}
            ${currentUser.role==='surveyor'&&s.status==='in_progress'  ? `<button class="btn btn-success btn-sm" onclick="completeSurvey(${s.id})">Complete</button>` : ''}
          </div></td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

const APPROVE_MAP = { taluk:['submitted','taluk_review'], district:['taluk_approved','district_review'], division:['district_approved','division_review'], state:['division_approved','state_review'] };
function canApprove(s) { return APPROVE_MAP[currentUser.role]?.includes(s.status) || false; }
function canReject(s)  { return canApprove(s); }

function viewSurvey(id) { navigate('survey-detail', { id }); }

async function approveSurvey(id) {
  const comments = prompt('Approval comments (optional):');
  if (comments === null) return;
  try { await apiFetch(`/surveys/${id}/action`, { method: 'PUT', body: { action: 'approve', comments } }); fetchSurveys(); showToast('Survey approved!', 'success'); }
  catch (e) { showToast(e.message, 'error'); }
}
async function rejectSurvey(id) {
  const comments = prompt('Rejection reason (required):');
  if (!comments?.trim()) { showToast('Please provide a rejection reason', 'error'); return; }
  try { await apiFetch(`/surveys/${id}/action`, { method: 'PUT', body: { action: 'reject', comments } }); fetchSurveys(); showToast('Survey rejected', 'warning'); }
  catch (e) { showToast(e.message, 'error'); }
}
async function startSurvey(id) {
  try { await apiFetch(`/surveys/${id}/action`, { method: 'PUT', body: { action: 'start' } }); fetchSurveys(); showToast('Survey started!', 'success'); }
  catch (e) { showToast(e.message, 'error'); }
}
async function completeSurvey(id) {
  if (!confirm('Mark this survey as completed?')) return;
  try { await apiFetch(`/surveys/${id}/action`, { method: 'PUT', body: { action: 'complete' } }); fetchSurveys(); showToast('Survey completed!', 'success'); }
  catch (e) { showToast(e.message, 'error'); }
}

// ─── SURVEY DETAIL ────────────────────────────
async function loadSurveyDetail(id) {
  const el = document.getElementById('view-survey-detail');
  if (!id) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No survey selected</div></div>'; return; }
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⌛</div></div>';
  try {
    const s = await apiFetch(`/surveys/${id}`);
    if (!s) return;
    const steps = [
      { label:'Submitted',       done: true },
      { label:'Taluk Review',    done: ['taluk_review','taluk_approved','district_review','district_approved','division_review','division_approved','state_review','approved','in_progress','completed'].includes(s.status) },
      { label:'District Review', done: ['district_review','district_approved','division_review','division_approved','state_review','approved','in_progress','completed'].includes(s.status) },
      { label:'Division Review', done: ['division_review','division_approved','state_review','approved','in_progress','completed'].includes(s.status) },
      { label:'State Approval',  done: ['state_review','approved','in_progress','completed'].includes(s.status) },
      { label:'In Progress',     done: ['in_progress','completed'].includes(s.status) },
      { label:'Completed',       done: s.status === 'completed' },
    ];
    el.innerHTML = `
      <div style="margin-bottom:20px"><button class="btn btn-secondary btn-sm" onclick="navigate('surveys')">← Back to Surveys</button></div>
      <div class="detail-hero">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
          <div><div style="opacity:.7;font-size:13px;margin-bottom:6px">${s.survey_no}</div><h2>${s.title}</h2>
            <div class="detail-meta"><span>📍 ${s.location}</span><span>🏘️ ${s.taluk}, ${s.district}</span><span>📐 ${s.survey_type}</span>${s.area_hectares?`<span>📏 ${s.area_hectares} ha</span>`:''}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
            <span class="badge badge-${s.status}" style="font-size:13px;padding:6px 14px">${s.status.replace(/_/g,' ')}</span>
            <span class="badge badge-${s.priority}">${s.priority} priority</span>
          </div>
        </div>
        <div style="margin-top:20px">
          <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px;opacity:.8"><span>Progress</span><span>${s.progress}%</span></div>
          <div style="height:8px;background:rgba(255,255,255,.2);border-radius:100px;overflow:hidden"><div style="height:100%;background:white;border-radius:100px;width:${s.progress}%;transition:width .4s"></div></div>
        </div>
      </div>
      <div class="grid-2">
        <div>
          <div class="card mb-4">
            <div class="card-header"><div class="card-title">Survey Information</div></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              ${detailRow('Surveyor',s.surveyor_name)}${detailRow('Employee ID',s.surveyor_emp_id)}
              ${detailRow('Phone',s.surveyor_phone)}${detailRow('Due Date',s.due_date?formatDate(s.due_date):'—')}
              ${detailRow('Area',s.area_hectares?s.area_hectares+' ha':'—')}${detailRow('Submitted',formatDate(s.created_at))}
              ${detailRow('District',s.district)}${detailRow('Division',s.division)}
            </div>
            ${s.description?`<div class="divider"></div><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--c-text3);margin-bottom:6px">Description</div><div style="font-size:13px">${s.description}</div>`:''}
          </div>
          ${currentUser.role==='surveyor'&&s.status==='in_progress'?`
          <div class="card mb-4">
            <div class="card-title mb-4">Update Progress</div>
            <input type="range" min="0" max="100" value="${s.progress}" class="form-input" id="progress-slider" oninput="document.getElementById('pval').textContent=this.value+'%'">
            <div style="text-align:center;font-size:18px;font-weight:800;margin:8px 0" id="pval">${s.progress}%</div>
            <button class="btn btn-primary" onclick="updateProgress(${s.id})">Save Progress</button>
          </div>`:''}
          ${canApprove(s)?`
          <div class="card">
            <div class="card-title mb-4">Take Action</div>
            <div class="form-group"><label class="form-label">Comments</label><textarea class="form-textarea" id="action-comments" rows="3" placeholder="Add comments…"></textarea></div>
            <div style="display:flex;gap:10px">
              <button class="btn btn-success" onclick="detailApprove(${s.id})">✓ Approve</button>
              <button class="btn btn-danger"  onclick="detailReject(${s.id})">✗ Reject</button>
            </div>
          </div>`:''}
        </div>
        <div>
          <div class="card mb-4">
            <div class="card-header"><div class="card-title">Approval Pipeline</div></div>
            <div class="timeline">${steps.map(step=>`
              <div class="timeline-item">
                <div class="timeline-dot ${step.done?'done':''}"></div>
                <div class="timeline-title">${step.label}</div>
                <div class="timeline-sub">${step.done?'✓ Completed':'○ Pending'}</div>
              </div>`).join('')}</div>
          </div>
          ${s.approvals?.length?`
          <div class="card">
            <div class="card-header"><div class="card-title">Approval History</div></div>
            <div style="display:flex;flex-direction:column;gap:10px">${s.approvals.map(a=>`
              <div style="padding:12px;background:var(--c-bg);border-radius:8px;border-left:3px solid ${a.action==='approved'?'var(--c-success)':'var(--c-danger)'}">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                  <span style="font-weight:600;font-size:13px">${a.approver_name} <span style="color:var(--c-text3)">(${a.level})</span></span>
                  <span class="badge badge-${a.action}">${a.action}</span>
                </div>
                ${a.comments?`<div style="font-size:12px;color:var(--c-text2)">${a.comments}</div>`:''}
                <div class="text-sm text-muted mt-1">${timeAgo(a.created_at)}</div>
              </div>`).join('')}</div>
          </div>`:''}
        </div>
      </div>`;
  } catch (err) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">${err.message}</div></div>`;
  }
}

function detailRow(label, value) {
  return `<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--c-text3);margin-bottom:3px">${label}</div><div style="font-size:13px;font-weight:500">${value||'—'}</div></div>`;
}
async function updateProgress(id) {
  const val = document.getElementById('progress-slider').value;
  try { await apiFetch(`/surveys/${id}/progress`,{method:'PUT',body:{progress:Number(val)}}); showToast('Progress updated!','success'); loadSurveyDetail(id); }
  catch(e){showToast(e.message,'error');}
}
async function detailApprove(id) {
  const comments = document.getElementById('action-comments')?.value||'';
  try { await apiFetch(`/surveys/${id}/action`,{method:'PUT',body:{action:'approve',comments}}); showToast('Approved!','success'); loadSurveyDetail(id); }
  catch(e){showToast(e.message,'error');}
}
async function detailReject(id) {
  const comments = document.getElementById('action-comments')?.value;
  if(!comments?.trim()){showToast('Please add a rejection reason','error');return;}
  try { await apiFetch(`/surveys/${id}/action`,{method:'PUT',body:{action:'reject',comments}}); showToast('Rejected','warning'); loadSurveyDetail(id); }
  catch(e){showToast(e.message,'error');}
}

// ─── NEW SURVEY ───────────────────────────────
function loadSurveyForm() {
  if (currentUser.role !== 'surveyor') {
    document.getElementById('view-survey-new').innerHTML = '<div class="empty-state"><div class="empty-icon">🔒</div><div class="empty-title">Only surveyors can submit surveys</div></div>';
    return;
  }
  const types = ['Cadastral','Topographical','Boundary Demarcation','Revenue','Forest','Urban Layout','Irrigation','Industrial'];
  const taluks = ['Mysuru','Hunsur','K.R.Nagar','Nanjangud','Periyapatna','T.Narasipur','H.D.Kote','Chamrajanagar','Gundlupet','Bengaluru','Belagavi','Kalaburagi','Ballari','Dharwad'];

  document.getElementById('view-survey-new').innerHTML = `
    <div class="card" style="max-width:760px">
      <div class="card-header"><div><div class="card-title">Submit New Survey Application</div><div class="card-sub">Fill all fields and submit for Taluk review</div></div></div>
      <form id="survey-form">
        <div class="form-row">
          <div class="form-group"><label class="form-label">Survey Title *</label><input type="text" class="form-input" name="title" placeholder="e.g. Hebbal Village Boundary Survey" required></div>
          <div class="form-group"><label class="form-label">Survey Type *</label><select class="form-select" name="survey_type" required><option value="">Select type…</option>${types.map(t=>`<option>${t}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Location / Village *</label><input type="text" class="form-input" name="location" placeholder="Village or area name" required></div>
        <div class="form-row-3">
          <div class="form-group"><label class="form-label">Taluk *</label><select class="form-select" name="taluk" required><option value="">Select…</option>${taluks.map(t=>`<option ${t===currentUser.taluk?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">District *</label><input type="text" class="form-input" name="district" value="${currentUser.district||''}" required></div>
          <div class="form-group"><label class="form-label">Division *</label><input type="text" class="form-input" name="division" value="${currentUser.division||''}" required></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">Area (Hectares)</label><input type="number" class="form-input" name="area_hectares" placeholder="0.00" step="0.01" min="0"></div>
          <div class="form-group"><label class="form-label">Priority</label><select class="form-select" name="priority"><option value="normal">Normal</option><option value="low">Low</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
        </div>
        <div class="form-group"><label class="form-label">Due Date</label><input type="date" class="form-input" name="due_date" min="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label class="form-label">Description</label><textarea class="form-textarea" name="description" placeholder="Describe the survey scope, objectives, and any special notes…"></textarea></div>
        <div id="form-error" class="error-msg hidden"></div>
        <div style="display:flex;gap:12px">
          <button type="submit" class="btn btn-primary">📤 Submit Survey Application</button>
          <button type="button" class="btn btn-secondary" onclick="navigate('surveys')">Cancel</button>
        </div>
      </form>
    </div>`;
  document.getElementById('survey-form').addEventListener('submit', submitSurvey);
}

async function submitSurvey(e) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  const errEl = document.getElementById('form-error');
  errEl.classList.add('hidden');
  try {
    const res = await apiFetch('/surveys', { method: 'POST', body });
    showToast(`Survey ${res.survey_no} submitted!`, 'success');
    navigate('surveys');
  } catch (err) { errEl.textContent = err.message; errEl.classList.remove('hidden'); }
}

// ─── LICENSES ─────────────────────────────────
async function loadLicenses() {
  const el = document.getElementById('view-licenses');
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⌛</div></div>';
  try {
    const licenses = await apiFetch('/licenses');
    if (!licenses) return;
    el.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div><div class="card-title">License Registry</div><div class="card-sub">${licenses.length} licenses</div></div>
          ${currentUser.role==='surveyor'?`<button class="btn btn-primary" onclick="requestRenewal()">🔄 Request Renewal</button>`:''}
        </div>
        ${licenses.length?`<div class="table-wrap"><table>
          <thead><tr><th>License No</th><th>Surveyor</th><th>Category</th><th>Issue Date</th><th>Expiry Date</th><th>Status</th><th>Days Left</th></tr></thead>
          <tbody>${licenses.map(l=>{
            const days=Math.ceil((new Date(l.expiry_date)-new Date())/(1000*86400));
            return `<tr>
              <td><span style="font-family:monospace;font-weight:600">${l.license_no}</span></td>
              <td>${l.surveyor_name||currentUser.name}${l.district?`<div class="text-sm text-muted">${l.district}</div>`:''}</td>
              <td>${l.category}</td><td>${formatDate(l.issue_date)}</td><td>${formatDate(l.expiry_date)}</td>
              <td><span class="badge badge-${l.status}">${l.status.replace(/_/g,' ')}</span></td>
              <td><span style="font-weight:700;color:${days<0?'var(--c-danger)':days<90?'var(--c-warning)':'var(--c-success)'}">${days<0?`Expired ${Math.abs(days)}d ago`:`${days}d`}</span></td>
            </tr>`;}).join('')}</tbody>
        </table></div>`:'<div class="empty-state"><div class="empty-icon">🪪</div><div class="empty-title">No licenses found</div></div>'}
      </div>`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">${err.message}</div></div>`; }
}

async function requestRenewal() {
  if (!confirm('Submit a license renewal request?')) return;
  try { await apiFetch('/licenses/renew',{method:'POST'}); showToast('Renewal request submitted!','success'); loadLicenses(); }
  catch(e){showToast(e.message,'error');}
}

// ─── USERS ────────────────────────────────────
async function loadUsers() {
  const el = document.getElementById('view-users');
  el.innerHTML = '<div class="empty-state"><div class="empty-icon">⌛</div></div>';
  try {
    const [users, perf] = await Promise.all([apiFetch('/users'), apiFetch('/users/performance').catch(()=>[])]);
    if (!users) return;

    const roleColors = {'surveyor':'#4f46e5','taluk':'#0891b2','district':'#059669','division':'#7c3aed','state':'#dc2626','state_president':'#7c2d12','state_tech':'#1d4ed8','division_tech':'#6d28d9','district_president':'#065f46','district_tech':'#0e7490'};

    el.innerHTML = `
      <div class="card mb-6">
        <div class="card-header"><div><div class="card-title">User Directory</div><div class="card-sub">${users.length} users</div></div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Name</th><th>Role</th><th>Employee ID</th><th>Jurisdiction</th><th>Phone</th><th>Status</th></tr></thead>
          <tbody>${users.map(u=>`
            <tr>
              <td><div style="font-weight:600">${u.name}</div><div class="text-sm text-muted">${u.email}</div></td>
              <td><span class="badge" style="background:${roleColors[u.role]||'#94a3b8'}20;color:${roleColors[u.role]||'#94a3b8'};text-transform:capitalize">${u.role.replace(/_/g,' ')}</span></td>
              <td><span style="font-family:monospace">${u.employee_id||'—'}</span></td>
              <td class="text-sm">${[u.taluk,u.district,u.division].filter(Boolean).join(' · ')||'—'}</td>
              <td class="text-sm">${u.phone||'—'}</td>
              <td><span class="badge ${u.is_active?'badge-active':'badge-expired'}">${u.is_active?'Active':'Inactive'}</span></td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
      ${perf?.length?`
      <div class="card">
        <div class="card-header"><div class="card-title">Surveyor Performance</div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Surveyor</th><th>Jurisdiction</th><th>Total</th><th>Completed</th><th>In Progress</th><th>Avg Progress</th></tr></thead>
          <tbody>${perf.map(p=>`
            <tr>
              <td><div style="font-weight:600">${p.name}</div><div class="text-sm text-muted">${p.employee_id}</div></td>
              <td class="text-sm">${[p.taluk,p.district].filter(Boolean).join(', ')||'—'}</td>
              <td style="font-weight:700">${p.total_surveys}</td>
              <td><span style="color:var(--c-success);font-weight:700">${p.completed}</span></td>
              <td><span style="color:var(--c-warning);font-weight:700">${p.in_progress}</span></td>
              <td><div class="progress-wrap"><div class="progress-bar"><div class="progress-fill" style="width:${p.avg_progress||0}%"></div></div><span class="progress-pct">${p.avg_progress||0}%</span></div></td>
            </tr>`).join('')}
          </tbody>
        </table></div>
      </div>`:''}`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">${err.message}</div></div>`; }
}

// ─── REPORTS ──────────────────────────────────
async function loadReports() {
  const el = document.getElementById('view-reports');
  try {
    const [stats, licStats] = await Promise.all([apiFetch('/surveys/stats'), apiFetch('/licenses/stats')]);
    el.innerHTML = `
      <div class="grid-2 mb-6">
        <div class="card">
          <div class="card-header"><div class="card-title">Survey Overview</div></div>
          <div class="grid-2">${[['Total',stats.total,'📋'],['Approved',stats.approved,'✅'],['In Progress',stats.in_progress,'⚡'],['Completed',stats.completed,'🎯'],['Pending',stats.pending,'⏳'],['Rate',stats.total?Math.round(stats.completed/stats.total*100)+'%':'0%','📊']].map(([l,v,i])=>`
            <div style="padding:14px;background:var(--c-bg);border-radius:8px;text-align:center">
              <div style="font-size:22px;margin-bottom:4px">${i}</div>
              <div style="font-size:20px;font-weight:800">${v}</div>
              <div style="font-size:11px;color:var(--c-text3)">${l}</div>
            </div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">License Status</div></div>
          <div class="grid-2">${[['Active',licStats.active,'🪪','success'],['Expired',licStats.expired,'❌','danger'],['Renewal Pending',licStats.renewal_pending,'🔄','warning'],['Expiring Soon',licStats.expiring_soon,'⚠️','warning']].map(([l,v,i,c])=>`
            <div style="padding:14px;background:var(--c-bg);border-radius:8px;text-align:center">
              <div style="font-size:22px;margin-bottom:4px">${i}</div>
              <div style="font-size:20px;font-weight:800;color:var(--c-${c})">${v}</div>
              <div style="font-size:11px;color:var(--c-text3)">${l}</div>
            </div>`).join('')}
          </div>
        </div>
      </div>
      <div class="grid-2 mb-6">
        <div class="card"><div class="card-header"><div class="card-title">Status Distribution</div></div>${buildStatusChart(stats.byStatus)}</div>
        <div class="card"><div class="card-header"><div class="card-title">Survey Types</div></div>${buildTypeChart(stats.byType)}</div>
      </div>
      ${stats.byDivision?.length>1?`<div class="card mb-6"><div class="card-header"><div class="card-title">Division-wise Distribution</div></div>${buildDivisionChart(stats.byDivision)}</div>`:''}
      ${stats.byDistrict?.length?`<div class="card mb-6"><div class="card-header"><div class="card-title">District-wise Survey Count</div></div>${buildDistrictChart(stats.byDistrict)}</div>`:''}
      <div class="card">
        <div class="card-header"><div class="card-title">Priority Analysis</div></div>
        <div style="display:flex;gap:16px;flex-wrap:wrap">${stats.byPriority.map(p=>{const cols={urgent:'var(--c-danger)',high:'var(--c-warning)',normal:'var(--c-info)',low:'#94a3b8'};return`<div style="flex:1;min-width:120px;padding:16px;background:var(--c-bg);border-radius:10px;text-align:center"><div style="font-size:28px;font-weight:800;color:${cols[p.priority]||'#94a3b8'}">${p.cnt}</div><div style="font-size:13px;text-transform:capitalize;font-weight:600;margin-top:4px">${p.priority}</div></div>`;}).join('')}</div>
      </div>`;
  } catch (err) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">${err.message}</div></div>`; }
}

// ─── PROFILE ──────────────────────────────────
function loadProfile() {
  const el = document.getElementById('view-profile');
  const u = currentUser;
  const rc = ROLE_CONFIG[u.role] || ROLE_CONFIG.state;
  const initials = u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const isKlswa = rc.group === 'klswa';

  el.innerHTML = `
    <div class="profile-hero">
      <div class="profile-avatar" style="background:${rc.color}">${initials}</div>
      <div>
        <div class="profile-name">${u.name}</div>
        <div class="profile-role">${rc.icon} ${rc.label}</div>
        <div class="profile-badges">
          ${u.employee_id?`<div class="profile-badge">ID: ${u.employee_id}</div>`:''}
          ${isKlswa?`<div class="profile-badge">🤝 ರಾಜ ಸಂಘ / KLSWA</div>`:''}
          ${u.taluk?`<div class="profile-badge">🏘️ ${u.taluk}</div>`:''}
          ${u.district?`<div class="profile-badge">📍 ${u.district}</div>`:''}
          ${u.division?`<div class="profile-badge">🗺️ ${u.division}</div>`:''}
        </div>
      </div>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="card-title mb-4">Account Information</div>
        ${[['Full Name',u.name],['Email',u.email],['Phone',u.phone||'—'],['Employee ID',u.employee_id||'—'],['Role',rc.label],['Organisation',isKlswa?'ರಾಜ ಸಂಘ / KLSWA':'Karnataka Government'],u.district?['District',u.district]:null,u.division?['Division',u.division]:null].filter(Boolean).map(([l,v])=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--c-border)">
          <span style="font-size:12px;font-weight:600;color:var(--c-text3);text-transform:uppercase;letter-spacing:.4px">${l}</span>
          <span style="font-size:13px;font-weight:500">${v}</span>
        </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-title mb-4">Change Password</div>
        <form id="pw-form">
          <div class="form-group"><label class="form-label">Current Password</label><input type="password" class="form-input" name="current_password" required></div>
          <div class="form-group"><label class="form-label">New Password</label><input type="password" class="form-input" name="new_password" minlength="6" required></div>
          <div class="form-group"><label class="form-label">Confirm Password</label><input type="password" class="form-input" name="confirm_password" minlength="6" required></div>
          <div id="pw-error" class="error-msg hidden"></div>
          <button type="submit" class="btn btn-primary">Update Password</button>
        </form>
      </div>
    </div>`;

  document.getElementById('pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const errEl = document.getElementById('pw-error');
    errEl.classList.add('hidden');
    if (fd.get('new_password') !== fd.get('confirm_password')) { errEl.textContent = 'Passwords do not match'; errEl.classList.remove('hidden'); return; }
    try {
      await apiFetch('/auth/change-password',{method:'PUT',body:{current_password:fd.get('current_password'),new_password:fd.get('new_password')}});
      showToast('Password updated!','success'); e.target.reset();
    } catch(err){errEl.textContent=err.message; errEl.classList.remove('hidden');}
  });
}

// ─── LOGOUT ───────────────────────────────────
function logout() {
  clearToken(); currentUser = null;
  document.body.className = '';
  showPage('login-page');
  renderDemoCreds('govt');
}

// ─── TOAST ────────────────────────────────────
function showToast(msg, type = 'info') {
  const colors = {success:'var(--c-success)',error:'var(--c-danger)',warning:'var(--c-warning)',info:'var(--c-info)'};
  const icons  = {success:'✅',error:'❌',warning:'⚠️',info:'ℹ️'};
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;z-index:9999;background:white;border:1px solid var(--c-border);border-left:4px solid ${colors[type]};border-radius:10px;padding:14px 18px;box-shadow:var(--shadow-lg);font-size:14px;font-weight:500;max-width:340px;display:flex;gap:10px;align-items:center`;
  t.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

// ─── UTILS ────────────────────────────────────
function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function timeAgo(d) {
  const m = Math.floor((Date.now()-new Date(d))/60000);
  if (m<1) return 'just now'; if (m<60) return `${m}m ago`;
  const h = Math.floor(m/60); if (h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

// ─── BOOT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderDemoCreds('govt');
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notif-panel');
    const btn   = document.getElementById('notif-btn');
    if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) panel.classList.add('hidden');
  });
  initApp();
});
