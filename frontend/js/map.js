const MAP_DEFAULT_CENTER = [8.8243, 125.097];
const mapRegistry = {};

function getMapState(containerId) {
    return mapRegistry[containerId] || null;
}

function initializeLocationPicker(config = {}) {
    const containerId = config.containerId;
    if (!containerId || !document.getElementById(containerId)) return null;

    if (mapRegistry[containerId]) {
        const existing = mapRegistry[containerId];
        if (existing.map) {
            setTimeout(() => existing.map.invalidateSize(), 150);
        }
        return existing;
    }

    const map = L.map(containerId, {
        zoomControl: true,
        tap: true,
        scrollWheelZoom: true,
        dragging: true
    });

    map.setView(MAP_DEFAULT_CENTER, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    const baseMarker = L.marker(MAP_DEFAULT_CENTER, {
        draggable: !config.readOnly,
        autoPan: true
    }).addTo(map);

    const state = {
        containerId,
        map,
        marker: baseMarker,
        readOnly: Boolean(config.readOnly),
        searchInputId: config.searchInputId || '',
        latInputId: config.latInputId || '',
        lngInputId: config.lngInputId || '',
        addressInputId: config.addressInputId || '',
        statusId: config.statusId || '',
        confirmed: false,
        lastAddress: '',
        popup: null,
        layerGroup: L.layerGroup().addTo(map)
    };

    baseMarker.bindPopup('Complaint location');

    if (!config.readOnly) {
        baseMarker.on('dragend', function () {
            setMapMarker(state, baseMarker.getLatLng(), true, 'Selected complaint location');
            updateCoordinates(state, baseMarker.getLatLng(), 'Selected complaint location');
        });

        map.on('click', function (event) {
            setMapMarker(state, event.latlng, true, 'Selected complaint location');
            updateCoordinates(state, event.latlng, 'Selected complaint location');
        });
    }

    mapRegistry[containerId] = state;
    setTimeout(() => map.invalidateSize(), 250);
    return state;
}

function setMapMarker(state, latlng, updateAddress = true, customAddress = '', shouldRefreshStatus = true) {
    if (!state || !state.map) return null;

    if (state.marker) {
        state.marker.remove();
    }

    const safeLatLng = L.latLng(latlng.lat, latlng.lng);
    const draggable = !state.readOnly;
    state.marker = L.marker(safeLatLng, { draggable, autoPan: true }).addTo(state.map);

    if (!state.readOnly) {
        state.marker.on('dragend', function () {
            const currentLatLng = state.marker.getLatLng();
            setMapMarker(state, currentLatLng, true, 'Selected complaint location');
            updateCoordinates(state, currentLatLng, 'Selected complaint location');
        });
    }

    state.map.setView(safeLatLng, 15);

    if (updateAddress) {
        const chosenAddress = customAddress || state.lastAddress || 'Selected complaint location';
        state.lastAddress = chosenAddress;
        updateCoordinates(state, safeLatLng, chosenAddress);
    }

    if (shouldRefreshStatus && state.statusId) {
        const statusEl = document.getElementById(state.statusId);
        if (statusEl) {
            statusEl.className = 'status-message';
            statusEl.textContent = 'Location selected. Please confirm.';
            statusEl.dataset.confirmed = 'false';
        }
    }

    return state.marker;
}

function updateCoordinates(state, latlng, addressText = '') {
    if (!state) return;

    if (state.latInputId) {
        const latField = document.getElementById(state.latInputId);
        if (latField) {
            latField.value = Number(latlng.lat).toFixed(6);
        }
    }

    if (state.lngInputId) {
        const lngField = document.getElementById(state.lngInputId);
        if (lngField) {
            lngField.value = Number(latlng.lng).toFixed(6);
        }
    }

    if (state.addressInputId) {
        const addressField = document.getElementById(state.addressInputId);
        if (addressField) {
            addressField.value = addressText || state.lastAddress || '';
        }
    }

    state.lastAddress = addressText || state.lastAddress || '';
}

async function searchLocation(containerId, searchText) {
    const state = getMapState(containerId);
    if (!state) return null;

    const query = (searchText || '').trim();
    if (!query) {
        showAlert('Please enter a search location.');
        return null;
    }

    toggleLoading(true, 'Searching for location...');

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, {
            headers: {
                'Accept-Language': 'en'
            }
        });

        if (!response.ok) {
            throw new Error('Search request failed');
        }

        const results = await response.json();
        if (!results || !results.length) {
            if (state.statusId) {
                const statusEl = document.getElementById(state.statusId);
                if (statusEl) {
                    statusEl.textContent = 'Location not found. Please try another address.';
                    statusEl.className = 'status-message error';
                }
            }
            showAlert('Location not found. Please try another address.');
            return null;
        }

        const match = results[0];
        const latlng = L.latLng(Number(match.lat), Number(match.lon));
        const address = match.display_name || query;
        setMapMarker(state, latlng, true, address, true);
        updateCoordinates(state, latlng, address);

        if (state.statusId) {
            const statusEl = document.getElementById(state.statusId);
            if (statusEl) {
                statusEl.textContent = 'Location found and selected.';
                statusEl.className = 'status-message success';
            }
        }

        return match;
    } catch (error) {
        console.error('Location search failed:', error);
        if (state.statusId) {
            const statusEl = document.getElementById(state.statusId);
            if (statusEl) {
                statusEl.textContent = 'Map search is unavailable right now. Please try again later.';
                statusEl.className = 'status-message error';
            }
        }
        showAlert('Map search is unavailable right now. Please try again later.');
        return null;
    } finally {
        toggleLoading(false);
    }
}

function confirmLocation(containerId) {
    const state = getMapState(containerId);
    if (!state || !state.marker) {
        showAlert('Please select and confirm the complaint location.');
        return false;
    }

    const latitude = Number(document.getElementById(state.latInputId)?.value || NaN);
    const longitude = Number(document.getElementById(state.lngInputId)?.value || NaN);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        showAlert('Coordinates are invalid. Please select a valid location on the map.');
        return false;
    }

    state.confirmed = true;
    window.appState.pendingLocation = {
        containerId,
        location: document.getElementById(state.addressInputId)?.value || state.lastAddress || '',
        latitude,
        longitude
    };

    if (state.statusId) {
        const statusEl = document.getElementById(state.statusId);
        if (statusEl) {
            statusEl.textContent = 'Complaint location confirmed successfully.';
            statusEl.className = 'status-message success';
            statusEl.dataset.confirmed = 'true';
        }
    }

    showAlert('Complaint location confirmed successfully.');
    return true;
}

function useCurrentLocation(containerId) {
    const state = getMapState(containerId);
    if (!state) return null;

    if (!navigator.geolocation) {
        showAlert('Geolocation is not supported in this browser. You can still select a location manually on the map.');
        return null;
    }

    toggleLoading(true, 'Getting your current location...');

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const latlng = L.latLng(position.coords.latitude, position.coords.longitude);
            setMapMarker(state, latlng, true, 'Current location');
            updateCoordinates(state, latlng, 'Current location');

            if (state.statusId) {
                const statusEl = document.getElementById(state.statusId);
                if (statusEl) {
                    statusEl.textContent = 'Current location selected.';
                    statusEl.className = 'status-message success';
                    statusEl.dataset.confirmed = 'false';
                }
            }

            toggleLoading(false);
        },
        function (error) {
            toggleLoading(false);
            let message = 'Current location is unavailable.';
            if (error.code === error.PERMISSION_DENIED) {
                message = 'Location permission denied. You can still select a location manually on the map.';
            } else if (error.code === error.TIMEOUT) {
                message = 'Location request timed out. Please try again or select a location manually.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                message = 'Current location is unavailable. Please use the map manually.';
            }
            showAlert(message);
            if (state.statusId) {
                const statusEl = document.getElementById(state.statusId);
                if (statusEl) {
                    statusEl.textContent = message;
                    statusEl.className = 'status-message error';
                    statusEl.dataset.confirmed = 'false';
                }
            }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    );

    return state;
}

function displayComplaintLocation(containerId, complaint) {
    const mapState = initializeLocationPicker({
        containerId,
        readOnly: true
    });

    if (!mapState || !complaint) {
        const target = document.getElementById(containerId);
        if (target) {
            target.innerHTML = '<div class="empty-state">This complaint has no saved location.</div>';
        }
        return null;
    }

    const latitude = Number(complaint.latitude);
    const longitude = Number(complaint.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        const target = document.getElementById(containerId);
        if (target) {
            target.innerHTML = '<div class="empty-state">This complaint has no saved location.</div>';
        }
        return null;
    }

    const latlng = L.latLng(latitude, longitude);
    const addressValue = complaint.location || 'Complaint location';
    setMapMarker(mapState, latlng, true, addressValue, false);
    mapState.map.setView(latlng, 15);
    if (mapState.marker) {
        mapState.marker.bindPopup(`
            <strong>Reference:</strong> ${escapeHtml(complaint.reference_number || 'N/A')}<br>
            <strong>Title:</strong> ${escapeHtml(complaint.complaint_title || 'N/A')}<br>
            <strong>Location:</strong> ${escapeHtml(addressValue)}<br>
            <strong>Latitude:</strong> ${latitude}<br>
            <strong>Longitude:</strong> ${longitude}
        `).openPopup();
    }
    return mapState;
}

function filterComplaintMarkers(complaints) {
    return complaints.filter(complaint => {
        const lat = Number(complaint.latitude);
        const lng = Number(complaint.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
    });
}

function loadComplaintMarkers(containerId, complaints) {
    const state = getMapState(containerId) || initializeLocationPicker({ containerId, readOnly: true });
    if (!state) return [];

    if (state.layerGroup) {
        state.layerGroup.clearLayers();
    }

    const valid = filterComplaintMarkers(complaints);
    const markers = [];

    valid.forEach(complaint => {
        const marker = L.marker([Number(complaint.latitude), Number(complaint.longitude)]).addTo(state.layerGroup);
        marker.bindPopup(`
            <strong>Reference:</strong> ${escapeHtml(complaint.reference_number || 'N/A')}<br>
            <strong>Title:</strong> ${escapeHtml(complaint.complaint_title || 'N/A')}<br>
            <strong>Category:</strong> ${escapeHtml(complaint.category || 'N/A')}<br>
            <strong>Status:</strong> ${escapeHtml(complaint.status || 'Submitted')}<br>
            <strong>Type:</strong> ${escapeHtml(complaint.submission_type || 'ONLINE')}<br>
            <strong>Location:</strong> ${escapeHtml(complaint.location || 'N/A')}<br>
            <strong>Date:</strong> ${formatDate(complaint.created_at)}<br>
            <button class="btn btn-secondary" onclick="viewComplaintDetails('admin', '${complaint.complaint_id}')">View Details</button>
        `);
        markers.push(marker);
    });

    if (markers.length) {
        fitMarkersToMap(state.map, markers);
    } else {
        state.map.setView(MAP_DEFAULT_CENTER, 12);
    }

    return markers;
}

function fitMarkersToMap(map, markers) {
    if (!map || !markers || !markers.length) return;

    const bounds = L.latLngBounds(markers.map(marker => marker.getLatLng()));
    map.fitBounds(bounds.pad(0.3), { maxZoom: 17 });
}

function searchLocationResident() {
    const input = document.getElementById('residentLocationSearch');
    return searchLocation('residentMapContainer', input ? input.value : '');
}

function searchLocationAdmin() {
    const input = document.getElementById('adminLocationSearch');
    return searchLocation('adminMapContainer', input ? input.value : '');
}

function useCurrentLocationResident() {
    return useCurrentLocation('residentMapContainer');
}

function useCurrentLocationAdmin() {
    return useCurrentLocation('adminMapContainer');
}

function confirmLocationResident() {
    return confirmLocation('residentMapContainer');
}

function confirmLocationAdmin() {
    return confirmLocation('adminMapContainer');
}

window.initializeLocationPicker = initializeLocationPicker;
window.searchLocation = searchLocation;
window.setMapMarker = setMapMarker;
window.updateCoordinates = updateCoordinates;
window.useCurrentLocation = useCurrentLocation;
window.confirmLocation = confirmLocation;
window.displayComplaintLocation = displayComplaintLocation;
window.loadComplaintMarkers = loadComplaintMarkers;
window.filterComplaintMarkers = filterComplaintMarkers;
window.fitMarkersToMap = fitMarkersToMap;
window.searchLocationResident = searchLocationResident;
window.searchLocationAdmin = searchLocationAdmin;
window.useCurrentLocationResident = useCurrentLocationResident;
window.useCurrentLocationAdmin = useCurrentLocationAdmin;
window.confirmLocationResident = confirmLocationResident;
window.confirmLocationAdmin = confirmLocationAdmin;
window.getMapState = getMapState;

