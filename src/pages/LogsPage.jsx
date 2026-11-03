import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

import { API_BASE } from '../config';

const STATUS_META = {
  recognized: { icon: <CheckCircle size={13} />, color: '#059669', bg: '#d1fae5' },
  unrecognized: { icon: <XCircle size={13} />, color: '#b45309', bg: '#fef3c7' },
  no_face: { icon: <AlertCircle size={13} />, color: '#475569', bg: '#f1f5f9' },
  pending: { icon: <Clock size={13} />, color: '#1d4ed8', bg: '#dbeafe' },
};

const FILTERS = ['all', 'recognized', 'unrecognized', 'no_face', 'pending'];

export default function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [cameraFilter, setCameraFilter] = useState('all');
  const [lastSync, setLastSync] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: 500 });
      if (filter !== 'all') params.set('status_filter', filter);
      if (cameraFilter !== 'all') params.set('camera_role', cameraFilter);
      const res = await fetch(`${API_BASE}/events?${params}`);
      if (!res.ok) throw new Error();
      setLogs(await res.json());
      setLastSync(new Date());
    } catch {
      setError('Cannot load logs. Make sure the API server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [filter, cameraFilter]);

  const countFor = (f) => {
    if (f === 'all') return logs.length;
    return logs.filter(l => l.recognition_status === f).length;
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>Detection Events</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            All pipeline detection and face recognition logs
            {lastSync && <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '0.5rem' }}>· Synced {lastSync.toLocaleTimeString()}</span>}
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', padding: '0.625rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; } }}
          onMouseLeave={e => { if (!loading) { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; } }}
        >
          <RefreshCw size={16} className={loading ? 'spin-icon' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          {loading ? 'Syncing…' : 'Refresh Events'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', fontWeight: 500 }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: '#fff', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '2rem', border: 'none', background: filter === f ? '#0f172a' : 'transparent', color: filter === f ? '#fff' : '#64748b', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'capitalize' }}
              onMouseEnter={e => { if (filter !== f) e.currentTarget.style.background = '#f1f5f9' }}
              onMouseLeave={e => { if (filter !== f) e.currentTarget.style.background = 'transparent' }}
            >
              {f.replace('_', ' ')}
              <span style={{ background: filter === f ? '#334155' : '#e2e8f0', color: filter === f ? '#e2e8f0' : '#475569', padding: '0.1rem 0.5rem', borderRadius: '1rem', fontSize: '0.7rem' }}>{countFor(f)}</span>
            </button>
          ))}
        </div>
        <CustomSelect
          value={cameraFilter}
          onChange={e => setCameraFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Cameras' },
            { value: 'breakin', label: 'Break In (Entry)' },
            { value: 'breakout', label: 'Break Out (Exit)' }
          ]}
        />
      </div>

      <div style={{ background: '#fff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>
            <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 1rem', display: 'block', animation: 'spin 1s linear infinite' }} />
            Loading events...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '6rem 2rem', textAlign: 'center', color: '#64748b' }}>
            <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500 }}>No events match your current filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  {['#', 'Camera', 'Track', 'Timestamp', 'STAFF', 'Match Confidence', 'Status'].map((h, idx) => (
                    <th key={idx} style={{ padding: '0.875rem 1rem', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const meta = STATUS_META[log.recognition_status] || STATUS_META.pending;
                  const confPct = Math.round((log.recognition_confidence || 0) * 100);
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: '0.7rem' }}>{i + 1}</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: 700, background: log.camera_role === 'breakin' ? '#f0fdf4' : '#fff7ed', color: log.camera_role === 'breakin' ? '#15803d' : '#c2410c' }}>
                          {log.camera_role === 'breakin' ? '⬇ Break In' : '⬆ Break Out'}
                        </span>
                      </td>
                      <td style={{ padding: '0.875rem 1rem', color: '#64748b', fontFamily: 'monospace' }}>#{log.track_id}</td>
                      <td style={{ padding: '0.875rem 1rem', color: '#334155', fontFamily: 'monospace', fontSize: '0.75rem' }}>{log.timestamp || '—'}</td>
                      <td style={{ padding: '0.875rem 1rem', color: '#0f172a', fontWeight: 600 }}>{log.STAFF_name}</td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        {confPct > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '80px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${confPct}%`, background: confPct >= 60 ? '#10b981' : confPct >= 40 ? '#f59e0b' : '#ef4444', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, width: '32px' }}>{confPct}%</span>
                          </div>
                        ) : <span style={{ color: '#94a3b8' }}>—</span>}
                      </td>
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.75rem', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: 700, background: meta.bg, color: meta.color, textTransform: 'capitalize' }}>
                          {meta.icon}
                          {log.recognition_status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
