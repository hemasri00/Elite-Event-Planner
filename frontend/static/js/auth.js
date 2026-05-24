/* ========================================================
   ELITE EVENT PLANNER - SECURE AUTH & DASHBOARDS CONTROLLER
   ======================================================== */

// Configure API base dynamically
const isLocalHost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.hostname.startsWith('192.168.') || 
                    window.location.hostname.startsWith('10.') || 
                    window.location.hostname.startsWith('172.') ||
                    window.location.port !== '';

const AUTH_API_BASE = isLocalHost 
    ? '' 
    : (window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : 'https://elite-event-planner.onrender.com');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Session verification check on every page
    checkSessionState();

    // 2. Register Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
    }

    // 3. Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
});

/* ========================================================
   SESSION DISCOVERER & DYNAMIC NAVIGATION ADAPTER
   ======================================================= */
let currentUser = null;

async function checkSessionState() {
    try {
        // Fetch session with credentials enabled for secure session cookies
        const response = await fetch(`${AUTH_API_BASE}/api/auth/session`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                currentUser = data.user;
                updateNavigationForUser(currentUser);
                prefillForms(currentUser);
                
                // Initialize dashboards if on corresponding page
                if (document.getElementById('user-dashboard-section')) {
                    loadUserDashboard(currentUser);
                }
                if (document.getElementById('admin-dashboard-section')) {
                    loadAdminDashboard(currentUser);
                }
                return;
            }
        }
    } catch (e) {
        console.error('Session retrieval error:', e);
    }

    // Default: Not Logged In
    updateNavigationForUser(null);
    
    // Redirect if on guarded pages
    if (document.getElementById('user-dashboard-section') || document.getElementById('admin-dashboard-section')) {
        window.location.href = '/login';
    }
}

function updateNavigationForUser(user) {
    const navRight = document.getElementById('navbar-right-links');
    if (!navRight) return;

    if (user) {
        let dashboardLink = '/dashboard';
        let adminItem = '';

        if (user.role === 'admin') {
            dashboardLink = '/admin';
            adminItem = `<li class="nav-item"><a class="nav-link nav-link-custom" href="/admin"><i class="bi bi-shield-lock-fill"></i> Admin Panel</a></li>`;
        }

        navRight.innerHTML = `
            ${adminItem}
            <li class="nav-item">
                <a class="nav-link nav-link-custom" href="/dashboard"><i class="bi bi-person-fill"></i> Dashboard</a>
            </li>
            <li class="nav-item text-white d-flex align-items-center px-2">
                <span class="badge bg-secondary rounded-pill small px-3">Hi, ${user.name.split(' ')[0]}</span>
            </li>
            <li class="nav-item ms-2">
                <a class="btn btn-sm btn-elite-outline" href="/logout" onclick="event.preventDefault(); triggerLogout();"><i class="bi bi-box-arrow-right"></i> Logout</a>
            </li>
        `;
    } else {
        navRight.innerHTML = `
            <li class="nav-item">
                <a class="nav-link nav-link-custom" href="/login"><i class="bi bi-box-arrow-in-right"></i> Login</a>
            </li>
            <li class="nav-item ms-2">
                <a class="btn btn-sm btn-elite" href="/register"><i class="bi bi-person-plus-fill"></i> Register</a>
            </li>
        `;
    }
}

function prefillForms(user) {
    if (!user) return;
    
    // Prefill booking form
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        const nameField = document.getElementById('name');
        const emailField = document.getElementById('email');
        const phoneField = document.getElementById('phone');

        if (nameField && !nameField.value) nameField.value = user.name;
        if (emailField && !emailField.value) emailField.value = user.email;
        if (phoneField && !phoneField.value) phoneField.value = user.phone;
    }
}

async function triggerLogout() {
    try {
        await fetch(`${AUTH_API_BASE}/api/auth/logout`, { method: 'POST' });
    } catch (e) {
        console.error('Logout request failed:', e);
    }
    // Clean local cookies / redirection
    window.location.href = '/logout';
}

/* ========================================================
   AUTHENTICATION FORM SUBMISSIONS
   ======================================================= */
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match.', 'error');
        return;
    }

    try {
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Initializing...`;
        btn.disabled = true;

        const response = await fetch(`${AUTH_API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, phone, password, confirm_password: confirmPassword })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast('Registration successful! Logging in...', 'success');
            setTimeout(() => {
                window.location.href = result.user.role === 'admin' ? '/admin' : '/dashboard';
            }, 1000);
        } else {
            showToast(result.message || 'Registration failed.', 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Network error. Unable to perform registration.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Authenticating...`;
        btn.disabled = true;

        const response = await fetch(`${AUTH_API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showToast('Login successful! Welcome back.', 'success');
            setTimeout(() => {
                window.location.href = result.user.role === 'admin' ? '/admin' : '/dashboard';
            }, 1000);
        } else {
            showToast(result.message || 'Invalid credentials.', 'error');
        }
    } catch (error) {
        console.error(error);
        showToast('Network error. Unable to perform login.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

/* ========================================================
   USER DASHBOARD INTEGRATION
   ======================================================= */
async function loadUserDashboard(user) {
    const dashboardHeader = document.getElementById('user-dashboard-title');
    if (dashboardHeader) {
        dashboardHeader.innerText = `Welcome to Your Elite Dashboard, ${user.name}`;
    }

    const bookingsTableBody = document.getElementById('user-bookings-table-body');
    if (!bookingsTableBody) return;

    try {
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status"></div>
                    <p class="mt-2 text-muted">Retrieving your bookings...</p>
                </td>
            </tr>
        `;

        const response = await fetch(`${AUTH_API_BASE}/api/user/bookings`);
        if (!response.ok) throw new Error('Unauthorised or session expired.');

        const bookings = await response.json();

        if (bookings.length === 0) {
            bookingsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-5">
                        <i class="bi bi-calendar-event fs-1 text-muted"></i>
                        <p class="mt-2 text-muted">You have no booking requests yet.</p>
                        <a href="/booking" class="btn btn-sm btn-elite mt-2">Book Your First Event</a>
                    </td>
                </tr>
            `;
            return;
        }

        bookingsTableBody.innerHTML = bookings.map(b => {
            let badgeClass = 'badge-status-pending';
            if (b.status === 'Confirmed') badgeClass = 'badge-status-confirmed';
            if (b.status === 'Cancelled') badgeClass = 'badge-status-cancelled';

            return `
                <tr>
                    <td><b>#EP-${b.id}</b></td>
                    <td>${b.event_type}</td>
                    <td><i class="bi bi-calendar3"></i> ${b.event_date}</td>
                    <td>${b.venue}</td>
                    <td><b>$${b.budget.toLocaleString()}</b></td>
                    <td><span class="${badgeClass}">${b.status}</span></td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error(error);
        bookingsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger py-4">
                    <i class="bi bi-exclamation-triangle-fill"></i> Session expired. Please log in again.
                </td>
            </tr>
        `;
    }
}

/* ========================================================
   ADMIN DASHBOARD INTEGRATION
   ======================================================= */
async function loadAdminDashboard(user) {
    if (user.role !== 'admin') {
        window.location.href = '/dashboard';
        return;
    }

    // Load statistics
    loadAdminStats();
    
    // Load Bookings Table
    loadAdminBookings();

    // Load Users Table
    loadAdminUsers();
}

async function loadAdminStats() {
    try {
        const response = await fetch(`${AUTH_API_BASE}/api/admin/stats`);
        if (!response.ok) return;

        const data = await response.json();
        if (data.success) {
            const stats = data.stats;
            document.getElementById('stat-total-bookings').innerText = stats.total_bookings;
            document.getElementById('stat-total-users').innerText = stats.total_users;
            document.getElementById('stat-total-revenue').innerText = `$${stats.total_revenue.toLocaleString()}`;
            document.getElementById('stat-pending-bookings').innerText = stats.pending_bookings;
        }
    } catch (e) {
        console.error('Error loading admin statistics:', e);
    }
}

async function loadAdminBookings() {
    const adminBookingsBody = document.getElementById('admin-bookings-table-body');
    if (!adminBookingsBody) return;

    try {
        adminBookingsBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4">
                    <div class="spinner-border text-primary" role="status"></div>
                </td>
            </tr>
        `;

        const response = await fetch(`${AUTH_API_BASE}/api/admin/bookings`);
        const bookings = await response.json();

        if (bookings.length === 0) {
            adminBookingsBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-5">No bookings found in database.</td>
                </tr>
            `;
            return;
        }

        adminBookingsBody.innerHTML = bookings.map(b => {
            let badgeClass = 'badge-status-pending';
            if (b.status === 'Confirmed') badgeClass = 'badge-status-confirmed';
            if (b.status === 'Cancelled') badgeClass = 'badge-status-cancelled';

            return `
                <tr id="admin-booking-row-${b.id}">
                    <td><b>#EP-${b.id}</b></td>
                    <td>
                        <div class="fw-semibold">${b.name}</div>
                        <div class="text-muted small">${b.email}</div>
                        <div class="text-muted small">${b.phone}</div>
                    </td>
                    <td>${b.event_type}</td>
                    <td>${b.event_date}</td>
                    <td>${b.venue}</td>
                    <td><b>$${b.budget.toLocaleString()}</b></td>
                    <td><span class="${badgeClass}" id="admin-booking-status-badge-${b.id}">${b.status}</span></td>
                    <td>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                Status
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="updateStatus(${b.id}, 'Confirmed')">Confirm</a></li>
                                <li><a class="dropdown-item" href="#" onclick="updateStatus(${b.id}, 'Pending')">Set Pending</a></li>
                                <li><a class="dropdown-item" href="#" onclick="updateStatus(${b.id}, 'Cancelled')">Cancel</a></li>
                            </ul>
                        </div>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteBooking(${b.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error('Error loading admin bookings:', e);
    }
}

async function loadAdminUsers() {
    const adminUsersBody = document.getElementById('admin-users-table-body');
    if (!adminUsersBody) return;

    try {
        adminUsersBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div></td>
            </tr>
        `;

        const response = await fetch(`${AUTH_API_BASE}/api/admin/users`);
        const users = await response.json();

        adminUsersBody.innerHTML = users.map(u => `
            <tr>
                <td><b>#U-${u.id}</b></td>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>${u.phone}</td>
                <td><span class="badge ${u.role === 'admin' ? 'bg-danger' : 'bg-primary'}">${u.role.toUpperCase()}</span></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error('Error loading admin users:', e);
    }
}

/* ========================================================
   ADMIN ACTIONS (STATUS UPDATES, DELETIONS)
   ======================================================= */
window.updateStatus = async function(bookingId, status) {
    try {
        const response = await fetch(`${AUTH_API_BASE}/api/admin/bookings/${bookingId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        const result = await response.json();
        if (response.ok && result.success) {
            showToast(`Booking status updated to ${status}!`, 'success');
            
            // Instantly update badge in UI
            const badge = document.getElementById(`admin-booking-status-badge-${bookingId}`);
            if (badge) {
                badge.innerText = status;
                badge.className = ''; // clear classes
                
                let badgeClass = 'badge-status-pending';
                if (status === 'Confirmed') badgeClass = 'badge-status-confirmed';
                if (status === 'Cancelled') badgeClass = 'badge-status-cancelled';
                badge.classList.add(badgeClass);
            }
            
            // Refresh stats to capture updated revenue
            loadAdminStats();
        } else {
            showToast(result.message || 'Status update failed.', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Server connection error.', 'error');
    }
};

window.deleteBooking = async function(bookingId) {
    if (!confirm('Are you absolutely sure you want to permanently delete this booking?')) return;

    try {
        const response = await fetch(`${AUTH_API_BASE}/api/admin/bookings/${bookingId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (response.ok && result.success) {
            showToast('Booking deleted successfully!', 'success');
            
            // Instantly remove row from table in UI
            const row = document.getElementById(`admin-booking-row-${bookingId}`);
            if (row) row.remove();
            
            // Refresh stats
            loadAdminStats();
        } else {
            showToast(result.message || 'Failed to delete booking.', 'error');
        }
    } catch (e) {
        console.error(e);
        showToast('Server connection error.', 'error');
    }
};
