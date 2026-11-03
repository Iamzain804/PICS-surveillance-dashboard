import React, { useState, useEffect, useRef } from 'react';
import { Shield, Plus, Edit, Eye, EyeOff, Search, RotateCcw, ChevronDown, ChevronUp, AlertCircle, CheckCircle, X, ArrowLeft, MoreVertical } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import DateRangePicker from '../components/DateRangePicker';

import { API_BASE } from '../config';
import PageLoader from '../components/PageLoader';
import PageHeader from '../components/PageHeader';
import { hasPerm as checkPerm, hasAnyWritePerm as checkAnyWritePerm } from '../utils/permissions';

function Switch({ checked, onChange, disabled, label, labelOnRight = false }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: disabled ? 'not-allowed' : 'pointer', gap: '0.65rem', opacity: disabled ? 0.6 : 1, userSelect: 'none' }}>
      {!labelOnRight && label && <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main-premium, #0f172a)' }}>{label}</span>}
      <div 
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          onChange(!checked);
        }}
        style={{
          width: '36px',
          height: '20px',
          borderRadius: '10px',
          background: checked ? 'var(--epic-green, #10b981)' : '#cbd5e1',
          position: 'relative',
          transition: 'background-color 0.2s ease',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#ffffff',
          position: 'absolute',
          top: '2px',
          left: checked ? '18px' : '2px',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }} />
      </div>
      {labelOnRight && label && <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main-premium, #0f172a)' }}>{label}</span>}
    </label>
  );
}

export default function RolesPage({ user, onToggleSidebar, onLogout, onNavigate, sidebarCollapsed, hasPerm: propHasPerm, hasAnyWritePerm: propHasAnyWritePerm }) {
  const hasPerm = (u, p) => propHasPerm ? propHasPerm(u, p) : checkPerm(u, p);
  const hasAnyWritePerm = (u, m) => propHasAnyWritePerm ? propHasAnyWritePerm(u, m) : checkAnyWritePerm(u, m);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({}); // grouped by category
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appliedDateRange, setAppliedDateRange] = useState({ start: null, end: null });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // View state: 'list', 'create', 'edit'
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);

  // Form state for add/edit
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    is_active: true,
    permission_ids: []
  });

  // Accordion expanded state for groups in form
  const [expandedGroups, setExpandedGroups] = useState({});

  // 3-dots Context Menu State
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const actionsMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target)) {
        setActiveActionsMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/roles?include_counts=true`),
        fetch(`${API_BASE}/api/v1/permissions`)
      ]);

      if (!rolesRes.ok || !permsRes.ok) {
        throw new Error('Failed to load roles data from server');
      }

      const rolesData = await rolesRes.json();
      const permsData = await permsRes.json();

      setRoles(Array.isArray(rolesData) ? rolesData : []);

      // Group permissions by category (or module)
      let grouped = {};
      if (permsData && typeof permsData === 'object' && !Array.isArray(permsData)) {
        grouped = permsData;
      } else if (Array.isArray(permsData)) {
        permsData.forEach(p => {
          const cat = p.group || p.category || p.module || 'General';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(p);
        });
      }
      setPermissions(grouped);

      // Default expand all accordion groups
      const initialExpanded = {};
      Object.keys(grouped).forEach(cat => {
        initialExpanded[cat] = true;
      });
      setExpandedGroups(initialExpanded);

    } catch (err) {
      setError(err.message || 'Server error while fetching roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter & Search calculation
  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && role.is_active) || 
      (statusFilter === 'inactive' && !role.is_active);

    const matchesDate = (() => {
      if (!appliedDateRange.start && !appliedDateRange.end) return true;
      if (!role.updated_at) return true;
      const roleDate = new Date(role.updated_at);
      if (appliedDateRange.start) {
        const startDate = new Date(appliedDateRange.start);
        startDate.setHours(0, 0, 0, 0);
        if (roleDate < startDate) return false;
      }
      if (appliedDateRange.end) {
        const endDate = new Date(appliedDateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (roleDate > endDate) return false;
      }
      return true;
    })();

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRoles = filteredRoles.slice(indexOfFirstItem, indexOfLastItem);

  const startCreate = () => {
    setRoleForm({
      name: '',
      description: '',
      is_active: true,
      permission_ids: []
    });
    setIsCreating(true);
    setIsEditing(false);
    setEditingRoleId(null);
  };

  const startEdit = async (role) => {
    setIsEditing(true);
    setIsCreating(false);
    setEditingRoleId(role.id);
    try {
      const res = await fetch(`${API_BASE}/api/v1/roles/${role.id}`);
      if (res.ok) {
        const data = await res.json();
        setRoleForm({
          name: data.name || '',
          description: data.description || '',
          is_active: data.is_active !== false,
          permission_ids: data.permissions ? data.permissions.map(p => typeof p === 'object' ? p.id : p) : []
        });
      } else {
        setRoleForm({
          name: role.name || '',
          description: role.description || '',
          is_active: role.is_active !== false,
          permission_ids: role.permission_ids || []
        });
      }
    } catch {
      setRoleForm({
        name: role.name || '',
        description: role.description || '',
        is_active: role.is_active !== false,
        permission_ids: role.permission_ids || []
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!roleForm.name.trim()) {
      setError('Role title is required.');
      return;
    }

    try {
      const payload = {
        name: roleForm.name.trim(),
        description: roleForm.description,
        is_active: roleForm.is_active,
        permission_ids: roleForm.permission_ids
      };

      let res;
      if (isEditing && editingRoleId) {
        res = await fetch(`${API_BASE}/api/v1/roles/${editingRoleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch(`${API_BASE}/api/v1/roles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to save role.');
      }

      setSuccess(isEditing ? 'Role updated successfully!' : 'Role created successfully!');
      setIsCreating(false);
      setIsEditing(false);
      fetchData();
    } catch (err) {
      setError(err.message || 'An error occurred while saving.');
    }
  };

  const handleToggleRoleStatus = async (role) => {
    try {
      const updatedStatus = !role.is_active;
      const res = await fetch(`${API_BASE}/api/v1/roles/${role.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: updatedStatus })
      });

      if (res.ok) {
        setSuccess(`Role status changed to ${updatedStatus ? 'Active' : 'Inactive'}.`);
        fetchData();
      } else {
        setError('Failed to change role status.');
      }
    } catch {
      setError('Network error while changing status.');
    }
  };

  // Toggle individual permission checkbox
  const handleTogglePermission = (permId) => {
    setRoleForm(prev => {
      const exists = prev.permission_ids.includes(permId);
      const updated = exists 
        ? prev.permission_ids.filter(id => id !== permId)
        : [...prev.permission_ids, permId];
      return { ...prev, permission_ids: updated };
    });
  };

  // Toggle group-level select all
  const handleToggleGroupAll = (groupName, groupPerms, shouldSelect) => {
    const groupIds = groupPerms.map(p => p.id);
    setRoleForm(prev => {
      let updated;
      if (shouldSelect) {
        updated = Array.from(new Set([...prev.permission_ids, ...groupIds]));
      } else {
        updated = prev.permission_ids.filter(id => !groupIds.includes(id));
      }
      return { ...prev, permission_ids: updated };
    });
  };

  // Toggle all permissions across all groups
  const allPermsList = Object.values(permissions).flat();
  const totalPermsCount = allPermsList.length;

  const handleToggleAllPermissions = (shouldSelect) => {
    if (shouldSelect) {
      setRoleForm(prev => ({ ...prev, permission_ids: allPermsList.map(p => p.id) }));
    } else {
      setRoleForm(prev => ({ ...prev, permission_ids: [] }));
    }
  };

  const toggleGroupExpansion = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return 'N/A';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  if (loading && roles.length === 0) {
    return <PageLoader message="Loading Roles & Permissions..." />;
  }

  return (
    <div className="page-content" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-main-premium, #f8fafc)', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      <style>{`
        .epic-roles-container {
          padding: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .epic-card-wrapper {
          background: var(--bg-card-premium, #fff);
          border-radius: 0.75rem;
          border: 1px solid var(--border-premium, #e2e8f0);
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          overflow: hidden;
        }

        .epic-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .epic-table th {
          background: var(--bg-header-premium, #f8fafc);
          padding: 0.85rem 1.25rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted-premium, #64748b);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid var(--border-premium, #e2e8f0);
        }

        .epic-table td {
          padding: 1.25rem 1.5rem;
          font-size: 0.875rem;
          color: var(--text-main-premium, #0f172a);
          border-bottom: 1px solid var(--border-premium, #f1f5f9);
          vertical-align: middle;
        }

        .epic-table tr:last-child td {
          border-bottom: none;
        }

        .epic-table tr:hover td {
          background: var(--bg-header-premium, #f8fafc);
        }

        .epic-status-badge {
          display: inline-flex;
          padding: 0.25rem 0.65rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .epic-status-badge-active {
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        }

        .epic-status-badge-inactive {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }

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
          color: var(--epic-green, #10b981);
        }

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
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
        }

        .epic-form-row {
          display: flex;
          gap: 1.5rem;
          align-items: flex-start;
        }

        .epic-form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .epic-form-label {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text-muted-premium, #64748b);
          letter-spacing: 0.05em;
        }

        .epic-accordion-group {
          border: 1px solid var(--border-premium, #e2e8f0);
          border-radius: 0.75rem;
          background: var(--bg-card-premium, #fff);
          margin-bottom: 1rem;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        .epic-accordion-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          cursor: pointer;
          user-select: none;
        }

        .epic-accordion-content {
          padding: 1.5rem;
          border-top: 1px solid var(--border-premium, #f1f5f9);
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
          background: var(--bg-header-premium, #f8fafc);
        }

        .epic-perm-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 0.75rem;
          background: var(--bg-card-premium, #fff);
          border: 1px solid var(--border-premium, #e2e8f0);
        }

        .epic-perm-title {
          font-weight: 700;
          font-size: 0.875rem;
          color: var(--text-main-premium, #0f172a);
          display: block;
        }

        .epic-perm-desc {
          font-size: 0.75rem;
          color: var(--text-muted-premium, #64748b);
          margin-top: 0.2rem;
          display: block;
        }

        .epic-perm-section-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .epic-dots-btn {
          width: 32px;
          height: 32px;
          border-radius: 0.375rem;
          border: none;
          background: transparent;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .epic-dots-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .epic-dropdown-menu {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          padding: 0.35rem;
          min-width: 140px;
          z-index: 50;
        }

        .epic-dropdown-item {
          width: 100%;
          padding: 0.5rem 0.75rem;
          text-align: left;
          background: transparent;
          border: none;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          color: #0f172a;
          border-radius: 0.35rem;
          display: flex;
          align-items: center;
        }

        .epic-dropdown-item:hover {
          background: #f8fafc;
        }
      `}</style>

      {/* SUCCESS & ERROR ALERTS */}
      {error && (
        <div className="epic-alert epic-alert-error" style={{ padding: '1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          <div>{error}</div>
        </div>
      )}

      {/* Page Header (Always visible) */}
      <PageHeader
        title={isCreating ? 'Add Role' : isEditing ? 'Edit Role' : 'Roles & Permissions'}
        icon={Shield}
        onToggleSidebar={onToggleSidebar}
        user={user}
        onLogout={onLogout}
        onNavigate={onNavigate}
        sidebarCollapsed={sidebarCollapsed}
      />

      <div className="epic-roles-container">

      {/* 1. LIST VIEW MODE */}
      {!isCreating && !isEditing && (
        <>
          <div className="epic-toolbar">
            <div className="epic-filters-group">
              <div className="epic-search-wrapper">
                <Search size={16} className="epic-search-icon" />
                <input 
                  type="text"
                  className="epic-search-input"
                  placeholder="Search By Role Title"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <CustomSelect
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Status' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]}
              />

              <DateRangePicker
                startDate={appliedDateRange.start ? appliedDateRange.start.toISOString().split('T')[0] : ''}
                endDate={appliedDateRange.end ? appliedDateRange.end.toISOString().split('T')[0] : ''}
                onChange={({ startDate, endDate }) => {
                  setAppliedDateRange({
                    start: startDate ? new Date(startDate) : null,
                    end: endDate ? new Date(endDate) : null
                  });
                  setCurrentPage(1);
                }}
                onClear={() => {
                  setAppliedDateRange({ start: null, end: null });
                  setCurrentPage(1);
                }}
              />

              {(searchTerm !== '' || statusFilter !== 'all' || appliedDateRange.start !== null) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setAppliedDateRange({ start: null, end: null });
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

            {hasPerm(user, 'add_role') && (
              <button className="epic-btn epic-btn-primary" onClick={startCreate}>
                <Plus size={16} /> Add Role
              </button>
            )}
          </div>

          <div className="epic-card-wrapper">
            {(() => {
              const canEditRoles = hasAnyWritePerm(user, 'role');
              return (
                <table className="epic-table" style={{ width: '100%', tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th style={{ width: canEditRoles ? '35%' : '43%' }}>TITLE</th>
                      <th style={{ width: '18%' }}>ASSIGNED</th>
                      <th style={{ width: '15%' }}>STATUS</th>
                      <th style={{ width: '24%' }}>UPDATED AT</th>
                      {canEditRoles && <th style={{ width: '8%' }}>ACTIONS</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {currentRoles.length === 0 ? (
                      <tr>
                        <td colSpan={canEditRoles ? 5 : 4} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted-premium)' }}>
                          No roles configured. Click "Add Role" to get started.
                        </td>
                      </tr>
                    ) : (
                      currentRoles.map((role, rIdx) => (
                        <tr key={role.id}>
                          <td style={{ fontWeight: 600, verticalAlign: 'middle' }}>{role.name}</td>
                          <td style={{ verticalAlign: 'middle' }}>{role.staff_count || 0}</td>
                          <td style={{ verticalAlign: 'middle' }}>
                            <span style={{ display: 'inline-flex', padding: '0.25rem 0.65rem', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 600, background: role.is_active ? '#f0fdf4' : '#f1f5f9', color: role.is_active ? '#166534' : '#64748b', border: role.is_active ? '1px solid #bbf7d0' : '1px solid #e2e8f0' }}>
                              {role.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ verticalAlign: 'middle' }}>{formatDate(role.updated_at)}</td>
                          <td className="epic-actions-cell" style={{ verticalAlign: 'middle', textAlign: 'left' }}>
                            {hasAnyWritePerm(user, 'role') && (
                              <div style={{ position: 'relative', display: 'inline-block' }} ref={activeActionsMenu === role.id ? actionsMenuRef : null}>
                                <button 
                                  className="epic-dots-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionsMenu(activeActionsMenu === role.id ? null : role.id);
                                  }}
                                >
                                  <MoreVertical size={16} />
                                </button>
                                
                                {activeActionsMenu === role.id && (
                                  <div className="epic-dropdown-menu" style={{ position: 'absolute', right: 0, left: 'auto', top: rIdx >= currentRoles.length - 2 ? 'auto' : '100%', bottom: rIdx >= currentRoles.length - 2 ? '100%' : 'auto', marginTop: rIdx >= currentRoles.length - 2 ? 0 : '0.25rem', marginBottom: rIdx >= currentRoles.length - 2 ? '0.25rem' : 0, zIndex: 50 }}>
                                    {hasPerm(user, 'update_role') && (
                                      <button className="epic-dropdown-item" onClick={() => {
                                        setActiveActionsMenu(null);
                                        startEdit(role);
                                      }}>
                                        <Edit size={12} style={{ display: 'inline', marginRight: '0.35rem' }} /> Edit Info
                                      </button>
                                    )}
                                    {hasPerm(user, ['status_role', 'remove_role']) && (
                                      <button 
                                        className="epic-dropdown-item" 
                                        onClick={() => handleToggleRoleStatus(role)}
                                        style={{ color: role.is_active ? 'var(--text-subtle-premium, #64748b)' : '#10b981' }}
                                      >
                                        {role.is_active ? (
                                          <EyeOff size={12} style={{ display: 'inline', marginRight: '0.35rem' }} />
                                        ) : (
                                          <Eye size={12} style={{ display: 'inline', marginRight: '0.35rem' }} />
                                        )}
                                        {role.is_active ? 'Inactive' : 'Active'}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              );
            })()}

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

                  <span style={{ padding: '0.375rem 0.75rem', background: 'var(--epic-green, #10b981)', color: '#fff', borderRadius: '0.375rem', fontSize: '0.8rem', fontWeight: 700 }}>
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

      {/* 2. ADD / EDIT ROLE VIEW MODE */}
      {(isCreating || isEditing) && (
        <form onSubmit={handleSave} className="epic-form-container">
          <div className="epic-form-card">
            <button type="button" className="epic-back-button" style={{ marginBottom: '1.25rem' }} onClick={() => {
              setIsCreating(false);
              setIsEditing(false);
            }}>
              <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} /> Back to Roles Listing
            </button>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-main-premium)' }}>
              {isCreating ? 'Add Role' : 'Edit Role'}
            </h2>

            <div className="epic-form-row">
              <div className="epic-form-group">
                <label className="epic-form-label">Title *</label>
                <input 
                  type="text"
                  className="epic-search-input"
                  placeholder="Enter role name"
                  value={roleForm.name}
                  onChange={(e) => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  style={{ maxWidth: '400px' }}
                />
              </div>

              <div style={{ marginTop: '1.5rem' }}>
                <Switch 
                  checked={roleForm.is_active}
                  onChange={(val) => setRoleForm(prev => ({ ...prev, is_active: val }))}
                  label="Active"
                  labelOnRight={true}
                />
              </div>
            </div>
          </div>

          <div>
            <div className="epic-perm-section-title">
              <h3 style={{ margin: 0, color: 'var(--text-main-premium)' }}>Permissions</h3>
              
              <Switch 
                checked={
                  totalPermsCount > 0 &&
                  roleForm.permission_ids.length === totalPermsCount
                }
                onChange={handleToggleAllPermissions}
                label="Allow all permissions"
                labelOnRight={true}
              />
            </div>

            {Object.entries(permissions).map(([groupName, groupPerms]) => {
              const isGroupExpanded = !!expandedGroups[groupName];
              const groupIds = groupPerms.map(p => p.id);
              const allCheckedInGroup = groupIds.every(id => roleForm.permission_ids.includes(id));
              
              return (
                <div key={groupName} className="epic-accordion-group">
                  <div 
                    className="epic-accordion-header"
                    onClick={() => toggleGroupExpansion(groupName)}
                  >
                    <div className="epic-accordion-header-left">
                      <Switch 
                        checked={allCheckedInGroup}
                        onChange={(val) => handleToggleGroupAll(groupName, groupPerms, val)}
                        label={groupName.replace('_', ' ')}
                        labelOnRight={true}
                      />
                    </div>

                    <div style={{ color: 'var(--text-muted-premium)' }}>
                      {isGroupExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {isGroupExpanded && (
                    <div className="epic-accordion-content">
                      {groupPerms.map((perm) => {
                        const isChecked = roleForm.permission_ids.includes(perm.id);
                        return (
                          <div key={perm.id} className="epic-perm-item">
                            <Switch 
                              checked={isChecked}
                              onChange={() => handleTogglePermission(perm.id)}
                            />
                            <div className="epic-perm-info" onClick={() => handleTogglePermission(perm.id)} style={{ cursor: 'pointer' }}>
                              <span className="epic-perm-title">
                                {perm.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                              </span>
                              <span className="epic-perm-desc">
                                {perm.description || 'Allows corresponding action in dashboard.'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button type="submit" className="epic-btn epic-btn-primary">
              Save
            </button>
          </div>
        </form>
      )}

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
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
          >
            <X size={16} />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
