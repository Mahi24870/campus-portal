document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is already logged in
    if (window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '/register.html') {
        try {
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    window.location.href = '/dashboard.html';
                }
            }
        } catch (e) {
            // Not logged in or error, stay on page
        }
    }

    // Handle Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            const btn = loginForm.querySelector('button');
            btn.disabled = true;
            btn.textContent = 'Logging in...';

            try {
                const result = await apiCall('POST', '/api/auth/login', { email, password });
                if (result.success) {
                    window.location.href = '/dashboard.html';
                }
            } catch (err) {
                // Validation/API error Toast is shown by apiCall
                btn.disabled = false;
                btn.textContent = 'Log In';
                document.getElementById('password').value = '';
            }
        });
    }

    // Handle Registration
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const full_name = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const role = document.getElementById('role').value;
            const department = document.getElementById('department').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            let valid = true;
            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'Passwords do not match';
                valid = false;
            } else {
                document.getElementById('confirmPasswordError').textContent = '';
            }

            if (password.length < 6) {
                document.getElementById('passwordError').textContent = 'Passwords must be at least 6 characters';
                valid = false;
            } else {
                document.getElementById('passwordError').textContent = '';
            }

            if (!valid) return;

            const btn = registerForm.querySelector('button');
            btn.disabled = true;
            btn.textContent = 'Creating Account...';

            try {
                const result = await apiCall('POST', '/api/auth/register', {
                    full_name, email, password, role, department
                });
                if (result.success) {
                    showToast('Registration successful!', 'success');
                    setTimeout(() => {
                        window.location.href = '/dashboard.html';
                    }, 1000);
                }
            } catch (err) {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        });
    }
});
