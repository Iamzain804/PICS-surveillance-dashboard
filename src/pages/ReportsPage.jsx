import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FileText, Download, RefreshCw, AlertCircle, Calendar,
  ChevronRight, ChevronDown, Search, Building2, FileSpreadsheet, Activity,
  ArrowUpDown, ArrowUp, ArrowDown, Camera, Layers, Clock, ShieldAlert,
  CheckCircle2, XCircle, Clock3, Filter, UserCheck, AlertTriangle, Users, Coffee,
  Play, Video, X, Shield, RotateCcw
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import ReportFilterModal from '../components/ReportFilterModal';
import CameraProcessingFilterModal from '../components/CameraProcessingFilterModal';

import { API_BASE } from '../config';
import PageHeader from '../components/PageHeader';
import { hasPerm } from '../utils/permissions';

const REPORT_TYPES = [
  { id: 'attendance', label: 'Attendance Report' },
  { id: 'break', label: 'Break Report' },
  { id: 'late_arrival', label: 'Late Arrival Report' },
  { id: 'early_departure', label: 'Early Departure Report' },
  { id: 'overtime', label: 'Overtime Report' },
  { id: 'short_hours', label: 'Short Hours Report' },
  { id: 'absent', label: 'Absent Report' },
];

// Helper: get today's date as YYYY-MM-DD
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ATTENDANCE_STATUS_OPTIONS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'on_time', label: 'On Time' },
  { id: 'within_grace', label: 'Within Grace' },
  { id: 'late', label: 'Late' },
  { id: 'absent', label: 'Absent' },
  { id: 'early_arrival', label: 'Early Arrival' },
  { id: 'early_departure', label: 'Early Departure' },
  { id: 'overtime', label: 'Overtime' },
  { id: 'short_hours', label: 'Short Hours' },
];

const BREAK_STATUS_OPTIONS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'STAFFs_with_breaks', label: 'STAFFs With Breaks' },
  { id: 'STAFFs_without_breaks', label: 'STAFFithout Breaks' },
];

// Custom Calendar Date Picker Component matching Events Dashboard Page
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
    onChange(fmt(tempStart || today), fmt(tempEnd || tempStart || today));
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

  const displayLabel = () => {
    const fmtDisplay = (str) => {
      if (!str) return '';
      const p = str.split('-');
      return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].slice(2)}` : str;
    };
    if (!dateFrom && !dateTo) return 'Select Date';
    if (!dateFrom || !dateTo || dateFrom === dateTo) return fmtDisplay(dateFrom || dateTo);
    return `${fmtDisplay(dateFrom)} – ${fmtDisplay(dateTo)}`;
  };

  const _nowStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const isDefaultDate = dateFrom === _nowStr && (!dateTo || dateTo === dateFrom);
  const hasSelection = !isDefaultDate && !!(dateFrom || dateTo);

  return (
    <div style={{ position: 'relative' }} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.45rem',
          padding: '0.5rem 0.75rem', minHeight: '38px',
          background: hasSelection ? 'var(--brand-primary-tint, rgba(0, 110, 179, 0.08))' : '#f8fafc',
          border: hasSelection ? '1px solid var(--brand-primary, #006EB3)' : '1px solid #e2e8f0',
          borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 600,
          color: hasSelection ? 'var(--brand-primary, #006EB3)' : '#1e293b', cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all 0.15s'
        }}
      >
        <Calendar size={14} color={hasSelection ? 'var(--brand-primary, #006EB3)' : '#94a3b8'} />
        {displayLabel()}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 9999,
          background: '#fff', borderRadius: '0.875rem', boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
          border: '1px solid #e2e8f0', padding: '1rem', width: '310px'
        }}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.875rem' }}>
            {[
              { label: 'Today', fn: applyToday },
              { label: 'This Week', fn: applyThisWeek },
              { label: 'This Month', fn: applyThisMonth },
            ].map(({ label, fn }) => (
              <button key={label} type="button" onClick={fn}
                style={{ flex: 1, padding: '0.35rem 0', border: '1px solid rgba(0, 110, 179, 0.25)', borderRadius: '0.375rem', background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.08))', fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)', cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <button type="button" onClick={prevMonth}
              style={{ border: 'none', background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.08))', borderRadius: '0.375rem', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)' }}>‹</button>
            <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#0f172a' }}>
              {monthNames[month]} {year}
            </span>
            <button type="button" onClick={nextMonth}
              style={{ border: 'none', background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.08))', borderRadius: '0.375rem', padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)' }}>›</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: '0.6rem', fontWeight: 700, color: '#94a3b8', textAlign: 'center', marginBottom: 4, textTransform: 'uppercase' }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d}>{d}</span>)}
          </div>

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

export default function ReportsPage({ user, onLogout, onToggleSidebar, onNavigate, sidebarCollapsed }) {
  const [viewMode, setViewMode] = useState('categories');
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [globalActivities, setGlobalActivities] = useState([]);
  const [reportsData, setReportsData] = useState([]);
  const [summaryStats, setSummaryStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [cameras, setCameras] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [expandedStaff, setExpandedStaff] = useState({});
  const [userRole, setUserRole] = useState('admin');

  const [videoModal, setVideoModal] = useState({
    isOpen: false,
    videoUrl: null,
    hasVideo: false,
    timestampSec: 0,
    label: ''
  });
  const videoRef = useRef(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(() => Number(sessionStorage.getItem('reports_per_page')) || 25);
  const [sortBy, setSortBy] = useState('staff_id');
  const [order, setOrder] = useState('asc');

  const [branchFilter, setBranchFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [cameraFilter, setCameraFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportType, setReportType] = useState('attendance');
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCameraReportModalOpen, setIsCameraReportModalOpen] = useState(false);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem('reports_per_page', perPage);
  }, [perPage]);

  // Handle Video Modal Open & Auto Seek
  const openVideoVerification = (videoMeta) => {
    if (!videoMeta || !videoMeta.video_url) {
      setVideoModal({
        isOpen: true,
        videoUrl: null,
        hasVideo: false,
        timestampSec: 0,
        label: 'Attendance Event'
      });
      return;
    }

    const rawUrl = videoMeta.video_url || '';
    const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${API_BASE}${rawUrl}`;

    setVideoModal({
      isOpen: true,
      videoUrl: fullUrl,
      hasVideo: !!videoMeta.has_video,
      timestampSec: videoMeta.timestamp_sec || 0,
      label: videoMeta.label || 'Attendance Event'
    });
  };

  // Auto seek on video player load
  const handleVideoLoaded = () => {
    if (videoRef.current && videoModal.timestampSec) {
      videoRef.current.currentTime = videoModal.timestampSec;
      videoRef.current.play().catch(() => { });
    }
  };

  // Handle Modal Filter Apply
  const handleOpenStaffReportModal = () => {
    setIsFilterModalOpen(true);
  };

  const handleApplyCameraFilters = ({ branch, camera, status }) => {
    setIsCameraReportModalOpen(false);
    sessionStorage.setItem('camera_processing_filter_branch', branch || 'all');
    sessionStorage.setItem('camera_processing_filter_camera', camera || 'all');
    sessionStorage.setItem('camera_processing_filter_status', status || 'all');
    if (onNavigate) {
      onNavigate('camera-reports');
    }
  };

  const handleApplyModalFilters = (filters) => {
    if (filters.branch) setBranchFilter(filters.branch);
    else setBranchFilter('all');

    if (filters.department) setDepartmentFilter(filters.department);
    else setDepartmentFilter('all');

    if (filters.activityType) {
      const actLower = String(filters.activityType).toLowerCase().trim();
      setReportType(actLower.includes('break') ? 'break' : 'attendance');
    }
    if (filters.area) setCameraFilter(filters.area);
    else setCameraFilter('all');

    if (filters.dateFrom) setDateFrom(filters.dateFrom);
    if (filters.dateTo) setDateTo(filters.dateTo);

    setPage(1);
    setViewMode('table');
  };

  // Clear ALL filters handler
  const handleClearAllFilters = () => {
    setBranchFilter('all');
    setDepartmentFilter('all');
    setCameraFilter('all');
    setSearchTerm('');
    setStatusFilter('all');
    const t = todayStr();
    setDateFrom(t);
    setDateTo(t);
    setPage(1);
  };

  // Handle Report Type switching logic & reset incompatible filters
  const handleReportTypeChange = (newType) => {
    const val = (newType && typeof newType === 'object' && 'target' in newType) ? newType.target.value : newType;
    setReportType(val);
    setPage(1);

    const isPrevBreak = (reportType === 'break');
    const isNewBreak = (val === 'break');

    if (isPrevBreak !== isNewBreak) {
      setStatusFilter('all');
    }
  };

  // Get Authorization headers
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return {
      'X-User-Role': userRole,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }, [userRole]);

  // Fetch Metadata
  const fetchMetadata = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const [bRes, dRes, cRes, aRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/branches`, { headers }),
        fetch(`${API_BASE}/api/v1/departments`, { headers }),
        fetch(`${API_BASE}/api/v1/cameras`, { headers }),
        fetch(`${API_BASE}/api/v1/global-activities`, { headers }).catch(() => null),
      ]);
      if (bRes.ok) setBranches(await bRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
      if (cRes.ok) setCameras(await cRes.json());
      if (aRes && aRes.ok) setGlobalActivities(await aRes.json());
    } catch { }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  // Primary REST Data Fetcher with AbortController for Race-Condition safety
  const fetchReports = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page,
        per_page: perPage,
        sort_by: sortBy,
        order,
        report_type: reportType,
        status_filter: statusFilter,
      });

      if (branchFilter !== 'all') params.set('branch_id', branchFilter);
      if (departmentFilter !== 'all') params.set('department', departmentFilter);
      if (cameraFilter !== 'all') params.set('camera_id', cameraFilter);
      if (searchTerm) params.set('search', searchTerm);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await fetch(`${API_BASE}/api/v1/reports/summary?${params}`, {
        signal: controller.signal,
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const result = await res.json();
      setReportsData(result.data || []);
      setSummaryStats(result.summary_stats || null);
      setTotal(result.total || 0);
      setTotalPages(result.total_pages || 1);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('Failed to load report data from server. Please verify backend service.');
        setReportsData([]);
        setSummaryStats(null);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [
    page, perPage, sortBy, order, branchFilter, departmentFilter,
    cameraFilter, searchTerm, reportType, dateFrom, dateTo, statusFilter, getAuthHeaders
  ]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Toggle Accordion row
  const toggleExpand = (staffId) => {
    setExpandedStaff(prev => ({
      ...prev,
      [staffId]: !prev[staffId]
    }));
  };

  // Keyboard accessibility for Accordion
  const handleKeyDownExpand = (e, staffId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleExpand(staffId);
    }
  };

  // Sorting Handler for all 10 fields
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      setOrder(o => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setOrder('asc');
    }
    setPage(1);
  };

  // Excel Export Handler
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const selectedBranchObj = branches.find(b => String(b.id) === String(branchFilter) || b.name === branchFilter);
      const selectedBranchName = selectedBranchObj ? selectedBranchObj.name : (branchFilter === 'all' ? 'All Branches' : branchFilter);

      const selectedDeptObj = departments.find(d => String(d.id) === String(departmentFilter) || d.name === departmentFilter);
      const selectedDeptName = selectedDeptObj ? selectedDeptObj.name : (departmentFilter === 'all' ? 'All Departments' : departmentFilter);

      const res = await fetch(`${API_BASE}/api/v1/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          branch_id: branchFilter,
          branch_name: selectedBranchName,
          department: departmentFilter,
          department_name: selectedDeptName,
          camera_id: cameraFilter,
          search: searchTerm,
          report_type: reportType,
          date_from: dateFrom,
          date_to: dateTo,
          status_filter: statusFilter,
        })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || 'Export generation failed');
      }
      const result = await res.json();
      const downloadPath = result.download_url || `/api/v1/reports/download/${result.filename || 'Attendance_Report.xlsx'}`;
      const downloadUrl = downloadPath.startsWith('http') ? downloadPath : `${API_BASE}${downloadPath}`;
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.setAttribute('download', result.filename || 'Attendance_Report.xlsx');
      a.setAttribute('target', '_blank');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert(`Export Error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // Active status dropdown options
  const activeStatusOptions = (reportType === 'break') ? BREAK_STATUS_OPTIONS : ATTENDANCE_STATUS_OPTIONS;

  // Detect if ANY filter is non-default so we can show "Clear All Filters"
  const _today = todayStr();
  // Date is "active" only if user picked a range or a date different from today
  const isDateActive = dateFrom !== _today || (dateTo && dateTo !== dateFrom);
  const hasActiveFilters =
    branchFilter !== 'all' ||
    departmentFilter !== 'all' ||
    cameraFilter !== 'all' ||
    searchTerm.trim() !== '' ||
    statusFilter !== 'all' ||
    isDateActive;

  // Table Headers supporting 10-field sorting
    const isBreakReport = (reportType === 'break');
  const isRangeReport = Boolean(dateFrom && dateTo && dateFrom !== dateTo);
  const isMultiDateBreak = isBreakReport && isRangeReport;

  const getTableColumns = () => {
    const showBranchFirst = branchFilter === 'all';

    if (isMultiDateBreak) {
      const cols = [
        { key: 'name', label: 'STAFF' },
        { key: 'branch_name', label: 'BRANCH' },
        { key: 'department', label: 'DEPARTMENT' },
        { key: 'break_schedule', label: 'BREAK SCHEDULE' },
        { key: 'working_days', label: 'WORKING DAYS' },
        { key: 'total_break_hours', label: 'TOTAL BREAK HOURS' },
        { key: 'total_break_count', label: 'TOTAL BREAK COUNT' },
        { key: 'total_break_exceeded', label: 'TOTAL BREAK EXCEEDED' },
        { key: 'total_off_window', label: 'TOTAL OFF WINDOW' },
        { key: 'avg_break_hours', label: 'AVG BREAK HOURS' },
        { key: 'avg_break_time', label: 'AVG BREAK TIME' },
        { key: 'longest_break', label: 'LONGEST BREAK' },
        { key: 'shortest_break', label: 'SHORTEST BREAK' },
      ];
      if (showBranchFirst) {
        const branchCol = cols.find(c => c.key === 'branch_name');
        const rest = cols.filter(c => c.key !== 'branch_name');
        return [branchCol, ...rest];
      }
      return cols;
    } else if (isBreakReport) {
      const cols = [
        { key: 'name', label: 'STAFF' },
        { key: 'branch_name', label: 'BRANCH' },
        { key: 'department', label: 'DEPARTMENT' },
        { key: 'break_schedule', label: 'BREAK SCHEDULE' },
        { key: 'total_break_duration', label: 'TOTAL BREAK DURATION' },
        { key: 'total_break_count', label: 'TOTAL BREAK COUNT' },
        { key: 'total_break_exceeded', label: 'TOTAL BREAK EXCEEDED' },
        { key: 'total_off_window', label: 'TOTAL OFF WINDOW' },
      ];
      if (showBranchFirst) {
        const branchCol = cols.find(c => c.key === 'branch_name');
        const rest = cols.filter(c => c.key !== 'branch_name');
        return [branchCol, ...rest];
      }
      return cols;
    } else if (isRangeReport) {
      const cols = [
        { key: 'name', label: 'STAFF' },
        { key: 'branch_name', label: 'BRANCH' },
        { key: 'department', label: 'DEPARTMENT' },
        { key: 'working_days', label: 'WORKING DAYS' },
        { key: 'present_days', label: 'PRESENT DAYS' },
        { key: 'absent_days', label: 'ABSENT DAYS' },
        { key: 'late_days', label: 'LATE DAYS' },
        { key: 'total_break_duration', label: 'TOTAL BREAK DURATION' },
        { key: 'net_work_hours', label: 'NET WORK HOURS' },
        { key: 'early_departure', label: 'TOTAL EARLY DEPARTURE' },
        { key: 'overtime', label: 'TOTAL OVERTIME' },
        { key: 'attendance_pct', label: 'ATTENDANCE %' },
        { key: 'attendance_status', label: 'STATUS' },
      ];
      if (showBranchFirst) {
        const branchCol = cols.find(c => c.key === 'branch_name');
        const rest = cols.filter(c => c.key !== 'branch_name');
        return [branchCol, ...rest];
      }
      return cols;
    } else {
      const cols = [
        { key: 'name', label: 'STAFF' },
        { key: 'branch_name', label: 'BRANCH' },
        { key: 'department', label: 'DEPARTMENT' },
        { key: 'shift', label: 'SHIFT' },
        { key: 'attendance_status', label: 'STATUS' },
        { key: 'check_in', label: 'CHECK-IN' },
        { key: 'check_out', label: 'CHECK-OUT' },
        { key: 'office_hours', label: 'OFFICE HOURS' },
        { key: 'total_break_duration', label: 'TOTAL BREAK HOURS' },
        { key: 'net_work_hours', label: 'NET WORKING HOURS' },
        { key: 'late_by', label: 'LATE BY' },
        { key: 'early_departure_by', label: 'EARLY DEPARTURE' },
        { key: 'overtime', label: 'OVERTIME' },
      ];
      if (showBranchFirst) {
        const branchCol = cols.find(c => c.key === 'branch_name');
        const rest = cols.filter(c => c.key !== 'branch_name');
        return [branchCol, ...rest];
      }
      return cols;
    }
  };

  // Helper to format 12-hour AM/PM time
  const formatTime12 = (t) => {
    if (!t) return '';
    if (t.includes('AM') || t.includes('PM')) return t;
    const parts = t.split(':');
    if (parts.length < 2) return t;
    const hn = parseInt(parts[0], 10);
    const m = parts[1];
    if (isNaN(hn)) return t;
    const ampm = hn >= 12 ? 'PM' : 'AM';
    const h12 = hn % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${m} ${ampm}`;
  };

  // Helper to get formatted department break timing
  const getDepartmentBreakSchedule = (row) => {
    const start = formatTime12(row?.allocated_break_window?.split('-')?.[0]?.trim() || row?.department_break_start || '01:00 PM');
    const end = formatTime12(row?.allocated_break_window?.split('-')?.[1]?.trim() || row?.department_break_end || '02:00 PM');
    return `${start} - ${end}`;
  };

  // Helper to render break schedule badge cell
  const renderBreakScheduleCell = (row) => {
    return (
      <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', verticalAlign: 'middle', minWidth: 160 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            color: '#334155',
            fontFamily: 'monospace',
            fontSize: '0.8125rem',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
          title={`Official Policy Break Window: ${getDepartmentBreakSchedule(row)}`}
        >
          <Coffee size={13} color="#b45309" />
          {getDepartmentBreakSchedule(row)}
        </span>
      </td>
    );
  };

  // Helper to get formatted department shift timing
  const getDepartmentAttendanceSchedule = (row) => {
    const start = formatTime12(row?.shift?.split('-')?.[0]?.trim() || row?.department_shift_start || '09:00 AM');
    const end = formatTime12(row?.shift?.split('-')?.[1]?.trim() || row?.department_shift_end || '05:00 PM');
    return `${start} - ${end}`;
  };

  // Helper to render attendance shift schedule badge cell
  const renderAttendanceScheduleCell = (row) => {
    return (
      <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', verticalAlign: 'middle', minWidth: 160 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.35rem',
            color: '#334155',
            fontFamily: 'monospace',
            fontSize: '0.8125rem',
            fontWeight: 600,
            whiteSpace: 'nowrap'
          }}
          title={`Official Shift Schedule: ${getDepartmentAttendanceSchedule(row)}`}
        >
          <Clock size={13} color="#10b981" />
          {getDepartmentAttendanceSchedule(row)}
        </span>
      </td>
    );
  };

  // Helper to render break exceeded count cell in main row
  const renderBreakExceededCell = (row) => {
    const count = row?.excess_break_count !== undefined ? Number(row.excess_break_count) : 0;
    const isExceeded = count > 0;

    return (
      <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', verticalAlign: 'middle', minWidth: 120 }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: isExceeded ? '#dc2626' : '#64748b',
          }}
          title={isExceeded ? `${count} break session(s) exceeded policy limit (Total: ${row?.total_break_exceeded || '00 mins'})` : '0 breaks exceeded policy limit'}
        >
          {count}
        </span>
      </td>
    );
  };

  // Helper to render total off window count cell in main row
  const renderOffWindowCell = (row) => {
    const count = row?.total_off_window !== undefined ? Number(row.total_off_window) : 0;
    const isOff = count > 0;

    return (
      <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', verticalAlign: 'middle', minWidth: 120 }}>
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: isOff ? '#dc2626' : '#64748b',
          }}
          title={isOff ? `${count} break session(s) taken outside policy window` : 'All breaks within scheduled window (0 Off-Window)'}
        >
          {count}
        </span>
      </td>
    );
  };

  // Combined Dynamic Activities / Report Types List (Clean Names without "Report")
  const dynamicReportTypes = useMemo(() => {
    const list = [
      { id: 'attendance', label: 'Attendance' },
      { id: 'break', label: 'Break' },
    ];
    const seenLabels = new Set(list.map(item => item.label.toLowerCase()));
    (globalActivities || []).forEach(g => {
      const gName = (g.name || '').replace(/\s+/g, ' ').trim();
      if (!gName) return;
      const key = gName.toLowerCase();
      if (seenLabels.has(key)) return;
      seenLabels.add(key);
      list.push({ id: key, label: gName });
    });
    return list;
  }, [globalActivities]);

  const columns = getTableColumns();

  return (
    <div className="bm-page" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      <style>{`
        .epic-reports-container {
          padding: 0;
          flex: 1;
          width: 100%;
          font-family: inherit;
          color: var(--text-main-premium, #0f172a);
        }
        .dark-theme .epic-reports-container {
          color: var(--text-main, #f8fafc);
        }

        .epic-breadcrumb-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .epic-breadcrumb-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .epic-breadcrumb-title {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-main-premium, #0f172a);
        }
        .dark-theme .epic-breadcrumb-title {
          color: var(--text-main, #f8fafc);
        }
        .epic-breadcrumb-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.25rem 0.625rem;
          border-radius: 1rem;
          background: #ecfdf5;
          color: #059669;
          font-size: 0.7rem;
          font-weight: 700;
          border: 1px solid #a7f3d0;
        }
        .dark-theme .epic-breadcrumb-badge {
          background: rgba(16, 185, 129, 0.15);
          border-color: rgba(16, 185, 129, 0.25);
          color: #34d399;
        }

        /* Toolbar */
        .epic-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .epic-filters-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          flex-wrap: wrap;
        }
        .epic-search-wrapper {
          position: relative;
          flex: 1;
          max-width: 280px;
          min-width: 180px;
        }
        .epic-search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }
        .epic-search-input {
          width: 100%;
          padding: 0.55rem 0.75rem 0.55rem 2.2rem;
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 0.75rem;
          font-size: 0.85rem;
          background: var(--bg-card-premium, #fff);
          color: var(--text-main-premium, #0f172a);
          outline: none;
          text-align: left;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .epic-search-input:focus {
          border-color: var(--brand-primary, #006EB3);
        }
        .dark-theme .epic-search-input {
          background: rgba(30, 41, 59, 0.5);
          border-color: var(--border-card, rgba(255, 255, 255, 0.08));
          color: var(--text-main, #f8fafc);
        }

        .epic-actions-group {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
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
          background: var(--brand-primary-hover, #005994);
          box-shadow: 0 4px 12px rgba(0, 110, 179, 0.25);
        }
        .epic-btn-secondary {
          background: var(--bg-btn-premium, #f1f5f9);
          color: var(--text-subtle-premium, #475569);
          border: 1px solid var(--border-premium, #e2e8f0);
        }
        .epic-btn-secondary:hover {
          background: var(--border-premium, #e2e8f0);
        }
        .dark-theme .epic-btn-secondary {
          background: rgba(30, 41, 59, 0.5);
          border-color: var(--border-card, rgba(255, 255, 255, 0.08));
          color: var(--text-main, #f8fafc);
        }
        .epic-btn-danger-outline {
          background: #fff7ed;
          color: #ea580c;
          border: 1px solid #fed7aa;
          font-size: 0.8rem;
        }
        .epic-btn-danger-outline:hover {
          background: #fef3c7;
        }
        .dark-theme .epic-btn-danger-outline {
          background: rgba(234, 88, 12, 0.1);
          border-color: rgba(234, 88, 12, 0.25);
        }
        .epic-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Date Picker Trigger */
        .epic-date-trigger {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 0.75rem;
          font-size: 0.875rem;
          background: var(--bg-card-premium, #fff);
          color: var(--text-main-premium, #0f172a);
          cursor: pointer;
          white-space: nowrap;
          min-width: 150px;
        }
        .epic-date-trigger--active {
          border-color: #3b82f6;
          background: #eff6ff;
          color: #1d4ed8;
        }
        .dark-theme .epic-date-trigger {
          background: rgba(30, 41, 59, 0.5);
          border-color: var(--border-card, rgba(255, 255, 255, 0.08));
          color: var(--text-main, #f8fafc);
        }

        /* Alert */
        .epic-alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-radius: 0.75rem;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
          line-height: 1.5;
        }
        .epic-alert-error {
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: #991b1b;
        }
        .dark-theme .epic-alert-error {
          background: rgba(239, 68, 68, 0.12);
          border-color: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>

      <PageHeader title="Reports" icon={FileText} onToggleSidebar={onToggleSidebar} user={user} onLogout={onLogout} onNavigate={onNavigate} sidebarCollapsed={sidebarCollapsed} />

      <div className="epic-reports-container">
        {viewMode === 'categories' ? (
          <div style={{ padding: '0.5rem 0 2rem 0' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.5rem' }}>
              Select a report category to continue.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {/* Card 1: Staff Activity Reports */}
              <div
                onClick={handleOpenStaffReportModal}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '1.25rem',
                  padding: '1.75rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '170px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--brand-primary, #006EB3)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 110, 179, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                }}
              >
                <div>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '0.75rem',
                    background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))',
                    color: 'var(--brand-primary, #006EB3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}>
                    <Users size={22} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                    Staff Activity Reports
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                    Attendance, break time, late arrivals, overtime, and shift compliance reports for all staff.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.825rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)', marginTop: '1.25rem' }}>
                  <span>Select</span>
                  <ChevronRight size={16} />
                </div>
              </div>

              {/* Card 2: Camera Processing Reports */}
              <div
                onClick={() => setIsCameraReportModalOpen(true)}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '1.25rem',
                  padding: '1.75rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '170px'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--brand-primary, #006EB3)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 110, 179, 0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                }}
              >
                <div>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '0.75rem',
                    background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))',
                    color: 'var(--brand-primary, #006EB3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}>
                    <Camera size={22} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                    Camera Processing Reports
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
                    Video pipeline processing stats, recognition accuracy, and camera-level event summaries.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.825rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)', marginTop: '1.25rem' }}>
                  <span>Select</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Top Bar with Back Button and Single Export Excel */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setViewMode('categories')}
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
                  cursor: 'pointer'
                }}
              >
                &larr; Back to Categories
              </button>

              {hasPerm(user, 'export_reports') && (
                <button className="epic-btn epic-btn-primary" onClick={handleExportExcel} disabled={exporting}>
                  <FileSpreadsheet size={16} />
                  {exporting ? 'Exporting...' : 'Export Excel'}
                </button>
              )}
            </div>

        {/* API Error Alert ── */}
        {error && (
          <div className="epic-alert epic-alert-error">
            <AlertCircle size={20} />
            <span style={{ flex: 1, fontWeight: 500 }}>{error}</span>
            <button className="epic-btn epic-btn-secondary" onClick={fetchReports} style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
              Retry
            </button>
          </div>
        )}

        {/* ── Filter Toolbar (Matching Roles & Permissions page design) ── */}
        <div className="epic-toolbar">
          <div className="epic-filters-group">
            {/* 1. Search */}
            <div className="epic-search-wrapper">
              <Search size={16} className="epic-search-icon" />
              <input
                type="text"
                className="epic-search-input"
                placeholder="Search staff by name or ID..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>

            {/* 2. Branch Filter */}
            <CustomSelect
              value={branchFilter}
              onChange={(e) => {
                const val = (e && typeof e === 'object' && 'target' in e) ? e.target.value : e;
                setBranchFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Branches' },
                ...branches.map(b => ({ value: String(b.id), label: b.name }))
              ]}
              style={{ minWidth: 150 }}
            />

            {/* 3. Activity Filter */}
            <CustomSelect
              value={reportType}
              onChange={(e) => {
                const val = (e && typeof e === 'object' && 'target' in e) ? e.target.value : e;
                handleReportTypeChange(val);
              }}
              options={dynamicReportTypes.map(rt => ({ value: rt.id, label: rt.label }))}
              style={{ minWidth: 140 }}
            />

            {/* 4. Department Filter */}
            <CustomSelect
              value={departmentFilter}
              onChange={(e) => {
                const val = (e && typeof e === 'object' && 'target' in e) ? e.target.value : e;
                setDepartmentFilter(val);
                setPage(1);
              }}
              options={[
                { value: 'all', label: 'Departments' },
                ...departments.map(d => ({ value: d.name, label: d.name }))
              ]}
              style={{ minWidth: 150 }}
            />

            {/* 5. Date Range Picker */}
            <CustomDatePicker
              dateFrom={dateFrom}
              dateTo={dateTo}
              onChange={(start, end) => {
                setDateFrom(start || todayStr());
                setDateTo(end || todayStr());
                setPage(1);
              }}
            />

            {/* 6. Clear All Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#10b981',
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
        </div>

        {/* ── Enterprise Break Report Top Summary Cards ── */}
        {isMultiDateBreak && summaryStats && (
          <div style={{ background: '#fffef3', border: '1px solid #fef08a', borderRadius: '0.875rem', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 2px 4px rgba(217,119,6,0.05)' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Coffee size={16} /> ENTERPRISE BREAK REPORT SUMMARY — {summaryStats.report_period.toUpperCase()} ({summaryStats.branch})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.875rem' }}>
              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.875rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600 }}>TOTAL STAFFS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#92400e', marginTop: 2 }}>{summaryStats.total_STAFFs}</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.875rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600 }}>WITH BREAKS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: 2 }}>{summaryStats.STAFFs_with_breaks}</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.875rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>WITHOUT BREAKS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626', marginTop: 2 }}>{summaryStats.STAFFs_without_breaks}</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.875rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#1d4ed8', fontWeight: 600 }}>TOTAL BREAKS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563eb', marginTop: 2 }}>{summaryStats.total_breaks}</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.875rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600 }}>TOTAL BREAK HOURS</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>{summaryStats.total_break_hours}</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.875rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600 }}>AVG BREAK HRS / DAY</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400e', marginTop: 4 }}>{summaryStats.avg_break_hours_per_day}</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.875rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#78350f', fontWeight: 600 }}>AVG BREAKS / DAY</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#92400e', marginTop: 4 }}>{summaryStats.avg_break_count_per_day}</div>
              </div>

              <div style={{ background: '#fff', border: '1px solid #fde68a', borderRadius: '0.625rem', padding: '0.875rem' }}>
                <div style={{ fontSize: '0.72rem', color: '#047857', fontWeight: 600 }}>LONGEST / SHORTEST</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginTop: 4 }}>
                  <span style={{ color: '#dc2626' }}>{summaryStats.longest_break}</span> / <span style={{ color: '#059669' }}>{summaryStats.shortest_break}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Main Master-Detail Report Container ── */}
        <div style={{ background: '#fff', borderRadius: '0.875rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>

          {/* Table Overflow Wrapper for Responsive Layout */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>

              {/* ── Table Header supporting 10-Field Sorting ── */}
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', fontSize: '0.72rem', fontWeight: 800, color: '#475569', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  <th style={{ padding: '1rem 0.875rem', width: 44 }}></th>

                  {columns.map(col => {
                    const isSorted = sortBy === col.key;
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        style={{ padding: '1rem 0.875rem', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: isSorted ? '#2563eb' : '#475569' }}>
                          {col.label}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* ── Table Body ── */}
              <tbody>

                {/* 1. Loading Skeleton State */}
                {loading ? (
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td colSpan={columns.length + 1} style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ height: 20, background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)', borderRadius: 4, animation: 'shimmer 1.5s infinite' }} />
                      </td>
                    </tr>
                  ))
                ) :

                  /* 2. Empty State (No Data) */
                  reportsData.length === 0 ? (
                    <tr>
                      <td colSpan={columns.length + 1} style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b' }}>
                        <Calendar size={44} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: '#334155' }}>No report records found</div>
                        <div style={{ fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.25rem' }}>Try adjusting your universal filters or date range parameters.</div>
                      </td>
                    </tr>
                  ) :

                    /* 3. Data Rows with Interactive Video Verification Links */
                    (
                      reportsData.map((row, i) => {
                        const isExpanded = !!expandedStaff[row.staff_id];
                        const detailRegionId = `detail-region-${row.staff_id}`;

                        return (
                          <React.Fragment key={row.staff_id || i}>

                            {/* ── Master Row ── */}
                            <tr
                              onClick={() => toggleExpand(row.staff_id)}
                              onKeyDown={(e) => handleKeyDownExpand(e, row.staff_id)}
                              tabIndex={0}
                              role="button"
                              aria-expanded={isExpanded}
                              aria-controls={detailRegionId}
                              style={{
                                borderBottom: isExpanded ? 'none' : '1px solid #e2e8f0',
                                background: isExpanded ? '#f0f9ff' : (i % 2 === 0 ? '#fff' : '#fafafa'),
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                                outline: 'none'
                              }}
                            >
                              {/* Expand Icon */}
                              <td style={{ padding: '0.875rem', textAlign: 'center', color: '#3b82f6' }}>
                                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                              </td>

                              {/* Branch (First Column if branchFilter === 'all') */}
                              {branchFilter === 'all' && (
                                <td style={{ padding: '0.875rem', color: '#475569', fontWeight: 500 }}>
                                  {row.branch_name}
                                </td>
                              )}

                              {/* STAFF (ID + Name Combined - Stacked Top/Bottom) */}
                              <td style={{ padding: '0.875rem', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', alignItems: 'flex-start' }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem', lineHeight: '1.25', whiteSpace: 'nowrap' }}>
                                    {row.name}
                                  </span>
                                  <span style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: '#64748b',
                                    lineHeight: '1.2',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {row.staff_id}
                                  </span>
                                </div>
                              </td>

                              {/* Branch (Original Column if branchFilter !== 'all') */}
                              {branchFilter !== 'all' && (
                                <td style={{ padding: '0.875rem', color: '#475569', fontWeight: 500 }}>
                                  {row.branch_name}
                                </td>
                              )}

                              {/* DYNAMIC METRIC COLUMNS WITH CLICKABLE VIDEO LINKS */}
                              {isMultiDateBreak ? (
                                <>
                                  <td style={{ padding: '0.875rem', color: '#475569', fontWeight: 500, verticalAlign: 'middle' }}>{row.department || '—'}</td>
                                  {renderBreakScheduleCell(row)}
                                  <td style={{ padding: '0.875rem', color: '#334155', fontWeight: 600 }}>{row.working_days || 0} days</td>
                                  <td style={{ padding: '0.875rem', color: '#b45309', fontWeight: 700 }}>{row.total_break_hours || '00 hrs 00 mins'}</td>
                                  <td style={{ padding: '0.875rem', color: '#2563eb', fontWeight: 700 }}>{row.total_break_count || 0}</td>
                                  {renderBreakExceededCell(row)}
                                  {renderOffWindowCell(row)}
                                  <td style={{ padding: '0.875rem', color: '#334155', fontWeight: 600 }}>{row.avg_break_hours || '00 hrs 00 mins'}</td>
                                  <td style={{ padding: '0.875rem', color: '#334155', fontWeight: 600 }}>{row.avg_break_time || '00 mins'}</td>
                                  <td style={{ padding: '0.875rem', color: '#dc2626', fontWeight: 700 }}>{row.longest_break || '00 mins'}</td>
                                  <td style={{ padding: '0.875rem', color: '#059669', fontWeight: 700 }}>{row.shortest_break || '00 mins'}</td>
                                </>
                              ) : isBreakReport ? (
                                <>
                                  <td style={{ padding: '0.875rem', color: '#475569', fontWeight: 500, verticalAlign: 'middle' }}>{row.department}</td>
                                  {renderBreakScheduleCell(row)}
                                  <td style={{ padding: '0.875rem', color: '#b45309', fontWeight: 700, verticalAlign: 'middle' }}>{row.total_break_duration || '00 mins'}</td>
                                  <td style={{ padding: '0.875rem', color: '#2563eb', fontWeight: 700, verticalAlign: 'middle' }}>{row.total_break_count || 0}</td>
                                  {renderBreakExceededCell(row)}
                                  {renderOffWindowCell(row)}
                                </>
                              ) : (
                                <>
                                  <td style={{ padding: '0.875rem', color: '#475569', fontWeight: 500, verticalAlign: 'middle' }}>{row.department}</td>
                                  {renderAttendanceScheduleCell(row)}
                                  <td style={{ padding: '0.875rem', verticalAlign: 'middle' }}>
                                    {(() => {
                                      const st = row.attendance_status;
                                      let dotColor = '#10b981', textColor = '#059669';
                                      if (st === 'On Time' || st === 'Present') { dotColor = '#10b981'; textColor = '#059669'; }
                                      else if (st === 'Early Arrival') { dotColor = '#06b6d4'; textColor = '#0891b2'; }
                                      else if (st === 'Late') { dotColor = '#f59e0b'; textColor = '#d97706'; }
                                      else if (st === 'Within Grace') { dotColor = '#eab308'; textColor = '#ca8a04'; }
                                      else if (st === 'Absent') { dotColor = '#ef4444'; textColor = '#dc2626'; }
                                      else if (st === 'Early Departure') { dotColor = '#f97316'; textColor = '#ea580c'; }
                                      else if (st === 'Overtime') { dotColor = '#8b5cf6'; textColor = '#7c3aed'; }
                                      else if (st === 'Short Hours' || st === 'Missing Check-Out') { dotColor = '#f43f5e'; textColor = '#e11d48'; }
                                      return (
                                        <span style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.4rem',
                                          fontSize: '0.8125rem',
                                          fontWeight: 600,
                                          color: textColor,
                                          whiteSpace: 'nowrap'
                                        }}>
                                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                                          {st}
                                        </span>
                                      );
                                    })()}
                                  </td>

                                  {/* Clickable Check-In Video Link */}
                                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', verticalAlign: 'middle', width: 140, minWidth: 130 }}>
                                    {row.check_in && row.check_in !== '—' ? (
                                      <span
                                        onClick={(e) => {
                                          if (row.check_in_video) {
                                            e.stopPropagation();
                                            openVideoVerification(row.check_in_video);
                                          }
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '0.35rem',
                                          color: row.check_in_video ? '#2563eb' : '#334155',
                                          fontFamily: 'monospace',
                                          fontSize: '0.8125rem',
                                          fontWeight: 600,
                                          cursor: row.check_in_video ? 'pointer' : 'default',
                                        }}
                                        title={row.check_in_video ? 'Click to play verification video' : ''}
                                      >
                                        {row.check_in_video && <Video size={13} color="#2563eb" />}
                                        {row.check_in}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontFamily: 'monospace', display: 'inline-block', width: '100%', textAlign: 'center' }}>—</span>
                                    )}
                                  </td>

                                  {/* Clickable Check-Out Video Link */}
                                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', verticalAlign: 'middle', width: 140, minWidth: 130 }}>
                                    {row.check_out && row.check_out !== '—' && row.check_out !== '-' ? (
                                      <span
                                        onClick={(e) => {
                                          if (row.check_out_video) {
                                            e.stopPropagation();
                                            openVideoVerification(row.check_out_video);
                                          }
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '0.35rem',
                                          color: row.check_out_video ? '#2563eb' : '#334155',
                                          fontFamily: 'monospace',
                                          fontSize: '0.8125rem',
                                          fontWeight: 600,
                                          cursor: row.check_out_video ? 'pointer' : 'default',
                                        }}
                                        title={row.check_out_video ? 'Click to play verification video' : ''}
                                      >
                                        {row.check_out_video && <Video size={13} color="#2563eb" />}
                                        {row.check_out}
                                      </span>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontFamily: 'monospace', display: 'inline-block', width: '100%', textAlign: 'center' }}>-</span>
                                    )}
                                  </td>

                                  {/* Office Hours */}
                                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', color: '#475569', fontWeight: 600, verticalAlign: 'middle', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                                    {row.today_office_hours || row.office_hours || '00 hrs 00 mins'}
                                  </td>

                                  {/* Total Break Hours */}
                                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', color: '#b45309', fontWeight: 700, verticalAlign: 'middle', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                                    {row.total_break_hours || row.total_break_duration || '00 hrs 00 mins'}
                                  </td>

                                  {/* Net Working Hours */}
                                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', color: '#059669', fontWeight: 700, verticalAlign: 'middle', fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                                    {row.net_work_hours || '00 hrs 00 mins'}
                                  </td>

                                  {/* Late By */}
                                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                                    {(() => {
                                      const lateVal = row.late_by || '00 hrs 00 mins';
                                      const hasLate = lateVal && lateVal !== '00 hrs 00 mins' && lateVal !== '00 mins' && !lateVal.startsWith('00 hrs 00 mins') && !lateVal.startsWith('0 mins');
                                      return hasLate ? (
                                        <span style={{
                                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                          padding: '0.2rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 700,
                                          background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5'
                                        }}>
                                          {lateVal}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>00 hrs 00 mins</span>
                                      );
                                    })()}
                                  </td>

                                  {/* Early Departure Metric Cell */}
                                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                                    {(() => {
                                      const edVal = row.early_departure_by || (isRangeReport && row.early_departure_days !== undefined ? `${row.early_departure_days} days` : '00 hrs 00 mins');
                                      const hasEarly = edVal && edVal !== '00 hrs 00 mins' && edVal !== '00 mins' && edVal !== '0 days' && !edVal.startsWith('00 hrs 00 mins') && !edVal.startsWith('0 mins');
                                      return hasEarly ? (
                                        <span style={{
                                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                          padding: '0.2rem 0.5rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 700,
                                          background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a'
                                        }}>
                                          {edVal}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontFamily: 'monospace' }}>00 hrs 00 mins</span>
                                      );
                                    })()}
                                  </td>

                                  {/* Overtime */}
                                  <td style={{ padding: '0.875rem 0.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                                    {(() => {
                                      const otVal = row.overtime || '00 hrs 00 mins';
                                      const hasOt = otVal && otVal !== '00 hrs 00 mins' && otVal !== '00 mins' && !otVal.startsWith('00 hrs 00 mins') && !otVal.startsWith('0 mins');
                                      return hasOt ? (
                                        <span style={{
                                          fontSize: '0.8125rem', fontWeight: 700,
                                          color: '#7c3aed', fontFamily: 'monospace'
                                        }}>
                                          {otVal}
                                        </span>
                                      ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '0.8125rem', fontFamily: 'monospace' }}>00 hrs 00 mins</span>
                                      );
                                    })()}
                                  </td>
                                </>
                              )}
                            </tr>

                            {/* ── Expanded Detail Accordion Section ── */}
                            {isExpanded && (
                              <tr id={detailRegionId} style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <td colSpan={columns.length + 1} style={{ padding: '1rem 1.5rem' }}>

                                  {/* CASE A: ATTENDANCE REPORT ACCORDION */}
                                  {!isBreakReport ? (
                                    <div>
                                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Clock3 size={14} /> DETAILED ATTENDANCE METRICS FOR {row.name.toUpperCase()}
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: '#fff', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', marginBottom: row.all_attendance_events?.length ? '0.75rem' : 0 }}>
                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Attendance Schedule</div>
                                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                                            <Clock size={14} color="#2563eb" />
                                            {getDepartmentAttendanceSchedule(row)}
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Recorded Check-In</div>
                                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#059669', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                            {row.check_in || '—'}
                                            {row.check_in && row.check_in !== '—' && row.check_in_video && (
                                              <button
                                                onClick={() => openVideoVerification(row.check_in_video)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '0.2rem 0.45rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                                                title="Play Check-In verification video"
                                              >
                                                <Video size={12} /> Play Video
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Recorded Check-Out</div>
                                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                                            {row.check_out || '—'}
                                            {row.check_out && row.check_out !== '—' && row.check_out_video && (
                                              <button
                                                onClick={() => openVideoVerification(row.check_out_video)}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.2rem 0.45rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.75rem' }}
                                                title="Play Check-Out verification video"
                                              >
                                                <Video size={12} /> Play Video
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Punctuality Status</div>
                                          <div style={{ fontSize: '0.875rem', fontWeight: 700, color: row.attendance_status === 'Late' ? '#dc2626' : (row.attendance_status === 'Early Departure' ? '#d97706' : '#059669'), display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                                            <span>{row.attendance_status}</span>
                                            {row.early_arrival_by && row.early_arrival_by !== '00 hrs 00 mins' && row.early_arrival_by !== '00 mins' && (
                                              <span style={{ fontSize: '0.72rem', background: '#cffafe', color: '#0e7490', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                                                Early by {row.early_arrival_by}
                                              </span>
                                            )}
                                            {row.late_by && row.late_by !== '00 hrs 00 mins' && row.late_by !== '00 mins' && (
                                              <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#b91c1c', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                                                Late by {row.late_by}
                                              </span>
                                            )}
                                            {row.early_departure_by && row.early_departure_by !== '00 hrs 00 mins' && row.early_departure_by !== '00 mins' && (
                                              <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                                                Left early by {row.early_departure_by}
                                              </span>
                                            )}
                                            {row.overtime && row.overtime !== '00 hrs 00 mins' && row.overtime !== '00 mins' && (
                                              <span style={{ fontSize: '0.72rem', background: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.4rem', borderRadius: '0.25rem', fontWeight: 600 }}>
                                                +{row.overtime} OT
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* All Gate Events History Table */}
                                      {row.all_attendance_events && row.all_attendance_events.length > 0 && (
                                        <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                          <div style={{ padding: '0.5rem 0.75rem', background: '#eff6ff', borderBottom: '1px solid #dbeafe', fontSize: '0.75rem', fontWeight: 700, color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <Camera size={13} /> ALL GATE CAMERA DETECTIONS ({row.all_attendance_events.length} Events Recorded)
                                          </div>
                                          <table style={{ width: '100%', fontSize: '0.78rem', textTransform: 'none' }}>
                                            <thead>
                                              <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontWeight: 700 }}>
                                                <th style={{ padding: '0.45rem 0.75rem' }}>EVENT #</th>
                                                <th style={{ padding: '0.45rem 0.75rem' }}>TIME</th>
                                                <th style={{ padding: '0.45rem 0.75rem' }}>ACTION / ROLE</th>
                                                <th style={{ padding: '0.45rem 0.75rem' }}>LOCATION</th>
                                                <th style={{ padding: '0.45rem 0.75rem' }}>TRACK ID</th>
                                                <th style={{ padding: '0.45rem 0.75rem' }}>VERIFICATION</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {row.all_attendance_events.map((gev, gIdx) => (
                                                <tr key={gIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                  <td style={{ padding: '0.45rem 0.75rem', fontFamily: 'monospace', color: '#64748b' }}>#{gIdx + 1}</td>
                                                  <td style={{ padding: '0.45rem 0.75rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>{gev.time}</td>
                                                  <td style={{ padding: '0.45rem 0.75rem' }}>
                                                    <span style={{
                                                      padding: '0.15rem 0.45rem',
                                                      borderRadius: '0.25rem',
                                                      fontSize: '0.72rem',
                                                      fontWeight: 700,
                                                      background: gev.event_type === 'Check In' ? '#ecfdf5' : '#eff6ff',
                                                      color: gev.event_type === 'Check In' ? '#059669' : '#2563eb',
                                                      border: `1px solid ${gev.event_type === 'Check In' ? '#a7f3d0' : '#bfdbfe'}`
                                                    }}>
                                                      {gev.event_type}
                                                    </span>
                                                  </td>
                                                  <td style={{ padding: '0.45rem 0.75rem', color: '#475569' }}>{gev.sub_location || gev.camera_name || 'Main Gate'}</td>
                                                  <td style={{ padding: '0.45rem 0.75rem', fontFamily: 'monospace', color: '#64748b' }}>{gev.track_id}</td>
                                                  <td style={{ padding: '0.45rem 0.75rem' }}>
                                                    {gev.video_meta ? (
                                                      <button
                                                        onClick={() => openVideoVerification(gev.video_meta)}
                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '0.2rem 0.45rem', borderRadius: '0.375rem', cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem' }}
                                                      >
                                                        <Video size={11} /> Play Frame
                                                      </button>
                                                    ) : (
                                                      <span style={{ color: '#94a3b8' }}>—</span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  ) : (

                                    /* CASE B: BREAK REPORT ACCORDION */
                                    <div>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#d97706', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                          <Clock3 size={14} /> DETAILED BREAK LOGS FOR {row.name.toUpperCase()} ({row.break_sessions?.length || 0} Sessions)
                                        </div>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '0.375rem' }}>
                                          <Coffee size={13} color="#b45309" />
                                          Policy Window: {getDepartmentBreakSchedule(row)}
                                        </div>
                                      </div>

                                      {(!row.break_sessions || row.break_sessions.length === 0) ? (
                                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                                          No break session records found for this STAFF in selected timeframe.
                                        </div>
                                      ) : (
                                        <div style={{ background: '#fff', borderRadius: '0.5rem', border: '1px solid #e2e8f0', overflow: 'hidden', maxHeight: '280px', overflowY: 'auto' }}>
                                          <table style={{ width: '100%', fontSize: '0.78rem', textTransform: 'none' }}>
                                            <thead>
                                              <tr style={{ background: '#fef3c7', color: '#92400e', borderBottom: '1px solid #fcd34d', textAlign: 'left', fontWeight: 700, position: 'sticky', top: 0, zIndex: 1 }}>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>DATE</th>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>BREAK #</th>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>LOCATION / CAFETERIA</th>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>BREAK IN</th>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>BREAK OUT</th>
                                                <th style={{ padding: '0.5rem 0.75rem' }}>BREAK DURATION</th>
                                                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>BREAK EXCEEDED</th>
                                                <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>OFF WINDOW</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {row.break_sessions.map((bs, bIdx) => (
                                                <tr key={bIdx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                  <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: '#334155' }}>{bs.date || '—'}</td>
                                                  <td style={{ padding: '0.5rem 0.75rem', fontFamily: 'monospace', color: '#64748b' }}>#{bs.break_num || (bIdx + 1)}</td>
                                                  <td style={{ padding: '0.5rem 0.75rem', color: '#334155', fontWeight: 600 }}>{bs.sub_location || 'Rooftop Cafeteria'}</td>

                                                  {/* Clickable Break In Video Link */}
                                                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>
                                                    {bs.breakin && bs.breakin !== '—' ? (
                                                      <span
                                                        onClick={(e) => {
                                                          if (bs.break_in_video) {
                                                            e.stopPropagation();
                                                            openVideoVerification(bs.break_in_video);
                                                          }
                                                        }}
                                                        style={{
                                                          display: 'inline-flex',
                                                          alignItems: 'center',
                                                          gap: '0.25rem',
                                                          color: bs.break_in_video ? '#2563eb' : '#334155',
                                                          fontFamily: 'monospace',
                                                          fontWeight: 600,
                                                          textDecoration: bs.break_in_video ? 'underline' : 'none',
                                                          cursor: bs.break_in_video ? 'pointer' : 'default'
                                                        }}
                                                      >
                                                        {bs.break_in_video && <Video size={12} />}
                                                        {bs.breakin}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>—</span>
                                                    )}
                                                  </td>

                                                  {/* Clickable Break Out Video Link */}
                                                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>
                                                    {bs.breakout && bs.breakout !== '—' ? (
                                                      <span
                                                        onClick={(e) => {
                                                          if (bs.break_out_video) {
                                                            e.stopPropagation();
                                                            openVideoVerification(bs.break_out_video);
                                                          }
                                                        }}
                                                        style={{
                                                          display: 'inline-flex',
                                                          alignItems: 'center',
                                                          gap: '0.25rem',
                                                          color: bs.break_out_video ? '#2563eb' : '#334155',
                                                          fontFamily: 'monospace',
                                                          fontWeight: 600,
                                                          textDecoration: bs.break_out_video ? 'underline' : 'none',
                                                          cursor: bs.break_out_video ? 'pointer' : 'default'
                                                        }}
                                                      >
                                                        {bs.break_out_video && <Video size={12} />}
                                                        {bs.breakout}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>—</span>
                                                    )}
                                                  </td>

                                                  <td style={{ padding: '0.5rem 0.75rem', color: '#d97706', fontWeight: 700 }}>{bs.duration}</td>
                                                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                                    {(bs.excess_mins > 0 || (bs.excess_duration && bs.excess_duration !== '00 mins')) ? (
                                                      <span style={{ display: 'inline-block', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.15rem 0.45rem', borderRadius: '0.25rem', fontWeight: 700, fontFamily: 'monospace' }}>
                                                        {bs.excess_duration || `+${bs.excess_mins} mins`}
                                                      </span>
                                                    ) : (
                                                      <span style={{ color: '#16a34a', fontWeight: 600, fontFamily: 'monospace' }}>00 mins</span>
                                                    )}
                                                  </td>
                                                  <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                                                    {(bs.off_window === 'Yes' || bs.is_off_window) ? (
                                                      <span style={{ display: 'inline-block', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '0.15rem 0.45rem', borderRadius: '0.25rem', fontWeight: 700, fontSize: '0.75rem' }}>
                                                        Yes
                                                      </span>
                                                    ) : (
                                                      <span style={{ display: 'inline-block', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', padding: '0.15rem 0.45rem', borderRadius: '0.25rem', fontWeight: 700, fontSize: '0.75rem' }}>
                                                        No
                                                      </span>
                                                    )}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                            <tfoot style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #e2e8f0', color: '#1e293b' }}>
                                              <tr>
                                                <td colSpan={5} style={{ padding: '0.6rem 0.75rem', textAlign: 'right', textTransform: 'uppercase', fontSize: '0.75rem', color: '#64748b' }}>
                                                  Total Summary ({row.break_sessions?.length || 0} Sessions):
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem', color: '#d97706', fontWeight: 800, fontSize: '0.8125rem' }}>
                                                  {row.total_break_duration || '00 mins'}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: (row.total_break_exceeded && row.total_break_exceeded !== '00 mins' && !row.total_break_exceeded.startsWith('0 mins')) ? '#dc2626' : '#16a34a', fontWeight: 800, fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                                                  {row.total_break_exceeded || '00 mins'}
                                                </td>
                                                <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', color: (row.total_off_window > 0 || row.break_sessions?.some(b => b.off_window === 'Yes' || b.is_off_window)) ? '#dc2626' : '#16a34a', fontWeight: 800, fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                                                  {row.total_off_window !== undefined ? `${row.total_off_window} Yes` : `${row.break_sessions?.filter(b => b.off_window === 'Yes' || b.is_off_window).length || 0} Yes`}
                                                </td>
                                              </tr>
                                            </tfoot>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
              </tbody>
            </table>
          </div>

          {/* ── Server-Side Pagination Bar (10, 25, 50, 100 Rows Per Page) ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '0.875rem 1.25rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', gap: '0.75rem' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>

              {/* Expanded Rows Per Page Selector (10, 25, 50, 100) */}
              <CustomSelect
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
                dropUp={true}
                options={[
                  { value: 10, label: '10 / page' },
                  { value: 25, label: '25 / page' },
                  { value: 50, label: '50 / page' },
                  { value: 100, label: '100 / page' }
                ]}
              />

              {/* Prev / Next Pagination Buttons */}
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  style={{ padding: '0.375rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', background: page <= 1 ? '#f1f5f9' : '#fff', color: page <= 1 ? '#cbd5e1' : '#475569', cursor: page <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  Prev
                </button>

                <span style={{ padding: '0.375rem 0.75rem', background: 'var(--brand-primary, #006EB3)', color: '#fff', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  {page} / {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '0.375rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '0.375rem', background: page >= totalPages ? '#f1f5f9' : '#fff', color: page >= totalPages ? '#cbd5e1' : '#475569', cursor: page >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* ── Video Verification Modal with Auto Timestamp Seeking ── */}
        
          </div>
        )}

        {/* Configure Report Filters Modal */}
        <ReportFilterModal
          isOpen={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          onApplyFilters={handleApplyModalFilters}
          branches={branches}
          departments={departments}
          cameras={cameras}
          activityTypes={globalActivities}
          initialFilters={{
            branch: branchFilter === 'all' ? '' : branchFilter,
            department: departmentFilter === 'all' ? '' : departmentFilter,
            activityType: reportType,
            area: cameraFilter === 'all' ? '' : cameraFilter,
            dateFrom,
            dateTo
          }}
        />

        {/* Configure Camera Processing Report Filters Modal (Picture 2) */}
        <CameraProcessingFilterModal
          isOpen={isCameraReportModalOpen}
          onClose={() => setIsCameraReportModalOpen(false)}
          onApplyFilters={handleApplyCameraFilters}
          branches={branches}
          cameras={cameras}
          initialFilters={{
            branch: 'all',
            camera: 'all',
            status: 'all'
          }}
        />
    {videoModal.isOpen && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999
          }}>
            <div style={{
              background: '#fff', width: '90%', maxWidth: '720px', borderRadius: '1rem',
              overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
            }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: '#0f172a', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <Video size={18} color="#38bdf8" />
                  <span>Video Verification — {videoModal.label}</span>
                </div>
                <button onClick={() => setVideoModal(v => ({ ...v, isOpen: false }))} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '1.5rem', textAlign: 'center' }}>
                {videoModal.hasVideo && videoModal.videoUrl ? (
                  <div>
                    <video
                      key={videoModal.videoUrl}
                      ref={videoRef}
                      onLoadedData={handleVideoLoaded}
                      controls
                      autoPlay
                      style={{ width: '100%', maxHeight: '420px', borderRadius: '0.5rem', background: '#000' }}
                    >
                      <source src={videoModal.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.75rem' }}>
                      Automatically seeking to recorded event timestamp: <strong style={{ color: '#2563eb' }}>{videoModal.timestampSec}s</strong>
                    </p>
                  </div>
                ) : (
                  /* Unavailable Video Message */
                  <div style={{ padding: '3rem 1.5rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #cbd5e1' }}>
                    <AlertCircle size={40} color="#94a3b8" style={{ marginBottom: '0.75rem' }} />
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#334155' }}>
                      Video unavailable for this attendance event.
                    </div>
                    <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: '0.35rem' }}>
                      No recorded video file was linked to this event instance.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
}
