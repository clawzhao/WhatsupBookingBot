const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

document.addEventListener('DOMContentLoaded', () => {
    fetchBookings();
    fetchConfig();
});

// ─── Tab switching ───────────────────────────────────────────────────────────
function showTab(name) {
    document.querySelectorAll('.tab-btn').forEach((btn, i) => {
        btn.classList.toggle('active', ['business', 'hours', 'services', 'ai'][i] === name);
    });
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + name).classList.add('active');
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
async function fetchBookings() {
    try {
        const res = await fetch('/api/bookings');
        const bookings = await res.json();
        const tbody = document.querySelector('#bookings-table tbody');
        tbody.innerHTML = '';
        if (bookings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888">No bookings found</td></tr>';
            return;
        }
        bookings.forEach(b => {
            const tr = document.createElement('tr');
            const statusBadge = b.status === 'confirmed'
                ? `<span class="badge-confirmed">${b.status}</span>`
                : `<span class="badge-cancelled">${b.status}</span>`;
            tr.innerHTML = `
                <td>${b.id}</td>
                <td>${b.phone}</td>
                <td>${b.partySize}</td>
                <td>${b.date}</td>
                <td>${b.time}</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
}

// ─── Config: Load ─────────────────────────────────────────────────────────────
let _currentConfig = {};

async function fetchConfig() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        _currentConfig = config;
        populateForm(config);
    } catch (error) {
        console.error('Error fetching config:', error);
    }
}

function populateForm(config) {
    const r = config.restaurant || config;

    // Business info
    setValue('cfg-name', r.name || '');
    setValue('cfg-phone', r.phone || '');
    setValue('cfg-email', r.email || '');
    setValue('cfg-website', r.website || '');
    setValue('cfg-address', r.address || '');
    setSelect('cfg-timezone', r.timezone || 'UTC');
    setValue('cfg-slot', r.slotDuration || 60);
    setValue('cfg-maxparty', r.maxPartySize || 1);

    // Opening hours
    const tbody = document.getElementById('hours-tbody');
    tbody.innerHTML = '';
    DAYS.forEach(day => {
        const hours = r.openingHours && r.openingHours[day];
        const isOpen = !!hours;
        const openTime = hours ? hours.open : '09:00';
        const closeTime = hours ? hours.close : '17:00';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${day}</strong></td>
            <td><input type="checkbox" id="hours-open-${day}" ${isOpen ? 'checked' : ''} onchange="toggleHoursRow('${day}')"></td>
            <td><input type="time" id="hours-from-${day}" value="${openTime}" ${!isOpen ? 'disabled' : ''}></td>
            <td><input type="time" id="hours-to-${day}" value="${closeTime}" ${!isOpen ? 'disabled' : ''}></td>
        `;
        tbody.appendChild(tr);
    });

    // Services
    const servicesTbody = document.getElementById('services-tbody');
    servicesTbody.innerHTML = '';
    const items = r.menu || [];
    items.forEach((item, idx) => addServiceRow(item, idx));

    // AI Settings
    document.getElementById('cfg-ai-enabled').checked = r.aiEnabled !== false;
    setSelect('cfg-ai-model', r.aiModel || 'gemini-2.5-flash');
    document.getElementById('cfg-ai-api-key').value = r.aiApiKey || '';
    toggleAIFields();
}

function toggleHoursRow(day) {
    const isOpen = document.getElementById(`hours-open-${day}`).checked;
    document.getElementById(`hours-from-${day}`).disabled = !isOpen;
    document.getElementById(`hours-to-${day}`).disabled = !isOpen;
}

function addServiceRow(item = {}, idx = null) {
    const tbody = document.getElementById('services-tbody');
    const rowIdx = idx !== null ? idx : tbody.rows.length;
    const tr = document.createElement('tr');
    tr.dataset.idx = rowIdx;
    tr.innerHTML = `
        <td><input type="text" class="svc-category" value="${escHtml(item.category || '')}" placeholder="e.g. Personal Training"></td>
        <td><input type="text" class="svc-name" value="${escHtml(item.name || '')}" placeholder="Service name"></td>
        <td><input type="number" class="svc-price" value="${item.price || ''}" placeholder="0" min="0" step="0.01" style="width:90px"></td>
        <td><button class="btn-sm btn-danger" onclick="removeServiceRow(this)">Remove</button></td>
    `;
    tbody.appendChild(tr);
}

function removeServiceRow(btn) {
    btn.closest('tr').remove();
}

// ─── Config: Save ─────────────────────────────────────────────────────────────
async function saveConfig() {
    const statusEl = document.getElementById('config-status');
    statusEl.className = 'status-msg';
    statusEl.textContent = '';

    // Build opening hours
    const openingHours = {};
    DAYS.forEach(day => {
        const isOpen = document.getElementById(`hours-open-${day}`)?.checked;
        if (isOpen) {
            openingHours[day] = {
                open: document.getElementById(`hours-from-${day}`).value,
                close: document.getElementById(`hours-to-${day}`).value
            };
        }
    });

    // Build services
    const menu = [];
    document.querySelectorAll('#services-tbody tr').forEach((tr, i) => {
        const cat = tr.querySelector('.svc-category')?.value.trim();
        const name = tr.querySelector('.svc-name')?.value.trim();
        const price = parseFloat(tr.querySelector('.svc-price')?.value) || 0;
        if (name) {
            menu.push({ id: String(i + 1), category: cat || '', name, price });
        }
    });

    // Build full config preserving any extra fields
    const restaurant = {
        ...(_currentConfig.restaurant || _currentConfig),
        name: document.getElementById('cfg-name').value.trim(),
        phone: document.getElementById('cfg-phone').value.trim(),
        email: document.getElementById('cfg-email').value.trim(),
        website: document.getElementById('cfg-website').value.trim(),
        address: document.getElementById('cfg-address').value.trim(),
        timezone: document.getElementById('cfg-timezone').value,
        slotDuration: parseInt(document.getElementById('cfg-slot').value) || 60,
        maxPartySize: parseInt(document.getElementById('cfg-maxparty').value) || 1,
        aiEnabled: document.getElementById('cfg-ai-enabled').checked,
        aiModel: document.getElementById('cfg-ai-model').value,
        aiApiKey: document.getElementById('cfg-ai-api-key').value.trim(),
        openingHours,
        menu
    };

    const newConfig = _currentConfig.restaurant
        ? { ..._currentConfig, restaurant }
        : restaurant;

    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        });
        const data = await res.json();
        if (data.success) {
            _currentConfig = newConfig;
            statusEl.className = 'status-msg success';
            statusEl.textContent = '✅ Configuration saved successfully!';
            setTimeout(() => { statusEl.className = 'status-msg'; statusEl.textContent = ''; }, 3000);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        statusEl.className = 'status-msg error';
        statusEl.textContent = '❌ Error saving config: ' + error.message;
    }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}
function setSelect(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    for (const opt of el.options) {
        if (opt.value === val) { opt.selected = true; return; }
    }
}
function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function toggleAIFields() {
    const enabled = document.getElementById('cfg-ai-enabled').checked;
    const aiFields = document.getElementById('ai-fields');
    if (aiFields) {
        aiFields.style.display = enabled ? 'block' : 'none';
    }
}
function toggleKeyVisibility() {
    const field = document.getElementById('cfg-ai-api-key');
    if (field) {
        field.type = document.getElementById('cfg-show-key').checked ? 'text' : 'password';
    }
}

