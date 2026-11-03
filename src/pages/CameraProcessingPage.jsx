import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Camera, ChevronRight, ChevronLeft, ChevronDown, Search,
  AlertCircle, Filter, RotateCcw, CheckCircle2, XCircle,
  RefreshCw, Clock3, Video, Play, X
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import CameraProcessingFilterModal from '../components/CameraProcessingFilterModal';
import PageHeader from '../components/PageHeader';
import { API_BASE } from '../config';

// ── Helpers ──
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const PROCESSING_STATUS_OPTIONS = [
  { value: 'all', label: 'Status' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

// ── Status Badge ──
function StatusBadge({ status }) {
  const map = {
    completed: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', icon: <CheckCircle2 size={12} />, label: 'Completed' },
    pass: { bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0', icon: <CheckCircle2 size={12} />, label: 'Pass' },
    failed: { bg: '#fef2f2', color: '#991b1b', border: '#fee2e2', icon: <XCircle size={12} />, label: 'Failed' },
    fail: { bg: '#fef2f2', color: '#991b1b', border: '#fee2e2', icon: <XCircle size={12} />, label: 'Fail' },
    processing: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', icon: <RefreshCw size={12} style={{ animation: 'spin 1.2s linear infinite' }} />, label: 'Processing' },
    retry: { bg: '#fffbeb', color: '#92400e', border: '#fde68a', icon: <RefreshCw size={12} />, label: 'Retry' },
  };
  const key = (status || '').toLowerCase();
  const cfg = map[key] || { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0', icon: null, label: status || '-' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      padding: '0.2rem 0.6rem', borderRadius: '999px',
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontSize: '0.72rem', fontWeight: 700,
      whiteSpace: 'nowrap'
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Main Page Component ──
export default function CameraProcessingPage({ user, onLogout, onToggleSidebar, sidebarCollapsed, onNavigate }) {
  const readParams = () => {
    const p = new URLSearchParams(window.location.search);
    const savedBranch = sessionStorage.getItem('camera_processing_filter_branch');
    const savedCamera = sessionStorage.getItem('camera_processing_filter_camera');
    const savedStatus = sessionStorage.getItem('camera_processing_filter_status');

    return {
      branch: savedBranch || p.get('branch') || 'all',
      camera: savedCamera || p.get('camera') || 'all',
      status: savedStatus || p.get('status') || 'all',
      dateFrom: p.get('dateFrom') || '',
      dateTo: p.get('dateTo') || '',
    };
  };

  const _init = readParams();

  // Active table filter states
  const [branchFilter, setBranchFilter] = useState(_init.branch);
  const [cameraFilter, setCameraFilter] = useState(_init.camera);
  const [statusFilter, setStatusFilter] = useState(_init.status);
  const [dateFrom, setDateFrom] = useState(_init.dateFrom);
  const [dateTo, setDateTo] = useState(_init.dateTo);
  const [searchTerm, setSearchTerm] = useState('');

  // When component mounts, sync filters from sessionStorage if available
  useEffect(() => {
    const savedBranch = sessionStorage.getItem('camera_processing_filter_branch');
    const savedCamera = sessionStorage.getItem('camera_processing_filter_camera');
    const savedStatus = sessionStorage.getItem('camera_processing_filter_status');
    if (savedBranch || savedCamera || savedStatus) {
      if (savedBranch) setBranchFilter(savedBranch);
      if (savedCamera) setCameraFilter(savedCamera);
      if (savedStatus) setStatusFilter(savedStatus);
      sessionStorage.removeItem('camera_processing_filter_branch');
      sessionStorage.removeItem('camera_processing_filter_camera');
      sessionStorage.removeItem('camera_processing_filter_status');
    }
  }, []);

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => Number(sessionStorage.getItem('camera_processing_per_page')) || 25);
  const [sortBy, setSortBy] = useState('processing_date');
  const [order, setOrder] = useState('desc');

  // Save perPage in session
  useEffect(() => {
    sessionStorage.setItem('camera_processing_per_page', perPage);
  }, [perPage]);

  // Data & Metadata
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [branches, setBranches] = useState([]);
  const [cameras, setCameras] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState({});
  const [error, setError] = useState('');

  // Filter modal state
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // AbortController ref
  const abortRef = useRef(null);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }, []);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const headers = getAuthHeaders();
        const [bRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/api/v1/branches`, { headers }),
          fetch(`${API_BASE}/api/v1/cameras`, { headers }),
        ]);
        if (bRes.ok) setBranches(await bRes.json());
        if (cRes.ok) setCameras(await cRes.json());
      } catch { /* silent */ }
    };
    fetchMeta();
  }, [getAuthHeaders]);

  // Dynamically filter cameras based on currently selected branch
  const availableCameras = useMemo(() => {
    if (!branchFilter || branchFilter === 'all') {
      return cameras;
    }
    return cameras.filter(c => String(c.branch_id) === String(branchFilter));
  }, [cameras, branchFilter]);

  const handleBranchFilterChange = (newBranch) => {
    setBranchFilter(newBranch);
    setPage(1);
    if (newBranch !== 'all') {
      const branchCams = cameras.filter(c => String(c.branch_id) === String(newBranch));
      const stillValid = branchCams.some(c => String(c.id) === String(cameraFilter) || String(c.camera_id) === String(cameraFilter) || c.name === cameraFilter);
      if (!stillValid) {
        setCameraFilter('all');
      }
    }
  };

  const fetchData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ page, per_page: perPage, sort_by: sortBy, order });
      if (branchFilter !== 'all') params.set('branch_id', branchFilter);
      if (cameraFilter !== 'all') params.set('camera_id', cameraFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchTerm) params.set('search', searchTerm);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetch(`${API_BASE}/api/v1/reports/camera-processing?${params}`, {
        signal: controller.signal,
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);

      const result = await res.json();
      setData(result.data || []);
      const totalRecs = result.pagination?.total ?? result.total ?? 0;
      const totalPgs = result.pagination?.total_pages ?? result.total_pages ?? (totalRecs > 0 ? Math.ceil(totalRecs / perPage) : 1);
      setTotal(totalRecs);
      setTotalPages(Math.max(1, totalPgs));
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Failed to load camera processing data. Please verify backend service.');
        setData([]);
      }
    } finally {
      if (abortRef.current === controller) setLoading(false);
    }
  }, [page, perPage, sortBy, order, branchFilter, cameraFilter, statusFilter, searchTerm, dateFrom, dateTo, getAuthHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (col) => {
    if (sortBy === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setOrder('asc'); }
    setPage(1);
  };

  const handleApplyFilters = ({ branch, camera, status }) => {
    setBranchFilter(branch || 'all');
    setCameraFilter(camera || 'all');
    setStatusFilter(status || 'all');
    setPage(1);
    setFilterModalOpen(false);

    const p = new URLSearchParams();
    if (branch && branch !== 'all') p.set('branch', branch);
    if (camera && camera !== 'all') p.set('camera', camera);
    if (status && status !== 'all') p.set('status', status);
    window.history.replaceState(null, '', `/reports/camera-processing?${p.toString()}`);
  };

  const COLUMNS = [
    { key: 'video_name', label: 'PROCESSED VIDEO' },
    { key: 'camera_name', label: 'CAMERA' },
    { key: 'branch_name', label: 'BRANCH' },
    { key: 'processing_date', label: 'PROCESSED DATE & TIME' },
    { key: 'duration_formatted', label: 'DURATION' },
    { key: 'status', label: 'STATUS' },
  ];

  const navigateTo = (path) => {
    if (onNavigate) {
      if (path === '/reports') onNavigate('reports');
      else onNavigate(path.replace('/', ''));
    } else {
      window.location.href = path;
    }
  };

  return (
    <div className="epic-page-container" style={{ padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', minHeight: '100%', boxSizing: 'border-box', background: '#f8fafc' }}>
      <PageHeader
        title="Camera Processing Reports"
        icon={Camera}
        onToggleSidebar={onToggleSidebar}
        user={user}
        onLogout={onLogout}
        onNavigate={onNavigate}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <style>{`
          .epic-toolbar {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 1rem;
            margin-bottom: 1.25rem;
            flex-wrap: wrap;
          }
          .epic-filters-group {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-wrap: wrap;
            flex: 1;
          }
          .epic-search-wrapper {
            position: relative;
            min-width: 220px;
            max-width: 280px;
          }
          .epic-search-icon {
            position: absolute;
            left: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
          }
          .epic-search-input {
            width: 100%;
            min-height: 38px;
            padding: 0.5rem 0.75rem 0.5rem 2.2rem;
            border: 1px solid #e2e8f0;
            border-radius: 0.5rem;
            font-size: 0.8125rem;
            outline: none;
            background: #ffffff;
            font-weight: 500;
            color: #1e293b;
            transition: all 0.15s;
          }
          .epic-search-input:focus {
            background: #fff;
            border-color: var(--brand-primary, #006EB3);
          }
          .epic-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 1rem;
            font-size: 0.8125rem;
            font-weight: 600;
            border-radius: 0.5rem;
            cursor: pointer;
            transition: all 0.15s ease;
            border: none;
          }
          .epic-btn-primary {
            background: var(--brand-primary, #006EB3);
            color: #fff;
          }
          .epic-btn-primary:hover {
            background: var(--brand-primary-hover, #0084D6);
          }
          .epic-btn-secondary {
            background: #ffffff;
            color: #475569;
            border: 1px solid #e2e8f0;
          }
          .epic-btn-secondary:hover {
            background: #f8fafc;
            border-color: #cbd5e1;
          }
        `}</style>

        {/* 🔙 Breadcrumb Bar (Matching Reports Page & Category Navigation) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => navigateTo('/reports')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '0.625rem',
              padding: '0.5rem 0.85rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f8fafc';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
          >
            &larr; Back to Categories
          </button>
        </div>

        {/* 🔍 Search & Filters Toolbar (Search, Branch, Camera, Status, Clear All) */}
        <div className="epic-toolbar">
          <div className="epic-filters-group">
            {/* 1. Search */}
            <div className="epic-search-wrapper">
              <Search size={16} className="epic-search-icon" />
              <input
                type="text"
                className="epic-search-input"
                placeholder="Search processed videos..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>

            {/* 2. Branch Filter */}
            <CustomSelect
              value={branchFilter}
              onChange={e => {
                const val = (e && typeof e === 'object' && 'target' in e) ? e.target.value : e;
                handleBranchFilterChange(val);
              }}
              options={[
                { value: 'all', label: 'Branches' },
                ...branches.map(b => ({ value: String(b.id), label: b.name }))
              ]}
              style={{ minWidth: 140 }}
            />

            {/* 3. Camera Filter (Positioned between Branch and Status) */}
            <CustomSelect
              value={cameraFilter}
              onChange={e => {
                const val = (e && typeof e === 'object' && 'target' in e) ? e.target.value : e;
                setCameraFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Camera' },
                ...availableCameras.map(c => ({
                  value: String(c.id || c.name),
                  label: c.name || c.camera_id || `Camera ${c.id}`
                }))
              ]}
              style={{ minWidth: 140 }}
            />

            {/* 4. Status Filter */}
            <CustomSelect
              value={statusFilter}
              onChange={e => {
                const val = (e && typeof e === 'object' && 'target' in e) ? e.target.value : e;
                setStatusFilter(val);
                setPage(1);
              }}
              options={PROCESSING_STATUS_OPTIONS}
              style={{ minWidth: 130 }}
            />

            {/* 5. Clear All */}
            {(searchTerm || branchFilter !== 'all' || cameraFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setBranchFilter('all');
                  setCameraFilter('all');
                  setStatusFilter('all');
                  setPage(1);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#10b981',
                  fontSize: '0.825rem',
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
        </div>

        {/* 📋 Main Table Container */}
        <div style={{ background: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 290px)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>

              {/* 🏷 Table Header */}
              <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.72rem', fontWeight: 700, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={col.noSort ? undefined : () => handleSort(col.key)}
                      style={{
                        padding: '0.875rem 1rem',
                        cursor: col.noSort ? 'default' : 'pointer',
                        userSelect: 'none',
                        whiteSpace: 'nowrap',
                        color: '#475569',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase'
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {col.label}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* 📊 Table Body */}
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td colSpan={COLUMNS.length} style={{ padding: '1.25rem 1rem' }}>
                        <div style={{ height: 20, background: '#f1f5f9', borderRadius: 4 }} />
                      </td>
                    </tr>
                  ))
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMNS.length} style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
                      <Camera size={44} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>No camera processing records found</div>
                      <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        Try adjusting your filters or search query.
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((row, idx) => {
                    const rowId = row.video_id || row.id;

                    return (
                      <tr
                        key={rowId || idx}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: idx % 2 === 0 ? '#fff' : '#fafafa',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
                        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                      >
                        {/* 1. Processed Video Name */}
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{
                              width: '34px', height: '34px', borderRadius: '0.5rem',
                              background: '#f1f5f9', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', color: '#475569', flexShrink: 0
                            }}>
                              <Video size={16} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.825rem' }}>
                                {row.video_name || row.filename || '-'}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 1 }}>
                                Video ID: #{row.video_id || row.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Camera */}
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: row.camera_name?.includes('Break_In') ? '#fef3c7' :
                              row.camera_name?.includes('Break_Out') ? '#f3e8ff' : '#dcfce7',
                            color: row.camera_name?.includes('Break_In') ? '#b45309' :
                              row.camera_name?.includes('Break_Out') ? '#7e22ce' : '#15803d',
                            border: `1px solid ${row.camera_name?.includes('Break_In') ? '#fde68a' :
                              row.camera_name?.includes('Break_Out') ? '#e9d5ff' : '#bbf7d0'
                              }`,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            whiteSpace: 'nowrap'
                          }}>
                            {row.camera_name?.includes('Break_In') ? ' Break In' :
                              row.camera_name?.includes('Break_Out') ? ' Break Out' :
                                '🏢 ' + (row.camera_name || 'Attendance')}
                          </span>
                        </td>

                        {/* 3. Branch */}
                        <td style={{ padding: '0.875rem 1rem', color: '#475569', fontWeight: 600 }}>
                          {row.branch_name || 'Main Branch'}
                        </td>

                        {/* 4. Processed Date & Time */}
                        <td style={{ padding: '0.875rem 1rem', color: '#334155', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 600 }}>
                          {row.processing_date || row.timestamp || '-'}
                        </td>

                        {/* 5. Duration */}
                        <td style={{ padding: '0.875rem 1rem', color: '#64748b', fontWeight: 600, fontSize: '0.78rem' }}>
                          {row.duration_formatted || (row.processing_duration ? `${row.processing_duration}s` : '-')}
                        </td>

                        {/* 6. Status */}
                        <td style={{ padding: '0.875rem 1rem' }}>
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Server-Side Pagination Bar (Matching Screenshot) ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
              Showing Page {page} of {totalPages} ({total} total records)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Expanded Rows Per Page Selector (10, 25, 50, 100) */}
              <CustomSelect
                value={perPage}
                onChange={e => {
                  const val = Number((e && typeof e === 'object' && 'target' in e) ? e.target.value : e);
                  setPerPage(val);
                  setPage(1);
                }}
                dropUp={true}
                options={[
                  { value: 10, label: '10 / page' },
                  { value: 25, label: '25 / page' },
                  { value: 50, label: '50 / page' },
                  { value: 100, label: '100 / page' }
                ]}
              />

              {/* Prev / Next Pagination Buttons with Green Active Badge */}
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    background: page <= 1 ? '#f1f5f9' : '#fff',
                    color: page <= 1 ? '#cbd5e1' : '#475569',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  Prev
                </button>

                <span style={{
                  padding: '0.375rem 0.75rem',
                  background: 'var(--epic-green, #10b981)',
                  color: '#fff',
                  borderRadius: '0.375rem',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    background: page >= totalPages ? '#f1f5f9' : '#fff',
                    color: page >= totalPages ? '#cbd5e1' : '#475569',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🛠 Camera Processing Filter Modal */}
      <CameraProcessingFilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        onApplyFilters={handleApplyFilters}
        branches={branches}
        cameras={cameras}
        initialFilters={{
          branch: branchFilter,
          camera: cameraFilter,
          status: statusFilter
        }}
      />
    </div>
  );
}
