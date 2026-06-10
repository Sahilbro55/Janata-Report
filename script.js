/**
 * JANATA REPORT – Civic Issue Reporting System
 * script.js – All JS logic (localStorage, geolocation, status updates)
 */

/* ─── Helpers ─────────────────────────────────── */
const LS_KEY = 'reports';

function getReports() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveReports(reports) {
  localStorage.setItem(LS_KEY, JSON.stringify(reports));
}

function generateId() {
  return 'JR-' + Date.now().toString().slice(-6);
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

function categoryIcon(cat) {
  const map = {
    Electricity: '⚡',
    Water: '💧',
    Road: '🛣️',
    Garbage: '🗑️',
    Streetlight: '💡',
    Other: '📋'
  };
  return map[cat] || '📋';
}

/* ─── Navbar Toggle ───────────────────────────── */
document.addEventListener('DOMContentLoaded', function () {
  const toggle = document.getElementById('navToggle');
  const links  = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      const expanded = links.classList.contains('open');
      toggle.setAttribute('aria-expanded', expanded);
    });
  }

  // Route to correct init
  const page = document.body.dataset.page;
  if (page === 'report')    initReportPage();
  if (page === 'dashboard') initDashboardPage();
  if (page === 'admin')     initAdminPage();
});

/* ─── REPORT PAGE ──────────────────────────────── */
function initReportPage() {
  const form        = document.getElementById('reportForm');
  const locBtn      = document.getElementById('getLocationBtn');
  const locDisplay  = document.getElementById('locationDisplay');
  const successMsg  = document.getElementById('successMsg');
  const uploadArea  = document.getElementById('uploadArea');
  const fileInput   = document.getElementById('photoInput');
  const fileLabel   = document.getElementById('fileLabel');

  let capturedLocation = null;

  // File upload label update
  if (fileInput) {
    fileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        fileLabel.textContent = '✅ ' + this.files[0].name;
      }
    });
  }

  // Geolocation
  if (locBtn) {
    locBtn.addEventListener('click', function () {
      if (!navigator.geolocation) {
        locDisplay.textContent = '⚠ Geolocation not supported in this browser.';
        return;
      }
      locBtn.textContent = '📡 Detecting...';
      locBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        function (pos) {
          const lat  = pos.coords.latitude.toFixed(5);
          const long = pos.coords.longitude.toFixed(5);
          capturedLocation = { lat, long };
          locDisplay.textContent = `📍 Lat: ${lat}, Long: ${long}`;
          locDisplay.style.color = '#16a34a';
          locBtn.textContent = '✅ Location Captured';
          locBtn.style.background = '#dcfce7';
          locBtn.style.color      = '#166534';
          locBtn.style.borderColor = '#86efac';
          locBtn.disabled = false;
        },
        function (err) {
          let msg = '⚠ Could not get location.';
          if (err.code === 1) msg = '⚠ Location permission denied.';
          locDisplay.textContent = msg;
          locDisplay.style.color = '#ef4444';
          locBtn.textContent = '📍 Get My Location';
          locBtn.disabled = false;
        },
        { timeout: 10000 }
      );
    });
  }

  // Form submit
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      const name     = document.getElementById('repName').value.trim();
      const phone    = document.getElementById('repPhone').value.trim();
      const category = document.getElementById('repCategory').value;
      const title    = document.getElementById('repTitle').value.trim();
      const desc     = document.getElementById('repDesc').value.trim();
      const ward     = document.getElementById('repWard').value.trim();

      if (!name || !category || !title || !desc) {
        alert('Please fill in all required fields.');
        return;
      }

      const report = {
        id:        generateId(),
        timestamp: Date.now(),
        name,
        phone,
        category,
        title,
        description: desc,
        ward,
        status:    'Pending',
        location:  capturedLocation || { lat: null, long: null }
      };

      const reports = getReports();
      reports.unshift(report);
      saveReports(reports);

      // Show success
      successMsg.classList.add('show');
      form.reset();
      capturedLocation = null;
      if (locDisplay) {
        locDisplay.textContent = 'Location not captured yet';
        locDisplay.style.color = '';
      }
      if (locBtn) {
        locBtn.textContent    = '📍 Get My Location';
        locBtn.style.background = '';
        locBtn.style.color    = '';
        locBtn.style.borderColor = '';
      }
      if (fileLabel) fileLabel.textContent = 'Click to browse or drag & drop';

      // Scroll to success msg
      successMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Auto-hide success after 6s
      setTimeout(() => successMsg.classList.remove('show'), 6000);
    });
  }
}

/* ─── DASHBOARD PAGE ──────────────────────────── */
function initDashboardPage() {
  renderDashboard();

  const filterCat    = document.getElementById('filterCat');
  const filterStatus = document.getElementById('filterStatus');
  const searchInput  = document.getElementById('searchInput');
  const refreshBtn   = document.getElementById('refreshBtn');

  [filterCat, filterStatus, searchInput].forEach(el => {
    if (el) el.addEventListener('change', renderDashboard);
  });
  if (searchInput) searchInput.addEventListener('input', renderDashboard);
  if (refreshBtn)  refreshBtn.addEventListener('click', renderDashboard);
}

function renderDashboard() {
  let reports = getReports();

  // Update stats
  updateStats(reports);

  // Filters
  const cat    = document.getElementById('filterCat')?.value    || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();

  if (cat)    reports = reports.filter(r => r.category === cat);
  if (status) reports = reports.filter(r => r.status   === status);
  if (search) reports = reports.filter(r =>
    r.title.toLowerCase().includes(search) ||
    r.name.toLowerCase().includes(search)  ||
    r.id.toLowerCase().includes(search)
  );

  const tbody = document.getElementById('reportsBody');
  if (!tbody) return;

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h4>No reports found</h4>
        <p>No civic reports match your current filters. Try adjusting your search or submit a new report.</p>
        <a href="report.html" class="btn btn-blue">Submit a Report</a>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => `
    <tr>
      <td><span style="font-family:monospace;font-size:12px;font-weight:700;color:var(--blue)">${r.id}</span></td>
      <td>${formatDate(r.timestamp)}</td>
      <td>
        <span class="cat-badge cat-${r.category.toLowerCase()}">
          ${categoryIcon(r.category)} ${r.category}
        </span>
      </td>
      <td style="max-width:220px">
        <strong style="display:block;font-size:13px">${escapeHtml(r.title)}</strong>
        <span style="font-size:12px;color:var(--gray-400)">${escapeHtml(r.description).slice(0,60)}${r.description.length>60?'…':''}</span>
      </td>
      <td>${escapeHtml(r.name)}</td>
      <td>${r.location?.lat ? `<span style="font-size:11px;color:var(--gray-400)">📍 ${r.location.lat}, ${r.location.long}</span>` : '<span style="font-size:12px;color:var(--gray-400)">—</span>'}</td>
      <td><span class="status-badge status-${statusClass(r.status)}">${r.status}</span></td>
    </tr>
  `).join('');
}

/* ─── ADMIN PAGE ──────────────────────────────── */
function initAdminPage() {
  renderAdmin();

  const filterCat    = document.getElementById('filterCat');
  const filterStatus = document.getElementById('filterStatus');
  const searchInput  = document.getElementById('searchInput');
  const refreshBtn   = document.getElementById('refreshBtn');
  const clearBtn     = document.getElementById('clearAllBtn');

  [filterCat, filterStatus, searchInput].forEach(el => {
    if (el) el.addEventListener('change', renderAdmin);
  });
  if (searchInput) searchInput.addEventListener('input', renderAdmin);
  if (refreshBtn)  refreshBtn.addEventListener('click', renderAdmin);

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (confirm('⚠ Are you sure you want to delete ALL reports? This cannot be undone.')) {
        saveReports([]);
        renderAdmin();
      }
    });
  }
}

function renderAdmin() {
  let reports = getReports();

  updateStats(reports);

  const cat    = document.getElementById('filterCat')?.value    || '';
  const status = document.getElementById('filterStatus')?.value || '';
  const search = (document.getElementById('searchInput')?.value || '').toLowerCase();

  if (cat)    reports = reports.filter(r => r.category === cat);
  if (status) reports = reports.filter(r => r.status   === status);
  if (search) reports = reports.filter(r =>
    r.title.toLowerCase().includes(search) ||
    r.name.toLowerCase().includes(search)  ||
    r.id.toLowerCase().includes(search)
  );

  const tbody = document.getElementById('reportsBody');
  if (!tbody) return;

  if (reports.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h4>No reports to manage</h4>
        <p>All civic reports will appear here once citizens submit them.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = reports.map(r => `
    <tr id="row-${r.id}">
      <td><span style="font-family:monospace;font-size:12px;font-weight:700;color:var(--blue)">${r.id}</span></td>
      <td>${formatDate(r.timestamp)}</td>
      <td>
        <span class="cat-badge cat-${r.category.toLowerCase()}">
          ${categoryIcon(r.category)} ${r.category}
        </span>
      </td>
      <td style="max-width:200px">
        <strong style="display:block;font-size:13px">${escapeHtml(r.title)}</strong>
        <span style="font-size:12px;color:var(--gray-400)">${escapeHtml(r.description).slice(0,55)}${r.description.length>55?'…':''}</span>
      </td>
      <td>${escapeHtml(r.name)}<br><span style="font-size:11px;color:var(--gray-400)">${r.phone || ''}</span></td>
      <td><span class="status-badge status-${statusClass(r.status)}">${r.status}</span></td>
      <td>
        <div class="action-group">
          <button class="btn btn-red btn-sm"      onclick="updateStatus('${r.id}', 'Pending')">⏳ Pending</button>
          <button class="btn btn-orange btn-sm"   onclick="updateStatus('${r.id}', 'In Progress')">🔧 In Progress</button>
          <button class="btn btn-green btn-sm"    onclick="updateStatus('${r.id}', 'Resolved')">✅ Resolved</button>
        </div>
      </td>
      <td>
        <button class="btn btn-sm" style="background:#fee2e2;color:#991b1b" onclick="deleteReport('${r.id}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

/* ─── Status Update ───────────────────────────── */
function updateStatus(id, newStatus) {
  const reports = getReports();
  const report  = reports.find(r => r.id === id);
  if (!report) return;
  report.status = newStatus;
  saveReports(reports);
  renderAdmin();

  // Flash row
  const row = document.getElementById('row-' + id);
  if (row) {
    row.style.background = '#f0fdf4';
    setTimeout(() => { row.style.background = ''; }, 800);
  }
}

/* ─── Delete Report ───────────────────────────── */
function deleteReport(id) {
  if (!confirm('Delete this report? This cannot be undone.')) return;
  const reports = getReports().filter(r => r.id !== id);
  saveReports(reports);
  renderAdmin();
}

/* ─── Stats ───────────────────────────────────── */
function updateStats(reports) {
  const total    = reports.length;
  const pending  = reports.filter(r => r.status === 'Pending').length;
  const progress = reports.filter(r => r.status === 'In Progress').length;
  const resolved = reports.filter(r => r.status === 'Resolved').length;

  setEl('statTotal',    total);
  setEl('statPending',  pending);
  setEl('statProgress', progress);
  setEl('statResolved', resolved);
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ─── Utilities ───────────────────────────────── */
function statusClass(status) {
  const map = { 'Pending': 'pending', 'In Progress': 'progress', 'Resolved': 'resolved' };
  return map[status] || 'pending';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str || ''));
  return div.innerHTML;
}
