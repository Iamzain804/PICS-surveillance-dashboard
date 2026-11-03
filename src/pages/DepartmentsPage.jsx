import React, { useState, useEffect, useRef } from 'react';
import {
  Building2, Plus, Trash2, Edit2, Edit, Eye, EyeOff, CheckCircle,
  X, AlertCircle, RefreshCw, MoreVertical, RotateCcw,
  Search, Calendar, ArrowLeft, ChevronDown, ChevronUp, ChevronRight, Clock
} from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import CustomTimePicker from '../components/CustomTimePicker';
import { API_BASE } from '../config';
import PageLoader from '../components/PageLoader';
import DateRangePicker from '../components/DateRangePicker';
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

export default function DepartmentsPage({ user, onLogout, onToggleSidebar, onNavigate, sidebarCollapsed }) {
  const [departments, setDepartments] = useState([]);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const formatTimeAMPM = (timeStr) => {
    if (!timeStr) return '';
    const clean = String(timeStr).trim();
    if (clean.includes('AM') || clean.includes('PM')) return clean;
    const parts = clean.split(':');
    if (parts.length < 2) return clean;
    const hour = parseInt(parts[0], 10);
    if (isNaN(hour)) return clean;
    const minStr = parts[1].replace(/[^0-9]/g, '').padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    const formattedHour = String(displayHour).padStart(2, '0');
    return `${formattedHour}:${minStr} ${ampm}`;
  };

  const formatDays = (daysStr) => {
    if (!daysStr) return '';
    const sortedDays = daysStr.split(',').filter(Boolean);
    if (sortedDays.length === 5 &&
      sortedDays.includes('Mon') &&
      sortedDays.includes('Tue') &&
      sortedDays.includes('Wed') &&
      sortedDays.includes('Thu') &&
      sortedDays.includes('Fri')) {
      return 'Mon - Fri';
    }
    if (sortedDays.length === 7 &&
      sortedDays.includes('Mon') &&
      sortedDays.includes('Tue') &&
      sortedDays.includes('Wed') &&
      sortedDays.includes('Thu') &&
      sortedDays.includes('Fri') &&
      sortedDays.includes('Sat') &&
      sortedDays.includes('Sun')) {
      return 'Mon - Sun';
    }
    return sortedDays.join(', ');
  };

  // View states
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState(null);

  // Form State
  const [deptForm, setDeptForm] = useState({
    name: '',
    description: '',
    branch_id: '',
    branch_name: '',
    is_active: true,
    shifts: [{
      shift_name: 'Morning',
      shift_start: '09:00',
      shift_end: '17:00',
      grace_time_mins: 15,
      early_departure_buffer_mins: 10,
      break_start: '13:00',
      break_end: '14:00'
    }]
  });

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('all');
  const [shiftFilter, setShiftFilter] = useState('all');
  const [occupancyFilter, setOccupancyFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const [expandedDeptId, setExpandedDeptId] = useState(null);
  const [branches, setBranches] = useState([]);

  // Compute unique shifts dynamically
  const uniqueShifts = React.useMemo(() => {
    const shifts = new Set();
    departments.forEach(d => {
      if (d.shifts && Array.isArray(d.shifts)) {
        d.shifts.forEach(s => {
          if (s.shift_name) shifts.add(s.shift_name);
        });
      } else if (d.shift_name) {
        shifts.add(d.shift_name);
      }
    });
    return ['all', ...Array.from(shifts)];
  }, [departments]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const actionsMenuRef = useRef(null);

  // Close actions menu when clicking outside
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
    fetchDepartments();
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await fetch(`${API_BASE}/branches`);
      if (res.ok) {
        const data = await res.json();
        setBranches(data);
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = String(user.id);
      else {
        const storedUser = localStorage.getItem('epic_user') || sessionStorage.getItem('epic_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            if (parsed?.id) headers['x-user-id'] = String(parsed.id);
          } catch {}
        }
      }

      let res = await fetch(`${API_BASE}/api/v1/departments`, { headers });
      if (!res.ok && (res.status === 404 || res.status === 405)) {
        res = await fetch(`${API_BASE}/departments`, { headers });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Failed to fetch departments (${res.status})`);
      }

      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startCreate = () => {
    const defaultBranch = branches.find(b => b.name.toLowerCase().includes('main')) || branches[0];
    setDeptForm({
      name: '',
      description: '',
      branch_id: defaultBranch ? defaultBranch.id : '',
      branch_name: defaultBranch ? defaultBranch.name : 'Main Branch',
      is_active: true,
      shifts: [
        {
          shift_name: 'Mon-Thu Regular',
          shift_start: '11:00 AM',
          shift_end: '08:45 PM',
          grace_time_mins: 10,
          early_departure_buffer_mins: 10,
          break_start: '01:00 PM',
          break_end: '02:00 PM',
          days: 'Mon,Tue,Wed,Thu'
        },
        {
          shift_name: 'Friday Shift',
          shift_start: '02:00 PM',
          shift_end: '08:45 PM',
          grace_time_mins: 10,
          early_departure_buffer_mins: 10,
          break_start: '04:00 PM',
          break_end: '04:30 PM',
          days: 'Fri'
        },
        {
          shift_name: 'Saturday Shift',
          shift_start: '11:00 AM',
          shift_end: '07:00 PM',
          grace_time_mins: 10,
          early_departure_buffer_mins: 10,
          break_start: '01:00 PM',
          break_end: '02:00 PM',
          days: 'Sat'
        }
      ]
    });
    setEditingDeptId(null);
    setIsCreating(true);
    setIsEditing(false);
    setSuccess(null);
    setError(null);
  };

  const startEdit = (dept) => {
    const defaultBranch = branches.find(b => String(b.id) === String(dept.branch_id)) || branches.find(b => b.name.toLowerCase().includes('main')) || branches[0];
    setDeptForm({
      name: dept.name,
      description: dept.description || '',
      branch_id: dept.branch_id || (defaultBranch ? defaultBranch.id : ''),
      branch_name: dept.branch_name || (defaultBranch ? defaultBranch.name : 'Main Branch'),
      is_active: dept.is_active !== false,
      shifts: dept.shifts && dept.shifts.length > 0 ? dept.shifts.map(s => ({
        id: s.id,
        shift_name: s.shift_name,
        shift_start: s.shift_start,
        shift_end: s.shift_end,
        grace_time_mins: s.grace_time_mins !== undefined ? s.grace_time_mins : 15,
        early_departure_buffer_mins: s.early_departure_buffer_mins !== undefined ? s.early_departure_buffer_mins : 10,
        break_start: s.break_start,
        break_end: s.break_end,
        days: s.days || 'Mon,Tue,Wed,Thu,Fri'
      })) : [{
        shift_name: dept.shift_name || 'Morning',
        shift_start: dept.shift_start || '09:00',
        shift_end: dept.shift_end || '17:00',
        grace_time_mins: dept.grace_time_mins !== undefined ? dept.grace_time_mins : 15,
        early_departure_buffer_mins: dept.early_departure_buffer_mins !== undefined ? dept.early_departure_buffer_mins : 10,
        break_start: dept.break_start || '13:00',
        break_end: dept.break_end || '14:00',
        days: dept.days || 'Mon,Tue,Wed,Thu,Fri'
      }]
    });
    setEditingDeptId(dept.id);
    setIsEditing(true);
    setIsCreating(false);
    setSuccess(null);
    setError(null);
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!deptForm.name.trim()) {
      setError("Department name is required");
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      let res;
      const headers = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = String(user.id);

      if (isCreating) {
        res = await fetch(`${API_BASE}/api/v1/departments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(deptForm)
        });
      } else {
        res = await fetch(`${API_BASE}/api/v1/departments/${editingDeptId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(deptForm)
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to save department');
      }

      setSuccess(`Department "${deptForm.name}" saved successfully!`);
      setIsEditing(false);
      setIsCreating(false);
      fetchDepartments();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (deptId, deptName) => {
    const name = deptName || 'this department';
    if (!window.confirm(`Are you sure you want to delete "${name}"? Any linked staff will be unlinked.`)) return;
    setError(null);
    setSuccess(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = String(user.id);
      const res = await fetch(`${API_BASE}/api/v1/departments/${deptId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to delete department');
      }
      setSuccess(`Department "${name}" deleted successfully!`);
      fetchDepartments();
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleToggleDeptStatus = async (dept) => {
    const newStatus = dept.is_active === false ? true : false;
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user?.id) headers['x-user-id'] = String(user.id);
      const res = await fetch(`${API_BASE}/api/v1/departments/${dept.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: dept.name,
          description: dept.description || '',
          is_active: newStatus,
          shifts: dept.shifts || []
        })
      });
      if (res.ok) {
        setActiveActionsMenu(null);
        setSuccess(`Department "${dept.name}" marked as ${newStatus ? 'Active' : 'Inactive'} successfully!`);
        fetchDepartments();
      } else {
        const err = await res.json();
        alert(err.detail || 'Failed to update department status.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server.');
    }
  };

  const handleAddShift = () => {
    setDeptForm(prev => {
      const nextShifts = [
        ...prev.shifts,
        {
          shift_name: `Shift ${prev.shifts.length + 1}`,
          shift_start: '09:00',
          shift_end: '17:00',
          grace_time_mins: 15,
          early_departure_buffer_mins: 10,
          break_start: '13:00',
          break_end: '14:00',
          days: 'Mon,Tue,Wed,Thu,Fri'
        }
      ];
      setTimeout(() => {
        const el = document.getElementById(`shift-card-${nextShifts.length - 1}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 60);
      return { ...prev, shifts: nextShifts };
    });
  };

  // Filters application
  const filteredDepts = departments.filter(dept => {
    const shiftNames = dept.shifts ? dept.shifts.map(s => s.shift_name.toLowerCase()) : [dept.shift_name ? dept.shift_name.toLowerCase() : ''];

    const matchesSearch =
      dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (dept.description && dept.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (dept.branch_name && dept.branch_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      shiftNames.some(sn => sn.includes(searchTerm.toLowerCase()));

    const matchesBranch = branchFilter === 'all' || String(dept.branch_id) === String(branchFilter);

    const matchesShift = shiftFilter === 'all'
      ? true
      : (dept.shifts ? dept.shifts.some(s => s.shift_name === shiftFilter) : dept.shift_name === shiftFilter);

    let matchesOccupancy = true;
    if (occupancyFilter === 'with-staff') {
      matchesOccupancy = (dept.staff_count || 0) > 0;
    } else if (occupancyFilter === 'without-staff') {
      matchesOccupancy = (dept.staff_count || 0) === 0;
    }

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && dept.is_active !== false) ||
      (statusFilter === 'inactive' && dept.is_active === false);

    const matchesDate = (() => {
      if (!dateRange.startDate && !dateRange.endDate) return true;
      const rawDate = dept.updated_at || dept.created_at;
      if (!rawDate) return true;
      const dStr = rawDate.split('T')[0];
      if (dateRange.startDate && dStr < dateRange.startDate) return false;
      if (dateRange.endDate && dStr > dateRange.endDate) return false;
      return true;
    })();

    return matchesSearch && matchesBranch && matchesShift && matchesOccupancy && matchesStatus && matchesDate;
  });

  // Pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentDepts = filteredDepts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredDepts.length / itemsPerPage);

  if (loading) return <PageLoader />;

  return (
    <div className="bm-page" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#f8fafc' }}>
      {/* Dynamic Style injection */}
      <style>{`
        .epic-depts-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          color: var(--text-muted-premium, #94a3b8);
          gap: 0.75rem;
        }

        /* Banner styles */
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
        
        .epic-alert-success {
          background: #ecfdf5;
          border: 1px solid #d1fae5;
          color: #065f46;
        }
        .dark-theme .epic-alert-success {
          background: rgba(16, 185, 129, 0.12);
          border-color: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        /* Layout & Container */
        .epic-depts-container {
          padding: 0;
          flex: 1;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
          color: var(--text-main-premium, #0f172a);
        }

        .dark-theme .epic-depts-container {
          color: var(--text-main, #f8fafc);
        }

        /* Header & Breadcrumbs */
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

        /* Back button */
        .epic-back-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-subtle-premium, #475569);
          background: transparent;
          border: none;
          cursor: pointer;
          margin-bottom: 1.5rem;
          padding: 0;
          transition: color 0.2s;
        }

        .epic-back-button:hover {
          color: var(--brand-primary, #006EB3);
        }

        /* Toolbar Controls */
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
          gap: 1rem;
          flex: 1;
        }

        .epic-search-wrapper {
          position: relative;
          flex: 1;
          max-width: 320px;
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
        }

        .epic-filter-select {
          padding: 0.65rem 2.25rem 0.65rem 1rem;
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 0.75rem;
          font-size: 0.875rem;
          background: var(--bg-card-premium, #fff);
          color: var(--text-subtle-premium, #475569);
          outline: none;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none; /* remove browser default arrow */
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 0.75rem center;
          background-size: 1rem;
          min-width: 140px;
        }

        .dark-theme .epic-filter-select {
          background: var(--bg-card, rgba(15, 23, 42, 0.65));
          border-color: var(--border-card, rgba(255, 255, 255, 0.08));
          color: var(--text-main, #f8fafc);
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
        }

        .epic-filter-select:focus, .epic-filter-select:hover {
          border-color: var(--brand-primary, #006EB3);
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
        }

        .epic-shift-card {
          background: #f8fafc;
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          position: relative;
          transition: all 0.2s ease;
        }

        .dark-theme .epic-shift-card {
          background: rgba(30, 41, 59, 0.45);
          border-color: var(--border-card, rgba(255, 255, 255, 0.08));
        }

        /* Button style */
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

        .epic-btn-secondary:hover {
          background: var(--border-premium, #e2e8f0);
        }

        /* Dashed Add Shift Button & Pop Animation */
        @keyframes epicShiftPopIn {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.97);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .epic-add-shift-btn {
          width: 100%;
          padding: 0.85rem 1.25rem;
          border: 2px dashed var(--brand-primary, #006EB3);
          background: rgba(16, 185, 129, 0.03);
          color: var(--brand-primary, #006EB3);
          border-radius: 0.65rem;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 1rem;
        }

        .epic-add-shift-btn:hover {
          background: rgba(16, 185, 129, 0.08);
          border-color: #059669;
          color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.12);
        }

        .epic-add-shift-btn:active {
          transform: translateY(0);
        }

        .epic-shift-pop-card {
          animation: epicShiftPopIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        /* Table Card Layout */
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

        /* Custom Table style */
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

        /* Actions three-dots dropdown wrapper */
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
          width: 130px;
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

        /* Pagination */
        .epic-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem;
          background: var(--bg-card-premium, #fff);
          border-top: 1px solid var(--border-premium, #f1f5f9);
        }

        .dark-theme .epic-pagination {
          background: transparent;
          border-top-color: var(--border-card, rgba(255, 255, 255, 0.08));
        }

        .epic-pagination-btn {
          background: var(--bg-btn-premium, #f1f5f9);
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 0.375rem;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-subtle-premium, #475569);
          font-size: 0.875rem;
        }

        .epic-pagination-btn-active {
          background: var(--brand-primary, #006EB3) !important;
          color: #fff !important;
          border-color: var(--brand-primary, #006EB3) !important;
        }

        /* Form Styles */
        .epic-form-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .epic-form-card {
          background: var(--bg-card-premium, #fff);
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        }

        .dark-theme .epic-form-card {
          background: var(--bg-card, rgba(15, 23, 42, 0.65));
          border-color: var(--border-card, rgba(255, 255, 255, 0.08));
        }

        .epic-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .epic-form-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted-premium, #64748b);
          letter-spacing: 0.05em;
        }
      `}</style>

      {/* Top Header */}
      <PageHeader title={isCreating ? 'Add Department' : isEditing ? 'Edit Department' : 'Departments'} icon={Building2} onToggleSidebar={onToggleSidebar} user={user} onLogout={onLogout} onNavigate={onNavigate} sidebarCollapsed={sidebarCollapsed} />

      <div className="epic-depts-container">
        {/* SUCCESS & ERROR ALERTS */}
        {error && (
          <div className="epic-alert epic-alert-error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertCircle size={20} />
              <div>{error}</div>
            </div>
            <button
              onClick={fetchDepartments}
              style={{
                background: 'transparent',
                border: '1px solid currentColor',
                borderRadius: '0.375rem',
                padding: '0.25rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            1. LIST VIEW MODE
            ───────────────────────────────────────────────────────────────────────────── */}
        {!isCreating && !isEditing && (
          <>
            {/* Filters & Toolbar */}
            <div className="epic-toolbar">
              <div className="epic-filters-group">
                <div className="epic-search-wrapper">
                  <Search size={16} className="epic-search-icon" />
                  <input
                    type="text"
                    className="epic-search-input"
                    placeholder="Search by department title..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Branch Filter Dropdown */}
                <CustomSelect
                  value={branchFilter}
                  onChange={(e) => { setBranchFilter(e.target.value); setCurrentPage(1); }}
                  options={[
                    { value: 'all', label: 'Branches' },
                    ...branches.map(b => ({ value: String(b.id), label: b.name }))
                  ]}
                />

                {/* Shift Filter Dropdown */}
                <CustomSelect
                  value={shiftFilter}
                  onChange={(e) => setShiftFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'Shifts' },
                    ...uniqueShifts.filter(s => s !== 'all').map(s => ({ value: s, label: s }))
                  ]}
                />

                {/* Occupancy Filter Dropdown */}
                <CustomSelect
                  value={occupancyFilter}
                  onChange={(e) => setOccupancyFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'Occupancy' },
                    { value: 'with-staff', label: 'With Staff' },
                    { value: 'without-staff', label: 'Without Staff' }
                  ]}
                />

                {/* Status Filter Dropdown */}
                <CustomSelect
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  options={[
                    { value: 'all', label: 'Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                />

                {/* Theme Date Range Picker */}
                <DateRangePicker
                  startDate={dateRange.startDate}
                  endDate={dateRange.endDate}
                  onChange={(range) => { setDateRange(range); setCurrentPage(1); }}
                  onClear={() => { setDateRange({ startDate: '', endDate: '' }); setCurrentPage(1); }}
                />

                {/* Clear All Filters Button */}
                {(searchTerm !== '' || branchFilter !== 'all' || shiftFilter !== 'all' || occupancyFilter !== 'all' || statusFilter !== 'all' || dateRange.startDate !== '' || dateRange.endDate !== '') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setBranchFilter('all');
                      setShiftFilter('all');
                      setOccupancyFilter('all');
                      setStatusFilter('all');
                      setDateRange({ startDate: '', endDate: '' });
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

              {hasPerm(user, 'add_department') && (
                <button className="epic-btn epic-btn-primary" onClick={startCreate}>
                  <Plus size={16} /> Add Department
                </button>
              )}
            </div>

            {/* Departments Table */}
            <div className="epic-card-wrapper">
              {(() => {
                const canEditDepts = hasAnyWritePerm(user, 'department');
                return (
                  <table className="epic-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '22%' }}>TITLE</th>
                        <th style={{ width: '18%' }}>BRANCH</th>
                        <th style={{ width: canEditDepts ? '24%' : '30%' }}>DETAILS</th>
                        <th style={{ width: '8%' }}>STAFF</th>
                        <th style={{ width: '10%' }}>STATUS</th>
                        <th style={{ width: '10%' }}>UPDATED AT</th>
                        {canEditDepts && <th style={{ width: '8%' }}>ACTIONS</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {currentDepts.length === 0 ? (
                        <tr>
                          <td colSpan={canEditDepts ? 7 : 6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted-premium)' }}>
                            No departments configured. Click "Add Department" to get started.
                          </td>
                        </tr>
                      ) : (
                        currentDepts.map((dept, dIdx) => (
                          <React.Fragment key={dept.id}>
                            <tr
                              style={{
                                background: expandedDeptId === dept.id ? 'var(--bg-shift-card, #f8fafc)' : 'transparent',
                                cursor: 'pointer'
                              }}
                              onClick={() => setExpandedDeptId(expandedDeptId === dept.id ? null : dept.id)}
                            >
                              <td style={{ fontWeight: 600, verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <button
                                    className="epic-dots-btn"
                                    title={expandedDeptId === dept.id ? "Hide Shifts" : "Show Shifts"}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedDeptId(expandedDeptId === dept.id ? null : dept.id);
                                    }}
                                    style={{ color: expandedDeptId === dept.id ? 'var(--brand-primary, #006EB3)' : undefined }}
                                  >
                                    {expandedDeptId === dept.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                  <span>{dept.name}</span>
                                </div>
                              </td>
                              <td style={{ verticalAlign: 'middle', fontWeight: 600, color: 'var(--text-main-premium, #334155)' }}>
                                {dept.branch_name || branches.find(b => String(b.id) === String(dept.branch_id))?.name || 'Main Branch'}
                              </td>
                              <td style={{ color: 'var(--text-muted-premium, #94a3b8)', verticalAlign: 'middle', maxWidth: '400px', wordBreak: 'break-word' }}>
                                {dept.description || 'No description provided'}
                              </td>
                              <td style={{ verticalAlign: 'middle', fontWeight: 600 }}>
                                {dept.staff_count ?? dept.assigned_staff_count ?? dept.assigned_count ?? 0}
                              </td>
                              <td style={{ verticalAlign: 'middle' }}>
                                <span style={{ display: 'inline-flex', padding: '0.25rem 0.65rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, background: dept.is_active !== false ? '#f0fdf4' : '#f1f5f9', color: dept.is_active !== false ? '#166534' : '#64748b', border: dept.is_active !== false ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                                  {dept.is_active !== false ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td style={{ verticalAlign: 'middle', fontSize: '0.825rem', color: '#475569', fontWeight: 500 }}>
                                {formatDate(dept.updated_at || dept.created_at)}
                              </td>
                              <td className="epic-actions-cell" style={{ verticalAlign: 'middle', textAlign: 'left' }}>
                                {hasAnyWritePerm(user, 'department') && (
                                  <div style={{ position: 'relative', display: 'inline-block' }} ref={activeActionsMenu === dept.id ? actionsMenuRef : null}>
                                    <button
                                      className="epic-dots-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveActionsMenu(activeActionsMenu === dept.id ? null : dept.id);
                                      }}
                                    >
                                      <MoreVertical size={16} />
                                    </button>

                                    {activeActionsMenu === dept.id && (
                                      <div className="epic-dropdown-menu" onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', left: 0, right: 'auto', top: dIdx >= currentDepts.length - 2 ? 'auto' : '100%', bottom: dIdx >= currentDepts.length - 2 ? '100%' : 'auto', marginTop: dIdx >= currentDepts.length - 2 ? 0 : '0.25rem', marginBottom: dIdx >= currentDepts.length - 2 ? '0.25rem' : 0, zIndex: 50 }}>
                                        {hasPerm(user, 'update_department') && (
                                          <button className="epic-dropdown-item" onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveActionsMenu(null);
                                            startEdit(dept);
                                          }}>
                                            <Edit size={12} style={{ display: 'inline', marginRight: '0.35rem' }} /> Edit Info
                                          </button>
                                        )}
                                        {hasPerm(user, ['status_department', 'remove_department']) && (
                                          <button
                                            className="epic-dropdown-item"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleToggleDeptStatus(dept);
                                            }}
                                            style={{ color: dept.is_active === false ? '#10b981' : 'var(--text-subtle-premium, #64748b)' }}
                                          >
                                            {dept.is_active === false ? (
                                              <Eye size={12} style={{ display: 'inline', marginRight: '0.35rem' }} />
                                            ) : (
                                              <EyeOff size={12} style={{ display: 'inline', marginRight: '0.35rem' }} />
                                            )}
                                            {dept.is_active === false ? 'Active' : 'Inactive'}
                                          </button>
                                        )}
                                        {hasPerm(user, 'remove_department') && (
                                          <button
                                            className="epic-dropdown-item"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveActionsMenu(null);
                                              handleDelete(dept.id, dept.name);
                                            }}
                                            style={{ color: '#ef4444' }}
                                          >
                                            <Trash2 size={12} style={{ display: 'inline', marginRight: '0.35rem', color: '#ef4444' }} /> Delete Department
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>

                            {/* Expanded Shifts Details Sub-row (Spans full length of table) */}
                            {expandedDeptId === dept.id && (() => {
                              const activeShifts = (dept.shifts && dept.shifts.length > 0)
                                ? dept.shifts
                                : [{
                                  shift_name: dept.shift_name || 'Morning',
                                  shift_start: dept.shift_start || '09:00',
                                  shift_end: dept.shift_end || '17:00',
                                  grace_time_mins: dept.grace_time_mins !== undefined ? dept.grace_time_mins : 15,
                                  break_start: dept.break_start || '13:00',
                                  break_end: dept.break_end || '14:00',
                                  days: dept.days || 'Mon,Tue,Wed,Thu,Fri'
                                }];
                              return (
                                <tr>
                                  <td colSpan={canEditDepts ? 7 : 6} style={{ padding: '1rem 1.5rem', background: 'var(--bg-shift-card, #f8fafc)', borderBottom: '1px solid var(--border-premium, #e2e8f0)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-main-premium)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                        <Clock size={14} style={{ color: 'var(--brand-primary, #006EB3)' }} />Shifts ({activeShifts.length})
                                      </span>

                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                      {activeShifts.map((s, idx) => (
                                        <div
                                          key={idx}
                                          style={{
                                            background: 'var(--bg-card-premium, #ffffff)',
                                            border: '1px solid var(--border-premium, #e2e8f0)',
                                            borderRadius: '0.5rem',
                                            padding: '0.75rem 1.25rem',
                                            fontSize: '0.825rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            flexWrap: 'wrap',
                                            gap: '1rem',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                          }}
                                        >
                                          <div style={{ fontWeight: 700, color: 'var(--brand-primary, #006EB3)', minWidth: '120px', fontSize: '0.875rem' }}>
                                            {s.shift_name || `Shift #${idx + 1}`}
                                          </div>
                                          <div style={{ color: 'var(--text-subtle-premium)' }}>
                                            <span style={{ fontWeight: 600 }}>Shift Time: </span>
                                            {formatTimeAMPM(s.shift_start || '09:00')} - {formatTimeAMPM(s.shift_end || '17:00')}
                                          </div>
                                          <div style={{ color: 'var(--text-subtle-premium)' }}>
                                            <span style={{ fontWeight: 600 }}>Break Time: </span>
                                            {formatTimeAMPM(s.break_start || '13:00')} - {formatTimeAMPM(s.break_end || '14:00')}
                                          </div>
                                          <div style={{ color: 'var(--text-subtle-premium)' }}>
                                            <span style={{ fontWeight: 600 }}>Days: </span>
                                            <span style={{ color: 'var(--brand-primary, #006EB3)', fontWeight: 600 }}>{formatDays(s.days || 'Mon,Tue,Wed,Thu,Fri')}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })()}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                );
              })()}

              {/* Pagination at the bottom */}
              <div className="epic-pagination" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-premium, #f1f5f9)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CustomSelect
                    value={itemsPerPage}
                    onChange={e => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    dropUp={true}
                    options={[
                      { value: 10, label: '10 / page' },
                      { value: 25, label: '25 / page' },
                      { value: 50, label: '50 / page' },
                      { value: 100, label: '100 / page' }
                    ]}
                  />

                  <div style={{ display: 'flex', gap: '0.375rem' }}>
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--border-premium, #cbd5e1)', borderRadius: '0.375rem', background: currentPage <= 1 ? 'var(--bg-header-premium, #f1f5f9)' : 'var(--bg-card-premium, #fff)', color: currentPage <= 1 ? '#cbd5e1' : 'var(--text-main-premium, #475569)', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Prev
                    </button>

                    <span style={{ padding: '0.375rem 0.75rem', background: 'var(--brand-primary, #006EB3)', color: '#fff', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 700 }}>
                      {currentPage} / {totalPages || 1}
                    </span>

                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      style={{ padding: '0.375rem 0.75rem', border: '1px solid var(--border-premium, #cbd5e1)', borderRadius: '0.375rem', background: currentPage >= totalPages ? 'var(--bg-header-premium, #f1f5f9)' : 'var(--bg-card-premium, #fff)', color: currentPage >= totalPages ? '#cbd5e1' : 'var(--text-main-premium, #475569)', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
          2. ADD / EDIT DEPARTMENT VIEW MODE
          ───────────────────────────────────────────────────────────────────────────── */}
        {(isCreating || isEditing) && (
          <>
            <form onSubmit={handleSave} className="epic-form-container">
              {/* Form Card */}
              <div className="epic-form-card">
                {/* Back button */}
                <button type="button" className="epic-back-button" style={{ marginBottom: '1.25rem' }} onClick={() => {
                  setIsCreating(false);
                  setIsEditing(false);
                }}>
                  <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> Back to Departments Listing
                </button>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main-premium)' }}>
                  {isCreating ? 'Add Department' : 'Edit Department'}
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.8fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="epic-form-group" style={{ marginBottom: 0 }}>
                    <label className="epic-form-label">Title *</label>
                    <input
                      type="text"
                      className="epic-search-input"
                      placeholder="Enter department title..."
                      value={deptForm.name}
                      onChange={(e) => setDeptForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="epic-form-group" style={{ marginBottom: 0 }}>
                    <label className="epic-form-label">Branch *</label>
                    <CustomSelect
                      value={deptForm.branch_id ? String(deptForm.branch_id) : ''}
                      onChange={(e) => {
                        const selB = branches.find(b => String(b.id) === String(e.target.value));
                        setDeptForm(prev => ({
                          ...prev,
                          branch_id: e.target.value ? parseInt(e.target.value, 10) : null,
                          branch_name: selB ? selB.name : 'Main Branch'
                        }));
                      }}
                      options={[
                        { value: '', label: 'Select Branch...' },
                        ...branches.map(b => ({ value: String(b.id), label: b.name }))
                      ]}
                      style={{ height: '42px', width: '100%', borderRadius: '0.75rem', border: '1px solid #e2e8f0', background: '#fff' }}
                    />
                  </div>

                  <div className="epic-form-group" style={{ marginBottom: 0 }}>
                    <label className="epic-form-label">Description</label>
                    <textarea
                      className="epic-search-input"
                      placeholder="Enter department description..."
                      value={deptForm.description}
                      onChange={(e) => setDeptForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={1}
                      style={{ height: '42px', resize: 'none', paddingTop: '0.65rem' }}
                    />
                  </div>
                </div>

                {/* Shift & Timing Settings Header */}
                <div style={{ marginTop: '2.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-premium, #e2e8f0)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--text-main-premium)' }}>
                    Shift Details
                  </h3>
                </div>

                {/* Shifts list mapping */}
                {deptForm.shifts && deptForm.shifts.map((shift, idx) => (
                  <div key={idx} id={`shift-card-${idx}`} className="epic-shift-card epic-shift-pop-card" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main-premium)', margin: 0 }}>
                        {idx + 1} - Shift Details
                      </h4>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
                      <div className="epic-form-group">
                        <label className="epic-form-label">Shift Name *</label>
                        <input
                          type="text"
                          className="epic-search-input"
                          placeholder="e.g. Morning Shift"
                          value={shift.shift_name}
                          onChange={(e) => {
                            const newShifts = [...deptForm.shifts];
                            newShifts[idx].shift_name = e.target.value;
                            setDeptForm(prev => ({ ...prev, shifts: newShifts }));
                          }}
                        />
                      </div>

                      <div className="epic-form-group">
                        <label className="epic-form-label">Working Days</label>
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                            const activeDays = (shift.days || '').split(',').filter(Boolean);
                            const isActive = activeDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  const newShifts = [...deptForm.shifts];
                                  let nextDays;
                                  if (isActive) {
                                    nextDays = activeDays.filter(d => d !== day);
                                  } else {
                                    nextDays = [...activeDays, day];
                                  }
                                  newShifts[idx].days = nextDays.join(',');
                                  setDeptForm(prev => ({ ...prev, shifts: newShifts }));
                                }}
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  borderRadius: '2rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  border: '1px solid',
                                  borderColor: isActive ? 'var(--brand-primary, #006EB3)' : 'var(--border-premium, #e2e8f0)',
                                  background: isActive ? 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))' : 'transparent',
                                  color: isActive ? 'var(--brand-primary, #006EB3)' : 'var(--text-subtle-premium, #64748b)',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="epic-form-group">
                        <label className="epic-form-label">Shift Start Time</label>
                        <CustomTimePicker
                          label="Shift Start Time"
                          value={shift.shift_start}
                          onChange={(e) => {
                            const newShifts = [...deptForm.shifts];
                            newShifts[idx].shift_start = e.target.value;
                            setDeptForm(prev => ({ ...prev, shifts: newShifts }));
                          }}
                          placeholder="Select shift start time"
                        />
                      </div>

                      <div className="epic-form-group">
                        <label className="epic-form-label">Shift End Time</label>
                        <CustomTimePicker
                          label="Shift End Time"
                          value={shift.shift_end}
                          onChange={(e) => {
                            const newShifts = [...deptForm.shifts];
                            newShifts[idx].shift_end = e.target.value;
                            setDeptForm(prev => ({ ...prev, shifts: newShifts }));
                          }}
                          placeholder="Select shift end time"
                        />
                      </div>

                      <div className="epic-form-group">
                        <label className="epic-form-label">Break Start Time</label>
                        <CustomTimePicker
                          label="Break Start Time"
                          value={shift.break_start}
                          onChange={(e) => {
                            const newShifts = [...deptForm.shifts];
                            newShifts[idx].break_start = e.target.value;
                            setDeptForm(prev => ({ ...prev, shifts: newShifts }));
                          }}
                          placeholder="Select break start time"
                        />
                      </div>

                      <div className="epic-form-group">
                        <label className="epic-form-label">Break End Time</label>
                        <CustomTimePicker
                          label="Break End Time"
                          value={shift.break_end}
                          onChange={(e) => {
                            const newShifts = [...deptForm.shifts];
                            newShifts[idx].break_end = e.target.value;
                            setDeptForm(prev => ({ ...prev, shifts: newShifts }));
                          }}
                          placeholder="Select break end time"
                        />
                      </div>

                      <div className="epic-form-group">
                        <label className="epic-form-label">Grace Period </label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          className="epic-search-input"
                          placeholder="e.g. 15"
                          value={shift.grace_time_mins ?? 10}
                          onChange={(e) => {
                            const newShifts = [...deptForm.shifts];
                            newShifts[idx].grace_time_mins = parseInt(e.target.value, 10) || 0;
                            setDeptForm(prev => ({ ...prev, shifts: newShifts }));
                          }}
                          style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                        />
                      </div>

                      <div className="epic-form-group">
                        <label className="epic-form-label">Early Departure</label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          className="epic-search-input"
                          placeholder="e.g. 10"
                          value={shift.early_departure_buffer_mins ?? 10}
                          onChange={(e) => {
                            const newShifts = [...deptForm.shifts];
                            newShifts[idx].early_departure_buffer_mins = parseInt(e.target.value, 10) || 0;
                            setDeptForm(prev => ({ ...prev, shifts: newShifts }));
                          }}
                          style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                        />
                      </div>
                    </div>

                    {deptForm.shifts.length > 1 && (
                      <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-card, #e2e8f0)' }}>
                        <button
                          type="button"
                          onClick={() => setDeptForm(prev => ({
                            ...prev,
                            shifts: prev.shifts.filter((_, i) => i !== idx)
                          }))}
                          style={{
                            background: '#ef4444',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '0.45rem',
                            padding: '0.45rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                            transition: 'background-color 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Full width dashed Add Another Shift button with auto scroll animation */}
                <button
                  type="button"
                  className="epic-add-shift-btn"
                  onClick={handleAddShift}
                >
                  <Plus size={18} /> Add Another Shift
                </button>

                <div style={{ marginTop: '2rem' }}>
                  <button type="submit" className="epic-btn epic-btn-primary">
                    {isCreating ? 'Save' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>

      {/* FLOATING TOP-RIGHT SUCCESS TOAST */}
      {success && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderLeft: '4px solid #10b981',
            borderRadius: '0.6rem',
            padding: '0.75rem 1rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 99999,
            maxWidth: '380px'
          }}
        >
          <CheckCircle size={18} style={{ color: 'var(--brand-primary, #006EB3)', flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', flex: 1 }}>{success}</span>
          <button
            type="button"
            onClick={() => setSuccess(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2px',
              borderRadius: '0.25rem'
            }}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
