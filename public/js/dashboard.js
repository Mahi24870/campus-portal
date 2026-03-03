let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Only run if on dashboard
    if (!window.location.pathname.includes('dashboard.html')) return;

    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!res.ok || !data.success) {
            window.location.href = '/index.html';
            return;
        }
        currentUser = data.user;
        initDashboard();
    } catch (err) {
        window.location.href = '/index.html';
    }
});

function initDashboard() {
    // Populate Sidebar
    document.getElementById('sidebarName').textContent = currentUser.full_name;
    document.getElementById('sidebarRole').textContent = currentUser.role.toUpperCase();
    const initials = currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('sidebarAvatar').textContent = initials;

    // Show/Hide Role-based Navigation
    const r = currentUser.role;
    if (r === 'student') {
        document.getElementById('nav-my-registrations').style.display = 'block';
    }
    if (r === 'faculty' || r === 'admin') {
        document.getElementById('nav-create-event').style.display = 'block';
        document.getElementById('nav-my-events').style.display = 'block';
        document.getElementById('nav-scan-ticket').style.display = 'block';
    }
    if (r === 'admin') {
        document.getElementById('nav-manage-users').style.display = 'block';
    }

    // Set Profile info
    document.getElementById('profileName').value = currentUser.full_name;
    document.getElementById('profileEmail').value = currentUser.email;
    document.getElementById('profileRole').value = currentUser.role;
    document.getElementById('profileDept').value = currentUser.department;

    // Set Welcome date
    const now = new Date();
    let timeOfDay = 'Good evening';
    if (now.getHours() < 12) timeOfDay = 'Good morning';
    else if (now.getHours() < 18) timeOfDay = 'Good afternoon';

    document.getElementById('welcomeText').textContent = `${timeOfDay}, ${currentUser.full_name.split(' ')[0]}!`;
    document.getElementById('currentDateText').innerHTML = `<i class="fas fa-calendar"></i> ${formatDate(new Date())}`;

    // Setup Navigation Routing
    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');

            // Update Active class on Nav
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Update Active class on Sections
            document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
            const activeSec = document.getElementById(`section-${sectionId}`);
            if (activeSec) {
                activeSec.classList.add('active');
                loadSectionData(sectionId);
            }

            // Close mobile sidebar
            document.getElementById('sidebar').classList.remove('active');
        });
    });

    // Mobile Hamburger
    document.getElementById('hamburgerBtn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('active');
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            await apiCall('POST', '/api/auth/logout');
            window.location.href = '/index.html';
        } catch (err) {
            console.error(err);
        }
    });

    // Load initial section (home)
    loadSectionData('home');
}

// Route data loader
function loadSectionData(sectionId) {
    if (typeof window.loadEventsHome === 'function' && sectionId === 'home') window.loadEventsHome();
    if (typeof window.loadAllEvents === 'function' && sectionId === 'events') window.loadAllEvents();
    if (typeof window.loadMyEvents === 'function' && sectionId === 'my-events') window.loadMyEvents();
    if (typeof window.loadMyRegistrations === 'function' && sectionId === 'my-registrations') window.loadMyRegistrations();
    if (sectionId === 'manage-users') loadUsers();
    if (sectionId === 'scan-ticket') window.initScanner();
}

async function loadUsers() {
    try {
        const res = await apiCall('GET', '/api/users');
        const body = document.getElementById('usersBody');
        body.innerHTML = '';

        if (res.users.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center;">No users found.</td></tr>';
            return;
        }

        body.innerHTML = res.users.map(u => `
            <tr>
                <td>${u.full_name}</td>
                <td>${u.email}</td>
                <td>
                    <select class="form-control" style="padding:0.2rem; min-width:100px;" onchange="updateUserRole(${u.id}, this.value)">
                        <option value="student" ${u.role === 'student' ? 'selected' : ''}>Student</option>
                        <option value="faculty" ${u.role === 'faculty' ? 'selected' : ''}>Faculty</option>
                        <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td>${u.department || 'N/A'}</td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-danger" style="padding:0.2rem 0.5rem; font-size:0.8rem;" onclick="deleteUser(${u.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

window.updateUserRole = async function (id, role) {
    try {
        const res = await apiCall('PATCH', `/api/users/${id}/role`, { role });
        if (res.success) showToast('User role updated', 'success');
    } catch (err) { }
};

window.deleteUser = async function (id) {
    if (!confirm('Are you sure? This will delete the user and all their records.')) return;
    try {
        const res = await apiCall('DELETE', `/api/users/${id}`);
        if (res.success) {
            showToast('User deleted', 'success');
            loadUsers();
        }
    } catch (err) { }
};
