const state = {
  role: 'Teacher',
  view: 'today',
  attendance: {},
  diaryDraft: '',
  marks: {},
  savedAt: null,
};

const students = [
  ['Aanya Bose', 'NS24081', 'AB'], ['Aarav Mehta', 'NS24082', 'AM'], ['Aditya Nair', 'NS24083', 'AN'],
  ['Anika Shah', 'NS24084', 'AS'], ['Arjun Reddy', 'NS24085', 'AR'], ['Diya Iyer', 'NS24086', 'DI'],
  ['Ishaan Kapoor', 'NS24087', 'IK'], ['Kabir Joshi', 'NS24088', 'KJ'], ['Meera Menon', 'NS24089', 'MM'],
  ['Naina Gupta', 'NS24090', 'NG'], ['Rohan Das', 'NS24091', 'RD'], ['Sara Thomas', 'NS24092', 'ST'],
];

const navByRole = {
  Teacher: [
    ['WORKSPACE'], ['today', '⌂', 'Today'], ['classes', '▦', 'Classes'], ['students', '◉', 'Students'],
    ['TEACHING'], ['attendance', '✓', 'Attendance', '1'], ['diary', '✎', 'Class diary'], ['marks', '#', 'Marks & results'], ['messages', '◇', 'Messages', '3'],
  ],
  Administrator: [
    ['WORKSPACE'], ['today', '⌂', 'Command center'], ['people', '◉', 'People'], ['academics', '▦', 'Academics'],
    ['OPERATIONS'], ['approvals', '✓', 'Approvals', '8'], ['finance', '₹', 'Finance'], ['transport', '⌖', 'Transport'], ['messages', '◇', 'Communication'],
  ],
  Parent: [
    ['FAMILY'], ['today', '⌂', 'Home'], ['timeline', '◉', 'Child timeline'], ['tasks', '✓', 'Tasks', '2'],
    ['SCHOOL'], ['payments', '₹', 'Payments'], ['transport', '⌖', 'Transport'], ['messages', '◇', 'Messages', '4'],
  ],
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem('northstar-mvp') || '{}');
    Object.assign(state, saved);
  } catch (_) {}
}

function persist() {
  state.savedAt = new Date().toISOString();
  localStorage.setItem('northstar-mvp', JSON.stringify(state));
}

function toast(message) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2500);
}

function pageHead(kicker, title, subtitle, action = '') {
  return `<div class="page-head"><div><span class="eyebrow ink">${kicker}</span><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`;
}

function renderNav() {
  const items = navByRole[state.role] || navByRole.Teacher;
  const html = items.map(item => item.length === 1
    ? `<div class="nav-label">${item[0]}</div>`
    : `<button class="nav-item ${state.view === item[0] ? 'active' : ''}" data-view="${item[0]}"><span class="nav-icon">${item[1]}</span><span>${item[2]}</span>${item[3] ? `<span class="nav-badge">${item[3]}</span>` : ''}</button>`
  ).join('');
  document.querySelector('#main-nav').innerHTML = html;
  const mobileItems = items.filter(i => i.length > 1).slice(0, 4);
  document.querySelector('#mobile-nav').innerHTML = mobileItems.map(item => `<button class="${state.view === item[0] ? 'active' : ''}" data-view="${item[0]}"><span>${item[1]}</span>${item[2]}</button>`).join('');
  document.querySelector('#profile-role').textContent = state.role === 'Teacher' ? 'Science teacher' : state.role;
}

function renderToday() {
  if (state.role !== 'Teacher') return renderRolePreview();
  const date = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return `${pageHead('GOOD MORNING, ANANYA', 'Your day, at a glance.', 'Three actions need your attention before 3:30 PM.', `<div class="date-chip">◷ ${date}</div>`)}
    <div class="stats-row">
      <div class="stat-card"><span>Classes today</span><strong>5</strong><small>Next · Grade 7B at 10:15</small></div>
      <div class="stat-card"><span>Tasks remaining</span><strong>3</strong><small>2 high priority</small></div>
      <div class="stat-card"><span>Work saved this week</span><strong>42m</strong><small>↑ 18% from last week</small></div>
    </div>
    <div class="grid dashboard-grid">
      <section class="card">
        <div class="card-header"><div><h2>Today’s timeline</h2><p>Monday timetable · 5 periods</p></div><div class="progress-ring" style="--value:60"><span>3/5</span></div></div>
        <div class="card-body timeline">
          ${timelineItem('08:30', 'Grade 8A · Science', 'Attendance submitted · 39/40 present', 'View', 'attendance')}
          ${timelineItem('10:15', 'Grade 7B · Science', 'Forces and motion · Lab 2', 'Start class', 'diary', true)}
          ${timelineItem('11:20', 'Grade 8C · Science', 'Chemical reactions · Room 204', 'Prepare', 'classes')}
          ${timelineItem('13:40', 'Grade 9A · Biology', 'Cell division · Lab 1', 'Prepare', 'classes')}
          ${timelineItem('14:35', 'Grade 7A · Science', 'Review and recap · Room 105', 'Prepare', 'classes')}
        </div>
      </section>
      <div class="grid">
        <section class="card focus-card">
          <div class="card-header"><div><h2>Focus next</h2><p>Sorted by urgency</p></div><span>✦</span></div>
          <div class="card-body">
            ${focusTask('Enter Unit Test marks', 'Grade 8A · Due 2:30 PM', 'Enter marks', 'marks')}
            ${focusTask('Publish class diary', 'Grade 7B · After period 2', 'Open draft', 'diary')}
            ${focusTask('Acknowledge circular', 'Lab safety policy · 4 min', 'Review', 'messages')}
          </div>
        </section>
        <section class="card">
          <div class="card-header"><div><h2>School updates</h2><p>Important notices only</p></div><button class="link-button" disabled title="Unavailable in this preview">Full feed unavailable</button></div>
          <div class="card-body notice-list">
            <div class="notice"><span class="notice-icon">!</span><div><b>Fire drill tomorrow</b><span>Assembly point updated</span></div><time>1h</time></div>
            <div class="notice"><span class="notice-icon">⌁</span><div><b>Staff meeting moved</b><span>Tuesday · 4:00 PM</span></div><time>3h</time></div>
          </div>
        </section>
      </div>
    </div>`;
}

function timelineItem(time, title, text, action, view, current = false) {
  return `<div class="timeline-item ${current ? 'current' : ''}"><time>${time}</time><span class="timeline-line"><i></i></span><div class="timeline-copy"><b>${title}</b><span>${text}</span></div><button class="timeline-action" data-view="${view}">${action}</button></div>`;
}

function focusTask(title, meta, action, view) {
  return `<div class="focus-task"><span><b>${title}</b><small>${meta}</small></span><button data-view="${view}">${action}</button></div>`;
}

function renderAttendance() {
  students.forEach((student, idx) => { if (!state.attendance[student[1]]) state.attendance[student[1]] = idx === 4 ? 'absent' : idx === 7 ? 'late' : 'present'; });
  const counts = Object.values(state.attendance).reduce((acc, status) => ({...acc, [status]: (acc[status] || 0) + 1}), {});
  return `${pageHead('ATTENDANCE', 'Grade 8A', 'Monday · Period 1 · Science', `<button class="ghost-button" disabled title="Unavailable in this preview">History unavailable</button>`)}
    <div class="toolbar"><div class="segmented"><button class="active">Today</button><button disabled title="Unavailable in this preview">Week unavailable</button><button disabled title="Unavailable in this preview">Month unavailable</button></div><div class="toolbar-group"><span class="date-chip">${counts.present || 0} present</span><span class="date-chip">${counts.absent || 0} absent</span><span class="date-chip">${counts.late || 0} late</span></div></div>
    <div class="status-banner"><span>● Draft saved on this device · Safe to continue offline</span><b>${students.length} students</b></div>
    <section class="card table-card">
      <table class="data-table"><thead><tr><th>STUDENT</th><th>STATUS</th><th>REASON / NOTE</th><th>LAST 30 DAYS</th></tr></thead><tbody>
        ${students.map((student, idx) => attendanceRow(student, idx)).join('')}
      </tbody></table>
    </section>
    <div class="save-bar"><div><b id="attendance-summary">${counts.absent || 0} absent · ${counts.late || 0} late</b><span>Changes autosaved locally</span></div><button id="submit-attendance">Submit attendance</button></div>`;
}

function attendanceRow(student, idx) {
  const status = state.attendance[student[1]] || 'present';
  return `<tr><td><div class="student"><span class="student-avatar">${student[2]}</span><span><b>${student[0]}</b><small>${student[1]}</small></span></div></td>
    <td><div class="attendance-choice" data-id="${student[1]}"><button aria-label="Mark ${student[0]} present" title="Present" data-status="present" class="${status === 'present' ? 'active' : ''}">P</button><button aria-label="Mark ${student[0]} absent" title="Absent" data-status="absent" class="${status === 'absent' ? 'active' : ''}">A</button><button aria-label="Mark ${student[0]} late" title="Late" data-status="late" class="${status === 'late' ? 'active' : ''}">L</button></div></td>
    <td><select aria-label="Attendance reason for ${student[0]}" class="reason-select" ${status === 'present' ? 'disabled' : ''}><option>${status === 'late' ? 'Bus delay' : status === 'absent' ? 'Unwell' : 'Select reason'}</option><option>Unwell</option><option>Approved leave</option><option>Bus delay</option><option>Other</option></select></td>
    <td><span class="grade-pill">${idx % 4 === 0 ? '94%' : idx % 3 === 0 ? '97%' : '100%'}</span></td></tr>`;
}

function renderDiary() {
  const draft = state.diaryDraft || 'Students explored balanced and unbalanced forces through a cart experiment. We discussed how mass affects acceleration and recorded observations in the lab worksheet.';
  return `${pageHead('CLASS DIARY', 'Publish once. Reach every family.', 'Grade 7B · Science · Period 2', `<span class="date-chip">Draft · Autosaved</span>`)}
    <div class="grid dashboard-grid">
      <section class="card"><div class="card-header"><div><h2>Lesson update</h2><p>Parents will see this in the child timeline</p></div><button class="secondary-button" id="use-template">Use template</button></div>
        <div class="card-body input-grid">
          <label class="field">Topic<input value="Forces and motion" /></label>
          <label class="field">Class & section<select><option>Grade 7B · Science</option><option>Grade 7A · Science</option><option>Grade 8C · Science</option></select></label>
          <label class="field full">What we covered<textarea id="diary-text">${draft}</textarea></label>
          <label class="field full">Homework / next step<input value="Complete questions 1–5 on page 87 by Wednesday." /></label>
          <label class="field">Publish date<input type="date" value="${new Date().toISOString().slice(0,10)}" /></label>
          <label class="field">Attachments<button class="ghost-button" id="attach-file" type="button">＋ Add file or photo</button></label>
          <div class="field full publish-options">
            <div class="option-row"><span><b>Send to parent timeline</b><small>Visible to all guardians linked to the student</small></span><button type="button" class="toggle active" aria-label="Toggle parent timeline"></button></div>
            <div class="option-row"><span><b>Notify parents</b><small>Routine update · bundled into daily digest</small></span><button type="button" class="toggle active" aria-label="Toggle notifications"></button></div>
            <div class="option-row"><span><b>Also publish to Grade 7A</b><small>Reuse this update without re-entering content</small></span><button type="button" class="toggle" aria-label="Toggle Grade 7A"></button></div>
          </div>
        </div>
      </section>
      <div class="grid">
        <section class="card"><div class="card-header"><div><h2>Parent preview</h2><p>Exactly what families will see</p></div><span>◉</span></div><div class="card-body">
          <span class="eyebrow ink">SCIENCE · TODAY</span><h3 style="margin:12px 0 8px;font-size:20px">Forces and motion</h3><p id="diary-preview" style="color:var(--muted);font-size:12px;line-height:1.6">${draft}</p><div class="notice" style="margin-top:16px"><span class="notice-icon">✓</span><div><b>Homework</b><span>Questions 1–5 · Due Wednesday</span></div></div>
        </div></section>
        <section class="card"><div class="card-body"><span class="eyebrow ink">DELIVERY</span><div style="display:grid;gap:11px;margin-top:14px"><div class="option-row"><span><b>41 guardians</b><small>Across 39 households</small></span><span class="grade-pill">Ready</span></div><div class="option-row"><span><b>Daily digest</b><small>Scheduled for 5:30 PM</small></span><span class="grade-pill">Routine</span></div></div></div></section>
      </div>
    </div>
    <div class="save-bar"><div><b>Draft is safe</b><span>Last saved just now · Preview checked</span></div><button id="publish-diary">Publish update</button></div>`;
}

function renderMarks() {
  const total = 30;
  return `${pageHead('MARKS & RESULTS', 'Unit Test 1', 'Grade 8A · Science · Maximum 30 marks', `<button class="ghost-button" disabled title="Unavailable in this preview">Spreadsheet paste unavailable</button>`)}
    <div class="toolbar"><div class="toolbar-group"><select aria-label="Assessment"><option>Unit Test 1 · Science</option><option>Lab assessment 1</option></select><span class="date-chip">12 of 40 entered</span></div><div class="segmented"><button class="active">Entry</button><button disabled title="Unavailable in this preview">Review unavailable</button><button disabled title="Unavailable in this preview">Insights unavailable</button></div></div>
    <div class="status-banner warning"><span>◆ 2 values need review before submission. Marks save as you type.</span><button class="link-button" disabled title="Unavailable in this preview">Issue filter unavailable</button></div>
    <section class="card table-card"><table class="data-table"><thead><tr><th>STUDENT</th><th>THEORY / 20</th><th>PRACTICAL / 10</th><th>TOTAL / 30</th><th>GRADE</th><th>STATUS</th></tr></thead><tbody>
      ${students.map((student, idx) => marksRow(student, idx, total)).join('')}
    </tbody></table></section>
    <div class="save-bar"><div><b>12 entries saved · 2 need review</b><span>Nothing is published until moderation</span></div><button id="submit-marks">Submit for review</button></div>`;
}

function marksRow(student, idx, total) {
  const theory = state.marks[student[1]]?.theory ?? (idx < 10 ? 12 + (idx % 8) : '');
  const practical = state.marks[student[1]]?.practical ?? (idx < 10 ? 6 + (idx % 5) : '');
  const sum = theory !== '' && practical !== '' ? Number(theory) + Number(practical) : '—';
  const invalid = Number(theory) > 20 || Number(practical) > 10;
  const grade = sum === '—' ? '—' : sum >= 27 ? 'A+' : sum >= 24 ? 'A' : sum >= 20 ? 'B' : 'C';
  return `<tr><td><div class="student"><span class="student-avatar">${student[2]}</span><span><b>${student[0]}</b><small>${student[1]}</small></span></div></td><td><input aria-label="Theory marks for ${student[0]}" class="mark-input ${invalid ? 'invalid' : ''}" data-id="${student[1]}" data-part="theory" type="number" min="0" max="20" value="${theory}" /></td><td><input aria-label="Practical marks for ${student[0]}" class="mark-input ${invalid ? 'invalid' : ''}" data-id="${student[1]}" data-part="practical" type="number" min="0" max="10" value="${practical}" /></td><td><b class="mark-total">${sum} / ${total}</b></td><td><span class="grade-pill">${grade}</span></td><td>${invalid ? '<span style="color:var(--red);font-size:10px">Check value</span>' : '<span style="color:var(--green-2);font-size:10px">Saved</span>'}</td></tr>`;
}

function renderRolePreview() {
  const admin = state.role === 'Administrator';
  return `${pageHead(admin ? 'COMMAND CENTER' : 'FAMILY HOME', admin ? 'Good morning, Principal Rao.' : 'Everything about Aarav, in one place.', admin ? 'Eight exceptions need attention across school operations.' : 'Two items need your attention this week.', `<div class="date-chip">Demo role · ${state.role}</div>`)}
    <div class="stats-row"><div class="stat-card"><span>${admin ? 'Pending approvals' : 'Tasks due'}</span><strong>${admin ? '8' : '2'}</strong><small>Open work queue</small></div><div class="stat-card"><span>${admin ? 'Attendance complete' : 'Attendance this month'}</span><strong>${admin ? '92%' : '96%'}</strong><small>Current academic period</small></div><div class="stat-card"><span>${admin ? 'Critical exceptions' : 'Unread notices'}</span><strong>${admin ? '3' : '4'}</strong><small>Needs attention</small></div></div>
    <section class="card"><div class="empty-state"><div class="empty-icon">${admin ? '⌘' : '⌂'}</div><h2>${state.role} workspace foundation</h2><p>This role shell is ready for the next vertical slice. The current MVP goes deepest on high-frequency teacher workflows.</p><button class="primary-button" style="display:inline-flex;gap:22px" id="switch-teacher">Explore teacher MVP <span>→</span></button></div></section>`;
}

function renderPlaceholder() {
  const current = (navByRole[state.role] || []).find(i => i[0] === state.view);
  const label = current?.[2] || state.view;
  return `${pageHead('WORKSPACE', label, 'This module is sequenced after the core teacher workflow pilot.')}
    <section class="card"><div class="empty-state"><div class="empty-icon">${current?.[1] || '✦'}</div><h2>${label} is next in the roadmap</h2><p>The information architecture and navigation are live. This workspace will be built from validated school workflows, not copied module screens.</p><button class="secondary-button" data-view="today">Back to Today</button></div></section>`;
}

function render() {
  renderNav();
  const views = { today: renderToday, attendance: renderAttendance, diary: renderDiary, marks: renderMarks };
  document.querySelector('#content').innerHTML = (views[state.view] || renderPlaceholder)();
  const label = (navByRole[state.role] || []).find(i => i[0] === state.view)?.[2] || 'Workspace';
  document.querySelector('#breadcrumb').textContent = `${state.role} / ${label}`;
  bindDynamicEvents();
}

function navigate(view) {
  state.view = view;
  persist();
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function bindDynamicEvents() {
  document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.view)));
  document.querySelectorAll('.attendance-choice button').forEach(button => button.addEventListener('click', () => {
    const group = button.closest('.attendance-choice');
    state.attendance[group.dataset.id] = button.dataset.status;
    persist(); render();
  }));
  document.querySelectorAll('.mark-input').forEach(input => input.addEventListener('change', () => {
    state.marks[input.dataset.id] ||= {};
    state.marks[input.dataset.id][input.dataset.part] = input.value;
    persist(); render();
  }));
  document.querySelectorAll('.toggle').forEach(button => button.addEventListener('click', () => button.classList.toggle('active')));
  document.querySelector('#diary-text')?.addEventListener('input', event => {
    state.diaryDraft = event.target.value;
    document.querySelector('#diary-preview').textContent = event.target.value;
    persist();
  });
  document.querySelector('#submit-attendance')?.addEventListener('click', () => toast('Attendance submitted · Parents notified of exceptions'));
  document.querySelector('#publish-diary')?.addEventListener('click', () => toast('Class update scheduled for the 5:30 PM digest'));
  document.querySelector('#submit-marks')?.addEventListener('click', () => toast('Marks sent to the grade coordinator for review'));
  document.querySelector('#paste-marks')?.addEventListener('click', () => toast('Paste mode ready · Copy a two-column range from your spreadsheet'));
  document.querySelector('#use-template')?.addEventListener('click', () => toast('Template applied · Last week’s structure reused'));
  document.querySelector('#attach-file')?.addEventListener('click', () => toast('Attachment picker is a planned integration in this preview'));
  document.querySelector('#switch-teacher')?.addEventListener('click', () => { state.role = 'Teacher'; navigate('today'); });
}

function enterApp() {
  document.querySelector('#login-view').classList.add('hidden');
  document.querySelector('#app-view').classList.remove('hidden');
  state.view = 'today';
  persist(); render();
}

loadState();
document.querySelectorAll('.role').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.role').forEach(b => b.classList.remove('active'));
  button.classList.add('active'); state.role = button.dataset.role;
}));
document.querySelector('#login-form').addEventListener('submit', event => { event.preventDefault(); enterApp(); });
document.querySelector('#show-password').addEventListener('click', event => {
  const input = document.querySelector('#password');
  input.type = input.type === 'password' ? 'text' : 'password';
  event.target.textContent = input.type === 'password' ? 'Show' : 'Hide';
});
document.querySelector('#logout').addEventListener('click', () => {
  document.querySelector('#app-view').classList.add('hidden');
  document.querySelector('#login-view').classList.remove('hidden');
});
document.querySelector('#search-button').addEventListener('click', () => document.querySelector('#search-dialog').showModal());
document.querySelectorAll('[data-go]').forEach(button => button.addEventListener('click', () => navigate(button.dataset.go)));
document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#search-dialog').showModal(); }
});
