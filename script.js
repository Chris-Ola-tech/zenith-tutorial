// ============================================================
//  ZENITH TUTORIAL — FEE MANAGEMENT SYSTEM
//  script.js — Full Supabase Backend v2 (Fixed)
// ============================================================

// ===========================
// MOBILE SIDEBAR TOGGLE
// ===========================
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ── AUTH GUARD ───────────────────────────────────────────────
(async function authGuard() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) { window.location.href = 'index.html'; return; }
  document.getElementById('main-app').style.display = 'flex';

  const email    = session.user.email;
  const initials = email.substring(0, 2).toUpperCase();
  document.getElementById('sidebar-admin-name').textContent = email;
  document.querySelector('.topbar-avatar').textContent      = initials;
  document.querySelector('.user-avatar').textContent        = initials;

  loadDashboardStats();
  loadRecentPayments();
  loadStudentsTable();
  loadPaymentHistoryDropdown();
})();

// ── PAGE ROUTING ─────────────────────────────────────────────
const pageTitles = {
  dashboard:     ['Dashboard Overview',   'Home / Dashboard'],
  'add-student': ['Add New Student',      'Home / Add Student'],
  records:       ['Student Records',      'Home / Records'],
  payments:      ['Payment History',      'Home / Payments'],
  vip:           ['VIP Cleared Students', 'Home / VIP Access'],
  settings:      ['System Settings',      'Home / Settings']
};

function navigateTo(sectionId, navEl) {
  closeSidebar();
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + sectionId)?.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');
  const info = pageTitles[sectionId] || ['Dashboard', 'Home'];
  document.getElementById('topbar-title').textContent      = info[0];
  document.getElementById('topbar-breadcrumb').textContent = info[1];

  if (sectionId === 'dashboard') { loadDashboardStats(); loadRecentPayments(); }
  if (sectionId === 'records')   { loadStudentsTable(); }
  if (sectionId === 'vip')       { loadVipCards(); }
  if (sectionId === 'payments')  { loadPaymentHistoryDropdown(); }
}

function showSettingsPanel(panel, el) {
  document.querySelectorAll('.settings-sub-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('settings-' + panel)?.classList.remove('hidden');
  document.querySelectorAll('.settings-nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
}

// ── DATE ─────────────────────────────────────────────────────
(function setDate() {
  if (!document.getElementById('topbar-day')) return;
  const now    = new Date();
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('topbar-day').textContent  = days[now.getDay()];
  document.getElementById('topbar-date').textContent =
    `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
})();

// ── LOGOUT ───────────────────────────────────────────────────
async function handleLogout() {
  await _supabase.auth.signOut();
  window.location.href = 'index.html';
}

// ── CHANGE PASSWORD ──────────────────────────────────────────
async function changePassword() {
  const np = document.getElementById('new-password').value;
  const cp = document.getElementById('confirm-password').value;
  if (!np || !cp)    { showToast('Please fill in both fields.', 'error'); return; }
  if (np !== cp)     { showToast('Passwords do not match.', 'error'); return; }
  if (np.length < 6) { showToast('Password must be at least 6 characters.', 'error'); return; }
  const { error } = await _supabase.auth.updateUser({ password: np });
  if (error) { showToast('Error: ' + error.message, 'error'); return; }
  showToast('Password updated successfully.', 'success');
  document.getElementById('new-password').value    = '';
  document.getElementById('confirm-password').value = '';
}

// ── GENERATE 4-DIGIT PIN ──────────────────────────────────────
function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ============================================================
//  DASHBOARD
// ============================================================
async function loadDashboardStats() {
  const { data: students, error } = await _supabase
    .from('students')
    .select('total_fee, amount_paid, balance, status');
  if (error) { console.error(error); return; }

  const total       = students.length;
  const paid        = students.filter(s => s.status === 'paid').length;
  const outstanding = students.filter(s => s.status === 'partial').length;
  const revenue     = students.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
  const owed        = students.reduce((sum, s) => sum + (s.balance || 0), 0);

  document.getElementById('stat-total').textContent       = total;
  document.getElementById('stat-paid').textContent        = paid;
  document.getElementById('stat-outstanding').textContent = outstanding;
  document.getElementById('stat-revenue').textContent     = '₦' + formatAmount(revenue);
  document.getElementById('stat-owed').textContent        = '₦' + formatAmount(owed);

  const rate = total > 0 ? ((paid / total) * 100).toFixed(1) : 0;
  document.querySelector('.progress-bar-fill').style.width = rate + '%';
  document.querySelector('.progress-label-row span:last-child').textContent = rate + '%';
}

async function loadRecentPayments() {
  const { data, error } = await _supabase
    .from('payments')
    .select('amount, method, created_at, payment_date, students(name, class)')
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) { console.error(error); return; }

  const list = document.querySelector('.activity-list');
  list.innerHTML = '';
  if (!data.length) {
    list.innerHTML = '<div style="text-align:center;color:var(--gray-400);padding:20px">No payments yet.</div>';
    return;
  }
  data.forEach(p => {
    const name     = p.students?.name || 'Unknown';
    const cls      = p.students?.class || '';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    // Use payment_date if available, fall back to created_at
    const rawDate  = p.payment_date || p.created_at;
    const date     = new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    list.innerHTML += `
      <div class="activity-item">
        <div class="activity-avatar">${initials}</div>
        <div class="activity-info">
          <div class="activity-name">${name}</div>
          <div class="activity-detail">${cls} &nbsp;·&nbsp; ${p.method} &nbsp;·&nbsp; ${date}</div>
        </div>
        <div class="activity-amount">₦${p.amount.toLocaleString()}</div>
      </div>`;
  });
}

// ============================================================
//  ADD STUDENT
// ============================================================
function updateFormCalcs() {
  const total   = parseFloat(document.getElementById('total-fee').value) || 0;
  const paid    = parseFloat(document.getElementById('amount-paid').value) || 0;
  const balance = Math.max(0, total - paid);
  document.getElementById('balance-display').value =
    '₦' + balance.toLocaleString('en-NG', { minimumFractionDigits: 2 });
  const serialEl = document.getElementById('serial-display-value');
  if (paid >= total && total > 0) {
    serialEl.textContent = 'Will be generated on save';
    serialEl.className   = 'serial-active';
  } else {
    serialEl.textContent = 'Pending — Complete payment required';
    serialEl.className   = 'serial-pending';
  }
}

function previewPhoto(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = e => {
      document.getElementById('photo-preview-circle').innerHTML =
        `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

function clearStudentForm() {
  ['student-name','student-class','total-fee','amount-paid',
   'first-payment-date','payment-method','student-notes','student-enroll-date']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('balance-display').value = '₦0.00';
  document.getElementById('student-id').value      = 'Auto-generated';
  document.getElementById('serial-display-value').textContent = 'Pending — Complete payment required';
  document.getElementById('serial-display-value').className   = 'serial-pending';
  document.getElementById('photo-preview-circle').innerHTML   = `
    <div class="photo-preview-placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
      <span>No photo</span>
    </div>`;
}

async function submitStudentForm() {
  const name   = document.getElementById('student-name').value.trim();
  const grade  = document.getElementById('student-class').value;
  const total  = parseFloat(document.getElementById('total-fee').value) || 0;
  const paid   = parseFloat(document.getElementById('amount-paid').value) || 0;
  const method = document.getElementById('payment-method').value;
  const notes  = document.getElementById('student-notes').value;
  const dateP  = document.getElementById('first-payment-date').value;
  const dateE  = document.getElementById('student-enroll-date').value;

  if (!name || !grade || !total || !paid || !method) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  const balance     = Math.max(0, total - paid);
  const isFullyPaid = paid >= total;
  const serial      = isFullyPaid ? await generateSerial() : null;
  const pin         = generatePin();

  let photoUrl = null;
  const photoInput = document.getElementById('photo-file-input');
  if (photoInput.files && photoInput.files[0]) {
    photoUrl = await uploadPhoto(photoInput.files[0], name);
  }

  // Use today as payment date if not specified
  const paymentDate = dateP || new Date().toISOString().split('T')[0];

  const studentData = {
    name,
    name_lower:         name.toLowerCase(),
    class:              grade,
    total_fee:          total,
    amount_paid:        paid,
    balance,
    payment_method:     method,
    notes,
    status:             isFullyPaid ? 'paid' : 'partial',
    serial,
    serial_active:      isFullyPaid,
    vip_type:           isFullyPaid ? 'paid' : null,
    is_vip:             isFullyPaid,
    student_pin:        pin,
    photo_url:          photoUrl,
    enrollment_date:    dateE || null,
    first_payment_date: paymentDate
  };

  const { data, error } = await _supabase.from('students').insert([studentData]).select();
  if (error) { showToast('Error saving record: ' + error.message, 'error'); return; }

  // Always log first payment to payments table with the correct date
  if (paid > 0 && data[0]) {
    const { error: payErr } = await _supabase.from('payments').insert([{
      student_id:   data[0].id,
      amount:       paid,
      method,
      payment_date: paymentDate
    }]);
    if (payErr) console.error('Payment log error:', payErr);
  }

  showPinModal(name, pin, data[0]?.id?.substring(0, 8).toUpperCase());
  clearStudentForm();
  loadStudentsTable();
  loadDashboardStats();
}

// Show PIN modal after adding student
function showPinModal(name, pin, shortId) {
  const existing = document.getElementById('modal-pin-reveal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay open';
  modal.id = 'modal-pin-reveal';
  modal.innerHTML = `
    <div class="modal" style="max-width:400px">
      <div class="modal-header">
        <div class="modal-title" style="color:var(--success)">✓ Student Added Successfully</div>
        <button class="modal-close" onclick="document.getElementById('modal-pin-reveal').remove()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="modal-body">
        <div style="text-align:center; padding:10px 0">
          <div style="font-size:0.85rem;color:var(--gray-600);margin-bottom:16px">
            Share these login details with <strong>${name}</strong>:
          </div>
          <div style="background:var(--off-white);border:1.5px solid var(--gray-200);border-radius:var(--radius);padding:20px;margin-bottom:12px">
            <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--gray-400);margin-bottom:6px">Student Name (for login)</div>
            <div style="font-size:1rem;font-weight:700;color:var(--navy)">${name}</div>
          </div>
          <div style="background:var(--gold-pale);border:1.5px solid rgba(201,150,12,0.3);border-radius:var(--radius);padding:20px">
            <div style="font-size:0.7rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--gold);margin-bottom:6px">4-Digit PIN</div>
            <div style="font-size:2rem;font-weight:800;color:var(--navy);letter-spacing:0.3em;font-family:monospace">${pin}</div>
          </div>
          <div style="font-size:0.75rem;color:var(--gray-400);margin-top:14px;line-height:1.6">
            ⚠️ Write this down now. The student will use their <strong>name</strong> + this <strong>PIN</strong> to log in and view their record.
          </div>
        </div>
      </div>
      <div class="modal-footer" style="justify-content:center">
        <button class="btn-gold" onclick="document.getElementById('modal-pin-reveal').remove()">
          I've noted the PIN
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
}

async function uploadPhoto(file, studentName) {
  const filename = studentName.replace(/\s+/g, '_') + '_' + Date.now();
  const { data, error } = await _supabase.storage
    .from('student-photos').upload(filename, file, { upsert: true });
  if (error) { console.error('Photo upload error:', error); return null; }
  const { data: urlData } = _supabase.storage.from('student-photos').getPublicUrl(data.path);
  return urlData.publicUrl;
}

async function generateSerial() {
  const year = new Date().getFullYear();
  const { count } = await _supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'paid');
  const num = String((count || 0) + 1).padStart(4, '0');
  return `ZEN-${year}-${num}`;
}

async function generateTempSerial() {
  const year = new Date().getFullYear();
  const { count } = await _supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .not('temp_serial', 'is', null);
  const num = String((count || 0) + 1).padStart(4, '0');
  return `TEMP-${year}-${num}`;
}

// ============================================================
//  STUDENT RECORDS TABLE
// ============================================================
let allStudents = [];

async function loadStudentsTable() {
  const tbody = document.getElementById('records-tbody');
  tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;padding:30px;color:var(--gray-400)">Loading...</td></tr>`;

  // Always fetch fresh from DB — never rely on local cache for VIP state
  const { data, error } = await _supabase
    .from('students').select('*').order('created_at', { ascending: false });
  if (error) { showToast('Error loading students: ' + error.message, 'error'); return; }

  allStudents = data;
  renderStudentsTable(data);
  updatePaginationInfo(data.length);
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('records-tbody');
  tbody.innerHTML = '';

  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="11">
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
        </svg>
        <div class="empty-state-title">No students found</div>
        <div class="empty-state-sub">Add your first student using the Add Student page.</div>
      </div>
    </td></tr>`;
    return;
  }

  students.forEach(s => {
    const initials  = s.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const photoHtml = s.photo_url
      ? `<img src="${s.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : initials;

    // Use first_payment_date first, fall back to created_at date
    const rawDate = s.first_payment_date || s.created_at;
    const lastPay = rawDate
      ? new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';

    const isFullyPaid = s.status === 'paid';
    // FIX: cast is_vip to boolean properly — Supabase may return it as null/true/false
    const isTempVip   = s.is_vip === true && s.vip_type === 'temp';

    const displaySerial = isFullyPaid && s.serial
      ? `<span class="serial-tag">${s.serial}</span>`
      : isTempVip && s.temp_serial
        ? `<span style="font-size:0.75rem;font-weight:600;padding:3px 8px;border-radius:5px;background:rgba(26,50,96,0.08);color:var(--navy-light)">${s.temp_serial}</span>`
        : `<span class="serial-pending-tag">Pending</span>`;

    // VIP column — re-check fresh state from DB record
    let vipHtml = '';
    if (isFullyPaid) {
      vipHtml = `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;font-size:0.73rem;font-weight:700;background:linear-gradient(135deg,var(--gold),var(--gold-light));color:var(--navy)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        Permanent
      </span>`;
    } else if (isTempVip) {
      vipHtml = `<button onclick="revokeTempVip('${s.id}')"
        style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;border:1.5px solid var(--navy-light);cursor:pointer;font-size:0.73rem;font-weight:700;background:rgba(26,50,96,0.08);color:var(--navy-light)">
        🔷 Temp · Revoke
      </button>`;
    } else {
      vipHtml = `<button onclick="grantTempVip('${s.id}')"
        style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;border:1.5px solid var(--gray-200);cursor:pointer;font-size:0.73rem;font-weight:600;background:transparent;color:var(--gray-400)">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        Grant Temp
      </button>`;
    }

    tbody.innerHTML += `
      <tr>
        <td data-label="Photo"><div class="table-avatar">${photoHtml}</div></td>
        <td data-label="Name">
          <div class="table-name">${s.name}</div>
          <div class="table-class">PIN: ${s.student_pin || '—'}</div>
        </td>
        <td data-label="Course">${s.class}</td>
        <td data-label="Total Fee" class="amount-cell">₦${s.total_fee.toLocaleString()}</td>
        <td data-label="Paid" class="amount-cell" style="color:${isFullyPaid ? 'var(--success)' : 'var(--warning)'}">
          ₦${s.amount_paid.toLocaleString()}
        </td>
        <td data-label="Balance" class="amount-cell ${s.balance > 0 ? 'balance-positive' : 'balance-zero'}">
          ₦${s.balance.toLocaleString()}
        </td>
        <td data-label="Serial">${displaySerial}</td>
        <td data-label="Status">
          <span class="badge ${isFullyPaid ? 'badge-success' : 'badge-warning'}">
            ${isFullyPaid ? 'Paid' : 'Partial'}
          </span>
        </td>
        <td data-label="VIP">${vipHtml}</td>
        <td data-label="Last Payment" class="text-sm" style="color:var(--gray-400)">${lastPay}</td>
        <td data-label="Actions">
          <div class="table-actions">
            <button class="action-btn edit" onclick="openEditModal('${s.id}')">Edit</button>
            <button class="action-btn pay"  onclick="openPaymentModal('${s.id}')">+ Pay</button>
            <button class="action-btn del"  onclick="confirmDelete('${s.id}')">Del</button>
          </div>
        </td>
      </tr>`;
  });
}

function updatePaginationInfo(count) {
  document.querySelector('.pagination-info').textContent =
    `Showing ${count} of ${count} student${count !== 1 ? 's' : ''}`;
}

function filterRecordsTable() {
  const q      = document.getElementById('records-search').value.toLowerCase();
  const filter = document.getElementById('records-filter').value;
  const filtered = allStudents.filter(s => {
    const matchSearch = !q || s.name.toLowerCase().includes(q);
    const matchFilter = filter === 'all' || s.status === filter;
    return matchSearch && matchFilter;
  });
  renderStudentsTable(filtered);
}

// ============================================================
//  VIP MANAGEMENT — FIX: always re-fetch from DB after changes
// ============================================================

async function grantTempVip(studentId) {
  const tempSerial = await generateTempSerial();

  const { error } = await _supabase.from('students').update({
    is_vip:      true,
    vip_type:    'temp',
    temp_serial: tempSerial
  }).eq('id', studentId);

  if (error) { showToast('Error granting VIP: ' + error.message, 'error'); return; }

  showToast(`Temp VIP granted. Serial: ${tempSerial}`, 'success');

  // FIX: Always reload from DB — don't rely on patching local array
  await loadStudentsTable();

  // Also refresh VIP page if it's open
  if (document.getElementById('section-vip').classList.contains('active')) {
    await loadVipCards();
  }
}

async function revokeTempVip(studentId) {
  const student = allStudents.find(s => s.id === studentId);
  if (student?.status === 'paid') {
    showToast('Cannot revoke VIP from a fully paid student.', 'error');
    return;
  }

  const { error } = await _supabase.from('students').update({
    is_vip:      false,
    vip_type:    null,
    temp_serial: null
  }).eq('id', studentId);

  if (error) { showToast('Error revoking VIP: ' + error.message, 'error'); return; }

  showToast('Temp VIP revoked.', 'info');

  // FIX: Always reload from DB
  await loadStudentsTable();

  if (document.getElementById('section-vip').classList.contains('active')) {
    await loadVipCards();
  }
}

// ============================================================
//  VIP PAGE — FIX: query uses explicit boolean true check
// ============================================================
async function loadVipCards() {
  const grid = document.getElementById('vip-cards-grid');
  grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)">Loading...</div>';

  // FIX: Fetch paid students and temp VIP students in two separate queries
  // because .or() with boolean columns can be unreliable depending on schema type
  const { data: paidStudents, error: e1 } = await _supabase
    .from('students')
    .select('*')
    .eq('status', 'paid')
    .order('created_at', { ascending: false });

  const { data: tempVipStudents, error: e2 } = await _supabase
    .from('students')
    .select('*')
    .eq('is_vip', true)
    .eq('vip_type', 'temp')
    .order('created_at', { ascending: false });

  if (e1 || e2) { showToast('Error loading VIP students', 'error'); return; }

  // Merge and deduplicate by ID
  const seen = new Set();
  const combined = [];
  for (const s of [...(paidStudents || []), ...(tempVipStudents || [])]) {
    if (!seen.has(s.id)) { seen.add(s.id); combined.push(s); }
  }

  renderVipCards(combined);
}

function renderVipCards(students) {
  const grid = document.getElementById('vip-cards-grid');
  grid.innerHTML = '';

  if (!students.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
        <div class="empty-state-title">No VIP students yet</div>
        <div class="empty-state-sub">Students appear here once fully paid or granted temp VIP.</div>
      </div>`;
    return;
  }

  students.forEach(s => {
    const initials   = s.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const photoHtml  = s.photo_url
      ? `<img src="${s.photo_url}" style="width:100%;height:100%;object-fit:cover">`
      : initials;
    const isFullyPaid = s.status === 'paid';
    const isTempVip   = s.is_vip === true && s.vip_type === 'temp';

    const cardBorder = isFullyPaid
      ? 'linear-gradient(90deg, var(--gold), var(--gold-light))'
      : 'linear-gradient(90deg, var(--navy-light), var(--navy))';

    const serialDisplay = isFullyPaid && s.serial
      ? s.serial
      : isTempVip && s.temp_serial
        ? s.temp_serial
        : '—';

    const statusTag = isFullyPaid
      ? `<span class="vip-status-tag">CLEARED</span>`
      : `<span style="display:inline-flex;align-items:center;gap:5px;background:rgba(26,50,96,0.1);color:var(--navy-light);padding:5px 12px;border-radius:20px;font-size:0.75rem;font-weight:700;letter-spacing:0.04em">🔷 TEMP VIP</span>`;

    const actionBtn = isFullyPaid
      ? `<button class="btn-regen" onclick="regenSerial('${s.id}', '${s.serial}')">↺ Regen</button>`
      : `<button onclick="revokeTempVip('${s.id}')" style="margin-left:auto;padding:5px 12px;border:1.5px solid var(--danger);background:transparent;color:var(--danger);border-radius:6px;font-size:0.75rem;font-weight:600;cursor:pointer">Revoke VIP</button>`;

    grid.innerHTML += `
      <div class="vip-student-card" data-name="${s.name.toLowerCase()}" data-serial="${serialDisplay}">
        <div style="position:absolute;top:0;left:0;right:0;height:4px;background:${cardBorder}"></div>
        <div class="vip-card-top">
          <div class="vip-avatar">${photoHtml}</div>
          <div class="vip-card-info">
            <div class="vip-student-name">${s.name}</div>
            <div class="vip-student-class">${s.class} &nbsp;·&nbsp; PIN: ${s.student_pin || '—'}</div>
          </div>
        </div>
        <div class="vip-serial-section" style="${isTempVip ? 'background:rgba(26,50,96,0.05);border-color:rgba(26,50,96,0.15)' : ''}">
          <div class="vip-serial-label" style="${isTempVip ? 'color:var(--navy-light)' : ''}">
            ${isFullyPaid ? 'Clearance Serial Number' : 'Temporary Access Serial'}
          </div>
          <div class="vip-serial-number">${serialDisplay}</div>
        </div>
        <div class="vip-card-details">
          <div class="vip-detail-row">
            <span class="vip-detail-key">Total Fee</span>
            <span class="vip-detail-val">₦${s.total_fee.toLocaleString()}</span>
          </div>
          <div class="vip-detail-row">
            <span class="vip-detail-key">Amount Paid</span>
            <span class="vip-detail-val" style="color:var(--success)">₦${s.amount_paid.toLocaleString()}</span>
          </div>
          <div class="vip-detail-row">
            <span class="vip-detail-key">Balance</span>
            <span class="vip-detail-val" style="color:${s.balance > 0 ? 'var(--danger)' : 'var(--success)'}">
              ${s.balance > 0 ? '₦' + s.balance.toLocaleString() : 'None'}
            </span>
          </div>
          <div class="vip-detail-row">
            <span class="vip-detail-key">VIP Type</span>
            <span class="vip-detail-val" style="color:${isFullyPaid ? 'var(--gold)' : 'var(--navy-light)'}">
              ${isFullyPaid ? 'Permanent (Paid)' : 'Temporary (Admin)'}
            </span>
          </div>
        </div>
        <div class="vip-card-footer">
          ${statusTag}
          ${actionBtn}
        </div>
      </div>`;
  });
}

function filterVipCards() {
  const q     = document.getElementById('vip-search').value.toLowerCase();
  const cards = document.querySelectorAll('.vip-student-card');
  cards.forEach(card => {
    const name   = card.dataset.name   || '';
    const serial = card.dataset.serial || '';
    card.style.display = (!q || name.includes(q) || serial.toLowerCase().includes(q)) ? '' : 'none';
  });
}

// ============================================================
//  PAYMENT HISTORY — FIX: show date correctly from payment_date
// ============================================================
async function loadPaymentHistoryDropdown() {
  const freshSelect = document.getElementById('payment-history-student');
  freshSelect.innerHTML = '<option value="">Select a student...</option>';
  const { data } = await _supabase.from('students').select('id, name, class').order('name');
  if (data) {
    data.forEach(s => {
      freshSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.class})</option>`;
    });
  }
  freshSelect.onchange = () => loadPaymentHistory(freshSelect.value);
}

async function loadPaymentHistory(studentId) {
  if (!studentId) return;
  const list = document.querySelector('.payment-history-list');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400)">Loading...</div>';

  const { data, error } = await _supabase
    .from('payments').select('*')
    .eq('student_id', studentId)
    .order('payment_date', { ascending: false });

  if (error || !data || !data.length) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400)">No payment records found.</div>';
    return;
  }

  let totalPaid = 0;
  list.innerHTML = '';
  data.forEach(p => {
    totalPaid += p.amount;

    // FIX: prefer payment_date column, fall back to created_at
    const rawDate = p.payment_date || p.created_at;
    const date = new Date(rawDate).toLocaleString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    list.innerHTML += `
      <div class="payment-history-item">
        <div class="ph-left">
          <div class="ph-date">${date}</div>
          <div class="ph-method">${p.method || '—'}</div>
          <div class="ph-by">Recorded by: Admin</div>
        </div>
        <div class="ph-amount">+ ₦${p.amount.toLocaleString()}</div>
      </div>`;
  });

  const infoEl = document.querySelector('[style*="Total payments"]');
  if (infoEl) infoEl.textContent =
    `Total payments: ${data.length}  ·  Total collected: ₦${totalPaid.toLocaleString()}`;
}

// ============================================================
//  EDIT MODAL
// ============================================================
let _editStudentId = null;

async function openEditModal(studentId) {
  _editStudentId = studentId;
  const { data: s, error } = await _supabase.from('students').select('*').eq('id', studentId).single();
  if (error) { showToast('Error loading student', 'error'); return; }

  document.getElementById('edit-name').value        = s.name;
  document.getElementById('edit-total-fee').value   = s.total_fee;
  document.getElementById('edit-amount-paid').value = s.amount_paid;
  document.getElementById('edit-balance').value     = '₦' + s.balance.toLocaleString();
  document.getElementById('edit-notes').value       = s.notes || '';

  const classSelect = document.getElementById('edit-class');
  const opts = classSelect.options;
  for (let i = 0; i < opts.length; i++) {
    opts[i].selected = (opts[i].value === s.class || opts[i].text === s.class);
  }

  document.getElementById('modal-edit').classList.add('open');
}

function updateEditCalcs() {
  const total = parseFloat(document.getElementById('edit-total-fee').value) || 0;
  const paid  = parseFloat(document.getElementById('edit-amount-paid').value) || 0;
  document.getElementById('edit-balance').value = '₦' + Math.max(0, total - paid).toLocaleString('en-NG');
}

async function saveEditStudent() {
  const name    = document.getElementById('edit-name').value.trim();
  const grade   = document.getElementById('edit-class').value;
  const total   = parseFloat(document.getElementById('edit-total-fee').value) || 0;
  const paid    = parseFloat(document.getElementById('edit-amount-paid').value) || 0;
  const notes   = document.getElementById('edit-notes').value;
  const balance = Math.max(0, total - paid);
  const isFullyPaid = paid >= total;

  let serial = null, serialActive = false, vipType = null, isVip = false;
  if (isFullyPaid) {
    const { data: existing } = await _supabase.from('students').select('serial').eq('id', _editStudentId).single();
    serial       = existing?.serial || await generateSerial();
    serialActive = true;
    vipType      = 'paid';
    isVip        = true;
  }

  const updates = {
    name, name_lower: name.toLowerCase(), class: grade,
    total_fee: total, amount_paid: paid, balance, notes,
    status: isFullyPaid ? 'paid' : 'partial',
    ...(isFullyPaid && { serial, serial_active: serialActive, vip_type: vipType, is_vip: isVip })
  };

  const { error } = await _supabase.from('students').update(updates).eq('id', _editStudentId);
  if (error) { showToast('Error updating record: ' + error.message, 'error'); return; }

  closeModal('modal-edit');
  showToast('Student record updated successfully.', 'success');
  loadStudentsTable();
  loadDashboardStats();
}

// ============================================================
//  PAYMENT MODAL
// ============================================================
let _payStudentId = null, _payStudentBalance = 0;

async function openPaymentModal(studentId) {
  _payStudentId = studentId;
  const { data: s } = await _supabase.from('students')
    .select('name, class, balance').eq('id', studentId).single();
  _payStudentBalance = s?.balance || 0;

  const modalInfo = document.querySelector('#modal-payment .modal-body > div:first-child');
  modalInfo.querySelector('div:first-child').textContent = s?.name || '';
  modalInfo.querySelector('div:last-child').innerHTML =
    `${s?.class} &nbsp;·&nbsp; Balance: <span style="color:var(--danger);font-weight:600">₦${_payStudentBalance.toLocaleString()}</span>`;

  document.getElementById('new-payment-amount').value  = '';
  document.getElementById('new-payment-balance').value = '₦' + _payStudentBalance.toLocaleString();
  document.getElementById('new-payment-date').value    = new Date().toISOString().split('T')[0];
  document.getElementById('serial-gen-note').classList.add('hidden');
  document.getElementById('modal-payment').classList.add('open');
}

function updatePaymentCalcs() {
  const adding     = parseFloat(document.getElementById('new-payment-amount').value) || 0;
  const newBalance = Math.max(0, _payStudentBalance - adding);
  document.getElementById('new-payment-balance').value = '₦' + newBalance.toLocaleString('en-NG');
  document.getElementById('serial-gen-note').classList.toggle('hidden', newBalance > 0);
}

async function saveNewPayment() {
  const amount = parseFloat(document.getElementById('new-payment-amount').value) || 0;
  const method = document.getElementById('new-payment-method').value;
  const date   = document.getElementById('new-payment-date').value;

  if (!amount || !method || !date) { showToast('Please fill in all payment fields.', 'error'); return; }

  const { data: s } = await _supabase.from('students').select('*').eq('id', _payStudentId).single();
  const newAmountPaid  = (s.amount_paid || 0) + amount;
  const newBalance     = Math.max(0, s.total_fee - newAmountPaid);
  const isNowFullyPaid = newBalance === 0;

  let serial = s.serial, serialActive = s.serial_active;
  let vipType = s.vip_type, isVip = s.is_vip;

  if (isNowFullyPaid && !s.serial) {
    serial       = await generateSerial();
    serialActive = true;
    vipType      = 'paid';
    isVip        = true;
  }

  const { error: updateError } = await _supabase.from('students').update({
    amount_paid:   newAmountPaid,
    balance:       newBalance,
    status:        isNowFullyPaid ? 'paid' : 'partial',
    serial,
    serial_active: serialActive,
    vip_type:      vipType,
    is_vip:        isVip
  }).eq('id', _payStudentId);

  if (updateError) { showToast('Error updating student: ' + updateError.message, 'error'); return; }

  // FIX: always save payment_date explicitly so history shows correct date
  const { error: payErr } = await _supabase.from('payments').insert([{
    student_id:   _payStudentId,
    amount,
    method,
    payment_date: date
  }]);
  if (payErr) console.error('Payment insert error:', payErr);

  closeModal('modal-payment');
  showToast(isNowFullyPaid ? '✓ Full payment! Permanent serial generated.' : 'Payment recorded!', 'success');
  loadStudentsTable();
  loadDashboardStats();
  loadRecentPayments();
}

// ============================================================
//  DELETE MODAL
// ============================================================
let _deleteStudentId = null;

function confirmDelete(studentId) {
  _deleteStudentId = studentId;
  document.getElementById('modal-delete').classList.add('open');
}

async function executeDelete() {
  await _supabase.from('payments').delete().eq('student_id', _deleteStudentId);
  const { error } = await _supabase.from('students').delete().eq('id', _deleteStudentId);
  if (error) { showToast('Error deleting: ' + error.message, 'error'); return; }
  closeModal('modal-delete');
  showToast('Student record deleted.', 'info');
  loadStudentsTable();
  loadDashboardStats();
}

// ============================================================
//  REGEN SERIAL
// ============================================================
let _regenStudentId = null;

function regenSerial(studentId, currentSerial) {
  _regenStudentId = studentId;
  document.getElementById('regen-old-serial').textContent = currentSerial;
  document.getElementById('modal-regen').classList.add('open');
}

async function executeRegenSerial() {
  const oldSerial = document.getElementById('regen-old-serial').textContent;
  const newSerial = await generateSerial();

  await _supabase.from('serial_history').insert([{
    student_id: _regenStudentId, old_serial: oldSerial,
    new_serial: newSerial, revoked_at: new Date().toISOString()
  }]);

  const { error } = await _supabase.from('students').update({
    serial: newSerial, serial_active: true
  }).eq('id', _regenStudentId);

  if (error) { showToast('Error regenerating serial: ' + error.message, 'error'); return; }
  closeModal('modal-regen');
  showToast('Serial number regenerated!', 'success');
  loadVipCards();
}

// ============================================================
//  MODAL HELPERS
// ============================================================
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ============================================================
//  TOAST
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  toast.innerHTML = `<span style="font-size:1rem">${icons[type] || 'ℹ'}</span> ${message}`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity    = '0';
    toast.style.transform  = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================
//  HELPERS
// ============================================================
function formatAmount(num) {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000)     return (num / 1_000).toFixed(0) + 'K';
  return num.toLocaleString();
}

// ============================================================
//  RESET ALL
// ============================================================
function confirmResetAll() {
  document.getElementById('reset-confirm-input').value = '';
  document.getElementById('modal-reset-all').classList.add('open');
}

async function executeResetAll() {
  const input = document.getElementById('reset-confirm-input').value.trim();
  if (input !== 'DELETE') { showToast('You must type DELETE to confirm.', 'error'); return; }

  showToast('Deleting all records...', 'info');
  await _supabase.from('serial_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await _supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  const { error } = await _supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) { showToast('Error resetting: ' + error.message, 'error'); return; }

  closeModal('modal-reset-all');
  showToast('✓ All records deleted. System is now empty.', 'success');
  loadDashboardStats();
  loadStudentsTable();
  loadRecentPayments();
}