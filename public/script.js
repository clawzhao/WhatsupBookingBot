document.addEventListener('DOMContentLoaded', () => {
    fetchBookings();
    fetchConfig();
});

async function fetchBookings() {
    try {
        const res = await fetch('/api/bookings');
        const bookings = await res.json();
        
        const tbody = document.querySelector('#bookings-table tbody');
        tbody.innerHTML = '';
        
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

async function fetchConfig() {
    try {
        const res = await fetch('/api/config');
        const config = await res.json();
        document.getElementById('config-editor').value = JSON.stringify(config, null, 4);
    } catch (error) {
        console.error('Error fetching config:', error);
    }
}

async function saveConfig() {
    const editor = document.getElementById('config-editor');
    const statusMsg = document.getElementById('config-status');
    let newConfig;
    
    try {
        newConfig = JSON.parse(editor.value);
    } catch (e) {
        statusMsg.style.color = 'red';
        statusMsg.innerText = 'Invalid JSON format.';
        return;
    }

    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
        });
        
        const data = await res.json();
        if (data.success) {
            statusMsg.style.color = 'green';
            statusMsg.innerText = 'Configuration saved successfully!';
            setTimeout(() => statusMsg.innerText = '', 3000);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        statusMsg.style.color = 'red';
        statusMsg.innerText = 'Error saving config: ' + error.message;
    }
}
