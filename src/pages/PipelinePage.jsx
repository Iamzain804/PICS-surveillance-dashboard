import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, RefreshCw, Film, Activity, Terminal,
  ChevronDown, ChevronRight, Cpu, Database, Zap, Eye
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import { API } from '../config';
import { hasPerm } from '../utils/permissions';

const STATUS_COLORS = {
  completed: { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  processing: { bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  pending: { bg: '#fef9c3', color: '#a16207', border: '#fde047' },
  failed: { bg: '#fee2e2', color: '#b91c1c', border: '#fca5a5' },
};

const RECOG_COLORS = {
  recognized: { bg: '#dcfce7', color: '#15803d' },
  pending_recognition: { bg: '#fef9c3', color: '#a16207' },
  unrecognized: { bg: '#fee2e2', color: '#b91c1c' },
};

export default function PipelinePage({ user, onLogout, onToggleSidebar, onNavigate, sidebarCollapsed }) {
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const [videos, setVideos] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeTab, setActiveTab] = useState('logs');
  const [expandedVideo, setExpandedVideo] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const [stats, setStats] = useState({
    totalVideos: 0,
    totalEvents: 0,
    recognizedEvents: 0,
    recognitionRate: 0,
  });

  const logsEndRef = useRef(null);
  const sseRef = useRef(null);
  const timerRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (pipelineRunning && startedAt) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [pipelineRunning, startedAt]);

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/stats`);
      if (r.ok) {
        const data = await r.json();
        setStats(data);
      }
    } catch { }
  }, []);

  const fetchVideos = useCallback(async () => {
    try { const r = await fetch(`${API}/pipeline/videos`); if (r.ok) setVideos(await r.json()); } catch { }
  }, []);

  const fetchEvents = useCallback(async () => {
    try { const r = await fetch(`${API}/pipeline/events?limit=200`); if (r.ok) setEvents(await r.json()); } catch { }
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const r = await fetch(`${API}/pipeline/logs`);
      if (r.ok) {
        const dbLogs = await r.json();
        setLogs(dbLogs.map(l => ({
          type: getLogType(l.level),
          level: l.level,
          module: l.module,
          message: l.message,
          timestamp: l.timestamp
        })));
      }
    } catch { }
  }, []);

  // Polling for real-time stats and data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      if (pipelineRunning || autoRefresh) {
        fetchVideos();
        fetchEvents();
        fetchLogs();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchVideos, fetchEvents, fetchLogs, pipelineRunning, autoRefresh]);

  useEffect(() => {
    fetchStats(); fetchVideos(); fetchEvents(); fetchLogs();
    fetch(`${API}/pipeline/status`).then(r => r.json()).then(s => {
      if (s.running) {
        setPipelineRunning(true); setStartedAt(s.started_at);
      }
    }).catch(() => { });
  }, [fetchStats, fetchVideos, fetchEvents, fetchLogs]);



  const getLogType = (level) => {
    if (!level) return 'info';
    const l = level.toLowerCase();
    if (l.includes('error') || l.includes('failed')) return 'error';
    if (l.includes('warn')) return 'warn';
    if (l.includes('pipeline2') || l.includes('recogni')) return 'pipeline2';
    if (l.includes('pipeline1') || l.includes('success')) return 'success';
    if (l === 'raw') return 'raw';
    return 'info';
  };

  const handleStart = async () => {
    setLogs([{ type: 'info', text: '▶  Starting Offline AI Pipeline...' }]);
    setElapsed(0);
    try {
      const res = await fetch(`${API}/pipeline/start`, { method: 'POST' });
      if (!res.ok) { const err = await res.json(); setLogs(prev => [...prev, { type: 'error', text: `Error: ${err.detail}` }]); return; }
      const data = await res.json();
      setStartedAt(data.started_at); setPipelineRunning(true);
    } catch (e) { setLogs(prev => [...prev, { type: 'error', text: `Failed to start: ${e.message}` }]); }
  };

  const handleStop = async () => {
    try { await fetch(`${API}/pipeline/stop`, { method: 'POST' }); } catch { }
    setPipelineRunning(false);
  };

  const formatElapsed = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

  const logColor = { info: '#94a3b8', error: '#f87171', warn: '#fbbf24', success: '#4ade80', pipeline1: '#60a5fa', pipeline2: '#a78bfa', done: '#34d399' };

  const statusPill = (status) => {
    const isProc = status === 'processing';
    const c = STATUS_COLORS[status] || STATUS_COLORS.pending;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.25rem 0.65rem',
          borderRadius: '1rem',
          fontSize: '0.7rem',
          fontWeight: 700,
          background: isProc ? '#eff6ff' : c.bg,
          color: isProc ? '#1d4ed8' : c.color,
          border: `1px solid ${isProc ? '#93c5fd' : c.border}`,
          boxShadow: isProc ? '0 0 10px rgba(59, 130, 246, 0.25)' : 'none'
        }}>
          {isProc && <RefreshCw size={12} style={{ animation: 'spin 1.2s linear infinite' }} />}
          {(status || 'pending').toUpperCase()}
        </span>
        {isProc && (
          <div style={{
            width: '110px',
            height: '6px',
            borderRadius: '4px',
            background: '#e2e8f0',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6 0%, #8b5cf6 50%, #3b82f6 100%)',
              backgroundSize: '200% 100%',
              animation: 'progress-shimmer 1.5s infinite linear'
            }} />
          </div>
        )}
      </div>
    );
  };

  const recognitionPill = (status) => {
    const c = RECOG_COLORS[status] || RECOG_COLORS.pending_recognition;
    return <span style={{ padding: '0.2rem 0.5rem', borderRadius: '1rem', fontSize: '0.68rem', fontWeight: 700, background: c.bg, color: c.color }}>{(status || 'pending').replace('_', ' ').toUpperCase()}</span>;
  };

  const eventRoleBadge = (ev) => {
    const role = (ev.camera_role || '').toLowerCase();
    const type = (ev.event_type || '').toLowerCase();

    if (role === 'breakin' || type === 'break in') {
      return (
        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
          Break In
        </span>
      );
    }
    if (role === 'breakout' || type === 'break out') {
      return (
        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: 700, background: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
          Break Out
        </span>
      );
    }
    if (role === 'checkin' || type === 'check_in') {
      return (
        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: 700, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
          🟢 Check In
        </span>
      );
    }
    if (role === 'checkout' || type === 'check_out') {
      return (
        <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
          🔵 Check Out
        </span>
      );
    }
    return (
      <span style={{ padding: '0.2rem 0.55rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}>
        🏢 Attendance
      </span>
    );
  };

  return (
    <div className="page-content" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <PageHeader title="AI Pipeline" icon={Cpu} onToggleSidebar={onToggleSidebar} user={user} onLogout={onLogout} onNavigate={onNavigate} sidebarCollapsed={sidebarCollapsed} />
      <div style={{ flex: 1, overflow: 'auto' }}>

        {/* Real-time Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Videos Scanned', value: stats.totalVideos !== undefined ? stats.totalVideos : videos.length, icon: Film, color: '#3b82f6', bg: '#eff6ff' },
            { label: 'Events Detected', value: (stats.totalEvents !== undefined ? stats.totalEvents : events.length).toLocaleString(), icon: Zap, color: '#8b5cf6', bg: '#f5f3ff' },
            { label: 'Recognized', value: (stats.recognizedEvents !== undefined ? stats.recognizedEvents : events.filter(e => e.recognition_status === 'recognized').length).toLocaleString(), icon: Eye, color: '#059669', bg: '#f0fdf4' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ width: 52, height: 52, borderRadius: '0.875rem', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={26} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Bar & Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem', background: '#f1f5f9', borderRadius: '0.75rem', padding: '0.25rem' }}>
            {[
              { key: 'logs', label: 'Pipeline Logs', icon: Terminal },
              { key: 'videos', label: `Videos (${stats.totalVideos || videos.length})`, icon: Film },
              { key: 'events', label: `Event Log (${(stats.totalEvents || events.length).toLocaleString()})`, icon: Database }
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.125rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, background: activeTab === tab.key ? '#fff' : 'transparent', color: activeTab === tab.key ? '#0f172a' : '#64748b', boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.15s' }}>
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {pipelineRunning && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.35rem 0.875rem', borderRadius: '1rem', background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #86efac' }}>
                <Activity size={14} className="spin-icon" style={{ animationDuration: '1.5s' }} /> PROCESSING
              </span>
            )}
            <button
              onClick={() => { fetchStats(); fetchVideos(); fetchEvents(); fetchLogs(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.625rem',
                border: '1px solid #cbd5e1',
                background: '#fff',
                cursor: 'pointer',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#334155',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div style={{ background: '#0f172a', borderRadius: '0.875rem', border: '1px solid #1e293b', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#1e293b', borderBottom: '1px solid #334155' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>epic_pipeline — main.py</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {pipelineRunning && startedAt && <span style={{ fontSize: '0.72rem', color: '#4ade80', fontFamily: 'monospace' }}>● {formatElapsed(elapsed)}</span>}
                <button onClick={() => setLogs([])} style={{ background: 'transparent', border: '1px solid #334155', color: '#64748b', padding: '0.25rem 0.625rem', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.7rem' }}>Clear</button>
              </div>
            </div>
            <div style={{ height: '480px', overflowY: 'auto', padding: '0', fontFamily: 'Consolas, "Courier New", monospace', fontSize: '0.8rem', background: '#020617' }}>
              {logs.length === 0 ? (
                <div style={{ color: '#475569', textAlign: 'center', marginTop: '8rem' }}>
                  <Terminal size={36} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                  <div style={{ fontSize: '0.9rem' }}>System logs are currently empty.</div>
                  <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Press <strong style={{ color: '#60a5fa' }}>Run Pipeline</strong> to start processing videos.</div>
                </div>
              ) : logs.map((entry, i) => {
                const isError = entry.type === 'error';
                const isWarn = entry.type === 'warn';
                const isSuccess = entry.type === 'success';
                const isPipe1 = entry.type === 'pipeline1';
                const isPipe2 = entry.type === 'pipeline2';
                const isRaw = entry.type === 'raw';

                const textColor = isError ? '#f87171' : isWarn ? '#fbbf24' : isSuccess ? '#4ade80' : isPipe1 ? '#60a5fa' : isPipe2 ? '#a78bfa' : isRaw ? '#64748b' : '#cbd5e1';
                const badgeBg = isError ? '#7f1d1d' : isWarn ? '#78350f' : isSuccess ? '#14532d' : isPipe1 ? '#1e3a8a' : isPipe2 ? '#4c1d95' : isRaw ? 'transparent' : '#1e293b';
                const badgeColor = isError ? '#fca5a5' : isWarn ? '#fcd34d' : isSuccess ? '#86efac' : isPipe1 ? '#93c5fd' : isPipe2 ? '#c4b5fd' : isRaw ? '#475569' : '#94a3b8';

                return (
                  <div key={i} style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '0.6rem 1rem',
                    borderBottom: '1px solid #0f172a',
                    alignItems: 'flex-start',
                    background: isError ? 'rgba(127, 29, 29, 0.1)' : 'transparent',
                    transition: 'background 0.2s'
                  }} onMouseEnter={e => e.currentTarget.style.background = '#0f172a'} onMouseLeave={e => e.currentTarget.style.background = isError ? 'rgba(127, 29, 29, 0.1)' : 'transparent'}>
                    <div style={{ color: '#475569', whiteSpace: 'nowrap', width: '135px', flexShrink: 0, fontSize: '0.75rem', marginTop: '0.1rem' }}>
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleString('en-GB', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}
                    </div>
                    <div style={{ width: '90px', flexShrink: 0 }}>
                      <span style={{
                        background: badgeBg, color: badgeColor,
                        padding: '0.2rem 0.4rem', borderRadius: '0.375rem',
                        fontSize: '0.65rem', fontWeight: 800,
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                        border: isRaw ? '1px solid #334155' : 'none'
                      }}>
                        {entry.module || 'SYS'}
                      </span>
                    </div>
                    <div style={{
                      color: textColor,
                      flexGrow: 1,
                      wordBreak: 'break-word',
                      whiteSpace: 'pre-wrap',
                      fontWeight: (isError || isSuccess) ? 600 : 400
                    }}>
                      {entry.message}
                    </div>
                  </div>
                );
              })}
              <div ref={logsEndRef} style={{ height: 1 }} />
            </div>
          </div>
        )}

        {/* Videos Tab */}
        {activeTab === 'videos' && (
          <div style={{ background: '#fff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {videos.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                <Film size={36} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <div>No videos scanned yet. Run the pipeline to detect videos from the <code style={{ background: '#f1f5f9', padding: '0.1rem 0.4rem', borderRadius: 4 }}>raw/</code> folder.</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    {['', 'Filename', 'Role', 'Start Time', 'Status', 'Events', 'Recognized'].map(h => (
                      <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v, i) => {
                    const isExp = expandedVideo === v.id;
                    const vEvents = events.filter(e => e.video_id === v.id);
                    return (
                      <React.Fragment key={v.id}>
                        <tr onClick={() => setExpandedVideo(isExp ? null : v.id)} style={{ borderBottom: isExp ? 'none' : '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                          onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>{isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#0f172a', fontWeight: 600, fontFamily: 'monospace', fontSize: '0.75rem' }}>{v.filename}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '0.375rem', fontSize: '0.7rem', fontWeight: 700, background: v.camera_role === 'breakout' ? '#fff7ed' : '#f0fdf4', color: v.camera_role === 'breakout' ? '#c2410c' : '#15803d' }}>{v.camera_role || '--'}</span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#64748b', fontFamily: 'monospace', fontSize: '0.72rem' }}>{v.video_start_time || '--'}</td>
                          <td style={{ padding: '0.75rem 1rem' }}>{statusPill(v.status)}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#334155', fontWeight: 600 }}>{v.event_count}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#059669', fontWeight: 600 }}>{v.recognized_count}</td>
                        </tr>
                        {isExp && (
                          <tr style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
                            <td colSpan={7} style={{ padding: '0.75rem 1.5rem 1rem 2.5rem' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', marginBottom: '0.5rem' }}>EVENTS FOR {v.filename} ({vEvents.length} events)</div>
                              {vEvents.length === 0 ? <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>No events processed yet.</div> : (
                                <div style={{ maxHeight: '220px', overflowY: 'auto', background: '#fff', borderRadius: '0.375rem', border: '1px solid #bbf7d0' }}>
                                  <table style={{ width: '100%', fontSize: '0.75rem' }}>
                                    <thead>
                                      <tr style={{ background: '#f0fdf4', color: '#15803d', textAlign: 'left' }}>
                                        {['Name', 'STAFF ID', 'Track ID', 'Camera Role', 'Timestamp', 'Confidence', 'Status'].map(h => (
                                          <th key={h} style={{ padding: '0.375rem 0.75rem', fontWeight: 700 }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {vEvents.map((ev, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                          <td style={{ padding: '0.375rem 0.75rem', fontWeight: 600, color: '#0f172a' }}>{ev.STAFF_name}</td>
                                          <td style={{ padding: '0.375rem 0.75rem', color: '#64748b' }}>{ev.STAFF_id}</td>
                                          <td style={{ padding: '0.375rem 0.75rem', color: '#64748b' }}>{ev.track_id}</td>
                                          <td style={{ padding: '0.375rem 0.75rem', color: ev.camera_role === 'breakout' ? '#c2410c' : '#15803d', fontWeight: 600 }}>{ev.camera_role}</td>
                                          <td style={{ padding: '0.375rem 0.75rem', fontFamily: 'monospace', fontSize: '0.7rem', color: '#334155' }}>{ev.timestamp}</td>
                                          <td style={{ padding: '0.375rem 0.75rem', color: '#059669', fontWeight: 600 }}>{ev.confidence}</td>
                                          <td style={{ padding: '0.375rem 0.75rem' }}>{recognitionPill(ev.recognition_status)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Events Tab */}
        {activeTab === 'events' && (
          <div style={{ background: '#fff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '0.875rem 1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>All Detection Events ({events.length})</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#64748b', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} /> Auto-refresh every 3s
              </label>
            </div>
            {events.length === 0 ? (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                <Database size={36} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                <div>No events detected yet. Run the pipeline to start processing.</div>
              </div>
            ) : (
              <div style={{ maxHeight: '560px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 800, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {['#', 'Name', 'STAFF ID', 'Track ID', 'Camera Role', 'Timestamp', 'Frame', 'Confidence', 'Recognition'].map(h => (
                        <th key={h} style={{ padding: '0.75rem 0.875rem', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, i) => (
                      <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}>
                        <td style={{ padding: '0.625rem 0.875rem', color: '#94a3b8', fontSize: '0.7rem' }}>{ev.id}</td>
                        <td style={{ padding: '0.625rem 0.875rem', fontWeight: 700, color: '#0f172a' }}>{ev.STAFF_name}</td>
                        <td style={{ padding: '0.625rem 0.875rem', color: '#64748b' }}>{ev.STAFF_id}</td>
                        <td style={{ padding: '0.625rem 0.875rem', color: '#64748b' }}>{ev.track_id}</td>
                        <td style={{ padding: '0.625rem 0.875rem' }}>
                          {eventRoleBadge(ev)}
                        </td>
                        <td style={{ padding: '0.625rem 0.875rem', fontFamily: 'monospace', fontSize: '0.72rem', color: '#334155' }}>{ev.timestamp}</td>
                        <td style={{ padding: '0.625rem 0.875rem', color: '#64748b', fontSize: '0.72rem' }}>{ev.frame_number}</td>
                        <td style={{ padding: '0.625rem 0.875rem', color: '#059669', fontWeight: 600 }}>{ev.confidence}</td>
                        <td style={{ padding: '0.625rem 0.875rem' }}>{recognitionPill(ev.recognition_status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

