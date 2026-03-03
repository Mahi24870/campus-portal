// Utility API wrapper
async function apiCall(method, endpoint, data = null, isFormData = false) {
    const options = {
        method,
        headers: {},
    };

    if (isFormData) {
        options.body = data;
    } else if (data) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(endpoint, options);
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'API Error');
        }
        return result;
    } catch (err) {
        showToast(err.message, 'error');
        throw err;
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i> ${message}`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Date/Time formatting
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const d = new Date();
    d.setHours(hours, minutes);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Categories colors
function getCategoryColor(category) {
    const colors = {
        academic: 'var(--navy-light)',
        cultural: 'var(--gold)',
        sports: 'var(--teal-dark)',
        workshop: 'var(--teal)',
        seminar: 'var(--gray-500)',
        other: 'var(--navy)'
    };
    return colors[category.toLowerCase()] || 'var(--gray-800)';
}

// Global modal handlers
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
    }
});
