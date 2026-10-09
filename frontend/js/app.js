window.appState = {
    currentUser: null,
    complaints: [],
    pendingLocation: null
};

const STORAGE_KEYS = {
    complaints: 'brgyComplaintRecords',
    currentUser: 'brgyCurrentUser'
};

const demoUsers = {
    resident: {
        email: 'resident@example.com',
        password: 'pass123',
        name: 'Juan Dela Cruz',
        type: 'resident'
    },
    admin: {
        email: 'admin@example.com',
        password: 'admin123',
        name: 'Barangay Staff',
        type: 'admin'
    }
};

function getStoredComplaints() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.complaints);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to read complaints from localStorage:', error);
        return [];
    }
}

function saveComplaints(list) {
    localStorage.setItem(STORAGE_KEYS.complaints, JSON.stringify(list));
    window.appState.complaints = list;
}

function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        if (page.id === pageId) {
            page.classList.remove('hidden');
        } else {
            page.classList.add('hidden');
        }
    });

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });

    window.appState.currentPage = pageId;
}

function showAlert(message) {
    const alertModal = document.getElementById('alertModal');
    const alertMessage = document.getElementById('alertMessage');
    if (!alertModal || !alertMessage) return;
    alertMessage.textContent = message;
    alertModal.classList.remove('hidden');
}

function closeAlert() {
    const alertModal = document.getElementById('alertModal');
    if (alertModal) alertModal.classList.add('hidden');
}

function toggleLoading(show, message = 'Loading...') {
    const modal = document.getElementById('loadingModal');
    const text = document.getElementById('loadingMessage');
    if (!modal || !text) return;
    text.textContent = message;
    modal.classList.toggle('hidden', !show);
}

function buildNavMenu() {
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;

    const currentUser = window.appState.currentUser || JSON.parse(localStorage.getItem(STORAGE_KEYS.currentUser) || 'null');
    navMenu.innerHTML = '';

    const navMap = {
        resident: [
            { id: 'residentDashboard', label: 'Dashboard' },
            { id: 'residentFileComplaint', label: 'File Complaint' },
            { id: 'residentComplaintsList', label: 'My Complaints' }
        ],
        admin: [
            { id: 'adminDashboard', label: 'Dashboard' },
            { id: 'adminWalkInComplaint', label: 'Walk-In Complaint' },
            { id: 'adminComplaintsList', label: 'All Complaints' },
            { id: 'adminLocationReport', label: 'Location Reports' },
            { id: 'adminReports', label: 'Reports' }
        ]
    };

    const items = currentUser && currentUser.type ? navMap[currentUser.type] : [];

    items.forEach(item => {
        const navItem = document.createElement('li');
        navItem.className = 'nav-item';
        navItem.dataset.page = item.id;
        navItem.textContent = item.label;
        navItem.addEventListener('click', () => showPage(item.id));
        navMenu.appendChild(navItem);
    });
}

function formatDate(dateValue) {
    if (!dateValue) return 'N/A';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return dateValue;
    return date.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' });
}

function generateComplaintId() {
    return `CMP-${String(Date.now()).slice(-6)}`;
}

function generateReferenceNumber() {
    const year = new Date().getFullYear();
    const count = getStoredComplaints().length + 1;
    return `BRGY-${year}-${String(count).padStart(6, '0')}`;
}

function getCurrentUser() {
    const storedUser = localStorage.getItem(STORAGE_KEYS.currentUser);
    return storedUser ? JSON.parse(storedUser) : null;
}

function setCurrentUser(user) {
    localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(user));
    window.appState.currentUser = user;
}

function clearCurrentUser() {
    localStorage.removeItem(STORAGE_KEYS.currentUser);
    window.appState.currentUser = null;
}

function initializeApp() {
    window.appState.complaints = getStoredComplaints();

    const savedUser = getCurrentUser();
    if (savedUser) {
        window.appState.currentUser = savedUser;
        document.getElementById('loginContainer').classList.add('hidden');
        document.getElementById('dashboardContainer').classList.remove('dashboard-hidden');
        showPage(savedUser.type === 'admin' ? 'adminDashboard' : 'residentDashboard');
    } else {
        document.getElementById('loginContainer').classList.remove('hidden');
        document.getElementById('dashboardContainer').classList.add('dashboard-hidden');
        showPage('residentDashboard');
    }

    buildNavMenu();
    if (window.location.hash) {
        const hash = window.location.hash.replace('#', '');
        if (hash) showPage(hash);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    initializeMapPages();
    bindComplaintPageEvents();
    bindReportPageEvents();
});

function initializeMapPages() {
    if (document.getElementById('residentMapContainer')) {
        initializeLocationPicker({
            containerId: 'residentMapContainer',
            searchInputId: 'residentLocationSearch',
            latInputId: 'residentLatitude',
            lngInputId: 'residentLongitude',
            addressInputId: 'residentAddress',
            statusId: 'residentLocationStatus'
        });
    }

    if (document.getElementById('adminMapContainer')) {
        initializeLocationPicker({
            containerId: 'adminMapContainer',
            searchInputId: 'adminLocationSearch',
            latInputId: 'adminLatitude',
            lngInputId: 'adminLongitude',
            addressInputId: 'adminAddress',
            statusId: 'adminLocationStatus'
        });
    }

    if (document.getElementById('locationReportMapContainer')) {
        initializeLocationPicker({
            containerId: 'locationReportMapContainer',
            readOnly: true
        });
    }
}

window.showPage = showPage;
window.showAlert = showAlert;
window.closeAlert = closeAlert;
window.toggleLoading = toggleLoading;
window.generateComplaintId = generateComplaintId;
window.generateReferenceNumber = generateReferenceNumber;
window.formatDate = formatDate;
window.getStoredComplaints = getStoredComplaints;
window.saveComplaints = saveComplaints;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.clearCurrentUser = clearCurrentUser;
