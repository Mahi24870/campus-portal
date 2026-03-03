// Global State
let allEventsCache = [];

// ---------- EVENT CARDS RENDERER ---------- //
function createEventCardHTML(event, context = 'all') {
  const isFull = event.registration_count >= event.max_capacity;
  const capacityPercent = Math.min((event.registration_count / event.max_capacity) * 100, 100);
  const fillClass = capacityPercent > 80 ? 'danger' : '';

  const isPast = new Date(event.registration_deadline) < new Date();
  const pastText = isPast ? 'Registration Closed' : (isFull ? 'Event Full' : 'Register');

  const bannerStyle = event.banner_url ? `background-image: url('${event.banner_url}')` : `background: ${getCategoryColor(event.category)};`;

  let actionButton = '';

  if (context === 'all') {
    if (currentUser.role === 'student' && event.status !== 'cancelled') {
      actionButton = `<button class="btn btn-primary" style="width:100%" data-action="register" data-id="${event.id}" ${isPast || isFull ? 'disabled' : ''}>${pastText}</button>`;
    } else if (currentUser.role !== 'student') {
      actionButton = `<button class="btn btn-secondary" style="width:100%" data-action="view-regs" data-id="${event.id}">View Registrants</button>`;
    }
  } else if (context === 'my-registrations') {
    const isUpcoming = new Date(event.event_date) > new Date() && event.status !== 'cancelled';
    actionButton = `
      <div style="display:flex; gap:0.5rem; flex-direction:column;">
        <button class="btn btn-primary" style="width:100%" data-action="view-ticket" data-id="${event.id}">View Ticket</button>
        ${isUpcoming ? `<button class="btn btn-danger" style="width:100%" data-action="cancel-reg" data-id="${event.id}">Cancel Registration</button>` : `<button class="btn btn-secondary" style="width:100%" disabled>${event.status}</button>`}
      </div>
    `;
  }

  return `
    <div class="event-card glass-card">
      <div class="event-banner" style="${bannerStyle}">
        <span class="event-badge">${event.category}</span>
      </div>
      <div class="event-body">
        <h3 class="event-title">${event.title}</h3>
        <p class="event-meta"><i class="fas fa-calendar-day"></i> ${formatDate(event.event_date)} at ${formatTime(event.event_time)}</p>
        <p class="event-meta"><i class="fas fa-map-marker-alt"></i> ${event.venue}</p>
        <p class="event-meta" style="margin-bottom: 0.2rem;"><i class="fas fa-users"></i> Registrations (${event.registration_count}/${event.max_capacity})</p>
        <div class="capacity-bar">
          <div class="capacity-fill ${fillClass}" style="width: ${capacityPercent}%"></div>
        </div>
        <div class="event-footer">
          ${actionButton}
        </div>
      </div>
    </div>
  `;
}

function handleEventGridClicks(e) {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.getAttribute('data-action');
  const id = btn.getAttribute('data-id');

  if (action === 'register') registerForEvent(id);
  if (action === 'cancel-reg') cancelRegistration(id);
  if (action === 'view-regs') viewRegistrants(id);
  if (action === 'view-ticket') showTicket(id);
}

// Bind clicks statically once
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('allEventsGrid')?.addEventListener('click', handleEventGridClicks);
  document.getElementById('myRegistrationsGrid')?.addEventListener('click', handleEventGridClicks);
  document.getElementById('upcomingEventsGrid')?.addEventListener('click', handleEventGridClicks);
});

// ---------- LOADERS ---------- //

// 1. HOME SECTION
window.loadEventsHome = async function () {
  try {
    const res = await apiCall('GET', '/api/events');
    const events = res.events;
    allEventsCache = events;

    // Stats
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = '';

    // Everyone sees Total and Upcoming
    const upcoming = events.filter(e => new Date(e.event_date) > new Date() && e.status !== 'cancelled');

    let html = `
      <div class="stat-card glass-card">
        <p>Total Events</p>
        <h3>${events.length}</h3>
      </div>
      <div class="stat-card glass-card">
        <p>Upcoming Events</p>
        <h3>${upcoming.length}</h3>
      </div>
    `;

    if (currentUser.role === 'student') {
      const r = await apiCall('GET', '/api/registrations/my');
      html += `<div class="stat-card glass-card"><p>Your Registrations</p><h3>${r.registrations.length}</h3></div>`;
    } else {
      const created = events.filter(e => e.created_by === currentUser.id);
      html += `<div class="stat-card glass-card"><p>Events Created By You</p><h3>${created.length}</h3></div>`;

      // Analytics for Admin/Faculty
      initAnalyticsChart(events.slice(0, 10)); // Show stats for last 10 events
    }
    statsGrid.innerHTML = html;

    // Grid (Top 6 incoming)
    const top6 = upcoming.slice(0, 6);
    const grid = document.getElementById('upcomingEventsGrid');
    if (top6.length === 0) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-illustration">📅</div><p>No upcoming events found.</p></div>`;
    } else {
      grid.innerHTML = top6.map(e => createEventCardHTML(e, 'all')).join('');
    }

  } catch (err) {
    console.error(err);
  }
};

// 2. ALL EVENTS SECTION
window.loadAllEvents = async function () {
  if (allEventsCache.length === 0) {
    const res = await apiCall('GET', '/api/events');
    allEventsCache = res.events;
  }
  renderFilteredEvents();
};

function renderFilteredEvents() {
  const catFilter = document.getElementById('categoryFilter')?.value || '';
  const statusFilter = document.getElementById('statusFilter')?.value || '';
  const search = document.getElementById('searchFilter')?.value.toLowerCase() || '';

  const filtered = allEventsCache.filter(e => {
    const matchCat = catFilter === '' || e.category === catFilter;
    const matchStatus = statusFilter === '' || e.status === statusFilter;
    const matchSearch = search === '' || e.title.toLowerCase().includes(search);
    return matchCat && matchStatus && matchSearch;
  });

  const grid = document.getElementById('allEventsGrid');
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-illustration">🔍</div><p>No events found matching your filters.</p></div>`;
  } else {
    grid.innerHTML = filtered.map(e => createEventCardHTML(e, 'all')).join('');
  }
}

document.getElementById('categoryFilter')?.addEventListener('change', renderFilteredEvents);
document.getElementById('statusFilter')?.addEventListener('change', renderFilteredEvents);
document.getElementById('searchFilter')?.addEventListener('input', renderFilteredEvents);

// 3. MY REGISTRATIONS
window.loadMyRegistrations = async function () {
  try {
    const res = await apiCall('GET', '/api/registrations/my');
    const grid = document.getElementById('myRegistrationsGrid');
    if (res.registrations.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-illustration">🎟️</div><p>You haven't registered for any events yet.</p></div>`;
    } else {
      grid.innerHTML = res.registrations.map(r => createEventCardHTML(r, 'my-registrations')).join('');
    }
  } catch (err) {
    console.error(err);
  }
};

// 4. MY EVENTS
window.loadMyEvents = async function () {
  try {
    const res = await apiCall('GET', '/api/events/my/created');
    const body = document.getElementById('myEventsBody');
    body.innerHTML = '';

    if (res.events.length === 0) {
      body.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem;">No events created yet.</td></tr>`;
      return;
    }

    body.innerHTML = res.events.map(e => {
      const img = e.banner_url ? `<img src="${e.banner_url}" width="60" style="border-radius:4px" />` : `<div style="width:60px;height:40px;background:${getCategoryColor(e.category)};border-radius:4px"></div>`;
      return `
        <tr>
          <td>${img}</td>
          <td>${e.title}</td>
          <td>${formatDate(e.event_date)} ${formatTime(e.event_time)}</td>
          <td><span class="event-badge" style="position:static;font-size:0.7rem;">${e.category}</span></td>
          <td>${e.registration_count}/${e.max_capacity}</td>
          <td>${e.status}</td>
          <td>
            <button class="btn btn-secondary" style="padding:0.2rem 0.5rem;font-size:0.8rem;" onclick="viewRegistrants(${e.id})">Registrants</button>
            <button class="btn btn-danger" style="padding:0.2rem 0.5rem;font-size:0.8rem;" onclick="deleteEvent(${e.id})">Delete</button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    console.error(err);
  }
};


// ---------- ACTIONS ---------- //

async function registerForEvent(id) {
  try {
    const res = await apiCall('POST', `/api/registrations/${id}`);
    if (res.success) {
      showToast('Successfully registered for event!', 'success');
      // refresh home and all events cache
      await window.loadEventsHome();
      if (document.getElementById('section-events').classList.contains('active')) window.loadAllEvents();
    }
  } catch (err) { }
}

async function cancelRegistration(id) {
  if (!confirm('Are you sure you want to cancel this registration?')) return;
  try {
    const res = await apiCall('DELETE', `/api/registrations/${id}`);
    if (res.success) {
      showToast('Registration cancelled', 'info');
      window.loadMyRegistrations();
    }
  } catch (err) { }
}

async function deleteEvent(id) {
  if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) return;
  try {
    const res = await apiCall('DELETE', `/api/events/${id}`);
    if (res.success) {
      showToast('Event deleted', 'success');
      window.loadMyEvents();
    }
  } catch (err) { }
}

// ---------- VIEW REGISTRANTS ---------- //
let currentRegistrants = [];
window.viewRegistrants = async function (id) {
  try {
    const res = await apiCall('GET', `/api/registrations/event/${id}`);
    const body = document.getElementById('registrantsBody');
    currentRegistrants = res.registrants;

    if (res.registrants.length === 0) {
      body.innerHTML = `<tr><td colspan="4" style="text-align:center;">No registrants yet.</td></tr>`;
    } else {
      body.innerHTML = res.registrants.map(r => `
        <tr>
          <td>${r.full_name}</td>
          <td>${r.email}</td>
          <td>${r.department || 'N/A'}</td>
          <td>${new Date(r.registered_at).toLocaleString()}</td>
        </tr>
      `).join('');
    }
    openModal('registrantsModal');
  } catch (err) {
    console.error(err);
  }
};

document.getElementById('exportCsvBtn')?.addEventListener('click', () => {
  if (currentRegistrants.length === 0) {
    showToast('No data to export', 'error'); return;
  }
  const headers = ['Name', 'Email', 'Department', 'Registered At'];
  const rows = currentRegistrants.map(r => [
    `"${r.full_name}"`,
    `"${r.email}"`,
    `"${r.department || ''}"`,
    `"${new Date(r.registered_at).toLocaleString()}"`
  ]);
  const csvContent = "data:text/csv;charset=utf-8,"
    + headers.join(',') + "\n"
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "registrants.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ---------- CREATE EVENT FORM ---------- //
document.getElementById('createEventForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  const formData = new FormData();
  formData.append('title', document.getElementById('eventTitle').value);
  formData.append('category', document.getElementById('eventCategory').value);
  formData.append('description', document.getElementById('eventDesc').value);
  formData.append('venue', document.getElementById('eventVenue').value);
  formData.append('event_date', document.getElementById('eventDate').value);
  formData.append('event_time', document.getElementById('eventTime').value);
  formData.append('registration_deadline', document.getElementById('eventDeadline').value);
  formData.append('max_capacity', document.getElementById('eventCapacity').value);

  const fileInput = document.getElementById('eventBanner');
  if (fileInput.files[0]) {
    formData.append('banner', fileInput.files[0]);
  }

  try {
    const res = await apiCall('POST', '/api/events', formData, true);
    if (res.success) {
      showToast('Event created successfully!', 'success');
      form.reset();

      // Auto switch to My Events section
      document.querySelector('a[data-section="my-events"]').click();
    }
  } catch (err) {
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Event';
  }
});

// ---------- QR TICKET LOGIC ---------- //
let qrcodeInstance = null;
async function showTicket(eventId) {
  try {
    const res = await apiCall('GET', '/api/registrations/my');
    const reg = res.registrations.find(r => r.id === parseInt(eventId));
    if (!reg) return;

    document.getElementById('ticketEventTitle').textContent = reg.title;
    document.getElementById('ticketUserInfo').textContent = `${currentUser.full_name} (${currentUser.department})`;
    document.getElementById('ticketStatus').textContent = reg.attended ? 'Status: ATTENDED' : 'Status: NOT SCANNED';

    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';

    new QRCode(qrContainer, {
      text: reg.ticket_token,
      width: 200,
      height: 200,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });

    openModal('ticketModal');
  } catch (err) {
    console.error(err);
  }
}

// ---------- SCANNER LOGIC ---------- //
let html5QrCode = null;
window.initScanner = function () {
  const startBtn = document.getElementById('startScanBtn');
  const stopBtn = document.getElementById('stopScanBtn');
  const resultDiv = document.getElementById('scanResult');

  if (html5QrCode) {
    html5QrCode.stop().catch(() => { });
  }

  html5QrCode = new Html5Qrcode("reader");

  startBtn.addEventListener('click', () => {
    resultDiv.style.display = 'none';
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-block';

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
      .catch(err => {
        showToast('Camera error: ' + err, 'error');
        stopScanner();
      });
  });

  stopBtn.addEventListener('click', stopScanner);
};

function stopScanner() {
  const startBtn = document.getElementById('startScanBtn');
  const stopBtn = document.getElementById('stopScanBtn');
  if (html5QrCode) {
    html5QrCode.stop().then(() => {
      startBtn.style.display = 'inline-block';
      stopBtn.style.display = 'none';
    }).catch(err => console.error(err));
  }
}

async function onScanSuccess(decodedText) {
  stopScanner();
  const resultDiv = document.getElementById('scanResult');
  resultDiv.style.display = 'block';
  resultDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Verifying ticket...</p>';
  resultDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';

  try {
    const res = await apiCall('POST', `/api/registrations/verify/${decodedText}`);
    if (res.success) {
      resultDiv.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
      resultDiv.innerHTML = `
                <h4 style="color: #4ade80;"><i class="fas fa-check-circle"></i> ${res.message}</h4>
                <p style="margin-top:0.5rem;"><strong>${res.registrant.full_name}</strong></p>
                <p style="font-size:0.8rem; opacity:0.8;">Event: ${res.registrant.event_title}</p>
            `;
      showToast('Check-in success!', 'success');
    } else {
      throw new Error(res.error);
    }
  } catch (err) {
    resultDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    resultDiv.innerHTML = `<h4 style="color: #f87171;"><i class="fas fa-times-circle"></i> ${err.message || 'Invalid Ticket'}</h4>`;
    showToast('Verification failed', 'error');
  }
}

// ---------- ANALYTICS LOGIC ---------- //
let eventsChart = null;
function initAnalyticsChart(events) {
  const section = document.getElementById('analyticsSection');
  if (!section) return;
  section.style.display = 'block';

  const ctx = document.getElementById('eventsChart').getContext('2d');
  if (eventsChart) eventsChart.destroy();

  const labels = events.map(e => e.title.length > 20 ? e.title.substring(0, 17) + '...' : e.title);
  const data = events.map(e => e.registration_count);
  const capacities = events.map(e => e.max_capacity);

  eventsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Registrations',
        data: data,
        backgroundColor: 'rgba(0, 242, 254, 0.6)',
        borderColor: '#00f2fe',
        borderWidth: 1
      }, {
        label: 'Capacity',
        data: capacities,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        type: 'line'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      },
      plugins: {
        legend: {
          labels: { color: '#f8fafc', font: { family: "'Outfit', sans-serif" } }
        }
      }
    }
  });
}
