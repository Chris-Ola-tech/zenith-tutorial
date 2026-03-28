// ============================================================
//  ZENITH TUTORIAL — FEE MANAGEMENT SYSTEM
//  script.js — Full Supabase Backend
// ============================================================
 
// ── AUTH GUARD ───────────────────────────────────────────────
(async function authGuard() {
  const { data: { session } } = await _supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
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
    .select('amount, method, created_at, students(name, class)')
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
    const date     = new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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
  document.getElementById('balance-display').value = '₦' + balance.toLocaleString('en-NG', { minimumFractionDigits: 2 });
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
 
  let photoUrl = null;
  const photoInput = document.getElementById('photo-file-input');
  if (photoInput.files && photoInput.files[0]) {
    photoUrl = await uploadPhoto(photoInput.files[0], name);
  }
 
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
    photo_url:          photoUrl,
    enrollment_date:    dateE || null,
    first_payment_date: dateP || null
  };
 
  const { data, error } = await _supabase.from('students').insert([studentData]).select();
 
  if (error) {
    showToast('Error saving record: ' + error.message, 'error');
    return;
  }
 
  if (paid > 0 && data[0]) {
    await _supabase.from('payments').insert([{
      student_id:   data[0].id,
      amount:       paid,
      method,
      payment_date: dateP || new Date().toISOString().split('T')[0]
    }]);
  }
 
  showToast('Student record saved successfully!', 'success');
  clearStudentForm();
  loadStudentsTable();
  loadDashboardStats();
}
 
async function uploadPhoto(file, studentName) {
  const filename = studentName.replace(/\s+/g, '_') + '_' + Date.now();
  const { data, error } = await _supabase.storage
    .from('student-photos')
    .upload(filename, file, { upsert: true });
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
 
// ============================================================
//  STUDENT RECORDS TABLE
// ============================================================
let allStudents = [];
 
async function loadStudentsTable() {
  const tbody = document.getElementById('records-tbody');
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:var(--gray-400)">Loading...</td></tr>';
 
  const { data, error } = await _supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false });
 
  if (error) { showToast('Error loading students: ' + error.message, 'error'); return; }
 
  allStudents = data;
  renderStudentsTable(data);
  updatePaginationInfo(data.length);
}
 
function renderStudentsTable(students) {
  const tbody = document.getElementById('records-tbody');
  tbody.innerHTML = '';
 
  if (!students.length) {
    tbody.innerHTML = `<tr><td colspan="10">
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
    const lastPay = s.first_payment_date
      ? new Date(s.first_payment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
 
    tbody.innerHTML += `
      <tr>
        <td><div class="table-avatar">${photoHtml}</div></td>
        <td>
          <div class="table-name">${s.name}</div>
          <div class="table-class">ID: ${s.id.substring(0, 8).toUpperCase()}</div>
        </td>
        <td>${s.class}</td>
        <td class="amount-cell">₦${s.total_fee.toLocaleString()}</td>
        <td class="amount-cell" style="color:${s.status === 'paid' ? 'var(--success)' : 'var(--warning)'}">
          ₦${s.amount_paid.toLocaleString()}
        </td>
        <td class="amount-cell ${s.balance > 0 ? 'balance-positive' : 'balance-zero'}">
          ₦${s.balance.toLocaleString()}
        </td>
        <td>${s.serial
          ? `<span class="serial-tag">${s.serial}</span>`
          : `<span class="serial-pending-tag">Pending</span>`}
        </td>
        <td><span class="badge ${s.status === 'paid' ? 'badge-success' : 'badge-warning'}">
          ${s.status === 'paid' ? 'Paid' : 'Partial'}
        </span></td>
        <td class="text-sm" style="color:var(--gray-400)">${lastPay}</td>
        <td>
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
//  VIP STUDENTS
// ============================================================
async function loadVipCards() {
  const grid = document.getElementById('vip-cards-grid');
  grid.innerHTML = '<div style="text-align:center;padding:40px;color:var(--gray-400)">Loading...</div>';
 
  const { data, error } = await _supabase
    .from('students')
    .select('*')
    .eq('status', 'paid')
    .eq('serial_active', true)
    .order('created_at', { ascending: false });
 
  if (error) { showToast('Error loading VIP students', 'error'); return; }
  renderVipCards(data);
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
        <div class="empty-state-title">No cleared students yet</div>
        <div class="empty-state-sub">Students appear here once they complete full payment.</div>
      </div>`;
    return;
  }
 
  students.forEach(s => {
    const initials  = s.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const photoHtml = s.photo_url
      ? `<img src="${s.photo_url}" style="width:100%;height:100%;object-fit:cover">`
      : initials;
    const datePaid = s.updated_at
      ? new Date(s.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '—';
 
    grid.innerHTML += `
      <div class="vip-student-card" data-name="${s.name.toLowerCase()}" data-serial="${s.serial}">
        <div class="vip-card-top">
          <div class="vip-avatar">${photoHtml}</div>
          <div class="vip-card-info">
            <div class="vip-student-name">${s.name}</div>
            <div class="vip-student-class">${s.class} &nbsp;·&nbsp; ID: ${s.id.substring(0, 8).toUpperCase()}</div>
          </div>
        </div>
        <div class="vip-serial-section">
          <div class="vip-serial-label">Clearance Serial Number</div>
          <div class="vip-serial-number">${s.serial}</div>
        </div>
        <div class="vip-card-details">
          <div class="vip-detail-row">
            <span class="vip-detail-key">Total Fee Paid</span>
            <span class="vip-detail-val" style="color:var(--success);font-weight:700">₦${s.total_fee.toLocaleString()}</span>
          </div>
          <div class="vip-detail-row">
            <span class="vip-detail-key">Date Cleared</span>
            <span class="vip-detail-val">${datePaid}</span>
          </div>
          <div class="vip-detail-row">
            <span class="vip-detail-key">Serial Status</span>
            <span class="vip-detail-val" style="color:var(--success)">Active</span>
          </div>
        </div>
        <div class="vip-card-footer">
          <span class="vip-status-tag">CLEARED</span>
          <button class="btn-regen" onclick="regenSerial('${s.id}', '${s.serial}')">↺ Regen Serial</button>
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
//  PAYMENT HISTORY
// ============================================================
async function loadPaymentHistoryDropdown() {
  const select = document.getElementById('payment-history-student');
  select.innerHTML = '<option value="">Select a student...</option>';
  const { data } = await _supabase.from('students').select('id, name, class').order('name');
  if (data) {
    data.forEach(s => {
      select.innerHTML += `<option value="${s.id}">${s.name} (${s.class})</option>`;
    });
  }
  select.addEventListener('change', () => loadPaymentHistory(select.value));
}
 
async function loadPaymentHistory(studentId) {
  if (!studentId) return;
  const list = document.querySelector('.payment-history-list');
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400)">Loading...</div>';
 
  const { data, error } = await _supabase
    .from('payments')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
 
  if (error || !data.length) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gray-400)">No payment records found.</div>';
    return;
  }
 
  let totalPaid = 0;
  list.innerHTML = '';
  data.forEach(p => {
    totalPaid += p.amount;
    const date = new Date(p.created_at).toLocaleString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    list.innerHTML += `
      <div class="payment-history-item">
        <div class="ph-left">
          <div class="ph-date">${date}</div>
          <div class="ph-method">${p.method}</div>
          <div class="ph-by">Recorded by: Admin</div>
        </div>
        <div class="ph-amount">+ ₦${p.amount.toLocaleString()}</div>
      </div>`;
  });
 
  document.querySelector('[style*="Total payments"]').textContent =
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
  classSelect.innerHTML = '';
  ['Primary 1','Primary 2','Primary 3','Primary 4','Primary 5','Primary 6',
   'JSS1A','JSS1B','JSS2A','JSS2B','JSS3A','JSS3B',
   'SS1A','SS1B','SS2A','SS2B','SS3A','SS3B'].forEach(c => {
    classSelect.innerHTML += `<option ${s.class === c ? 'selected' : ''}>${c}</option>`;
  });
 
  document.getElementById('modal-edit').classList.add('open');
}
 
function updateEditCalcs() {
  const total   = parseFloat(document.getElementById('edit-total-fee').value) || 0;
  const paid    = parseFloat(document.getElementById('edit-amount-paid').value) || 0;
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
 
  let serial = null, serialActive = false;
  if (isFullyPaid) {
    const { data: existing } = await _supabase.from('students').select('serial').eq('id', _editStudentId).single();
    serial       = existing?.serial || await generateSerial();
    serialActive = true;
  }
 
  const updates = {
    name, name_lower: name.toLowerCase(), class: grade,
    total_fee: total, amount_paid: paid, balance, notes,
    status: isFullyPaid ? 'paid' : 'partial',
    ...(isFullyPaid && { serial, serial_active: serialActive })
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
  const { data: s } = await _supabase.from('students').select('name, class, balance').eq('id', studentId).single();
  _payStudentBalance = s?.balance || 0;
 
  const modalInfo = document.querySelector('#modal-payment .modal-body > div:first-child');
  modalInfo.querySelector('div:first-child').textContent = s?.name || '';
  modalInfo.querySelector('div:last-child').innerHTML =
    `${s?.class} &nbsp;·&nbsp; Current Balance: <span style="color:var(--danger);font-weight:600">₦${_payStudentBalance.toLocaleString()}</span>`;
 
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
  if (isNowFullyPaid && !s.serial) {
    serial       = await generateSerial();
    serialActive = true;
  }
 
  const { error: updateError } = await _supabase.from('students').update({
    amount_paid: newAmountPaid, balance: newBalance,
    status: isNowFullyPaid ? 'paid' : 'partial',
    serial, serial_active: serialActive
  }).eq('id', _payStudentId);
 
  if (updateError) { showToast('Error updating student: ' + updateError.message, 'error'); return; }
 
  const { error: payError } = await _supabase.from('payments').insert([{
    student_id: _payStudentId, amount, method, payment_date: date
  }]);
 
  if (payError) { showToast('Error recording payment: ' + payError.message, 'error'); return; }
 
  closeModal('modal-payment');
  showToast(isNowFullyPaid ? '✓ Full payment! Serial number generated.' : 'Payment recorded!', 'success');
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
  if (error) { showToast('Error deleting record: ' + error.message, 'error'); return; }
  closeModal('modal-delete');
  showToast('Student record deleted.', 'info');
  loadStudentsTable();
  loadDashboardStats();
}
 
// ============================================================
//  REGEN SERIAL MODAL
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