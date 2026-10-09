document.addEventListener('DOMContentLoaded', () => {
    bindComplaintPageEvents();
    renderResidentComplaintsList();
    renderAdminComplaintsList();
});

function bindComplaintPageEvents() {
    const residentForm = document.getElementById('residentComplaintForm');
    const walkInForm = document.getElementById('adminWalkInForm');

    if (residentForm) {
        residentForm.addEventListener('submit', handleResidentComplaintSubmit);
    }

    if (walkInForm) {
        walkInForm.addEventListener('submit', handleWalkInComplaintSubmit);
    }

    const residentEvidenceInput = document.getElementById('residentEvidence');
    if (residentEvidenceInput) {
        residentEvidenceInput.addEventListener('change', () => updateFilePreview('residentFilePreview', residentEvidenceInput.files));
    }

    const adminEvidenceInput = document.getElementById('adminEvidence');
    if (adminEvidenceInput) {
        adminEvidenceInput.addEventListener('change', () => updateFilePreview('adminFilePreview', adminEvidenceInput.files));
    }
}

function updateFilePreview(containerId, files) {
    const preview = document.getElementById(containerId);
    if (!preview) return;
    preview.innerHTML = '';
    Array.from(files || []).slice(0, 3).forEach(file => {
        const tag = document.createElement('span');
        tag.className = 'file-tag';
        tag.textContent = file.name;
        preview.appendChild(tag);
    });
}

function collectEvidenceFromInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.files) return [];
    return Array.from(input.files).map(file => ({
        name: file.name,
        type: file.type || 'document',
        size: file.size
    }));
}

function isLocationConfirmed(inputId) {
    const status = document.getElementById(inputId);
    return status && status.dataset.confirmed === 'true';
}

function handleResidentComplaintSubmit(event) {
    event.preventDefault();

    const form = document.getElementById('residentComplaintForm');
    const complaintTitle = document.getElementById('complaintTitle').value.trim();
    const description = document.getElementById('complaintDescription').value.trim();
    const category = document.getElementById('complaintCategory').value;
    const location = document.getElementById('residentAddress').value.trim();
    const latitude = Number(document.getElementById('residentLatitude').value);
    const longitude = Number(document.getElementById('residentLongitude').value);
    const statusMessage = document.getElementById('residentLocationStatus');

    if (!complaintTitle || !description || !category) {
        showAlert('Please fill in all complaint details before submitting.');
        return;
    }

    if (!location || Number.isNaN(latitude) || Number.isNaN(longitude) || !isLocationConfirmed('residentLocationStatus')) {
        if (statusMessage) {
            statusMessage.textContent = 'Please select and confirm the complaint location.';
            statusMessage.className = 'status-message error';
        }
        showAlert('Please select and confirm the complaint location.');
        return;
    }

    const complaints = getStoredComplaints();
    const user = getCurrentUser();
    const newComplaint = {
        complaint_id: generateComplaintId(),
        reference_number: generateReferenceNumber(),
        complaint_title: complaintTitle,
        description,
        category,
        status: 'Submitted',
        submission_type: 'ONLINE',
        location,
        latitude,
        longitude,
        resident_id: user ? user.email : 'unknown',
        resident_name: user ? user.name : 'Resident',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        evidence: collectEvidenceFromInput('residentEvidence')
    };

    complaints.push(newComplaint);
    saveComplaints(complaints);

    form.reset();
    const residentMap = getMapState('residentMapContainer');
    if (residentMap) {
        clearLocationState('residentMapContainer');
    }

    renderResidentComplaintsList();
    renderAdminComplaintsList();
    showPage('residentComplaintsList');
    showAlert('Complaint submitted successfully.');
}

function handleWalkInComplaintSubmit(event) {
    event.preventDefault();

    const form = document.getElementById('adminWalkInForm');
    const residentName = document.getElementById('walkInResidentName').value.trim();
    const complaintTitle = document.getElementById('walkInComplaintTitle').value.trim();
    const description = document.getElementById('walkInComplaintDescription').value.trim();
    const category = document.getElementById('walkInComplaintCategory').value;
    const location = document.getElementById('adminAddress').value.trim();
    const latitude = Number(document.getElementById('adminLatitude').value);
    const longitude = Number(document.getElementById('adminLongitude').value);
    const statusMessage = document.getElementById('adminLocationStatus');

    if (!residentName || !complaintTitle || !description || !category) {
        showAlert('Please complete resident and complaint details before saving the walk-in complaint.');
        return;
    }

    if (!location || Number.isNaN(latitude) || Number.isNaN(longitude) || !isLocationConfirmed('adminLocationStatus')) {
        if (statusMessage) {
            statusMessage.textContent = 'Please select and confirm the complaint location.';
            statusMessage.className = 'status-message error';
        }
        showAlert('Please select and confirm the complaint location.');
        return;
    }

    const complaints = getStoredComplaints();
    const newComplaint = {
        complaint_id: generateComplaintId(),
        reference_number: generateReferenceNumber(),
        complaint_title: complaintTitle,
        description,
        category,
        status: 'Submitted',
        submission_type: 'WALK-IN',
        location,
        latitude,
        longitude,
        resident_id: 'walk-in',
        resident_name: residentName,
        email: document.getElementById('walkInResidentEmail').value.trim(),
        phone: document.getElementById('walkInResidentPhone').value.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        evidence: collectEvidenceFromInput('adminEvidence')
    };

    complaints.push(newComplaint);
    saveComplaints(complaints);

    form.reset();
    const adminMap = getMapState('adminMapContainer');
    if (adminMap) {
        clearLocationState('adminMapContainer');
    }

    renderResidentComplaintsList();
    renderAdminComplaintsList();
    showPage('adminComplaintsList');
    showAlert('Walk-in complaint saved successfully.');
}

function renderResidentComplaintsList() {
    const container = document.getElementById('residentComplaintsContainer');
    if (!container) return;

    const user = getCurrentUser();
    const complaints = getStoredComplaints().filter(record =>
        record.submission_type === 'ONLINE' && record.resident_id === user?.email
    );

    if (!complaints.length) {
        container.innerHTML = '<div class="empty-state">No complaints found. Submit one from the File Complaint page.</div>';
        return;
    }

    container.innerHTML = complaints.slice().reverse().map(complaint => `
        <div class="complaint-card">
            <div class="complaint-header">
                <h4>${escapeHtml(complaint.complaint_title)}</h4>
                <span class="badge status-${slugify(complaint.status || 'Submitted')}">${escapeHtml(complaint.status || 'Submitted')}</span>
            </div>
            <p><strong>Reference:</strong> ${escapeHtml(complaint.reference_number || 'N/A')}</p>
            <p><strong>Category:</strong> ${escapeHtml(complaint.category || 'N/A')}</p>
            <p><strong>Location:</strong> ${escapeHtml(complaint.location || 'Not available')}</p>
            <div class="complaint-meta">
                <span><strong>Submitted:</strong> ${formatDate(complaint.created_at)}</span>
                <span><strong>Type:</strong> ${escapeHtml(complaint.submission_type || 'ONLINE')}</span>
            </div>
            <button class="btn btn-secondary" onclick="viewComplaintDetails('resident', '${complaint.complaint_id}')">View Details</button>
        </div>
    `).join('');
}

function renderAdminComplaintsList() {
    const container = document.getElementById('adminComplaintsContainer');
    if (!container) return;

    const complaints = getStoredComplaints().slice().reverse();
    if (!complaints.length) {
        container.innerHTML = '<div class="empty-state">No complaints available.</div>';
        return;
    }

    container.innerHTML = complaints.map(complaint => `
        <div class="complaint-card">
            <div class="complaint-header">
                <h4>${escapeHtml(complaint.complaint_title)}</h4>
                <span class="badge status-${slugify(complaint.status || 'Submitted')}">${escapeHtml(complaint.status || 'Submitted')}</span>
            </div>
            <p><strong>Reference:</strong> ${escapeHtml(complaint.reference_number || 'N/A')}</p>
            <p><strong>Resident:</strong> ${escapeHtml(complaint.resident_name || 'N/A')}</p>
            <p><strong>Category:</strong> ${escapeHtml(complaint.category || 'N/A')}</p>
            <p><strong>Location:</strong> ${escapeHtml(complaint.location || 'Not available')}</p>
            <div class="complaint-meta">
                <span><strong>Submitted:</strong> ${formatDate(complaint.created_at)}</span>
                <span><strong>Type:</strong> ${escapeHtml(complaint.submission_type || 'ONLINE')}</span>
            </div>
            <button class="btn btn-secondary" onclick="viewComplaintDetails('admin', '${complaint.complaint_id}')">View Details</button>
        </div>
    `).join('');
}

function viewComplaintDetails(type, complaintId) {
    const complaint = getStoredComplaints().find(item => item.complaint_id === complaintId);
    if (!complaint) {
        showAlert('Complaint not found.');
        return;
    }

    const content = document.getElementById(type === 'resident' ? 'residentComplaintDetailsContent' : 'adminComplaintDetailsContent');
    if (!content) return;

    const complaintMapId = `${type}ComplaintMapView`;
    content.innerHTML = `
        <div class="detail-grid">
            <div class="detail-item"><strong>Complaint Reference</strong>${escapeHtml(complaint.reference_number || 'N/A')}</div>
            <div class="detail-item"><strong>Complaint Title</strong>${escapeHtml(complaint.complaint_title || 'N/A')}</div>
            <div class="detail-item"><strong>Category</strong>${escapeHtml(complaint.category || 'N/A')}</div>
            <div class="detail-item"><strong>Status</strong>${escapeHtml(complaint.status || 'Submitted')}</div>
            <div class="detail-item"><strong>Submission Type</strong>${escapeHtml(complaint.submission_type || 'ONLINE')}</div>
            <div class="detail-item"><strong>Date</strong>${formatDate(complaint.created_at)}</div>
            <div class="detail-item"><strong>Location</strong>${escapeHtml(complaint.location || 'Not available')}</div>
            <div class="detail-item"><strong>Latitude</strong>${escapeHtml(complaint.latitude !== undefined && complaint.latitude !== null ? complaint.latitude : 'N/A')}</div>
            <div class="detail-item"><strong>Longitude</strong>${escapeHtml(complaint.longitude !== undefined && complaint.longitude !== null ? complaint.longitude : 'N/A')}</div>
        </div>

        <h3>Complaint Location</h3>
        <div id="${complaintMapId}" class="map-container"></div>
        <div class="storage-note">Note: Browser storage is local to this device and is not shared automatically between different devices.</div>
    `;

    if (complaint.latitude && complaint.longitude) {
        displayComplaintLocation(complaintMapId, complaint);
    } else {
        const mapBox = document.getElementById(complaintMapId);
        if (mapBox) {
            mapBox.innerHTML = '<div class="empty-state">This complaint has no saved location.</div>';
        }
    }

    showPage(type === 'resident' ? 'residentComplaintDetails' : 'adminComplaintDetails');
}

function clearLocationState(containerId) {
    const state = getMapState(containerId);

    if (state && state.map) {
        state.confirmed = false;
        if (state.marker) {
            state.marker.remove();
            state.marker = null;
        }
        state.map.setView([8.8243, 125.097], 13);
    }

    const latField = document.getElementById(state ? state.latInputId : '');
    const lngField = document.getElementById(state ? state.lngInputId : '');
    const addressField = document.getElementById(state ? state.addressInputId : '');
    const statusEl = document.getElementById(state ? state.statusId : '');

    if (latField) latField.value = '';
    if (lngField) lngField.value = '';
    if (addressField) addressField.value = '';
    if (statusEl) {
        statusEl.textContent = '';
        statusEl.className = 'status-message';
        statusEl.dataset.confirmed = 'false';
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function slugify(value) {
    return String(value || 'submitted')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

window.handleResidentComplaintSubmit = handleResidentComplaintSubmit;
window.handleWalkInComplaintSubmit = handleWalkInComplaintSubmit;
window.renderResidentComplaintsList = renderResidentComplaintsList;
window.renderAdminComplaintsList = renderAdminComplaintsList;
window.bindComplaintPageEvents = bindComplaintPageEvents;
window.viewComplaintDetails = viewComplaintDetails;
window.clearLocationState = clearLocationState;
window.escapeHtml = escapeHtml;
window.slugify = slugify;
