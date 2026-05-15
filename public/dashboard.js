const React = window.React;
const ReactDOM = window.ReactDOM;
const { useState, useEffect } = React;

// API base URL
const API_BASE = 'http://127.0.0.1:3000';

function Dashboard() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [config, setConfig] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configRes, bookingsRes] = await Promise.all([
        fetch(\`\${API_BASE}/api/config\`),
        fetch(\`\${API_BASE}/api/bookings\`)
      ]);

      if (configRes.ok) setConfig(await configRes.json());
      if (bookingsRes.ok) setBookings(await bookingsRes.json() || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const DashboardView = () => (
    React.createElement('div', { className: 'space-y-6' },
      React.createElement('div', { className: 'page-header' },
        React.createElement('h1', { className: 'page-title' }, '📱 Coaching Booking Dashboard'),
        React.createElement('p', { className: 'page-subtitle' }, 'Overview of all sessions and bookings')
      ),
      React.createElement('div', { className: 'stats-grid' },
        React.createElement('div', { className: 'stat-card' },
          React.createElement('div', { className: 'stat-label' }, 'Total Bookings'),
          React.createElement('div', { className: 'stat-value' }, bookings?.length || 0)
        ),
        React.createElement('div', { className: 'stat-card', style: { borderLeftColor: 'var(--success)' } },
          React.createElement('div', { className: 'stat-label' }, 'Confirmed'),
          React.createElement('div', { className: 'stat-value' }, (bookings?.filter(b => b.status === 'confirmed') || []).length)
        ),
        React.createElement('div', { className: 'stat-card', style: { borderLeftColor: 'var(--warning)' } },
          React.createElement('div', { className: 'stat-label' }, 'Pending'),
          React.createElement('div', { className: 'stat-value' }, (bookings?.filter(b => b.status === 'pending') || []).length)
        )
      ),
      React.createElement('div', { className: 'card' },
        React.createElement('h2', { style: { fontSize: '20px', fontWeight: 600, marginBottom: '16px' } }, 'Recent Bookings'),
        bookings?.length === 0 ?
          React.createElement('div', { className: 'empty-state' },
            React.createElement('div', { className: 'empty-state-icon' }, '📅'),
            React.createElement('div', { className: 'empty-state-text' }, 'No bookings yet')
          ) :
          React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
            React.createElement('thead', null,
              React.createElement('tr', { style: { borderBottom: '2px solid #e5e7eb' } },
                React.createElement('th', { style: { padding: '12px', textAlign: 'left', fontWeight: 600 } }, 'Client'),
                React.createElement('th', { style: { padding: '12px', textAlign: 'left', fontWeight: 600 } }, 'Session'),
                React.createElement('th', { style: { padding: '12px', textAlign: 'left', fontWeight: 600 } }, 'Date/Time'),
                React.createElement('th', { style: { padding: '12px', textAlign: 'left', fontWeight: 600 } }, 'Status')
              )
            ),
            React.createElement('tbody', null,
              (bookings || []).slice(0, 10).map((booking, idx) =>
                React.createElement('tr', { key: idx, style: { borderBottom: '1px solid #f3f4f6' } },
                  React.createElement('td', { style: { padding: '12px' } }, booking.guestName || 'N/A'),
                  React.createElement('td', { style: { padding: '12px' } }, booking.service || 'Coaching'),
                  React.createElement('td', { style: { padding: '12px' } }, new Date(booking.date).toLocaleString()),
                  React.createElement('td', { style: { padding: '12px' } },
                    React.createElement('span', {
                      style: {
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: booking.status === 'confirmed' ? '#d1fae5' : '#fef3c7',
                        color: booking.status === 'confirmed' ? '#065f46' : '#92400e'
                      }
                    }, (booking.status || 'PENDING').toUpperCase())
                  )
                )
              )
            )
          )
      )
    )
  );

  const SessionsView = () => (
    React.createElement('div', { className: 'space-y-6' },
      React.createElement('div', { className: 'page-header' },
        React.createElement('h1', { className: 'page-title' }, '🎓 Coaching Sessions'),
        React.createElement('p', { className: 'page-subtitle' }, 'Available session types')
      ),
      React.createElement('div', { className: 'card' },
        React.createElement('h2', { style: { fontSize: '20px', fontWeight: 600, marginBottom: '16px' } }, 'Available Sessions'),
        config?.menu?.length ?
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' } },
            config.menu.map((session, idx) =>
              React.createElement('div', { key: idx, style: { border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb' } },
                React.createElement('h3', { style: { fontWeight: 600, marginBottom: '8px' } }, session.name),
                React.createElement('p', { style: { color: '#6b7280', fontSize: '14px', marginBottom: '8px' } }, session.category),
                React.createElement('p', { style: { fontSize: '18px', fontWeight: 700, color: 'var(--primary)' } }, '$' + session.price)
              )
            )
          ) :
          React.createElement('div', { className: 'empty-state' },
            React.createElement('div', { className: 'empty-state-icon' }, '🎓'),
            React.createElement('div', { className: 'empty-state-text' }, 'No sessions configured')
          )
      )
    )
  );

  return React.createElement('div', { className: 'dashboard-container' },
    React.createElement('div', { className: 'sidebar' },
      React.createElement('div', { style: { marginBottom: '32px', paddingLeft: '20px' } },
        React.createElement('h1', { style: { fontSize: '20px', fontWeight: 700, color: 'var(--primary)' } }, '🏋️ Coach Dashboard')
      ),
      React.createElement('div', {
        className: 'sidebar-item',
        onClick: () => setCurrentPage('dashboard'),
        style: { borderLeftColor: currentPage === 'dashboard' ? 'var(--primary)' : 'transparent', color: currentPage === 'dashboard' ? 'var(--primary)' : '#6b7280' }
      },
        React.createElement('i', { className: 'fas fa-chart-line' }),
        React.createElement('span', null, 'Dashboard')
      ),
      React.createElement('div', {
        className: 'sidebar-item',
        onClick: () => setCurrentPage('sessions'),
        style: { borderLeftColor: currentPage === 'sessions' ? 'var(--primary)' : 'transparent', color: currentPage === 'sessions' ? 'var(--primary)' : '#6b7280' }
      },
        React.createElement('i', { className: 'fas fa-book' }),
        React.createElement('span', null, 'Sessions')
      )
    ),
    React.createElement('div', { className: 'main-content' },
      React.createElement('div', { className: 'page-container' },
        loading ?
          React.createElement('div', { className: 'empty-state', style: { marginTop: '48px' } },
            React.createElement('div', { className: 'empty-state-icon' }, '⏳'),
            React.createElement('div', { className: 'empty-state-text' }, 'Loading...')
          ) :
          (currentPage === 'dashboard' ? React.createElement(DashboardView) : React.createElement(SessionsView))
      )
    )
  );
}

ReactDOM.render(React.createElement(Dashboard), document.getElementById('root'));
