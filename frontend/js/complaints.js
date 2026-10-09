document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const userType = document.getElementById('userType').value;

    if (!email || !password || !userType) {
        showAlert('Please enter your email, password, and user type.');
        return;
    }

    const validUser = demoUsers[userType];
    if (!validUser || validUser.email.toLowerCase() !== email.toLowerCase() || validUser.password !== password) {
        showAlert('Invalid credentials. Please use the demo account information shown below.');
        return;
    }

    const user = {
        email: validUser.email,
        name: validUser.name,
        type: validUser.type
    };

    setCurrentUser(user);
    buildNavMenu();
    document.getElementById('loginContainer').classList.add('hidden');
    document.getElementById('dashboardContainer').classList.remove('dashboard-hidden');
    showPage(user.type === 'admin' ? 'adminDashboard' : 'residentDashboard');
}

function handleLogout() {
    clearCurrentUser();
    document.getElementById('loginContainer').classList.remove('hidden');
    document.getElementById('dashboardContainer').classList.add('dashboard-hidden');
    document.getElementById('loginForm').reset();
    showPage('residentDashboard');
    buildNavMenu();
}

window.handleLogin = handleLogin;
window.handleLogout = handleLogout;
window.demoUsers = demoUsers;
