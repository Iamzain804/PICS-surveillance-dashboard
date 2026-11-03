import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Plus, Trash2, Edit, CheckCircle,
  X, RotateCcw, Search, ArrowLeft, MoreVertical, Tag
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

const DEFAULT_TYPE_SUGGESTIONS = [
  'Ground Floor', '1st Floor', '2nd Floor', 'Check In', 'Check Out', 'Cafeteria', 'Main Gate', 'Room 101'
];

export default function ActivitiesPage({ user, onLogout, onToggleSidebar, sidebarCollapsed, onNavigate }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Sub-page view state
  const [isAddView, setIsAddView] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Active actions dropdown
  const [activeActionsMenu, setActiveActionsMenu] = useState(null);
  const actionsMenuRef = useRef(null);

  // Forms
  const [activityForm, setActivityForm] = useState({
    activity_id: 'ACT-001',
    name: '',
    description: '',
    types: ['Ground Floor', '1st Floor'],
    status: 'active'
  });
  const [newTypeInput, setNewTypeInput] = useState('');
  const [editTypeInput, setEditTypeInput] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Auto-generate next unique Activity ID
  const generateUniqueActivityId = (currentList = []) => {
    const existingNums = currentList.map(a => {
      if (!a.activity_id) return 0;
      const m = a.activity_id.match(/ACT-(\d+)/i);
      return m ? parseInt(m[1], 10) : 0;
    }).filter(n => !isNaN(n));
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
    return `ACT-${String(maxNum + 1).padStart(3, '0')}`;
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  // Close actions menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target)) {
        setActiveActionsMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-dismiss success toast
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/global-activities`);
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setActivities(list);
    } catch (e) {
      console.error(e);
      setError('Could not connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    const nextId = generateUniqueActivityId(activities);
    setActivityForm({
      activity_id: nextId,
      name: '',
      description: '',
      types: ['Ground Floor', '1st Floor'],
      status: 'active'
    });
    setNewTypeInput('');
    setIsAddView(true);
  };

  // Add Type Tag Handler (Add View)
  const handleAddTypeTag = (tag) => {
    const val = (tag || newTypeInput).trim();
    if (!val) return;
    if (activityForm.types.some(t => t.toLowerCase() === val.toLowerCase())) {
      setNewTypeInput('');
      return;
    }
    setActivityForm(prev => ({
      ...prev,
      types: [...prev.types, val]
    }));
    setNewTypeInput('');
  };

  const handleRemoveTypeTag = (indexToRemove) => {
    setActivityForm(prev => ({
      ...prev,
      types: prev.types.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  // Add Type Tag Handler (Edit View)
  const handleAddEditTypeTag = (tag) => {
    const val = (tag || editTypeInput).trim();
    if (!val || !editingActivity) return;
    const currentTypes = editingActivity.types || [];
    if (currentTypes.some(t => t.toLowerCase() === val.toLowerCase())) {
      setEditTypeInput('');
      return;
    }
    setEditingActivity(prev => ({
      ...prev,
      types: [...currentTypes, val]
    }));
    setEditTypeInput('');
  };

  const handleRemoveEditTypeTag = (indexToRemove) => {
    if (!editingActivity) return;
    setEditingActivity(prev => ({
      ...prev,
      types: (prev.types || []).filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.name.trim()) {
      alert('Please enter Activity Name.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/global-activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity_id: activityForm.activity_id.trim().toUpperCase(),
          name: activityForm.name.trim(),
          description: activityForm.description ? activityForm.description.trim() : '',
          types: activityForm.types && activityForm.types.length > 0 ? activityForm.types : ['Ground Floor'],
          status: activityForm.status || 'active'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to create activity.');
        return;
      }

      const createdName = activityForm.name;
      setIsAddView(false);
      setSuccess(`Activity "${createdName}" created successfully!`);
      fetchActivities();
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server.');
    }
  };

  const handleOpenEdit = (act) => {
    setActiveActionsMenu(null);
    setEditingActivity({
      id: act.id,
      activity_id: act.activity_id,
      name: act.name,
      description: act.description || '',
      types: Array.isArray(act.types) && act.types.length > 0 ? act.types : ['Ground Floor', '1st Floor'],
      status: act.status || 'active'
    });
    setEditTypeInput('');
    setIsEditModalOpen(true);
  };

  const handleUpdateActivity = async (e) => {
    e.preventDefault();
    if (!editingActivity || !editingActivity.name.trim()) {
      alert('Please enter Activity Name.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/global-activities/${editingActivity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingActivity.name.trim(),
          description: editingActivity.description ? editingActivity.description.trim() : '',
          types: editingActivity.types && editingActivity.types.length > 0 ? editingActivity.types : ['Ground Floor'],
          status: editingActivity.status || 'active'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to update activity.');
        return;
      }

      const name = editingActivity.name;
      setIsEditModalOpen(false);
      setEditingActivity(null);
      setSuccess(`Activity "${name}" updated successfully!`);
      fetchActivities();
    } catch (err) {
      console.error(err);
      alert('Failed to connect to backend server.');
    }
  };

  const handleToggleStatus = async (act) => {
    const newStatus = act.status === 'inactive' ? 'active' : 'inactive';
    try {
      const res = await fetch(`${API_BASE}/api/v1/global-activities/${act.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to update activity status.');
        return;
      }

      setActiveActionsMenu(null);
      setSuccess(`Activity "${act.name}" marked as ${newStatus === 'active' ? 'Active' : 'Inactive'}!`);
      fetchActivities();
    } catch (e) {
      console.error(e);
      alert('Failed to connect to backend server.');
    }
  };

  const handleDeleteActivity = async (act) => {
    if (!window.confirm(`Are you sure you want to delete activity "${act.name}" (${act.activity_id})?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/global-activities/${act.id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.detail || 'Failed to delete activity.');
        return;
      }

      setActiveActionsMenu(null);
      setSuccess(`Activity "${act.name}" deleted successfully!`);
      fetchActivities();
    } catch (e) {
      console.error(e);
      alert('Failed to connect to backend server.');
    }
  };

  // Filtered Activities
  const filteredActivities = activities.filter(act => {
    const matchesSearch = !searchQuery ||
      act.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.activity_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      act.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (act.types || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || (act.status || 'active') === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const currentActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ==========================================
  // RENDER: DEDICATED ADD ACTIVITY SUB-PAGE
  // ==========================================
  if (isAddView) {
    const isFormValid = activityForm.name.trim() !== '';

    return (
      <div className="epic-page-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '100vh', boxSizing: 'border-box' }}>
        <PageHeader
          title="Add Activity"
          subtitle="Define a new organizational activity type and its configured places/types"
          icon={Activity}
          user={user}
          onLogout={onLogout}
          onToggleSidebar={onToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          onNavigate={onNavigate}
        />

        <div style={{ flex: 1, overflow: 'auto' }}>
          <div style={{ background: '#fff', padding: '2.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', width: '100%', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', boxSizing: 'border-box' }}>
            
            {/* Breadcrumb back button */}
            <button
              type="button"
              onClick={() => setIsAddView(false)}
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
              <ArrowLeft size={16} /> Back to Activities
            </button>

            {/* Section 1 Header */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.4rem 0' }}>
                Activity Details
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                Specify identification, general description, and define multiple types/places for this activity
              </p>
            </div>

            <form onSubmit={handleCreateActivity}>
              <div style={{ marginBottom: '1.5rem' }}>
                {/* ACTIVITY NAME */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                    ACTIVITY NAME <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter activity name..."
                    value={activityForm.name}
                    onChange={e => setActivityForm({ ...activityForm, name: e.target.value })}
                    required
                    style={{ height: '42px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0.75rem 1rem', fontSize: '0.875rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* DYNAMIC MULTIPLE TYPES / PLACES */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>
                      ACTIVITY TYPES / PLACES <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.15rem 0 0 0' }}>
                      Add multiple types for this activity (e.g. Ground Floor, 1st Floor, Cafeteria). These will appear automatically in Branch Assign Activity and Reports.
                    </p>
                  </div>
                </div>

                {/* Added Types Chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
                  {activityForm.types.map((typeStr, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))',
                        border: '1px solid rgba(0, 110, 179, 0.25)',
                        color: 'var(--brand-primary, #006EB3)',
                        padding: '0.35rem 0.75rem',
                        borderRadius: '2rem',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}
                    >
                      <Tag size={12} />
                      <span>{typeStr}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTypeTag(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--brand-primary, #006EB3)',
                          cursor: 'pointer',
                          padding: '0 0.15rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Input to add new type */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="Enter type or place name..."
                    value={newTypeInput}
                    onChange={e => setNewTypeInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTypeTag();
                      }
                    }}
                    style={{ flex: 1, height: '38px', borderRadius: '0.5rem', border: '1px solid #cbd5e1', padding: '0 0.75rem', fontSize: '0.825rem', outline: 'none', background: '#fff' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTypeTag()}
                    style={{
                      background: 'var(--brand-primary, #006EB3)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '0.5rem',
                      padding: '0 1rem',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Plus size={14} /> Add Type
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #f1f5f9', paddingTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddView(false)}
                  style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    border: 'none',
                    borderRadius: '0.375rem',
                    width: '100px',
                    height: '40px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid}
                  style={{
                    background: isFormValid ? 'var(--brand-primary, #006EB3)' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '0.375rem',
                    padding: '0 1.5rem',
                    height: '40px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: isFormValid ? 'pointer' : 'not-allowed',
                    boxShadow: isFormValid ? '0 1px 2px var(--brand-primary-tint, rgba(0, 110, 179, 0.2))' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: MAIN ACTIVITIES TABLE VIEW
  // ==========================================
  const canEdit = hasAnyWritePerm(user, ['activities_write', 'system_admin']);
  const gridCols = canEdit ? '0.8fr 2.5fr 1.5fr 1.2fr 1.5fr 70px' : '0.8fr 2.5fr 1.5fr 1.2fr 1.5fr';

  return (
    <div className="epic-page-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', minHeight: '100vh', boxSizing: 'border-box' }}>
      <PageHeader
        title="Activities"
        subtitle="Manage master global activities, their types, and branch assignments"
        icon={Activity}
        user={user}
        onLogout={onLogout}
        onToggleSidebar={onToggleSidebar}
        sidebarCollapsed={sidebarCollapsed}
        onNavigate={onNavigate}
      />

      {/* Success Toast */}
      {success && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          background: '#10b981', color: '#fff', padding: '0.85rem 1.25rem',
          borderRadius: '0.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600
        }}>
          <CheckCircle size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="epic-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
          {/* Search */}
          <div className="epic-search-wrapper" style={{ position: 'relative', width: '280px' }}>
            <Search size={16} className="epic-search-icon" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              style={{ width: '100%', height: '38px', borderRadius: '0.5rem', border: '1px solid #e2e8f0', paddingLeft: '2.25rem', paddingRight: '0.75rem', fontSize: '0.8125rem', outline: 'none' }}
            />
          </div>

          {/* Status Filter */}
          <div style={{ width: '140px' }}>
            <CustomSelect
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
        </div>

        {/* Right Side: + Add Activity button */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <button
            className="epic-btn epic-btn-primary"
            onClick={handleOpenAdd}
            style={{
              background: 'var(--brand-primary, #006EB3)',
              color: 'var(--brand-button-text, #ffffff)',
              border: 'none',
              borderRadius: '0.5rem',
              height: '38px',
              padding: '0 1.15rem',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 1px 2px var(--brand-primary-tint, rgba(0, 110, 179, 0.2))'
            }}
          >
            <Plus size={16} /> Add Activity
          </button>
        </div>
      </div>

      {/* Main Table Content Area */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ background: '#fff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>

          {/* Table Header */}
          <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '1rem', padding: '1rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-primary, #006EB3)', letterSpacing: '0.05em' }}>
            <div>#</div>
            <div>ACTIVITY NAME</div>
            <div>CONFIGURED TYPES</div>
            <div>STATUS</div>
            <div>UPDATED AT</div>
            {canEdit && <div>ACTIONS</div>}
          </div>

          {/* Table Body */}
          <div>
            {loading ? (
              <PageLoader />
            ) : currentActivities.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No activities found</div>
            ) : (
              currentActivities.map((act, idx) => (
                <div
                  key={act.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: gridCols,
                    gap: '1rem',
                    padding: '1rem 1.5rem',
                    borderBottom: idx < currentActivities.length - 1 ? '1px solid #f1f5f9' : 'none',
                    alignItems: 'center',
                    background: idx % 2 === 0 ? '#fff' : '#f8fafc',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#fff' : '#f8fafc'}
                >
                  {/* # / Index */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '0.5rem', background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary, #006EB3)', flexShrink: 0 }}>
                      <Activity size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                      </div>
                    </div>
                  </div>

                  {/* Activity Name */}
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>
                    {act.name}
                  </div>

                  {/* Configured Types Count (Only Number) */}
                  <div>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '28px',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '0.375rem',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      color: '#0f172a',
                      fontSize: '0.8125rem',
                      fontWeight: 700
                    }}>
                      {act.types?.length || 0}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div>
                    <span style={{
                      display: 'inline-flex',
                      padding: '0.25rem 0.65rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: act.status !== 'inactive' ? '#f0fdf4' : '#f1f5f9',
                      color: act.status !== 'inactive' ? '#166534' : '#64748b',
                      border: act.status !== 'inactive' ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                    }}>
                      {act.status !== 'inactive' ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Updated At */}
                  <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                    {formatDate(act.updated_at || act.created_at)}
                  </div>

                  {/* Actions Dropdown */}
                  {canEdit && (
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveActionsMenu(activeActionsMenu === act.id ? null : act.id);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0.4rem',
                          color: '#64748b',
                          cursor: 'pointer',
                          borderRadius: '0.375rem'
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeActionsMenu === act.id && (
                        <div
                          ref={actionsMenuRef}
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: (currentActivities.length > 3 && idx >= currentActivities.length - 2) ? 'auto' : '100%',
                            bottom: (currentActivities.length > 3 && idx >= currentActivities.length - 2) ? '100%' : 'auto',
                            marginBottom: (currentActivities.length > 3 && idx >= currentActivities.length - 2) ? '0.25rem' : 0,
                            marginTop: (currentActivities.length > 3 && idx >= currentActivities.length - 2) ? 0 : '0.25rem',
                            zIndex: 50,
                            background: '#fff',
                            borderRadius: '0.5rem',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                            minWidth: '150px',
                            overflow: 'hidden'
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(act)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              width: '100%',
                              padding: '0.65rem 1rem',
                              background: 'none',
                              border: 'none',
                              fontSize: '0.8125rem',
                              color: '#334155',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Edit size={14} color="#3b82f6" />
                            <span>Edit Activity</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(act)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              width: '100%',
                              padding: '0.65rem 1rem',
                              background: 'none',
                              border: 'none',
                              fontSize: '0.8125rem',
                              color: '#334155',
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <RotateCcw size={14} color="#8b5cf6" />
                            <span>{act.status === 'inactive' ? 'Set Active' : 'Set Inactive'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(act)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              width: '100%',
                              padding: '0.65rem 1rem',
                              background: 'none',
                              border: 'none',
                              fontSize: '0.8125rem',
                              color: '#ef4444',
                              cursor: 'pointer',
                              textAlign: 'left',
                              borderTop: '1px solid #f1f5f9'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Trash2 size={14} color="#ef4444" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Pagination Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1.5rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 500 }}>
              Showing {filteredActivities.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredActivities.length)} of {filteredActivities.length} activities
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.375rem' }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    background: currentPage <= 1 ? '#f1f5f9' : '#fff',
                    color: currentPage <= 1 ? '#cbd5e1' : '#475569',
                    cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  Prev
                </button>

                <span style={{
                  padding: '0.375rem 0.75rem',
                  background: 'var(--brand-primary, #006EB3)',
                  color: '#fff',
                  borderRadius: '0.375rem',
                  fontSize: '0.8rem',
                  fontWeight: 700
                }}>
                  {currentPage} / {Math.max(1, totalPages)}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '0.375rem 0.75rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '0.375rem',
                    background: currentPage >= totalPages ? '#f1f5f9' : '#fff',
                    color: currentPage >= totalPages ? '#cbd5e1' : '#475569',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
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

      {/* EDIT ACTIVITY MODAL */}
      {isEditModalOpen && editingActivity && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: '#fff', borderRadius: '1rem', width: '100%', maxWidth: '550px',
            padding: '2rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Edit Activity
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0 0 0' }}>
                  Update activity details and its configured types/places
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.375rem', padding: '0.35rem', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateActivity}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.375rem' }}>
                    ACTIVITY NAME <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={editingActivity.name}
                    onChange={e => setEditingActivity({ ...editingActivity, name: e.target.value })}
                    required
                    style={{ width: '100%', height: '40px', borderRadius: '0.5rem', border: '1px solid #cbd5e1', padding: '0 0.75rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                {/* TYPES / PLACES IN EDIT MODAL */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.625rem', padding: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                    CONFIGURED TYPES / PLACES
                  </label>

                  {/* Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.65rem' }}>
                    {(editingActivity.types || []).map((typeStr, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          background: 'var(--brand-primary-tint, rgba(0, 110, 179, 0.10))',
                          border: '1px solid rgba(0, 110, 179, 0.25)',
                          color: 'var(--brand-primary, #006EB3)',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '2rem',
                          fontSize: '0.78rem',
                          fontWeight: 700
                        }}
                      >
                        <Tag size={11} />
                        <span>{typeStr}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEditTypeTag(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--brand-primary, #006EB3)',
                            cursor: 'pointer',
                            padding: '0',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>

                  {/* Input */}
                  <div style={{ display: 'flex', gap: '0.45rem' }}>
                    <input
                      type="text"
                      placeholder="Enter type or place name..."
                      value={editTypeInput}
                      onChange={e => setEditTypeInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEditTypeTag();
                        }
                      }}
                      style={{ flex: 1, height: '36px', borderRadius: '0.45rem', border: '1px solid #cbd5e1', padding: '0 0.65rem', fontSize: '0.8rem', outline: 'none', background: '#fff' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddEditTypeTag()}
                      style={{ background: 'var(--brand-primary, #006EB3)', color: '#fff', border: 'none', borderRadius: '0.45rem', padding: '0 0.85rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.25rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ background: 'var(--brand-primary, #006EB3)', color: '#fff', border: 'none', borderRadius: '0.5rem', padding: '0.5rem 1.5rem', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
