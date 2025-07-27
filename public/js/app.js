// Main Application JavaScript
class MicroTasksApp {
    constructor() {
        this.currentUser = null;
        this.socket = null;
        this.pages = {};
        this.currentPage = 'home';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeSocket();
        this.checkAuthentication();
        this.setupRouting();
        this.hideLoadingSpinner();
    }

    // Initialize Socket.IO connection
    initializeSocket() {
        if (typeof io !== 'undefined') {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Connected to server');
                if (this.currentUser) {
                    this.socket.emit('join_user_room', this.currentUser.id);
                }
            });

            this.socket.on('notification', (notification) => {
                this.handleRealtimeNotification(notification);
            });

            this.socket.on('task_update', (data) => {
                this.handleTaskUpdate(data);
            });
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Navigation links
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-page]')) {
                e.preventDefault();
                const page = e.target.getAttribute('data-page');
                this.navigateTo(page);
            }
        });

        // Mobile menu toggle
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        // Modal close buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal')) {
                this.closeModal(e.target.closest('.modal'));
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('form[data-form]')) {
                e.preventDefault();
                const formType = e.target.getAttribute('data-form');
                this.handleFormSubmission(formType, e.target);
            }
        });
    }

    // Setup routing
    setupRouting() {
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (e) => {
            const page = e.state?.page || 'home';
            this.navigateTo(page, false);
        });

        // Handle initial page load
        const hash = window.location.hash.substring(1);
        if (hash) {
            this.navigateTo(hash, false);
        } else {
            this.navigateTo('home', false);
        }
    }

    // Navigate to page
    navigateTo(page, updateHistory = true) {
        // Check if user needs to be authenticated for this page
        const protectedPages = ['dashboard', 'wallet', 'tasks', 'profile', 'kyc', 'referral', 'settings'];
        
        if (protectedPages.includes(page) && !this.currentUser) {
            this.navigateTo('login');
            this.showToast('Please login to access this page', 'warning');
            return;
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => {
            p.style.display = 'none';
            p.classList.remove('active');
        });

        // Show target page
        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.style.display = 'block';
            setTimeout(() => {
                targetPage.classList.add('active');
            }, 50);
        }

        // Update navigation
        this.updateNavigation(page);

        // Load page content if needed
        this.loadPageContent(page);

        // Update URL
        if (updateHistory) {
            window.history.pushState({ page }, '', `#${page}`);
        }

        this.currentPage = page;
    }

    // Update navigation active state
    updateNavigation(page) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === page) {
                link.classList.add('active');
            }
        });
    }

    // Load page content dynamically
    async loadPageContent(page) {
        const pageElement = document.getElementById(`page-${page}`);
        
        // Don't reload if content already exists
        if (pageElement.children.length > 0) {
            return;
        }

        try {
            switch (page) {
                case 'login':
                    await this.loadLoginPage();
                    break;
                case 'register':
                    await this.loadRegisterPage();
                    break;
                case 'dashboard':
                    await this.loadDashboardPage();
                    break;
                case 'tasks':
                    await this.loadTasksPage();
                    break;
                case 'wallet':
                    await this.loadWalletPage();
                    break;
                case 'plans':
                    await this.loadPlansPage();
                    break;
                case 'referral':
                    await this.loadReferralPage();
                    break;
                case 'profile':
                    await this.loadProfilePage();
                    break;
                case 'kyc':
                    await this.loadKYCPage();
                    break;
                case 'blog':
                    await this.loadBlogPage();
                    break;
                case 'settings':
                    await this.loadSettingsPage();
                    break;
            }
        } catch (error) {
            console.error(`Error loading ${page} page:`, error);
            this.showToast('Error loading page', 'error');
        }
    }

    // Load login page
    async loadLoginPage() {
        const html = `
            <div class="container">
                <div class="auth-wrapper">
                    <div class="auth-card card">
                        <div class="card-header text-center">
                            <h2 class="card-title">Welcome Back!</h2>
                            <p>Sign in to your account to continue earning</p>
                        </div>
                        <div class="card-body">
                            <form data-form="login" class="auth-form">
                                <div class="form-group">
                                    <label class="form-label">Email, Phone, or Username</label>
                                    <input type="text" name="identifier" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Password</label>
                                    <input type="password" name="password" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <button type="submit" class="btn btn-primary w-full">
                                        <i class="fas fa-sign-in-alt"></i> Sign In
                                    </button>
                                </div>
                            </form>
                            <div class="auth-links text-center">
                                <p><a href="#register" data-page="register">Don't have an account? Register</a></p>
                                <p><a href="#forgot-password" data-page="forgot-password">Forgot Password?</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('page-login').innerHTML = html;
    }

    // Load register page
    async loadRegisterPage() {
        const html = `
            <div class="container">
                <div class="auth-wrapper">
                    <div class="auth-card card">
                        <div class="card-header text-center">
                            <h2 class="card-title">Join Micro Tasks!</h2>
                            <p>Create your account and start earning today</p>
                        </div>
                        <div class="card-body">
                            <form data-form="register" class="auth-form">
                                <div class="form-group">
                                    <label class="form-label">First Name</label>
                                    <input type="text" name="firstName" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Last Name</label>
                                    <input type="text" name="lastName" class="form-input">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Email</label>
                                    <input type="email" name="email" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Phone Number</label>
                                    <input type="tel" name="phone" class="form-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Password</label>
                                    <input type="password" name="password" class="form-input" required minlength="6">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Referral Code (Optional)</label>
                                    <input type="text" name="referralCode" class="form-input" placeholder="Enter referral code to get bonus">
                                    <div class="form-help">Get ₹500 bonus when you use a referral code!</div>
                                </div>
                                <div class="form-group">
                                    <button type="submit" class="btn btn-primary w-full">
                                        <i class="fas fa-user-plus"></i> Create Account
                                    </button>
                                </div>
                            </form>
                            <div class="auth-links text-center">
                                <p><a href="#login" data-page="login">Already have an account? Sign In</a></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('page-register').innerHTML = html;
    }

    // Load dashboard page
    async loadDashboardPage() {
        if (!this.currentUser) return;

        const html = `
            <div class="container">
                <div class="dashboard-header">
                    <h1>Welcome back, ${this.currentUser.username}!</h1>
                    <p>Here's your earning overview</p>
                </div>
                
                <div class="dashboard-stats">
                    <div class="stat-card card">
                        <div class="card-body">
                            <div class="stat-icon"><i class="fas fa-wallet"></i></div>
                            <div class="stat-value">${this.currentUser.wallet?.points || 0}</div>
                            <div class="stat-label">Total Points</div>
                        </div>
                    </div>
                    <div class="stat-card card">
                        <div class="card-body">
                            <div class="stat-icon"><i class="fas fa-rupee-sign"></i></div>
                            <div class="stat-value">₹${this.currentUser.wallet?.inr || 0}</div>
                            <div class="stat-label">INR Balance</div>
                        </div>
                    </div>
                    <div class="stat-card card">
                        <div class="card-body">
                            <div class="stat-icon"><i class="fas fa-tasks"></i></div>
                            <div class="stat-value">${this.currentUser.plan?.tasksCompletedToday || 0}/${this.currentUser.plan?.dailyTaskLimit || 15}</div>
                            <div class="stat-label">Tasks Today</div>
                        </div>
                    </div>
                    <div class="stat-card card">
                        <div class="card-body">
                            <div class="stat-icon"><i class="fas fa-users"></i></div>
                            <div class="stat-value">${this.currentUser.referral?.totalReferrals || 0}</div>
                            <div class="stat-label">Referrals</div>
                        </div>
                    </div>
                </div>

                <div class="dashboard-actions">
                    <a href="#tasks" data-page="tasks" class="btn btn-primary">
                        <i class="fas fa-tasks"></i> Start Tasks
                    </a>
                    <a href="#wallet" data-page="wallet" class="btn btn-outline">
                        <i class="fas fa-wallet"></i> Manage Wallet
                    </a>
                    <a href="#referral" data-page="referral" class="btn btn-success">
                        <i class="fas fa-users"></i> Invite Friends
                    </a>
                </div>
            </div>
        `;
        document.getElementById('page-dashboard').innerHTML = html;
    }

    // Handle form submissions
    async handleFormSubmission(formType, form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            switch (formType) {
                case 'login':
                    await this.handleLogin(data);
                    break;
                case 'register':
                    await this.handleRegister(data);
                    break;
                // Add more form handlers as needed
            }
        } catch (error) {
            console.error(`Error handling ${formType} form:`, error);
            this.showToast(error.message || 'An error occurred', 'error');
        }
    }

    // Handle login
    async handleLogin(data) {
        const response = await this.apiCall('/api/auth/login', 'POST', data);
        
        if (response.success) {
            this.currentUser = response.user;
            localStorage.setItem('token', response.token);
            this.updateUIForAuthenticatedUser();
            this.navigateTo('dashboard');
            this.showToast('Login successful!', 'success');
        } else {
            throw new Error(response.message);
        }
    }

    // Handle registration
    async handleRegister(data) {
        const response = await this.apiCall('/api/auth/register', 'POST', data);
        
        if (response.success) {
            this.showToast('Registration successful! Please verify your email and phone.', 'success');
            this.navigateTo('login');
        } else {
            throw new Error(response.message);
        }
    }

    // Check authentication status
    async checkAuthentication() {
        const token = localStorage.getItem('token');
        if (!token) {
            this.updateUIForGuestUser();
            return;
        }

        try {
            const response = await this.apiCall('/api/auth/me', 'GET');
            if (response.success) {
                this.currentUser = response.user;
                this.updateUIForAuthenticatedUser();
            } else {
                localStorage.removeItem('token');
                this.updateUIForGuestUser();
            }
        } catch (error) {
            localStorage.removeItem('token');
            this.updateUIForGuestUser();
        }
    }

    // Update UI for authenticated user
    updateUIForAuthenticatedUser() {
        document.getElementById('nav-auth').style.display = 'flex';
        document.getElementById('nav-guest').style.display = 'none';
        
        // Update user info
        const userName = document.getElementById('user-name');
        if (userName) {
            userName.textContent = this.currentUser.username || 'User';
        }

        // Join socket room
        if (this.socket && this.currentUser) {
            this.socket.emit('join_user_room', this.currentUser.id);
        }

        // Load notifications
        this.loadNotifications();
    }

    // Update UI for guest user
    updateUIForGuestUser() {
        document.getElementById('nav-auth').style.display = 'none';
        document.getElementById('nav-guest').style.display = 'flex';
        this.currentUser = null;
    }

    // Logout
    async logout() {
        try {
            await this.apiCall('/api/auth/logout', 'POST');
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        localStorage.removeItem('token');
        this.currentUser = null;
        this.updateUIForGuestUser();
        this.navigateTo('home');
        this.showToast('Logged out successfully', 'info');
    }

    // API call helper
    async apiCall(url, method = 'GET', data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Request failed');
        }

        return { success: true, ...result };
    }

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <strong>${type.charAt(0).toUpperCase() + type.slice(1)}</strong>
                <p>${message}</p>
            </div>
        `;

        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove toast after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => container.removeChild(toast), 300);
        }, 5000);
    }

    // Load notifications
    async loadNotifications() {
        try {
            const response = await this.apiCall('/api/notifications');
            if (response.success) {
                this.updateNotificationBadge(response.unreadCount);
                this.renderNotifications(response.notifications);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    // Update notification badge
    updateNotificationBadge(count) {
        const badge = document.getElementById('notification-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Handle realtime notifications
    handleRealtimeNotification(notification) {
        this.showToast(notification.message, 'info');
        this.loadNotifications(); // Refresh notifications
    }

    // Handle task updates
    handleTaskUpdate(data) {
        if (this.currentPage === 'tasks') {
            // Refresh tasks page if user is viewing it
            this.loadTasksPage();
        }
    }

    // Show modal
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    // Close modal
    closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // Hide loading spinner
    hideLoadingSpinner() {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            setTimeout(() => {
                spinner.style.display = 'none';
            }, 1000);
        }
    }

    // Placeholder methods for other pages
    async loadTasksPage() { /* Implementation needed */ }
    async loadWalletPage() { /* Implementation needed */ }
    async loadPlansPage() { /* Implementation needed */ }
    async loadReferralPage() { /* Implementation needed */ }
    async loadProfilePage() { /* Implementation needed */ }
    async loadKYCPage() { /* Implementation needed */ }
    async loadBlogPage() { /* Implementation needed */ }
    async loadSettingsPage() { /* Implementation needed */ }
    renderNotifications(notifications) { /* Implementation needed */ }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MicroTasksApp();
});

// Add styles for auth pages
const authStyles = `
<style>
.auth-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    padding: 2rem 0;
}

.auth-card {
    max-width: 400px;
    width: 100%;
}

.auth-form .form-group {
    margin-bottom: 1.5rem;
}

.auth-links {
    margin-top: 1.5rem;
}

.auth-links a {
    color: var(--primary);
    text-decoration: none;
}

.auth-links a:hover {
    text-decoration: underline;
}

.dashboard-header {
    text-align: center;
    margin-bottom: 3rem;
}

.dashboard-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.dashboard-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
}

.stat-card {
    text-align: center;
}

.stat-card .card-body {
    padding: 2rem;
}

.stat-icon {
    font-size: 2.5rem;
    color: var(--primary);
    margin-bottom: 1rem;
}

.stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.stat-label {
    color: var(--text-secondary);
    font-weight: 500;
}

.dashboard-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
    flex-wrap: wrap;
}

@media (max-width: 768px) {
    .dashboard-stats {
        grid-template-columns: 1fr;
    }
    
    .dashboard-actions {
        flex-direction: column;
        align-items: center;
    }
    
    .dashboard-actions .btn {
        width: 100%;
        max-width: 300px;
    }
}
</style>
`;

// Inject auth styles
document.head.insertAdjacentHTML('beforeend', authStyles);