import React, { useState } from 'react';
import { Search, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

export default function EventsTable({ events }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredEvents = events.filter(ev => {
    const matchesSearch =
      ev.STAFF_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.track_id?.toString().includes(searchTerm) ||
      ev.camera_role?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'recognized') return ev.recognition_status === 'recognized';
    if (activeTab === 'unrecognized') return ev.recognition_status === 'unrecognized';
    if (activeTab === 'breakin') return ev.camera_role === 'breakin';
    if (activeTab === 'breakout') return ev.camera_role === 'breakout';

    return true;
  });

  return (
    <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Event Detection Stream</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Real-time events tracked across all active camera feeds
          </p>
        </div>

        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={18} className="search-icon-inside" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search STAFF, track ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="event-search-input"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs-container">
        <button className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
          All Events ({events.length})
        </button>
        <button className={`tab-btn ${activeTab === 'recognized' ? 'active' : ''}`} onClick={() => setActiveTab('recognized')}>
          Recognized
        </button>
        <button className={`tab-btn ${activeTab === 'unrecognized' ? 'active' : ''}`} onClick={() => setActiveTab('unrecognized')}>
          Unrecognized / No Face
        </button>
        <button className={`tab-btn ${activeTab === 'breakin' ? 'active' : ''}`} onClick={() => setActiveTab('breakin')}>
          Check-In (Break In)
        </button>
        <button className={`tab-btn ${activeTab === 'breakout' ? 'active' : ''}`} onClick={() => setActiveTab('breakout')}>
          Check-Out (Break Out)
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="custom-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Camera Role</th>
              <th>Track ID</th>
              <th>Timestamp </th>
              <th>STAFF Name</th>
              <th>Confidence</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No events found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredEvents.slice(0, 15).map((ev, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>#{ev.id}</td>
                  <td>
                    <span className="badge badge-role">{ev.camera_role}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>Track #{ev.track_id}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--epic-green)', fontWeight: 600 }}>{ev.timestamp || 'N/A'}</td>
                  <td style={{ fontWeight: 600 }}>
                    {ev.STAFFme || `Person #${ev.track_id}`}
                  </td>
                  <td>
                    {ev.recognition_confidence ? (
                      <span style={{ fontWeight: 600, color: ev.recognition_confidence >= 0.50 ? 'var(--epic-green)' : 'var(--warning)' }}>
                        {(ev.recognition_confidence * 100).toFixed(1)}%
                      </span>
                    ) : (
                      '--'
                    )}
                  </td>
                  <td>
                    {ev.recognition_status === 'recognized' ? (
                      <span className="badge badge-success">
                        <CheckCircle2 size={12} /> Recognized
                      </span>
                    ) : ev.recognition_status === 'unrecognized' ? (
                      <span className="badge badge-warning">
                        <AlertTriangle size={12} /> Unrecognized
                      </span>
                    ) : (
                      <span className="badge badge-danger">
                        <HelpCircle size={12} /> No Face
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
