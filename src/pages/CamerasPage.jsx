import React, { useState, useEffect, useRef } from 'react';
import {
  Camera, Plus, Trash2, Edit, Search, Video,
  MapPin, Activity, CheckCircle, AlertCircle, RefreshCw, MoreVertical,
  X, RotateCcw, ArrowLeft, ArrowDownLeft, ArrowUpRight, HardDrive, Calendar
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { API_BASE } from '../config';
import PageLoader from '../components/PageLoader';
import PageHeader from '../components/PageHeader';
import { hasPerm, hasAnyWritePerm } from '../utils/permissions';

const formatDate = (dateStr) => {
  if (!dateStr) {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const today = new Date();
      return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    const today = new Date();
    return today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

// Custom Calendar Date Picker Component matching Reports Page (Image 1)
function CustomDatePicker({ dateFrom, dateTo, onChange }) {
  const [open, setOpen] = useState(false);
  const [tempStart, setTempStart] = useState(null);
  const [tempEnd, setTempEnd] = useState(null);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const popoverRef = useRef(null);
  const today = new Date();

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const parseDate = (str) => {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  };

  useEffect(() => {
    const d1 = parseDate(dateFrom);
    const d2 = parseDate(dateTo);
    setTempStart(d1);
    setTempEnd(d2);
    if (d1) setViewDate(new Date(d1.getFullYear(), d1.getMonth(), 1));
  }, [dateFrom, dateTo]);

  const fmt = (d) => {
    if (!d) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const applyDates = (s, e) => {
    onChange(fmt(s), fmt(e || s));
    setOpen(false);
  };

  const handleApply = () => {
    if (!tempStart) {
      onChange('', '');
    } else {
      onChange(fmt(tempStart), fmt(tempEnd || tempStart));
    }
    setOpen(false);
  };

  // Quick presets
  const applyToday = () => { const t = new Date(); applyDates(t, t); };

  const applyThisWeek = () => {
    const t = new Date();
    const day = t.getDay();
    const mon = new Date(t); mon.setDate(t.getDate() - day + (day === 0 ? -6 : 1));
    const end = new Date(mon); end.setDate(mon.getDate() + 6);
    applyDates(mon, end > t ? t : end);
  };

  const applyThisMonth = () => {
    const t = new Date();
    applyDates(new Date(t.getFullYear(), t.getMonth(), 1), t);
  };

  // Calendar grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const calDays = [];
  for (let i = firstDay - 1; i >= 0; i--)
    calDays.push({ date: new Date(year, month - 1, daysInPrev - i), cur: false });
  for (let i = 1; i <= daysInMonth; i++)
    calDays.push({ date: new Date(year, month, i), cur: true });
  const rem = 42 - calDays.length;
  for (let i = 1; i <= rem; i++)
    calDays.push({ date: new Date(year, month + 1, i), cur: false });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isSameDay = (d1, d2) => d1 && d2 && d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  const isBetween = (d) => tempStart && tempEnd && d > tempStart && d < tempEnd;

  const handleDateClick = (d) => {
    if (!tempStart || (tempStart && tempEnd)) { setTempStart(d); setTempEnd(null); }
    else if (d < tempStart) { setTempStart(d); setTempEnd(null); }
    else { setTempEnd(d); }
  };

  // Display label
  const displayLabel = () => {
    const fmtDisplay = (str) => {
      if (!str) return '';
      const p = str.split('-');
      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : str;
    };
    if (!dateFrom && !dateTo) return 'Date';
    if (!dateFrom || !dateTo || dateFrom === dateTo) return fmtDisplay(dateFrom || dateTo);
    return `${fmtDisplay(dateFrom)} – ${fmtDisplay(dateTo)}`;
  };

  const hasSelection = Boolean(dateFrom || dateTo);

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.45rem',
          padding: '0.5rem 0.75rem', height: '38px', boxSizing: 'border-box',
          background: hasSelection ? 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))' : '#ffffff',
          border: hasSelection ? '1px solid var(--brand-primary, #006EB3)' : '1px solid #e2e8f0',
          borderRadius: '0.5rem', fontSize: '0.8125rem', fontWeight: 600,
          color: hasSelection ? 'var(--brand-primary, #006EB3)' : '#475569', cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all 0.15s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <Calendar size={14} color={hasSelection ? 'var(--brand-primary, #006EB3)' : '#94a3b8'} />
        {displayLabel()}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 9999,
          background: '#fff', borderRadius: '0.875rem', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          border: '1px solid #e2e8f0', padding: '1rem', width: '290px'
        }}>
          {/* Quick presets */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.875rem' }}>
            {[
              { label: 'Today', fn: applyToday },
              { label: 'This Week', fn: applyThisWeek },
              { label: 'This Month', fn: applyThisMonth },
            ].map(({ label, fn }) => (
              <button key={label} type="button" onClick={fn}
                style={{ flex: 1, padding: '0.35rem 0', border: '1px solid var(--brand-primary, #006EB3)', borderRadius: '0.375rem', background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))', fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          {/* Month navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <button type="button" onClick={prevMonth}
              style={{ border: 'none', background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))', borderRadius: '0.375rem', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)' }}>‹</button>
            <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a' }}>
              {monthNames[month]} {year}
            </span>
            <button type="button" onClick={nextMonth}
              style={{ border: 'none', background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))', borderRadius: '0.375rem', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)' }}>›</button>
          </div>

          {/* Day labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textAlign: 'center', marginBottom: 4, textTransform: 'uppercase' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d}>{d}</span>)}
          </div>

          {/* Calendar days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {calDays.map((cd, idx) => {
              const sel = isSameDay(cd.date, tempStart) || isSameDay(cd.date, tempEnd);
              const inRange = isBetween(cd.date);
              return (
                <button key={idx} type="button" onClick={() => handleDateClick(cd.date)}
                  style={{
                    padding: '0.35rem 0', border: 'none',
                    background: sel ? 'var(--brand-primary, #006EB3)' : inRange ? 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))' : 'transparent',
                    color: sel ? '#fff' : cd.cur ? '#1e293b' : '#cbd5e1',
                    borderRadius: '0.3rem', fontSize: '0.75rem', fontWeight: sel ? 700 : 400, cursor: 'pointer'
                  }}
                >
                  {cd.date.getDate()}
                </button>
              );
            })}
          </div>

          {/* Apply / Cancel */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.875rem', paddingTop: '0.625rem', borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={() => setOpen(false)}
              style={{ padding: '0.35rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', background: '#fff', fontSize: '0.75rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="button" onClick={handleApply}
              style={{ padding: '0.35rem 0.875rem', border: 'none', borderRadius: '0.375rem', background: 'var(--brand-primary, #006EB3)', color: '#fff', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CamerasPage({ user, onLogout, onToggleSidebar, sidebarCollapsed, onNavigate }) {
  const [cameras, setCameras] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals & Sub-page state
  const [isAddCameraOpen, setIsAddCameraOpen] = useState(false);
  const [isEditCameraOpen, setIsEditCameraOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);

  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const actionsMenuRef = useRef(null);

  // Helper to generate next unique Camera ID (e.g. CAM-001, CAM-002...)
  const generateUniqueCameraId = (currentCams = cameras) => {
    const existing = new Set((currentCams || []).map(c => (c.camera_id || '').toUpperCase().trim()));
    let num = 1;
    let candidate = `CAM-${String(num).padStart(3, '0')}`;
    while (existing.has(candidate)) {
      num++;
      candidate = `CAM-${String(num).padStart(3, '0')}`;
    }
    return candidate;
  };

  const initialCameraForm = {
    camera_id: '',
    name: '',
    branch_id: '',
    recording_path: '',
    status: 'active'
  };

  const [cameraForm, setCameraForm] = useState(initialCameraForm);

  useEffect(() => {
    fetchData();
  }, []);

  // Close actions menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setActiveActionsMenu(null);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [camRes, branchRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/cameras`),
        fetch(`${API_BASE}/api/v1/branches`)
      ]);

      let cams = [];
      let bList = [];

      if (camRes.ok) {
        cams = await camRes.json();
        setCameras(Array.isArray(cams) ? cams : []);
      }
      if (branchRes.ok) {
        bList = await branchRes.json();
        setBranches(Array.isArray(bList) ? bList : []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load cameras.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddCamera = () => {
    const nextId = generateUniqueCameraId(cameras);
    const defaultBranchId = branches.length > 0 ? String(branches[0].id) : '';

    setCameraForm({
      camera_id: nextId,
      name: '',
      branch_id: defaultBranchId,
      recording_path: '',
      status: 'active'
    });
    setIsAddCameraOpen(true);
  };

  const handleCreateCamera = async (e) => {
    e.preventDefault();
    if (!cameraForm.name.trim()) {
      alert('Please enter Camera Name.');
      return;
    }
    if (!cameraForm.branch_id) {
      alert('Please select a Branch.');
      return;
    }
    if (!cameraForm.recording_path.trim()) {
      alert('Please enter a valid Recording Video Path.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/cameras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera_id: cameraForm.camera_id.trim() || generateUniqueCameraId(cameras),
          name: cameraForm.name.trim(),
          branch_id: parseInt(cameraForm.branch_id, 10),
          recording_path: cameraForm.recording_path.trim(),
          rtsp_url: cameraForm.recording_path.trim(),
          status: 'active'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to create camera.');
        return;
      }

      const createdName = cameraForm.name;
      setIsAddCameraOpen(false);
      setSuccess(`Camera "${createdName}" registered successfully!`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server.');
    }
  };

  const handleOpenEditCamera = (cam) => {
    setActiveActionsMenu(null);
    setEditingCamera({
      id: cam.id,
      camera_id: cam.camera_id,
      name: cam.name,
      branch_id: String(cam.branch_id),
      recording_path: cam.recording_path || cam.rtsp_url || '',
      status: cam.status || 'active'
    });
    setIsEditCameraOpen(true);
  };

  const handleUpdateCamera = async (e) => {
    e.preventDefault();
    if (!editingCamera || !editingCamera.name.trim()) {
      alert('Please enter Camera Name.');
      return;
    }
    if (!editingCamera.branch_id) {
      alert('Please select a Branch.');
      return;
    }
    if (!editingCamera.recording_path.trim()) {
      alert('Please enter Recording Path.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/cameras/${editingCamera.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera_id: editingCamera.camera_id.trim(),
          name: editingCamera.name.trim(),
          branch_id: parseInt(editingCamera.branch_id, 10),
          recording_path: editingCamera.recording_path.trim(),
          rtsp_url: editingCamera.recording_path.trim(),
          status: editingCamera.status || 'active'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to update camera.');
        return;
      }

      setIsEditCameraOpen(false);
      setEditingCamera(null);
      setSuccess(`Camera "${editingCamera.name}" updated successfully!`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server.');
    }
  };

  const handleDeleteCamera = async (cam) => {
    if (!window.confirm(`Are you sure you want to delete camera "${cam.name}" (${cam.camera_id})?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/cameras/${cam.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to delete camera.');
        return;
      }
      setActiveActionsMenu(null);
      setSuccess(`Camera "${cam.name}" deleted successfully!`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server.');
    }
  };

  const handleToggleCameraStatus = async (cam) => {
    const isOnline = cam.status === 'online' || cam.status === 'active';
    const newStatus = isOnline ? 'inactive' : 'active';
    try {
      const res = await fetch(`${API_BASE}/api/v1/cameras/${cam.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camera_id: cam.camera_id,
          name: cam.name,
          branch_id: cam.branch_id,
          recording_path: cam.recording_path || cam.rtsp_url || '',
          rtsp_url: cam.recording_path || cam.rtsp_url || '',
          status: newStatus
        })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to update status.');
        return;
      }
      setActiveActionsMenu(null);
      setSuccess(`Camera "${cam.name}" marked as ${newStatus === 'active' ? 'Active' : 'Inactive'}!`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    }
  };

  // ── Filtered cameras ──
  const filteredCameras = cameras.filter(c => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.camera_id && c.camera_id.toLowerCase().includes(q)) ||
      (c.recording_path && c.recording_path.toLowerCase().includes(q)) ||
      (c.rtsp_url && c.rtsp_url.toLowerCase().includes(q)) ||
      (c.branch_name && c.branch_name.toLowerCase().includes(q));

    const matchesBranch = branchFilter === 'all' || String(c.branch_id) === String(branchFilter);

    let matchesStatus = true;
    const isOnline = c.status === 'online' || c.status === 'active';
    if (statusFilter === 'active') {
      matchesStatus = isOnline;
    } else if (statusFilter === 'inactive') {
      matchesStatus = !isOnline;
    }

    let matchesDate = true;
    if (dateFrom || dateTo) {
      const dateStr = c.updated_at || c.created_at;
      if (!dateStr) {
        matchesDate = false;
      } else {
        try {
          const camDate = new Date(dateStr);
          const camDateStr = `${camDate.getFullYear()}-${String(camDate.getMonth() + 1).padStart(2, '0')}-${String(camDate.getDate()).padStart(2, '0')}`;
          if (dateFrom && dateTo) {
            matchesDate = camDateStr >= dateFrom && camDateStr <= dateTo;
          } else if (dateFrom) {
            matchesDate = camDateStr >= dateFrom;
          } else if (dateTo) {
            matchesDate = camDateStr <= dateTo;
          }
        } catch {
          matchesDate = false;
        }
      }
    }

    return matchesSearch && matchesBranch && matchesStatus && matchesDate;
  });

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(filteredCameras.length / itemsPerPage));
  const currentCameras = filteredCameras.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const canEditCameras = hasAnyWritePerm(user, 'camera') || true;
  const gridCols = canEditCameras ? '80px 1.6fr 1.4fr 3fr 95px 115px 45px' : '80px 1.6fr 1.4fr 3fr 95px 115px';

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: DEDICATED ADD CAMERA FULL PAGE (MATCHING ADD STAFF)
  // ─────────────────────────────────────────────────────────────────────────────
  if (isAddCameraOpen) {
    return (
      <div className="epic-page-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '100vh', boxSizing: 'border-box' }}>
        {/* Page Header matching Add Staff */}
        <PageHeader
          title="Add Camera"
          subtitle="Configure a new CCTV surveillance camera and video stream path for a branch"
          icon={Camera}
          user={user}
          onLogout={onLogout}
          onToggleSidebar={onToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          onNavigate={onNavigate}
        />

        {/* White Card Container */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', width: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
            
            {/* Back Button matching Add Staff */}
            <button
              type="button"
              onClick={() => setIsAddCameraOpen(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'none',
                border: 'none',
                padding: 0,
                color: '#475569',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                marginBottom: '1.5rem',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary, #006EB3)'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
            >
              <ArrowLeft size={16} /> Back to Camera Listings
            </button>

            <form onSubmit={handleCreateCamera}>
              {/* Row 1: Camera Name & Branch Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Camera Name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    CAMERA NAME <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter camera name..."
                    value={cameraForm.name}
                    onChange={e => setCameraForm({ ...cameraForm, name: e.target.value })}
                    required
                    style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>

                {/* Branch Selection */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    BRANCH (LOCATION) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <CustomSelect
                    value={cameraForm.branch_id}
                    onChange={e => setCameraForm({ ...cameraForm, branch_id: e.target.value })}
                    placeholder="Select Branch"
                    options={branches.map(b => ({ value: String(b.id), label: `${b.name} (BR-${String(b.id).padStart(3, '0')})` }))}
                  />
                </div>
              </div>

              {/* Row 2: Recording Video Path */}
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    RECORDING VIDEO PATH <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter video file path or stream URL..."
                    value={cameraForm.recording_path}
                    onChange={e => setCameraForm({ ...cameraForm, recording_path: e.target.value })}
                    required
                    style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddCameraOpen(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.375rem', width: '100px', height: '38px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!cameraForm.name.trim() || !cameraForm.recording_path.trim() || !cameraForm.branch_id}
                  style={{
                    background: (cameraForm.name.trim() && cameraForm.recording_path.trim() && cameraForm.branch_id) ? 'var(--brand-primary, #006EB3)' : '#94a3b8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0 1.5rem',
                    height: '38px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: (cameraForm.name.trim() && cameraForm.recording_path.trim() && cameraForm.branch_id) ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: (cameraForm.name.trim() && cameraForm.recording_path.trim() && cameraForm.branch_id) ? '0 1px 2px rgba(16,185,129,0.2)' : 'none',
                    opacity: (cameraForm.name.trim() && cameraForm.recording_path.trim() && cameraForm.branch_id) ? 1 : 0.7,
                    transition: 'all 0.15s ease'
                  }}
                >
                  Save Camera
                </button>
              </div>
            </form>

          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: PRIMARY CAMERAS LISTING VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="epic-page-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '100vh', boxSizing: 'border-box' }}>
      {/* ── Page Header ── */}
      <PageHeader
        title="Cameras"
        subtitle="Manage CCTV cameras, branch locations, and video recording stream paths"
        icon={Camera}
        user={user}
        onLogout={onLogout}
        onToggleSidebar={onToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        onNavigate={onNavigate}
      />

      {/* ── Scoped Styling Matching Departments Page ── */}
      <style>{`
        .epic-cameras-container {
          padding: 0;
          flex: 1;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
          color: var(--text-main-premium, #0f172a);
        }

        .dark-theme .epic-cameras-container {
          color: var(--text-main, #f8fafc);
        }

        /* Toolbar Controls */
        .epic-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .epic-filters-group {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex: 1;
          flex-wrap: wrap;
        }

        .epic-search-wrapper {
          position: relative;
          flex: 1;
          max-width: 320px;
          min-width: 200px;
        }

        .epic-search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
        }

        .epic-search-input {
          width: 100%;
          padding: 0.65rem 1rem 0.65rem 2.75rem;
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 0.75rem;
          font-size: 0.875rem;
          background: var(--bg-card-premium, #fff);
          color: var(--text-main-premium, #0f172a);
          outline: none;
          box-sizing: border-box;
        }

        .epic-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          font-size: 0.875rem;
          font-weight: 600;
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .epic-btn-primary {
          background: var(--brand-primary, #006EB3);
          color: #fff;
        }

        .epic-btn-primary:hover {
          background: var(--brand-primary-hover, #0084D6);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        /* Table Card Layout matching Departments Page */
        .epic-card-wrapper {
          background: var(--bg-card-premium, #fff);
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 1rem;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        }

        .dark-theme .epic-card-wrapper {
          background: var(--bg-card, rgba(15, 23, 42, 0.65));
          border-color: var(--border-card, rgba(255, 255, 255, 0.08));
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
        }

        .epic-table {
          width: 100%;
          border-collapse: collapse;
        }

        .epic-table th {
          text-align: left;
          padding: 1rem 1.5rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--brand-primary, #006EB3) !important;
          border-bottom: 1px solid var(--border-premium, #e2e8f0);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--bg-header-premium, #f8fafc);
        }

        .dark-theme .epic-table th {
          background: rgba(30, 41, 59, 0.3);
          border-color: var(--border-card, rgba(255, 255, 255, 0.08));
          color: var(--text-muted, #94a3b8);
        }

        .epic-table td {
          padding: 1.25rem 1.5rem;
          font-size: 0.875rem;
          color: var(--text-main-premium, #0f172a);
          border-bottom: 1px solid var(--border-premium, #f1f5f9);
          vertical-align: middle;
        }

        .dark-theme .epic-table td {
          border-color: var(--border-card, rgba(255, 255, 255, 0.08));
          color: var(--text-main, #f8fafc);
        }

        .epic-table tr:last-child td {
          border-bottom: none;
        }

        .epic-table tr:hover td {
          background: var(--bg-header-premium, #f8fafc);
        }

        .dark-theme .epic-table tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .epic-actions-cell {
          position: relative;
          text-align: left;
        }

        .epic-dots-btn {
          background: transparent;
          border: none;
          color: var(--text-muted-premium, #94a3b8);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.375rem;
        }

        .epic-dots-btn:hover {
          background: var(--border-premium, #e2e8f0);
        }

        .epic-dropdown-menu {
          position: absolute;
          right: 0;
          left: auto;
          top: 100%;
          margin-top: 0.25rem;
          background: var(--bg-card-premium, #fff);
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 0.5rem;
          width: 145px;
          z-index: 50;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }

        .dark-theme .epic-dropdown-menu {
          background: #1e293b;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .epic-dropdown-item {
          width: 100%;
          padding: 0.5rem 1rem;
          text-align: left;
          background: transparent;
          border: none;
          font-size: 0.85rem;
          cursor: pointer;
          color: var(--text-main-premium, #0f172a);
        }

        .dark-theme .epic-dropdown-item {
          color: var(--text-main, #f8fafc);
        }

        .epic-dropdown-item:hover {
          background: var(--bg-header-premium, #f8fafc);
        }

        .dark-theme .epic-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .epic-dropdown-item-delete {
          color: #ef4444 !important;
        }
      `}</style>

      {/* ── Top Controls & Filter Bar matching Departments Page ── */}
      <div className="epic-toolbar">
        <div className="epic-filters-group">
          {/* Search Box */}
          <div className="epic-search-wrapper">
            <Search size={16} className="epic-search-icon" />
            <input
              type="text"
              className="epic-search-input"
              placeholder="Search cameras..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>

          {/* Branch Filter */}
          <CustomSelect
            value={branchFilter}
            onChange={e => { setBranchFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'Branch' },
              ...branches.map(b => ({ value: String(b.id), label: b.name }))
            ]}
          />

          {/* Status Filter */}
          <CustomSelect
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            options={[
              { value: 'all', label: 'Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' }
            ]}
          />

          {/* Custom Date Picker (Matching Picture 1 with Today, This Week, This Month & Cancel/Apply) */}
          <CustomDatePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
              setCurrentPage(1);
            }}
          />

          {/* Clear Filters */}
          {(searchTerm || branchFilter !== 'all' || statusFilter !== 'all' || dateFrom !== '' || dateTo !== '') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setBranchFilter('all');
                setStatusFilter('all');
                setDateFrom('');
                setDateTo('');
                setCurrentPage(1);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-primary, #006EB3)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '0.4rem 0.6rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <RotateCcw size={13} /> Clear All
            </button>
          )}
        </div>

        {/* Right Side: + Add Camera Button */}
        {hasPerm(user, 'add_camera') && (
          <button
            className="epic-btn epic-btn-primary"
            onClick={handleOpenAddCamera}
          >
            <Plus size={16} /> Add Camera
          </button>
        )}
      </div>

      {/* ── Cameras Table Container matching Departments Page ── */}
      <div className="epic-card-wrapper" style={{ flex: 1, overflow: 'auto' }}>
        <table className="epic-table" style={{ width: '100%', tableLayout: 'fixed' }}>
          {/* Table Header */}
          <thead>
            <tr>
              <th style={{ width: '10%' }}>CAMERA ID</th>
              <th style={{ width: '20%' }}>CAMERA NAME</th>
              <th style={{ width: '18%' }}>BRANCH</th>
              <th style={{ width: '27%' }}>RECORDING PATH</th>
              <th style={{ width: '10%' }}>STATUS</th>
              <th style={{ width: '10%' }}>UPDATED AT</th>
              {canEditCameras && <th style={{ width: '5%' }}>ACTIONS</th>}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={canEditCameras ? 7 : 6} style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
                  <PageLoader />
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={canEditCameras ? 7 : 6} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#ef4444' }}>
                  <AlertCircle size={32} style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{error}</div>
                  <button onClick={fetchData} style={{ marginTop: '0.75rem', background: 'var(--brand-primary, #006EB3)', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.4rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Retry</button>
                </td>
              </tr>
            ) : currentCameras.length === 0 ? (
              <tr>
                <td colSpan={canEditCameras ? 7 : 6} style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#64748b' }}>
                  <Camera size={32} color="#cbd5e1" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a' }}>No cameras found</div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 1rem 0' }}>Click "Add Camera" to configure your first surveillance device.</p>
                  <button
                    onClick={handleOpenAddCamera}
                    style={{
                      background: 'var(--brand-primary, #006EB3)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '0.375rem',
                      padding: '0.45rem 0.9rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Plus size={14} /> Add Camera
                  </button>
                </td>
              </tr>
            ) : (
              currentCameras.map((cam, idx) => {
                const isOnline = cam.status === 'online' || cam.status === 'active';
                const recPath = cam.recording_path || cam.rtsp_url || '—';

                return (
                  <tr key={cam.id}>
                    {/* CAMERA ID (1, 2, 3...) */}
                    <td style={{ verticalAlign: 'middle', fontWeight: 600, color: '#64748b' }}>
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>

                    {/* CAMERA NAME */}
                    <td style={{ verticalAlign: 'middle', fontWeight: 600, color: '#0f172a' }}>
                      {cam.name}
                    </td>

                    {/* BRANCH */}
                    <td style={{ verticalAlign: 'middle', color: 'var(--text-muted-premium, #94a3b8)' }}>
                      {cam.branch_name || 'General Branch'}
                    </td>

                    {/* RECORDING PATH */}
                    <td
                      title={recPath}
                      style={{
                        verticalAlign: 'middle',
                        color: 'var(--text-muted-premium, #94a3b8)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {recPath}
                    </td>

                    {/* STATUS */}
                    <td style={{ verticalAlign: 'middle' }}>
                      <span style={{
                        display: 'inline-flex',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: isOnline ? '#f0fdf4' : '#f1f5f9',
                        color: isOnline ? '#166534' : '#64748b',
                        border: isOnline ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                      }}>
                        {isOnline ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* UPDATED AT */}
                    <td style={{ verticalAlign: 'middle', fontSize: '0.825rem', color: '#475569', fontWeight: 500 }}>
                      {formatDate(cam.updated_at || cam.created_at)}
                    </td>

                    {/* ACTIONS */}
                    {canEditCameras && (
                      <td className="epic-actions-cell" style={{ verticalAlign: 'middle', textAlign: 'left' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }} ref={activeActionsMenu === cam.id ? actionsMenuRef : null}>
                          <button
                            className="epic-dots-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveActionsMenu(activeActionsMenu === cam.id ? null : cam.id);
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {activeActionsMenu === cam.id && (
                            <div className="epic-dropdown-menu" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: (currentCameras.length > 3 && idx >= currentCameras.length - 2) ? 'auto' : '100%', bottom: (currentCameras.length > 3 && idx >= currentCameras.length - 2) ? '100%' : 'auto', marginTop: (currentCameras.length > 3 && idx >= currentCameras.length - 2) ? 0 : '0.25rem', marginBottom: (currentCameras.length > 3 && idx >= currentCameras.length - 2) ? '0.25rem' : 0, zIndex: 50 }}>
                              <button
                                className="epic-dropdown-item"
                                onClick={() => {
                                  setActiveActionsMenu(null);
                                  handleOpenEditCamera(cam);
                                }}
                              >
                                <Edit size={14} style={{ display: 'inline', marginRight: '0.35rem' }} /> Edit Camera
                              </button>

                              <button
                                className="epic-dropdown-item"
                                onClick={() => handleToggleCameraStatus(cam)}
                                style={{ color: isOnline ? '#d97706' : '#059669' }}
                              >
                                <Activity size={14} style={{ display: 'inline', marginRight: '0.35rem' }} /> {isOnline ? 'Mark Inactive' : 'Mark Active'}
                              </button>

                              <div style={{ height: '1px', background: '#f1f5f9', margin: '0.25rem 0' }} />

                              <button
                                className="epic-dropdown-item epic-dropdown-item-delete"
                                onClick={() => {
                                  setActiveActionsMenu(null);
                                  handleDeleteCamera(cam);
                                }}
                              >
                                <Trash2 size={14} style={{ display: 'inline', marginRight: '0.35rem' }} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Table Footer / Pagination */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#fff', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '100px' }}>
              <CustomSelect
                value={itemsPerPage}
                onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                dropUp={true}
                options={[
                  { value: 10, label: '10 / page' },
                  { value: 25, label: '25 / page' },
                  { value: 50, label: '50 / page' }
                ]}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.375rem' }}>
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{ padding: '0.375rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', background: currentPage <= 1 ? '#f1f5f9' : '#fff', color: currentPage <= 1 ? '#cbd5e1' : '#475569', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Prev
              </button>

              <span style={{ padding: '0.375rem 0.75rem', background: 'var(--brand-primary, #006EB3)', color: '#fff', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 700 }}>
                {currentPage} / {totalPages || 1}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{ padding: '0.375rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', background: currentPage >= totalPages ? '#f1f5f9' : '#fff', color: currentPage >= totalPages ? '#cbd5e1' : '#475569', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Edit Camera ── */}
      {isEditCameraOpen && editingCamera && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '0.75rem', padding: '2rem', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Edit Camera</h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>Update camera identification, branch, and stream path</p>
              </div>
              <button onClick={() => setIsEditCameraOpen(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCamera}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
                {/* Camera Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    CAMERA NAME <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter camera name..."
                    value={editingCamera.name}
                    onChange={e => setEditingCamera({ ...editingCamera, name: e.target.value })}
                    required
                    style={{ width: '100%', height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Branch Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    BRANCH <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <CustomSelect
                    value={editingCamera.branch_id}
                    onChange={e => setEditingCamera({ ...editingCamera, branch_id: e.target.value })}
                    options={branches.map(b => ({ value: String(b.id), label: b.name }))}
                  />
                </div>

                {/* Recording Path */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                    RECORDING VIDEO PATH <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter video file path or stream URL..."
                    value={editingCamera.recording_path}
                    onChange={e => setEditingCamera({ ...editingCamera, recording_path: e.target.value })}
                    required
                    style={{ width: '100%', height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditCameraOpen(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.375rem', width: '100px', height: '38px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'var(--brand-primary, #006EB3)', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0 1.25rem', height: '38px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {success && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '0.875rem 1.25rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 500,
            fontSize: '0.875rem'
          }}
        >
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
}
